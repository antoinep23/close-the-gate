import { randomBytes, createSecretKey, KeyObject, randomUUID} from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
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
}