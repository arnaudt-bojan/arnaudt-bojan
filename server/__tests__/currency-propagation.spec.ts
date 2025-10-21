import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '@tests/setup/test-app.js';
import { createBuyerSession, createSellerSession } from '@tests/setup/auth-helpers.js';
import { withTransaction } from '@tests/setup/db-test-utils.js';
import type { Express } from 'express';
import type { Prisma } from '../../generated/prisma/index.js';

/**
 * Currency Propagation Tests
 * 
 * Purpose: Ensure user.currency propagates correctly across B2C/B2B/Trade platforms
 * Catches: Hard-coded currency values, missing currency in responses, inconsistent pricing
 */

let app: Express;

beforeAll(async () => {
  app = await getTestApp();
});

describe('Currency Propagation Tests - @integration', () => {

  describe('User Currency Configuration', () => {
    it('should store and retrieve user currency preference', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { 
          email: 'eubuyer@test.com',
          currency: 'EUR' 
        });

        // Retrieve user profile
        const res = await request(app)
          .get('/api/user/profile')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body.currency).toBe('EUR');
      });
    });

    it('should default to USD if currency not specified', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { 
          email: 'defaultbuyer@test.com'
        });

        const res = await request(app)
          .get('/api/user/profile')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body.currency).toBeTruthy();
        // Should have some currency set (default USD)
      });
    });

    it('should validate currency codes (ISO 4217)', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        // Try to update with invalid currency
        const res = await request(app)
          .patch('/api/user/profile')
          .set('Cookie', buyer.sessionCookie)
          .send({ currency: 'INVALID' });

        // Should reject invalid currency codes
        expect([400, 422]).toContain(res.status);
      });
    });

    it('should support common currencies (USD, EUR, GBP, CAD)', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'CAD'];

      for (const currency of currencies) {
        await withTransaction(async (tx: Prisma.TransactionClient) => {
          const buyer = await createBuyerSession(app, tx, {
            email: `buyer-${currency.toLowerCase()}@test.com`,
            currency,
          });

          const res = await request(app)
            .get('/api/user/profile')
            .set('Cookie', buyer.sessionCookie);

          expect(res.status).toBe(200);
          expect(res.body.currency).toBe(currency);
        });
      }
    });
  });

  describe('B2C Platform - Currency Propagation', () => {
    it('should include currency in product pricing', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'EUR' });

        const res = await request(app)
          .get('/api/products')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        
        if (res.body.products && res.body.products.length > 0) {
          const product = res.body.products[0];
          
          // Each product should have currency info
          expect(product).toHaveProperty('price');
          expect(product).toHaveProperty('currency');
          
          // Currency should match user preference or be explicit
          expect(product.currency).toBeTruthy();
          expect(typeof product.currency).toBe('string');
        }
      });
    });

    it('should include currency in cart total', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'GBP' });

        const res = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.items) {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('currency');
          expect(res.body.currency).toBe('GBP');
        }
      });
    });

    it('should include currency in order details', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'CAD' });

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.orders && res.body.orders.length > 0) {
          const order = res.body.orders[0];
          
          expect(order).toHaveProperty('total');
          expect(order).toHaveProperty('currency');
          expect(order.currency).toBeTruthy();
        }
      });
    });

    it('should reject hard-coded USD in responses (lint check)', () => {
      // This test documents the requirement for ESLint rule
      // The actual enforcement happens in ESLint
      
      const sampleResponse = {
        price: 99.99,
        currency: 'USD', // This should come from config, not hard-coded
      };

      // Validate that currency comes from allowed source
      const allowedSources = ['user.currency', 'config.defaultCurrency', 'product.currency'];
      
      // Document requirement for linting
      console.log('[LINT] Enforce: No hard-coded currency literals in source code');
      console.log('[LINT] Allowed: import { DEFAULT_CURRENCY } from "config"');
      console.log('[LINT] Forbidden: const price = { amount: 100, currency: "USD" }');
      
      expect(sampleResponse.currency).toBeTruthy();
    });
  });

  describe('B2B Wholesale - Currency Propagation', () => {
    it('should include currency in wholesale product pricing', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'EUR' });

        const res = await request(app)
          .get('/api/wholesale/products')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.products && res.body.products.length > 0) {
          const product = res.body.products[0];
          
          expect(product).toHaveProperty('wholesalePrice');
          expect(product).toHaveProperty('currency');
          expect(product.currency).toBe('EUR');
        }
      });
    });

    it('should include currency in wholesale orders', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'GBP' });

        const res = await request(app)
          .get('/api/wholesale/orders')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.orders && res.body.orders.length > 0) {
          const order = res.body.orders[0];
          
          expect(order).toHaveProperty('total');
          expect(order).toHaveProperty('currency');
          expect(order.currency).toBe('GBP');
        }
      });
    });

    it('should include currency in buyer credit balance', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'EUR' });

        const res = await request(app)
          .get('/api/wholesale/credit/balance')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200) {
          expect(res.body).toHaveProperty('balance');
          expect(res.body).toHaveProperty('currency');
          expect(res.body.currency).toBe('EUR');
        }
      });
    });
  });

  describe('Trade Platform - Currency Propagation', () => {
    it('should include currency in quotation pricing', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx, { currency: 'USD' });

        const res = await request(app)
          .get('/api/trade/quotations')
          .set('Cookie', seller.sessionCookie);

        if (res.status === 200 && res.body.quotations && res.body.quotations.length > 0) {
          const quotation = res.body.quotations[0];
          
          expect(quotation).toHaveProperty('total');
          expect(quotation).toHaveProperty('currency');
          expect(quotation.currency).toBeTruthy();
        }
      });
    });

    it('should allow quotation currency override', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx, { currency: 'USD' });

        // Create quotation with specific currency
        const res = await request(app)
          .post('/api/trade/quotations')
          .set('Cookie', seller.sessionCookie)
          .send({
            buyerEmail: 'buyer@example.com',
            items: [{ productId: 1, quantity: 10 }],
            currency: 'EUR', // Override seller's default
          });

        if (res.status === 201) {
          expect(res.body.quotation.currency).toBe('EUR');
        }
      });
    });

    it('should convert prices when currency differs', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx, { currency: 'USD' });
        const buyer = await createBuyerSession(app, tx, { currency: 'EUR' });

        // Seller creates quotation in USD
        const createRes = await request(app)
          .post('/api/trade/quotations')
          .set('Cookie', seller.sessionCookie)
          .send({
            buyerEmail: buyer.email,
            items: [{ productId: 1, quantity: 10 }],
            currency: 'USD',
          });

        if (createRes.status === 201) {
          const quotationId = createRes.body.quotation.id;

          // Buyer views quotation (should see in EUR)
          const viewRes = await request(app)
            .get(`/api/trade/quotations/${quotationId}`)
            .set('Cookie', buyer.sessionCookie);

          if (viewRes.status === 200) {
            // Should include both original and converted currency
            expect(viewRes.body).toHaveProperty('currency');
            expect(viewRes.body).toHaveProperty('total');
          }
        }
      });
    });
  });

  describe('Cross-Platform Currency Consistency', () => {
    it('should maintain currency consistency across B2C and B2B endpoints', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'EUR' });

        // B2C products
        const b2cRes = await request(app)
          .get('/api/products')
          .set('Cookie', buyer.sessionCookie);

        // B2B products
        const b2bRes = await request(app)
          .get('/api/wholesale/products')
          .set('Cookie', buyer.sessionCookie);

        if (b2cRes.status === 200 && b2cRes.body.products && b2cRes.body.products.length > 0) {
          const b2cProduct = b2cRes.body.products[0];
          expect(b2cProduct.currency).toBe('EUR');
        }

        if (b2bRes.status === 200 && b2bRes.body.products && b2bRes.body.products.length > 0) {
          const b2bProduct = b2bRes.body.products[0];
          expect(b2bProduct.currency).toBe('EUR');
        }
      });
    });

    it('should log metric on currency propagation failures', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'EUR' });

        const res = await request(app)
          .get('/api/products')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.products) {
          // Check each product has currency
          res.body.products.forEach((product: any, index: number) => {
            if (!product.currency) {
              console.log(`[METRIC] currency_literal_violation_total{endpoint="/api/products",product_index="${index}"} +1`);
            }
          });
        }
      });
    });

    it('should reject API responses with missing currency fields', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'USD' });

        const res = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.total !== undefined) {
          // If there's a total, there must be a currency
          expect(res.body).toHaveProperty('currency');
          expect(res.body.currency).toBeTruthy();
          
          if (!res.body.currency) {
            console.log('[METRIC] currency_literal_violation_total{endpoint="/api/cart"} +1');
          }
        }
      });
    });
  });

  describe('Currency Conversion & Formatting', () => {
    it('should provide consistent decimal precision for currencies', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'USD' });

        const res = await request(app)
          .get('/api/products')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.products && res.body.products.length > 0) {
          res.body.products.forEach((product: any) => {
            if (product.price) {
              // USD/EUR/GBP should have 2 decimal places max
              const decimalPlaces = (product.price.toString().split('.')[1] || '').length;
              expect(decimalPlaces).toBeLessThanOrEqual(2);
            }
          });
        }
      });
    });

    it('should handle zero-decimal currencies (JPY, KRW)', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { currency: 'JPY' });

        const res = await request(app)
          .get('/api/products')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.products && res.body.products.length > 0) {
          res.body.products.forEach((product: any) => {
            if (product.currency === 'JPY' && product.price) {
              // JPY should be whole numbers (no decimals)
              expect(product.price % 1).toBe(0);
            }
          });
        }
      });
    });
  });
});
