#!/bin/bash

# Contract Testing Helper Scripts
# Since npm scripts require package.json modifications, use this script instead

case "$1" in
  "generate:express")
    echo "Generating OpenAPI spec from Express REST API..."
    tsx scripts/generate-openapi-express.ts
    ;;
  
  "generate:nestjs")
    echo "Generating OpenAPI spec from NestJS API..."
    tsx scripts/generate-openapi-nestjs.ts
    ;;
  
  "generate:graphql")
    echo "Extracting GraphQL schema..."
    tsx scripts/generate-graphql-schema.ts
    ;;
  
  "generate:all")
    echo "Generating all contracts..."
    tsx scripts/generate-openapi-express.ts
    tsx scripts/generate-openapi-nestjs.ts
    tsx scripts/generate-graphql-schema.ts
    echo "✅ All contracts generated!"
    ;;
  
  "update-baseline")
    echo "Updating baseline contracts..."
    mkdir -p contracts/baseline
    cp contracts/openapi-express.json contracts/baseline/
    cp contracts/openapi-nestjs.json contracts/baseline/
    cp contracts/graphql-schema.graphql contracts/baseline/
    echo "✅ Baselines updated!"
    ;;
  
  "diff")
    echo "Running contract diff check..."
    tsx scripts/generate-openapi-express.ts
    tsx scripts/generate-openapi-nestjs.ts
    tsx scripts/generate-graphql-schema.ts
    tsx tests/contract-diff.ts
    ;;
  
  "test:auth")
    echo "Running auth tests..."
    vitest run server/__tests__/auth-matrix.spec.ts server/__tests__/auth-flows.spec.ts
    ;;
  
  *)
    echo "Contract Testing Commands:"
    echo ""
    echo "  ./scripts/contracts.sh generate:express    - Generate Express OpenAPI spec"
    echo "  ./scripts/contracts.sh generate:nestjs     - Generate NestJS OpenAPI spec"
    echo "  ./scripts/contracts.sh generate:graphql    - Extract GraphQL schema"
    echo "  ./scripts/contracts.sh generate:all        - Generate all contracts"
    echo "  ./scripts/contracts.sh update-baseline     - Update baseline contracts"
    echo "  ./scripts/contracts.sh diff                - Check for breaking changes"
    echo "  ./scripts/contracts.sh test:auth           - Run auth test suite"
    echo ""
    echo "Quick start:"
    echo "  1. ./scripts/contracts.sh generate:all"
    echo "  2. ./scripts/contracts.sh update-baseline"
    echo "  3. ./scripts/contracts.sh diff"
    ;;
esac
