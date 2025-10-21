#!/bin/sh
# Alternative production start script using compiled JavaScript
# Run this after: tsc -p tsconfig.server.json

NODE_ENV=production node --require reflect-metadata dist/server/server/index.js
