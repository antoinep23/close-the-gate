# Close the gate

## Description

A privacy-first software to upload encrypted-only files to AWS S3 while having full control and ownership over the keys and the encryption process.

It follows a strict Zero-Knowledge architecture: the cloud provider (AWS S3) and the database (DynamoDB) never have access to the raw data or the cryptographic keys.

All cryptographic operations (key generation, AES-256-GCM encryption, HMAC SHA-256 signing) are performed locally on the client/middleware side.

The software is developped using TypeScript over Node.js.

## Features Summary

- Local cryptographic key generation and secure local storage (mode 0600)
- AES-256-GCM file encryption using random Initialization Vectors (IV)
- HMAC SHA-256 file name hashing
- Secure payload structure for S3 upload (IV + Ciphertext)
- DynamoDB integration for metadata tracking

## Prerequisites

- Node.js (v20.6.0+ recommended for native .env support).
- AWS Credentials configured locally (or via .env).

## Configuration

Create a `.env` file at the root of the project with your AWS configuration:

```
AWS_REGION=your-region
S3_BUCKET=your-bucket-name
DYNAMO_TABLE=your-table-name
```

## Installation & Usage

1. Install the dependencies:

```bash
npm install
```

2. Run the software:

```bash
npm run ts
```

In the main.ts file, you can start by defining a key and a file:

```typescript
const key = new Key();
const file = new File();
```

If you want to generate a key, define the bytes length of the key and utilize the .generate(bytes) method

```typescript
const bytes = 32; // must be between 16 and 64 bytes
key.generate(bytes);
```

If you want to retrieve an existing key, retrieve it via the .retrieve("key_name") method (the key need to be placed in the /keys folder at the root of the folder)

```typescript
key.retrieve("010c0295-4c46-4b70-8768-b1c4c461f72f.pem");
```

You can start working with your files (located in the /files folder at the root of the folder)

```typescript
file.upload("example.txt", key);
file.download("example.txt", key);
file.delete("example.txt", key);
```

You always have to pass the fileName as the first parameter and the key object as the second parameter. Don't forget to call key.retrieve("key_name.pem") before you download or delete a file associated with this relevant key.
