import type { PrismaClient, Prisma, OrderStatus } from '../../generated/prisma/index.js';
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
    const {
      wholesale_terms,
      users_wholesale_access_grants_seller_idTousers,
      users_wholesale_access_grants_buyer_idTousers,
      ...restOverrides
    } = overrides;
    return await this.prisma.wholesale_access_grants.create({
      data: {
        id: this.randomString('wholesale-grant'),
        seller_id: sellerId,
        buyer_id: buyerId,
        status: overrides.status || 'active',
        ...(wholesale_terms !== undefined && { wholesale_terms }),
        ...restOverrides,
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
        quotation_number: overrides.quotation_number || `QUOTE-${Date.now()}`,
        status: overrides.status || 'draft',
        currency: overrides.currency || 'USD',
        subtotal: overrides.subtotal || '0.00',
        total: overrides.total || '0.00',
        deposit_amount: overrides.deposit_amount ?? '0.00',
        balance_amount: overrides.balance_amount ?? '0.00',
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

  async createAdmin() {
    const user = await this.createUser({
      user_type: 'seller',
      role: 'admin',
      store_active: 1,
    });
    return { user };
  }

  async createFullOrder() {
    const { user: seller } = await this.createSeller();
    const { user: buyer } = await this.createBuyer();
    if (!seller.id) {
      throw new Error('Seller ID is required');
    }
    if (!buyer.email) {
      throw new Error('Buyer email is required');
    }
    const product = await this.createProduct(seller.id);
    if (!product.id) {
      throw new Error('Product ID is required');
    }
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

  async createCartItem(
    cartId: string,
    productId: string,
    quantity: number = 1,
    overrides: Partial<Prisma.cart_itemsCreateInput> = {}
  ) {
    return await this.prisma.cart_items.create({
      data: {
        id: this.randomString('cart-item'),
        product_id: productId,
        quantity,
        ...overrides,
      },
    });
  }

  async addToCart(
    cartId: string,
    productId: string,
    quantity: number = 1
  ) {
    const cart = await this.prisma.carts.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new Error(`Cart ${cartId} not found`);
    }

    const items = Array.isArray(cart.items) ? cart.items : [];
    const existingItemIndex = items.findIndex(
      (item: any) => item.product_id === productId
    );

    if (existingItemIndex >= 0) {
      const existingItem = items[existingItemIndex] as any;
      if (!existingItem) {
        throw new Error('Item not found at index');
      }
      existingItem.quantity += quantity;
    } else {
      items.push({
        product_id: productId,
        quantity,
        added_at: new Date().toISOString(),
      });
    }

    return await this.prisma.carts.update({
      where: { id: cartId },
      data: { items },
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return await this.prisma.orders.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async reserveInventory(productId: string, quantity: number) {
    if ('$transaction' in this.prisma) {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const product = await tx.products.findUnique({
          where: { id: productId },
          select: { stock: true },
        });

        if (!product) {
          throw new Error(`Product ${productId} not found`);
        }

        if (product.stock === null) {
          throw new Error(`Product ${productId} has null stock`);
        }

        if (product.stock < quantity) {
          throw new Error(
            `Insufficient inventory. Available: ${product.stock}, Requested: ${quantity}`
          );
        }

        return await tx.products.update({
          where: { id: productId },
          data: {
            stock: { decrement: quantity },
          },
        });
      });
    } else {
      const product = await this.prisma.products.findUnique({
        where: { id: productId },
        select: { stock: true },
      });

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      if (product.stock === null) {
        throw new Error(`Product ${productId} has null stock`);
      }

      if (product.stock < quantity) {
        throw new Error(
          `Insufficient inventory. Available: ${product.stock}, Requested: ${quantity}`
        );
      }

      return await this.prisma.products.update({
        where: { id: productId },
        data: {
          stock: { decrement: quantity },
        },
      });
    }
  }

  async createWholesaleCart(
    sellerId: string,
    buyerId: string,
    overrides: Partial<Prisma.wholesale_cartsCreateInput> = {}
  ) {
    return await this.prisma.wholesale_carts.create({
      data: {
        id: this.randomString('wholesale-cart'),
        seller_id: sellerId,
        buyer_id: buyerId,
        items: overrides.items || [],
        status: overrides.status || 'active',
        ...overrides,
      },
    });
  }

  async createWholesaleOrder(
    sellerId: string,
    buyerId: string,
    overrides: Partial<Prisma.wholesale_ordersCreateInput> = {}
  ) {
    return await this.prisma.wholesale_orders.create({
      data: {
        id: this.randomString('wholesale-order'),
        order_number: overrides.order_number || `WO-${Date.now()}`,
        seller_id: sellerId,
        buyer_id: buyerId,
        status: overrides.status || 'pending',
        subtotal: overrides.subtotal || '0.00',
        total: overrides.total || '0.00',
        currency: overrides.currency || 'USD',
        payment_terms: overrides.payment_terms || 'NET30',
        ...overrides,
      },
    });
  }

  async createQuotationLineItem(
    quotationId: string,
    overrides: Partial<Prisma.quotation_line_itemsCreateInput> = {}
  ) {
    return await this.prisma.quotation_line_items.create({
      data: {
        id: this.randomString('quotation-line-item'),
        quotation_id: quotationId,
        description: overrides.description || 'Test Line Item',
        quantity: overrides.quantity ?? 1,
        unit_price: overrides.unit_price || '100.00',
        total_price: overrides.total_price || '100.00',
        ...overrides,
      },
    });
  }

  async createPaymentIntent(
    orderId: string,
    overrides: Partial<Prisma.payment_intentsCreateInput> = {}
  ) {
    return await this.prisma.payment_intents.create({
      data: {
        id: this.randomString('payment-intent'),
        order_id: orderId,
        stripe_payment_intent_id: overrides.stripe_payment_intent_id || `pi_test_${randomBytes(8).toString('hex')}`,
        amount: overrides.amount || '99.99',
        currency: overrides.currency || 'USD',
        status: overrides.status || 'succeeded',
        ...overrides,
      },
    });
  }

  async createWholesaleInvitation(
    sellerId: string,
    overrides: Partial<Prisma.wholesale_invitationsCreateInput> = {}
  ) {
    return await this.prisma.wholesale_invitations.create({
      data: {
        id: this.randomString('wholesale-invitation'),
        seller_id: sellerId,
        buyer_email: overrides.buyer_email || this.randomEmail(),
        token: overrides.token || randomBytes(32).toString('hex'),
        status: overrides.status || 'pending',
        ...overrides,
      },
    });
  }

  async createRefund(
    orderId: string,
    overrides: Partial<Prisma.refundsCreateInput> = {}
  ) {
    return await this.prisma.refunds.create({
      data: {
        id: this.randomString('refund'),
        order_id: orderId,
        amount: overrides.amount || '99.99',
        reason: overrides.reason || 'requested_by_customer',
        status: overrides.status || 'pending',
        stripe_refund_id: overrides.stripe_refund_id || `re_test_${randomBytes(8).toString('hex')}`,
        ...overrides,
      },
    });
  }
}

export function createFixtures(
  prisma: PrismaClient | Prisma.TransactionClient,
  options?: FixtureOptions
): TestFixtures {
  return new TestFixtures(prisma, options);
}
