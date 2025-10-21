#!/bin/bash
# Monorepo development script
# Runs both NestJS backend and Next.js frontend concurrently

# Set environment
export NODE_ENV=development

# Run both services using concurrently
npx concurrently \
  --names "BACKEND,FRONTEND" \
  --prefix-colors "blue,magenta" \
  "npm run start:dev --workspace=@upfirst/backend" \
  "npm run dev --workspace=@upfirst/frontend"
