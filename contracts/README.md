# API Contract Testing

This directory contains OpenAPI and GraphQL schemas for contract testing across the REST and GraphQL APIs.

## Directory Structure

```
contracts/
├── openapi-express.json      # OpenAPI spec for Express REST API
├── openapi-nestjs.json        # OpenAPI spec for NestJS modules
├── graphql-schema.graphql     # GraphQL schema from NestJS
├── baseline/                  # Baseline schemas for diff checking
│   ├── openapi-express.json
│   ├── openapi-nestjs.json
│   └── graphql-schema.graphql
└── README.md                  # This file
```

## Generating Contracts

### Quick Start (using helper script)

```bash
# Generate all contracts
./scripts/contracts.sh generate:all

# Create baselines (first time only)
./scripts/contracts.sh update-baseline

# Check for breaking changes
./scripts/contracts.sh diff
```

### Alternative: Direct Commands

```bash
# Generate all contracts
tsx scripts/generate-openapi-express.ts
tsx scripts/generate-openapi-nestjs.ts
tsx scripts/generate-graphql-schema.ts

# Or generate individually:
tsx scripts/generate-openapi-express.ts    # Express REST API
tsx scripts/generate-openapi-nestjs.ts      # NestJS API
tsx scripts/generate-graphql-schema.ts      # GraphQL Schema
```

This will generate:
- `openapi-express.json` - REST API contract from Express routes
- `openapi-nestjs.json` - REST API contract from NestJS modules
- `graphql-schema.graphql` - GraphQL schema from NestJS GraphQL modules

## Contract Diff Checking

### Run Contract Diff Tests

```bash
# Using helper script (recommended)
./scripts/contracts.sh diff

# Or directly
tsx scripts/generate-openapi-express.ts
tsx scripts/generate-openapi-nestjs.ts
tsx scripts/generate-graphql-schema.ts
tsx tests/contract-diff.ts
```

This will:
1. Generate current contracts
2. Compare with baseline contracts in `contracts/baseline/`
3. Report any breaking changes
4. Fail if breaking changes are detected

### Update Baselines

After intentionally making breaking changes that should become the new baseline:

```bash
# Using helper script (recommended)
./scripts/contracts.sh update-baseline

# Or directly
mkdir -p contracts/baseline
cp contracts/openapi-express.json contracts/baseline/
cp contracts/openapi-nestjs.json contracts/baseline/
cp contracts/graphql-schema.graphql contracts/baseline/
```

This copies current contracts to the baseline directory.

## CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Contract Tests
  run: npm run test:contracts
```

This ensures:
- ✅ No accidental breaking changes to APIs
- ✅ All API changes are intentional and reviewed
- ✅ Contracts stay in sync with implementation

## Schema Details

### OpenAPI (Express)

Generated from Zod validation schemas in:
- `server/dtos/rest/*.dto.ts` - Request/response DTOs
- `server/routes.ts` - Route definitions with validation

### OpenAPI (NestJS)

Generated from NestJS Swagger decorators in:
- `apps/nest-api/src/**/*.controller.ts` - REST controllers
- `apps/nest-api/src/**/*.dto.ts` - DTO classes

### GraphQL

Generated from NestJS GraphQL schema in:
- `apps/nest-api/src/**/*.resolver.ts` - GraphQL resolvers
- `apps/nest-api/src/**/*.dto.ts` - Input/Output types

## Breaking vs Non-Breaking Changes

### Breaking Changes (Will Fail CI)

- ❌ Removing endpoints
- ❌ Removing required fields
- ❌ Changing field types
- ❌ Removing enum values
- ❌ Changing required to optional (for requests)

### Non-Breaking Changes (Will Pass)

- ✅ Adding new endpoints
- ✅ Adding optional fields
- ✅ Adding enum values
- ✅ Deprecating (but not removing) fields

## Best Practices

1. **Always run contract diff before merging**: `npm run test:contracts`
2. **Update baselines after reviewing breaking changes**: `npm run contracts:update-baseline`
3. **Keep contracts in version control**: Commit baseline contracts to git
4. **Document breaking changes**: Add migration notes in CHANGELOG.md
5. **Version your API**: Use semantic versioning for breaking changes

## Troubleshooting

### "No baseline found" error

Run `npm run contracts:update-baseline` to create initial baselines.

### False positives

Some changes may be flagged as breaking but are actually safe. Review the diff output carefully and update baselines if needed.

### Contract generation fails

Check that:
- All required decorators are present (@ApiProperty, @Field, etc.)
- Zod schemas are properly exported
- NestJS server is compilable
