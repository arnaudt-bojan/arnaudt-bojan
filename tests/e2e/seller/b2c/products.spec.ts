import { test, expect } from '../../fixtures/auth.fixture';
import { ProductsPage } from '../../page-objects/products.page';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Seller B2C - Product Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', 'mirtorabi+seller@gmail.com');
    await page.fill('[data-testid="input-password"]', '111111');
    await page.click('[data-testid="button-login"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should create a new product', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.goto();
    
    const productName = TestHelpers.generateRandomProductName();
    await productsPage.createProduct(productName, 99.99, 50);
    
    const product = await productsPage.getProductByName(productName);
    await expect(product).toBeVisible();
  });
  
  test('should edit an existing product', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.goto();
    
    const productName = TestHelpers.generateRandomProductName();
    await productsPage.createProduct(productName, 99.99, 50);
    
    const product = await productsPage.getProductByName(productName);
    await product.locator('[data-testid="button-edit"]').click();
    
    await page.fill('[data-testid="input-product-price"]', '149.99');
    await page.click('[data-testid="button-save"]');
    
    await expect(product.locator('[data-testid="text-price"]')).toHaveText('$149.99');
  });
  
  test('should delete a product', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.goto();
    
    const productName = TestHelpers.generateRandomProductName();
    await productsPage.createProduct(productName, 99.99, 50);
    
    const product = await productsPage.getProductByName(productName);
    await product.locator('[data-testid="button-delete"]').click();
    
    await page.click('[data-testid="button-confirm-delete"]');
    
    await expect(product).not.toBeVisible();
  });
});
