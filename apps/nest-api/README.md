# NestJS GraphQL API

## Status: Phase 3A Foundation Complete ✅

This NestJS application provides a GraphQL API running on port 4000 alongside the existing Express REST API on port 5000.

### What's Working ✅

- **Health Check Endpoint**: `GET http://localhost:4000/health`
- **Prisma Integration**: Shared Prisma client from `generated/prisma`
- **TypeScript Configuration**: Standalone tsconfig for NestJS
- **Module Structure**: Health, Prisma modules fully functional

### Known Issue: GraphQL Apollo Server Integration ⚠️

**Issue**: Apollo Server 5.x with @nestjs/apollo has integration detection issues with Express 4.x.

**Error**: `The "@as-integrations/express5" package is missing`

**Root Cause**: The @nestjs/apollo package automatically tries to detect Express integration but looks for Express 5.x integration even though this project uses Express 4.x. While `@as-integrations/express4` is installed, the package loader still requests Express 5 integration.

**Current Workaround**: GraphQL module is temporarily disabled in `app.module.ts` to allow the server to boot successfully.

**Solutions** (choose one):
1. **Wait for @nestjs/apollo update**: Future versions may fix the integration detection
2. **Downgrade Apollo Server**: Use @apollo/server@4.x which has better NestJS integration
3. **Custom Apollo Driver**: Implement a custom driver that bypasses automatic integration

### Running the Server

```bash
# From project root
cd apps/nest-api && npx nest start --watch

# Or using npm scripts (when added to package.json)
npm run dev:nest
```

### Running Both Servers Concurrently

```bash
# Requires adding to package.json scripts:
# "dev:nest": "cd apps/nest-api && nest start --watch"
# "dev:both": "concurrently \"npm run dev\" \"npm run dev:nest\""

npm run dev:both
```

### Testing

```bash
# Health check
curl http://localhost:4000/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-19T20:00:00.000Z","service":"nest-api"}
```

### Re-enabling GraphQL

When the integration issue is resolved:

1. Uncomment GraphQLConfigModule import in `src/app.module.ts`
2. Rebuild: `npx nest build`
3. GraphQL playground will be available at `http://localhost:4000/graphql`

### Project Structure

```
apps/nest-api/
├── src/
│   ├── main.ts                 # NestJS bootstrap
│   ├── app.module.ts            # Root module
│   └── modules/
│       ├── health/              # Health check endpoint
│       ├── prisma/              # Shared Prisma client
│       └── graphql/             # GraphQL configuration (ready to enable)
├── nest-cli.json
├── tsconfig.json
├── package.json
└── README.md
```

### Environment Variables

- `NESTJS_PORT`: Port for NestJS server (default: 4000)
- `DATABASE_URL`: PostgreSQL connection (shared with Express)

### Dependencies

All NestJS dependencies are installed at the monorepo root:
- @nestjs/core, @nestjs/common, @nestjs/platform-express
- @nestjs/graphql, @nestjs/apollo
- @apollo/server, graphql
- @as-integrations/express4 (for future GraphQL integration)
- concurrently (for running both servers)
