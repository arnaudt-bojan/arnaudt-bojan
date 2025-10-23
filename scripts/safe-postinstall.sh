#!/bin/bash
# Safe postinstall that only runs if backend dependencies exist
if [ -d "backend/node_modules/@prisma/client" ]; then
  cd backend && npx prisma generate --schema=./prisma/schema.prisma
else
  echo "Skipping Prisma generation (backend not installed yet)"
fi
