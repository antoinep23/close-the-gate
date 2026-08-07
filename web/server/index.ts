import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from root project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = 3001;

app.use(cors());

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
