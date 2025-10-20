import { describe, it, expect, beforeEach } from 'vitest';
import { withTransaction, createTestPrisma } from '@tests/setup/db-test-utils';
import { createFixtures } from '@tests/setup/fixtures';
import {
  createBuyerSession,
  createSellerSession,
  createAdminSession,
  type AuthContext,
} from '@tests/setup/auth-helpers';
import type { Prisma } from '../../generated/prisma/index.js';
import request from 'supertest';
import type { Express } from 'express';

let app: Express;

beforeEach(async () => {
  const { default: createApp } = await import('../index.js');
  app = await createApp();
});

describe('Auth Matrix Tests - @integration', () => {
  describe('B2C Platform - /api/products', () => {
    it('buyer can access product list', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: seller } = await fixtures.createSeller();
        await fixtures.createProduct(seller.id);

        const res = await request(app)
          .get('/api/products')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    it('seller can access product list', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);
        const fixtures = createFixtures(tx);
        await fixtures.createProduct(seller.userId);

        const res = await request(app)
          .get('/api/products')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    it('unauthenticated user can access public product list', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        const { user: seller } = await fixtures.createSeller();
        await fixtures.createProduct(seller.id);

        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    it('buyer cannot create products', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .post('/api/products')
          .set('Cookie', buyer.sessionCookie)
          .send({
            name: 'Test Product',
            price: '99.99',
            category: 'Test',
          });

        expect(res.status).toBe(403);
      });
    });

    it('seller can create products', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .post('/api/products')
          .set('Cookie', seller.sessionCookie)
          .send({
            name: 'Test Product',
            price: '99.99',
            category: 'Test',
            description: 'Test description',
          });

        expect(res.status).toBe(201);
        expect(res.body.product).toBeDefined();
        expect(res.body.product.name).toBe('Test Product');
      });
    });

    it('unauthenticated user cannot create products', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          name: 'Test Product',
          price: '99.99',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('B2C Platform - /api/cart', () => {
    it('buyer can access their cart', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body.items).toBeDefined();
      });
    });

    it('seller cannot access buyer cart', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/cart')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(403);
      });
    });

    it('buyer can add items to cart', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: seller } = await fixtures.createSeller();
        const product = await fixtures.createProduct(seller.id);

        const res = await request(app)
          .post('/api/cart')
          .set('Cookie', buyer.sessionCookie)
          .send({
            productId: product.id,
            quantity: 2,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    it('seller cannot add items to cart', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);
        const fixtures = createFixtures(tx);
        const product = await fixtures.createProduct(seller.userId);

        const res = await request(app)
          .post('/api/cart')
          .set('Cookie', seller.sessionCookie)
          .send({
            productId: product.id,
            quantity: 1,
          });

        expect(res.status).toBe(403);
      });
    });

    it('unauthenticated user cannot access cart', async () => {
      const res = await request(app).get('/api/cart');

      expect(res.status).toBe(401);
    });
  });

  describe('B2C Platform - /api/orders', () => {
    it('buyer can view their orders', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: seller } = await fixtures.createSeller();
        await fixtures.createOrder(buyer.email, seller.id);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.orders)).toBe(true);
      });
    });

    it('seller can view store orders', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: buyer } = await fixtures.createBuyer();
        await fixtures.createOrder(buyer.email, seller.userId);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.orders)).toBe(true);
      });
    });

    it('buyer cannot view other buyer orders', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer1 = await createBuyerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: buyer2 } = await fixtures.createBuyer();
        const { user: seller } = await fixtures.createSeller();
        const order = await fixtures.createOrder(buyer2.email, seller.id);

        const res = await request(app)
          .get(`/api/orders/${order.id}`)
          .set('Cookie', buyer1.sessionCookie);

        expect(res.status).toBe(403);
      });
    });
  });

  describe('B2B Wholesale - /api/wholesale/products', () => {
    it('buyer with wholesale access can view wholesale products', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: seller } = await fixtures.createSeller();
        await fixtures.createWholesaleAccessGrant(seller.id, buyer.userId);
        await fixtures.createWholesaleProduct(seller.id);

        const res = await request(app)
          .get('/api/wholesale/products')
          .query({ sellerId: seller.id })
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.products)).toBe(true);
      });
    });

    it('buyer without wholesale access cannot view wholesale products', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: seller } = await fixtures.createSeller();
        await fixtures.createWholesaleProduct(seller.id);

        const res = await request(app)
          .get('/api/wholesale/products')
          .query({ sellerId: seller.id })
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(403);
      });
    });

    it('seller can view their wholesale products', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);
        const fixtures = createFixtures(tx);
        await fixtures.createWholesaleProduct(seller.userId);

        const res = await request(app)
          .get('/api/wholesale/products')
          .query({ sellerId: seller.userId })
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.products)).toBe(true);
      });
    });

    it('seller cannot create wholesale orders', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);
        const fixtures = createFixtures(tx);
        const wholesaleProduct = await fixtures.createWholesaleProduct(seller.userId);

        const res = await request(app)
          .post('/api/wholesale/cart')
          .set('Cookie', seller.sessionCookie)
          .send({
            wholesaleProductId: wholesaleProduct.id,
            quantity: 10,
            sellerId: seller.userId,
          });

        expect(res.status).toBe(403);
      });
    });
  });

  describe('B2B Wholesale - /api/wholesale/orders', () => {
    it('buyer can view their wholesale orders', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/wholesale/orders')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.orders)).toBe(true);
      });
    });

    it('seller can view wholesale orders for their store', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/wholesale/orders')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.orders)).toBe(true);
      });
    });
  });

  describe('Trade Platform - /api/trade/quotations', () => {
    it('seller can create quotations', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .post('/api/trade/quotations')
          .set('Cookie', seller.sessionCookie)
          .send({
            buyerEmail: 'buyer@example.com',
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            lineItems: [
              {
                description: 'Custom Product',
                quantity: 100,
                unitPrice: '50.00',
              },
            ],
          });

        expect(res.status).toBe(201);
        expect(res.body.quotation).toBeDefined();
      });
    });

    it('buyer cannot create quotations', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .post('/api/trade/quotations')
          .set('Cookie', buyer.sessionCookie)
          .send({
            buyerEmail: 'test@example.com',
            lineItems: [],
          });

        expect(res.status).toBe(403);
      });
    });

    it('seller can view their quotations', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);
        const fixtures = createFixtures(tx);
        await fixtures.createTradeQuotation(seller.userId, 'buyer@example.com');

        const res = await request(app)
          .get('/api/trade/quotations')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.quotations)).toBe(true);
      });
    });

    it('buyer cannot view seller quotations list', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/trade/quotations')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(403);
      });
    });

    it('seller can send quotation to buyer', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);
        const fixtures = createFixtures(tx);
        const quotation = await fixtures.createTradeQuotation(
          seller.userId,
          'buyer@example.com'
        );

        const res = await request(app)
          .post(`/api/trade/quotations/${quotation.id}/send`)
          .set('Cookie', seller.sessionCookie);

        expect([200, 201]).toContain(res.status);
      });
    });

    it('buyer cannot send quotations', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: seller } = await fixtures.createSeller();
        const quotation = await fixtures.createTradeQuotation(seller.id, buyer.email);

        const res = await request(app)
          .post(`/api/trade/quotations/${quotation.id}/send`)
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Cross-Platform Auth Isolation', () => {
    it('buyer session works across B2C and B2B endpoints', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);
        const fixtures = createFixtures(tx);
        const { user: seller } = await fixtures.createSeller();
        await fixtures.createWholesaleAccessGrant(seller.id, buyer.userId);

        const b2cRes = await request(app)
          .get('/api/cart')
          .set('Cookie', buyer.sessionCookie);

        const b2bRes = await request(app)
          .get('/api/wholesale/products')
          .query({ sellerId: seller.id })
          .set('Cookie', buyer.sessionCookie);

        expect(b2cRes.status).toBe(200);
        expect(b2bRes.status).toBe(200);
      });
    });

    it('seller session works for B2C and Trade endpoints', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const b2cRes = await request(app)
          .get('/api/products')
          .set('Cookie', seller.sessionCookie);

        const tradeRes = await request(app)
          .get('/api/trade/quotations')
          .set('Cookie', seller.sessionCookie);

        expect(b2cRes.status).toBe(200);
        expect(tradeRes.status).toBe(200);
      });
    });
  });
});
