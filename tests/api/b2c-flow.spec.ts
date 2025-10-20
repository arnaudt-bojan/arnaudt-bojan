import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index.js';
import { createAuthSession, createBuyerSession, createSellerSession } from '../setup/auth-helpers.js';
import { createFixtures } from '../setup/fixtures.js';
import { prisma } from '../../server/prisma.js';
import type { Prisma } from '../../generated/prisma/index.js';

describe('B2C Complete Flow @api @integration @b2c', () => {
  let fixtures: ReturnType<typeof createFixtures>;
  let buyerAuth: Awaited<ReturnType<typeof createBuyerSession>>;
  let sellerAuth: Awaited<ReturnType<typeof createSellerSession>>;
  let sellerId: string;
  let productId: string;

  beforeEach(async () => {
    fixtures = createFixtures(prisma);

    buyerAuth = await createBuyerSession(app, prisma);
    sellerAuth = await createSellerSession(app, prisma);
    
    const { user: seller } = await fixtures.createSeller();
    sellerId = seller.id;
    
    const product = await fixtures.createProduct(sellerId, {
      name: 'Test Product',
      price: '99.99',
      stock: 10,
      status: 'active',
    });
    productId = product.id;
  });

  afterEach(async () => {
    // Cleanup is handled by test isolation
  });

  it('should complete full B2C journey: browse → cart → checkout → order', async () => {
    // 1. Browse products - get product by sellerId
    const browseRes = await request(app)
      .get(`/api/s/${sellerAuth.email.split('@')[0]}/products`)
      .expect(200);

    expect(Array.isArray(browseRes.body)).toBe(true);

    // 2. Add to cart
    const cartRes = await request(app)
      .post('/api/cart/add')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        product_id: productId,
        quantity: 2,
        seller_id: sellerId,
      })
      .expect(200);

    expect(cartRes.body.success).toBe(true);

    // 3. Get cart
    const getCartRes = await request(app)
      .get('/api/cart')
      .set('Cookie', buyerAuth.sessionCookie)
      .expect(200);

    expect(getCartRes.body.cart).toBeDefined();
    expect(Array.isArray(getCartRes.body.cart.items)).toBe(true);

    // 4. Initiate checkout
    const checkoutRes = await request(app)
      .post('/api/checkout/initiate')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        seller_id: sellerId,
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        },
      })
      .expect(200);

    expect(checkoutRes.body.clientSecret).toBeDefined();
    expect(checkoutRes.body.order_id).toBeDefined();
    
    const orderId = checkoutRes.body.order_id;

    // 5. Verify order was created
    const orderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Cookie', buyerAuth.sessionCookie)
      .expect(200);

    expect(orderRes.body.order).toBeDefined();
    expect(orderRes.body.order.status).toBe('pending');
  });

  it('should allow seller to view and fulfill orders', async () => {
    // Create an order first
    const order = await fixtures.createOrder(buyerAuth.email, sellerId, {
      status: 'paid',
      total: '199.98',
      items: JSON.stringify([
        {
          product_id: productId,
          quantity: 2,
          price: '99.99',
        },
      ]),
    });

    // Seller views their orders
    const ordersRes = await request(app)
      .get('/api/seller/orders')
      .set('Cookie', sellerAuth.sessionCookie)
      .expect(200);

    expect(Array.isArray(ordersRes.body)).toBe(true);

    // Seller marks order as fulfilled
    const fulfillRes = await request(app)
      .post(`/api/orders/${order.id}/fulfill`)
      .set('Cookie', sellerAuth.sessionCookie)
      .send({
        tracking_number: 'TRACK-123',
        carrier: 'USPS',
      })
      .expect(200);

    expect(fulfillRes.body.order.status).toBe('fulfilled');
  });

  it('should handle cart updates and removal', async () => {
    // Add to cart
    await request(app)
      .post('/api/cart/add')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        product_id: productId,
        quantity: 2,
        seller_id: sellerId,
      })
      .expect(200);

    // Update cart item
    const updateRes = await request(app)
      .put(`/api/cart/update/${productId}`)
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        quantity: 5,
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);

    // Remove from cart
    const removeRes = await request(app)
      .delete(`/api/cart/remove/${productId}`)
      .set('Cookie', buyerAuth.sessionCookie)
      .send({ seller_id: sellerId })
      .expect(200);

    expect(removeRes.body.success).toBe(true);
  });

  it('should handle order refunds', async () => {
    // Create a paid order
    const order = await fixtures.createOrder(buyerAuth.email, sellerId, {
      status: 'paid',
      total: '99.99',
      stripe_payment_intent_id: 'pi_test_123',
    });

    // Request refund
    const refundRes = await request(app)
      .post(`/api/orders/${order.id}/refund`)
      .set('Cookie', sellerAuth.sessionCookie)
      .send({
        reason: 'requested_by_customer',
        items: [
          {
            product_id: productId,
            quantity: 1,
            amount: 99.99,
          },
        ],
      })
      .expect(200);

    expect(refundRes.body.refund).toBeDefined();
    expect(refundRes.body.refund.status).toBe('pending');
  });

  it('should handle inventory validation on checkout', async () => {
    // Create product with low stock
    const lowStockProduct = await fixtures.createProduct(sellerId, {
      name: 'Low Stock Product',
      price: '49.99',
      stock: 1,
      status: 'active',
    });

    // Add to cart
    await request(app)
      .post('/api/cart/add')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        product_id: lowStockProduct.id,
        quantity: 5,
        seller_id: sellerId,
      })
      .expect(200);

    // Try to checkout - should fail due to insufficient stock
    const checkoutRes = await request(app)
      .post('/api/checkout/initiate')
      .set('Cookie', buyerAuth.sessionCookie)
      .send({
        seller_id: sellerId,
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
  });
});
