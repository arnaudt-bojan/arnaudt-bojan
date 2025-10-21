# Replit Cloud Run Deployment Fix

## 🐛 **Problem**
The deployment fails with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'reflect-metadata'
```

## 🔍 **Root Cause**
The `.replit` deployment uses `npm run start` which executes `npx tsx server/index.ts`. The `npx` command uses a **cached global tsx installation** from `~/.npm/_npx/` that doesn't have access to your project's `node_modules` where `reflect-metadata` is installed.

Evidence from deployment logs:
```
file:///home/runner/.npm/_npx/fd45a72a545557e9/node_modules/tsx/...
                    ^^^^^^^^^ (npx cache, not project node_modules)
```

## ✅ **Solution**

You need to update the `.replit` file to use the **local tsx installation** instead of npx.

### **Manual Fix (Required)**

**Open `.replit` file and change line 14:**

**FROM:**
```toml
run = ["npm", "run", "start"]
```

**TO:**
```toml
run = ["sh", "start.sh"]
```

**OR alternatively:**
```toml
run = ["sh", "-c", "NODE_ENV=production node node_modules/tsx/dist/cli.mjs server/index.ts"]
```

### **Why This Works**

1. ✅ Uses the **local tsx** from `node_modules/tsx/dist/cli.mjs`
2. ✅ Has access to **all project dependencies** including `reflect-metadata`
3. ✅ Avoids npx cache issues completely

## 📝 **Files Created**

- ✅ `start.sh` - Wrapper script using local tsx (already created and executable)
- ✅ `REPLIT-DEPLOYMENT-FIX.md` - This documentation

## 🚀 **After Applying Fix**

1. Edit `.replit` as shown above
2. Go to Publishing → Overview → Advanced settings
3. Click **"Publish"** again
4. Deployment should succeed ✅

## 🔄 **Alternative: Update package.json** (Optional)

If you prefer to keep using `npm run start`, you can manually edit `package.json`:

**Change line 10 from:**
```json
"start": "NODE_ENV=production npx tsx server/index.ts",
```

**To:**
```json
"start": "NODE_ENV=production node node_modules/tsx/dist/cli.mjs server/index.ts",
```

Then you can keep `.replit` as `run = ["npm", "run", "start"]`

## ⚠️ **Why I Couldn't Fix This Automatically**

The Replit Agent system prevents programmatic edits to:
- `.replit` file (deployment configuration)
- `package.json` file (to prevent breaking the environment)

These files require manual editing through the Replit IDE.

## 📚 **Technical Details**

### What Happens During Deployment

1. **Build Phase**: `npm install --legacy-peer-deps --include=optional && npm run build`
   - ✅ Installs all dependencies to `node_modules/`
   - ✅ Generates Prisma client
   - ✅ Builds frontend with Vite

2. **Run Phase**: `npm run start` → `npx tsx server/index.ts`
   - ❌ `npx` downloads/uses cached tsx from `~/.npm/_npx/`
   - ❌ Cached tsx doesn't have access to project's `node_modules`
   - ❌ Crashes when importing `reflect-metadata`

### Why Local tsx Works

```bash
# BAD (uses npx cache):
npx tsx server/index.ts

# GOOD (uses local installation):
node node_modules/tsx/dist/cli.mjs server/index.ts
```

The local tsx is installed in your `node_modules/` and has proper access to all peer dependencies.

## ✅ **Verification**

After deployment succeeds, you should see:
```
[Prisma] Database connection pool configured
[INFO] [EmailProvider] Resend client initialized successfully
[express] serving on port 5000
```

Instead of:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'reflect-metadata'
crash loop detected
```

---

**Status**: Fix ready, manual `.replit` edit required
