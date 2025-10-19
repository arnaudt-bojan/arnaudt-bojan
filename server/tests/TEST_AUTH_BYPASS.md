# Test Authentication Bypass for Playwright E2E Tests

## Overview

This document describes the test-only authentication bypass that allows Playwright E2E tests to authenticate without requiring email confirmation.

## Security

**IMPORTANT:** This bypass is STRICTLY gated to test environments only.

- ✅ Only active when `NODE_ENV === 'test'` OR `ENABLE_TEST_AUTH === 'true'`
- ✅ Returns 404 in production environments
- ✅ Never affects production authentication flows
- ✅ Documented and auditable

## Implementation Details

### Endpoint

**POST /api/test/auth/session**

### Request Body

```typescript
{
  sub: string;        // User ID (required)
  email: string;      // Email address (required)
  firstName?: string; // First name (optional)
  lastName?: string;  // Last name (optional)
  role?: string;      // Role: 'admin' | 'seller' | 'buyer' | 'owner' (default: 'admin')
  userType?: string;  // User type: 'seller' | 'buyer' | 'collaborator' (default: 'seller')
}
```

### Response

**Success (200)**
```json
{
  "success": true,
  "message": "Test session created successfully",
  "user": {
    "id": "test-seller-domains",
    "email": "seller-domains@test.com",
    "role": "admin",
    "userType": "seller",
    "firstName": "Test",
    "lastName": "Seller"
  }
}
```

**Failure (404)** - When not in test environment
```json
{
  "error": "Not found"
}
```

**Failure (400)** - When missing required fields
```json
{
  "error": "Missing required fields: sub and email are required"
}
```

## Playwright Usage

### Example Test

```typescript
import { test, expect } from '@playwright/test';

test('seller can access domain settings', async ({ page, request }) => {
  // Step 1: Authenticate using test bypass
  const authResponse = await request.post('/api/test/auth/session', {
    data: {
      sub: 'test-seller-domains',
      email: 'seller-domains@test.com',
      firstName: 'Test',
      lastName: 'Seller',
      role: 'admin',
      userType: 'seller'
    }
  });

  expect(authResponse.ok()).toBeTruthy();
  
  const authData = await authResponse.json();
  expect(authData.success).toBe(true);

  // Step 2: Navigate to settings (session is now active)
  await page.goto('/settings');

  // Step 3: Click on Domains tab
  await page.click('[data-testid="tab-domains"]');

  // Step 4: Verify domain management interface is visible
  await expect(page.locator('[data-testid="button-add-domain"]')).toBeVisible();
});
```

### Example Test User Data

**Seller Account (for testing seller features)**
```typescript
{
  sub: 'test-seller-domains',
  email: 'seller-domains@test.com',
  firstName: 'Test',
  lastName: 'Seller',
  role: 'admin',
  userType: 'seller'
}
```

**Buyer Account (for testing buyer features)**
```typescript
{
  sub: 'test-buyer-checkout',
  email: 'buyer-checkout@test.com',
  firstName: 'Test',
  lastName: 'Buyer',
  role: 'buyer',
  userType: 'buyer'
}
```

## Environment Variables

To enable the test auth bypass, set ONE of the following:

```bash
# Option 1: Set NODE_ENV to test
export NODE_ENV=test

# Option 2: Use dedicated flag
export ENABLE_TEST_AUTH=true
```

**Note:** In Replit's test environment, these are automatically configured.

## How It Works

1. **Request Validation**: Endpoint checks if running in test environment
2. **User Creation**: Creates or finds user in database with provided credentials
3. **Session Seeding**: Creates authenticated session using Passport.js format
4. **Session Persistence**: Saves session to session store
5. **Response**: Returns success with user data

The session created is identical to email-based authentication sessions, ensuring compatibility with all existing auth middleware.

## Middleware Support

The test auth bypass is recognized by all authentication middleware:

- `requireAuth` - Recognizes 'test-auth' access tokens
- `requireUserType` - Works with test users
- `requireCapability` - Works with test users
- All other auth middleware - Fully compatible

## Implementation Files

- **Route Handler**: `server/routes.ts` (lines 641-773)
- **Auth Middleware**: `server/middleware/auth.ts` (line 51)
- **Documentation**: `replit.md` (line 71)

## Troubleshooting

### Test auth not working

**Check environment variables:**
```bash
echo $NODE_ENV
echo $ENABLE_TEST_AUTH
```

Both should be empty in production, set to `test` or `true` respectively in test environments.

### Session not persisting

Ensure you're using the `request` context from Playwright test fixtures. The session cookie is automatically handled.

### 404 error when calling endpoint

This is expected in non-test environments. Verify `NODE_ENV` or `ENABLE_TEST_AUTH` is set correctly.

## Security Considerations

1. **Production Safety**: Endpoint returns 404 in production, preventing accidental exposure
2. **Audit Trail**: All test auth operations are logged with `[Test Auth]` prefix
3. **Strict Gating**: Double-check on environment variables before proceeding
4. **No Secrets**: No secrets or sensitive data required for test auth

## Related Documentation

- Email Authentication: `server/auth-email.ts`
- Auth Middleware: `server/middleware/auth.ts`
- Session Setup: `server/replitAuth.ts`
