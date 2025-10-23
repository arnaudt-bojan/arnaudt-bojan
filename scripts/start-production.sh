#!/usr/bin/env bash
set -euo pipefail
export NODE_ENV=production
export PATH="./node_modules/.bin:$PATH"

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

# Ensure frontend dependencies are installed
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd "$PROJECT_ROOT/frontend" && yarn install --immutable
fi

echo "🚀 Starting backend on port 4000 (internal)..."
# Start API on 4000 (background)
PORT=4000 node "$PROJECT_ROOT/backend/dist/main.js" &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

echo "🚀 Starting Next.js on PORT ${PORT:-3000} (public)..."
# Start Next from the frontend dir on the public $PORT
cd "$PROJECT_ROOT/frontend"
exec "$PROJECT_ROOT/node_modules/.bin/next" start -p "${PORT:-3000}" -H 0.0.0.0
