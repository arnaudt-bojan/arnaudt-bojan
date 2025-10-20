import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { withTransaction, createTestPrisma } from '@tests/setup/db-test-utils';
import { createFixtures } from '@tests/setup/fixtures';
import {
  createBuyerSession,
  createSellerSession,
  loginAs,
  logout,
  getCurrentUser,
  createTestAuthToken,
} from '@tests/setup/auth-helpers';
import { getTestApp } from '@tests/setup/test-app.js';
import type { Prisma } from '../../generated/prisma/index.js';
import request from 'supertest';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  app = await getTestApp();
});

describe('Auth Flow Tests - @integration', () => {
  describe('Registration Flow', () => {
    it('should complete full buyer registration via email auth', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `buyer-${Date.now()}@example.com`;

        const sendCodeRes = await request(app)
          .post('/api/auth/email/send-code')
          .send({ email });

        expect([200, 201]).toContain(sendCodeRes.status);

        const verifyRes = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.success).toBe(true);
        expect(verifyRes.body.user).toBeDefined();
        expect(verifyRes.body.user.email).toBe(email);
        expect(verifyRes.body.redirectUrl).toBeDefined();

        const cookies = verifyRes.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.length).toBeGreaterThan(0);
      });
    });

    it('should complete full seller registration via email auth', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `seller-${Date.now()}@example.com`;

        const sendCodeRes = await request(app)
          .post('/api/auth/email/send-code')
          .send({ 
            email,
            sellerContext: null,
          });

        expect([200, 201]).toContain(sendCodeRes.status);

        const verifyRes = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.success).toBe(true);
        expect(verifyRes.body.user).toBeDefined();
        expect(verifyRes.body.redirectUrl).toContain('seller-dashboard');
      });
    });

    it('should prevent duplicate registrations with same email', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `duplicate-${Date.now()}@example.com`;

        await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        const secondAttempt = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(secondAttempt.status).toBe(200);
        expect(secondAttempt.body.user.email).toBe(email);
      });
    });
  });

  describe('Login Flow', () => {
    it('should login existing user with valid code', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        const { user: buyer } = await fixtures.createBuyer();
        const email = `login-test-${Date.now()}@example.com`;
        
        await tx.users.update({
          where: { id: buyer.id },
          data: { email },
        });

        await createTestAuthToken(email, tx);

        const loginRes = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.success).toBe(true);
        expect(loginRes.body.user.email).toBe(email);

        const cookies = loginRes.headers['set-cookie'];
        expect(cookies).toBeDefined();
      });
    });

    it('should reject login with invalid code', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `invalid-code-${Date.now()}@example.com`;

        await createTestAuthToken(email, tx);

        const loginRes = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '999999' });

        expect(loginRes.status).toBe(401);
        expect(loginRes.body.error).toBe('Invalid code');
      });
    });

    it('should reject login with expired code', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `expired-${Date.now()}@example.com`;
        const expiredDate = new Date(Date.now() - 60 * 60 * 1000);

        await tx.auth_tokens.create({
          data: {
            id: `expired-token-${Date.now()}`,
            email,
            token: 'expired-token',
            code: '111111',
            token_type: 'login_code',
            expires_at: expiredDate,
            used: 0,
          },
        });

        const loginRes = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(loginRes.status).toBe(401);
        expect(loginRes.body.error).toBe('Code expired');
      });
    });
  });

  describe('Logout Flow', () => {
    it('should successfully logout authenticated user', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const logoutRes = await request(app)
          .post('/api/auth/logout')
          .set('Cookie', buyer.sessionCookie);

        expect(logoutRes.status).toBe(200);

        const protectedRes = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        expect(protectedRes.status).toBe(401);
      });
    });

    it('should clear session on logout', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        await request(app)
          .post('/api/auth/logout')
          .set('Cookie', buyer.sessionCookie);

        const userRes = await request(app)
          .get('/api/user')
          .set('Cookie', buyer.sessionCookie);

        expect(userRes.status).toBe(401);
      });
    });
  });

  describe('Session Management', () => {
    it('should maintain session across multiple requests', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const req1 = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        const req2 = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        const req3 = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        expect(req1.status).toBe(200);
        expect(req2.status).toBe(200);
        expect(req3.status).toBe(200);
      });
    });

    it('should reject requests without valid session', async () => {
      const res = await request(app).get('/api/cart');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Unauthorized');
    });

    it('should reject requests with invalid session cookie', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Cookie', 'connect.sid=invalid-session-id');

      expect(res.status).toBe(401);
    });

    it('should handle concurrent sessions for different users', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);
        const seller = await createSellerSession(app, tx);

        const buyerRes = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        const sellerRes = await request(app)
          .get('/api/products')
          .set('Cookie', seller.sessionCookie);

        expect(buyerRes.status).toBe(200);
        expect(sellerRes.status).toBe(200);
      });
    });
  });

  describe('Password Reset Flow (Email Auth)', () => {
    it('should send reset code to registered email', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        const { user } = await fixtures.createBuyer();

        const resetRes = await request(app)
          .post('/api/auth/email/send-code')
          .send({ email: user.email });

        expect([200, 201]).toContain(resetRes.status);
        expect(resetRes.body.email).toBe(user.email);
      });
    });

    it('should allow password reset with valid code', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        const { user } = await fixtures.createBuyer();

        await createTestAuthToken(user.email, tx);

        const loginRes = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email: user.email, code: '111111' });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.success).toBe(true);
      });
    });
  });

  describe('Magic Link Flow', () => {
    it('should send magic link to email', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `magiclink-${Date.now()}@example.com`;

        const res = await request(app)
          .post('/api/auth/email/send-magic-link')
          .send({ email });

        expect([200, 201]).toContain(res.status);
        expect(res.body.email).toBe(email);
      });
    });

    it('should authenticate user with valid magic link token', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `magiclink-auth-${Date.now()}@example.com`;
        const token = 'test-magic-link-token';

        await tx.auth_tokens.create({
          data: {
            id: `magic-${Date.now()}`,
            email,
            token,
            code: null,
            token_type: 'magic_link',
            expires_at: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
            used: 0,
          },
        });

        const res = await request(app)
          .get('/api/auth/email/verify-magic-link')
          .query({ token });

        expect(res.status).toBe(302);
      });
    });

    it('should reject expired magic link', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `expired-magic-${Date.now()}@example.com`;
        const token = 'expired-magic-token';

        await tx.auth_tokens.create({
          data: {
            id: `expired-magic-${Date.now()}`,
            email,
            token,
            code: null,
            token_type: 'magic_link',
            expires_at: new Date(Date.now() - 1000),
            used: 0,
          },
        });

        const res = await request(app)
          .get('/api/auth/email/verify-magic-link')
          .query({ token });

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Auth Token Security', () => {
    it('should not allow code reuse for single-use tokens', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `single-use-${Date.now()}@example.com`;

        await createTestAuthToken(email, tx);

        const firstUse = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(firstUse.status).toBe(200);

        const secondUse = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(secondUse.status).toBe(401);
        expect(secondUse.body.error).toBe('Code already used');
      });
    });

    it('should allow magic link reuse', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const email = `reusable-magic-${Date.now()}@example.com`;
        const token = `reusable-token-${Date.now()}`;

        await tx.auth_tokens.create({
          data: {
            id: `reusable-${Date.now()}`,
            email,
            token,
            code: null,
            token_type: 'magic_link',
            expires_at: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
            used: 0,
          },
        });

        const firstUse = await request(app)
          .get('/api/auth/email/verify-magic-link')
          .query({ token });

        const secondUse = await request(app)
          .get('/api/auth/email/verify-magic-link')
          .query({ token });

        expect(firstUse.status).toBe(302);
        expect(secondUse.status).toBe(302);
      });
    });
  });

  describe('Role-Based Redirects', () => {
    it('should redirect buyers to buyer dashboard after login', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        const { user } = await fixtures.createBuyer();
        const email = `buyer-redirect-${Date.now()}@example.com`;
        
        await tx.users.update({
          where: { id: user.id },
          data: { email },
        });

        await createTestAuthToken(email, tx);

        const loginRes = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.redirectUrl).toContain('buyer-dashboard');
      });
    });

    it('should redirect sellers to seller dashboard after login', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        const { user } = await fixtures.createSeller();
        const email = `seller-redirect-${Date.now()}@example.com`;
        
        await tx.users.update({
          where: { id: user.id },
          data: { email },
        });

        await createTestAuthToken(email, tx);

        const loginRes = await request(app)
          .post('/api/auth/email/verify-code')
          .send({ email, code: '111111' });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.redirectUrl).toContain('seller-dashboard');
      });
    });
  });
});
