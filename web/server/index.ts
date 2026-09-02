import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { randomBytes, createSecretKey, randomUUID } from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import downloadRouter from './download';
import uploadRouter from './upload';
import shareRouter from './share';
import KeyModule from '../../src/keys';
import { keyStore, isUnlocked, setUnlocked, resetLockTimeout, clearLockTimeout, isHighSecurity, retrieveKey, setSessionPassword, getSessionPassword, secureWipe } from './keyStore';
import { audit, readAuditLog, verifyAuditLog } from './auditLog';

// Handle default export interop (CJS/ESM mismatch)
const Key = (KeyModule as any).default || KeyModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');

// Load .env from root project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = 3001;

/**
 * Create the high-security backup without clobbering user backups.
 * Key.backup() writes to a date-named file in the given dir which can
 * collide with an existing user backup of the same day. To avoid that,
 * we generate the backup inside an isolated temp subdirectory (containing
 * only the .pem keys) and move the result to high-security.ctg-backup.
 */
function createHighSecurityBackup(password: string, keysDir: string): void {
  const tmpDir = path.join(keysDir, '.hs-tmp');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    // Copy only the .pem keys into the isolated temp dir
    const pemFiles = fs.readdirSync(keysDir).filter((f) => f.endsWith('.pem'));
    for (const f of pemFiles) {
      fs.copyFileSync(path.join(keysDir, f), path.join(tmpDir, f));
    }
    // Backup from the temp dir (output also in temp dir to avoid collisions)
    const backupPath = Key.backup(password, tmpDir, tmpDir);
    const targetPath = path.join(keysDir, 'high-security.ctg-backup');
    fs.copyFileSync(backupPath, targetPath);
    fs.chmodSync(targetPath, 0o600);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Rebuild the high-security backup from the in-RAM keyStore.
 * Uses an isolated temp dir so user .ctg-backup files are never touched.
 */
function rebuildHighSecurityBackup(password: string, keysDir: string): void {
  const tmpDir = path.join(keysDir, '.hs-tmp');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    for (const [name, buffer] of keyStore.entries()) {
      fs.writeFileSync(path.join(tmpDir, name), buffer, { mode: 0o600 });
    }
    const backupPath = Key.backup(password, tmpDir, tmpDir);
    const targetPath = path.join(keysDir, 'high-security.ctg-backup');
    fs.copyFileSync(backupPath, targetPath);
    fs.chmodSync(targetPath, 0o600);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

app.use(cors());
app.use(express.json());

// --- Settings endpoints ---

app.get('/api/settings', (_req, res) => {
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    const settings = JSON.parse(data);
    // Include the region so the front can estimate costs
    settings.region = process.env.AWS_REGION || 'eu-west-1';
    res.json(settings);
  } catch {
    res.json({ keysPath: './keys', filesPath: './files', downloadPath: './download', region: process.env.AWS_REGION || 'eu-west-1' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const settings = req.body;

    // Validate autoRotation.intervalDays if present
    if (settings.autoRotation && settings.autoRotation.enabled) {
      const interval = settings.autoRotation.intervalDays;
      if (typeof interval !== 'number' || interval < 1 || interval > 365) {
        res.status(400).json({ error: 'intervalDays must be between 1 and 365' });
        return;
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2) + '\n');
    res.json(settings);
  } catch (err) {
    console.error('Failed to write config:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// --- High Security: unlock / lock / status endpoints ---

app.get('/api/lock-status', (_req, res) => {
  res.json({ highSecurity: isHighSecurity(), unlocked: isUnlocked() });
});

app.post('/api/unlock', (req, res) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'password is required' });
    return;
  }

  if (!isHighSecurity()) {
    res.status(400).json({ error: 'High security mode is not enabled' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    const backupPath = path.join(keysDir, 'high-security.ctg-backup');

    if (!fs.existsSync(backupPath)) {
      res.status(404).json({ error: 'high-security.ctg-backup not found' });
      return;
    }

    // Decrypt backup and load keys into RAM
    const restoredKeys = Key.restore(password, backupPath, keysDir);

    // Load into memory store (read the restored files then delete them)
    keyStore.clear();
    for (const keyName of restoredKeys) {
      const keyPath = path.join(keysDir, keyName);
      const buffer = fs.readFileSync(keyPath);
      keyStore.set(keyName, buffer);
      // Delete from disk immediately (high-security: no keys on disk)
      fs.unlinkSync(keyPath);
    }

    setUnlocked(true);
    setSessionPassword(password);
    resetLockTimeout();

    audit('unlock', { keyCount: restoredKeys.length });
    res.json({ success: true, keyCount: restoredKeys.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(401).json({ error: message });
  }
});

app.post('/api/lock', (_req, res) => {
  secureWipe();
  clearLockTimeout();
  audit('lock', {});
  res.json({ success: true });
});

app.post('/api/high-security/enable', (req, res) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'password is required' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    // Create the high-security backup
    createHighSecurityBackup(password, keysDir);

    // Load keys into RAM before deleting from disk
    const pemFiles = fs.readdirSync(keysDir).filter((f: string) => f.endsWith('.pem'));
    keyStore.clear();
    for (const keyName of pemFiles) {
      const keyPath = path.join(keysDir, keyName);
      const buffer = fs.readFileSync(keyPath);
      keyStore.set(keyName, buffer);
      fs.unlinkSync(keyPath);
    }

    setUnlocked(true);
    setSessionPassword(password);
    resetLockTimeout();

    // Update config
    settings.highSecurity = true;
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2) + '\n');

    audit('high-security-enable', { keyCount: pemFiles.length });
    res.json({ success: true, keyCount: pemFiles.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('High security enable error:', message);
    res.status(500).json({ error: message });
  }
});

app.post('/api/high-security/disable', (_req, res) => {
  if (!isUnlocked()) {
    res.status(403).json({ error: 'Keys must be unlocked before disabling high security mode.' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    // Write keys back to disk from RAM
    fs.mkdirSync(keysDir, { recursive: true });
    for (const [keyName, buffer] of keyStore.entries()) {
      fs.writeFileSync(path.join(keysDir, keyName), buffer, { mode: 0o600 });
    }

    // Remove the backup file
    const backupPath = path.join(keysDir, 'high-security.ctg-backup');
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    // Securely wipe keys from memory
    secureWipe();
    clearLockTimeout();

    // Update config
    settings.highSecurity = false;
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2) + '\n');

    audit('high-security-disable', {});
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('High security disable error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Keys listing endpoint ---

app.get('/api/keys', (_req, res) => {
  try {
    // In high-security mode, return keys from RAM store
    if (isHighSecurity()) {
      if (!isUnlocked()) {
        res.json([]);
        return;
      }
      res.json(Array.from(keyStore.keys()));
      return;
    }

    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    if (!fs.existsSync(keysDir)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(keysDir).filter((f) => f.endsWith('.pem'));
    res.json(files);
  } catch (err) {
    console.error('Keys listing error:', err);
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

// --- Key generation endpoint ---

app.post('/api/keys', (req, res) => {
  const { keyName, bytes } = req.body;
  const keyBytes = bytes || 32;

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    const rawKey = randomBytes(keyBytes);
    const keyMaterial = createSecretKey(rawKey);
    const fileName = keyName ? `${keyName}.pem` : `${randomUUID()}.pem`;

    if (isHighSecurity()) {
      if (!isUnlocked()) {
        res.status(403).json({ error: 'Keys are locked. Unlock first.' });
        return;
      }

      // Add to RAM store
      keyStore.set(fileName, Buffer.from(keyMaterial.export()));

      // Update the backup file with all current keys using session password
      const sessionPwd = getSessionPassword();
      if (sessionPwd) {
        rebuildHighSecurityBackup(sessionPwd, keysDir);
      }

      audit('key-generate', { keyName: fileName });
      res.json({ success: true, keyName: fileName });
    } else {
      fs.mkdirSync(keysDir, { recursive: true });
      const filePath = path.join(keysDir, fileName);
      fs.writeFileSync(filePath, keyMaterial.export(), { mode: 0o600 });
      audit('key-generate', { keyName: fileName });
      res.json({ success: true, keyName: fileName, path: filePath });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Key generation error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Key deletion endpoint ---

app.delete('/api/keys/:keyName', (req, res) => {
  const { keyName } = req.params;

  if (!keyName) {
    res.status(400).json({ error: 'keyName is required' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    if (isHighSecurity()) {
      if (!isUnlocked()) {
        res.status(403).json({ error: 'Keys are locked. Unlock first.' });
        return;
      }

      if (!keyStore.has(keyName)) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }

      // Secure wipe the specific buffer then remove from store
      const buffer = keyStore.get(keyName)!;
      buffer.fill(0);
      keyStore.delete(keyName);

      // Update backup
      const sessionPwd = getSessionPassword();
      if (sessionPwd && keyStore.size > 0) {
        rebuildHighSecurityBackup(sessionPwd, keysDir);
      } else if (sessionPwd && keyStore.size === 0) {
        // No keys left, remove backup
        const backupPath = path.join(keysDir, 'high-security.ctg-backup');
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      }

      audit('key-delete', { keyName });
      res.json({ success: true });
    } else {
      const filePath = path.join(keysDir, keyName);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }

      fs.unlinkSync(filePath);
      audit('key-delete', { keyName });
      res.json({ success: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Key deletion error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Key backup endpoint ---

app.post('/api/keys/backup', (req, res) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'password is required' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    const backupPath = Key.backup(password, keysDir, keysDir);
    const fileName = path.basename(backupPath);

    audit('key-backup', { fileName });
    res.json({ success: true, fileName });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Key backup error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Key restore endpoint ---

app.post('/api/keys/restore', (req, res) => {
  const { password, backupFileName } = req.body;

  if (!password || !backupFileName) {
    res.status(400).json({ error: 'password and backupFileName are required' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    const backupPath = path.resolve(keysDir, backupFileName);

    if (!fs.existsSync(backupPath)) {
      res.status(404).json({ error: 'Backup file not found' });
      return;
    }

    const restoredKeys = Key.restore(password, backupPath, keysDir);

    audit('key-restore', { backupFileName, restoredKeys });
    res.json({ success: true, restoredKeys });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Key restore error:', message);
    res.status(500).json({ error: message });
  }
});

// --- List backup files endpoint ---

app.get('/api/keys/backups', (_req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysDir = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    if (!fs.existsSync(keysDir)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(keysDir)
      .filter((f) => f.endsWith('.ctg-backup') && f !== 'high-security.ctg-backup')
      .map((f) => {
        const stat = fs.statSync(path.join(keysDir, f));
        return { fileName: f, createdAt: stat.mtimeMs, size: stat.size };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json(files);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('List backups error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Downloaded files listing endpoint ---

app.get('/api/downloaded', (_req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const downloadDir = path.isAbsolute(settings.downloadPath)
      ? settings.downloadPath
      : path.resolve(projectRoot, settings.downloadPath);

    if (!fs.existsSync(downloadDir)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(downloadDir)
      .filter((f) => !f.startsWith('.'))
      .map((f) => {
        const stat = fs.statSync(path.join(downloadDir, f));
        return { fileName: f, size: stat.size, downloadedAt: stat.mtimeMs };
      });

    res.json(files);
  } catch (err) {
    console.error('Downloaded listing error:', err);
    res.status(500).json({ error: 'Failed to list downloaded files' });
  }
});

// --- Detect if desktop open command is available ---
const canOpenFiles = (() => {
  try {
    execSync('which open', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

// --- Capabilities endpoint ---
app.get('/api/capabilities', (_req, res) => {
  res.json({ canOpenFiles });
});

// --- Open file endpoint ---

app.post('/api/open', (req, res) => {
  if (!canOpenFiles) {
    res.status(501).json({ error: 'File opening is not supported in this environment (container mode)' });
    return;
  }

  const { fileName } = req.body;

  if (!fileName) {
    res.status(400).json({ error: 'fileName is required' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const downloadDir = path.isAbsolute(settings.downloadPath)
      ? settings.downloadPath
      : path.resolve(projectRoot, settings.downloadPath);

    const filePath = path.join(downloadDir, fileName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found in download directory' });
      return;
    }

    execSync(`open "${filePath}"`);

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Open file error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Open download folder endpoint ---

app.post('/api/open-folder', (_req, res) => {
  if (!canOpenFiles) {
    res.status(501).json({ error: 'Folder opening is not supported in this environment (container mode)' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const downloadDir = path.isAbsolute(settings.downloadPath)
      ? settings.downloadPath
      : path.resolve(projectRoot, settings.downloadPath);

    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    execSync(`open "${downloadDir}"`);

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Open folder error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Delete local file endpoint ---

app.delete('/api/downloaded/:fileName', (req, res) => {
  const { fileName } = req.params;

  if (!fileName) {
    res.status(400).json({ error: 'fileName is required' });
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const downloadDir = path.isAbsolute(settings.downloadPath)
      ? settings.downloadPath
      : path.resolve(projectRoot, settings.downloadPath);

    const filePath = path.join(downloadDir, fileName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found in download directory' });
      return;
    }

    fs.unlinkSync(filePath);
    audit('delete', { fileName, type: 'local' });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Delete local file error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Download endpoint (uses core Key/File classes) ---
app.use('/api', downloadRouter);

// --- Upload endpoint (uses core Key/File classes) ---
app.use('/api', uploadRouter);

// --- Share endpoint (zero-knowledge share link generation) ---
app.use('/api', shareRouter);

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.DYNAMO_TABLE!;

// --- Toggle star endpoint ---

app.patch('/api/files/:fileName/star', async (req, res) => {
  const { fileName } = req.params;
  const { isStarred } = req.body;

  if (typeof isStarred !== 'boolean') {
    res.status(400).json({ error: 'isStarred (boolean) is required' });
    return;
  }

  try {
    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: { fileName: { S: fileName } },
      UpdateExpression: 'SET isStarred = :starred',
      ExpressionAttributeValues: { ':starred': { BOOL: isStarred } },
    });
    await dynamoClient.send(command);
    audit(isStarred ? 'star' : 'unstar', { fileName });
    res.json({ success: true, fileName, isStarred });
  } catch (err) {
    console.error('Toggle star error:', err);
    res.status(500).json({ error: 'Failed to update star status' });
  }
});

// --- Toggle deletion protection endpoint ---

app.patch('/api/files/:fileName/protect', async (req, res) => {
  const { fileName } = req.params;
  const { isProtected } = req.body;

  if (typeof isProtected !== 'boolean') {
    res.status(400).json({ error: 'isProtected (boolean) is required' });
    return;
  }

  try {
    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: { fileName: { S: fileName } },
      UpdateExpression: 'SET isProtected = :protected',
      ExpressionAttributeValues: { ':protected': { BOOL: isProtected } },
    });
    await dynamoClient.send(command);
    audit(isProtected ? 'protect' : 'unprotect', { fileName });
    res.json({ success: true, fileName, isProtected });
  } catch (err) {
    console.error('Toggle protection error:', err);
    res.status(500).json({ error: 'Failed to update protection status' });
  }
});

app.get('/api/files', async (_req, res) => {
  try {
    const result = await dynamoClient.send(
      new ScanCommand({ TableName: tableName })
    );

    const files = (result.Items || []).map((item) => {
      const record = unmarshall(item);
      return {
        fileName: record.fileName,
        size: Number(record.size),
        uploadDate: record.uploadDate,
        isStarred: Boolean(record.isStarred),
        isProtected: Boolean(record.isProtected),
        folder: record.folder || '/',
        lastOpenedAt: record.lastOpenedAt || null,
        keyName: record.keyName
      };
    });

    res.json(files);
  } catch (err) {
    console.error('DynamoDB scan error:', err);
    res.status(500).json({ error: 'Failed to fetch files from DynamoDB' });
  }
});

// --- Folders endpoints ---

app.get('/api/folders', (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const folders: string[] = data.folders || ['/'];
    res.json(folders);
  } catch {
    res.json(['/']);
  }
});

app.post('/api/folders', (req, res) => {
  const { folder } = req.body;

  if (!folder || typeof folder !== 'string') {
    res.status(400).json({ error: 'folder (string) is required' });
    return;
  }

  // Normalize: must start with /, no trailing slash (except root)
  let normalized = folder.startsWith('/') ? folder : '/' + folder;
  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const folders: string[] = data.folders || ['/'];

    if (folders.includes(normalized)) {
      res.status(409).json({ error: 'Folder already exists' });
      return;
    }

    folders.push(normalized);
    data.folders = folders;
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n');

    audit('folder-create', { folder: normalized });
    res.json({ success: true, folder: normalized });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.delete('/api/folders', async (req, res) => {
  const { folder } = req.body;

  if (!folder || folder === '/') {
    res.status(400).json({ error: 'Cannot delete root folder' });
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const folders: string[] = data.folders || ['/'];

    const index = folders.indexOf(folder);
    if (index === -1) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Check if folder or sub-folders contain files
    const result = await dynamoClient.send(new ScanCommand({ TableName: tableName }));
    const items = (result.Items || []).map((item) => unmarshall(item));
    const filesInFolder = items.filter((item) => {
      const fileFolder = item.folder || '/';
      return fileFolder === folder || fileFolder.startsWith(folder + '/');
    });

    if (filesInFolder.length > 0) {
      res.status(409).json({
        error: `Folder contains ${filesInFolder.length} file(s). Move or delete them first.`,
        fileCount: filesInFolder.length,
      });
      return;
    }

    // Remove folder and any sub-folders
    data.folders = folders.filter((f: string) => f !== folder && !f.startsWith(folder + '/'));
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n');

    audit('folder-delete', { folder });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// --- Move file to folder endpoint ---

app.patch('/api/files/:fileName/move', async (req, res) => {
  const { fileName } = req.params;
  const { folder } = req.body;

  if (!fileName || !folder) {
    res.status(400).json({ error: 'fileName and folder are required' });
    return;
  }

  try {
    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: { fileName: { S: fileName } },
      UpdateExpression: 'SET folder = :folder',
      ExpressionAttributeValues: { ':folder': { S: folder } },
    });
    await dynamoClient.send(command);
    audit('move', { fileName, folder });
    res.json({ success: true, fileName, folder });
  } catch (err) {
    console.error('Move file error:', err);
    res.status(500).json({ error: 'Failed to move file' });
  }
});

// --- Rename file endpoint ---

app.patch('/api/files/:fileName/rename', async (req, res) => {
  const { fileName } = req.params;
  const { newName } = req.body;

  if (!fileName || !newName) {
    res.status(400).json({ error: 'fileName and newName are required' });
    return;
  }

  if (newName.includes('/') || newName.includes('\\')) {
    res.status(400).json({ error: 'Invalid file name' });
    return;
  }

  try {
    const { GetItemCommand, PutItemCommand, DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
    const { marshall } = await import('@aws-sdk/util-dynamodb');
    const { S3Client, CopyObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const { createHmac } = await import('crypto');

    const getCmd = new GetItemCommand({
      TableName: tableName,
      Key: { fileName: { S: fileName } },
    });
    const record = await dynamoClient.send(getCmd);

    if (!record.Item) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const item = unmarshall(record.Item);
    const keyName = item.keyName;

    // Retrieve the encryption key to compute S3 hashes
    const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectRoot = path.resolve(configPath, '..');
    const keysPath = path.isAbsolute(settings.keysPath)
      ? settings.keysPath
      : path.resolve(projectRoot, settings.keysPath);

    const keyMaterial = retrieveKey(keyName, keysPath).material;

    if (!keyMaterial) {
      res.status(500).json({ error: 'Cannot retrieve key material for S3 rename' });
      return;
    }

    // Compute old and new S3 keys (HMAC-SHA256 of fileName with key material)
    const oldHash = createHmac('sha256', keyMaterial).update(fileName).digest('hex');
    const newHash = createHmac('sha256', keyMaterial).update(newName).digest('hex');

    // Copy S3 object to new key
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const bucket = process.env.S3_BUCKET!;

    await s3Client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${oldHash}`,
      Key: newHash,
    }));

    // Delete old S3 object
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: oldHash,
    }));

    // Update DynamoDB: create new record, delete old
    const newItem = { ...item, fileName: newName };
    await dynamoClient.send(new PutItemCommand({
      TableName: tableName,
      Item: marshall(newItem),
    }));

    await dynamoClient.send(new DeleteItemCommand({
      TableName: tableName,
      Key: { fileName: { S: fileName } },
    }));

    audit('rename', { oldName: fileName, newName, folder: item.folder || '/' });
    res.json({ success: true, oldName: fileName, newName });
  } catch (err) {
    console.error('Rename file error:', err);
    res.status(500).json({ error: 'Failed to rename file' });
  }
});

// --- Rename folder endpoint ---

app.post('/api/folders/rename', (req, res) => {
  const { folder, newName } = req.body;

  if (!folder || !newName || folder === '/') {
    res.status(400).json({ error: 'folder and newName are required, cannot rename root' });
    return;
  }

  if (newName.includes('/') || newName.includes('\\')) {
    res.status(400).json({ error: 'Invalid folder name' });
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const folders: string[] = data.folders || ['/'];

    if (!folders.includes(folder)) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Compute new path: replace last segment with new name
    const segments = folder.split('/').filter(Boolean);
    segments[segments.length - 1] = newName;
    const newPath = '/' + segments.join('/');

    if (folders.includes(newPath)) {
      res.status(409).json({ error: 'A folder with that name already exists' });
      return;
    }

    // Rename folder and all sub-folders
    data.folders = folders.map((f: string) => {
      if (f === folder) return newPath;
      if (f.startsWith(folder + '/')) return newPath + f.slice(folder.length);
      return f;
    });
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n');

    // Update files in DynamoDB (async, fire-and-forget for speed)
    (async () => {
      try {
        const result = await dynamoClient.send(new ScanCommand({ TableName: tableName }));
        const items = (result.Items || []).map((item) => unmarshall(item));

        for (const item of items) {
          const fileFolder = item.folder || '/';
          let updatedFolder: string | null = null;

          if (fileFolder === folder) updatedFolder = newPath;
          else if (fileFolder.startsWith(folder + '/')) updatedFolder = newPath + fileFolder.slice(folder.length);

          if (updatedFolder) {
            await dynamoClient.send(new UpdateItemCommand({
              TableName: tableName,
              Key: { fileName: { S: item.fileName } },
              UpdateExpression: 'SET folder = :folder',
              ExpressionAttributeValues: { ':folder': { S: updatedFolder } },
            }));
          }
        }
      } catch (err) {
        console.error('Rename folder DynamoDB update error:', err);
      }
    })();

    audit('folder-rename', { oldPath: folder, newPath });
    res.json({ success: true, oldPath: folder, newPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Rename folder error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Move folder into another folder ---

app.post('/api/folders/move', async (req, res) => {
  const { sourceFolder, targetFolder } = req.body;

  if (!sourceFolder || !targetFolder) {
    res.status(400).json({ error: 'sourceFolder and targetFolder are required' });
    return;
  }

  if (sourceFolder === '/') {
    res.status(400).json({ error: 'Cannot move root folder' });
    return;
  }

  if (targetFolder.startsWith(sourceFolder + '/') || targetFolder === sourceFolder) {
    res.status(400).json({ error: 'Cannot move a folder into itself' });
    return;
  }

  // Compute new path: /target/sourceName
  const sourceName = sourceFolder.split('/').pop()!;
  const newPath = targetFolder === '/' ? `/${sourceName}` : `${targetFolder}/${sourceName}`;

  try {
    // Update config.json folders
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const folders: string[] = data.folders || ['/'];

    // Rename sourceFolder and all sub-folders
    data.folders = folders.map((f: string) => {
      if (f === sourceFolder) return newPath;
      if (f.startsWith(sourceFolder + '/')) return newPath + f.slice(sourceFolder.length);
      return f;
    });
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n');

    // Update all files in DynamoDB that are in sourceFolder or sub-folders
    const result = await dynamoClient.send(new ScanCommand({ TableName: tableName }));
    const items = (result.Items || []).map((item) => unmarshall(item));

    for (const item of items) {
      const fileFolder = item.folder || '/';
      let updatedFolder: string | null = null;

      if (fileFolder === sourceFolder) {
        updatedFolder = newPath;
      } else if (fileFolder.startsWith(sourceFolder + '/')) {
        updatedFolder = newPath + fileFolder.slice(sourceFolder.length);
      }

      if (updatedFolder) {
        await dynamoClient.send(new UpdateItemCommand({
          TableName: tableName,
          Key: { fileName: { S: item.fileName } },
          UpdateExpression: 'SET folder = :folder',
          ExpressionAttributeValues: { ':folder': { S: updatedFolder } },
        }));
      }
    }

    audit('folder-move', { sourceFolder, targetFolder: newPath });
    res.json({ success: true, oldPath: sourceFolder, newPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Move folder error:', message);
    res.status(500).json({ error: message });
  }
});

// --- Audit log endpoints ---

app.get('/api/audit-log', (_req, res) => {
  const limit = parseInt(_req.query.limit as string) || 100;
  const entries = readAuditLog(limit);
  res.json(entries.reverse()); // Most recent first
});

app.get('/api/audit-log/verify', (_req, res) => {
  const result = verifyAuditLog();
  res.json(result);
});

// --- Serve frontend static files (production) ---
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback: serve index.html for non-API routes
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
