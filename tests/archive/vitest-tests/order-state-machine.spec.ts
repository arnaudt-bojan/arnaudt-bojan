import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from '../setup/db-test-utils';
import { createFixtures } from '../setup/fixtures';
import type { OrderStatus } from '../../generated/prisma/index.js';

describe('Order State Machine @payments @integration', () => {
  let fixtures: ReturnType<typeof createFixtures>;

  beforeEach(async () => {
    await testDb.reset();
    fixtures = createFixtures(testDb.prisma);
  });

  it('should transition: pending → paid → fulfilled → delivered', async () => {
    const { seller, buyer, order } = await fixtures.createFullOrder();

    expect(order.status).toBe('pending');

    await fixtures.updateOrderStatus(order.id, 'paid');
    let updated = await testDb.prisma.orders.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe('paid');

    await fixtures.updateOrderStatus(order.id, 'fulfilled');
    updated = await testDb.prisma.orders.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe('fulfilled');

    await fixtures.updateOrderStatus(order.id, 'delivered');
    updated = await testDb.prisma.orders.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe('delivered');
  });

  it('should handle payment failure transition', async () => {
    const { order } = await fixtures.createFullOrder();

    await fixtures.updateOrderStatus(order.id, 'payment_failed');
    const updated = await testDb.prisma.orders.findUnique({ where: { id: order.id } });
    
    expect(updated?.status).toBe('payment_failed');
  });

  it('should handle refund status', async () => {
    const { order } = await fixtures.createFullOrder();

    await fixtures.updateOrderStatus(order.id, 'paid');
    await fixtures.updateOrderStatus(order.id, 'refunded');
    
    const updated = await testDb.prisma.orders.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe('refunded');
  });

  it('should handle cancellation from pending state', async () => {
    const { order } = await fixtures.createFullOrder();

    await fixtures.updateOrderStatus(order.id, 'canceled');
    const updated = await testDb.prisma.orders.findUnique({ where: { id: order.id } });
    
    expect(updated?.status).toBe('canceled');
  });

  it('should track order status history through timestamps', async () => {
    const { order } = await fixtures.createFullOrder();

    const timestamp1 = new Date();
    await fixtures.updateOrderStatus(order.id, 'paid');
    
    const timestamp2 = new Date();
    await fixtures.updateOrderStatus(order.id, 'fulfilled');

    const updated = await testDb.prisma.orders.findUnique({ where: { id: order.id } });
    
    expect(updated?.updatedAt).toBeDefined();
    expect(new Date(updated!.updatedAt!).getTime()).toBeGreaterThanOrEqual(timestamp1.getTime());
  });
});
