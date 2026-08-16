import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import downloadRouter from './download';

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
    res.json(JSON.parse(data));
  } catch {
    res.json({ keysPath: './keys', filesPath: './files', downloadPath: './download' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const settings = req.body;
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

// --- Download endpoint (uses core Key/File classes) ---
app.use('/api', downloadRouter);

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.DYNAMO_TABLE!;

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
