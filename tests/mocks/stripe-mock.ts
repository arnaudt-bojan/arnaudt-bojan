import nock from 'nock';

export const STRIPE_FIXTURES = {
  customer: {
    id: 'cus_test123',
    email: 'buyer@example.com',
    name: 'Test Buyer'
  },
  paymentIntent: {
    id: 'pi_test123',
    amount: 9999,
    currency: 'usd',
    status: 'succeeded',
    customer: 'cus_test123',
    client_secret: 'pi_test123_secret',
    metadata: {}
  },
  charge: {
    id: 'ch_test123',
    amount: 9999,
    paid: true,
    refunded: false,
    currency: 'usd'
  },
  refund: {
    id: 're_test123',
    amount: 9999,
    status: 'succeeded',
    created: Math.floor(Date.now() / 1000)
  }
};

export function mockStripeAPI() {
  nock('https://api.stripe.com')
    .post('/v1/customers')
    .reply(200, STRIPE_FIXTURES.customer);

  nock('https://api.stripe.com')
    .post('/v1/payment_intents')
    .reply(200, STRIPE_FIXTURES.paymentIntent);

  nock('https://api.stripe.com')
    .post(/\/v1\/payment_intents\/.*\/confirm/)
    .reply(200, { ...STRIPE_FIXTURES.paymentIntent, status: 'succeeded' });

  nock('https://api.stripe.com')
    .post(/\/v1\/payment_intents\/.*\/cancel/)
    .reply(200, { ...STRIPE_FIXTURES.paymentIntent, status: 'canceled' });

  nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(200, STRIPE_FIXTURES.charge);

  nock('https://api.stripe.com')
    .post('/v1/refunds')
    .reply(200, STRIPE_FIXTURES.refund);
}

export function clearStripeMocks() {
  nock.cleanAll();
}
