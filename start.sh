#!/bin/sh
# Production start script for Replit Cloud Run deployment
# Uses npx tsx which works because reflect-metadata is explicitly imported in server/index.ts

NODE_ENV=production npx tsx server/index.ts
