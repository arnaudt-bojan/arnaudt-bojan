# ⚠️ URGENT: Workflow Configuration Update Required

**Status**: Workflow "Start application" is FAILING  
**Cause**: Trying to run OLD Express server instead of NEW monorepo structure  
**Fix Time**: 30 seconds  

---

## The Problem

Your workflow is still configured to run:
```bash
npm run dev  # → runs old server/index.ts (FAILS with missing prom-client)
```

But should run:
```bash
./dev.sh     # → runs new NestJS backend + Next.js frontend concurrently
```

---

## The Fix (Manual Edit Required)

**File**: `.replit` (line 98)  
**Action**: Change ONE line

### BEFORE (Current - BROKEN):
```toml
[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000
```

### AFTER (Fixed - WORKING):
```toml
[[workflows.workflow.tasks]]
task = "shell.exec"
args = "./dev.sh"
waitForPort = 3000
```

---

## Steps

1. Open `.replit` file in the root directory
2. Find line 98: `args = "npm run dev"`
3. Change to: `args = "./dev.sh"`
4. Change line 99: `waitForPort = 5000` → `waitForPort = 3000`
5. Save the file
6. Click "Run" button (or refresh page)

---

## What You'll See After Fix

```
[BACKEND]  [Nest] Starting Nest application...
[FRONTEND] ▲ Next.js 14.2.33
[BACKEND]  [Nest] GraphQL server on http://localhost:4000/graphql
[FRONTEND] - Local: http://localhost:3000
```

Both services will run concurrently! ✅

---

## Why This is Manual

The `.replit` file is protected by the Replit environment and cannot be edited by the agent. This is the ONLY manual step required to complete the monorepo migration.

---

## After You Update

Once you make this change, the workflow will:
- ✅ Start NestJS backend (port 4000)
- ✅ Start Next.js frontend (port 3000)
- ✅ Auto-restart on file changes
- ✅ Show labeled output for each service

The `dev.sh` script has already been created and made executable for you!
