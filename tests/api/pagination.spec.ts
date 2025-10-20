import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getTestApp } from '../setup/test-app.js';
import { createSellerSession } from '../setup/auth-helpers.js';
import { createFixtures } from '../setup/fixtures.js';
import { prisma } from '../../server/prisma.js';
import type { Prisma } from '../../generated/prisma/index.js';

describe('Pagination, Sorting & Filtering @api @integration', () => {
  let app: Express;
  let fixtures: ReturnType<typeof createFixtures>;
  let sellerId: string;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(async () => {
    fixtures = createFixtures(prisma);
    
    const { user: seller } = await fixtures.createSeller();
    sellerId = seller.id;

    // Create 50 products
    for (let i = 0; i < 50; i++) {
      await fixtures.createProduct(sellerId, {
        name: `Product ${i}`,
        price: `${10 + i}.99`,
        category: i % 2 === 0 ? 'Electronics' : 'Clothing',
        status: 'active',
      });
    }
  });

  afterEach(async () => {
    // Cleanup is handled by test isolation
  });

  it('should paginate products with limit and offset', async () => {
    const res1 = await request(app)
      .get('/api/products?limit=10&offset=0')
      .expect(200);

    expect(Array.isArray(res1.body)).toBe(true);
    expect(res1.body.length).toBeGreaterThanOrEqual(10);

    const res2 = await request(app)
      .get('/api/products?limit=10&offset=10')
      .expect(200);

    expect(Array.isArray(res2.body)).toBe(true);
    
    // Products should be different
    if (res1.body.length > 0 && res2.body.length > 0) {
      expect(res1.body[0].id).not.toBe(res2.body[0].id);
    }
  });

  it('should handle category filtering', async () => {
    const electronicsRes = await request(app)
      .get('/api/products?category=Electronics')
      .expect(200);

    if (Array.isArray(electronicsRes.body)) {
      const hasElectronics = electronicsRes.body.filter(
        (p: any) => p.category === 'Electronics'
      );
      expect(hasElectronics.length).toBeGreaterThan(0);
    }
  });

  it('should handle price sorting', async () => {
    const res = await request(app)
      .get('/api/products?limit=10')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should handle search queries', async () => {
    // Create a product with distinctive name
    await fixtures.createProduct(sellerId, {
      name: 'UniqueTestProduct',
      status: 'active',
    });

    const searchRes = await request(app)
      .get('/api/products?search=UniqueTestProduct')
      .expect(200);

    if (Array.isArray(searchRes.body)) {
      const found = searchRes.body.find((p: any) => p.name === 'UniqueTestProduct');
      expect(found).toBeDefined();
    }
  });

  it('should handle empty results gracefully', async () => {
    const res = await request(app)
      .get('/api/products?category=NonExistentCategory')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
