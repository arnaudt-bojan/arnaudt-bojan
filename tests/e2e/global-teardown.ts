/**
 * Global Teardown
 * Runs once after the entire test suite
 */

async function globalTeardown() {
  console.log('🌍 Running global teardown...');
  
  // Optional: Cleanup test data
  // await cleanupTestData();
  
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
