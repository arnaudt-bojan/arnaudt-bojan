import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createTestPrisma, cleanDatabase, teardownTestDatabase } from '../setup/db-test-utils';
import { createFixtures } from '../setup/fixtures';

describe('Database Constraints @db', () => {
  const prisma = createTestPrisma();
  const fixtures = createFixtures(prisma);

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Foreign Key Constraints', () => {
    it('should prevent orphaned carts when seller is deleted', async () => {
      const { user: seller } = await fixtures.createSeller();
      await fixtures.createCart(seller.id);

      await expect(
        prisma.users.delete({ where: { id: seller.id } })
      ).rejects.toThrow();
    });

    it('should allow cascade operations on related data', async () => {
      const { user: seller } = await fixtures.createSeller();
      const cart = await fixtures.createCart(seller.id);

      const foundCart = await prisma.carts.findUnique({
        where: { id: cart.id },
      });

      expect(foundCart).toBeDefined();
      expect(foundCart?.seller_id).toBe(seller.id);
    });

    it('should maintain referential integrity between products and sellers', async () => {
      const { user: seller } = await fixtures.createSeller();
      const product = await fixtures.createProduct(seller.id);

      const foundProduct = await prisma.products.findUnique({
        where: { id: product.id },
      });

      expect(foundProduct).toBeDefined();
      expect(foundProduct?.seller_id).toBe(seller.id);
    });
  });

  describe('Unique Constraints', () => {
    it('should prevent duplicate emails', async () => {
      const email = 'test-unique@example.com';
      await fixtures.createUser({ email });

      await expect(
        fixtures.createUser({ email })
      ).rejects.toThrow();
    });

    it('should allow same SKU for different sellers', async () => {
      const { user: seller1 } = await fixtures.createSeller();
      const { user: seller2 } = await fixtures.createSeller();
      const sku = 'TEST-SKU-001';

      const product1 = await fixtures.createProduct(seller1.id, { sku });
      const product2 = await fixtures.createProduct(seller2.id, { sku });

      expect(product1.sku).toBe(sku);
      expect(product2.sku).toBe(sku);
      expect(product1.id).not.toBe(product2.id);
    });

    it('should prevent duplicate usernames', async () => {
      const username = 'uniqueuser123';
      await fixtures.createUser({ username });

      await expect(
        fixtures.createUser({ username })
      ).rejects.toThrow();
    });
  });

  describe('Check Constraints', () => {
    it('should enforce non-negative stock values', async () => {
      const { user: seller } = await fixtures.createSeller();

      const product = await fixtures.createProduct(seller.id, { stock: 0 });
      expect(product.stock).toBe(0);

      await expect(
        fixtures.createProduct(seller.id, { stock: -1 })
      ).rejects.toThrow();
    });

    it('should enforce valid price format', async () => {
      const { user: seller } = await fixtures.createSeller();

      const product = await fixtures.createProduct(seller.id, {
        price: '99.99',
      });

      expect(product.price).toBe('99.99');
    });

    it('should handle edge cases for numeric constraints', async () => {
      const { user: seller } = await fixtures.createSeller();

      const product = await fixtures.createProduct(seller.id, {
        stock: 0,
        price: '0.01',
      });

      expect(product.stock).toBe(0);
      expect(product.price).toBe('0.01');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain cart item consistency', async () => {
      const { user: seller } = await fixtures.createSeller();
      const product = await fixtures.createProduct(seller.id);
      const cart = await fixtures.createCart(seller.id);

      await fixtures.addToCart(cart.id, product.id, 5);

      const updatedCart = await prisma.carts.findUnique({
        where: { id: cart.id },
      });

      expect(updatedCart).toBeDefined();
      expect(Array.isArray(updatedCart?.items)).toBe(true);
    });

    it('should validate order item references', async () => {
      const { user: seller } = await fixtures.createSeller();
      const { user: buyer } = await fixtures.createBuyer();
      if (!seller.id) {
        throw new Error('Seller ID is required');
      }
      if (!buyer.email) {
        throw new Error('Buyer email is required');
      }
      const product = await fixtures.createProduct(seller.id);

      const order = await fixtures.createOrder(buyer.email, seller.id, {
        items: JSON.stringify([
          {
            product_id: product.id,
            quantity: 1,
            price: product.price,
          },
        ]),
      });

      expect(order).toBeDefined();
      expect(order.seller_id).toBe(seller.id);
    });
  });
});
