import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createTestPrisma, cleanDatabase, teardownTestDatabase } from '../setup/db-test-utils';
import { createFixtures } from '../setup/fixtures';

describe('Concurrency & Race Conditions @db @slow', () => {
  const prisma = createTestPrisma();
  const fixtures = createFixtures(prisma);

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should prevent double inventory reservation', async () => {
    const { user: seller } = await fixtures.createSeller();
    const product = await fixtures.createProduct(seller.id, { stock: 1 });

    const results = await Promise.allSettled([
      fixtures.reserveInventory(product.id, 1),
      fixtures.reserveInventory(product.id, 1),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const updatedProduct = await prisma.products.findUnique({
      where: { id: product.id },
    });

    expect(updatedProduct?.stock).toBe(0);
  });

  it('should handle concurrent cart modifications', async () => {
    const { user: seller } = await fixtures.createSeller();
    const product = await fixtures.createProduct(seller.id, { stock: 100 });
    const cart = await fixtures.createCart(seller.id);

    await Promise.all([
      fixtures.addToCart(cart.id, product.id, 5),
      fixtures.addToCart(cart.id, product.id, 3),
      fixtures.addToCart(cart.id, product.id, 2),
    ]);

    const updatedCart = await prisma.carts.findUnique({
      where: { id: cart.id },
    });

    const items = updatedCart?.items as any[];
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(10);
  });

  it('should handle concurrent order creation with inventory limits', async () => {
    const { user: seller } = await fixtures.createSeller();
    if (!seller.id) {
      throw new Error('Seller ID is required');
    }
    const { user: buyer } = await fixtures.createBuyer();
    if (!buyer.email) {
      throw new Error('Buyer email is required');
    }
    const product = await fixtures.createProduct(seller.id, { stock: 5 });

    const sellerId = seller.id;
    const buyerEmail = buyer.email;
    const orderPromises = Array.from({ length: 10 }, async () => {
      try {
        await fixtures.reserveInventory(product.id, 1);
        return await fixtures.createOrder(buyerEmail, sellerId, {
          items: JSON.stringify([
            {
              product_id: product.id,
              quantity: 1,
              price: product.price,
            },
          ]),
        });
      } catch (error) {
        throw error;
      }
    });

    const results = await Promise.allSettled(orderPromises);
    const succeeded = results.filter((r) => r.status === 'fulfilled');

    expect(succeeded.length).toBeLessThanOrEqual(5);

    const finalProduct = await prisma.products.findUnique({
      where: { id: product.id },
    });

    expect(finalProduct?.stock).toBeGreaterThanOrEqual(0);
  });

  it('should maintain data consistency under concurrent writes', async () => {
    const { user: seller } = await fixtures.createSeller();
    const product = await fixtures.createProduct(seller.id, { stock: 100 });

    const decrementOps = Array.from({ length: 20 }, () =>
      fixtures.reserveInventory(product.id, 1)
    );

    const results = await Promise.allSettled(decrementOps);
    const succeeded = results.filter((r) => r.status === 'fulfilled');

    const finalProduct = await prisma.products.findUnique({
      where: { id: product.id },
    });

    expect(finalProduct?.stock).toBe(100 - succeeded.length);
  });

  it('should handle simultaneous cart updates from multiple users', async () => {
    const { user: seller } = await fixtures.createSeller();
    const product1 = await fixtures.createProduct(seller.id);
    const product2 = await fixtures.createProduct(seller.id);
    const cart = await fixtures.createCart(seller.id);

    await Promise.all([
      fixtures.addToCart(cart.id, product1.id, 2),
      fixtures.addToCart(cart.id, product2.id, 3),
      fixtures.addToCart(cart.id, product1.id, 1),
    ]);

    const updatedCart = await prisma.carts.findUnique({
      where: { id: cart.id },
    });

    const items = updatedCart?.items as any[];
    expect(items.length).toBeGreaterThanOrEqual(2);

    const product1Items = items.filter((i) => i.product_id === product1.id);
    const product2Items = items.filter((i) => i.product_id === product2.id);

    expect(product1Items).toHaveLength(1);
    expect(product2Items).toHaveLength(1);
    expect(product1Items[0].quantity).toBe(3);
    expect(product2Items[0].quantity).toBe(3);
  });

  it('should prevent race conditions in order status updates', async () => {
    const { user: seller } = await fixtures.createSeller();
    if (!seller.id) {
      throw new Error('Seller ID is required');
    }
    const { user: buyer } = await fixtures.createBuyer();
    if (!buyer.email) {
      throw new Error('Buyer email is required');
    }
    const order = await fixtures.createOrder(buyer.email, seller.id);

    await Promise.all([
      fixtures.updateOrderStatus(order.id, 'processing'),
      fixtures.updateOrderStatus(order.id, 'paid'),
      fixtures.updateOrderStatus(order.id, 'fulfilled'),
    ]);

    const finalOrder = await prisma.orders.findUnique({
      where: { id: order.id },
    });

    expect(finalOrder).toBeDefined();
    expect(['processing', 'paid', 'fulfilled']).toContain(finalOrder?.status);
  });
});
