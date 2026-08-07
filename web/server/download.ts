import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { fileURLToPath } from 'url';
import KeyModule from '../../src/keys';
import FileModule from '../../src/files';

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
 *
 * Downloads and decrypts a file from S3 using the key associated
 * with the file (stored in DynamoDB metadata), then saves it to
 * the configured download path.
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
    // Retrieve the key from the configured keys directory
    const key = new Key();
    key.retrieve(keyName, keysPath);

    // Download and decrypt the file from S3
    const file = new File();
    const outputPath = await file.download(fileName, key, downloadPath);

    res.json({ success: true, outputPath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Download error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
