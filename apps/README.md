# Upfirst Apps Directory (Monorepo Structure)

This directory will contain the different applications in the Upfirst monorepo as we migrate to the new architecture.

## Current Structure

```
apps/
├── legacy/          # Will contain current Express + Vite app (Phase 1)
├── nest-server/     # NestJS GraphQL backend (Phase 2)
└── next-client/     # Next.js + Material UI frontend (Phase 3)
```

## Migration Plan

### Phase 0 (Current - COMPLETED ✅)
- Docker development environment set up
- NGINX API gateway configured
- Monorepo structure prepared

### Phase 1: Move Legacy App (Upcoming)
```bash
# Move current app to apps/legacy/
mv client apps/legacy/client
mv server apps/legacy/server
mv shared apps/legacy/shared
mv package.json apps/legacy/package.json
# Update docker-compose.yml to point to apps/legacy
```

### Phase 2: Add NestJS Backend
```bash
# Create NestJS project
cd apps/
nest new nest-server
cd nest-server

# Install dependencies
npm install @nestjs/graphql @nestjs/apollo graphql apollo-server-express
npm install @prisma/client prisma
npm install @nestjs/passport passport passport-jwt
```

### Phase 3: Add Next.js Frontend
```bash
# Create Next.js project
cd apps/
npx create-next-app@latest next-client

# Install Material UI
cd next-client
npm install @mui/material @emotion/react @emotion/styled
npm install @apollo/client graphql
```

## Shared Dependencies

Shared code will be managed through:
- Workspace packages (npm workspaces or pnpm workspaces)
- Shared types from Prisma schema
- Common utilities in `/packages/shared`

## Development Workflow

Each app will have its own:
- `package.json` (dependencies)
- `Dockerfile` (containerization)
- `tsconfig.json` (TypeScript config)
- `README.md` (documentation)

But they will share:
- Database (PostgreSQL)
- Redis (caching/sessions)
- Environment variables
- API Gateway (NGINX)

## Next Steps

1. Complete Phase 0 infrastructure ✅
2. Set up workspace configuration (Phase 1)
3. Move legacy app to apps/legacy (Phase 1)
4. Begin Prisma migration (Phase 1)
5. Create NestJS skeleton (Phase 2)

---

**Last Updated:** January 2025  
**Phase:** 0 - Infrastructure Readiness  
**Status:** Directory prepared, awaiting Phase 1
