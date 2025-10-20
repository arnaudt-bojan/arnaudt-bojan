#!/usr/bin/env tsx
/**
 * Create Authentication Storage State
 * Run this script to generate storageState.json for authenticated tests
 */

import { chromium } from 'playwright';
import path from 'path';

async function createStorageState() {
  console.log('🔐 Creating authentication storage state...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    
    console.log(`Navigating to ${baseUrl}/login`);
    await page.goto(`${baseUrl}/login`);
    
    console.log('Please log in manually...');
    console.log('Waiting for navigation to home/dashboard...\n');
    
    // Wait for user to log in and navigate away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 120000 // 2 minutes for manual login
    });
    
    console.log('✅ Login detected!');
    
    // Save storage state
    const storageStatePath = path.join(process.cwd(), 'storageState.json');
    await context.storageState({ path: storageStatePath });
    
    console.log(`✅ Storage state saved to: ${storageStatePath}\n`);
    console.log('You can now run tests with authentication!');
    
  } catch (error) {
    console.error('❌ Failed to create storage state:', error);
    throw error;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

if (require.main === module) {
  createStorageState().catch(console.error);
}

export { createStorageState };
