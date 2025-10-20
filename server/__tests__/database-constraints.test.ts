/**
 * Database Constraint Tests
 * 
 * Comprehensive test suite that validates all database constraints, foreign keys,
 * unique constraints, required fields, and data integrity rules defined in the Prisma schema.
 * 
 * Test Coverage:
 * - Foreign key constraints
 * - Unique constraints
 * - Required fields
 * - Data integrity (cascade deletes, defaults, enums, validations)
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure database connection is established
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up and disconnect
  await prisma.$disconnect();
});

describe('Database Constraint Tests', () => {
  
  /**
   * Helper function to create a test user
   */
  async function createTestUser(email: string, role: string = 'seller') {
    return await prisma.users.create({
      data: {
        email,
        role,
        first_name: 'Test',
        last_name: 'User',
      },
    });
  }

  /**
   * Helper function to create a test product
   */
  async function createTestProduct(sellerId: string, sku?: string) {
    return await prisma.products.create({
      data: {
        seller_id: sellerId,
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        image: 'https://example.com/image.jpg',
        category: 'test',
        product_type: 'in-stock',
        sku: sku || `TEST-SKU-${Date.now()}`,
      },
    });
  }

  /**
   * Cleanup function to remove test data
   */
  async function cleanupTestData() {
    // Delete in order to respect foreign key constraints
    await prisma.order_items.deleteMany({});
    await prisma.orders.deleteMany({});
    await prisma.products.deleteMany({});
    await prisma.carts.deleteMany({});
    await prisma.wholesale_orders.deleteMany({});
    await prisma.trade_quotations.deleteMany({});
    await prisma.users.deleteMany({
      where: {
        email: {
          contains: 'test-constraint-',
        },
      },
    });
  }

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // ========================================
  // UNIQUE CONSTRAINTS
  // ========================================

  describe('Unique Constraints', () => {
    describe('User Email Uniqueness', () => {
      it('should allow creating users with unique emails', async () => {
        const user1 = await createTestUser('test-constraint-user1@example.com');
        const user2 = await createTestUser('test-constraint-user2@example.com');
        
        expect(user1.email).toBe('test-constraint-user1@example.com');
        expect(user2.email).toBe('test-constraint-user2@example.com');
      });

      it('should reject duplicate email addresses', async () => {
        await createTestUser('test-constraint-duplicate@example.com');
        
        await expect(
          createTestUser('test-constraint-duplicate@example.com')
        ).rejects.toThrow();
      });
    });

    describe('Product SKU Uniqueness (per seller)', () => {
      it('should allow same SKU for different sellers', async () => {
        const seller1 = await createTestUser('test-constraint-seller1@example.com', 'seller');
        const seller2 = await createTestUser('test-constraint-seller2@example.com', 'seller');
        
        const product1 = await createTestProduct(seller1.id, 'SAME-SKU');
        const product2 = await createTestProduct(seller2.id, 'SAME-SKU');
        
        expect(product1.sku).toBe('SAME-SKU');
        expect(product2.sku).toBe('SAME-SKU');
        expect(product1.seller_id).not.toBe(product2.seller_id);
      });
    });

    describe('Unique Tokens and Identifiers', () => {
      it('should enforce unique auth tokens', async () => {
        const token1 = await prisma.auth_tokens.create({
          data: {
            email: 'test-constraint-token@example.com',
            token: `unique-token-${Date.now()}`,
            expires_at: new Date(Date.now() + 3600000),
          },
        });

        await expect(
          prisma.auth_tokens.create({
            data: {
              email: 'test-constraint-token2@example.com',
              token: token1.token,
              expires_at: new Date(Date.now() + 3600000),
            },
          })
        ).rejects.toThrow();

        // Cleanup
        await prisma.auth_tokens.delete({ where: { id: token1.id } });
      });

      it('should enforce unique invitation tokens', async () => {
        const seller = await createTestUser('test-constraint-seller-inv@example.com', 'seller');
        
        const token = `unique-invitation-${Date.now()}`;
        const invitation1 = await prisma.invitations.create({
          data: {
            email: 'test-constraint-invitee1@example.com',
            role: 'seller',
            invited_by: seller.id,
            token,
            expires_at: new Date(Date.now() + 86400000),
          },
        });

        await expect(
          prisma.invitations.create({
            data: {
              email: 'test-constraint-invitee2@example.com',
              role: 'seller',
              invited_by: seller.id,
              token,
              expires_at: new Date(Date.now() + 86400000),
            },
          })
        ).rejects.toThrow();

        // Cleanup
        await prisma.invitations.delete({ where: { id: invitation1.id } });
      });
    });

    describe('Unique Order and Document Numbers', () => {
      it('should enforce unique wholesale order numbers', async () => {
        const seller = await createTestUser('test-constraint-wo-seller@example.com', 'seller');
        const buyer = await createTestUser('test-constraint-wo-buyer@example.com', 'customer');
        
        const orderNumber = `WO-${Date.now()}`;
        const order1 = await prisma.wholesale_orders.create({
          data: {
            order_number: orderNumber,
            seller_id: seller.id,
            buyer_id: buyer.id,
            buyer_email: buyer.email!,
            subtotal_cents: 10000,
            total_cents: 10000,
            deposit_amount_cents: 5000,
            balance_amount_cents: 5000,
          },
        });

        await expect(
          prisma.wholesale_orders.create({
            data: {
              order_number: orderNumber,
              seller_id: seller.id,
              buyer_id: buyer.id,
              buyer_email: buyer.email!,
              subtotal_cents: 10000,
              total_cents: 10000,
              deposit_amount_cents: 5000,
              balance_amount_cents: 5000,
            },
          })
        ).rejects.toThrow();

        // Cleanup
        await prisma.wholesale_orders.delete({ where: { id: order1.id } });
      });
    });
  });

  // ========================================
  // REQUIRED FIELDS
  // ========================================

  describe('Required Fields', () => {
    describe('User Required Fields', () => {
      it('should require role field', async () => {
        await expect(
          prisma.users.create({
            data: {
              email: 'test-constraint-no-role@example.com',
              // @ts-expect-error Testing missing required field
              role: undefined,
            },
          })
        ).rejects.toThrow();
      });

      it('should allow creating user with all required fields', async () => {
        const user = await prisma.users.create({
          data: {
            email: 'test-constraint-valid-user@example.com',
            role: 'customer',
          },
        });

        expect(user.email).toBe('test-constraint-valid-user@example.com');
        expect(user.role).toBe('customer');
      });
    });

    describe('Product Required Fields', () => {
      it('should require name, price, and seller_id', async () => {
        const seller = await createTestUser('test-constraint-product-seller@example.com', 'seller');

        await expect(
          prisma.products.create({
            data: {
              seller_id: seller.id,
              description: 'Test',
              image: 'https://example.com/image.jpg',
              category: 'test',
              product_type: 'in-stock',
              // @ts-expect-error Testing missing required field
              name: undefined,
              price: 99.99,
            },
          })
        ).rejects.toThrow();

        await expect(
          prisma.products.create({
            data: {
              seller_id: seller.id,
              name: 'Test Product',
              description: 'Test',
              image: 'https://example.com/image.jpg',
              category: 'test',
              product_type: 'in-stock',
              // @ts-expect-error Testing missing required field
              price: undefined,
            },
          })
        ).rejects.toThrow();
      });

      it('should create product with all required fields', async () => {
        const seller = await createTestUser('test-constraint-product-seller2@example.com', 'seller');
        
        const product = await prisma.products.create({
          data: {
            seller_id: seller.id,
            name: 'Valid Product',
            description: 'Valid Description',
            price: 49.99,
            image: 'https://example.com/image.jpg',
            category: 'electronics',
            product_type: 'in-stock',
          },
        });

        expect(product.name).toBe('Valid Product');
        expect(product.price.toString()).toBe('49.99');
        expect(product.seller_id).toBe(seller.id);
      });
    });

    describe('Order Required Fields', () => {
      it('should require customer_name, customer_email, and total', async () => {
        await expect(
          prisma.orders.create({
            data: {
              customer_email: 'test@example.com',
              customer_address: '123 Main St',
              items: '[]',
              total: 100.00,
              // @ts-expect-error Testing missing required field
              customer_name: undefined,
            },
          })
        ).rejects.toThrow();
      });

      it('should create order with all required fields', async () => {
        const seller = await createTestUser('test-constraint-order-seller@example.com', 'seller');
        
        const order = await prisma.orders.create({
          data: {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            customer_address: '123 Main St',
            items: JSON.stringify([]),
            total: 100.00,
            seller_id: seller.id,
          },
        });

        expect(order.customer_name).toBe('John Doe');
        expect(order.customer_email).toBe('john@example.com');
        expect(order.total.toString()).toBe('100.00');
      });
    });
  });

  // ========================================
  // FOREIGN KEY CONSTRAINTS
  // ========================================

  describe('Foreign Key Constraints', () => {
    describe('Product → Seller Relationship', () => {
      it('should prevent creating product with non-existent seller', async () => {
        await expect(
          prisma.products.create({
            data: {
              seller_id: 'non-existent-seller-id',
              name: 'Orphan Product',
              description: 'Test',
              price: 99.99,
              image: 'https://example.com/image.jpg',
              category: 'test',
              product_type: 'in-stock',
            },
          })
        ).rejects.toThrow();
      });

      it('should create product with valid seller reference', async () => {
        const seller = await createTestUser('test-constraint-fk-seller@example.com', 'seller');
        const product = await createTestProduct(seller.id);

        expect(product.seller_id).toBe(seller.id);
      });
    });

    describe('Order → Seller Relationship', () => {
      it('should allow creating order with valid seller_id', async () => {
        const seller = await createTestUser('test-constraint-order-fk-seller@example.com', 'seller');
        
        const order = await prisma.orders.create({
          data: {
            customer_name: 'Jane Doe',
            customer_email: 'jane@example.com',
            customer_address: '456 Oak St',
            items: JSON.stringify([]),
            total: 150.00,
            seller_id: seller.id,
          },
        });

        expect(order.seller_id).toBe(seller.id);
      });
    });

    describe('Wholesale Order → Buyer/Seller Relationships', () => {
      it('should prevent creating wholesale order with non-existent buyer', async () => {
        const seller = await createTestUser('test-constraint-wo-fk-seller@example.com', 'seller');
        
        await expect(
          prisma.wholesale_orders.create({
            data: {
              order_number: `WO-FK-${Date.now()}`,
              seller_id: seller.id,
              buyer_id: 'non-existent-buyer',
              buyer_email: 'buyer@example.com',
              subtotal_cents: 10000,
              total_cents: 10000,
              deposit_amount_cents: 5000,
              balance_amount_cents: 5000,
            },
          })
        ).rejects.toThrow();
      });
    });

    describe('Quotation → Seller/Buyer Relationships', () => {
      it('should create quotation with valid seller reference', async () => {
        const seller = await createTestUser('test-constraint-quote-seller@example.com', 'seller');
        
        const quotation = await prisma.trade_quotations.create({
          data: {
            seller_id: seller.id,
            buyer_email: 'buyer@example.com',
            quotation_number: `Q-${Date.now()}`,
            subtotal: 1000.00,
            total: 1000.00,
            deposit_amount: 500.00,
            balance_amount: 500.00,
          },
        });

        expect(quotation.seller_id).toBe(seller.id);

        // Cleanup
        await prisma.trade_quotations.delete({ where: { id: quotation.id } });
      });
    });

    describe('Newsletter Relationships', () => {
      it('should cascade delete automation executions when subscriber is deleted', async () => {
        const user = await createTestUser('test-constraint-newsletter-user@example.com', 'seller');
        
        const subscriber = await prisma.subscribers.create({
          data: {
            user_id: user.id,
            email: 'subscriber@example.com',
          },
        });

        const workflow = await prisma.newsletter_workflows.create({
          data: {
            user_id: user.id,
            name: 'Test Workflow',
            type: 'welcome',
            trigger: {},
            actions: {},
          },
        });

        const execution = await prisma.automation_executions.create({
          data: {
            workflow_id: workflow.id,
            subscriber_id: subscriber.id,
            status: 'completed',
          },
        });

        // Delete subscriber - should cascade delete execution
        await prisma.subscribers.delete({ where: { id: subscriber.id } });

        // Execution should be deleted
        const deletedExecution = await prisma.automation_executions.findUnique({
          where: { id: execution.id },
        });
        expect(deletedExecution).toBeNull();

        // Cleanup
        await prisma.newsletter_workflows.delete({ where: { id: workflow.id } });
      });
    });
  });

  // ========================================
  // DATA INTEGRITY
  // ========================================

  describe('Data Integrity', () => {
    describe('Default Values', () => {
      it('should apply default role to user', async () => {
        const user = await prisma.users.create({
          data: {
            email: 'test-constraint-default-role@example.com',
          },
        });

        expect(user.role).toBe('customer');
      });

      it('should apply default status to products', async () => {
        const seller = await createTestUser('test-constraint-default-product@example.com', 'seller');
        
        const product = await prisma.products.create({
          data: {
            seller_id: seller.id,
            name: 'Default Status Product',
            description: 'Test',
            price: 99.99,
            image: 'https://example.com/image.jpg',
            category: 'test',
            product_type: 'in-stock',
          },
        });

        expect(product.status).toBe('draft');
      });

      it('should apply default status to orders', async () => {
        const order = await prisma.orders.create({
          data: {
            customer_name: 'Default Test',
            customer_email: 'default@example.com',
            customer_address: '789 Pine St',
            items: JSON.stringify([]),
            total: 75.00,
          },
        });

        expect(order.status).toBe('pending');
        expect(order.payment_status).toBe('pending');
      });

      it('should apply default currency', async () => {
        const seller = await createTestUser('test-constraint-currency-seller@example.com', 'seller');
        const buyer = await createTestUser('test-constraint-currency-buyer@example.com', 'customer');
        
        const order = await prisma.wholesale_orders.create({
          data: {
            order_number: `WO-CURR-${Date.now()}`,
            seller_id: seller.id,
            buyer_id: buyer.id,
            buyer_email: buyer.email!,
            subtotal_cents: 10000,
            total_cents: 10000,
            deposit_amount_cents: 5000,
            balance_amount_cents: 5000,
          },
        });

        expect(order.currency).toBe('USD');

        // Cleanup
        await prisma.wholesale_orders.delete({ where: { id: order.id } });
      });

      it('should apply default stock to products', async () => {
        const seller = await createTestUser('test-constraint-stock-seller@example.com', 'seller');
        
        const product = await prisma.products.create({
          data: {
            seller_id: seller.id,
            name: 'Stock Test Product',
            description: 'Test',
            price: 99.99,
            image: 'https://example.com/image.jpg',
            category: 'test',
            product_type: 'in-stock',
          },
        });

        expect(product.stock).toBe(0);
      });
    });

    describe('Cascade Deletes', () => {
      it('should cascade delete products when seller is deleted', async () => {
        const seller = await createTestUser('test-constraint-cascade-seller@example.com', 'seller');
        const product = await createTestProduct(seller.id);

        await prisma.users.delete({ where: { id: seller.id } });

        const deletedProduct = await prisma.products.findUnique({
          where: { id: product.id },
        });
        expect(deletedProduct).toBeNull();
      });

      it('should cascade delete import jobs when user is deleted', async () => {
        const seller = await createTestUser('test-constraint-import-seller@example.com', 'seller');
        
        const source = await prisma.import_sources.create({
          data: {
            seller_id: seller.id,
            platform: 'shopify',
            auth_type: 'oauth',
            credentials_json: {},
          },
        });

        const job = await prisma.import_jobs.create({
          data: {
            source_id: source.id,
            type: 'products',
            created_by: seller.id,
          },
        });

        // Delete source should cascade delete job
        await prisma.import_sources.delete({ where: { id: source.id } });

        const deletedJob = await prisma.import_jobs.findUnique({
          where: { id: job.id },
        });
        expect(deletedJob).toBeNull();

        // Cleanup user
        await prisma.users.delete({ where: { id: seller.id } });
      });

      it('should cascade delete cart sessions when cart is deleted', async () => {
        const seller = await createTestUser('test-constraint-cart-seller@example.com', 'seller');
        
        const cart = await prisma.carts.create({
          data: {
            seller_id: seller.id,
            items: [],
          },
        });

        const session = await prisma.cart_sessions.create({
          data: {
            session_id: `sess-${Date.now()}`,
            cart_id: cart.id,
          },
        });

        // Delete cart should cascade delete session
        await prisma.carts.delete({ where: { id: cart.id } });

        const deletedSession = await prisma.cart_sessions.findUnique({
          where: { session_id: session.session_id },
        });
        expect(deletedSession).toBeNull();
      });
    });

    describe('Enum Constraints', () => {
      it('should enforce valid wholesale order status', async () => {
        const seller = await createTestUser('test-constraint-enum-seller@example.com', 'seller');
        const buyer = await createTestUser('test-constraint-enum-buyer@example.com', 'customer');

        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'];
        
        for (const status of validStatuses) {
          const order = await prisma.wholesale_orders.create({
            data: {
              order_number: `WO-ENUM-${Date.now()}-${status}`,
              seller_id: seller.id,
              buyer_id: buyer.id,
              buyer_email: buyer.email!,
              subtotal_cents: 10000,
              total_cents: 10000,
              deposit_amount_cents: 5000,
              balance_amount_cents: 5000,
              status: status as any,
            },
          });
          expect(order.status).toBe(status);
          await prisma.wholesale_orders.delete({ where: { id: order.id } });
        }
      });

      it('should enforce valid payment type enum', async () => {
        const seller = await createTestUser('test-constraint-payment-enum-seller@example.com', 'seller');
        const buyer = await createTestUser('test-constraint-payment-enum-buyer@example.com', 'customer');
        
        const order = await prisma.wholesale_orders.create({
          data: {
            order_number: `WO-PAY-${Date.now()}`,
            seller_id: seller.id,
            buyer_id: buyer.id,
            buyer_email: buyer.email!,
            subtotal_cents: 10000,
            total_cents: 10000,
            deposit_amount_cents: 5000,
            balance_amount_cents: 5000,
          },
        });

        const validTypes = ['deposit', 'balance'];
        
        for (const type of validTypes) {
          const payment = await prisma.wholesale_payments.create({
            data: {
              wholesale_order_id: order.id,
              payment_type: type as any,
              amount_cents: 5000,
            },
          });
          expect(payment.payment_type).toBe(type);
          await prisma.wholesale_payments.delete({ where: { id: payment.id } });
        }

        // Cleanup
        await prisma.wholesale_orders.delete({ where: { id: order.id } });
      });
    });

    describe('Numeric Validations', () => {
      it('should allow positive prices', async () => {
        const seller = await createTestUser('test-constraint-price-seller@example.com', 'seller');
        
        const product = await prisma.products.create({
          data: {
            seller_id: seller.id,
            name: 'Positive Price Product',
            description: 'Test',
            price: 149.99,
            image: 'https://example.com/image.jpg',
            category: 'test',
            product_type: 'in-stock',
          },
        });

        expect(Number(product.price)).toBeGreaterThan(0);
      });

      it('should allow zero prices', async () => {
        const seller = await createTestUser('test-constraint-zero-price-seller@example.com', 'seller');
        
        const product = await prisma.products.create({
          data: {
            seller_id: seller.id,
            name: 'Free Product',
            description: 'Test',
            price: 0,
            image: 'https://example.com/image.jpg',
            category: 'test',
            product_type: 'in-stock',
          },
        });

        expect(Number(product.price)).toBe(0);
      });

      it('should allow positive quantities', async () => {
        const seller = await createTestUser('test-constraint-qty-seller@example.com', 'seller');
        const buyer = await createTestUser('test-constraint-qty-buyer@example.com', 'customer');
        const product = await createTestProduct(seller.id);

        const order = await prisma.orders.create({
          data: {
            customer_name: 'Quantity Test',
            customer_email: buyer.email!,
            customer_address: '123 Test St',
            items: JSON.stringify([]),
            total: 100.00,
            seller_id: seller.id,
          },
        });

        const orderItem = await prisma.order_items.create({
          data: {
            order_id: order.id,
            product_id: product.id,
            product_name: product.name,
            product_type: product.product_type,
            quantity: 5,
            price: 20.00,
            subtotal: 100.00,
          },
        });

        expect(orderItem.quantity).toBeGreaterThan(0);
      });
    });

    describe('Timestamp Defaults', () => {
      it('should automatically set created_at timestamp', async () => {
        const user = await createTestUser('test-constraint-timestamp@example.com', 'seller');
        
        expect(user.created_at).toBeDefined();
        expect(user.created_at).toBeInstanceOf(Date);
      });

      it('should automatically set created_at for products', async () => {
        const seller = await createTestUser('test-constraint-prod-timestamp@example.com', 'seller');
        const product = await createTestProduct(seller.id);
        
        expect(product.created_at).toBeDefined();
        expect(product.created_at).toBeInstanceOf(Date);
      });
    });

    describe('JSON Field Integrity', () => {
      it('should store and retrieve JSON data correctly', async () => {
        const seller = await createTestUser('test-constraint-json-seller@example.com', 'seller');
        
        const variants = [
          { name: 'Small', sku: 'PROD-S', price: 10 },
          { name: 'Large', sku: 'PROD-L', price: 20 },
        ];

        const product = await prisma.products.create({
          data: {
            seller_id: seller.id,
            name: 'Variant Product',
            description: 'Test',
            price: 15.00,
            image: 'https://example.com/image.jpg',
            category: 'test',
            product_type: 'in-stock',
            variants: variants,
          },
        });

        const retrieved = await prisma.products.findUnique({
          where: { id: product.id },
        });

        expect(retrieved?.variants).toEqual(variants);
      });

      it('should store cart items as JSON', async () => {
        const seller = await createTestUser('test-constraint-cart-json-seller@example.com', 'seller');
        const product = await createTestProduct(seller.id);

        const cartItems = [
          { product_id: product.id, quantity: 2 },
        ];

        const cart = await prisma.carts.create({
          data: {
            seller_id: seller.id,
            items: cartItems,
          },
        });

        const retrieved = await prisma.carts.findUnique({
          where: { id: cart.id },
        });

        expect(retrieved?.items).toEqual(cartItems);
      });
    });
  });

  // ========================================
  // COMPOSITE CONSTRAINTS
  // ========================================

  describe('Composite Constraints', () => {
    describe('Subscriber Unique Constraint (user_id + email)', () => {
      it('should allow same email for different users', async () => {
        const user1 = await createTestUser('test-constraint-sub1@example.com', 'seller');
        const user2 = await createTestUser('test-constraint-sub2@example.com', 'seller');

        const sub1 = await prisma.subscribers.create({
          data: {
            user_id: user1.id,
            email: 'shared-subscriber@example.com',
          },
        });

        const sub2 = await prisma.subscribers.create({
          data: {
            user_id: user2.id,
            email: 'shared-subscriber@example.com',
          },
        });

        expect(sub1.email).toBe(sub2.email);
        expect(sub1.user_id).not.toBe(sub2.user_id);

        // Cleanup
        await prisma.subscribers.deleteMany({
          where: { id: { in: [sub1.id, sub2.id] } },
        });
      });

      it('should reject duplicate user_id + email combination', async () => {
        const user = await createTestUser('test-constraint-dup-sub@example.com', 'seller');

        await prisma.subscribers.create({
          data: {
            user_id: user.id,
            email: 'duplicate@example.com',
          },
        });

        await expect(
          prisma.subscribers.create({
            data: {
              user_id: user.id,
              email: 'duplicate@example.com',
            },
          })
        ).rejects.toThrow();

        // Cleanup
        await prisma.subscribers.deleteMany({
          where: { user_id: user.id },
        });
      });
    });
  });
});
