import { createCipheriv, randomBytes, createHmac } from "node:crypto";
import { writeFileSync, mkdirSync, createReadStream } from "node:fs";
import { join } from "node:path";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from "@aws-sdk/lib-storage";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import Key from "./keys";
import { FileMetadata } from "./interfaces";

export type ProgressCallback = (phase: string, percent: number) => void;

export default class File {
    public localPath: string | null;
    public customPath: string | null;
    private fileName: string | null;
    private hashName: string | null;
    private isStarred: boolean;
    private buffer: Buffer | null;
    private key: Key | null;
    private s3Client: S3Client;
    private bucketName: string;
    private dynamoDBClient: DynamoDBClient;
    private dynamoTableName: string;

    constructor() {
        this.localPath = null;
        this.customPath = null;
        this.fileName = null;
        this.hashName = null;
        this.isStarred = false;
        this.buffer = null;
        this.key = null;
        this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        this.bucketName = process.env.S3_BUCKET!;
        this.dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.dynamoTableName = process.env.DYNAMO_TABLE!;
    }

    public async upload(fileName: string, key: Key, customPath?: string, isStarred?: boolean, onProgress?: ProgressCallback): Promise<string> {
        this.key = key;
        this.fileName = fileName;
        this.isStarred = isStarred || false;

        if (customPath) this.customPath = customPath;
        this.configureDirPath("files");
        const path = join(this.localPath as string, fileName);
        this.localPath = path;

        if (onProgress) onProgress('reading', 0);
        await this.retrieve();
        if (onProgress) onProgress('reading', 100);

        if (onProgress) onProgress('encrypting', 0);
        const payload = this.encrypt();
        if (onProgress) onProgress('encrypting', 100);

        try {
            const uploadPath = await this.writeToS3(payload, onProgress);
            if (onProgress) onProgress('metadata', 0);
            await this.writeToDynamoDB();
            if (onProgress) onProgress('metadata', 100);

            return uploadPath;
        } catch (e: unknown) {
            throw new Error(`Error while uploading the file: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
        }
    }

    private retrieve(): Promise<string> {
        const localPath = this.localPath;

        if (!localPath) {
            throw new Error("Error to retrieve the file: no local path has been defined yet");
        }

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const readStream = createReadStream(localPath);

            readStream.on("data", (chunk: Buffer) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            readStream.on("end", () => {
                this.buffer = Buffer.concat(chunks);
                resolve("File successfully read into buffer");
            });
            readStream.on("error", (err) => {
                reject(new Error(`Error while reading the file: ${err}`));
            });
        });
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

    private signName(): string {
        if (!this.fileName) {
            throw new Error("Error to sign the file name: no file name has been defined yet");
        }

        if (!this.key?.material) {
            throw new Error("Error to sign the file name: no key material");
        }

            const hash = createHmac("sha256", this.key.material)
            .update(this.fileName)
            .digest("hex");

            this.hashName = hash;
            return hash;
        }

    private async writeToS3(payload: Buffer, onProgress?: ProgressCallback): Promise<string> {
        if (!this.fileName || !this.bucketName) {
            throw new Error("Can not write to S3 as the names are not correctly passed")
        }

        const name = this.signName();
        const totalBytes = payload.length;

        const upload = new Upload({
            client: this.s3Client,
            params: {
                Bucket: this.bucketName,
                Key: name,
                Body: payload,
                ContentType: 'application/octet-stream',
            },
            // Use 5MB parts for multipart (default)
            partSize: 5 * 1024 * 1024,
            queueSize: 4,
        });

        upload.on("httpUploadProgress", (progress) => {
            if (onProgress && progress.loaded) {
                const percent = Math.round((progress.loaded / totalBytes) * 100);
                onProgress('s3', percent);
            }
        });

        try {
            await upload.done();
            return "File successfuly uploaded encrypted to the S3 bucket"
        } catch (e: unknown) {
            throw new Error(`Error while uploading to S3: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
        }
    }

    private async writeToDynamoDB() : Promise<string> {
        if (!this.fileName || !this.buffer) {
            throw new Error("Can not write to DynamoDB as the file name or buffer are missing")
        }

        const metadata: FileMetadata = {
            fileName: this.fileName!,
            size: this.buffer!.length,
            uploadDate: new Date().toISOString(),
            isStarred: this.isStarred,
            keyName: this.key?.id + ".pem" || "unknown",
        };

        try {
            if(!this.dynamoDBClient || !this.dynamoTableName) {
                throw new Error("DynamoDB client is not initialized or table name is missing");
            }

            const command = new PutCommand({
            TableName: this.dynamoTableName,
            Item: metadata,
        });
        await this.dynamoDBClient.send(command);

        return "File metadata successfully uploaded to DynamoDB";
        } catch (e: unknown) {
            throw new Error(`Error while uploading metadata to DynamoDB: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);    
        }
    }

    public async download(fileName: string, key: Key, customPath?: string): Promise<string | Error> {
        this.key = key;
        this.fileName = fileName;
        if (!this.key || !this.fileName) {
            throw new Error("Impossible to download the file as one or some arguments passed to the function are missing");
        }

        if (customPath) this.customPath = customPath;
        this.configureDirPath("download");

        this.signName();

        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: this.hashName!,
        });

        try {
            const response = await this.s3Client.send(command);
            const chunks: Uint8Array[] = [];
            for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
                chunks.push(chunk);
            }
            const encryptedData = Buffer.concat(chunks);
            const decryptedData = this.decrypt(encryptedData);

            mkdirSync(this.localPath as string, { recursive: true });

            writeFileSync(join(this.localPath as string, fileName), decryptedData);

            return `${this.localPath}/${fileName}`;
        } catch (e: unknown) {
            throw new Error(`Error while downloading from S3 - ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
        }
    }

    private decrypt(encryptedData: Buffer): Buffer {
        if (!this.key?.material) {
            throw new Error("Decryption is not possible as the key material is missing");
        }

        const iv = encryptedData.subarray(0, 12);
        const encryptedFile = encryptedData.subarray(12);

        const decipher = createCipheriv('aes-256-gcm', this.key.material, iv);
        const decryptedFile = Buffer.concat([
            decipher.update(encryptedFile),
            decipher.final()
        ]);

        return decryptedFile;
    }

    public async delete(fileName: string, key: Key): Promise<string> {
        this.fileName = fileName;
        this.key = key;

        if (!this.key || !this.fileName) {
            throw new Error("Impossible to delete the file as one or some arguments passed to the function are missing");
        }

        this.signName();

        if (!this.hashName) {
            throw new Error("Impossible to delete the file as the hash name is not present");
        }

        const input = { 
            Bucket: this.bucketName,
            Key: this.hashName,
        };

        try {
            // S3 command
            const s3Command = new DeleteObjectCommand(input);
            await this.s3Client.send(s3Command);

            // DynamoDB command
            const dynamoDBCommand = new DeleteCommand({
                TableName: this.dynamoTableName,
                Key: { fileName: this.fileName },
            });
            await this.dynamoDBClient.send(dynamoDBCommand);

            return "File deleted successfuly";
        } catch(e: unknown) {
            throw new Error(`Error while deleting the file - ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
        }
    }

    private configureDirPath(customDir: string = "files"): string {
        const path = this.customPath != null ? this.customPath : join(process.cwd(), customDir);
        this.localPath = path;
        mkdirSync(this.localPath as string, { recursive: true });
        return this.localPath;
    }
}
