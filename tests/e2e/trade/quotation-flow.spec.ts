/**
 * Trade Quotation Flow - Complete E2E
 * Tag: @trade
 */

import { test, expect } from '@playwright/test';

test.describe('Trade Quotation Flow @trade', () => {
  test.use({ storageState: 'storageState.json' });
  
  test('request quote → seller responds → buyer converts to order', async ({ page }) => {
    // Buyer requests quotation
    await page.goto('/products');
    await page.getByTestId('card-product-1').click();
    
    await page.getByTestId('button-request-quote').click();
    
    await page.getByTestId('input-quantity').fill('1000');
    await page.getByTestId('textarea-requirements').fill('Need custom packaging');
    await page.getByTestId('button-submit-quote-request').click();
    
    await expect(page.getByTestId('text-quote-submitted')).toBeVisible();
    
    // Check quote in dashboard
    await page.goto('/quotes');
    const quote = page.getByTestId(/quote-item-.*/).first();
    await expect(quote.getByTestId('text-status')).toContainText(/pending/i);
  });
  
  test('seller provides quote with custom pricing', async ({ page }) => {
    // Switch to seller view
    await page.goto('/seller/quotes');
    
    const quote = page.getByTestId(/quote-request-.*/).first();
    await quote.getByTestId('button-respond').click();
    
    await page.getByTestId('input-unit-price').fill('8.50');
    await page.getByTestId('input-lead-time').fill('14 days');
    await page.getByTestId('textarea-notes').fill('Can provide custom packaging');
    
    await page.getByTestId('button-send-quote').click();
    
    await expect(page.getByTestId('text-quote-sent')).toBeVisible();
  });
  
  test('buyer accepts quote and converts to order', async ({ page }) => {
    await page.goto('/quotes');
    
    const quote = page.getByTestId(/quote-item-.*/).first();
    await quote.click();
    
    await expect(page.getByTestId('text-quoted-price')).toBeVisible();
    
    await page.getByTestId('button-accept-quote').click();
    await page.getByTestId('button-proceed-to-checkout').click();
    
    // Should navigate to checkout with quote details pre-filled
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId('text-quote-reference')).toBeVisible();
  });
});
