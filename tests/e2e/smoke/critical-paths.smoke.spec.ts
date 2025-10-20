/**
 * Smoke Tests - Critical Paths
 * Tag: @smoke
 * Should run in < 5 minutes
 */

import { test, expect } from '@playwright/test';

test.describe('Critical Paths @smoke', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/.*/, { timeout: 5000 });
    await expect(page.getByRole('main')).toBeVisible();
  });
  
  test('can view product catalog', async ({ page }) => {
    await page.goto('/products');
    
    // Check for product grid/list
    await expect(page.getByTestId('product-grid')).toBeVisible();
    
    // At least one product should be visible
    const productCards = page.getByTestId(/card-product-.*/);
    await expect(productCards.first()).toBeVisible();
  });
  
  test('can view product details', async ({ page }) => {
    await page.goto('/products');
    
    // Click first product
    await page.getByTestId(/card-product-.*/).first().click();
    
    // Should navigate to PDP
    await expect(page).toHaveURL(/\/product\/.*/);
    
    // Product details should be visible
    await expect(page.getByTestId('text-product-name')).toBeVisible();
    await expect(page.getByTestId('text-product-price')).toBeVisible();
  });
  
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-password')).toBeVisible();
    await expect(page.getByTestId('button-login')).toBeVisible();
  });
  
  test('checkout page requires authentication', async ({ page }) => {
    await page.goto('/checkout');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authenticated Critical Paths @smoke', () => {
  test.use({ storageState: 'storageState.json' });
  
  test('authenticated user can access dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.getByTestId('text-dashboard-title')).toBeVisible();
  });
  
  test('can add product to cart', async ({ page }) => {
    await page.goto('/products');
    
    // Click add to cart on first product
    const firstProduct = page.getByTestId(/card-product-.*/).first();
    await firstProduct.getByTestId(/button-add-to-cart-.*/).click();
    
    // Cart count should increase
    const cartCount = page.getByTestId('text-cart-count');
    await expect(cartCount).toHaveText(/[1-9]/);
  });
});

test.describe('Health Endpoints @smoke', () => {
  test('/healthz endpoint returns 200', async ({ request }) => {
    const response = await request.get('/healthz');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });
});
