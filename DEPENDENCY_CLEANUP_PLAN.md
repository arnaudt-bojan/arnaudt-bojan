# 🧹 Dependency Cleanup Plan

## Problem
Many **build-time** and **dev-time** packages are in `dependencies` instead of `devDependencies`. This makes production deployments larger and slower than necessary.

## Root Package.json Changes

### Move to devDependencies:
```json
{
  "devDependencies": {
    "@graphql-codegen/cli": "^6.0.1",
    "@graphql-codegen/client-preset": "^5.1.0",
    "@graphql-codegen/typescript": "^5.0.2",
    "@graphql-codegen/typescript-operations": "^5.0.2",
    "@graphql-codegen/typescript-react-apollo": "^4.3.3",
    "@playwright/test": "^1.56.1",
    "eslint": "^8.57.1",
    "eslint-config-next": "^15.5.6",
    "nodemon": "^3.1.10",
    "glob": "^11.0.3"
  }
}
```

### Keep in dependencies (runtime needed):
```json
{
  "dependencies": {
    "concurrently": "^9.2.1",
    "sass": "^1.93.2",
    "@whatwg-node/fetch": "^0.10.11",
    "@whatwg-node/node-fetch": "^0.8.1",
    "@apollo/client-integration-nextjs": "^0.14.0",
    "@apollo/client-react-streaming": "^0.14.0",
    "tsconfig-paths": "^4.2.0"
  }
}
```

## Backend Package.json Changes

### Move to devDependencies:
```json
{
  "devDependencies": {
    "@graphql-codegen/cli": "^6.0.0",
    "@graphql-codegen/typescript": "^5.0.2",
    "@graphql-codegen/typescript-operations": "^5.0.2",
    "@graphql-codegen/typescript-resolvers": "^5.1.0",
    "prisma": "^6.17.1"
  }
}
```

### Keep `@prisma/client` in dependencies (runtime needed):
```json
{
  "dependencies": {
    "@prisma/client": "^6.17.1"
  }
}
```

## Deployment Configuration

### After cleaning up dependencies, use:

```toml
[deployment]
build = "npm ci && npm run build && npm prune --omit=dev"
run = "npm start"
deploymentTarget = "cloudrun"
```

**How it works:**
1. **Build**: `npm ci` installs all deps (including dev for TypeScript, etc.)
2. **Build**: `npm run build` compiles everything
3. **Build**: `npm prune --omit=dev` removes devDependencies
4. **Runtime**: `npm start` just starts the app (deps already there)

**Result:**
- ✅ Smaller deployment size
- ✅ Faster cold starts (no npm install at runtime)
- ✅ Only production dependencies shipped

## Expected Performance

| Phase | Command | Time |
|-------|---------|------|
| Build | npm ci | 60-90s |
| Build | npm run build | 60-90s |
| Build | npm prune --omit=dev | 5-10s |
| **Total Build** | | **2-3 min** |
| **Runtime Startup** | npm start | **5-10s** |

## Fallback (if snapshot doesn't persist)

If `node_modules` don't persist from build to runtime:

```toml
[deployment]
build = "npm ci && npm run build"
run = "npm ci --omit=dev && npm start"
deploymentTarget = "cloudrun"
```

This installs only production deps at runtime (~20-30s instead of 60s).
