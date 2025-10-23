#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting Upfirst in production mode..."
echo ""

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="$PROJECT_ROOT/node_modules/.bin:$PATH"

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

# Start backend on port 4000 (background - internal GraphQL API)
echo "🚀 Starting backend on port 4000 (internal)..."
cd "$PROJECT_ROOT/backend"
PORT=4000 node dist/main.js &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start Next.js on the public PORT (foreground - main domain)
echo "🚀 Starting Next.js on PORT ${PORT:-3000} (public)..."
cd "$PROJECT_ROOT"
exec npx next start frontend -p "${PORT:-3000}"
