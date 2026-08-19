import { randomBytes, createSecretKey, KeyObject, randomUUID, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export default class Key {
    public id: string;
    public material: KeyObject | null;
    private path: string | null;
    private customPath: string | null;
    private customName: string | null;

    constructor() {
        this.id = this.assignId();
        this.material = null;
        this.path = null;
        this.customPath = null;
        this.customName = null;
    }

    private assignId(): string {
        const id = randomUUID();
        return id;
    }

    public generate(bytes: number = 32, keyName?: string, customPath?: string): string {
        if (bytes < 16 || bytes > 64) {
            throw new Error("Key size must be between 16 and 64 bytes (leave empty for default 32 bytes)");
        }

        if (keyName != null) {
            this.customName = keyName;
        }

        if (customPath) this.customPath = customPath;

        const rawBytes = randomBytes(bytes);
        this.material = createSecretKey(rawBytes);
        this.configureDirPath();
        this.saveLocaly();

        return this.path as string;
    }

    public delete(): string | Error {
        if (!this.material || !this.path) {
            return new Error("Impossible to delete the key as it is not generated yet");
        }

        try {
            unlinkSync(this.path)
            return "Key deleted successfuly"
        } catch(e: unknown) {
            return new Error(`Impossible to delete the key: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`)
        } finally {
            this.material = null;
            this.path = null;
            this.customPath = null;
        }
    }

    private saveLocaly(): void {
        if (!this.material) {
            throw new Error("Impossible to save the key localy as there is no key material generated");
        }

        const keyName = this.customName ? `${this.customName}.pem` : `${this.id}.pem`;
        const filePath = join(this.path as string, keyName);
        this.path = filePath;

        const keyBuffer = this.material.export();

        writeFileSync(this.path, keyBuffer, { mode: 0o600 });
    }

    private configureDirPath(): string {
        const path = this.customPath != null ? this.customPath : join(process.cwd(), "keys");
        this.path = path;
        mkdirSync(this.path as string, { recursive: true });
        return this.path;
    }

    public retrieve(keyName: string, customPath?: string): KeyObject | Error {
        if (customPath) this.customPath = customPath;
        this.configureDirPath();

        this.id = keyName.replace(/\.pem$/, '');
        
        try {
            const path = join(this.path as string, keyName);
            this.path = path;
            
            const keyBuffer = readFileSync(this.path);
            this.material = createSecretKey(keyBuffer);

            return this.material;
        } catch (e: unknown) {
            throw new Error(`Error while retrieving the key: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
        }
    }

    /**
     * Load a key from a raw Buffer (for high-security mode where keys live only in RAM).
     * No disk access is performed.
     */
    public retrieveFromBuffer(keyName: string, buffer: Buffer): KeyObject {
        this.id = keyName.replace(/\.pem$/, '');
        this.material = createSecretKey(buffer);
        return this.material;
    }

    /**
     * Create a password-protected backup of all keys in a directory.
     * Format: [salt 32B][iv 12B][authTag 16B][encrypted JSON payload]
     * Encryption: AES-256-GCM with key derived via PBKDF2 (600k iterations, SHA-512)
     */
    public static backup(password: string, keysPath?: string, outputPath?: string): string {
        const keysDir = keysPath || join(process.cwd(), 'keys');
        const outDir = outputPath || keysDir;

        // Read all .pem key files
        const keyFiles = readdirSync(keysDir).filter((f) => f.endsWith('.pem'));

        if (keyFiles.length === 0) {
            throw new Error('No keys found to backup');
        }

        const keys = keyFiles.map((fileName) => {
            const content = readFileSync(join(keysDir, fileName));
            return { name: fileName, material: content.toString('base64') };
        });

        const payload = JSON.stringify({
            version: 1,
            createdAt: new Date().toISOString(),
            keys,
        });

        // Derive encryption key from password
        const salt = randomBytes(32);
        const derivedKey = pbkdf2Sync(password, salt, 600_000, 32, 'sha512');

        // Encrypt the payload
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
        const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // Assemble: salt + iv + authTag + ciphertext
        const backupBuffer = Buffer.concat([salt, iv, authTag, encrypted]);

        const backupFileName = `ctg-backup-${new Date().toISOString().slice(0, 10)}.ctg-backup`;
        const backupPath = join(outDir, backupFileName);
        writeFileSync(backupPath, backupBuffer, { mode: 0o600 });

        return backupPath;
    }

    /**
     * Restore keys from a password-protected backup file.
     * Decrypts the backup and writes each key back to the keys directory.
     */
    public static restore(password: string, backupPath: string, keysPath?: string): string[] {
        const keysDir = keysPath || join(process.cwd(), 'keys');
        mkdirSync(keysDir, { recursive: true });

        const backupBuffer = readFileSync(backupPath);

        if (backupBuffer.length < 60) {
            throw new Error('Invalid backup file: too small');
        }

        // Extract components
        const salt = backupBuffer.subarray(0, 32);
        const iv = backupBuffer.subarray(32, 44);
        const authTag = backupBuffer.subarray(44, 60);
        const encrypted = backupBuffer.subarray(60);

        // Derive key from password
        const derivedKey = pbkdf2Sync(password, salt, 600_000, 32, 'sha512');

        // Decrypt
        const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted: string;
        try {
            decrypted = decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
        } catch {
            throw new Error('Wrong password or corrupted backup file');
        }

        const data = JSON.parse(decrypted);

        if (!data.version || !Array.isArray(data.keys)) {
            throw new Error('Invalid backup file format');
        }

        // Write each key back
        const restoredKeys: string[] = [];
        for (const entry of data.keys) {
            const keyBuffer = Buffer.from(entry.material, 'base64');
            const keyPath = join(keysDir, entry.name);
            writeFileSync(keyPath, keyBuffer, { mode: 0o600 });
            restoredKeys.push(entry.name);
        }

        return restoredKeys;
    }
}