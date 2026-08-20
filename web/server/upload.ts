import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { randomUUID } from 'crypto';
import KeyModule from '../../src/keys';
import FileModule from '../../src/files';
import { retrieveKey } from './keyStore';

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

// In-memory progress store for active uploads
interface UploadProgress {
  phase: string;
  percent: number;
  done: boolean;
  error?: string;
}

const progressStore = new Map<string, UploadProgress>();

/**
 * POST /api/upload
 * Multipart form: file (the file to upload), keyName (string)
 *
 * 1. Saves the file to the configured filesPath via multer
 * 2. Returns an uploadId immediately
 * 3. Starts the encryption + S3 upload in the background with progress tracking
 */
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      res.status(400).json({ error: err.message });
      return;
    }

    const keyName = req.body.keyName;
    const folder = req.body.folder || '/';
    const uploadedFile = req.file;

    if (!uploadedFile || !keyName) {
      res.status(400).json({ error: 'file and keyName are required' });
      return;
    }

    // Generate a unique upload ID and initialize progress
    const uploadId = randomUUID();
    progressStore.set(uploadId, { phase: 'queued', percent: 0, done: false });

    // Respond immediately with the upload ID so the client can subscribe to SSE
    res.json({ success: true, uploadId });

    // Start the server-side processing in the background
    const settings = getSettings();
    const keysPath = resolveFromRoot(settings.keysPath);
    const filesPath = resolveFromRoot(settings.filesPath);

    (async () => {
      try {
        const key = retrieveKey(keyName, keysPath);

        const file = new File();
        await file.upload(uploadedFile.originalname, key, filesPath, false, (phase: string, percent: number) => {
          progressStore.set(uploadId, { phase, percent, done: false });
        }, folder);

        // Delete local file after successful upload (no need to keep it on disk)
        const localFilePath = path.join(filesPath, uploadedFile.originalname);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }

        progressStore.set(uploadId, { phase: 'complete', percent: 100, done: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Upload error:', message);
        progressStore.set(uploadId, { phase: 'error', percent: 0, done: true, error: message });
      }

      // Clean up progress after 60s
      setTimeout(() => progressStore.delete(uploadId), 60_000);
    })();
  });
});

/**
 * GET /api/upload/progress/:id
 * Server-Sent Events endpoint that streams real-time progress for an upload.
 */
router.get('/upload/progress/:id', (req, res) => {
  const uploadId = req.params.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const interval = setInterval(() => {
    const progress = progressStore.get(uploadId);

    if (!progress) {
      // Upload ID not found (expired or invalid)
      res.write(`data: ${JSON.stringify({ phase: 'error', percent: 0, done: true, error: 'Upload not found' })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify(progress)}\n\n`);

    if (progress.done) {
      clearInterval(interval);
      res.end();
    }
  }, 200); // Poll every 200ms for smooth progress updates

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;
