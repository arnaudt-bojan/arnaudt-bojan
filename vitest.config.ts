import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    include: ['**/*.spec.ts', '**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/generated/**',
      '**/e2e/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'generated/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/**',
        '**/*.config.ts',
        '**/*.config.js',
      ],
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    sequence: {
      shuffle: false,
    },
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
      '@tests': path.resolve(__dirname, './tests'),
      '@assets': path.resolve(__dirname, './attached_assets'),
      '@lib': path.resolve(__dirname, './client/src/lib'),
      '@components': path.resolve(__dirname, './client/src/components'),
    },
  },
});
