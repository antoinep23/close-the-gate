import { createCipheriv, randomBytes, createHmac } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import Key from "./keys";

export default class File {
    public localPath: string | null;
    private fileName: string | null;
    private hashName: string | null;
    private buffer: Buffer | null;
    private key: Key | null;
    private iv: string | null;
    private s3Client: S3Client;
    private bucketName: string;
    private dynamoDBClient: DynamoDBClient;
    private dynamoTableName: string;

    constructor() {
        this.localPath = null;
        this.fileName = null;
        this.hashName = null;
        this.buffer = null;
        this.key = null;
        this.iv = null;
        this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        this.bucketName = process.env.S3_BUCKET!;
        this.dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.dynamoTableName = process.env.DYNAMO_TABLE!;
    }

    public async upload(fileName: string, key: Key): Promise<string> {
        this.key = key;
        this.fileName = fileName;
        const path = join(process.cwd(), `files/${fileName}`);
        this.localPath = path;
        this.retrieve();

        const payload = this.encrypt();
        let uploadPath = null;

        try {
            uploadPath = await this.writeToS3(payload);
            await this.writeToDynamoDB();
        } catch (e) {
            throw new Error(`Error while uploading the file: ${e}`);
        }

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
        this.iv = iv.toString('base64');
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

    private async writeToS3(payload: Buffer): Promise<string> {
        if (!this.fileName || !this.bucketName) {
            throw new Error("Can not write to S3 as the names are not correctly passed")
        }

        const name = this.signName();
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: name,
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

    private async writeToDynamoDB() : Promise<string> {
        if (!this.fileName || !this.iv || !this.buffer) {
            throw new Error("Can not write to DynamoDB as the file name, iv or buffer are missing")
        }

        const metadata: FileMetadata = {
            fileName: this.fileName!,
            iv: this.iv!,
            size: this.buffer!.length,
            uploadDate: new Date().toISOString(),
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
        } catch (e) {
            throw new Error(`Error while uploading metadata to DynamoDB: ${e}`);    
        }
    }

    public async download(fileName: string, key: Key): Promise<string> {
        this.key = key;
        this.fileName = fileName;
        if (!this.key || !this.fileName) {
            throw new Error("Impossible to download the file as one or some arguments passed to the function are missing");
        }

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

            const dirPath = join(process.cwd(), 'download');
            mkdirSync(dirPath, { recursive: true });

            writeFileSync(join(dirPath, fileName), decryptedData);

            return `download/${fileName}`;
        } catch (e) {
            throw new Error(`Error while downloading from S3: ${e}`);
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
            const command = new DeleteObjectCommand(input);
            await this.s3Client.send(command);

            // DynamoDB command
            const deleteCommand = new DeleteCommand({
                TableName: this.dynamoTableName,
                Key: { fileName: this.fileName },
            });
            await this.dynamoDBClient.send(deleteCommand);

            return "File deleted successfuly";
        } catch(e) {
            throw new Error(`Error while deleting the file: ${e}`);
        }
    }
}

interface FileMetadata {
    fileName: string;
    iv: string;
    size: number;
    uploadDate: string;
}