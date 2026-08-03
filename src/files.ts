import { createCipheriv, randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
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

            const hash = createHash("md5").update(this.fileName).digest("hex");
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

}

interface FileMetadata {
    fileName: string;
    iv: string;
    size: number;
    uploadDate: string;
}