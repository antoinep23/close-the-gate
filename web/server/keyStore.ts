import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import KeyModule from '../../src/keys';

const Key = (KeyModule as any).default || KeyModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');

// In-memory key store for high-security mode
export const keyStore = new Map<string, Buffer>();
let _keyStoreUnlocked = false;
let _sessionPassword: string | null = null;
let lockTimeout: ReturnType<typeof setTimeout> | null = null;
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Securely wipe all key buffers from memory (fill with zeros)
 * before removing references, to prevent heap memory remnants.
 */
export function secureWipe() {
  for (const buffer of keyStore.values()) {
    buffer.fill(0);
  }
  keyStore.clear();
  _keyStoreUnlocked = false;
  _sessionPassword = null;
}

export function isUnlocked(): boolean {
  return _keyStoreUnlocked;
}

export function setUnlocked(value: boolean) {
  _keyStoreUnlocked = value;
  if (!value) _sessionPassword = null;
}

export function setSessionPassword(password: string) {
  _sessionPassword = password;
}

export function getSessionPassword(): string | null {
  return _sessionPassword;
}

export function resetLockTimeout() {
  if (lockTimeout) clearTimeout(lockTimeout);
  lockTimeout = setTimeout(() => {
    secureWipe();
    console.log('High security: keys securely wiped due to inactivity');
  }, TIMEOUT_MS);
}

export function clearLockTimeout() {
  if (lockTimeout) {
    clearTimeout(lockTimeout);
    lockTimeout = null;
  }
}

export function isHighSecurity(): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return Boolean(data.highSecurity);
  } catch {
    return false;
  }
}

/**
 * Retrieve a key: from RAM if high-security mode, from disk otherwise.
 * Returns an instantiated Key object with material loaded.
 */
export function retrieveKey(keyName: string, keysPath: string) {
  const key = new Key();
  if (isHighSecurity()) {
    if (!_keyStoreUnlocked) {
      throw new Error('Keys are locked. Unlock with your password first.');
    }
    const buffer = keyStore.get(keyName);
    if (!buffer) {
      throw new Error(`Key "${keyName}" not found in memory store`);
    }
    key.retrieveFromBuffer(keyName, buffer);
    resetLockTimeout();
  } else {
    key.retrieve(keyName, keysPath);
  }
  return key;
}
