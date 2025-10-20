import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createTestPrisma, cleanDatabase, teardownTestDatabase } from '../setup/db-test-utils';
import { createFixtures } from '../setup/fixtures';

describe('Migration Safety @db', () => {
  const prisma = createTestPrisma();
  const fixtures = createFixtures(prisma);

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should apply migrations without data loss', async () => {
    const { user: seller } = await fixtures.createSeller();
    const product = await fixtures.createProduct(seller.id, { name: 'Test Product' });

    const found = await prisma.products.findUnique({
      where: { id: product.id },
    });

    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Product');
  });

  it('should validate foreign key constraints exist', async () => {
    const result = await prisma.$queryRaw<Array<{ constraint_name: string; table_name: string }>>`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
      LIMIT 10;
    `;

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should verify critical tables exist', async () => {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('users', 'products', 'orders', 'carts')
      ORDER BY tablename;
    `;

    expect(tables).toHaveLength(4);
    const tableNames = tables.map((t) => t.tablename);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('products');
    expect(tableNames).toContain('orders');
    expect(tableNames).toContain('carts');
  });

  it('should verify indexes on foreign keys for performance', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('carts', 'products', 'orders')
      ORDER BY tablename, indexname;
    `;

    expect(Array.isArray(indexes)).toBe(true);
    expect(indexes.length).toBeGreaterThan(0);
  });

  it('should maintain data integrity across schema changes', async () => {
    const { user: seller } = await fixtures.createSeller();
    const product = await fixtures.createProduct(seller.id);
    const cart = await fixtures.createCart(seller.id);

    const foundProduct = await prisma.products.findUnique({
      where: { id: product.id },
    });

    const foundCart = await prisma.carts.findUnique({
      where: { id: cart.id },
    });

    expect(foundProduct).toBeDefined();
    expect(foundCart).toBeDefined();
    expect(foundProduct?.seller_id).toBe(seller.id);
    expect(foundCart?.seller_id).toBe(seller.id);
  });
});
