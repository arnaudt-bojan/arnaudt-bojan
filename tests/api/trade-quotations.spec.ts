import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getTestApp } from '../setup/test-app.js';
import { createSellerSession } from '../setup/auth-helpers.js';
import { createFixtures } from '../setup/fixtures.js';
import { prisma } from '../../server/prisma.js';
import type { Prisma } from '../../generated/prisma/index.js';

describe('Trade Quotation System @api @integration @trade', () => {
  let app: Express;
  let fixtures: ReturnType<typeof createFixtures>;
  let sellerAuth: Awaited<ReturnType<typeof createSellerSession>>;
  let sellerId: string;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(async () => {
    fixtures = createFixtures(prisma);
    
    sellerAuth = await createSellerSession(app, prisma);
    const { user: seller } = await fixtures.createSeller();
    sellerId = seller.id;
  });

  afterEach(async () => {
    // Cleanup is handled by test isolation
  });

  it('should create new trade quotation', async () => {
    const quoteRes = await request(app)
      .post('/api/trade/quotations')
      .set('Cookie', sellerAuth.sessionCookie)
      .send({
        buyer_email: 'buyer@example.com',
        buyer_company: 'Acme Corp',
        currency: 'USD',
        payment_terms: 'NET30',
        incoterms: 'FOB',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Bulk order discount applied',
        items: [
          {
            description: 'Widget A',
            quantity: 1000,
            unit_price: 5.50,
          },
        ],
      })
      .expect(200);

    expect(quoteRes.body.quotation).toBeDefined();
    expect(quoteRes.body.quotation.quotation_number).toBeDefined();
    expect(quoteRes.body.quotation.status).toBe('draft');
    expect(quoteRes.body.quotation.buyer_email).toBe('buyer@example.com');
  });

  it('should send quotation to buyer via email', async () => {
    // Create quotation
    const quotation = await fixtures.createTradeQuotation(sellerId, 'buyer@example.com', {
      status: 'draft',
      total: '5500.00',
    });

    // Create line items
    await fixtures.createQuotationLineItem(quotation.id, {
      description: 'Widget A',
      quantity: 1000,
      unit_price: '5.50',
      total_price: '5500.00',
    });

    // Send quotation
    const sendRes = await request(app)
      .post(`/api/trade/quotations/${quotation.id}/send`)
      .set('Cookie', sellerAuth.sessionCookie)
      .expect(200);

    expect(sendRes.body.quotation.status).toBe('sent');
    expect(sendRes.body.quotation.sent_at).toBeDefined();
  });

  it('should allow buyer to view quotation via secure token', async () => {
    // Create quotation
    const quotation = await fixtures.createTradeQuotation(sellerId, 'buyer@example.com', {
      status: 'sent',
      total: '5500.00',
    });

    // View quotation without authentication
    const viewRes = await request(app)
      .get(`/api/trade/quotations/view/test-token-123`)
      .expect(200);

    expect(viewRes.body.quotation).toBeDefined();
    expect(viewRes.body.quotation.id).toBe(quotation.id);
    expect(viewRes.body.quotation.buyer_email).toBe('buyer@example.com');
  });

  it('should handle quotation acceptance', async () => {
    const quotation = await fixtures.createTradeQuotation(sellerId, 'buyer@example.com', {
      status: 'sent',
      total: '10000.00',
    });

    // Accept quotation
    const acceptRes = await request(app)
      .post(`/api/trade/quotations/${quotation.id}/accept`)
      .send({
        token: 'accept-token-123',
        buyer_name: 'John Doe',
        buyer_company: 'Acme Corp',
      })
      .expect(200);

    expect(acceptRes.body.quotation.status).toBe('accepted');
    expect(acceptRes.body.quotation.accepted_at).toBeDefined();
  });

  it('should calculate deposit and balance amounts correctly', async () => {
    const quoteRes = await request(app)
      .post('/api/trade/quotations')
      .set('Cookie', sellerAuth.sessionCookie)
      .send({
        buyer_email: 'buyer@example.com',
        currency: 'USD',
        payment_terms: 'deposit_balance',
        deposit_percentage: 30,
        items: [
          {
            description: 'Widget A',
            quantity: 1000,
            unit_price: 10.00,
          },
        ],
      })
      .expect(200);

    const quotation = quoteRes.body.quotation;
    
    // Total: 1000 * $10 = $10,000
    // Deposit (30%): $3,000
    // Balance: $7,000
    expect(parseFloat(quotation.total)).toBe(10000.00);
    expect(parseFloat(quotation.deposit_amount || '0')).toBe(3000.00);
    expect(parseFloat(quotation.balance_amount || '0')).toBe(7000.00);
  });

  it('should list all quotations for seller', async () => {
    // Create multiple quotations
    await fixtures.createTradeQuotation(sellerId, 'buyer1@example.com', {
      status: 'draft',
    });
    await fixtures.createTradeQuotation(sellerId, 'buyer2@example.com', {
      status: 'sent',
    });
    await fixtures.createTradeQuotation(sellerId, 'buyer3@example.com', {
      status: 'accepted',
    });

    const listRes = await request(app)
      .get('/api/trade/quotations')
      .set('Cookie', sellerAuth.sessionCookie)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(3);
  });

  it('should support quotation updates before sending', async () => {
    const quotation = await fixtures.createTradeQuotation(sellerId, 'buyer@example.com', {
      status: 'draft',
      total: '5000.00',
    });

    // Update quotation
    const updateRes = await request(app)
      .put(`/api/trade/quotations/${quotation.id}`)
      .set('Cookie', sellerAuth.sessionCookie)
      .send({
        notes: 'Updated notes',
        payment_terms: 'NET60',
      })
      .expect(200);

    expect(updateRes.body.quotation.notes).toBe('Updated notes');
    expect(updateRes.body.quotation.payment_terms).toBe('NET60');
  });

  it('should prevent updates to sent/accepted quotations', async () => {
    const quotation = await fixtures.createTradeQuotation(sellerId, 'buyer@example.com', {
      status: 'accepted',
      total: '5000.00',
    });

    // Try to update - should fail
    const updateRes = await request(app)
      .put(`/api/trade/quotations/${quotation.id}`)
      .set('Cookie', sellerAuth.sessionCookie)
      .send({
        notes: 'Updated notes',
      })
      .expect(400);

    expect(updateRes.body.error).toBeDefined();
  });

  it('should handle quotation expiration', async () => {
    // Create quotation with past expiration date
    const expiredQuotation = await fixtures.createTradeQuotation(sellerId, 'buyer@example.com', {
      status: 'sent',
      valid_until: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      total: '5000.00',
    });

    // Try to accept expired quotation
    const acceptRes = await request(app)
      .post(`/api/trade/quotations/${expiredQuotation.id}/accept`)
      .send({
        token: 'expired-token',
        buyer_name: 'John Doe',
      })
      .expect(400);

    expect(acceptRes.body.error).toBeDefined();
  });

  it('should support multiple currencies', async () => {
    const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

    for (const currency of currencies) {
      const quoteRes = await request(app)
        .post('/api/trade/quotations')
        .set('Cookie', sellerAuth.sessionCookie)
        .send({
          buyer_email: 'buyer@example.com',
          currency,
          items: [
            {
              description: 'Widget',
              quantity: 100,
              unit_price: 10.00,
            },
          ],
        })
        .expect(200);

      expect(quoteRes.body.quotation.currency).toBe(currency);
    }
  });
});
