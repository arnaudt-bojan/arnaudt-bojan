# ⚠️ URGENT: Configuration Update Required (2 Files)

**Status**: Workflow "Start application" is FAILING  
**Cause**: Trying to run OLD Express server instead of NEW monorepo structure  
**Fix Time**: 1 minute  

---

## The Problem

Your workflow is running:
```bash
npm run dev  # → runs old server/index.ts (FAILS with missing prom-client)
```

Should run:
```bash
npm run dev  # → runs new NestJS backend + Next.js frontend concurrently
```

---

## Fix 1: Update package.json

**File**: `package.json` (line 12)  
**Action**: Replace the "dev" script

### BEFORE (Broken):
```json
{
  "scripts": {
    "dev": "NODE_ENV=development node node_modules/tsx/dist/cli.mjs server/index.ts",
    ...
  }
}
```

### AFTER (Fixed):
```json
{
  "scripts": {
    "dev": "concurrently \"npm run start:dev --workspace=@upfirst/backend\" \"npm run dev --workspace=@upfirst/frontend\"",
    ...
  }
}
```

---

## Fix 2: Update .replit

**File**: `.replit` (line 99)  
**Action**: Change the port number

### BEFORE:
```toml
[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000
```

### AFTER:
```toml
[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 3000
```

---

## Quick Steps

1. Open `package.json` → Replace line 12 with the new "dev" script
2. Open `.replit` → Change line 99 from `5000` to `3000`
3. Save both files
4. Click "Run" button

---

## What You'll See After Fix

```
[0] [BACKEND]  [Nest] Starting Nest application...
[1] [FRONTEND] ▲ Next.js 14.2.33
[0] [BACKEND]  [Nest] GraphQL server on http://localhost:4000/graphql
[1] [FRONTEND] - Local: http://localhost:3000
```

Both services will run concurrently! ✅

---

## Why Manual Edits?

Both `package.json` and `.replit` are protected by the Replit environment to prevent accidental breakage. These are the ONLY manual steps required to complete the monorepo migration.

---

## After You Update

✅ NestJS backend runs on port 4000  
✅ Next.js frontend runs on port 3000  
✅ Auto-restart on file changes  
✅ Labeled output for each service  
✅ No more prom-client error!
