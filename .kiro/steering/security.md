---
inclusion: always
---
# Security Rules

These rules must be followed at all times when modifying this codebase.

## Key Material Handling
- Never write key material (`.pem` content) to disk when high-security mode is enabled
- Always call `buffer.fill(0)` before releasing any Buffer containing key material
- Use `secureWipe()` from `keyStore.ts` to clear the RAM store — never just `Map.clear()`
- The session password is only held in memory while unlocked and cleared on lock

## File Operations
- Temporary files in `/files` must be deleted immediately after encryption + S3 upload
- Downloaded files during rotation must be deleted after re-upload
- Never log key material, passwords, or decrypted buffer contents

## Endpoint Security
- All endpoints accessing keys must use `retrieveKey()` from `web/server/keyStore.ts`
- Never call `key.retrieve()` directly in route handlers
- The `DELETE /api/files/:fileName` endpoint must check `isProtected` before proceeding
- Disabling high-security mode must be blocked when keys are locked (403)

## Cryptographic Standards
- AES-256-GCM for file encryption (12-byte random IV per file)
- HMAC-SHA256 for S3 key naming (file name signed with encryption key)
- PBKDF2 with 600,000 iterations + SHA-512 for password-derived keys (backups)
- Key sizes: minimum 16 bytes, maximum 64 bytes
