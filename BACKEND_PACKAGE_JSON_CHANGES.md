# Backend package.json Changes

## File: `apps/backend/package.json`

### Step 1: Find these lines in `dependencies` (lines 35-39):

```json
"prisma": "^6.17.1",
"@graphql-codegen/cli": "^6.0.0",
"@graphql-codegen/typescript": "^5.0.2",
"@graphql-codegen/typescript-operations": "^5.0.2",
"@graphql-codegen/typescript-resolvers": "^5.1.0",
```

### Step 2: DELETE those 5 lines from `dependencies`

### Step 3: Add them to `devDependencies` section

Find the `devDependencies` section (around line 70) and add these 5 packages:

```json
"devDependencies": {
  "@graphql-codegen/cli": "^6.0.0",
  "@graphql-codegen/typescript": "^5.0.2",
  "@graphql-codegen/typescript-operations": "^5.0.2",
  "@graphql-codegen/typescript-resolvers": "^5.1.0",
  "@nestjs/cli": "^11.0.10",
  "@nestjs/schematics": "^11.0.9",
  "@nestjs/testing": "^11.1.6",
  // ... rest of existing devDependencies
  "prisma": "^6.17.1",
  "typescript": "5.6.3"
}
```

### Complete After State:

**dependencies should have:**
- ✅ `@prisma/client` (keep - runtime needed)
- ✅ All `@nestjs/*` runtime packages
- ✅ All other packages (express, graphql, etc.)
- ❌ NO `prisma` CLI
- ❌ NO `@graphql-codegen/*` packages

**devDependencies should have:**
- ✅ `prisma` CLI
- ✅ `@graphql-codegen/*` packages
- ✅ All existing dev packages

### Step 4: Save and run

```bash
npm install
```

This will regenerate `package-lock.json` with the correct structure.
