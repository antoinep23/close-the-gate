import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

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
