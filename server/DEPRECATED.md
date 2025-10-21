# ⚠️ DEPRECATED: server/ Directory

**Status**: This directory is deprecated as of October 21, 2025  
**Migration Status**: In Progress (Workspace configuration required)

## Migration Target

This legacy Express REST API **will be** migrated to the new monorepo structure:

**Target Location**: `apps/backend/`

**⚠️ IMPORTANT**: The `server/` directory is STILL ACTIVE and authoritative. `apps/backend/` contains a NestJS structure but does NOT contain migrated code yet.

**Planned Tech Stack** (after migration):
- NestJS (currently using server/ Express app)
- GraphQL API (Apollo Server)
- REST API (Express integration)
- Prisma ORM
- Socket.IO WebSockets
- npm workspace integration

## Planned Changes

### Directory Structure Change (Future)
```
OLD: server/
NEW: apps/backend/src/
```

### Architecture Changes (Future)
- **Express (monolithic)** → **NestJS** (modular with dependency injection)
- **Mixed REST/GraphQL** → **Unified GraphQL** (with REST legacy support)
- **Relative imports** → **Workspace imports** (`@upfirst/shared`)
- **Global middleware** → **NestJS modules** (cart, orders, products, wholesale, etc.)

## ⚠️ ACTIVE CODE - Continue Development Here

**CRITICAL**: This directory is STILL THE ACTIVE, PRODUCTION CODE PATH.

**All fixes and features MUST continue in `server/` until migration is complete.**

Do NOT freeze development in this directory. The migration to `apps/backend/` is in progress but NOT complete. This directory remains the authoritative source code.

**When migration is complete** (all checklist items below marked ✅), THEN development will move to `apps/backend/` and this directory can be frozen.

## Key Migrations

### Routes → NestJS Modules
- `server/routes.ts` → `apps/backend/src/modules/*/` (cart, orders, products, etc.)
- `server/services/` → `apps/backend/src/modules/*/services/`
- `server/middleware/` → `apps/backend/src/common/filters/` and guards

### Database
- `prisma/` → `apps/backend/prisma/` (Prisma schema now in backend app)
- Schema remains the same, just relocated

### WebSockets
- `server/websocket.ts` → `apps/backend/src/modules/websocket/`
- Socket.IO events consolidated into dedicated gateway

## Migration Status

**Current State**: Partial migration, workspace configuration pending

**Completed**:
- ✅ Directory structure created (apps/backend/)
- ✅ Package.json configured (@upfirst/backend)
- ✅ NestJS modules structure created
- ✅ Deprecation notice created

**Pending**:
- ⚠️ Workspace configuration (requires manual root package.json edit)
- ⚠️ Route migration from server/ to apps/backend/src/modules
- ⚠️ Service migration
- ⚠️ Middleware migration to filters/guards
- ⚠️ Import path updates
- ⚠️ Functionality testing
- ⚠️ Production deployment

## When Can This Be Deleted?

This directory can be safely deleted after:
1. ❌ Workspace configuration enabled
2. ❌ All routes migrated to NestJS modules
3. ❌ All services migrated to NestJS services
4. ❌ All middleware migrated to NestJS filters/guards
5. ❌ All functionality tested and verified
6. ❌ Production deployment successful
7. ❌ Team sign-off

## Need to Find Something?

If you need to reference old code:
1. Check `apps/backend/src/modules/` for migrated routes and services
2. Check `apps/backend/src/common/` for shared filters, guards, DTOs
3. Check `packages/shared/` for shared utilities

## Questions?

See `MONOREPO_REFACTOR_PLAN.md` for complete migration details.
