import { Page } from '@playwright/test';

export class TestHelpers {
  static async waitForResponse(page: Page, urlPattern: string | RegExp) {
    return page.waitForResponse(response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    });
  }
  
  static async fillFormField(page: Page, testId: string, value: string) {
    const input = page.locator(`[data-testid="${testId}"]`);
    await input.fill(value);
  }
  
  static async clickButton(page: Page, testId: string) {
    const button = page.locator(`[data-testid="${testId}"]`);
    await button.click();
  }
  
  static generateRandomEmail(prefix: string = 'test') {
    const timestamp = Date.now();
    return `${prefix}+${timestamp}@example.com`;
  }
  
  static generateRandomProductName() {
    const timestamp = Date.now();
    return `Test Product ${timestamp}`;
  }
}
