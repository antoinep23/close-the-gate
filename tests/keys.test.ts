import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import Key from '../src/keys';

describe('Key class', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'ctg-test-keys-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('generate()', () => {
    it('should generate a key with default 32 bytes', () => {
      const key = new Key();
      const path = key.generate(32, undefined, testDir);

      expect(path).toContain(testDir);
      expect(path).toMatch(/\.pem$/);
      expect(existsSync(path)).toBe(true);

      const content = readFileSync(path);
      expect(content.length).toBe(32);
    });

    it('should generate a key with custom name', () => {
      const key = new Key();
      const path = key.generate(32, 'my-key', testDir);

      expect(path).toContain('my-key.pem');
      expect(existsSync(path)).toBe(true);
    });

    it('should generate a key with custom byte length', () => {
      const key = new Key();
      key.generate(64, 'big-key', testDir);

      const content = readFileSync(join(testDir, 'big-key.pem'));
      expect(content.length).toBe(64);
    });

    it('should throw for invalid byte length', () => {
      const key = new Key();
      expect(() => key.generate(8, undefined, testDir)).toThrow();
      expect(() => key.generate(128, undefined, testDir)).toThrow();
    });
  });

  describe('retrieve()', () => {
    it('should retrieve a generated key', () => {
      const key = new Key();
      key.generate(32, 'test-retrieve', testDir);

      const key2 = new Key();
      const material = key2.retrieve('test-retrieve.pem', testDir);

      expect(material).not.toBeInstanceOf(Error);
      expect(key2.material).not.toBeNull();
    });

    it('should throw for non-existent key', () => {
      const key = new Key();
      expect(() => key.retrieve('nonexistent.pem', testDir)).toThrow();
    });
  });

  describe('retrieveFromBuffer()', () => {
    it('should load key from a raw buffer', () => {
      const key = new Key();
      key.generate(32, 'buf-test', testDir);

      const buffer = readFileSync(join(testDir, 'buf-test.pem'));
      const key2 = new Key();
      key2.retrieveFromBuffer('buf-test.pem', buffer);

      expect(key2.material).not.toBeNull();
      expect(key2.id).toBe('buf-test');
    });
  });

  describe('delete()', () => {
    it('should delete a key file', () => {
      const key = new Key();
      const path = key.generate(32, 'to-delete', testDir);

      expect(existsSync(path)).toBe(true);

      const result = key.delete();
      expect(result).toBe('Key deleted successfuly');
      expect(existsSync(path)).toBe(false);
    });
  });

  describe('backup() and restore()', () => {
    it('should create an encrypted backup and restore it', () => {
      // Generate some keys
      const key1 = new Key();
      key1.generate(32, 'key-a', testDir);
      const key2 = new Key();
      key2.generate(32, 'key-b', testDir);

      // Backup
      const password = 'test-password-123';
      const backupPath = Key.backup(password, testDir, testDir);

      expect(existsSync(backupPath)).toBe(true);
      expect(backupPath).toMatch(/\.ctg-backup$/);

      // Delete original keys
      rmSync(join(testDir, 'key-a.pem'));
      rmSync(join(testDir, 'key-b.pem'));

      expect(existsSync(join(testDir, 'key-a.pem'))).toBe(false);

      // Restore
      const restored = Key.restore(password, backupPath, testDir);

      expect(restored).toContain('key-a.pem');
      expect(restored).toContain('key-b.pem');
      expect(existsSync(join(testDir, 'key-a.pem'))).toBe(true);
      expect(existsSync(join(testDir, 'key-b.pem'))).toBe(true);
    });

    it('should fail restore with wrong password', () => {
      const key = new Key();
      key.generate(32, 'key-x', testDir);

      const backupPath = Key.backup('correct-pw', testDir, testDir);

      expect(() => Key.restore('wrong-pw', backupPath, testDir)).toThrow('Wrong password');
    });
  });
});
