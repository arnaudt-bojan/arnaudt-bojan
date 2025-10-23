#!/bin/bash
set -e

echo "🚀 Starting Upfirst in production mode..."
echo ""

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

# Ensure backend is built
if [ ! -f "backend/dist/main.js" ]; then
  echo "📦 Building backend..."
  cd backend && yarn build && cd ..
fi

# Determine frontend mode
FRONTEND_MODE="start"
if [ -f "frontend/.build-mode" ] && [ "$(cat frontend/.build-mode)" = "development" ]; then
  FRONTEND_MODE="dev"
  echo "⚠️  Frontend will run in development mode (production build unavailable)"
fi

# Start both services using concurrently
echo "🚀 Starting services..."
echo "   Backend GraphQL API: http://localhost:4000/graphql"
echo "   Frontend Application: http://localhost:3000 (mode: $FRONTEND_MODE)"
echo ""

if [ "$FRONTEND_MODE" = "dev" ]; then
  # Run frontend in dev mode, backend in prod
  concurrently "cd backend && yarn start:prod" "cd frontend && yarn dev"
else
  # Run both in production mode
  yarn start
fi
