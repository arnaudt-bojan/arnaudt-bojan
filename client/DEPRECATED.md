# ⚠️ DEPRECATED: client/ Directory

**Status**: This directory is deprecated as of October 21, 2025  
**Migration Status**: In Progress (Workspace configuration required)

## Migration Target

This legacy React application **will be** migrated to the new monorepo structure:

**Target Location**: `apps/frontend/`

**⚠️ IMPORTANT**: The `client/` directory is STILL ACTIVE and authoritative. `apps/frontend/` is the migration target but does NOT contain migrated code yet.

**Planned Tech Stack** (after migration):
- Next.js 14 (currently using client/src React app)
- Material UI v7
- styled-components (to replace Tailwind CSS)
- SCSS (to replace CSS)
- Apollo Client for GraphQL
- npm workspace integration

## Planned Changes

### Directory Structure Change (Future)
```
OLD: client/src/
NEW: apps/frontend/app/
```

### Technology Stack Changes (Future)
- **React** → **Next.js 14** (with App Router)
- **Tailwind CSS** → **styled-components** (unified with Material UI)
- **CSS** → **SCSS**
- **Relative imports** → **Workspace imports** (`@upfirst/shared`)

## ⚠️ ACTIVE CODE - Continue Development Here

**CRITICAL**: This directory is STILL THE ACTIVE, PRODUCTION CODE PATH.

**All fixes and features MUST continue in `client/` until migration is complete.**

Do NOT freeze development in this directory. The migration to `apps/frontend/` is in progress but NOT complete. This directory remains the authoritative source code.

**When migration is complete** (all checklist items below marked ✅), THEN development will move to `apps/frontend/` and this directory can be frozen.

## Migration Status

**Current State**: Partial migration, workspace configuration pending

**Completed**:
- ✅ Directory structure created (apps/frontend/)
- ✅ Package.json configured (@upfirst/frontend)
- ✅ Deprecation notice created

**Pending**:
- ⚠️ Workspace configuration (requires manual root package.json edit)
- ⚠️ Component migration from client/src to apps/frontend/app
- ⚠️ Import path updates
- ⚠️ Functionality testing
- ⚠️ Production deployment

## When Can This Be Deleted?

This directory can be safely deleted after:
1. ❌ Workspace configuration enabled
2. ❌ All components migrated to apps/frontend
3. ❌ All functionality tested and verified
4. ❌ Production deployment successful
5. ❌ Team sign-off

## Need to Find Something?

If you need to reference old code:
1. Check `apps/frontend/app/` for migrated pages
2. Check `apps/frontend/components/` for migrated components
3. Check `packages/shared/` for shared utilities

## Questions?

See `MONOREPO_REFACTOR_PLAN.md` for complete migration details.
