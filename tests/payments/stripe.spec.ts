import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StripePaymentProvider } from '../../server/services/payment/stripe-provider';
import { mockStripeAPI, clearStripeMocks, STRIPE_FIXTURES } from '../mocks/stripe-mock';

describe('Stripe Payment Integration @payments', () => {
  let stripeProvider: StripePaymentProvider;

  beforeEach(() => {
    mockStripeAPI();
    stripeProvider = new StripePaymentProvider(
      process.env.STRIPE_SECRET_KEY || 'sk_test_mock',
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock'
    );
  });

  afterEach(() => {
    clearStripeMocks();
  });

  it('should create payment intent with correct amount', async () => {
    const intent = await stripeProvider.createPaymentIntent({
      amount: 99.99,
      currency: 'USD',
      metadata: { orderId: 'order_123' }
    });

    expect(intent.providerIntentId).toBe('pi_test123');
    expect(intent.amount).toBe(9999); // Amount in cents
    expect(intent.currency).toBe('USD');
    expect(intent.status).toBe('succeeded');
  });

  it('should handle zero-decimal currencies (JPY)', async () => {
    const intent = await stripeProvider.createPaymentIntent({
      amount: 1000,
      currency: 'JPY',
      metadata: {}
    });

    expect(intent.amount).toBe(1000); // No decimal conversion for JPY
    expect(intent.currency).toBe('JPY');
  });

  it('should handle three-decimal currencies (KWD)', async () => {
    const intent = await stripeProvider.createPaymentIntent({
      amount: 10.00,
      currency: 'KWD',
      metadata: {}
    });

    expect(intent.amount).toBe(10000); // 10.00 KWD = 10000 fils
  });

  it('should create refund successfully', async () => {
    const refund = await stripeProvider.createRefund({
      paymentIntentId: 'pi_test123',
      amount: 9999,
      reason: 'requested_by_customer',
      metadata: {}
    }, 'idempotency_key_123');

    expect(refund.id).toBe('re_test123');
    expect(refund.amount).toBe(9999);
    expect(refund.status).toBe('succeeded');
  });

  it('should convert amounts correctly between major and minor units', () => {
    expect(stripeProvider.toMinorUnits(99.99, 'USD')).toBe(9999);
    expect(stripeProvider.toMinorUnits(100, 'JPY')).toBe(100);
    expect(stripeProvider.toMinorUnits(10.99, 'KWD')).toBe(10990);

    expect(stripeProvider.toMajorUnits(9999, 'USD')).toBe(99.99);
    expect(stripeProvider.toMajorUnits(1000, 'JPY')).toBe(1000);
    expect(stripeProvider.toMajorUnits(10990, 'KWD')).toBe(10.99);
  });
});
