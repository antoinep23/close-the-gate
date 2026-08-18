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
    const key = new Key();
    key.retrieve(keyName, keysPath);

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

  const settings = getSettings();
  const keysPath = resolveFromRoot(settings.keysPath);

  try {
    const key = new Key();
    key.retrieve(keyName, keysPath);

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
    // 1. Download & decrypt with current key
    const currentKey = new Key();
    currentKey.retrieve(currentKeyName, keysPath);

    const file = new File();
    await file.download(fileName, currentKey, filesPath);

    // 2. Delete old encrypted version from S3 + DynamoDB
    await file.delete(fileName, currentKey);

    // 3. Re-encrypt and upload with new key
    const newKey = new Key();
    newKey.retrieve(newKeyName, keysPath);

    const uploadFile = new File();
    await uploadFile.upload(fileName, newKey, filesPath);

    res.json({ success: true, message: `Key rotated for "${fileName}"` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Rotate error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
