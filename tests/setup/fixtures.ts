import type { PrismaClient, Prisma } from '../../generated/prisma/index.js';
import { randomBytes } from 'crypto';

export interface FixtureOptions {
  seed?: number;
}

export class TestFixtures {
  private seed: number;

  constructor(private prisma: PrismaClient | Prisma.TransactionClient, options: FixtureOptions = {}) {
    this.seed = options.seed ?? Date.now();
  }

  private randomString(prefix: string = 'test'): string {
    return `${prefix}-${randomBytes(4).toString('hex')}`;
  }

  private randomEmail(): string {
    return `test-${randomBytes(4).toString('hex')}@example.com`;
  }

  async createUser(overrides: Partial<Prisma.usersCreateInput> = {}) {
    const email = overrides.email || this.randomEmail();
    
    return await this.prisma.users.create({
      data: {
        id: this.randomString('user'),
        email,
        user_type: 'seller',
        username: overrides.username || email.split('@')[0],
        ...overrides,
      },
    });
  }


  async createProduct(
    sellerId: string,
    overrides: Partial<Prisma.productsCreateInput> = {}
  ) {
    const name = overrides.name || this.randomString('Product');
    return await this.prisma.products.create({
      data: {
        id: this.randomString('product'),
        seller_id: sellerId,
        name: name,
        description: overrides.description || 'Test product description',
        price: overrides.price || '99.99',
        image: overrides.image || '',
        category: overrides.category || 'Test Category',
        product_type: overrides.product_type || 'physical',
        status: overrides.status || 'active',
        stock: overrides.stock ?? 100,
        images: overrides.images || [],
        ...overrides,
      },
    });
  }

  async createOrder(
    buyerEmail: string,
    sellerId: string,
    overrides: Partial<Prisma.ordersCreateInput> = {}
  ) {
    return await this.prisma.orders.create({
      data: {
        id: this.randomString('order'),
        customer_email: buyerEmail,
        customer_name: overrides.customer_name || 'Test Customer',
        customer_address: overrides.customer_address || 'Test Address',
        seller_id: sellerId,
        status: overrides.status || 'pending',
        total: overrides.total || '99.99',
        currency: overrides.currency || 'USD',
        items: overrides.items || '[]',
        ...overrides,
      },
    });
  }

  async createCart(
    sellerId: string,
    buyerId?: string,
    overrides: Partial<Prisma.cartsCreateInput> = {}
  ) {
    return await this.prisma.carts.create({
      data: {
        id: this.randomString('cart'),
        seller_id: sellerId,
        buyer_id: buyerId || null,
        items: overrides.items || [],
        status: overrides.status || 'active',
        ...overrides,
      },
    });
  }

  async createWholesaleProduct(
    sellerId: string,
    overrides: Partial<Prisma.wholesale_productsCreateInput> = {}
  ) {
    return await this.prisma.wholesale_products.create({
      data: {
        id: this.randomString('wholesale-product'),
        seller_id: sellerId,
        name: overrides.name || this.randomString('Wholesale Product'),
        category: overrides.category || 'Test Category',
        description: overrides.description || 'Test wholesale product',
        rrp: overrides.rrp || '100.00',
        wholesale_price: overrides.wholesale_price || '50.00',
        stock: overrides.stock ?? 1000,
        moq: overrides.moq ?? 10,
        image: overrides.image || '',
        images: overrides.images || [],
        status: overrides.status || 'active',
        ...overrides,
      },
    });
  }

  async createWholesaleAccessGrant(
    sellerId: string,
    buyerId: string,
    overrides: Partial<Prisma.wholesale_access_grantsCreateInput> = {}
  ) {
    return await this.prisma.wholesale_access_grants.create({
      data: {
        id: this.randomString('wholesale-grant'),
        seller_id: sellerId,
        buyer_id: buyerId,
        status: overrides.status || 'active',
        wholesale_terms: overrides.wholesale_terms || null,
        ...overrides,
      },
    });
  }

  async createTradeQuotation(
    sellerId: string,
    buyerEmail: string,
    overrides: Partial<Prisma.trade_quotationsCreateInput> = {}
  ) {
    return await this.prisma.trade_quotations.create({
      data: {
        id: this.randomString('quotation'),
        seller_id: sellerId,
        buyer_email: buyerEmail,
        status: overrides.status || 'draft',
        currency: overrides.currency || 'USD',
        subtotal: overrides.subtotal || '0.00',
        total: overrides.total || '0.00',
        ...overrides,
      },
    });
  }

  async createNotification(
    userId: string,
    overrides: Partial<Prisma.notificationsCreateInput> = {}
  ) {
    return await this.prisma.notifications.create({
      data: {
        id: this.randomString('notification'),
        user_id: userId,
        type: overrides.type || 'info',
        title: overrides.title || 'Test Notification',
        message: overrides.message || 'Test notification message',
        read: overrides.read ?? 0,
        ...overrides,
      },
    });
  }

  async createSeller() {
    const user = await this.createUser({ 
      user_type: 'seller',
      store_active: 1,
    });
    return { user };
  }

  async createBuyer() {
    const user = await this.createUser({ user_type: 'buyer' });
    return { user };
  }

  async createFullOrder() {
    const { user: seller } = await this.createSeller();
    const { user: buyer } = await this.createBuyer();
    const product = await this.createProduct(seller.id);
    const order = await this.createOrder(buyer.email, seller.id, {
      items: JSON.stringify([
        {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          price: product.price.toString(),
        },
      ]),
      total: product.price,
    });

    return { seller, buyer, product, order };
  }
}

export function createFixtures(
  prisma: PrismaClient | Prisma.TransactionClient,
  options?: FixtureOptions
): TestFixtures {
  return new TestFixtures(prisma, options);
}
