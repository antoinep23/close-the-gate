---
name: deploy
description: Build and deploy the Docker container. Use when deploying, publishing, or updating the production image.
---

# Deploy Workflow

## Prerequisites
- Docker installed and running
- Registry credentials configured (e.g., `docker login ghcr.io`)

## Steps

### 1. Run Tests
Ensure all tests pass before building:
```bash
npm test
cd web && npm test
```

### 2. Build Docker Image
```bash
docker build -t close-the-gate .
```

### 3. Tag with Version
Read version from package.json and tag accordingly:
```bash
docker tag close-the-gate ghcr.io/antoinep23/close-the-gate:latest
docker tag close-the-gate ghcr.io/antoinep23/close-the-gate:$(node -p "require('./package.json').version")
```

### 4. Push to Registry
```bash
docker push ghcr.io/antoinep23/close-the-gate:latest
docker push ghcr.io/antoinep23/close-the-gate:$(node -p "require('./package.json').version")
```

### 5. Verify
```bash
docker pull ghcr.io/antoinep23/close-the-gate:latest
docker run --rm -p 3001:3001 --env-file .env ghcr.io/antoinep23/close-the-gate:latest
```

Open http://localhost:3001 and confirm the app loads.

## Notes
- The `.env` file must contain `AWS_REGION`, `S3_BUCKET`, and `DYNAMO_TABLE`
- Mount `keys/` and `config.json` as volumes for persistent data
- Never include `.env` or key files in the Docker image
