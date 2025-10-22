# Build Validation Configuration

## Overview
The build process now includes comprehensive validation steps that run **before** the actual build, ensuring code quality and preventing deployment of code with errors or warnings.

## Build Pipeline

### Root Build Command
```bash
npm run build
```

This triggers the following sequence:

### Frontend Build (`apps/frontend`)
**Pre-build Steps (runs automatically via `prebuild` hook):**
1. **GraphQL Code Generation** - Generates TypeScript types from GraphQL schema
   - Command: `npm run codegen`
   - Config: `apps/frontend/codegen.ts`
   - Output: `apps/frontend/lib/generated/graphql.ts`
   
2. **TypeScript Type Checking** - Validates all TypeScript code
   - Command: `npm run typecheck`
   - Checks: All `.ts` and `.tsx` files
   - Fails on: Any TypeScript errors
   
3. **ESLint Linting** - Enforces code quality rules
   - Command: `npm run lint --max-warnings=0`
   - Checks: All source files
   - Fails on: Any errors OR warnings

**Build Step:**
- Command: `next build`
- Only runs if all pre-build steps pass

### Backend Build (`apps/backend`)
**Pre-build Steps (runs automatically via `prebuild` hook):**
1. **TypeScript Type Checking** - Validates all TypeScript code
   - Command: `npm run typecheck`
   - Checks: All `.ts` files
   - Fails on: Any TypeScript errors

**Build Step:**
- Command: `npx nest build`
- Only runs if typecheck passes

## Early Failure Behavior

The build will **fail immediately** if any of these conditions occur:

### Frontend Failures
- ❌ GraphQL code generation fails
- ❌ TypeScript compilation errors
- ❌ ESLint errors
- ❌ ESLint warnings (even a single warning will fail the build)

### Backend Failures
- ❌ TypeScript compilation errors

## Current Build Status

✅ **All validation checks passing:**
- Frontend TypeScript: 0 errors
- Frontend ESLint: 0 warnings
- Backend TypeScript: 0 errors
- GraphQL Codegen: Successful

## Running Individual Checks

You can run individual validation steps:

### Frontend
```bash
cd apps/frontend

# Run GraphQL code generation
npm run codegen

# Run TypeScript type checking
npm run typecheck

# Run ESLint
npm run lint

# Run all checks (codegen + typecheck + lint)
npm run prebuild
```

### Backend
```bash
cd apps/backend

# Run TypeScript type checking
npm run typecheck

# Run GraphQL code generation (if needed)
npm run codegen

# Run pre-build checks
npm run prebuild
```

## CI/CD Integration

For continuous integration pipelines, use:

```bash
# Full build with all validation
npm run build

# This will:
# 1. Generate GraphQL types (frontend)
# 2. Type check (frontend + backend)
# 3. Lint (frontend)
# 4. Build (frontend + backend)
# 
# Exit code will be non-zero if ANY step fails
```

## What Changed

### Previous Behavior
- Frontend: Only ran codegen before build
- Backend: No pre-build checks
- Warnings were ignored

### Current Behavior
- Frontend: Runs codegen → typecheck → lint (all must pass)
- Backend: Runs typecheck (must pass)
- **Any errors or warnings cause build to fail**

## Benefits

1. **Early Detection** - Issues caught before build/deployment
2. **Type Safety** - Ensures GraphQL types are up-to-date
3. **Code Quality** - Enforces linting rules consistently
4. **CI/CD Ready** - Single command validates everything
5. **Zero Warnings Policy** - Maintains clean codebase

## Troubleshooting

If the build fails:

1. **Check the error message** - It will indicate which step failed
2. **Run the failing step individually** - For detailed error output
3. **Fix the issues** - Address all errors/warnings
4. **Re-run the build** - Verify fixes work

Example:
```bash
# If lint fails, run it directly to see all issues
cd apps/frontend
npm run lint

# Fix the issues, then verify
npm run lint
```
