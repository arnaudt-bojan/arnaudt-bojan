/**
 * E2E Test Seed Data
 * Deterministic fixtures for consistent test runs
 */

export const testUsers = {
  buyer: {
    email: 'e2e-buyer@test.com',
    password: 'Test123!',
    name: 'E2E Buyer'
  },
  seller: {
    email: 'e2e-seller@test.com',
    password: 'Test123!',
    name: 'E2E Seller',
    storeName: 'E2E Test Store'
  },
  admin: {
    email: 'e2e-admin@test.com',
    password: 'Test123!',
    name: 'E2E Admin'
  },
  wholesale: {
    email: 'e2e-wholesale@test.com',
    password: 'Test123!',
    name: 'E2E Wholesale Buyer'
  }
};

export const testProducts = [
  {
    id: 'test-product-1',
    name: 'Test Product 1',
    description: 'This is a test product for E2E tests',
    price: '29.99',
    stock: 100,
    sku: 'TEST-001',
    images: ['/images/placeholder.jpg']
  },
  {
    id: 'test-product-2',
    name: 'Test Product 2 (Limited Stock)',
    description: 'Test product with limited stock',
    price: '49.99',
    stock: 5,
    sku: 'TEST-002',
    images: ['/images/placeholder.jpg']
  },
  {
    id: 'test-product-3',
    name: 'Test Product 3 (Out of Stock)',
    description: 'Test product that is out of stock',
    price: '19.99',
    stock: 0,
    sku: 'TEST-003',
    images: ['/images/placeholder.jpg']
  }
];

export const testAddresses = {
  usAddress: {
    street: '123 Test Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US'
  },
  ukAddress: {
    street: '456 Test Road',
    city: 'London',
    state: '',
    postalCode: 'SW1A 1AA',
    country: 'GB'
  }
};

export const testPaymentMethods = {
  validCard: {
    cardNumber: '4242424242424242',
    expMonth: '12',
    expYear: '2030',
    cvc: '123',
    name: 'Test User'
  },
  declinedCard: {
    cardNumber: '4000000000000002',
    expMonth: '12',
    expYear: '2030',
    cvc: '123',
    name: 'Test User'
  }
};

/**
 * Seed test data via API
 * Faster than UI setup
 */
export async function seedViaAPI(baseUrl: string = 'http://localhost:5000') {
  // TODO: Implement API-based seeding
  console.log('Seeding test data via API...');
  
  // Example:
  // await fetch(`${baseUrl}/api/test/seed`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ users: testUsers, products: testProducts })
  // });
}
