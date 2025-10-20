import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from './db-test-utils';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for tests');
}

if (process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  NODE_ENV is not set to "test". Setting it now...');
  process.env.NODE_ENV = 'test';
}

let testDbSetup = false;

beforeAll(async () => {
  if (!testDbSetup) {
    console.log('🔧 Setting up test database...');
    await setupTestDatabase();
    testDbSetup = true;
    console.log('✅ Test database ready');
  }
}, 30000);

afterAll(async () => {
  console.log('🧹 Tearing down test database...');
  await teardownTestDatabase();
  console.log('✅ Test database closed');
}, 30000);

beforeEach(async () => {
}, 10000);

afterEach(async () => {
}, 10000);
