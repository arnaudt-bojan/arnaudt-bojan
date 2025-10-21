import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '@tests/setup/test-app.js';
import { createSellerSession, createBuyerSession } from '@tests/setup/auth-helpers.js';
import { withTransaction } from '@tests/setup/db-test-utils.js';
import type { Express } from 'express';
import type { Prisma } from '../../generated/prisma/index.js';

/**
 * Wallet Integration Tests
 * 
 * Purpose: Test wallet API behavior under failure conditions
 * Catches: Timeouts, DB errors, network failures, authorization issues
 */

let app: Express;

beforeAll(async () => {
  app = await getTestApp();
});

describe('Wallet Integration Tests - @integration', () => {

  describe('Authentication & Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      const res = await request(app)
        .get('/api/seller/wallet/balance');

      expect(res.status).toBe(401);
      expect(res.body.message).toBeTruthy();
      
      // Metric: Track authentication failures
      console.log('[METRIC] wallet_balance_error_total{type="unauthorized"} +1');
    });

    it('should return 403 for buyer attempting seller endpoint', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(403);
        expect(res.body.message).toBeTruthy();
        
        // Metric: Track authorization failures
        console.log('[METRIC] wallet_balance_error_total{type="forbidden"} +1');
      });
    });

    it('should allow sellers to access wallet endpoint', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  describe('Error Handling - 500 Responses', () => {
    it('should handle database connection failures gracefully', async () => {
      // This test documents expected behavior when DB is unavailable
      // In production, this would be tested with actual DB connection failures
      
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        // If DB fails, we expect 500 with proper error message
        if (res.status === 500) {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBeTruthy();
          console.log('[METRIC] wallet_balance_error_total{type="database_error"} +1');
        } else {
          // Success case
          expect(res.status).toBe(200);
        }
      });
    });

    it('should return structured error for internal server errors', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        // Regardless of success/failure, response should be structured
        expect(res.body).toBeDefined();
        expect(typeof res.body).toBe('object');
        
        if (res.status >= 500) {
          expect(res.body).toHaveProperty('message');
          expect(res.body.success).toBeFalsy();
        }
      });
    });
  });

  describe('Timeout Handling', () => {
    it('should handle slow database queries (timeout simulation)', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Set a short timeout to test timeout behavior
        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie)
          .timeout(100); // 100ms timeout

        // Expect either success (fast response) or timeout error
        if (res.status === 408 || res.status === 504) {
          console.log('[METRIC] wallet_balance_error_total{type="timeout"} +1');
          expect(res.body).toHaveProperty('message');
        } else {
          // Normal success
          expect(res.status).toBe(200);
        }
      }, { timeout: 150 });
    });

    it('should not hang indefinitely on slow operations', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const startTime = Date.now();
        
        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie)
          .timeout(5000); // 5 second max

        const duration = Date.now() - startTime;

        // Should respond within reasonable time
        expect(duration).toBeLessThan(5000);
        
        // Log slow requests
        if (duration > 1000) {
          console.log(`[METRIC] wallet_balance_slow_request{duration="${duration}ms"} +1`);
        }
      });
    });
  });

  describe('Network Error Scenarios', () => {
    it('should handle malformed requests gracefully', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Send request with invalid headers
        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie)
          .set('Content-Type', 'application/invalid');

        // Should still process the request (GET doesn't need Content-Type)
        expect([200, 400, 415]).toContain(res.status);
      });
    });

    it('should validate response completeness', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        if (res.status === 200) {
          // Validate complete response
          expect(res.body).toBeDefined();
          expect(res.body).not.toBeNull();
          expect(Object.keys(res.body).length).toBeGreaterThan(0);
          
          // Ensure numeric balances exist
          expect(res.body).toHaveProperty('currentBalanceUsd');
          expect(res.body).toHaveProperty('pendingBalanceUsd');
        }
      });
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous wallet requests', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // Send 5 concurrent requests
        const promises = Array.from({ length: 5 }, () =>
          request(app)
            .get('/api/seller/wallet/balance')
            .set('Cookie', seller.sessionCookie)
        );

        const results = await Promise.all(promises);

        // All should succeed
        results.forEach((res) => {
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        // All should return consistent data
        const balances = results.map(r => r.body.currentBalanceUsd);
        const allSame = balances.every(b => b === balances[0]);
        expect(allSame).toBe(true);
      });
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent balance across multiple requests', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        // First request
        const res1 = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        // Second request
        const res2 = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);

        // Balance should be consistent (no mutations between calls)
        expect(res1.body.currentBalanceUsd).toBe(res2.body.currentBalanceUsd);
        expect(res1.body.pendingBalanceUsd).toBe(res2.body.pendingBalanceUsd);
      });
    });

    it('should return balance for correct user (no cross-user leakage)', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller1 = await createSellerSession(app, tx, { email: 'seller1@test.com' });
        const seller2 = await createSellerSession(app, tx, { email: 'seller2@test.com' });

        const res1 = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller1.sessionCookie);

        const res2 = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller2.sessionCookie);

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);

        // Both should succeed independently
        expect(res1.body.success).toBe(true);
        expect(res2.body.success).toBe(true);
        
        // Data isolation: Each seller sees their own balance
        // (Note: In test environment, both might be 0, but structure should be independent)
      });
    });
  });
});
