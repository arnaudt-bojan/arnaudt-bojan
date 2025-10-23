#!/bin/bash
set -e

echo "🔍 Upfirst Pre-Publish Verification"
echo "===================================="
echo ""

# Check 1: Production Scripts
echo "✓ Check 1: Production Scripts"
if [ -x "scripts/build-production.sh" ] && [ -x "scripts/start-production.sh" ]; then
  echo "  ✅ scripts/build-production.sh is executable"
  echo "  ✅ scripts/start-production.sh is executable"
else
  echo "  ❌ Production scripts not found or not executable"
  exit 1
fi
echo ""

# Check 2: Critical Environment Variables
echo "✓ Check 2: Critical Environment Variables"
REQUIRED_VARS=(
  "DATABASE_URL"
  "SESSION_SECRET"
  "STRIPE_SECRET_KEY"
  "VITE_STRIPE_PUBLIC_KEY"
  "RESEND_API_KEY"
  "GEMINI_API_KEY"
)

ALL_PRESENT=true
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "  ❌ $var is not set"
    ALL_PRESENT=false
  else
    echo "  ✅ $var is configured"
  fi
done

if [ "$ALL_PRESENT" = false ]; then
  echo ""
  echo "  ❌ Some required environment variables are missing"
  exit 1
fi
echo ""

# Check 3: Backend Build
echo "✓ Check 3: Backend Build Status"
if [ -f "backend/dist/main.js" ]; then
  echo "  ✅ Backend is built (dist/main.js exists)"
else
  echo "  ⚠️  Backend not built yet (will be built during deployment)"
fi
echo ""

# Check 4: Frontend Build
echo "✓ Check 4: Frontend Build Status"
if [ -f "frontend/.next/BUILD_ID" ]; then
  echo "  ✅ Frontend is built (.next/BUILD_ID exists)"
elif [ -f "frontend/.build-mode" ]; then
  BUILD_MODE=$(cat frontend/.build-mode)
  echo "  ✅ Frontend build mode: $BUILD_MODE"
else
  echo "  ⚠️  Frontend not built yet (will be built during deployment)"
fi
echo ""

# Check 5: Services Health (optional - only if currently running)
echo "✓ Check 5: Services Health (optional)"
if command -v curl &> /dev/null; then
  if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "  ✅ Backend health check passed (http://localhost:4000/health)"
  else
    echo "  ℹ️  Backend not currently running (normal if not started)"
  fi
  
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  ✅ Frontend responding (http://localhost:3000)"
  else
    echo "  ℹ️  Frontend not currently running (normal if not started)"
  fi
else
  echo "  ℹ️  curl not available, skipping health checks"
fi
echo ""

# Summary
echo "===================================="
echo "✅ Pre-Publish Verification Complete"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Click the 'Publish' button in Replit workspace"
echo ""
echo "2. In the Publishing UI, configure:"
echo "   Build Command: bash scripts/build-production.sh"
echo "   Run Command:   bash scripts/start-production.sh"
echo ""
echo "3. Keep Deployment Target as 'cloudrun'"
echo ""
echo "4. Review settings and click 'Deploy'"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
echo "===================================="
