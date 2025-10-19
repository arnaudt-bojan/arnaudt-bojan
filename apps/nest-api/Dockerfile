# Multi-stage build for NestJS API
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/nest-api/package*.json ./apps/nest-api/
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/nest-api/package*.json ./apps/nest-api/
RUN npm ci
COPY apps/nest-api ./apps/nest-api
COPY prisma ./prisma
COPY tsconfig.json ./
RUN cd apps/nest-api && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/nest-api/node_modules ./apps/nest-api/node_modules
COPY --from=builder /app/apps/nest-api/dist ./apps/nest-api/dist
COPY prisma ./prisma
COPY package*.json ./

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 4000

# Start the API
CMD ["node", "apps/nest-api/dist/main.js"]
