#!/bin/bash
set -e

echo "🔧 Custom Deployment Script - Bypassing package.json issues"

# Step 1: Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Step 2: Build frontend only (skip server bundling)
echo "🏗️  Building frontend with Vite..."
npx vite build

# Step 3: Start server with tsx (no bundling)
echo "🚀 Starting production server with tsx..."
NODE_ENV=production npx tsx server/index.ts
