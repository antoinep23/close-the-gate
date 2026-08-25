import fs from 'fs';
import path from 'path';
import { createHmac, randomBytes, randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, '../../log');
const LOG_FILE = path.join(LOG_DIR, 'audit.jsonl');
const SECRET_FILE = path.join(LOG_DIR, '.audit-secret');

export type AuditAction =
  | 'upload'
  | 'download'
  | 'delete'
  | 'preview'
  | 'rename'
  | 'move'
  | 'rotate'
  | 'rotate-batch'
  | 'key-generate'
  | 'key-delete'
  | 'key-backup'
  | 'key-restore'
  | 'folder-create'
  | 'folder-delete'
  | 'folder-rename'
  | 'folder-move'
  | 'lock'
  | 'unlock'
  | 'high-security-enable'
  | 'high-security-disable';

export interface AuditEntry {
  eventId: string;
  timestamp: string;
  action: AuditAction;
  details: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

/**
 * Get or create the HMAC secret used for the hash chain.
 * This secret is stored in the log directory and is generated once.
 */
function getSecret(): Buffer {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE);
  }

  // Generate a 32-byte random secret
  const secret = randomBytes(32);
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

const secret = getSecret();

/**
 * Get the hash of the last log entry (or "genesis" if the log is empty).
 */
function getLastHash(): string {
  if (!fs.existsSync(LOG_FILE)) return 'genesis';

  const content = fs.readFileSync(LOG_FILE, 'utf-8').trimEnd();
  if (!content) return 'genesis';

  const lines = content.split('\n');
  const lastLine = lines[lines.length - 1];

  try {
    const entry: AuditEntry = JSON.parse(lastLine);
    return entry.hash;
  } catch {
    return 'genesis';
  }
}

/**
 * Compute the HMAC for a log entry.
 * The hash covers: timestamp + action + details + prevHash
 */
function computeHash(timestamp: string, action: string, details: Record<string, unknown>, prevHash: string): string {
  const payload = JSON.stringify({ timestamp, action, details, prevHash });
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Append a new audit log entry with HMAC chain integrity.
 */
export function audit(action: AuditAction, details: Record<string, unknown> = {}): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });

    const timestamp = new Date().toISOString();
    const prevHash = getLastHash();
    const hash = computeHash(timestamp, action, details, prevHash);
    const eventId = randomUUID().split('-')[0];

    const entry: AuditEntry = { eventId, timestamp, action, details, prevHash, hash };
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (err) {
    // Audit logging should never crash the server
    console.error('Audit log write error:', err);
  }
}

/**
 * Read audit log entries. Returns the most recent N entries.
 */
export function readAuditLog(limit = 100): AuditEntry[] {
  if (!fs.existsSync(LOG_FILE)) return [];

  const content = fs.readFileSync(LOG_FILE, 'utf-8').trimEnd();
  if (!content) return [];

  const lines = content.split('\n');
  const entries: AuditEntry[] = [];

  // Take the last N lines
  const start = Math.max(0, lines.length - limit);
  for (let i = start; i < lines.length; i++) {
    try {
      entries.push(JSON.parse(lines[i]));
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

/**
 * Verify the integrity of the entire audit log chain.
 * Returns { valid: true } if all entries are consistent,
 * or { valid: false, brokenAt: index, reason: string } if tampered.
 */
export function verifyAuditLog(): { valid: boolean; totalEntries: number; brokenAt?: number; reason?: string } {
  if (!fs.existsSync(LOG_FILE)) return { valid: true, totalEntries: 0 };

  const content = fs.readFileSync(LOG_FILE, 'utf-8').trimEnd();
  if (!content) return { valid: true, totalEntries: 0 };

  const lines = content.split('\n');
  let expectedPrevHash = 'genesis';

  for (let i = 0; i < lines.length; i++) {
    let entry: AuditEntry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      return { valid: false, totalEntries: lines.length, brokenAt: i, reason: 'Malformed JSON entry' };
    }

    // Verify chain link
    if (entry.prevHash !== expectedPrevHash) {
      return { valid: false, totalEntries: lines.length, brokenAt: i, reason: 'Chain broken: prevHash mismatch' };
    }

    // Verify HMAC
    const expectedHash = computeHash(entry.timestamp, entry.action, entry.details, entry.prevHash);
    if (entry.hash !== expectedHash) {
      return { valid: false, totalEntries: lines.length, brokenAt: i, reason: 'HMAC verification failed: entry tampered' };
    }

    expectedPrevHash = entry.hash;
  }

  return { valid: true, totalEntries: lines.length };
}
