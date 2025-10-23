import { z } from 'zod';

const ProductCreatedSchema = z.object({
  event: z.literal('product.created'),
  productId: z.string(),
  sellerId: z.string(),
  timestamp: z.string().datetime(),
});

const OrderPlacedSchema = z.object({
  event: z.literal('order.placed'),
  orderId: z.string(),
  userId: z.string(),
  total: z.number().positive(),
  timestamp: z.string().datetime(),
});

const InventoryReservedSchema = z.object({
  event: z.literal('inventory.reserved'),
  productId: z.string(),
  quantity: z.number().positive(),
  orderId: z.string(),
  timestamp: z.string().datetime(),
});

const CartUpdatedSchema = z.object({
  event: z.literal('cart.updated'),
  cartId: z.string(),
  userId: z.string().optional(),
  itemCount: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

export class MockMessageQueue {
  private messages: any[] = [];

  async publish(event: any): Promise<void> {
    this.validateEvent(event);
    this.messages.push({
      ...event,
      publishedAt: new Date().toISOString(),
    });
  }

  async consume(eventType: string): Promise<any[]> {
    return this.messages.filter((m) => m.event === eventType);
  }

  async clear(): Promise<void> {
    this.messages = [];
  }

  getAll(): any[] {
    return [...this.messages];
  }

  getCount(eventType?: string): number {
    if (eventType) {
      return this.messages.filter((m) => m.event === eventType).length;
    }
    return this.messages.length;
  }

  private validateEvent(event: any): void {
    const schemas = {
      'product.created': ProductCreatedSchema,
      'order.placed': OrderPlacedSchema,
      'inventory.reserved': InventoryReservedSchema,
      'cart.updated': CartUpdatedSchema,
    };

    const schema = schemas[event.event as keyof typeof schemas];
    if (!schema) {
      throw new Error(`Unknown event type: ${event.event}`);
    }

    const result = schema.safeParse(event);
    if (!result.success) {
      throw new Error(`Invalid event schema: ${result.error.message}`);
    }
  }
}

export const mockQueue = new MockMessageQueue();
