import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test the keyStore module in isolation
describe('keyStore', () => {
  let keyStoreMod: typeof import('../server/keyStore');

  beforeEach(async () => {
    // Dynamic import to get fresh module state
    vi.resetModules();
    keyStoreMod = await import('../server/keyStore');
  });

  it('should start with locked state', () => {
    expect(keyStoreMod.isUnlocked()).toBe(false);
  });

  it('should track unlock state', () => {
    keyStoreMod.setUnlocked(true);
    expect(keyStoreMod.isUnlocked()).toBe(true);
    keyStoreMod.setUnlocked(false);
    expect(keyStoreMod.isUnlocked()).toBe(false);
  });

  it('should store and retrieve keys from RAM', () => {
    const buffer = Buffer.from('test-key-material-32-bytes-long!');
    keyStoreMod.keyStore.set('test.pem', buffer);
    keyStoreMod.setUnlocked(true);

    expect(keyStoreMod.keyStore.has('test.pem')).toBe(true);
    expect(keyStoreMod.keyStore.get('test.pem')).toBe(buffer);
  });

  it('secureWipe should zero all buffers', () => {
    const buf1 = Buffer.from('secret-key-material-aaaaaaa!!!!');
    const buf2 = Buffer.from('another-secret-key-bbbbbbbbbbb!');
    keyStoreMod.keyStore.set('key1.pem', buf1);
    keyStoreMod.keyStore.set('key2.pem', buf2);
    keyStoreMod.setUnlocked(true);

    keyStoreMod.secureWipe();

    // Buffers should be zeroed
    expect(buf1.every((b) => b === 0)).toBe(true);
    expect(buf2.every((b) => b === 0)).toBe(true);
    // Store should be empty
    expect(keyStoreMod.keyStore.size).toBe(0);
    expect(keyStoreMod.isUnlocked()).toBe(false);
  });

  it('session password should be cleared on lock', () => {
    keyStoreMod.setSessionPassword('my-secret');
    expect(keyStoreMod.getSessionPassword()).toBe('my-secret');

    keyStoreMod.setUnlocked(false);
    expect(keyStoreMod.getSessionPassword()).toBeNull();
  });
});
