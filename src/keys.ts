import { randomBytes, createSecretKey, KeyObject, randomUUID} from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export default class Key {
    public id: string;
    public material: KeyObject | null;
    private path: string | null;

    constructor() {
        this.id = this.assignId();
        this.material = null;
        this.path = null;
    }

    private assignId(): string {
        const id = randomUUID();
        return id;
    }

    public generate(bytes: number = 32): KeyObject {
        if (bytes < 16 || bytes > 64) {
            throw new Error("Key size must be between 16 and 64 bytes (leave empty for default 32 bytes)");
        }

        const rawBytes = randomBytes(bytes);
        this.material = createSecretKey(rawBytes);
        this.saveLocaly();

        return this.material;
    }

    public delete(): string | Error {
        if (!this.material || !this.path) {
            return new Error("Impossible to delete the key as it is not generated yet");
        }

        try {
            unlinkSync(this.path)
            return "Key deleted successfuly"
        } catch(e) {
            return new Error(`Impossible to delete the key: ${e}`)
        } finally {
            this.material = null;
            this.path = null;
        }
    }

    private saveLocaly(): void {
        if (!this.material) {
            throw new Error("Impossible to save the key localy as there is no key material generated");
        }

        const dirPath = join(process.cwd(), 'keys');
        const keyName = this.id + ".pem";
        const filePath = join(dirPath, keyName);
        this.path = filePath;

        mkdirSync(dirPath, { recursive: true });

        const keyBuffer = this.material.export();

        writeFileSync(filePath, keyBuffer, { mode: 0o600 });
    }

    public retrieve(keyName: string): KeyObject | Error {
        try {
            const path = join(process.cwd(), 'keys', keyName);
            const keyBuffer = readFileSync(path);
            
            this.material = createSecretKey(keyBuffer);
            this.path = path;

            return this.material;
        } catch (e) {
            return new Error(`Error while retrieving the key: ${e}`);
        }
    }
}