# Close the Gate — Web Interface

The web UI for Close the Gate, providing a visual file manager for encrypted S3 storage.

## Stack

- **Frontend**: React + TypeScript + Tailwind CSS (Vite)
- **Backend**: Express + TypeScript (tsx)
- **State**: DynamoDB (metadata) + config.json (settings, folders)

## Development

From the project root:

```bash
npm run web
```

This starts both the Express API server (port 3001) and the Vite dev server with HMR.

## Architecture

```
web/
├── server/          # Express API
│   ├── index.ts     # Main server (settings, keys, folders, DynamoDB)
│   ├── upload.ts    # Upload with SSE progress
│   ├── download.ts  # Download, preview, delete, rotate
│   └── keyStore.ts  # RAM key store for high-security mode
├── src/
│   ├── components/  # React components
│   ├── hooks/       # Custom hooks (useFiles, useKeys, useSettings)
│   ├── services/    # API client functions
│   ├── data/        # Interfaces
│   └── utils/       # Formatters, file icons
└── tests/           # Vitest tests
```

## Tests

```bash
npm test
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/settings | Get app settings |
| PUT | /api/settings | Update settings |
| GET | /api/keys | List keys |
| POST | /api/keys | Generate key |
| DELETE | /api/keys/:name | Delete key |
| POST | /api/keys/backup | Create key backup |
| POST | /api/keys/restore | Restore from backup |
| GET | /api/files | List files (DynamoDB) |
| POST | /api/upload | Upload + encrypt |
| GET | /api/upload/progress/:id | SSE upload progress |
| POST | /api/download | Download + decrypt |
| POST | /api/preview | In-memory preview |
| DELETE | /api/files/:name | Delete file |
| PATCH | /api/files/:name/star | Toggle star |
| PATCH | /api/files/:name/protect | Toggle deletion protection |
| PATCH | /api/files/:name/move | Move to folder |
| POST | /api/files/rotate | Rotate single file key |
| POST | /api/files/rotate-batch | Batch rotation |
| GET | /api/files/rotation-check | Check eligible files |
| GET | /api/folders | List folders |
| POST | /api/folders | Create folder |
| DELETE | /api/folders | Delete folder |
| POST | /api/folders/move | Move folder |
| GET | /api/lock-status | High-security status |
| POST | /api/unlock | Unlock keys (password) |
| POST | /api/lock | Lock keys (wipe RAM) |
| POST | /api/high-security/enable | Enable high-security |
| POST | /api/high-security/disable | Disable high-security |
