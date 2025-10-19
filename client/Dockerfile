# Multi-stage build for Vite frontend
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
COPY client ./client
COPY shared ./shared
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production image with nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
