import { createCipheriv, randomBytes, KeyObject } from "node:crypto";
import { mkdirSync, readFileSync} from "node:fs";
import { join } from "node:path";
import Key from "./keys";

export default class File {
    public localPath: string | null;
    private buffer: Buffer | null;
    private key: Key | null;

    constructor() {
        this.localPath = null;
        this.buffer = null;
        this.key = null;
    }

    public upload(fileName: string, key: Key): string {
        const path = join(process.cwd(), `files/${fileName}`);
        this.localPath = path;
        this.retrieve();

        const payload = this.encrypt();


        return "S3 PATH"
        }

    private retrieve(): void {
        if (!this.localPath) {
            throw new Error("Error to retrieve the file: no local path has been defined yet");
        }

        try {
            const rawFile = readFileSync(this.localPath); // work for 'not too big' files. implement stream later
            this.buffer = rawFile;
        } catch(e) {
            throw new Error(`Error while retrieving the file on the local machine: ${e}`);
        }
    }


    private encrypt(): Buffer {
        const keyMaterial = this.key?.material;

        if (!keyMaterial) {
            throw new Error("Encryption is not possible as the key material is missing")
        }

        if (!this.buffer) {
            throw new Error("Encryption is not possible as the buffer is missing")
        }

        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', keyMaterial, iv);

        const encryptedFile = Buffer.concat([
            cipher.update(this.buffer),
            cipher.final()
        ]);

        const payload = Buffer.concat([iv, encryptedFile]);
        return payload;
    }

    private writeToS3() {}
}