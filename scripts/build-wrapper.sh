#!/bin/bash
# Build wrapper script for Replit deployments
# Includes Prisma Client generation before building

set -e  # Exit on error

echo "🔨 Starting build process..."

# Step 1: Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Step 2: Build frontend with Vite
echo "⚛️  Building frontend..."
npx vite build

# Step 3: Build backend with esbuild
echo "🚀 Building backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --external:@prisma/client

echo "✅ Build complete!"
