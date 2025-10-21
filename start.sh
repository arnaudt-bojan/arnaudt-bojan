#!/bin/sh
# Production start script for Replit Cloud Run deployment
# Preload reflect-metadata before tsx to ensure it's available

NODE_ENV=production node --require reflect-metadata ./node_modules/.bin/tsx server/index.ts
