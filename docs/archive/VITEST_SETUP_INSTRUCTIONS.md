# Vitest Test Scripts - Manual Installation Required

## Required package.json Changes

Add the following scripts to the `"scripts"` section of `package.json`:

```json
{
  "scripts": {
    "test": "NODE_ENV=test vitest run",
    "test:watch": "NODE_ENV=test vitest",
    "test:fast": "NODE_ENV=test vitest run --testNamePattern=@fast",
    "test:integration": "NODE_ENV=test vitest run --testNamePattern=@integration",
    "test:changed": "NODE_ENV=test vitest run --changed",
    "test:ui": "NODE_ENV=test vitest --ui",
    "test:coverage": "NODE_ENV=test vitest run --coverage"
  }
}
```

## Complete scripts section should look like:

```json
"scripts": {
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "test": "NODE_ENV=test vitest run",
  "test:watch": "NODE_ENV=test vitest",
  "test:fast": "NODE_ENV=test vitest run --testNamePattern=@fast",
  "test:integration": "NODE_ENV=test vitest run --testNamePattern=@integration",
  "test:changed": "NODE_ENV=test vitest run --changed",
  "test:ui": "NODE_ENV=test vitest --ui",
  "test:coverage": "NODE_ENV=test vitest run --coverage"
}
```

## Manual Steps

1. Open `package.json`
2. Locate the `"scripts"` section
3. Add the test scripts listed above
4. Save the file
5. Run `npm test` to validate the setup

## After Adding Scripts

You can then run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only fast tests
npm run test:fast

# Run only integration tests
npm run test:integration

# Run tests for changed files
npm run test:changed

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```
