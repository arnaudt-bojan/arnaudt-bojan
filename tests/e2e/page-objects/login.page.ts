import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="input-email"]');
    this.passwordInput = page.locator('[data-testid="input-password"]');
    this.loginButton = page.locator('[data-testid="button-login"]');
    this.errorMessage = page.locator('[data-testid="text-error"]');
  }
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
  
  async loginAsSeller() {
    await this.login('mirtorabi+seller@gmail.com', '111111');
    await this.page.waitForURL('/dashboard');
  }
}
