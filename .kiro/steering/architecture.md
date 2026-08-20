---
inclusion: always
---
# Project Architecture

## Overview
Close the Gate is a zero-knowledge encrypted file storage system. The cloud provider (S3) and database (DynamoDB) never see raw data or cryptographic keys.

## Directory Structure
- `src/` — Core classes (Key, File) used by both CLI and web server
- `web/server/` — Express API server
- `web/src/` — React frontend (Vite + Tailwind CSS)
- `web/server/keyStore.ts` — Shared module for RAM key store (high-security mode)
- `keys/` — Local key storage (`.pem` files or `high-security.ctg-backup`)
- `config.json` — Application settings (paths, folders, autoRotation, highSecurity)

## Data Flow
1. Files are encrypted locally with AES-256-GCM before leaving the machine
2. The S3 object key is `HMAC(keyMaterial, fileName)` — the real filename never reaches S3
3. DynamoDB stores metadata: fileName, size, uploadDate, keyName, folder, isStarred, isProtected
4. Virtual folders exist only in DynamoDB (`folder` field) + config.json (`folders` array) — S3 is flat

## Key Modules
- `src/keys.ts` — Key generation, retrieval, backup/restore, `retrieveFromBuffer()` for RAM mode
- `src/files.ts` — Upload (multipart), download, preview (in-memory), delete, `deleteS3Object()`
- `web/server/keyStore.ts` — `retrieveKey()`, `secureWipe()`, `isHighSecurity()`, `isUnlocked()`

## Configuration
#[[file:config.json]]
