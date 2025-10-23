#!/bin/bash
set -e

echo "🚀 Starting Upfirst in production mode..."
echo ""

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Re-enable Yarn scripts for our controlled installs
export YARN_ENABLE_SCRIPTS=1

# Ensure dependencies are installed
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd "$PROJECT_ROOT/backend" && yarn install --immutable
fi

if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd "$PROJECT_ROOT/frontend" && yarn install --immutable
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

# Determine frontend mode
FRONTEND_MODE="start"
if [ -f "$PROJECT_ROOT/frontend/.build-mode" ] && [ "$(cat $PROJECT_ROOT/frontend/.build-mode)" = "development" ]; then
  FRONTEND_MODE="dev"
  echo "⚠️  Frontend will run in development mode (production build unavailable)"
fi

# Start both services
echo "🚀 Starting services..."
echo "   Backend GraphQL API: http://localhost:4000/graphql"
echo "   Frontend Application: http://localhost:3000 (mode: $FRONTEND_MODE)"
echo ""

# Start backend
cd "$PROJECT_ROOT/backend"
node dist/main.js &
BACKEND_PID=$!

# Start frontend
cd "$PROJECT_ROOT/frontend"
if [ "$FRONTEND_MODE" = "dev" ]; then
  yarn dev &
else
  yarn start &
fi
FRONTEND_PID=$!

# Cleanup function
cleanup() {
  echo "Shutting down services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit
}

# Register cleanup on script termination
trap cleanup SIGTERM SIGINT EXIT

# Wait for either process to exit
wait -n $BACKEND_PID $FRONTEND_PID

# If we get here, one process exited - trigger cleanup
cleanup
