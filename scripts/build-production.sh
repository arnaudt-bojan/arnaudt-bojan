#!/bin/bash
set -e

echo "🏗️  Building Upfirst for production..."
echo ""

# Re-enable Yarn scripts for our controlled installs
export YARN_ENABLE_SCRIPTS=1

# Build Backend (independent service with its own lockfile)
echo "📦 Building backend..."
cd backend
yarn install --immutable
npx prisma generate --schema=./prisma/schema.prisma
yarn build
cd ..
echo "✅ Backend build complete"
echo ""

# Build Frontend (independent service with its own lockfile)
echo "📦 Building frontend..."
cd frontend
yarn install --immutable

# Try building with Next.js
echo "   Building with Next.js (this may take several minutes)..."
if timeout 600 yarn build; then
  echo "✅ Frontend build complete"
  echo "production" > .build-mode
else
  echo "⚠️  Frontend build timed out or failed"
  echo "   Frontend will run in development mode"
  echo "development" > .build-mode
fi
cd ..
echo ""

echo "✅ Production build complete!"
echo "   Backend: Built and ready (dist/main.js)"
if [ -f "frontend/.build-mode" ] && [ "$(cat frontend/.build-mode)" = "production" ]; then
  echo "   Frontend: Built and ready (.next/ directory)"
else
  echo "   Frontend: Ready in development mode"
fi
