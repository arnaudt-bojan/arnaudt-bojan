import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from '../setup/db-test-utils';
import { createFixtures } from '../setup/fixtures';

describe('Payment Ledger @payments', () => {
  let fixtures: ReturnType<typeof createFixtures>;

  beforeEach(async () => {
    await testDb.reset();
    fixtures = createFixtures(testDb.prisma);
  });

  it('should track payment intent creation', async () => {
    const { seller } = await fixtures.createSeller();
    const checkoutSessionId = 'checkout_test_123';
    
    const paymentIntent = await testDb.prisma.payment_intents.create({
      data: {
        providerName: 'stripe',
        providerIntentId: 'pi_test_123',
        amount: 9999,
        currency: 'USD',
        status: 'succeeded',
        clientSecret: 'secret_123',
        metadata: JSON.stringify({ orderId: 'order_123', checkoutSessionId }),
        idempotencyKey: `intent_${checkoutSessionId}`
      }
    });

    expect(paymentIntent.providerName).toBe('stripe');
    expect(paymentIntent.amount).toBe(9999);
    expect(paymentIntent.idempotencyKey).toBe(`intent_${checkoutSessionId}`);
  });

  it('should prevent duplicate payment intents via idempotency key', async () => {
    const checkoutSessionId = 'checkout_test_123';
    const idempotencyKey = `intent_${checkoutSessionId}`;

    await testDb.prisma.payment_intents.create({
      data: {
        providerName: 'stripe',
        providerIntentId: 'pi_test_123',
        amount: 9999,
        currency: 'USD',
        status: 'succeeded',
        clientSecret: 'secret_123',
        metadata: JSON.stringify({ orderId: 'order_123' }),
        idempotencyKey
      }
    });

    const existing = await testDb.prisma.payment_intents.findUnique({
      where: { idempotencyKey }
    });

    expect(existing).toBeDefined();
    expect(existing?.providerIntentId).toBe('pi_test_123');

    await expect(
      testDb.prisma.payment_intents.create({
        data: {
          providerName: 'stripe',
          providerIntentId: 'pi_test_456',
          amount: 9999,
          currency: 'USD',
          status: 'succeeded',
          clientSecret: 'secret_456',
          metadata: JSON.stringify({ orderId: 'order_123' }),
          idempotencyKey
        }
      })
    ).rejects.toThrow();
  });

  it('should track refunds in database', async () => {
    const { order } = await fixtures.createFullOrder();

    const refund = await testDb.prisma.refunds.create({
      data: {
        orderId: order.id,
        totalAmount: '99.99',
        currency: 'USD',
        reason: 'requested_by_customer',
        status: 'succeeded',
        stripeRefundId: 're_test_123',
        processedBy: 'system'
      }
    });

    expect(refund.orderId).toBe(order.id);
    expect(refund.totalAmount).toBe('99.99');
    expect(refund.status).toBe('succeeded');
  });

  it('should track partial refunds correctly', async () => {
    const { order } = await fixtures.createFullOrder();

    const refund1 = await testDb.prisma.refunds.create({
      data: {
        orderId: order.id,
        totalAmount: '50.00',
        currency: 'USD',
        reason: 'requested_by_customer',
        status: 'succeeded',
        stripeRefundId: 're_test_1',
        processedBy: 'system'
      }
    });

    const refund2 = await testDb.prisma.refunds.create({
      data: {
        orderId: order.id,
        totalAmount: '49.99',
        currency: 'USD',
        reason: 'requested_by_customer',
        status: 'succeeded',
        stripeRefundId: 're_test_2',
        processedBy: 'system'
      }
    });

    const allRefunds = await testDb.prisma.refunds.findMany({
      where: { orderId: order.id }
    });

    const totalRefunded = allRefunds.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
    expect(allRefunds).toHaveLength(2);
    expect(totalRefunded).toBe(99.99);
  });
});
