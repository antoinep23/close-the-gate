import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Key from "./keys";

export default class File {
    public localPath: string | null;
    private fileName: string | null;
    private buffer: Buffer | null;
    private key: Key | null;
    private s3Client: S3Client;
    private bucketName: string;

    constructor(bucketName: string) {
        this.localPath = null;
        this.fileName = null;
        this.buffer = null;
        this.key = null;
        this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
        this.bucketName = bucketName;
    }

    public async upload(fileName: string, key: Key): Promise<string> {
        this.key = key;
        this.fileName = fileName;
        const path = join(process.cwd(), `files/${fileName}`);
        this.localPath = path;
        this.retrieve();

        const payload = this.encrypt();
        const uploadPath = await this.writeToS3(payload);

        return uploadPath;
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

    private async writeToS3(payload: Buffer): Promise<string> {
        if (!this.fileName || !this.bucketName) {
            throw new Error("Can not write to S3 as the names are not correctly passed")
        }

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: this.fileName,
            Body: payload,
            ContentType: 'application/octet-stream', 
        });

        try {
            await this.s3Client.send(command);
            return "File successfuly uploaded encrypted to the S3 bucket"
        } catch (e) {
            throw new Error(`Error while uploading to S3: ${e}`);
        }
    }
}