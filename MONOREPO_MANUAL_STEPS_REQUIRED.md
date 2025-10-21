# Monorepo Refactoring - Manual Steps Required

**Date**: October 21, 2025  
**Status**: 90% Automated, 10% Manual  
**Time Required**: 15-20 minutes

---

## Executive Summary

The monorepo refactoring has been **90% automated**. Only **ONE file** requires your manual edit due to system protections: the root `package.json`.

### ✅ What Was Automated

| Task | Status | Details |
|------|--------|---------|
| **Rename apps/nextjs → apps/frontend** | ✅ Complete | Directory renamed successfully |
| **Rename apps/nest-api → apps/backend** | ✅ Complete | Directory renamed successfully |
| **Update frontend package name** | ✅ Complete | Now `@upfirst/frontend` |
| **Update backend package name** | ✅ Complete | Now `@upfirst/backend` |
| **Create deprecation notices** | ✅ Complete | client/DEPRECATED.md, server/DEPRECATED.md |
| **Documentation** | ✅ Complete | MONOREPO_REFACTOR_PLAN.md |

### ⚠️ What Requires Manual Edit

**Just ONE file**: `package.json` (root)

---

## Manual Step: Edit Root package.json

### Why This is Manual

The root `package.json` file is protected by the Replit environment to prevent catastrophic breakage. You need to manually edit it to enable workspace configuration.

### Required Changes

Open `package.json` in the root directory and make these changes:

#### 1. Add Workspace Configuration (after "license")

```json
{
  "name": "upfirst-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "type": "module",
  "license": "MIT",
  ...
}
```

**Changes**:
- ✏️ Change name from `"rest-express"` → `"upfirst-monorepo"`
- ✏️ Add `"private": true`
- ✏️ Add `"workspaces": ["apps/*", "packages/*"]`

#### 2. Keep ONLY Dev Dependencies in Root

Delete the entire `"dependencies": { ... }` section (lines 19-178).

Keep ONLY these in `"devDependencies"`:

```json
{
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.3.1",
    "@replit/vite-plugin-dev-banner": "^0.1.1",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "20.16.11",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "autoprefixer": "^10.4.20",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tsx": "^4.20.5",
    "typescript": "5.6.3",
    "vite": "^5.4.20"
  }
}
```

**Why**: All production dependencies are now in `apps/frontend/package.json` and `apps/backend/package.json`. Root only needs build tools.

#### 3. Add Workspace-Aware Scripts (optional but recommended)

Update the `"scripts"` section to add workspace commands:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development node node_modules/tsx/dist/cli.mjs server/index.ts",
    "clean": "rm -rf node_modules && npm cache clean --force",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "npm run build --workspace=@upfirst/frontend",
    "build:backend": "npm run build --workspace=@upfirst/backend",
    "start": "NODE_ENV=production npx tsx server/index.ts",
    "check": "tsc",
    "postinstall": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "node node_modules/tsx/dist/cli.mjs server/scripts/seed.ts",
    "db:reset": "prisma migrate reset --force"
  }
}
```

---

## After Manual Edit: Run Installation

Once you've edited `package.json`, run these commands:

```bash
# Clean install (recommended)
rm -rf node_modules package-lock.json
rm -rf apps/frontend/node_modules apps/frontend/package-lock.json
rm -rf apps/backend/node_modules apps/backend/package-lock.json
rm -rf packages/shared/node_modules packages/shared/package-lock.json

# Install all workspace dependencies
npm install --legacy-peer-deps

# Verify workspace structure
npm ls --workspaces
```

**Expected Output**:
```
upfirst-monorepo@1.0.0
├── @upfirst/backend@1.0.0 -> ./apps/backend
├── @upfirst/frontend@0.1.0 -> ./apps/frontend
└── @upfirst/shared@1.0.0 -> ./packages/shared
```

---

## Verification Steps

After installation, verify everything works:

### 1. Test Frontend Build
```bash
cd apps/frontend
npm run build
```

Expected: ✅ Build succeeds

### 2. Test Backend Build
```bash
cd apps/backend
npm run build
```

Expected: ✅ Build succeeds

### 3. Test Development Server
```bash
# From root
npm run dev
```

Expected: ✅ Server starts on port 5000

---

## Troubleshooting

### Peer Dependency Conflicts

If you see peer dependency errors:
```bash
npm install --legacy-peer-deps
```

### Missing Dependencies

If a build fails with "Cannot find module X":

1. Identify which app needs it (frontend or backend)
2. Add to that app's package.json
3. Run `npm install` from root

### Workspace Not Found

If `npm ls --workspaces` shows empty:

1. Verify `"workspaces": ["apps/*", "packages/*"]` is in root package.json
2. Verify `"private": true` is in root package.json
3. Run `npm install` again

---

## What's Next

Once workspace configuration is complete, the next phases are:

### Phase 2: Styling Migration (Automated via Subagent)
- Set up styled-components with `@mui/styled-engine-sc`
- Set up SCSS tooling
- Migrate Tailwind → styled-components
- Migrate CSS → SCSS

### Phase 3: DevOps Updates (Automated via Subagent)
- Create per-app Dockerfiles
- Update docker-compose.yml
- Update Replit configuration
- Update AWS deployment docs

### Phase 4: Testing & Verification
- Test all B2C flows
- Test all B2B wholesale flows
- Test all trade quotation flows
- Test Socket.IO real-time events

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| **Phase 1: Workspace Setup** | 15-20 min (manual edit) | ⚠️ Awaiting your edit |
| **Phase 2: Styling Migration** | 1-2 hours (automated) | Pending Phase 1 |
| **Phase 3: DevOps Updates** | 30-45 min (automated) | Pending Phase 2 |
| **Phase 4: Testing** | 1-2 hours | Pending Phase 3 |

**Total**: 3-5 hours (only 15-20 min manual work)

---

## Need Help?

- **Detailed plan**: See `MONOREPO_REFACTOR_PLAN.md`
- **Dependency matrix**: See `DEPENDENCY_AUDIT_MATRIX.md`
- **Architecture questions**: See `replit.md`

---

## Quick Reference: What Changed

```
OLD Structure:
upfirst/
├── client/              → apps/frontend/
├── server/              → apps/backend/
├── shared/              → packages/shared/
├── apps/nextjs/         → apps/frontend/ (renamed)
├── apps/nest-api/       → apps/backend/ (renamed)
└── package.json         → needs manual edit

NEW Structure:
upfirst-monorepo/
├── apps/
│   ├── frontend/        ← Next.js 14 + styled-components + SCSS
│   └── backend/         ← NestJS + Prisma + GraphQL
├── packages/
│   └── shared/          ← Shared utilities, types, schemas
└── package.json         ← Workspace configuration (manual edit needed)
```

---

**Ready to continue?** Once you've edited `package.json` and run `npm install`, let me know and I'll execute Phase 2 (styling migration) and Phase 3 (DevOps updates) automatically!
