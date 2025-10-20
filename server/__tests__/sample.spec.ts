import { describe, it, expect, beforeEach } from 'vitest';
import { withTransaction, createTestPrisma } from '@tests/setup/db-test-utils';
import { createFixtures } from '@tests/setup/fixtures';
import type { Prisma } from '../../generated/prisma/index.js';

describe('Sample Test Suite - @fast', () => {
  describe('Database Transaction Utilities', () => {
    it('should execute test in transaction and auto-rollback', async () => {
      const prisma = createTestPrisma();
      
      const userId = await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        const user = await fixtures.createUser({
          email: 'transaction-test@example.com',
        });
        
        expect(user).toBeDefined();
        expect(user.email).toBe('transaction-test@example.com');
        
        return user.id;
      });

      const userAfterRollback = await prisma.users.findUnique({
        where: { id: userId },
      });

      expect(userAfterRollback).toBeNull();
    });

    it('should create user with fixtures', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        
        const user = await fixtures.createUser({
          email: 'fixture-test@example.com',
          user_type: 'seller',
        });

        expect(user).toBeDefined();
        expect(user.email).toBe('fixture-test@example.com');
        expect(user.user_type).toBe('seller');
        expect(user.id).toBeTruthy();
      });
    });

    it('should create seller with fixtures', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        
        const { user } = await fixtures.createSeller();

        expect(user).toBeDefined();
        expect(user.user_type).toBe('seller');
        expect(user.store_active).toBe(1);
      });
    });

  });

  describe('Fixture Randomization', () => {
    it('should generate unique IDs for multiple users', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        
        const user1 = await fixtures.createUser();
        const user2 = await fixtures.createUser();
        const user3 = await fixtures.createUser();

        expect(user1.id).not.toBe(user2.id);
        expect(user2.id).not.toBe(user3.id);
        expect(user1.email).not.toBe(user2.email);
        expect(user2.email).not.toBe(user3.email);
      });
    });

    it('should generate unique emails', async () => {
      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        
        const users = await Promise.all([
          fixtures.createUser(),
          fixtures.createUser(),
          fixtures.createUser(),
        ]);

        const emails = users.map(u => u.email);
        const uniqueEmails = new Set(emails);
        
        expect(uniqueEmails.size).toBe(emails.length);
      });
    });
  });

  describe('Transaction Isolation', () => {
    it('should isolate data between tests', async () => {
      const prisma = createTestPrisma();
      
      const email1 = 'isolation-test-1@example.com';
      const email2 = 'isolation-test-2@example.com';

      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        await fixtures.createUser({ email: email1 });
      });

      await withTransaction(async (tx: Prisma.TransactionClient) => {
        const fixtures = createFixtures(tx);
        await fixtures.createUser({ email: email2 });
      });

      const user1 = await prisma.users.findUnique({ where: { email: email1 } });
      const user2 = await prisma.users.findUnique({ where: { email: email2 } });

      expect(user1).toBeNull();
      expect(user2).toBeNull();
    });
  });
});

describe('Integration Test Suite - @integration', () => {
  it('should create multiple sellers and buyers', async () => {
    await withTransaction(async (tx: Prisma.TransactionClient) => {
      const fixtures = createFixtures(tx);
      
      const { user: seller1 } = await fixtures.createSeller();
      const { user: seller2 } = await fixtures.createSeller();
      const { user: buyer } = await fixtures.createBuyer();

      expect(seller1.user_type).toBe('seller');
      expect(seller2.user_type).toBe('seller');
      expect(buyer.user_type).toBe('buyer');
      expect(seller1.id).not.toBe(seller2.id);
    });
  });
});
