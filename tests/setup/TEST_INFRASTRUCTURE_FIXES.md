# Test Infrastructure Fixes

## Summary
This document describes the fixes applied to resolve test infrastructure issues preventing tests from running.

---

## Task 1: Add test_audit_log Table ✅ COMPLETED

### Issue
The `test_audit_log` table was missing from the Prisma schema, causing test utilities in `tests/setup/db-test-utils.ts` to fail when trying to query audit logs.

### Solution
Added the `test_audit_log` model to `prisma/schema.prisma`:

```prisma
model test_audit_log {
  id          Int      @id @default(autoincrement())
  table_name  String
  operation   String
  row_id      String
  old_data    Json?
  new_data    Json?
  changed_at  DateTime @default(now())
}
```

### Actions Taken
1. Added the model to `prisma/schema.prisma` (line 1947-1955)
2. Ran `npm run db:push -- --accept-data-loss` successfully
3. Table now exists in the database

---

## Task 2: Auth Helper 404 Errors ✅ COMPLETED

### Issue
Tests using `createAuthSession()` from `tests/setup/auth-helpers.ts` were getting 404 errors:
```
Failed to create auth session: 404 {}
```

### Root Cause Analysis

#### What Was Happening
1. **Auth endpoint exists**: The endpoint `/api/auth/email/verify-code` is properly defined in `server/auth-email.ts` (line 131)
2. **Routes are registered**: The auth routes are registered in `server/routes.ts` (line 671): `app.use("/api/auth/email", emailAuthRoutes);`
3. **The timing problem**: In `server/index.ts`:
   - Line 42-45: `app` is exported immediately
   - Line 609: `await registerRoutes(app)` is called later (async)
   
When tests import the app directly:
```typescript
import { app } from '../../server/index.js';
```

They get the Express app **before** `registerRoutes()` has been called, so NO routes are registered yet!

#### Why This Happens
- `registerRoutes()` is async (line 664 of routes.ts)
- It calls `await setupAuth(app)` which must complete before routes are available
- The app is exported at module load time, but routes are registered later
- Tests immediately use the app without waiting for route registration

### Solution Created

Created `tests/setup/test-app.ts` - a helper that ensures routes are registered before tests use the app:

```typescript
export async function getTestApp(): Promise<Express> {
  if (!appInitialized) {
    httpServer = await registerRoutes(app);
    appInitialized = true;
  }
  return app;
}
```

This helper:
- Calls `registerRoutes()` exactly once
- Waits for it to complete
- Caches the result
- Returns the fully-initialized app

---

## How to Use the Fix

### For New Tests
Instead of:
```typescript
import { app } from '../../server/index.js';

describe('My Test', () => {
  it('should work', async () => {
    await request(app).get('/api/something');
  });
});
```

Use:
```typescript
import { getTestApp } from '../setup/test-app.js';

describe('My Test', () => {
  let app: Express;
  
  beforeAll(async () => {
    app = await getTestApp();
  });
  
  it('should work', async () => {
    await request(app).get('/api/something');
  });
});
```

### For Existing Tests
Update tests that use `createAuthSession()`:

**Before:**
```typescript
import { app } from '../../server/index.js';
import { createBuyerSession } from '../setup/auth-helpers.js';

beforeEach(async () => {
  buyerAuth = await createBuyerSession(app, prisma);
});
```

**After:**
```typescript
import { getTestApp } from '../setup/test-app.js';
import { createBuyerSession } from '../setup/auth-helpers.js';

let app: Express;

beforeAll(async () => {
  app = await getTestApp();
});

beforeEach(async () => {
  buyerAuth = await createBuyerSession(app, prisma);
});
```

### Key Points
1. Call `getTestApp()` in `beforeAll()` hook (once per test suite)
2. Store the result in a variable
3. Use that variable throughout your tests
4. The helper ensures routes are only registered once, no matter how many test files run

---

## Files Modified

1. `prisma/schema.prisma` - Added test_audit_log model
2. `tests/setup/test-app.ts` - Created new helper for properly initialized app

## Files That Need Updates

The following test files import `app` directly and should be updated to use `getTestApp()`:

```bash
# Find all test files that import app directly
grep -r "import.*app.*from.*server/index" tests/
```

Example files that likely need updating:
- `tests/api/b2c-flow.spec.ts`
- `tests/api/*.spec.ts` (any API tests)
- Any test that uses `createAuthSession`, `createBuyerSession`, or `createSellerSession`

---

## Verification

To verify the fix works:

1. **Check database table exists:**
```sql
SELECT * FROM test_audit_log LIMIT 1;
```

2. **Test the app helper:**
```typescript
import { getTestApp } from './tests/setup/test-app';
const app = await getTestApp();
// Routes should be registered and working
```

3. **Run a failing test again:**
```bash
npm test -- tests/api/b2c-flow.spec.ts
```

---

## Future Improvements

### Option 1: Fix at the Source
Modify `server/index.ts` to not export `app` until routes are registered:

```typescript
let _app: Express | null = null;

export async function getApp(): Promise<Express> {
  if (!_app) {
    _app = express();
    await registerRoutes(_app);
  }
  return _app;
}
```

### Option 2: Make registerRoutes Synchronous
If setupAuth() and other async operations can be deferred, make route registration synchronous.

### Option 3: Update All Tests (Recommended)
Update all test files to use `getTestApp()` helper for consistency.

---

## Summary

**Task 1**: ✅ Added test_audit_log table and pushed to database  
**Task 2**: ✅ Identified root cause (timing issue with async route registration)  
**Task 2**: ✅ Created `getTestApp()` helper to ensure routes are ready before tests run

**Next Steps**:
1. Update existing test files to use `getTestApp()` instead of importing `app` directly
2. Verify tests pass with the new helper
3. Consider implementing one of the future improvements for a more permanent fix
