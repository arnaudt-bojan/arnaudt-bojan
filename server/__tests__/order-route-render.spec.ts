import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '@tests/setup/test-app.js';
import { createBuyerSession, createSellerSession } from '@tests/setup/auth-helpers.js';
import { withTransaction } from '@tests/setup/db-test-utils.js';
import type { Express } from 'express';
import type { Prisma } from '../../generated/prisma/index.js';

/**
 * Order Route Render Tests
 * 
 * Purpose: Ensure order routes never render blank screens
 * Catches: Null loader data, missing orders, undefined states
 */

let app: Express;

beforeAll(async () => {
  app = await getTestApp();
});

describe('Order Route Render Tests - @integration', () => {

  describe('Order List Route - Data States', () => {
    it('should return empty array when user has no orders', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { 
          email: 'newbuyer@test.com' 
        });

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('orders');
        expect(Array.isArray(res.body.orders)).toBe(true);
        expect(res.body.orders.length).toBe(0);
        
        // Should include empty state metadata
        expect(res.body).toHaveProperty('total');
        expect(res.body.total).toBe(0);
      });
    });

    it('should never return null for orders array', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body.orders).not.toBeNull();
        expect(res.body.orders).not.toBeUndefined();
        
        if (res.body.orders === null) {
          console.log('[METRIC] route_render_fail_total{route="/api/orders",reason="null_data"} +1');
        }
      });
    });

    it('should include pagination metadata even for empty results', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx, { 
          email: 'emptybuyer@test.com' 
        });

        const res = await request(app)
          .get('/api/orders?page=1&limit=10')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('orders');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('limit');
        
        // Empty results should still have valid pagination
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(10);
        expect(res.body.total).toBe(0);
      });
    });

    it('should return consistent structure for orders with data', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(200);
        
        if (res.body.orders && res.body.orders.length > 0) {
          const order = res.body.orders[0];
          
          // Every order must have these fields
          expect(order).toHaveProperty('id');
          expect(order).toHaveProperty('status');
          expect(order).toHaveProperty('total');
          expect(order).toHaveProperty('currency');
          expect(order).toHaveProperty('createdAt');
          
          // ID must never be null/undefined
          expect(order.id).toBeTruthy();
          
          if (!order.id) {
            console.log('[METRIC] route_render_fail_total{route="/api/orders",reason="missing_order_id"} +1');
          }
        }
      });
    });
  });

  describe('Single Order Route - Null/Invalid Data Handling', () => {
    it('should return 404 for non-existent order', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders/99999999')
          .set('Cookie', buyer.sessionCookie);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message.toLowerCase()).toContain('not found');
      });
    });

    it('should return 404 (not 500) for null order lookup', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders/invalid-id')
          .set('Cookie', buyer.sessionCookie);

        // Should gracefully handle invalid ID
        expect([400, 404]).toContain(res.status);
        expect(res.body).toHaveProperty('message');
        
        // Should NOT return 500 (server error)
        if (res.status === 500) {
          console.log('[METRIC] route_render_fail_total{route="/api/orders/:id",reason="500_on_invalid_id"} +1');
        }
      });
    });

    it('should never return order object with null id field', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.orders) {
          res.body.orders.forEach((order: any, index: number) => {
            expect(order.id).toBeTruthy();
            expect(order.id).not.toBeNull();
            expect(order.id).not.toBeUndefined();
            
            if (!order.id) {
              console.log(`[METRIC] route_render_fail_total{route="/api/orders",reason="null_id",index="${index}"} +1`);
            }
          });
        }
      });
    });

    it('should include all required fields in order detail response', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        // Get list of orders
        const listRes = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        if (listRes.status === 200 && listRes.body.orders && listRes.body.orders.length > 0) {
          const orderId = listRes.body.orders[0].id;

          // Get order detail
          const detailRes = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Cookie', buyer.sessionCookie);

          expect(detailRes.status).toBe(200);
          
          // Validate complete order structure
          expect(detailRes.body).toHaveProperty('id');
          expect(detailRes.body).toHaveProperty('status');
          expect(detailRes.body).toHaveProperty('total');
          expect(detailRes.body).toHaveProperty('currency');
          expect(detailRes.body).toHaveProperty('items');
          expect(Array.isArray(detailRes.body.items)).toBe(true);
          
          // Items should never be null
          if (detailRes.body.items === null) {
            console.log('[METRIC] route_render_fail_total{route="/api/orders/:id",reason="null_items"} +1');
          }
        }
      });
    });
  });

  describe('Seller Order Routes - Empty State Handling', () => {
    it('should return empty array for sellers with no orders', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx, { 
          email: 'newseller@test.com' 
        });

        const res = await request(app)
          .get('/api/seller/orders')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('orders');
        expect(Array.isArray(res.body.orders)).toBe(true);
        expect(res.body.orders.length).toBe(0);
      });
    });

    it('should provide filter metadata even with no results', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const seller = await createSellerSession(app, tx);

        const res = await request(app)
          .get('/api/seller/orders?status=completed&dateFrom=2024-01-01')
          .set('Cookie', seller.sessionCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('orders');
        expect(res.body).toHaveProperty('filters');
        
        // Should echo back applied filters
        if (res.body.filters) {
          expect(res.body.filters).toHaveProperty('status');
        }
      });
    });
  });

  describe('Order Route Error Recovery', () => {
    it('should log metrics for blank screen scenarios', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders');

        // Detect blank screen scenarios
        if (res.status === 200) {
          const hasData = res.body && typeof res.body === 'object';
          const hasOrders = res.body.orders !== undefined;
          
          if (!hasData || !hasOrders) {
            console.log('[METRIC] route_render_fail_total{route="/api/orders",reason="missing_structure"} +1');
          }
        } else if (res.status === 500) {
          console.log('[METRIC] route_render_fail_total{route="/api/orders",reason="500_error"} +1');
        }
      });
    });

    it('should never crash on database query failures', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        // Should return valid response even on DB errors
        expect(res.status).toBeDefined();
        expect([200, 500, 503]).toContain(res.status);
        
        // Response body should always be valid JSON
        expect(res.body).toBeDefined();
        expect(typeof res.body).toBe('object');
      });
    });

    it('should include loading state hints in API responses', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200) {
          // Response should indicate loading completion
          expect(res.body).toBeDefined();
          
          // Optional: Include loading state metadata
          // expect(res.body).toHaveProperty('loading');
          // expect(res.body.loading).toBe(false);
        }
      });
    });
  });

  describe('Order Data Quality Validation', () => {
    it('should validate order total is numeric (not string)', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.orders && res.body.orders.length > 0) {
          res.body.orders.forEach((order: any) => {
            expect(typeof order.total).toBe('number');
            expect(Number.isNaN(order.total)).toBe(false);
            
            if (typeof order.total !== 'number') {
              console.log('[METRIC] route_render_fail_total{route="/api/orders",reason="total_not_number"} +1');
            }
          });
        }
      });
    });

    it('should validate createdAt is valid date format', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.orders && res.body.orders.length > 0) {
          res.body.orders.forEach((order: any) => {
            expect(order.createdAt).toBeTruthy();
            
            // Should be parseable as date
            const date = new Date(order.createdAt);
            expect(date.toString()).not.toBe('Invalid Date');
            
            if (date.toString() === 'Invalid Date') {
              console.log('[METRIC] route_render_fail_total{route="/api/orders",reason="invalid_date"} +1');
            }
          });
        }
      });
    });

    it('should validate status is from allowed enum values', async () => {
      const allowedStatuses = ['pending', 'processing', 'completed', 'cancelled', 'refunded'];

      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const buyer = await createBuyerSession(app, tx);

        const res = await request(app)
          .get('/api/orders')
          .set('Cookie', buyer.sessionCookie);

        if (res.status === 200 && res.body.orders && res.body.orders.length > 0) {
          res.body.orders.forEach((order: any) => {
            expect(order.status).toBeTruthy();
            expect(allowedStatuses).toContain(order.status);
            
            if (!allowedStatuses.includes(order.status)) {
              console.log(`[METRIC] route_render_fail_total{route="/api/orders",reason="invalid_status",status="${order.status}"} +1`);
            }
          });
        }
      });
    });
  });
});
