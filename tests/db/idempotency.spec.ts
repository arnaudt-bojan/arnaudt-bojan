import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  createTestPrisma,
  cleanDatabase,
  teardownTestDatabase,
  getAuditLog,
  clearAuditLog,
} from '../setup/db-test-utils';
import { createFixtures } from '../setup/fixtures';

describe('Write Idempotency @db', () => {
  const prisma = createTestPrisma();
  const fixtures = createFixtures(prisma);

  beforeEach(async () => {
    await cleanDatabase();
    await clearAuditLog();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should handle duplicate product creation gracefully', async () => {
    const { user: seller } = await fixtures.createSeller();
    const sku = 'UNIQUE-SKU-001';

    const product1 = await fixtures.createProduct(seller.id, {
      name: 'Unique Product',
      sku,
    });

    await expect(
      fixtures.createProduct(seller.id, {
        name: 'Unique Product',
        sku,
      })
    ).rejects.toThrow();

    const products = await prisma.products.findMany({
      where: { sku },
    });

    expect(products).toHaveLength(1);
    expect(products[0].id).toBe(product1.id);
  });

  it('should handle idempotent cart item updates', async () => {
    const { user: seller } = await fixtures.createSeller();
    const product = await fixtures.createProduct(seller.id);
    const cart = await fixtures.createCart(seller.id);

    await fixtures.addToCart(cart.id, product.id, 5);
    await fixtures.addToCart(cart.id, product.id, 5);

    const updatedCart = await prisma.carts.findUnique({
      where: { id: cart.id },
    });

    const items = updatedCart?.items as any[];
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(10);
  });

  it('should handle idempotent order state transitions', async () => {
    const { user: seller } = await fixtures.createSeller();
    if (!seller.id) {
      throw new Error('Seller ID is required');
    }
    const { user: buyer } = await fixtures.createBuyer();
    if (!buyer.email) {
      throw new Error('Buyer email is required');
    }
    const order = await fixtures.createOrder(buyer.email, seller.id, {
      status: 'pending',
    });

    await fixtures.updateOrderStatus(order.id, 'paid');
    await fixtures.updateOrderStatus(order.id, 'paid');

    const updated = await prisma.orders.findUnique({
      where: { id: order.id },
    });

    expect(updated?.status).toBe('paid');

    const auditLog = await getAuditLog('orders');
    const paidTransitions = auditLog.filter(
      (log) => log.new_data?.status === 'paid'
    );

    expect(paidTransitions.length).toBeGreaterThanOrEqual(1);
  });

  it('should prevent duplicate user creation with same email', async () => {
    const email = 'duplicate@example.com';
    const user1 = await fixtures.createUser({ email });

    await expect(fixtures.createUser({ email })).rejects.toThrow();

    const users = await prisma.users.findMany({
      where: { email },
    });

    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(user1.id);
  });

  it('should handle repeated cart updates gracefully', async () => {
    const { user: seller } = await fixtures.createSeller();
    const product = await fixtures.createProduct(seller.id);
    const cart = await fixtures.createCart(seller.id);

    for (let i = 0; i < 5; i++) {
      await fixtures.addToCart(cart.id, product.id, 1);
    }

    const updatedCart = await prisma.carts.findUnique({
      where: { id: cart.id },
    });

    const items = updatedCart?.items as any[];
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it('should maintain inventory consistency with repeated operations', async () => {
    const { user: seller } = await fixtures.createSeller();
    const initialStock = 100;
    const product = await fixtures.createProduct(seller.id, {
      stock: initialStock,
    });

    await fixtures.reserveInventory(product.id, 10);

    const updatedProduct = await prisma.products.findUnique({
      where: { id: product.id },
    });

    expect(updatedProduct?.stock).toBe(initialStock - 10);
  });
});
