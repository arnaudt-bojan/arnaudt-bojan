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

# Ensure frontend dependencies are installed
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd "$PROJECT_ROOT/frontend" && yarn install --immutable
fi

# Start backend on port 4000 (internal GraphQL API)
echo "🚀 Starting backend on port 4000..."
cd "$PROJECT_ROOT/backend"
NESTJS_PORT=4000 node dist/main.js &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start frontend on PORT (Replit's main exposed port)
echo "🚀 Starting frontend on PORT=${PORT:-3000}..."
cd "$PROJECT_ROOT/frontend"
NEXT_PUBLIC_GRAPHQL_URL="http://localhost:4000/graphql" yarn start &
FRONTEND_PID=$!

echo ""
echo "✅ Services started:"
echo "   - Frontend (public): PORT ${PORT:-3000}"
echo "   - Backend (internal): port 4000"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
