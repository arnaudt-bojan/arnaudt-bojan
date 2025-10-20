/**
 * Global Setup
 * Runs once before the entire test suite
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🌍 Running global setup...');
  
  // Start a browser to verify server is up
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Health check
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    await page.goto(baseUrl, { timeout: 60000 });
    console.log(`✅ Server is ready at ${baseUrl}`);
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    throw error;
  } finally {
    await page.close();
    await browser.close();
  }
  
  // Optional: Seed database with test data
  // await seedTestData();
  
  console.log('✅ Global setup complete');
}

export default globalSetup;
