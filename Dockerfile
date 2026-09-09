# Production Dockerfile for FMOH Inventory Backend API & Database
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

# Copy package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm clean-install

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build packages
RUN npm run build --workspace packages/shared
RUN npm run db:generate --workspace apps/api
RUN npm run build --workspace apps/api

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATABASE_URL=file:/app/data/inventory.db

# Copy built files
COPY --from=builder /app /app

# Create persistent data and uploads directory
RUN mkdir -p /app/data /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "npm run db:setup --workspace apps/api && npm run start --workspace apps/api"]
