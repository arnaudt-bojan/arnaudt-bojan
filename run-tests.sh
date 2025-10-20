#!/bin/bash

# Database Constraint Test Runner
# This script runs the comprehensive database constraint tests

echo "Running Database Constraint Tests..."
echo "===================================="
echo ""

# Set environment to test
export NODE_ENV=test

# Run tests using Jest with experimental VM modules support
node --experimental-vm-modules node_modules/jest/bin/jest.js \
  server/__tests__/database-constraints.test.ts \
  --verbose \
  "$@"

echo ""
echo "===================================="
echo "Tests completed"
