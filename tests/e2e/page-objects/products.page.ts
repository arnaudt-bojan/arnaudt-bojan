import { Page, Locator } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;
  readonly addProductButton: Locator;
  readonly productNameInput: Locator;
  readonly productPriceInput: Locator;
  readonly productStockInput: Locator;
  readonly saveButton: Locator;
  readonly productList: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.addProductButton = page.locator('[data-testid="button-add-product"]');
    this.productNameInput = page.locator('[data-testid="input-product-name"]');
    this.productPriceInput = page.locator('[data-testid="input-product-price"]');
    this.productStockInput = page.locator('[data-testid="input-product-stock"]');
    this.saveButton = page.locator('[data-testid="button-save"]');
    this.productList = page.locator('[data-testid="list-products"]');
  }
  
  async goto() {
    await this.page.goto('/dashboard/products');
  }
  
  async createProduct(name: string, price: number, stock: number) {
    await this.addProductButton.click();
    await this.productNameInput.fill(name);
    await this.productPriceInput.fill(price.toString());
    await this.productStockInput.fill(stock.toString());
    await this.saveButton.click();
  }
  
  async getProductByName(name: string) {
    return this.page.locator(`[data-testid="card-product-${name}"]`);
  }
}
