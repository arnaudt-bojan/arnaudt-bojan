#!/bin/bash

# Production start script for Upfirst monorepo
# This script ensures proper PATH resolution while delegating to workspace npm scripts

set -e

echo "🚀 Starting Upfirst production services..."

# Ensure we're in the workspace root
cd "$(dirname "$0")"

# Add all workspace node_modules/.bin to PATH
export PATH="$PWD/node_modules/.bin:$PWD/apps/frontend/node_modules/.bin:$PWD/apps/backend/node_modules/.bin:$PATH"

# Use concurrently (already installed) to run workspace npm scripts
# This preserves all the setup logic in the workspace package.json scripts
concurrently \
  "npm run start:prod --workspace=@upfirst/backend" \
  "npm run start --workspace=@upfirst/frontend"
