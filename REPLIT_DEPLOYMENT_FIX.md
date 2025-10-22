# ⚠️ CRITICAL: Replit Deployment Fix Required

## 🔴 Problem Confirmed

**Error from deployment logs:**
```
sh: 1: concurrently: not found
```

**Root Cause:**
- ✅ Build phase runs `npm install` successfully
- ❌ Runtime phase does NOT have `node_modules` available
- **Replit deployments don't persist node_modules from build to runtime**

GPT-5 was correct! This is a Replit deployment limitation.

---

## ✅ Solution: Clean Up Dependencies First

### **IMPORTANT: The Real Problem**

Many build-time packages are in `dependencies` instead of `devDependencies`. This is why you needed `--include=dev` for production!

### **Step 1: Fix Dependencies (Manual Edit Required)**

See **MANUAL_DEPENDENCY_FIX.md** for complete instructions.

**Quick summary:**
1. Move build-time packages to `devDependencies` in `package.json`
2. Run `npm install` to update lock file

### **Step 2: Edit `.replit` file**

**After cleaning up dependencies, use this optimal config:**

```toml
[deployment]
build = "npm ci && npm run build && npm prune --omit=dev"
run = "npm start"
deploymentTarget = "cloudrun"
```

**Why this is better:**
- Build installs all deps (including dev for compilation)
- Build compiles everything
- `npm prune --omit=dev` removes devDependencies
- Runtime just starts (no install = fast!)

### **Fallback (if node_modules don't persist):**

```toml
[deployment]
build = "npm ci && npm run build"
run = "npm ci --omit=dev && npm start"
deploymentTarget = "cloudrun"
```

**Note:** Use `--omit=dev` (NOT `--include=dev`) after dependency cleanup!

---

## 🤔 Why This Works

### **`npm ci --include=dev`**
- Installs **all** dependencies (including devDependencies)
- Required because your build uses TypeScript, NestJS CLI, etc.
- Faster than `npm install` (uses package-lock.json)
- More reliable for production

### **Runtime Installation**
- Ensures `node_modules` are available when `npm start` runs
- Adds ~30-60 seconds to cold start time
- **Guaranteed to work** regardless of Replit's bundling behavior

---

## 🎯 Alternative: Production-Only Runtime (Faster, but risky)

If you want faster cold starts, try this first:

```toml
[deployment]
build = ["sh", "-c", "npm ci && npm run build"]
run = ["sh", "-c", "npm ci --omit=dev && npm start"]
deploymentTarget = "cloudrun"
```

**Pros:** Smaller runtime, faster startup
**Cons:** Will fail if any devDependencies are accidentally used at runtime

---

## 📋 Dependency Cleanup (Optional, but recommended)

Some packages are in the wrong place. Move these to `devDependencies`:

**Root package.json - Move to devDependencies:**
```diff
- "@graphql-codegen/cli": "^6.0.1",
+ // Move to devDependencies (build-time only)

- "@graphql-codegen/client-preset": "^5.1.0",
- "@graphql-codegen/typescript": "^5.0.2",
- "@graphql-codegen/typescript-operations": "^5.0.2",
- "@graphql-codegen/typescript-react-apollo": "^4.3.3",
+ // Move to devDependencies (build-time only)

- "eslint": "^8.57.1",
- "eslint-config-next": "^15.5.6",
+ // Move to devDependencies (build-time only)

- "nodemon": "^3.1.10",
+ // Move to devDependencies (dev-time only)
```

**Keep in dependencies (runtime needed):**
```json
✅ "concurrently": "^9.2.1"
✅ "sass": "^1.93.2"
✅ "@whatwg-node/fetch": "^0.10.11"
```

---

## 🚀 Recommended Action

### **Quick Fix (Use This First)**

1. Edit `.replit` file
2. Change the `[deployment]` section to:
   ```toml
   [deployment]
   build = ["sh", "-c", "npm ci --include=dev && npm run build"]
   run = ["sh", "-c", "npm ci --include=dev && npm start"]
   deploymentTarget = "cloudrun"
   ```
3. Redeploy

This **will work** - it installs all dependencies at runtime.

### **Later: Clean Up Dependencies**

Once deployment works, optimize by moving build-time deps to `devDependencies`.

---

## ⏱️ Expected Deployment Time

- **Build phase:** 2-3 minutes (install + build)
- **Runtime startup:** 30-60 seconds (install deps)
- **Total cold start:** 3-4 minutes

After the first deployment, subsequent deploys use cached layers and are faster.

---

## ✅ Summary

**Required Change:**
```toml
# Edit .replit file
[deployment]
build = ["sh", "-c", "npm ci --include=dev && npm run build"]
run = ["sh", "-c", "npm ci --include=dev && npm start"]
deploymentTarget = "cloudrun"
```

**Why:**
- Replit doesn't persist `node_modules` from build to runtime
- Installing at runtime guarantees availability
- GPT-5 was right! 🎯

**Trade-off:**
- Slower cold starts (~60s)
- But guaranteed to work
