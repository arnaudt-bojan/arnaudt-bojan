/**
 * Authentication Setup
 * Runs once before all tests to create authenticated storage state
 * Speeds up tests by avoiding repeated logins
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../storageState.json');

setup('authenticate as buyer', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  
  // Perform login
  await page.getByTestId('input-email').fill('buyer@example.com');
  await page.getByTestId('input-password').fill('Test123!');
  await page.getByTestId('button-login').click();
  
  // Wait for redirect to dashboard/home
  await page.waitForURL(/\/(home|dashboard)/);
  
  // Verify we're logged in
  await expect(page.getByTestId('text-user-email')).toBeVisible();
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

setup('authenticate as seller', async ({ page }) => {
  const sellerAuthFile = path.join(__dirname, '../../storageState-seller.json');
  
  await page.goto('/login');
  
  await page.getByTestId('input-email').fill('seller@example.com');
  await page.getByTestId('input-password').fill('Test123!');
  await page.getByTestId('button-login').click();
  
  await page.waitForURL(/\/(seller-dashboard|dashboard)/);
  
  await expect(page.getByTestId('link-seller-dashboard')).toBeVisible();
  
  await page.context().storageState({ path: sellerAuthFile });
});
