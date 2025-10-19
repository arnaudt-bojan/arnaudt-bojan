/**
 * Checkout E2E Validation Test
 * 
 * Tests the complete checkout flow for Phase 1 deployment readiness
 * Validates that the 6 critical checkout crash fixes work in runtime
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_SELLER_USERNAME = 'testshop';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg });
    console.log(`❌ FAIL: ${name} - ${errorMsg}`);
  }
}

async function test1_StorefrontLoads() {
  const response = await fetch(`${BASE_URL}/s/${TEST_SELLER_USERNAME}`);
  
  if (!response.ok) {
    throw new Error(`Storefront returned ${response.status}: ${response.statusText}`);
  }
  
  const html = await response.text();
  
  // Verify basic HTML structure
  if (!html.includes('<!DOCTYPE html>') || !html.includes('<html')) {
    throw new Error('Invalid HTML response');
  }
  
  // Check for seller context in page
  if (!html.includes(TEST_SELLER_USERNAME)) {
    throw new Error('Seller username not found in page');
  }
  
  results[results.length - 1].details = {
    status: response.status,
    contentLength: html.length,
    hasSellerContext: true
  };
}

async function test2_ProductsVisibleOnStorefront() {
  // First, fetch seller info by username to get seller ID
  const sellerResponse = await fetch(`${BASE_URL}/api/sellers/${TEST_SELLER_USERNAME}`);
  
  if (!sellerResponse.ok) {
    throw new Error(`Seller API returned ${sellerResponse.status}: ${sellerResponse.statusText}`);
  }
  
  const seller = await sellerResponse.json();
  
  if (!seller.id) {
    throw new Error('Seller ID not found');
  }
  
  // Now fetch products by seller ID
  const response = await fetch(`${BASE_URL}/api/products/seller/${seller.id}`);
  
  if (!response.ok) {
    throw new Error(`Products API returned ${response.status}: ${response.statusText}`);
  }
  
  const products = await response.json();
  
  if (!Array.isArray(products)) {
    throw new Error('Products API did not return an array');
  }
  
  if (products.length === 0) {
    throw new Error('No products found for test seller');
  }
  
  // Verify products have required fields
  const hasRequiredFields = products.every(p => 
    p.id && p.name && p.price && p.sellerId && typeof p.stock === 'number'
  );
  
  if (!hasRequiredFields) {
    throw new Error('Products missing required fields');
  }
  
  // Verify at least one product has stock
  const productsWithStock = products.filter(p => p.stock > 0);
  if (productsWithStock.length === 0) {
    throw new Error('No products with available stock');
  }
  
  results[results.length - 1].details = {
    sellerId: seller.id,
    totalProducts: products.length,
    productsWithStock: productsWithStock.length,
    sampleProduct: products[0]
  };
}

async function test3_AddToCartWorks() {
  // First, get seller info
  const sellerResponse = await fetch(`${BASE_URL}/api/sellers/${TEST_SELLER_USERNAME}`);
  const seller = await sellerResponse.json();
  
  // Get products by seller ID
  const productsResponse = await fetch(`${BASE_URL}/api/products/seller/${seller.id}`);
  const products = await productsResponse.json();
  const productWithStock = products.find((p: any) => p.stock > 0);
  
  if (!productWithStock) {
    throw new Error('No product with stock available for testing');
  }
  
  // Create a new session by fetching cart (this initializes session)
  const initCartResponse = await fetch(`${BASE_URL}/api/cart`);
  const cookies = initCartResponse.headers.get('set-cookie');
  
  if (!cookies) {
    throw new Error('No session cookie received');
  }
  
  // Add product to cart
  const addToCartResponse = await fetch(`${BASE_URL}/api/cart/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      productId: productWithStock.id,
      quantity: 1
    })
  });
  
  if (!addToCartResponse.ok) {
    const errorData = await addToCartResponse.json();
    throw new Error(`Add to cart failed: ${errorData.error || addToCartResponse.statusText}`);
  }
  
  const cartData = await addToCartResponse.json();
  
  // Verify cart has items
  if (!cartData.items || cartData.items.length === 0) {
    throw new Error('Cart is empty after adding product');
  }
  
  // Verify sellerId is set
  if (!cartData.sellerId) {
    throw new Error('❌ CRITICAL: sellerId is NULL in cart - Phase 1 fix validation failed!');
  }
  
  // Verify sellerId matches test seller
  if (cartData.sellerId !== productWithStock.sellerId) {
    throw new Error(`sellerId mismatch: expected ${productWithStock.sellerId}, got ${cartData.sellerId}`);
  }
  
  results[results.length - 1].details = {
    productAdded: productWithStock.name,
    cartItemsCount: cartData.items.length,
    sellerId: cartData.sellerId,
    sellerIdPresent: !!cartData.sellerId
  };
}

async function test4_CheckoutInitiateWorks() {
  // Get seller info
  const sellerResponse = await fetch(`${BASE_URL}/api/sellers/${TEST_SELLER_USERNAME}`);
  const seller = await sellerResponse.json();
  
  // Get products by seller ID
  const productsResponse = await fetch(`${BASE_URL}/api/products/seller/${seller.id}`);
  const products = await productsResponse.json();
  const productWithStock = products.find((p: any) => p.stock > 0);
  
  if (!productWithStock) {
    throw new Error('No product with stock available');
  }
  
  // Initialize cart session
  const initCartResponse = await fetch(`${BASE_URL}/api/cart`);
  const cookies = initCartResponse.headers.get('set-cookie');
  
  // Add to cart
  await fetch(`${BASE_URL}/api/cart/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies!
    },
    body: JSON.stringify({
      productId: productWithStock.id,
      quantity: 1
    })
  });
  
  // Initiate checkout
  const checkoutResponse = await fetch(`${BASE_URL}/api/checkout/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies!
    },
    body: JSON.stringify({
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'CA',
      postalCode: '12345',
      country: 'US',
      phone: '+1234567890'
    })
  });
  
  if (!checkoutResponse.ok) {
    const errorData = await checkoutResponse.json();
    throw new Error(`Checkout initiate failed: ${errorData.error || checkoutResponse.statusText}`);
  }
  
  const checkoutData = await checkoutResponse.json();
  
  // Verify clientSecret is present
  if (!checkoutData.clientSecret) {
    throw new Error('No clientSecret returned from checkout initiate');
  }
  
  // Verify sellerId is in checkout data
  if (!checkoutData.sellerId) {
    throw new Error('❌ CRITICAL: sellerId missing from checkout data - Phase 1 fix validation failed!');
  }
  
  // Verify pricing data
  if (!checkoutData.pricing || typeof checkoutData.pricing.total !== 'number') {
    throw new Error('Invalid pricing data in checkout response');
  }
  
  results[results.length - 1].details = {
    hasClientSecret: !!checkoutData.clientSecret,
    sellerId: checkoutData.sellerId,
    sellerIdPresent: !!checkoutData.sellerId,
    totalAmount: checkoutData.pricing.total,
    currency: checkoutData.currency
  };
}

async function test5_SellerIdPropagation() {
  // This test verifies sellerId propagates through the entire flow
  // We already tested it in previous tests, so we'll just aggregate the results
  
  const cartTest = results.find(r => r.name.includes('Add to Cart'));
  const checkoutTest = results.find(r => r.name.includes('Checkout Initiate'));
  
  if (!cartTest?.details?.sellerId || !checkoutTest?.details?.sellerId) {
    throw new Error('sellerId not found in cart or checkout data');
  }
  
  if (cartTest.details.sellerId !== checkoutTest.details.sellerId) {
    throw new Error('sellerId mismatch between cart and checkout');
  }
  
  results[results.length - 1].details = {
    cartSellerId: cartTest.details.sellerId,
    checkoutSellerId: checkoutTest.details.sellerId,
    propagationValid: true
  };
}

async function test6_StripeIntegration() {
  // Verify Stripe public key is configured
  const publicKeyResponse = await fetch(`${BASE_URL}/api/stripe/public-key`);
  
  if (!publicKeyResponse.ok) {
    throw new Error('Failed to fetch Stripe public key');
  }
  
  const { publicKey } = await publicKeyResponse.json();
  
  if (!publicKey || !publicKey.startsWith('pk_')) {
    throw new Error('Invalid Stripe public key format');
  }
  
  results[results.length - 1].details = {
    hasPublicKey: true,
    publicKeyPrefix: publicKey.substring(0, 7)
  };
}

async function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('CHECKOUT E2E VALIDATION TEST RESULTS');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  console.log('\n' + '-'.repeat(80));
  console.log('DETAILED RESULTS:');
  console.log('-'.repeat(80));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1 DEPLOYMENT READINESS:');
  console.log('='.repeat(80));
  
  const criticalTests = [
    'Add to Cart Works',
    'Checkout Initiate Works',
    'sellerId Propagation'
  ];
  
  const criticalPassed = criticalTests.every(testName => 
    results.find(r => r.name.includes(testName))?.passed
  );
  
  if (criticalPassed && failed === 0) {
    console.log('✅ ALL TESTS PASSED - READY FOR PHASE 1 DEPLOYMENT');
  } else if (criticalPassed) {
    console.log('⚠️  CRITICAL TESTS PASSED - Minor issues need attention');
  } else {
    console.log('❌ CRITICAL TESTS FAILED - NOT READY FOR DEPLOYMENT');
  }
  
  console.log('='.repeat(80) + '\n');
  
  // Return exit code
  return failed === 0 ? 0 : 1;
}

async function main() {
  console.log('Starting Checkout E2E Validation Tests...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Seller: ${TEST_SELLER_USERNAME}`);
  
  await runTest('1. Storefront Loads at /s/testshop', test1_StorefrontLoads);
  await runTest('2. Products Visible on Storefront', test2_ProductsVisibleOnStorefront);
  await runTest('3. Add to Cart Works', test3_AddToCartWorks);
  await runTest('4. Checkout Initiate Works', test4_CheckoutInitiateWorks);
  await runTest('5. sellerId Propagation', test5_SellerIdPropagation);
  await runTest('6. Stripe Integration', test6_StripeIntegration);
  
  const exitCode = await printResults();
  process.exit(exitCode);
}

main().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
