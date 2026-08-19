# Close the gate

<p>
  <img src="resources/logo.png" alt="Close the Gate" width="100" />
</p>

A privacy-first software to upload encrypted-only files to AWS S3 while having full control and ownership over the keys and the encryption process.

It follows a strict Zero-Knowledge architecture: the cloud provider (AWS S3) and the database (DynamoDB) never have access to the raw data or the cryptographic keys.

All cryptographic operations (key generation, AES-256-GCM encryption, HMAC SHA-256 signing) are performed locally on the client/middleware side.

The software is developped using TypeScript over Node.js.

## Features Summary

- Local cryptographic key generation and secure local storage (mode 0600)
- AES-256-GCM file encryption using random Initialization Vectors (IV)
- HMAC SHA-256 file name hashing
- Secure payload structure for S3 upload (IV + Ciphertext)
- Multipart S3 upload with real-time progress tracking
- DynamoDB integration for metadata tracking
- Virtual folder structure (DynamoDB-based, S3 remains flat)
- In-memory file preview (no disk write, privacy-first)
- Key rotation (manual per-file, batch, or automatic)
- Emergency key rotation for all files in one click
- Auto key rotation with configurable interval and auto-generated keys
- Password-protected key backup and restore (PBKDF2 + AES-256-GCM)
- Per-file deletion protection with confirmation safeguards
- Drag and drop file/folder organization

## Prerequisites

- Node.js (v22.0.0+).
- AWS Credentials configured locally (or via .env).

## Configuration

Create a `.env` file at the root of the project with your AWS configuration:

```
AWS_REGION=your-region
S3_BUCKET=your-bucket-name
DYNAMO_TABLE=your-table-name
```

## Installation

### Docker (recommended)

```bash
docker build -t close-the-gate .
docker run -d -p 3001:3001 --env-file .env -v ./keys:/app/keys -v ./config.json:/app/config.json close-the-gate
```

Then open `http://localhost:3001`.

Or with docker-compose:

```bash
docker compose up -d
```

### Manual

1. Install the dependencies:

```bash
npm install
```

2. Build the TypeScript project:

```bash
npx tsc
```

3. Link the CLI globally to use the `ctg` command system-wide:

```bash
npm link
```

## Usage

### 1. Web Interface

The simplest way to use Close the Gate. Launch the web UI with:

```bash
npm run web
```

Then open your browser at the indicated URL. From the interface you can manage your keys, upload, download, and delete encrypted files visually.

The web interface also provides:

- Real-time upload progress bar (transfer + server-side encryption + S3 upload)
- Virtual folder organization with breadcrumb navigation and drag & drop
- In-memory file preview (decrypted on the fly, never written to disk)
- Key rotation (per-file, batch, or emergency rotation for all files)
- Auto key rotation with configurable interval (Settings > Auto Key Rotation)
- Password-protected key backup and restore
- Per-file deletion protection (lock/unlock with confirmation)
- Sortable file list by date and size (list and grid view)

![Close the Gate Web UI](resources/screen_ui.png)

|         Upload with progress         |      Settings & auto rotation       |
| :----------------------------------: | :---------------------------------: |
| ![Upload](resources/upload_file.png) | ![Settings](resources/settings.png) |

|             Key backup              |             Emergency rotation             |
| :---------------------------------: | :----------------------------------------: |
| ![Backup](resources/key_backup.png) | ![Rotation](resources/global_rotation.png) |

### 2. Command Line Interface (CLI)

Once linked, you can run `ctg` directly from your terminal.

#### Global Help

```bash
ctg --help
```

#### Generate a Key

Generates a new cryptographic key locally.

```bash
# Default (32 bytes key saved in /keys)
ctg generate-key

# Custom byte length, key name, and output path
ctg generate-key -b 64 -n my-secret-key -P /path/to/custom/dir
```

- **`-b, --bytes <number>`**: Key length in bytes (between 16 and 64, default: `32`).
- **`-n, --key-name <keyName>`**: Custom name for the key file (without extension).
- **`-P, --key-path <keyPath>`**: Custom directory path for the key.

#### Upload a File

Encrypts a file locally and uploads the encrypted payload to S3.

```bash
ctg upload-file -f example.txt -k my-secret-key.pem
```

- **`-f, --file <fileName>`** _(Required)_: Name of the file inside `/files`.
- **`-k, --key <keyName>`** _(Required)_: Name of the key inside `/keys`.
- **`-p, --dir-path <dirPath>`**: Custom path for the file directory.
- **`-P, --key-path <keyPath>`**: Custom path for the key directory.

#### Download a File

Downloads the encrypted file from S3 and decrypts it locally.

```bash
ctg download-file -f example.txt -k my-secret-key.pem
```

- **`-f, --file <fileName>`** _(Required)_: Name of the file to download.
- **`-k, --key <keyName>`** _(Required)_: Name of the key associated with the file.
- **`-p, --dir-path <dirPath>`**: Custom output path for the downloaded file.
- **`-P, --key-path <keyPath>`**: Custom path for the key directory.

#### Delete a File

Deletes the file from S3 and its associated metadata from DynamoDB.

```bash
ctg delete-file -f example.txt -k my-secret-key.pem
```

- **`-f, --file <fileName>`** _(Required)_: Name of the file to delete.
- **`-k, --key <keyName>`** _(Required)_: Key associated with the file.
- **`-P, --key-path <keyPath>`**: Custom path for the key directory.

#### Delete a Key

Deletes a local key file.

```bash
ctg delete-key -n my-secret-key.pem
```

- **`-n, --key-name <keyName>`** _(Required)_: Name of the key file to delete.
- **`-P, --key-path <keyPath>`**: Custom path for the key directory.

#### Backup Keys

Creates a password-protected encrypted backup of all keys.

```bash
ctg backup-keys -p "my-strong-password"
```

- **`-p, --password <password>`** _(Required)_: Password to encrypt the backup.
- **`-P, --key-path <keyPath>`**: Custom path for the keys directory.
- **`-o, --output <outputPath>`**: Custom output directory (default: keys directory).

The backup file (`.ctg-backup`) is encrypted with AES-256-GCM using a key derived from the password via PBKDF2 (600k iterations, SHA-512).

#### Restore Keys

Restores keys from a password-protected backup file.

```bash
ctg restore-keys -p "my-strong-password" -f ./keys/ctg-backup-2026-08-17.ctg-backup
```

- **`-p, --password <password>`** _(Required)_: Password used during backup.
- **`-f, --file <backupFile>`** _(Required)_: Path to the `.ctg-backup` file.
- **`-P, --key-path <keyPath>`**: Custom path for the keys directory.

### 3. Programmatic Usage (SDK / TypeScript)

You can also import and use the core classes (`Key` and `File`) directly in your Node.js code.

```typescript
import Key from "./keys";
import File from "./files";

const key = new Key();
const file = new File();
```

If you want to generate a key, define the bytes length of the key and utilize the .generate(bytes) method

```typescript
const bytes = 32; // must be between 16 and 64 bytes
key.generate(bytes);
```

If you want to retrieve an existing key, retrieve it via the .retrieve("key_name") method (the key need to be placed in the /keys folder at the root of the folder or you need to declare a specific path by adding it as a string in a second argument)

```typescript
key.retrieve("010c0295-4c46-4b70-8768-b1c4c461f72f.pem");
```

You can start working with your files (located in the /files folder at the root of the folder or you need to declare a specific path by adding it as a string in a second argument)

```typescript
file.upload("example.txt", key);
file.download("example.txt", key);
file.delete("example.txt", key);
```

You always have to pass the fileName as the first parameter and the key object as the second parameter. Don't forget to call key.retrieve("key_name.pem") before you download or delete a file associated with this relevant key. You can also add a third parameter to define a custom file path for the upload and download methods.
