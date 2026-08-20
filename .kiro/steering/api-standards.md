---
inclusion: fileMatch
fileMatchPattern: "web/server/**"
---
# API Standards

## Response Format
- Success: `{ success: true, ...data }`
- Error: `{ error: "Human-readable message" }`

## HTTP Status Codes
- `200` — Success
- `400` — Validation error (missing/invalid params)
- `401` — Authentication failed (wrong password)
- `403` — Forbidden (keys locked, file protected)
- `404` — Resource not found
- `409` — Conflict (folder not empty, duplicate)
- `500` — Server error

## Handler Structure
1. Extract and validate input params
2. Check high-security mode (`isHighSecurity()` + `isUnlocked()`) if touching keys
3. Check protection status if deleting
4. Perform the operation
5. Clean up temporary files
6. Return response

## Key Access Pattern
```typescript
// Always use the shared helper
const key = retrieveKey(keyName, keysPath);
// This handles both disk and RAM modes transparently
```

## Rotation Safety
- Always upload with new key BEFORE deleting old S3 object
- Preserve the `folder` field when re-uploading during rotation
- Delete local file from `/files` after successful upload
- In high-security mode: add new auto-generated keys to RAM store + update backup
