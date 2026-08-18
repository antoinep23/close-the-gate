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
import KeyModule from '../../src/keys';

// Handle default export interop (CJS/ESM mismatch)
const Key = (KeyModule as any).default || KeyModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');

// Load .env from root project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = 3001;

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

// --- Keys listing endpoint ---

app.get('/api/keys', (_req, res) => {
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

    fs.mkdirSync(keysDir, { recursive: true });
    const fileName = keyName ? `${keyName}.pem` : `${randomUUID()}.pem`;
    const filePath = path.join(keysDir, fileName);

    fs.writeFileSync(filePath, keyMaterial.export(), { mode: 0o600 });

    res.json({ success: true, keyName: fileName, path: filePath });
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

    const filePath = path.join(keysDir, keyName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    fs.unlinkSync(filePath);
    res.json({ success: true });
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
      .filter((f) => f.endsWith('.ctg-backup'))
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

// --- Open file endpoint ---

app.post('/api/open', (req, res) => {
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
        keyName: record.keyName
      };
    });

    res.json(files);
  } catch (err) {
    console.error('DynamoDB scan error:', err);
    res.status(500).json({ error: 'Failed to fetch files from DynamoDB' });
  }
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
