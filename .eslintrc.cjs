module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  plugins: [],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Custom rule: Forbid hard-coded currency literals
    'no-restricted-syntax': [
      'error',
      {
        selector: "Literal[value='USD'], Literal[value='EUR'], Literal[value='GBP'], Literal[value='CAD'], Literal[value='JPY'], Literal[value='AUD'], Literal[value='CHF']",
        message: 'Hard-coded currency literals are forbidden. Import from config: import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "shared/config/currency"',
      },
      {
        selector: "Property[key.name='currency'] > Literal[value='USD']",
        message: 'Hard-coded USD currency. Use user.currency or DEFAULT_CURRENCY from config.',
      },
      {
        selector: "Property[key.name='currency'] > Literal[value='EUR']",
        message: 'Hard-coded EUR currency. Use user.currency or DEFAULT_CURRENCY from config.',
      },
      {
        selector: "Property[key.name='currency'] > Literal[value='GBP']",
        message: 'Hard-coded GBP currency. Use user.currency or DEFAULT_CURRENCY from config.',
      },
    ],
  },
  overrides: [
    {
      // Allow currency literals in config files, tests, and data migrations only
      files: [
        '**/config/currency.ts',
        '**/config/currencies.ts', 
        '**/__tests__/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/migrations/**',
        '**/seed/**',
        '**/fixtures/**',
      ],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
