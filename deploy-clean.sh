#!/bin/bash
set -e

echo "🧹 Cleaning deployment environment..."

# Remove node_modules if it exists and might be corrupted
if [ -d "node_modules" ]; then
  echo "📦 Removing existing node_modules..."
  rm -rf node_modules
fi

# Clean npm cache
echo "🗑️  Cleaning npm cache..."
npm cache clean --force || true

# Install dependencies fresh
echo "📥 Installing dependencies..."
npm ci --prefer-offline --no-audit --no-fund

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Build frontend
echo "🏗️  Building frontend..."
npx vite build

echo "✅ Deployment build complete!"
