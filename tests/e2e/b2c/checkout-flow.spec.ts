/**
 * B2C Checkout Flow - Complete E2E
 * Tag: @b2c
 */

import { test, expect } from '@playwright/test';

test.describe('B2C Complete Checkout @b2c', () => {
  test.use({ storageState: 'storageState.json' });
  
  test('complete purchase flow: browse → cart → checkout → payment → confirmation', async ({ page }) => {
    // 1. Browse products
    await page.goto('/products');
    await expect(page.getByTestId('product-grid')).toBeVisible();
    
    // 2. View product details
    await page.getByTestId(/card-product-.*/).first().click();
    await expect(page).toHaveURL(/\/product\/.*/);
    
    // 3. Add to cart
    await page.getByTestId('button-add-to-cart').click();
    await expect(page.getByTestId('text-cart-count')).toHaveText(/[1-9]/);
    
    // 4. Go to checkout
    await page.getByTestId('button-cart').click();
    await page.getByTestId('button-checkout').click();
    await expect(page).toHaveURL(/\/checkout/);
    
    // 5. Fill shipping address
    await page.getByTestId('input-street').fill('123 Test St');
    await page.getByTestId('input-city').fill('San Francisco');
    await page.getByTestId('input-state').fill('CA');
    await page.getByTestId('input-postal-code').fill('94102');
    
    // 6. Select shipping method
    await page.getByTestId('select-shipping-method').click();
    await page.getByTestId('option-standard').click();
    
    // 7. Enter payment
    await page.getByTestId('input-card-number').fill('4242424242424242');
    await page.getByTestId('input-card-exp').fill('12/30');
    await page.getByTestId('input-card-cvc').fill('123');
    
    // 8. Submit order
    await page.getByTestId('button-submit-order').click();
    
    // 9. Wait for confirmation
    await expect(page).toHaveURL(/\/order-confirmation\/.*/);
    await expect(page.getByTestId('text-order-number')).toBeVisible();
    
    // 10. Verify order appears in history
    await page.goto('/orders');
    await expect(page.getByTestId(/order-item-.*/).first()).toBeVisible();
  });
  
  test('handles out of stock during checkout', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId('card-product-test-product-3').click(); // OOS product
    
    const addButton = page.getByTestId('button-add-to-cart');
    await expect(addButton).toBeDisabled();
    await expect(page.getByTestId('text-out-of-stock')).toBeVisible();
  });
  
  test('handles payment failure gracefully', async ({ page }) => {
    // Mock declined payment
    await page.route('**/api/stripe/create-payment-intent', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'card_declined' })
      });
    });
    
    await page.goto('/checkout');
    // ... fill form
    await page.getByTestId('button-submit-order').click();
    
    await expect(page.getByTestId('text-error-message')).toContainText(/payment.*failed/i);
  });
});
