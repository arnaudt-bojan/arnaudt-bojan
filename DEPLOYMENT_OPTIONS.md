# Replit Deployment Configuration Options

## Current Setup (Already Configured)
```toml
[deployment]
build = ["sh", "-c", "npm install && npm run build"]
run = ["sh", "-c", "npm start"]
```

**Pros:**
- ✅ Clean separation of build and runtime
- ✅ Faster startup (deps installed once during build)
- ✅ Standard Replit deployment pattern

**Cons:**
- ⚠️ Might not persist node_modules to runtime in some deployment types

---

## Alternative: Install at Runtime (GPT-5's Suggestion)

If deployment fails with "next: not found" errors, update `.replit`:

```toml
[deployment]
build = ["sh", "-c", "echo 'Build phase - see run command for full setup'"]
run = ["bash", "-lc", "npm ci && npm run build && npm prune --production && npm start"]
```

**What this does:**
1. `npm ci` - Clean install (faster, more reliable than npm install)
2. `npm run build` - Builds both workspaces
3. `npm prune --production` - Removes devDependencies (smaller image)
4. `npm start` - Starts both services

**Pros:**
- ✅ Guarantees node_modules are available at runtime
- ✅ Works even if build artifacts don't persist

**Cons:**
- ⚠️ Slower cold starts (installs on every boot)
- ⚠️ Uses more resources during startup

---

## Even More Defensive Option

```toml
[deployment]
run = ["bash", "-lc", "npm ci --include=dev && npm run build && npm prune --production && npm start"]
```

Use `--include=dev` if your build requires devDependencies (TypeScript, NestJS CLI, etc.)

---

## Recommended Action Plan

1. **First:** Try deploying with current setup (npx removed)
2. **If fails:** Switch to GPT-5's runtime install approach
3. **Monitor:** Check if cold starts are acceptable

---

## Dependencies Checklist

Ensure these are in `dependencies` (not devDependencies):

### Root package.json
```json
{
  "dependencies": {
    "concurrently": "^9.2.1",  ✅
    // Any other runtime deps
  }
}
```

### Frontend package.json
```json
{
  "dependencies": {
    "next": "14.2.33",  ✅
    "react": "^18.3.1",  ✅
    "react-dom": "^18.3.1"  ✅
  }
}
```

### Backend package.json
```json
{
  "dependencies": {
    "@nestjs/core": "...",  ✅
    "@nestjs/common": "...",  ✅
    // All runtime imports
  }
}
```

---

## Quick Test

Before deploying, verify locally:
```bash
# Clean install production deps only
npm ci --production

# Should work without errors
npm start
```

If this fails locally, you have devDependencies that should be dependencies.
