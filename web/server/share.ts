import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { fileURLToPath } from 'url';
import { randomBytes, createCipheriv } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { audit } from './auditLog';
import FileModule from '../../src/files';
import { retrieveKey } from './keyStore';

// Handle default export interop (CJS/ESM mismatch)
const File = (FileModule as any).default || FileModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');

/**
 * S3 prefix that holds shared blobs. This is the ONLY prefix the public
 * share lambda is granted read access to (least privilege). Nothing under
 * this prefix is a real user object — each entry is an independent copy
 * re-encrypted with a single-use ephemeral key.
 */
const SHARE_PREFIX = 'shared/';

function getSettings() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return { keysPath: './keys', filesPath: './files', downloadPath: './download' };
  }
}

function resolveFromRoot(p: string): string {
  const projectRoot = path.resolve(configPath, '..');
  return path.isAbsolute(p) ? p : path.resolve(projectRoot, p);
}

/**
 * Minimal extension -> MIME map, used so the share header carries a
 * content type the recipient's browser can render inline. Kept local
 * to this module (the equivalent in download.ts is not exported).
 */
function guessContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
    mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', mov: 'video/quicktime',
    mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
    pdf: 'application/pdf',
    txt: 'text/plain', md: 'text/plain', json: 'application/json', csv: 'text/csv',
    xml: 'text/xml', html: 'text/html', css: 'text/css', js: 'text/javascript',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * base64url without padding — safe to place in a URL fragment.
 */
function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build the share payload:
 *   headerLen(4B BE) ‖ headerJSON(utf8) ‖ fileBytes
 * then encrypt the whole thing with AES-256-GCM under the ephemeral key.
 * Output blob layout (what lands in S3, what the lambda serves verbatim):
 *   IV(12B) ‖ ciphertext ‖ GCM tag(16B)
 * The header (original name + content type) is INSIDE the ciphertext, so the
 * lambda/S3 never learn the file name or type.
 */
function buildEncryptedBlob(ephemeralKey: Buffer, header: object, content: Buffer): Buffer {
  const headerJson = Buffer.from(JSON.stringify(header), 'utf8');
  const headerLen = Buffer.alloc(4);
  headerLen.writeUInt32BE(headerJson.length, 0);
  const plaintext = Buffer.concat([headerLen, headerJson, content]);

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ephemeralKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, ciphertext, tag]);
}

const router = Router();

/**
 * POST /api/share
 * Body: { fileName: string, keyName: string }
 *
 * 1. Decrypts the file in memory with the owner's key (reuses File.preview).
 * 2. Generates a single-use ephemeral 32-byte key.
 * 3. Re-encrypts { name, contentType } + content under the ephemeral key.
 * 4. Uploads the blob to shared/<token> (token is a random opaque id, NOT
 *    the HMAC name, to avoid the deterministic-name correlation of N2).
 * 5. Returns a link of the form  <LAMBDA_URL>/s/<token>#<ephemeralKey base64url>
 *    The key lives only in the URL fragment, which browsers never send to
 *    the server, so the share lambda stays zero-knowledge.
 *
 * The public routes that serve the page and the blob live in the real share
 * Lambda — see lambda/share/index.mjs. This server only mints share links;
 * it never serves the shared content.
 */
router.post('/share', async (req, res) => {
  const { fileName, keyName } = req.body;

  if (!fileName || !keyName) {
    res.status(400).json({ error: 'fileName and keyName are required' });
    return;
  }

  const settings = getSettings();
  const keysPath = resolveFromRoot(settings.keysPath);
  const bucket = process.env.S3_BUCKET;

  if (!bucket) {
    res.status(500).json({ error: 'S3_BUCKET is not configured' });
    return;
  }

  const lambdaBase = (process.env.SHARE_BASE_URL || process.env.LAMBDA_URL || '').replace(/\/$/, '');
  if (!lambdaBase) {
    res.status(500).json({ error: 'LAMBDA_URL (or SHARE_BASE_URL) is not configured' });
    return;
  }

  try {
    // 1. Decrypt in memory with the owner's key (no disk write).
    const ownerKey = retrieveKey(keyName, keysPath);
    const file = new File();
    const plaintext: Buffer = await file.preview(fileName, ownerKey);

    // 2. Ephemeral single-use key.
    const ephemeralKey = randomBytes(32);

    // 3. Re-encrypt with header carrying the original name + content type.
    const header = { name: fileName, contentType: guessContentType(fileName) };
    const blob = buildEncryptedBlob(ephemeralKey, header, plaintext);

    // 4. Upload to the shared/ prefix under an opaque random token.
    const token = toBase64Url(randomBytes(18)); // 24-char url-safe token
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${SHARE_PREFIX}${token}`,
      Body: blob,
      ContentType: 'application/octet-stream',
    }));

    // Capture the key fragment, then wipe the material from our heap.
    const keyFragment = toBase64Url(ephemeralKey);
    ephemeralKey.fill(0);

    // 5. Build the link pointing at the public share Lambda (Function URL).
    // The key travels only in the fragment (#...), never sent to the Lambda.
    const link = `${lambdaBase}/s/${token}#${keyFragment}`;

    // Audit WITHOUT the key fragment — never log the decryption key.
    audit('share', { fileName, keyName, token });

    res.json({ success: true, link, token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Share error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
