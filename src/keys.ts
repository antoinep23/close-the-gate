import { randomBytes, createSecretKey, KeyObject, randomUUID} from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default class Key {
    public material: KeyObject | null;

    constructor() {
        this.material = null;
    }

    public generate(): KeyObject {
        const rawBytes = randomBytes(32);
        this.material = createSecretKey(rawBytes);
        this.saveLocaly();

        return this.material;
    }

    private saveLocaly(): void {
        if (!this.material) {
            throw new Error("Impossible to save the key localy as there is no key material generated");
        }

        const dirPath = join(process.cwd(), 'keys');
        const keyName = randomUUID() + ".pem";
        const filePath = join(dirPath, keyName);

        mkdirSync(dirPath, { recursive: true });

        const keyBuffer = this.material.export();

        writeFileSync(filePath, keyBuffer, { mode: 0o600 });
    }
}