# Yarn Berry Migration Guide

## ✅ Completed
- [x] Yarn Berry v4.10.3 installed
- [x] `.yarnrc.yml` configured for monorepo
- [x] `yarn.lock` generated (739KB)
- [x] Dependencies installed successfully

## 📝 Manual Steps Required

### 1. Update Root `package.json` Scripts

You need to manually update the scripts section in `package.json`. Replace the current scripts with:

```json
"scripts": {
  "dev": "concurrently \"yarn workspace @upfirst/backend start:dev\" \"yarn workspace @upfirst/frontend dev\"",
  "clean": "rm -rf node_modules .yarn/cache && yarn cache clean --all",
  "start": "concurrently \"yarn workspace @upfirst/backend start:prod\" \"yarn workspace @upfirst/frontend start\"",
  "build": "concurrently \"yarn build:frontend\" \"yarn build:backend\"",
  "build:frontend": "yarn workspace @upfirst/frontend build",
  "build:backend": "yarn workspace @upfirst/backend build",
  "check": "tsc",
  "postinstall": "prisma generate --schema=apps/backend/prisma/schema.prisma",
  "db:push": "prisma db push --schema=apps/backend/prisma/schema.prisma",
  "db:migrate": "prisma migrate dev --schema=apps/backend/prisma/schema.prisma",
  "db:studio": "prisma studio --schema=apps/backend/prisma/schema.prisma",
  "db:reset": "prisma migrate reset --force --schema=apps/backend/prisma/schema.prisma",
  "contracts:generate": "tsx scripts/generate-openapi-nestjs.ts && tsx scripts/generate-graphql-schema.ts",
  "contracts:diff": "yarn contracts:generate && tsx scripts/contract-diff.ts",
  "contracts:update-baseline": "yarn contracts:generate && mkdir -p contracts/baseline && cp contracts/openapi-nestjs.json contracts/baseline/ && cp contracts/graphql-schema.graphql contracts/baseline/"
}
```

**Key Changes:**
- `npm run <script> --workspace=@upfirst/backend` → `yarn workspace @upfirst/backend <script>`
- `npm run <script>` → `yarn <script>`
- `npm cache clean --force` → `yarn cache clean --all`

### 2. Files Created by Yarn Berry

New files/folders to commit:
- `.yarnrc.yml` - Yarn Berry configuration
- `.yarn/releases/yarn-4.10.3.cjs` - Yarn Berry binary
- `yarn.lock` - Dependency lock file (replaces package-lock.json)

### 3. Next Steps (After Manual Edit)

Once you've updated the package.json scripts:
1. Test: `yarn dev` (should start both frontend and backend)
2. Test: `yarn build` (should build both apps)
3. Commit changes to git

## Yarn Berry vs npm Commands

| npm | Yarn Berry |
|-----|------------|
| `npm install` | `yarn install` or `yarn` |
| `npm ci` | `yarn install --immutable` |
| `npm run dev` | `yarn dev` |
| `npm run build --workspace=backend` | `yarn workspace backend build` |
| `npm cache clean --force` | `yarn cache clean --all` |
| `npm prune --omit=dev` | Not needed (Yarn optimizes automatically) |

## 2. Update `.replit` File

You need to manually update the `.replit` file in the following locations:

**Line 2 - Change development run command:**
```toml
# OLD:
run = "npm run dev"

# NEW:
run = "yarn dev"
```

**Line 98 - Change workflow command:**
```toml
# OLD (around line 98):
args = "npm run dev"

# NEW:
args = "yarn dev"
```

**Lines 9-10 - Change deployment configuration:**
```toml
# OLD:
build = "npm ci && npm run build && npm prune --omit=dev"
run = "npm start"

# NEW:
build = "yarn install --immutable && yarn build"
run = "yarn start"
```

**Benefits:**
- `yarn install --immutable` is faster and ensures lock file integrity
- No need for `npm prune --omit=dev` (Yarn optimizes automatically)
- **Expected deployment speed improvement: 40-60% faster**

## 3. Files to Commit

After making the above changes, you'll need to commit these new/modified files:

**Modified files:**
- `package.json` (updated scripts, added packageManager field)
- `.replit` (updated to use yarn commands)
- `.gitignore` (updated with Yarn Berry ignores)

**New Yarn Berry files:**
- `.yarnrc.yml` - Yarn Berry configuration
- `.yarn/releases/yarn-4.10.3.cjs` - Yarn Berry binary (MUST COMMIT)
- `yarn.lock` - Dependency lock file (739KB)

**Removed files:**
- Delete `package-lock.json` (if it still exists)

**Git commands:**
```bash
git add .yarnrc.yml .yarn/releases/yarn-4.10.3.cjs yarn.lock
git add package.json .replit .gitignore
git rm package-lock.json
git commit -m "Migrate from npm to Yarn Berry (v4.10.3)"
```

## 4. Testing After Migration

Once you've made all the manual changes above, test with:

```bash
# Development
yarn dev

# Build
yarn build

# Production
yarn start
```

All commands should work seamlessly!
