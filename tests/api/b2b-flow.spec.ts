import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getTestApp } from '../setup/test-app.js';
import { createBuyerSession, createSellerSession } from '../setup/auth-helpers.js';
import { createFixtures } from '../setup/fixtures.js';
import { prisma } from '../../server/prisma.js';
import type { Prisma } from '../../generated/prisma/index.js';

describe('B2B Wholesale Flow @api @integration @b2b', () => {
  let app: Express;
  let fixtures: ReturnType<typeof createFixtures>;
  let buyerAuth: Awaited<ReturnType<typeof createBuyerSession>>;
  let sellerAuth: Awaited<ReturnType<typeof createSellerSession>>;
  let sellerId: string;
  let buyerId: string;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(async () => {
    fixtures = createFixtures(prisma);
    
    buyerAuth = await createBuyerSession(app, prisma);
    sellerAuth = await createSellerSession(app, prisma);
    
    const { user: seller } = await fixtures.createSeller();
    sellerId = seller.id;
    buyerId = buyerAuth.userId;
  });

  afterEach(async () => {
    // Cleanup is handled by test isolation
  });

  it('should complete B2B wholesale access request flow', async () => {
    // 1. Buyer requests wholesale access
    const accessRes = await request(app)
      .post('/api/wholesale/invitations/request-access')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        seller_id: sellerId,
        business_name: 'Acme Corp',
        business_type: 'retail',
      })
      .expect(200);

    expect(accessRes.body.success).toBe(true);
  });

  it('should allow seller to create wholesale products with MOQ', async () => {
    const productRes = await request(app)
      .post('/api/wholesale/products')
      .set('Cookie', sellerAuth.sessionCookie)
      .send({
        name: 'Wholesale Widget',
        rrp: 100.00,
        wholesale_price: 50.00,
        moq: 100,
        category: 'Test Category',
        description: 'Bulk product',
        stock: 1000,
      })
      .expect(200);

    expect(productRes.body.product).toBeDefined();
    expect(productRes.body.product.moq).toBe(100);
    expect(productRes.body.product.wholesale_price).toBe('50.00');
  });

  it('should enforce MOQ when adding to wholesale cart', async () => {
    // Grant access first
    await fixtures.createWholesaleAccessGrant(sellerId, buyerId, {
      status: 'active',
    });

    // Create wholesale product
    const product = await fixtures.createWholesaleProduct(sellerId, {
      wholesale_price: '50.00',
      moq: 100,
      stock: 1000,
    });

    // Try to add below MOQ - should fail
    const cartRes = await request(app)
      .post('/api/wholesale/cart/add')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        product_id: product.id,
        quantity: 50, // Below MOQ of 100
        seller_id: sellerId,
      })
      .expect(400);

    expect(cartRes.body.error).toBeDefined();
  });

  it('should allow wholesale order with valid MOQ and credit', async () => {
    // Grant access with payment terms
    await fixtures.createWholesaleAccessGrant(sellerId, buyerId, {
      status: 'active',
    });

    // Create wholesale product
    const product = await fixtures.createWholesaleProduct(sellerId, {
      wholesale_price: '50.00',
      moq: 100,
      stock: 1000,
    });

    // Add to cart with valid quantity
    const cartRes = await request(app)
      .post('/api/wholesale/cart/add')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        product_id: product.id,
        quantity: 100, // Meets MOQ
        seller_id: sellerId,
      })
      .expect(200);

    expect(cartRes.body.success).toBe(true);
  });

  it('should handle wholesale order checkout', async () => {
    // Set up access and product
    await fixtures.createWholesaleAccessGrant(sellerId, buyerId, {
      status: 'active',
    });

    const product = await fixtures.createWholesaleProduct(sellerId, {
      wholesale_price: '50.00',
      moq: 10,
      stock: 1000,
    });

    // Add to cart
    await request(app)
      .post('/api/wholesale/cart/add')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        product_id: product.id,
        quantity: 100,
        seller_id: sellerId,
      })
      .expect(200);

    // Checkout
    const checkoutRes = await request(app)
      .post('/api/wholesale/checkout')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        seller_id: sellerId,
        po_number: 'PO-2024-001',
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        },
      })
      .expect(200);

    expect(checkoutRes.body.order).toBeDefined();
  });

  it('should respect credit limits', async () => {
    // Grant access
    await fixtures.createWholesaleAccessGrant(sellerId, buyerId, {
      status: 'active',
    });

    // Create expensive product
    const product = await fixtures.createWholesaleProduct(sellerId, {
      wholesale_price: '100.00',
      moq: 10,
      stock: 1000,
    });

    // Try to add quantity that exceeds credit limit
    const cartRes = await request(app)
      .post('/api/wholesale/cart/add')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        product_id: product.id,
        quantity: 100, // 100 * $100 = $10,000 > $1,000 credit
        seller_id: sellerId,
      });

    // Should either fail at cart or at checkout
    if (cartRes.status === 200) {
      // If cart accepts it, checkout should reject
      const checkoutRes = await request(app)
        .post('/api/wholesale/checkout')
        .set('Cookie', buyerAuth.sessionCookie)
        .send({
          seller_id: sellerId,
          po_number: 'PO-2024-002',
          shipping_address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'US'
          },
        })
        .expect(400);

      expect(checkoutRes.body.error).toBeDefined();
    }
  });

  it('should allow viewing wholesale orders', async () => {
    const ordersRes = await request(app)
      .get('/api/wholesale/orders')
      .set('Cookie', buyerAuth.sessionCookie)
      .expect(200);

    expect(Array.isArray(ordersRes.body)).toBe(true);
  });
});
