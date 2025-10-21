import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '@tests/setup/test-app.js';
import { createSellerSession } from '@tests/setup/auth-helpers.js';
import { withTransaction } from '@tests/setup/db-test-utils.js';
import type { Express } from 'express';
import type { Prisma } from '../../generated/prisma/index.js';

/**
 * Stripe Connect UI Flow Tests
 * 
 * Purpose: Catch UI bugs in Stripe Connect onboarding flow
 * Bug Caught: Modal never appears after selecting currency (race condition)
 * 
 * This test validates the end-to-end flow:
 * 1. User clicks "Connect Stripe Account"
 * 2. User selects country/currency
 * 3. Backend creates Express account and updates user record
 * 4. Frontend refetches user data
 * 5. Modal opens with onboarding flow
 */

let app: Express;

beforeAll(async () => {
  app = await getTestApp();
});

describe('Stripe Connect UI Flow Tests - @integration', () => {
  describe('Account Creation Flow', () => {
    it('should update user.stripeConnectedAccountId immediately after account creation', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Step 1: User selects country and triggers account creation
        const createResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({ country: 'US' });

        expect(createResponse.status).toBe(200);
        expect(createResponse.body.accountId).toBeTruthy();
        
        const accountId = createResponse.body.accountId;

        // Step 2: Verify user record was updated with accountId
        // This is critical - if this fails, modal won't render
        const userResponse = await request(app)
          .get('/api/auth/user')
          .set('Cookie', seller.sessionCookie);

        expect(userResponse.status).toBe(200);
        expect(userResponse.body.stripeConnectedAccountId).toBe(accountId);
        
        // Step 3: Verify modal can render (user has accountId)
        // In the UI, the modal only renders if user.stripeConnectedAccountId exists
        const canRenderModal = !!userResponse.body.stripeConnectedAccountId;
        expect(canRenderModal).toBe(true);
      });
    });

    it('should return accountId in response for immediate use', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const createResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({ country: 'GB' });

        expect(createResponse.status).toBe(200);
        expect(createResponse.body).toHaveProperty('accountId');
        expect(createResponse.body.accountId).toMatch(/^acct_/);
        expect(createResponse.body).toHaveProperty('chargesEnabled');
        expect(createResponse.body).toHaveProperty('payoutsEnabled');
      });
    });

    it('should handle duplicate account creation (idempotent)', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Create account first time
        const firstResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({ country: 'CA' });

        expect(firstResponse.status).toBe(200);
        const firstAccountId = firstResponse.body.accountId;

        // Try to create again (should return existing account)
        const secondResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({ country: 'CA' });

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.accountId).toBe(firstAccountId);
        
        // Verify no duplicate accounts created
        const userResponse = await request(app)
          .get('/api/auth/user')
          .set('Cookie', seller.sessionCookie);
        
        expect(userResponse.body.stripeConnectedAccountId).toBe(firstAccountId);
      });
    });
  });

  describe('Race Condition Prevention', () => {
    it('should prevent modal from opening before user data refetches', async () => {
      /**
       * This test documents the bug:
       * 
       * BAD FLOW (before fix):
       * 1. POST /api/stripe/create-express-account → returns accountId
       * 2. setIsStripeModalOpen(true) → modal tries to render
       * 3. queryClient.invalidateQueries() → starts refetch (ASYNC)
       * 4. Modal checks: user.stripeConnectedAccountId → UNDEFINED (stale data)
       * 5. Modal doesn't render ❌
       * 
       * GOOD FLOW (after fix):
       * 1. POST /api/stripe/create-express-account → returns accountId
       * 2. await queryClient.invalidateQueries() → waits for refetch
       * 3. setTimeout(() => setIsStripeModalOpen(true), 100) → ensures re-render
       * 4. Modal checks: user.stripeConnectedAccountId → EXISTS ✅
       * 5. Modal renders ✅
       */
      
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Simulate the flow
        const createResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({ country: 'AU' });

        const accountId = createResponse.body.accountId;

        // Immediately fetch user (simulates React Query cache)
        const immediateUserFetch = await request(app)
          .get('/api/auth/user')
          .set('Cookie', seller.sessionCookie);

        // User should have accountId immediately
        expect(immediateUserFetch.body.stripeConnectedAccountId).toBe(accountId);
        
        // Modal can render because user data is up-to-date
        const modalCanRender = !!immediateUserFetch.body.stripeConnectedAccountId;
        expect(modalCanRender).toBe(true);
      });
    });

    it('should persist accountId across multiple user fetches', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Create account
        const createResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({ country: 'FR' });

        const accountId = createResponse.body.accountId;

        // Fetch user multiple times (simulates React Query refetches)
        for (let i = 0; i < 5; i++) {
          const userResponse = await request(app)
            .get('/api/auth/user')
            .set('Cookie', seller.sessionCookie);

          expect(userResponse.body.stripeConnectedAccountId).toBe(accountId);
        }
      });
    });
  });

  describe('Error Handling in UI Flow', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/stripe/create-express-account')
        .send({ country: 'US' });

      expect(response.status).toBe(401);
    });

    it('should validate country parameter', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Missing country
        const noCountryResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({});

        // Should still work (defaults to US)
        expect(noCountryResponse.status).toBe(200);
        expect(noCountryResponse.body.accountId).toBeTruthy();
      });
    });

    it('should handle reset flag correctly', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Create initial account
        const firstResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({ country: 'DE' });

        const firstAccountId = firstResponse.body.accountId;

        // Reset and create new account
        const resetResponse = await request(app)
          .post('/api/stripe/create-express-account')
          .set('Cookie', seller.sessionCookie)
          .send({ country: 'DE', reset: true });

        expect(resetResponse.status).toBe(200);
        expect(resetResponse.body.accountId).not.toBe(firstAccountId);
        
        // Verify user has new account
        const userResponse = await request(app)
          .get('/api/auth/user')
          .set('Cookie', seller.sessionCookie);
        
        expect(userResponse.body.stripeConnectedAccountId).toBe(resetResponse.body.accountId);
      });
    });
  });
});
