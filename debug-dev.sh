#!/bin/bash
# Debug script for local development issues
# Run this on your local Linux machine to diagnose npm run dev failures

echo "=== Upfirst Dev Environment Diagnostics ==="
echo ""

echo "1. Checking Node version..."
node --version
echo ""

echo "2. Checking npm version..."
npm --version
echo ""

echo "3. Checking if Prisma client is generated..."
if [ -d "node_modules/@prisma/client" ]; then
  echo "✅ Prisma client exists"
else
  echo "❌ Prisma client NOT found - run: npm run postinstall"
fi
echo ""

echo "4. Checking workspace dependencies..."
echo "   Backend node_modules:"
if [ -d "apps/backend/node_modules" ]; then
  echo "   ✅ Backend dependencies installed"
else
  echo "   ❌ Backend dependencies NOT installed"
fi

echo "   Frontend node_modules:"
if [ -d "apps/frontend/node_modules" ]; then
  echo "   ✅ Frontend dependencies installed"
else
  echo "   ❌ Frontend dependencies NOT installed"
fi
echo ""

echo "5. Checking required environment variables..."
if [ -z "$DATABASE_URL" ]; then
  echo "   ⚠️  DATABASE_URL not set"
else
  echo "   ✅ DATABASE_URL is set"
fi
echo ""

echo "6. Testing backend workspace command..."
cd apps/backend
timeout 5 npm run start:dev 2>&1 | head -20
BACKEND_EXIT=$?
cd ../..
echo "   Backend exit code: $BACKEND_EXIT"
echo ""

echo "7. Testing frontend workspace command..."
cd apps/frontend
timeout 5 npm run dev 2>&1 | head -20
FRONTEND_EXIT=$?
cd ../..
echo "   Frontend exit code: $FRONTEND_EXIT"
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "If you see errors above, try:"
echo "  1. npm install (in root directory)"
echo "  2. npm run postinstall (to generate Prisma client)"
echo "  3. Create .env file with DATABASE_URL"
echo "  4. npm install --workspace=@upfirst/backend"
echo "  5. npm install --workspace=@upfirst/frontend"
