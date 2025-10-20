/**
 * B2B Wholesale Flow - Complete E2E
 * Tag: @b2b
 */

import { test, expect } from '@playwright/test';

test.describe('B2B Wholesale Flow @b2b', () => {
  test.use({ storageState: 'storageState-seller.json' });
  
  test('buyer invitation and catalog access', async ({ page }) => {
    // Seller invites buyer
    await page.goto('/seller/wholesale/buyers');
    await page.getByTestId('button-invite-buyer').click();
    
    await page.getByTestId('input-buyer-email').fill('newbuyer@test.com');
    await page.getByTestId('input-credit-limit').fill('10000');
    await page.getByTestId('button-send-invitation').click();
    
    await expect(page.getByTestId('text-invitation-sent')).toBeVisible();
    
    // Verify invitation in list
    await expect(page.getByTestId('row-buyer-newbuyer@test.com')).toBeVisible();
  });
  
  test('bulk order with MOQ pricing', async ({ page }) => {
    await page.goto('/wholesale/catalog');
    
    // Find product with MOQ pricing
    const product = page.getByTestId('card-product-moq-item');
    await expect(product.getByTestId('text-moq')).toContainText(/MOQ: 10/);
    
    // Add MOQ quantity
    await product.getByTestId('input-quantity').fill('50');
    await product.getByTestId('button-add-to-cart').click();
    
    // Verify tiered pricing applied
    await page.getByTestId('button-cart').click();
    const priceText = await page.getByTestId('text-unit-price').textContent();
    // Should show tier-2 pricing
    expect(parseFloat(priceText!)).toBeLessThan(10.00); // Lower than base
  });
  
  test('credit balance checkout', async ({ page }) => {
    await page.goto('/cart');
    await page.getByTestId('button-checkout').click();
    
    // Select pay with credit
    await page.getByTestId('radio-payment-credit').click();
    
    // Verify credit balance shown
    await expect(page.getByTestId('text-available-credit')).toBeVisible();
    
    await page.getByTestId('button-submit-order').click();
    
    await expect(page).toHaveURL(/\/order-confirmation/);
    await expect(page.getByTestId('text-payment-method')).toContainText(/credit/i);
  });
});
