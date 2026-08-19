import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { fileURLToPath } from 'url';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import KeyModule from '../../src/keys';
import FileModule from '../../src/files';
import { retrieveKey, isHighSecurity, isUnlocked, keyStore, getSessionPassword } from './keyStore';
import { randomBytes, createSecretKey } from 'crypto';

// Handle default export interop (CJS/ESM mismatch)
const Key = (KeyModule as any).default || KeyModule;
const File = (FileModule as any).default || FileModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');

function getSettings() {
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { keysPath: './keys', filesPath: './files', downloadPath: './download' };
  }
}

function resolveFromRoot(p: string): string {
  const projectRoot = path.resolve(configPath, '..');
  return path.isAbsolute(p) ? p : path.resolve(projectRoot, p);
}

const router = Router();

/**
 * POST /api/download
 * Body: { fileName: string, keyName: string }
 */
router.post('/download', async (req, res) => {
  const { fileName, keyName } = req.body;

  if (!fileName || !keyName) {
    res.status(400).json({ error: 'fileName and keyName are required' });
    return;
  }

  const settings = getSettings();
  const keysPath = resolveFromRoot(settings.keysPath);
  const downloadPath = resolveFromRoot(settings.downloadPath);

  try {
    const key = retrieveKey(keyName, keysPath);

    const file = new File();
    const outputPath = await file.download(fileName, key, downloadPath);

    res.json({ success: true, outputPath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Download error:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/preview
 * Body: { fileName: string, keyName: string }
 *
 * Downloads and decrypts a file in memory, returns the raw content
 * with appropriate Content-Type. No disk write.
 */
router.post('/preview', async (req, res) => {
  const { fileName, keyName } = req.body;

  if (!fileName || !keyName) {
    res.status(400).json({ error: 'fileName and keyName are required' });
    return;
  }

  const settings = getSettings();
  const keysPath = resolveFromRoot(settings.keysPath);

  try {
    const key = retrieveKey(keyName, keysPath);

    const file = new File();
    const buffer = await file.preview(fileName, key);

    // Determine content type from extension
    const contentType = getContentType(fileName);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.send(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Preview error:', message);
    res.status(500).json({ error: message });
  }
});

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    // Documents
    pdf: 'application/pdf',
    // Text
    txt: 'text/plain',
    md: 'text/plain',
    json: 'application/json',
    csv: 'text/csv',
    xml: 'text/xml',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/plain',
    py: 'text/plain',
    sh: 'text/plain',
    yml: 'text/plain',
    yaml: 'text/plain',
    log: 'text/plain',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * DELETE /api/files/:fileName
 * Body: { keyName: string }
 *
 * Deletes the file from cloud bucket and its metadata from DynamoDB.
 */
router.delete('/files/:fileName', async (req, res) => {
  const { fileName } = req.params;
  const { keyName } = req.body;

  if (!fileName || !keyName) {
    res.status(400).json({ error: 'fileName and keyName are required' });
    return;
  }

  // Check deletion protection
  try {
    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
    const getCommand = new GetItemCommand({
      TableName: process.env.DYNAMO_TABLE!,
      Key: { fileName: { S: fileName } },
      ProjectionExpression: 'isProtected',
    });
    const record = await dynamoClient.send(getCommand);
    if (record.Item) {
      const item = unmarshall(record.Item);
      if (item.isProtected) {
        res.status(403).json({ error: 'File is deletion-protected. Remove protection first.' });
        return;
      }
    }
  } catch (err) {
    console.error('Protection check error:', err);
    // Continue with deletion if check fails (fail-open for DynamoDB read issues)
  }

  const settings = getSettings();
  const keysPath = resolveFromRoot(settings.keysPath);

  try {
    const key = retrieveKey(keyName, keysPath);

    const file = new File();
    const result = await file.delete(fileName, key);

    res.json({ success: true, message: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Delete error:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/files/rotate
 * Body: { fileName: string, currentKeyName: string, newKeyName: string }
 *
 * Downloads and decrypts with the current key, then re-encrypts and uploads with the new key.
 */
router.post('/files/rotate', async (req, res) => {
  const { fileName, currentKeyName, newKeyName } = req.body;

  if (!fileName || !currentKeyName || !newKeyName) {
    res.status(400).json({ error: 'fileName, currentKeyName, and newKeyName are required' });
    return;
  }

  if (currentKeyName === newKeyName) {
    res.status(400).json({ error: 'New key must be different from the current key' });
    return;
  }

  const settings = getSettings();
  const keysPath = resolveFromRoot(settings.keysPath);
  const filesPath = resolveFromRoot(settings.filesPath);

  try {
    // Read current folder from DynamoDB
    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
    const getCmd = new GetItemCommand({
      TableName: process.env.DYNAMO_TABLE!,
      Key: { fileName: { S: fileName } },
      ProjectionExpression: 'folder',
    });
    const record = await dynamoClient.send(getCmd);
    const currentFolder = record.Item ? (unmarshall(record.Item).folder || '/') : '/';

    // 1. Download & decrypt with current key
    const currentKey = retrieveKey(currentKeyName, keysPath);

    const file = new File();
    await file.download(fileName, currentKey, filesPath);

    // 2. Re-encrypt and upload with new key FIRST
    const newKey = retrieveKey(newKeyName, keysPath);

    const uploadFile = new File();
    await uploadFile.upload(fileName, newKey, filesPath, false, undefined, currentFolder);

    // 3. Delete old S3 object only (DynamoDB already updated by upload)
    await file.deleteS3Object(fileName, currentKey);

    // 4. Clean up local file
    const localPath = path.join(filesPath, fileName);
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

    res.json({ success: true, message: `Key rotated for "${fileName}"` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Rotate error:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/files/rotation-check
 * Reads autoRotation settings, scans DynamoDB for files whose uploadDate
 * exceeds the interval, and returns the list of eligible files.
 */
router.get('/files/rotation-check', async (_req, res) => {
  try {
    const settings = getSettings();
    const { autoRotation } = settings;

    if (!autoRotation || !autoRotation.enabled) {
      res.json({ eligible: [], count: 0, enabled: false });
      return;
    }

    const { intervalDays, targetKey } = autoRotation;
    if (!targetKey) {
      res.json({ eligible: [], count: 0, enabled: true, error: 'No target key configured' });
      return;
    }

    // Scan DynamoDB for all files
    const { DynamoDBClient, ScanCommand } = await import('@aws-sdk/client-dynamodb');
    const { unmarshall } = await import('@aws-sdk/util-dynamodb');

    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
    const tableName = process.env.DYNAMO_TABLE!;

    const result = await dynamoClient.send(new ScanCommand({ TableName: tableName }));
    const now = Date.now();
    const thresholdMs = intervalDays * 24 * 60 * 60 * 1000;

    const isAutoGenerate = targetKey === '__auto_generate__';

    const eligible = (result.Items || [])
      .map((item) => unmarshall(item))
      .filter((record) => {
        const uploadTime = new Date(record.uploadDate).getTime();
        const age = now - uploadTime;
        // Eligible if older than threshold AND not already using the target key
        // For auto-generate, all old files are eligible
        return age >= thresholdMs && (isAutoGenerate || record.keyName !== targetKey);
      })
      .map((record) => ({
        fileName: record.fileName as string,
        keyName: record.keyName as string,
        uploadDate: record.uploadDate as string,
        folder: (record.folder as string) || '/',
      }));

    res.json({ eligible, count: eligible.length, enabled: true, targetKey });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Rotation check error:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/files/rotate-batch
 * Body: { files: Array<{ fileName, keyName }>, targetKey: string }
 *
 * Rotates all specified files sequentially to the target key.
 * Returns results for each file (success or error).
 */
router.post('/files/rotate-batch', async (req, res) => {
  const { files, targetKey } = req.body;

  if (!files || !Array.isArray(files) || !targetKey) {
    res.status(400).json({ error: 'files (array) and targetKey are required' });
    return;
  }

  const settings = getSettings();
  const keysPath = resolveFromRoot(settings.keysPath);
  const filesPath = resolveFromRoot(settings.filesPath);

  // If auto-generate, create a new key before rotating
  let actualTargetKey = targetKey;
  if (targetKey === '__auto_generate__') {
    const date = new Date().toISOString().slice(0, 10);
    const prefix = `auto-rotation-${date}`;

    // Find next available increment (check both disk and RAM store)
    const diskKeys = fs.existsSync(keysPath) ? fs.readdirSync(keysPath) : [];
    const ramKeys = isHighSecurity() ? Array.from(keyStore.keys()) : [];
    const allKeys = [...new Set([...diskKeys, ...ramKeys])];
    let increment = 1;
    while (allKeys.includes(`${prefix}_${increment}.pem`)) {
      increment++;
    }

    const keyName = `${prefix}_${increment}`;
    actualTargetKey = `${keyName}.pem`;

    if (isHighSecurity() && isUnlocked()) {
      // Generate key in RAM only
      const rawKey = randomBytes(32);
      keyStore.set(actualTargetKey, rawKey);

      // Update backup
      const sessionPwd = getSessionPassword();
      if (sessionPwd) {
        fs.mkdirSync(keysPath, { recursive: true });
        for (const [name, buffer] of keyStore.entries()) {
          fs.writeFileSync(path.join(keysPath, name), buffer, { mode: 0o600 });
        }
        const backupPath = Key.backup(sessionPwd, keysPath, keysPath);
        const targetBackupPath = path.join(keysPath, 'high-security.ctg-backup');
        if (backupPath !== targetBackupPath) {
          fs.renameSync(backupPath, targetBackupPath);
        }
        for (const name of keyStore.keys()) {
          const p = path.join(keysPath, name);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      }
    } else {
      // Normal mode: generate on disk
      const autoKey = new Key();
      autoKey.generate(32, keyName, keysPath);
    }
  }

  const results: Array<{ fileName: string; success: boolean; error?: string }> = [];

  for (const entry of files) {
    const { fileName, keyName, folder } = entry;

    if (keyName === actualTargetKey) {
      results.push({ fileName, success: true });
      continue;
    }

    try {
      // Download & decrypt with current key
      const currentKey = retrieveKey(keyName, keysPath);

      const file = new File();
      await file.download(fileName, currentKey, filesPath);

      // Re-encrypt and upload with new key FIRST (before deleting old)
      const newKey = retrieveKey(actualTargetKey, keysPath);

      const uploadFile = new File();
      await uploadFile.upload(fileName, newKey, filesPath, false, undefined, folder || '/');

      // Only delete old S3 object after successful upload (DynamoDB already updated)
      await file.deleteS3Object(fileName, currentKey);

      // Clean up local file
      const localPath = path.join(filesPath, fileName);
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

      results.push({ fileName, success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Rotate batch error for "${fileName}":`, message);
      results.push({ fileName, success: false, error: message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  res.json({ success: true, results, rotated: successCount, total: files.length, targetKey: actualTargetKey });
});

export default router;
