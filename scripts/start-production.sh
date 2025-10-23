#!/usr/bin/env bash
set -euo pipefail
export NODE_ENV=production
export PATH="$(pwd)/node_modules/.bin:$PATH"

# Start API on 4000 (background)
PORT=4000 node backend/dist/main.js &

# Start Next on the *public* PORT from the frontend folder (foreground)
cd frontend
exec ../node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
