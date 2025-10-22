import nock from 'nock';

export const PAYPAL_FIXTURES = {
  order: {
    id: 'PAYPAL-ORDER-123',
    status: 'APPROVED',
    purchase_units: [{
      amount: { value: '99.99', currency_code: 'USD' }
    }]
  },
  capture: {
    id: 'CAPTURE-123',
    status: 'COMPLETED',
    amount: { value: '99.99', currency_code: 'USD' }
  }
};

export function mockPayPalAPI() {
  nock('https://api.paypal.com')
    .post('/v2/checkout/orders')
    .reply(200, PAYPAL_FIXTURES.order);

  nock('https://api.paypal.com')
    .post(/\/v2\/checkout\/orders\/.*\/capture/)
    .reply(200, PAYPAL_FIXTURES.capture);
}

export function clearPayPalMocks() {
  nock.cleanAll();
}
