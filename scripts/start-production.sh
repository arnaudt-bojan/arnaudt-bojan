#!/bin/bash
set -e

echo "🚀 Starting Upfirst in production mode..."
echo ""

# Enable Corepack for Yarn Berry
corepack enable

# Ensure dependencies are installed
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd backend && yarn install --immutable && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend && yarn install --immutable && cd ..
fi

# Ensure Prisma Client is generated
cd backend
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "📦 Generating Prisma Client..."
  npx prisma generate --schema=./prisma/schema.prisma
fi
cd ..

# Start both services using concurrently
echo "🚀 Starting backend and frontend..."
echo "   Backend: http://localhost:4000"
echo "   Frontend: http://localhost:3000"
echo ""

yarn start
