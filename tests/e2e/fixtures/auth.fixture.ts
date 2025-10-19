import { test as base } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';

type AuthFixtures = {
  authenticatedPage: any;
  loginAsSellerHelper: (email: string, password: string) => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', 'mirtorabi+seller@gmail.com');
    await page.fill('[data-testid="input-password"]', '111111');
    await page.click('[data-testid="button-login"]');
    
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    await use(page);
  },
  
  loginAsSellerHelper: async ({ page }, use) => {
    const loginHelper = async (email: string, password: string) => {
      await page.goto('/login');
      await page.fill('[data-testid="input-email"]', email);
      await page.fill('[data-testid="input-password"]', password);
      await page.click('[data-testid="button-login"]');
      await page.waitForURL('/dashboard');
    };
    
    await use(loginHelper);
  },
});

export { expect } from '@playwright/test';
