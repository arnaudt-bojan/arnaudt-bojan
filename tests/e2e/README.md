# Playwright E2E Testing for Upfirst Platform

This directory contains end-to-end tests for the Upfirst platform using Playwright.

## Test Structure

```
tests/e2e/
├── fixtures/          # Test fixtures and helpers
│   └── auth.fixture.ts
├── page-objects/      # Page Object Models
│   ├── login.page.ts
│   ├── products.page.ts
│   └── orders.page.ts
├── seller/            # Seller flow tests
│   └── b2c/
│       └── products.spec.ts
└── utils/             # Utility functions
    └── test-helpers.ts
```

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run tests in UI mode (interactive)
```bash
npx playwright test --ui
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

### Run specific test file
```bash
npx playwright test tests/e2e/seller/b2c/products.spec.ts
```

### View test report
```bash
npx playwright show-report
```

## Test Credentials

- **Seller Account**: mirtorabi+seller@gmail.com / 111111

## Writing New Tests

### 1. Create a Page Object Model

Page objects encapsulate page interactions:

```typescript
import { Page, Locator } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly myButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.myButton = page.locator('[data-testid="button-my-action"]');
  }
  
  async goto() {
    await this.page.goto('/my-page');
  }
  
  async performAction() {
    await this.myButton.click();
  }
}
```

### 2. Create a Test Suite

```typescript
import { test, expect } from '../../fixtures/auth.fixture';
import { MyPage } from '../../page-objects/my-page.page';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup code - login, navigate, etc.
  });
  
  test('should do something', async ({ page }) => {
    const myPage = new MyPage(page);
    await myPage.goto();
    await myPage.performAction();
    
    // Assertions
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### 3. Use Test Helpers

The `TestHelpers` class provides utility methods:

```typescript
import { TestHelpers } from '../../utils/test-helpers';

// Generate random test data
const email = TestHelpers.generateRandomEmail('test');
const productName = TestHelpers.generateRandomProductName();

// Wait for API responses
await TestHelpers.waitForResponse(page, '/api/products');

// Fill form fields
await TestHelpers.fillFormField(page, 'input-name', 'John Doe');
```

## Configuration

The Playwright configuration is in `playwright.config.ts` at the project root:

- **Base URL**: http://localhost:5000
- **Timeout**: 60 seconds per test
- **Workers**: 1 (sequential execution to avoid database conflicts)
- **Retries**: 0 in dev, 2 in CI
- **Screenshots**: On failure
- **Video**: On failure
- **Trace**: On first retry

## Best Practices

1. **Use data-testid attributes**: All interactive elements should have `data-testid` attributes for reliable selectors
2. **Generate unique test data**: Use timestamp-based names to avoid conflicts
3. **Clean up after tests**: Delete created test data when possible
4. **Use Page Object Models**: Keep tests DRY and maintainable
5. **Await all async operations**: Always use `await` for Playwright actions
6. **Use meaningful test names**: Describe what the test does, not how it does it

## Debugging Tips

### Visual debugging
```bash
npx playwright test --debug
```

### Show browser while testing
```bash
npx playwright test --headed
```

### Run a single test
```bash
npx playwright test -g "should create a new product"
```

### Generate code from browser interactions
```bash
npx playwright codegen http://localhost:5000
```

## CI/CD Integration

In CI environments, the configuration automatically:
- Enables retries (2 attempts)
- Disables `.only()` test focus
- Uses the webServer configuration to start the app

## Troubleshooting

### Tests fail with timeout
- Increase timeout in `playwright.config.ts`
- Check if the dev server is running on port 5000
- Verify network requests aren't being blocked

### Elements not found
- Check data-testid attributes exist in the UI
- Use `page.pause()` to inspect the page during test execution
- Use `--headed` mode to see what's happening

### Authentication issues
- Verify test credentials are correct
- Check if the login flow has changed
- Clear browser state between tests
