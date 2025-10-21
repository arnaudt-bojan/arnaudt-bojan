# Upfirst Production Dockerfile
# Multi-stage build: development + production stages

# =============================================================================
# STAGE 1: Development (for local docker-compose)
# =============================================================================
FROM node:20-alpine AS development

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for hot reload)
RUN npm install --legacy-peer-deps --include=optional

# Prisma will be generated when container starts
EXPOSE 5000

# Default command (can be overridden by docker-compose)
CMD ["npm", "run", "dev"]

# =============================================================================
# STAGE 2: Builder (for production builds)
# =============================================================================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with proper platform binaries
RUN npm install --legacy-peer-deps --include=optional --no-audit --no-fund

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build frontend
RUN npx vite build

# =============================================================================
# STAGE 3: Production Runtime (for AWS deployment)
# =============================================================================
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production --legacy-peer-deps --include=optional --no-audit --no-fund

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

# Copy server code and shared code
COPY server ./server
COPY shared ./shared

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check for AWS ECS/EKS
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start production server with tsx (TypeScript executor)
# NOTE: tsx is in production dependencies, so this works correctly
# For optimization, consider compiling TS to JS and using: node dist/server/index.js
CMD ["npx", "tsx", "server/index.ts"]
