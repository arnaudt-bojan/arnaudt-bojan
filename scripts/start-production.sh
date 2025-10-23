#!/bin/bash
set -e

echo "🚀 Starting Upfirst in production mode..."
echo ""

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Re-enable Yarn scripts for our controlled installs
export YARN_ENABLE_SCRIPTS=1

# Ensure backend dependencies are installed
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd "$PROJECT_ROOT/backend" && yarn install --immutable
fi

# Ensure Prisma Client is generated
if [ ! -d "$PROJECT_ROOT/backend/node_modules/.prisma/client" ]; then
  echo "📦 Generating Prisma Client..."
  cd "$PROJECT_ROOT/backend" && npx prisma generate --schema=./prisma/schema.prisma
fi

# Ensure backend is built
if [ ! -f "$PROJECT_ROOT/backend/dist/main.js" ]; then
  echo "📦 Building backend..."
  cd "$PROJECT_ROOT/backend" && yarn build
fi

# Start backend (which listens on $PORT set by Replit)
echo "🚀 Starting backend server..."
echo "   Backend will listen on PORT=${PORT:-4000}"
echo ""

cd "$PROJECT_ROOT/backend"
exec node dist/main.js
