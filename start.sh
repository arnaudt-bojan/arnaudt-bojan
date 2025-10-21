#!/bin/sh
# Production start script for Replit Cloud Run deployment
# Uses local tsx installation to avoid npx cache issues

NODE_ENV=production node node_modules/tsx/dist/cli.mjs server/index.ts
