import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { fileURLToPath } from 'url';
import multer from 'multer';
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

// Configure multer to store uploaded files in the configured filesPath
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const settings = getSettings();
    const filesDir = resolveFromRoot(settings.filesPath);
    fs.mkdirSync(filesDir, { recursive: true });
    cb(null, filesDir);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const router = Router();

/**
 * POST /api/upload
 * Multipart form: file (the file to upload), keyName (string)
 *
 * 1. Saves the file to the configured filesPath
 * 2. Encrypts and uploads to S3 using the specified key
 */
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      res.status(400).json({ error: err.message });
      return;
    }

    const keyName = req.body.keyName;
    const uploadedFile = req.file;

    if (!uploadedFile || !keyName) {
      res.status(400).json({ error: 'file and keyName are required' });
      return;
    }

    const settings = getSettings();
    const keysPath = resolveFromRoot(settings.keysPath);
    const filesPath = resolveFromRoot(settings.filesPath);

    try {
      // Retrieve the key
      const key = new Key();
      key.retrieve(keyName, keysPath);

      // Upload (encrypt + S3 + DynamoDB)
      const file = new File();
      const result = await file.upload(uploadedFile.originalname, key, filesPath);

      res.json({ success: true, message: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Upload error:', message);
      res.status(500).json({ error: message });
    }
  });
});

export default router;
