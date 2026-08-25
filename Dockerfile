# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Install web dependencies
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./
COPY web/ ./web/

# Build frontend (Vite) and compile TypeScript
RUN cd web && npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy root project (core classes needed by server)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy web production deps
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci --omit=dev

# Copy built assets and source
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/web/server ./web/server
COPY --from=builder /app/src ./src
COPY tsconfig.json ./

# Create default directories
RUN mkdir -p keys files download log

# Default config
COPY config.json ./

EXPOSE 3001

# Start the server (serves API + static frontend)
CMD ["npx", "tsx", "web/server/index.ts"]
