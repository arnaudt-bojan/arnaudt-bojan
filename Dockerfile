# Upfirst Production Dockerfile
# Multi-stage build for optimized production deployment

# Stage 1: Dependencies and Build
FROM node:20-alpine AS builder

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

# Create .npmrc that allows optional deps and uses legacy-peer-deps
RUN echo "engine-strict=false" > .npmrc && \
    echo "legacy-peer-deps=true" >> .npmrc && \
    echo "prefer-offline=false" >> .npmrc && \
    echo "audit=false" >> .npmrc && \
    echo "fund=false" >> .npmrc

# Clean install dependencies - INCLUDE optional deps for platform binaries
RUN rm -rf node_modules && \
    npm cache clean --force && \
    npm install --legacy-peer-deps --no-audit --no-fund

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build frontend
RUN npx vite build

# Stage 2: Production Runtime
FROM node:20-alpine AS runtime

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

# Create .npmrc for runtime
RUN echo "engine-strict=false" > .npmrc && \
    echo "legacy-peer-deps=true" >> .npmrc && \
    echo "prefer-offline=false" >> .npmrc && \
    echo "audit=false" >> .npmrc && \
    echo "fund=false" >> .npmrc

# Install production dependencies only - INCLUDE optional deps for platform binaries
RUN rm -rf node_modules && \
    npm cache clean --force && \
    npm install --production --legacy-peer-deps --no-audit --no-fund

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy server code and shared code
COPY server ./server
COPY shared ./shared

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start production server with tsx
CMD ["npx", "tsx", "server/index.ts"]
