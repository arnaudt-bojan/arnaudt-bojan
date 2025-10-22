# Critical Deployment Fix Required

## Problem Analysis

The deployment is failing because:

1. **Root `package.json` uses `npx`** which downloads fresh packages and breaks PATH resolution
2. **Workspace binaries not found** in production (`sh: 1: next: not found`)
3. **Dependencies not in PATH** when `npx concurrently` spawns subprocesses

### Error Evidence from Logs
```
npm warn exec The following package was not found and will be installed: concurrently@9.2.1
sh: 1: next: not found
Cannot find module '@nestjs/core'
```

## Root Cause

When `npx concurrently` runs in production:
- It downloads a fresh `concurrently@9.2.1` package
- Spawns subprocesses **without** workspace `node_modules/.bin` in PATH  
- Workspace scripts fail to find binaries (`next`, `nest`, etc.)

## Solution 1: Remove `npx` from Root Scripts (RECOMMENDED)

### Required Changes

#### 1. Edit `package.json` (ROOT)

**Change these lines:**
```json
"scripts": {
  "dev": "npx concurrently \"npm run start:dev --workspace=@upfirst/backend\" \"npm run dev --workspace=@upfirst/frontend\"",
  "start": "npx concurrently \"npm run start:prod --workspace=@upfirst/backend\" \"npm run start --workspace=@upfirst/frontend\"",
  "build": "npx concurrently \"npm run build:frontend\" \"npm run build:backend\""
}
```

**To:**
```json
"scripts": {
  "dev": "concurrently \"npm run start:dev --workspace=@upfirst/backend\" \"npm run dev --workspace=@upfirst/frontend\"",
  "start": "concurrently \"npm run start:prod --workspace=@upfirst/backend\" \"npm run start --workspace=@upfirst/frontend\"",
  "build": "concurrently \"npm run build:frontend\" \"npm run build:backend\""
}
```

**Why this works:**
- `concurrently` is already installed as a dependency
- npm scripts automatically add `node_modules/.bin` to PATH
- This ensures workspace binaries are found correctly

## Solution 2: Use start-production.sh Script (ALTERNATIVE)

If you cannot edit `package.json`, use the provided `start-production.sh` script:

**Update `.replit` file:**
```toml
[deployment]
build = ["sh", "-c", "npm install && npm run build"]
run = ["sh", "-c", "./start-production.sh"]
```

**What `start-production.sh` does:**
- ✅ Explicitly adds all workspace `node_modules/.bin` to PATH
- ✅ Delegates to workspace npm scripts (preserves all setup logic)
- ✅ Uses `concurrently` to manage both services  
- ✅ Maintains compatibility with workspace configurations

**Script contents:**
```bash
#!/bin/bash
set -e
export PATH="$PWD/node_modules/.bin:$PWD/apps/frontend/node_modules/.bin:$PWD/apps/backend/node_modules/.bin:$PATH"
concurrently \
  "npm run start:prod --workspace=@upfirst/backend" \
  "npm run start --workspace=@upfirst/frontend"
```

## How to Apply These Fixes

### Manual Steps Required:

1. **Edit `package.json` (root)**
   - Open the file in editor
   - Remove `npx` from `dev`, `start`, and `build` scripts
   - Save the file

2. **Test locally**
   ```bash
   npm start
   # Should work without downloading concurrently@9.2.1
   ```

3. **Redeploy**
   - The deployment should now succeed

## Why Can't the Agent Fix This?

The following files are protected and require manual editing:
- ❌ `package.json` (root) - Protected configuration file
- ❌ `.replit` - Protected deployment configuration

## Verification

After making changes, you should see:
- ✅ No "npm warn exec" messages about downloading packages
- ✅ Backend starts: "🚀 NestJS GraphQL API running..."
- ✅ Frontend starts: "✓ Ready in Xs"
- ✅ Deployment succeeds without crash loop

## Summary

**Root Cause:** `npx` in production downloads fresh packages and breaks monorepo PATH resolution

**Solution:** Remove `npx` from root package.json scripts (use local binaries)

**Files to Edit:**
1. `package.json` (root) - Remove `npx` from dev/start/build scripts
