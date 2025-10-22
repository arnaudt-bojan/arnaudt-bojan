import { describe, it, expect, beforeEach } from 'vitest';
import { mockQueue } from '../mocks/message-queue';

describe('Message Queue Events @events', () => {
  beforeEach(async () => {
    await mockQueue.clear();
  });

  it('should validate product created events', async () => {
    await mockQueue.publish({
      event: 'product.created',
      productId: 'prod_123',
      sellerId: 'seller_456',
      timestamp: new Date().toISOString(),
    });

    const events = await mockQueue.consume('product.created');
    expect(events).toHaveLength(1);
    expect(events[0].productId).toBe('prod_123');
    expect(events[0].sellerId).toBe('seller_456');
    expect(events[0].publishedAt).toBeDefined();
  });

  it('should reject invalid event schemas', async () => {
    await expect(
      mockQueue.publish({
        event: 'product.created',
        productId: 'prod_123',
      })
    ).rejects.toThrow(/Invalid event schema/);
  });

  it('should track order placement events', async () => {
    await mockQueue.publish({
      event: 'order.placed',
      orderId: 'order_789',
      userId: 'user_123',
      total: 99.99,
      timestamp: new Date().toISOString(),
    });

    const events = mockQueue.getAll();
    expect(events).toHaveLength(1);
    expect(events[0].publishedAt).toBeDefined();
    expect(events[0].orderId).toBe('order_789');
  });

  it('should validate inventory reserved events', async () => {
    await mockQueue.publish({
      event: 'inventory.reserved',
      productId: 'prod_456',
      quantity: 5,
      orderId: 'order_123',
      timestamp: new Date().toISOString(),
    });

    const events = await mockQueue.consume('inventory.reserved');
    expect(events).toHaveLength(1);
    expect(events[0].quantity).toBe(5);
  });

  it('should validate cart updated events', async () => {
    await mockQueue.publish({
      event: 'cart.updated',
      cartId: 'cart_999',
      userId: 'user_456',
      itemCount: 3,
      timestamp: new Date().toISOString(),
    });

    const events = await mockQueue.consume('cart.updated');
    expect(events).toHaveLength(1);
    expect(events[0].itemCount).toBe(3);
  });

  it('should reject events with invalid timestamps', async () => {
    await expect(
      mockQueue.publish({
        event: 'product.created',
        productId: 'prod_123',
        sellerId: 'seller_456',
        timestamp: 'invalid-timestamp',
      })
    ).rejects.toThrow(/Invalid event schema/);
  });

  it('should reject unknown event types', async () => {
    await expect(
      mockQueue.publish({
        event: 'unknown.event',
        data: 'some data',
      })
    ).rejects.toThrow(/Unknown event type/);
  });

  it('should handle multiple events in sequence', async () => {
    await mockQueue.publish({
      event: 'product.created',
      productId: 'prod_1',
      sellerId: 'seller_1',
      timestamp: new Date().toISOString(),
    });

    await mockQueue.publish({
      event: 'order.placed',
      orderId: 'order_1',
      userId: 'user_1',
      total: 50.0,
      timestamp: new Date().toISOString(),
    });

    await mockQueue.publish({
      event: 'inventory.reserved',
      productId: 'prod_1',
      quantity: 2,
      orderId: 'order_1',
      timestamp: new Date().toISOString(),
    });

    expect(mockQueue.getAll()).toHaveLength(3);
    expect(mockQueue.getCount('product.created')).toBe(1);
    expect(mockQueue.getCount('order.placed')).toBe(1);
    expect(mockQueue.getCount('inventory.reserved')).toBe(1);
  });

  it('should clear all messages', async () => {
    await mockQueue.publish({
      event: 'product.created',
      productId: 'prod_1',
      sellerId: 'seller_1',
      timestamp: new Date().toISOString(),
    });

    expect(mockQueue.getAll()).toHaveLength(1);

    await mockQueue.clear();

    expect(mockQueue.getAll()).toHaveLength(0);
  });

  it('should enforce positive total for order events', async () => {
    await expect(
      mockQueue.publish({
        event: 'order.placed',
        orderId: 'order_1',
        userId: 'user_1',
        total: -10.0,
        timestamp: new Date().toISOString(),
      })
    ).rejects.toThrow(/Invalid event schema/);
  });

  it('should enforce positive quantity for inventory events', async () => {
    await expect(
      mockQueue.publish({
        event: 'inventory.reserved',
        productId: 'prod_1',
        quantity: 0,
        orderId: 'order_1',
        timestamp: new Date().toISOString(),
      })
    ).rejects.toThrow(/Invalid event schema/);
  });
});
