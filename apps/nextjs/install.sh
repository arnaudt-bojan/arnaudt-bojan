#!/bin/bash

# Installation script for Next.js app
echo "Installing Next.js dependencies..."

cd "$(dirname "$0")"

# Install dependencies
npm install

echo "✅ Next.js dependencies installed!"
echo ""
echo "To run the Next.js app:"
echo "  npm run dev"
echo ""
echo "The app will be available at http://localhost:3000"
