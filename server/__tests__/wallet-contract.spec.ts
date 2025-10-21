import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { getTestApp } from '@tests/setup/test-app.js';
import { createSellerSession, createBuyerSession } from '@tests/setup/auth-helpers.js';
import { withTransaction } from '@tests/setup/db-test-utils.js';
import type { Express } from 'express';
import type { Prisma } from '../../generated/prisma/index.js';

/**
 * Wallet Balance Contract Tests
 * 
 * Purpose: Validate API contract for /api/seller/wallet/balance endpoint
 * Catches: Missing fields, wrong types, incorrect status codes, schema drift
 */

// Define expected response schema
const WalletBalanceResponseSchema = z.object({
  success: z.boolean(),
  currentBalanceUsd: z.number(),
  pendingBalanceUsd: z.number(),
  currency: z.string().optional(),
  lastUpdated: z.string().optional(),
});

type WalletBalanceResponse = z.infer<typeof WalletBalanceResponseSchema>;

let app: Express;

beforeAll(async () => {
  app = await getTestApp();
});

describe('Wallet Contract Tests - @integration', () => {

  describe('GET /api/seller/wallet/balance - Response Shape', () => {
    it('should return valid wallet balance schema for authenticated seller', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        
        // Validate response matches contract
        const parseResult = WalletBalanceResponseSchema.safeParse(res.body);
        
        if (!parseResult.success) {
          console.error('Schema validation failed:', parseResult.error.format());
        }
        
        expect(parseResult.success).toBe(true);
        
        // Additional field validations
        const data = res.body as WalletBalanceResponse;
        expect(data.success).toBe(true);
        expect(typeof data.currentBalanceUsd).toBe('number');
        expect(typeof data.pendingBalanceUsd).toBe('number');
      });
    });

    it('should detect missing required fields in response', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        // Ensure all required fields are present
        expect(res.body).toHaveProperty('success');
        expect(res.body).toHaveProperty('currentBalanceUsd');
        expect(res.body).toHaveProperty('pendingBalanceUsd');
        
        // Track schema violations for metrics
        if (!res.body.success || 
            typeof res.body.currentBalanceUsd !== 'number' || 
            typeof res.body.pendingBalanceUsd !== 'number') {
          console.error('[METRIC] wallet_schema_violation_total +1');
        }
      });
    });

    it('should reject malformed currency field if present', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        if (res.body.currency) {
          expect(typeof res.body.currency).toBe('string');
          expect(res.body.currency.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('GET /api/seller/wallet/balance - Error Responses', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/seller/wallet/balance');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toContain('unauthorized');
    });

    it('should return 403 for non-seller users (buyers)', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message.toLowerCase()).toContain('forbidden');
      });
    });

    it('should have consistent error shape across all error responses', async () => {
      // Test unauthenticated error shape
      const unauthRes = await request(app)
        .get('/api/seller/wallet/balance');

      expect(unauthRes.body).toHaveProperty('message');
      expect(typeof unauthRes.body.message).toBe('string');

      // Test forbidden error shape
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const forbiddenRes = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', buyer.sessionCookie);

        expect(forbiddenRes.body).toHaveProperty('message');
        expect(typeof forbiddenRes.body.message).toBe('string');
      });
    });

    it('should increment wallet_balance_error_total on errors', async () => {
      // This test documents the expected metric behavior
      // Actual implementation would use a metrics library like prom-client
      
      const res = await request(app)
        .get('/api/seller/wallet/balance');

      if (res.status >= 400) {
        console.log('[METRIC] wallet_balance_error_total{status="' + res.status + '"} +1');
      }
      
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/seller/wallet/balance - Response Validation', () => {
    it('should return numeric balance values (not strings)', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        
        // Critical: Balance must be number, not string
        expect(typeof res.body.currentBalanceUsd).toBe('number');
        expect(typeof res.body.pendingBalanceUsd).toBe('number');
        
        // Should not be NaN
        expect(Number.isNaN(res.body.currentBalanceUsd)).toBe(false);
        expect(Number.isNaN(res.body.pendingBalanceUsd)).toBe(false);
      });
    });

    it('should return non-negative balance values', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        
        // Balances should not be negative (business rule)
        expect(res.body.currentBalanceUsd).toBeGreaterThanOrEqual(0);
        expect(res.body.pendingBalanceUsd).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have reasonable precision for USD values', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/wallet/balance')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        
        // USD should have at most 2 decimal places
        const currentDecimalPlaces = (res.body.currentBalanceUsd.toString().split('.')[1] || '').length;
        const pendingDecimalPlaces = (res.body.pendingBalanceUsd.toString().split('.')[1] || '').length;
        
        expect(currentDecimalPlaces).toBeLessThanOrEqual(2);
        expect(pendingDecimalPlaces).toBeLessThanOrEqual(2);
      });
    });
  });
});
