import { defineConfig, devices } from '@playwright/test';

/**
 * Optimized Playwright Configuration
 * Target: <10min full suite, <5min smoke tests
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in parallel for maximum speed
  fullyParallel: true,
  
  // Fail fast in CI
  forbidOnly: !!process.env.CI,
  
  // Smart retries: 1 retry on first failure
  retries: 1,
  
  // Maximize workers for parallel execution
  // Use 50% of available CPUs for better stability
  workers: process.env.CI ? 2 : '50%',
  
  // HTML reporter + list for CI
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // Aggressive timeouts for fast feedback
  timeout: 30000, // 30s per test
  expect: {
    timeout: 5000 // 5s for assertions
  },
  
  use: {
    // Use baseURL for consistent URL handling
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    
    // Trace only on first retry (not on every run)
    trace: 'on-first-retry',
    
    // No video to save time/space
    video: 'off',
    
    // Screenshots only on failure
    screenshot: 'only-on-failure',
    
    // Reuse existing server in development
    // Fresh server in CI for isolation
    // (configured in webServer below)
    
    // Use auth storage state for authenticated tests
    storageState: process.env.STORAGE_STATE || undefined,
    
    // Faster navigation
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  
  // Test projects
  projects: [
    // Setup project to save authenticated state
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    
    // Smoke tests - fastest, most critical paths
    {
      name: 'smoke',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      grep: /@smoke/,
      dependencies: ['setup'],
    },
    
    // Chromium - main test suite
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      grep: /@smoke/,
      grepInvert: true, // Exclude smoke tests from main run
    },
    
    // Mobile viewport (run separately if needed)
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
      grep: /@mobile/,
    },
  ],
  
  // Development server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    
    // Reuse in dev, fresh in CI
    reuseExistingServer: !process.env.CI,
    
    // Allow up to 2 minutes for server to start (includes DB migrations)
    timeout: 120000,
    
    // Health check
    // stdout: 'pipe',
    // stderr: 'pipe',
  },
  
  // Global setup for database seeding, etc.
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
});
