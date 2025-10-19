import { Page, Locator } from '@playwright/test';

export class OrdersPage {
  readonly page: Page;
  readonly orderList: Locator;
  readonly filterDropdown: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.orderList = page.locator('[data-testid="list-orders"]');
    this.filterDropdown = page.locator('[data-testid="select-status-filter"]');
  }
  
  async goto() {
    await this.page.goto('/dashboard/orders');
  }
  
  async filterByStatus(status: string) {
    await this.filterDropdown.selectOption(status);
  }
  
  async getOrderById(orderId: string) {
    return this.page.locator(`[data-testid="card-order-${orderId}"]`);
  }
  
  async clickOrderDetails(orderId: string) {
    const order = await this.getOrderById(orderId);
    await order.click();
  }
}
