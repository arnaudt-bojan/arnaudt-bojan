import { 
  type User, 
  type UpsertUser, 
  type Product, 
  type InsertProduct,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Invitation,
  type InsertInvitation,
  type MetaSettings,
  type TikTokSettings,
  type XSettings,
  type SubscriberGroup,
  type InsertSubscriberGroup,
  type Subscriber,
  type InsertSubscriber,
  type SubscriberGroupMembership,
  type InsertSubscriberGroupMembership,
  type Newsletter,
  type InsertNewsletter,
  type NewsletterTemplate,
  type InsertNewsletterTemplate,
  type NewsletterAnalytics,
  type InsertNewsletterAnalytics,
  type NewsletterEvent,
  type InsertNewsletterEvent,
  type NftMint,
  type InsertNftMint,
  type WholesaleProduct,
  type InsertWholesaleProduct,
  type WholesaleInvitation,
  type InsertWholesaleInvitation,
  type Category,
  type InsertCategory,
  type Notification,
  type InsertNotification,
  type AuthToken,
  type InsertAuthToken,
  users,
  products,
  orders,
  orderItems,
  invitations,
  metaSettings,
  tiktokSettings,
  xSettings,
  subscriberGroups,
  subscribers,
  subscriberGroupMemberships,
  newsletters,
  newsletterTemplates,
  newsletterAnalytics,
  newsletterEvents,
  nftMints,
  wholesaleProducts,
  wholesaleInvitations,
  categories,
  notifications,
  authTokens
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc, sql, and, lt } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getTeamMembersBySellerId(sellerId: string): Promise<User[]>;
  deleteTeamMember(userId: string, sellerId: string): Promise<boolean>;
  
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  getAllOrders(): Promise<Order[]>;
  getOrdersByUserId(userId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderTracking(id: string, trackingNumber: string, trackingLink: string): Promise<Order | undefined>;
  updateOrderBalancePaymentIntent(id: string, paymentIntentId: string): Promise<Order | undefined>;
  updateOrderFulfillmentStatus(orderId: string): Promise<Order | undefined>;
  
  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  getOrderItemById(itemId: string): Promise<OrderItem | undefined>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]>;
  updateOrderItemStatus(itemId: string, status: string): Promise<OrderItem | undefined>;
  updateOrderItemTracking(itemId: string, trackingNumber: string, trackingCarrier?: string, trackingUrl?: string): Promise<OrderItem | undefined>;
  
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  updateInvitationStatus(token: string, status: string): Promise<Invitation | undefined>;
  getAllInvitations(): Promise<Invitation[]>;
  
  saveMetaSettings(userId: string, settings: Partial<MetaSettings>): Promise<MetaSettings>;
  getMetaSettings(userId: string): Promise<MetaSettings | undefined>;
  deleteMetaSettings(userId: string): Promise<boolean>;
  
  saveTikTokSettings(userId: string, settings: Partial<TikTokSettings>): Promise<TikTokSettings>;
  getTikTokSettings(userId: string): Promise<TikTokSettings | undefined>;
  deleteTikTokSettings(userId: string): Promise<boolean>;
  
  saveXSettings(userId: string, settings: Partial<XSettings>): Promise<XSettings>;
  getXSettings(userId: string): Promise<XSettings | undefined>;
  deleteXSettings(userId: string): Promise<boolean>;
  
  // Subscriber Groups
  getSubscriberGroupsByUserId(userId: string): Promise<SubscriberGroup[]>;
  getSubscriberGroup(id: string): Promise<SubscriberGroup | undefined>;
  createSubscriberGroup(group: InsertSubscriberGroup): Promise<SubscriberGroup>;
  updateSubscriberGroup(id: string, data: Partial<SubscriberGroup>): Promise<SubscriberGroup | undefined>;
  deleteSubscriberGroup(id: string): Promise<boolean>;
  
  // Subscribers
  getSubscribersByUserId(userId: string): Promise<Subscriber[]>;
  getSubscribersByGroupId(userId: string, groupId: string): Promise<Subscriber[]>;
  getSubscriber(id: string): Promise<Subscriber | undefined>;
  getSubscriberByEmail(userId: string, email: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  updateSubscriber(id: string, data: Partial<Subscriber>): Promise<Subscriber | undefined>;
  deleteSubscriber(id: string): Promise<boolean>;
  addSubscriberToGroup(subscriberId: string, groupId: string): Promise<SubscriberGroupMembership>;
  removeSubscriberFromGroup(subscriberId: string, groupId: string): Promise<boolean>;
  
  // Newsletters
  getNewslettersByUserId(userId: string): Promise<Newsletter[]>;
  getNewsletter(id: string): Promise<Newsletter | undefined>;
  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
  updateNewsletter(id: string, data: Partial<Newsletter>): Promise<Newsletter | undefined>;
  deleteNewsletter(id: string): Promise<boolean>;
  
  // Newsletter Templates
  getNewsletterTemplatesByUserId(userId: string): Promise<NewsletterTemplate[]>;
  getNewsletterTemplate(id: string): Promise<NewsletterTemplate | undefined>;
  createNewsletterTemplate(template: InsertNewsletterTemplate): Promise<NewsletterTemplate>;
  updateNewsletterTemplate(id: string, data: Partial<NewsletterTemplate>): Promise<NewsletterTemplate | undefined>;
  deleteNewsletterTemplate(id: string): Promise<boolean>;
  
  // Newsletter Analytics
  getNewsletterAnalytics(newsletterId: string): Promise<NewsletterAnalytics | undefined>;
  getNewsletterAnalyticsByUserId(userId: string): Promise<NewsletterAnalytics[]>;
  createNewsletterAnalytics(analytics: InsertNewsletterAnalytics): Promise<NewsletterAnalytics>;
  updateNewsletterAnalytics(newsletterId: string, data: Partial<NewsletterAnalytics>): Promise<NewsletterAnalytics | undefined>;
  
  createNftMint(nftMint: InsertNftMint): Promise<NftMint>;
  getNftMintsByUserId(userId: string): Promise<NftMint[]>;
  getNftMintByOrderId(orderId: string): Promise<NftMint | undefined>;
  
  getAllWholesaleProducts(): Promise<WholesaleProduct[]>;
  getWholesaleProductsBySellerId(sellerId: string): Promise<WholesaleProduct[]>;
  getWholesaleProduct(id: string): Promise<WholesaleProduct | undefined>;
  createWholesaleProduct(product: InsertWholesaleProduct): Promise<WholesaleProduct>;
  updateWholesaleProduct(id: string, product: Partial<InsertWholesaleProduct>): Promise<WholesaleProduct | undefined>;
  deleteWholesaleProduct(id: string): Promise<boolean>;
  
  createWholesaleInvitation(invitation: InsertWholesaleInvitation): Promise<WholesaleInvitation>;
  getAllWholesaleInvitations(): Promise<WholesaleInvitation[]>;
  getWholesaleInvitationsBySellerId(sellerId: string): Promise<WholesaleInvitation[]>;
  getWholesaleInvitationByToken(token: string): Promise<WholesaleInvitation | undefined>;
  acceptWholesaleInvitation(token: string, buyerUserId: string): Promise<WholesaleInvitation | undefined>;
  deleteWholesaleInvitation(id: string): Promise<boolean>;
  
  getAllCategories(): Promise<Category[]>;
  getCategoriesByLevel(level: number): Promise<Category[]>;
  getCategoriesByParentId(parentId: string | null): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  
  createAuthToken(token: InsertAuthToken): Promise<AuthToken>;
  getAuthTokenByToken(token: string): Promise<AuthToken | undefined>;
  getAuthTokenByCode(email: string, code: string): Promise<AuthToken | undefined>;
  markAuthTokenAsUsed(id: string): Promise<AuthToken | undefined>;
  deleteExpiredAuthTokens(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  private db;
  private initialized: Promise<void>;
  private initError: Error | null = null;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
    
    this.initialized = this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.seedProducts();
    } catch (err) {
      console.error("Failed to seed database:", err);
      this.initError = err instanceof Error ? err : new Error(String(err));
    }
  }

  private async ensureInitialized() {
    await this.initialized;
    if (this.initError) {
      throw this.initError;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    await this.ensureInitialized();
    
    // Check if user exists by email or ID
    let existingUser: User | undefined;
    if (userData.email) {
      const byEmail = await this.db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      existingUser = byEmail[0];
    }
    if (!existingUser && userData.id) {
      const byId = await this.db.select().from(users).where(eq(users.id, userData.id)).limit(1);
      existingUser = byId[0];
    }

    if (existingUser) {
      // Update existing user
      const result = await this.db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return result[0];
    } else {
      // Insert new user
      const result = await this.db
        .insert(users)
        .values(userData)
        .returning();
      return result[0];
    }
  }

  async getAllProducts(): Promise<Product[]> {
    await this.ensureInitialized();
    return await this.db.select().from(products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    await this.ensureInitialized();
    const result = await this.db.insert(products).values(insertProduct).returning();
    return result[0];
  }

  async getAllOrders(): Promise<Order[]> {
    await this.ensureInitialized();
    return await this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    await this.ensureInitialized();
    return await this.db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    await this.ensureInitialized();
    const result = await this.db.insert(orders).values(insertOrder).returning();
    return result[0];
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(products).set(updates).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async updateOrderTracking(id: string, trackingNumber: string, trackingLink: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orders).set({ 
      trackingNumber, 
      trackingLink 
    }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async updateOrderBalancePaymentIntent(id: string, paymentIntentId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orders).set({ stripeBalancePaymentIntentId: paymentIntentId }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async updateOrderFulfillmentStatus(orderId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    
    // Get all items for this order
    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    
    if (items.length === 0) {
      return undefined;
    }
    
    // Count shipped items
    const shippedItems = items.filter(item => 
      item.itemStatus === 'shipped' || item.itemStatus === 'delivered'
    );
    
    // Determine fulfillment status
    let fulfillmentStatus: string;
    if (shippedItems.length === 0) {
      fulfillmentStatus = 'unfulfilled';
    } else if (shippedItems.length === items.length) {
      fulfillmentStatus = 'fulfilled';
    } else {
      fulfillmentStatus = 'partially_fulfilled';
    }
    
    const result = await this.db.update(orders)
      .set({ fulfillmentStatus })
      .where(eq(orders.id, orderId))
      .returning();
    
    return result[0];
  }

  // Order Items methods
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    await this.ensureInitialized();
    return await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(orderItems.createdAt);
  }

  async getOrderItemById(itemId: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
    return result[0];
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    await this.ensureInitialized();
    const result = await this.db.insert(orderItems).values(item).returning();
    return result[0];
  }

  async createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]> {
    await this.ensureInitialized();
    if (items.length === 0) return [];
    const result = await this.db.insert(orderItems).values(items).returning();
    return result;
  }

  async updateOrderItemStatus(itemId: string, status: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const updateData: any = { 
      itemStatus: status,
      updatedAt: new Date()
    };
    
    // Set timestamps based on status
    if (status === 'shipped') {
      updateData.shippedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }
    
    const result = await this.db.update(orderItems)
      .set(updateData)
      .where(eq(orderItems.id, itemId))
      .returning();
    
    return result[0];
  }

  async updateOrderItemTracking(itemId: string, trackingNumber: string, trackingCarrier?: string, trackingUrl?: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orderItems)
      .set({ 
        trackingNumber,
        trackingCarrier: trackingCarrier || null,
        trackingUrl: trackingUrl || null,
        trackingLink: trackingUrl || null, // Legacy field for backward compatibility
        itemStatus: 'shipped',
        shippedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orderItems.id, itemId))
      .returning();
    
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return await this.db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
    return result[0];
  }

  async getTeamMembersBySellerId(sellerId: string): Promise<User[]> {
    await this.ensureInitialized();
    return await this.db.select().from(users).where(eq(users.sellerId, sellerId)).orderBy(desc(users.createdAt));
  }

  async deleteTeamMember(userId: string, sellerId: string): Promise<boolean> {
    await this.ensureInitialized();
    // Only delete if the user belongs to this seller
    const result = await this.db
      .delete(users)
      .where(and(eq(users.id, userId), eq(users.sellerId, sellerId)))
      .returning();
    return result.length > 0;
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    await this.ensureInitialized();
    const result = await this.db.insert(invitations).values(insertInvitation).returning();
    return result[0];
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
    return result[0];
  }

  async updateInvitationStatus(token: string, status: string): Promise<Invitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(invitations).set({ status }).where(eq(invitations.token, token)).returning();
    return result[0];
  }

  async getAllInvitations(): Promise<Invitation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(invitations).orderBy(desc(invitations.createdAt));
  }

  private async seedProducts() {
    const existingProducts = await this.db.select().from(products).limit(1);
    if (existingProducts.length > 0) {
      return;
    }

    const seedData: InsertProduct[] = [
      {
        name: "Modern Minimalist Sneakers",
        description: "Premium white sneakers crafted with attention to detail. Features clean lines and comfortable fit for everyday wear.",
        price: "129.99",
        image: "/attached_assets/generated_images/White_minimalist_sneaker_product_66628b47.png",
        category: "Footwear",
        productType: "in-stock",
        stock: 25,
      },
      {
        name: "Luxury Leather Handbag",
        description: "Elegant black leather handbag with spacious interior. Perfect for professional or casual occasions.",
        price: "249.99",
        image: "/attached_assets/generated_images/Black_leather_luxury_handbag_4a25ef5d.png",
        category: "Accessories",
        productType: "pre-order",
        stock: 0,
      },
      {
        name: "Contemporary Streetwear Hoodie",
        description: "Comfortable charcoal gray hoodie with modern fit. Made from premium cotton blend fabric.",
        price: "89.99",
        image: "/attached_assets/generated_images/Gray_streetwear_hoodie_product_63dbef8c.png",
        category: "Apparel",
        productType: "made-to-order",
        stock: 0,
      },
      {
        name: "Artisan Ceramic Vase",
        description: "Handcrafted terracotta vase perfect for home decor. Each piece is unique with natural variations.",
        price: "79.99",
        image: "/attached_assets/generated_images/Terracotta_artisan_ceramic_vase_488f5cee.png",
        category: "Home Decor",
        productType: "in-stock",
        stock: 15,
      },
      {
        name: "Premium Silver Watch",
        description: "Sophisticated timepiece with silver case and black leather strap. Precision movement with elegant design.",
        price: "399.99",
        image: "/attached_assets/generated_images/Premium_silver_watch_product_aa3b209e.png",
        category: "Accessories",
        productType: "wholesale",
        stock: 0,
      },
      {
        name: "Geometric Black Sunglasses",
        description: "Modern sunglasses with geometric frame design. UV protection with style.",
        price: "149.99",
        image: "/attached_assets/generated_images/Black_geometric_sunglasses_product_8988d4ff.png",
        category: "Accessories",
        productType: "in-stock",
        stock: 40,
      },
      {
        name: "Luxury Boutique Candle",
        description: "Hand-poured candle in elegant glass container. Premium fragrance oils for a refined ambiance.",
        price: "45.99",
        image: "/attached_assets/generated_images/Luxury_boutique_candle_product_4eca2118.png",
        category: "Home Decor",
        productType: "pre-order",
        stock: 0,
      },
      {
        name: "Sustainable Canvas Tote",
        description: "Eco-friendly tote bag with leather straps. Spacious and durable for everyday use.",
        price: "59.99",
        image: "/attached_assets/generated_images/Canvas_tote_bag_product_cc1a5697.png",
        category: "Accessories",
        productType: "in-stock",
        stock: 30,
      },
    ];

    await this.db.insert(products).values(seedData);
  }

  async saveMetaSettings(userId: string, settings: Partial<MetaSettings>): Promise<MetaSettings> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(metaSettings)
      .values({
        userId,
        ...settings,
        connected: settings.connected ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: metaSettings.userId,
        set: {
          ...settings,
          connected: settings.connected ? 1 : 0,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async getMetaSettings(userId: string): Promise<MetaSettings | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(metaSettings).where(eq(metaSettings.userId, userId)).limit(1);
    return result[0];
  }

  async deleteMetaSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(metaSettings).where(eq(metaSettings.userId, userId));
    return true;
  }

  async saveTikTokSettings(userId: string, settings: Partial<TikTokSettings>): Promise<TikTokSettings> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(tiktokSettings)
      .values({
        userId,
        ...settings,
      })
      .onConflictDoUpdate({
        target: tiktokSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async getTikTokSettings(userId: string): Promise<TikTokSettings | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(tiktokSettings).where(eq(tiktokSettings.userId, userId)).limit(1);
    return result[0];
  }

  async deleteTikTokSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(tiktokSettings).where(eq(tiktokSettings.userId, userId));
    return true;
  }

  async saveXSettings(userId: string, settings: Partial<XSettings>): Promise<XSettings> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(xSettings)
      .values({
        userId,
        ...settings,
      })
      .onConflictDoUpdate({
        target: xSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async getXSettings(userId: string): Promise<XSettings | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(xSettings).where(eq(xSettings.userId, userId)).limit(1);
    return result[0];
  }

  async deleteXSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(xSettings).where(eq(xSettings.userId, userId));
    return true;
  }

  // Subscriber Groups
  async getSubscriberGroupsByUserId(userId: string): Promise<SubscriberGroup[]> {
    await this.ensureInitialized();
    return await this.db.select().from(subscriberGroups).where(eq(subscriberGroups.userId, userId)).orderBy(desc(subscriberGroups.createdAt));
  }

  async getSubscriberGroup(id: string): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(subscriberGroups).where(eq(subscriberGroups.id, id)).limit(1);
    return result[0];
  }

  async createSubscriberGroup(group: InsertSubscriberGroup): Promise<SubscriberGroup> {
    await this.ensureInitialized();
    const result = await this.db.insert(subscriberGroups).values(group).returning();
    return result[0];
  }

  async updateSubscriberGroup(id: string, data: Partial<SubscriberGroup>): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(subscriberGroups).set(data).where(eq(subscriberGroups.id, id)).returning();
    return result[0];
  }

  async deleteSubscriberGroup(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(subscriberGroups).where(eq(subscriberGroups.id, id));
    return true;
  }

  // Subscribers
  async getSubscribersByUserId(userId: string): Promise<Subscriber[]> {
    await this.ensureInitialized();
    return await this.db.select().from(subscribers).where(eq(subscribers.userId, userId)).orderBy(desc(subscribers.createdAt));
  }

  async getSubscribersByGroupId(userId: string, groupId: string): Promise<Subscriber[]> {
    await this.ensureInitialized();
    // Use SQL join to efficiently get subscribers in a specific group
    const result = await this.db
      .select({ 
        id: subscribers.id,
        userId: subscribers.userId,
        email: subscribers.email,
        name: subscribers.name,
        status: subscribers.status,
        createdAt: subscribers.createdAt
      })
      .from(subscribers)
      .innerJoin(subscriberGroupMemberships, eq(subscribers.id, subscriberGroupMemberships.subscriberId))
      .where(and(eq(subscribers.userId, userId), eq(subscriberGroupMemberships.groupId, groupId)));
    return result as Subscriber[];
  }

  async getSubscriber(id: string): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
    return result[0];
  }

  async getSubscriberByEmail(userId: string, email: string): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(subscribers).where(
      and(eq(subscribers.userId, userId), eq(subscribers.email, email))
    ).limit(1);
    return result[0];
  }

  async createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    await this.ensureInitialized();
    const result = await this.db.insert(subscribers).values(subscriber).returning();
    return result[0];
  }

  async updateSubscriber(id: string, data: Partial<Subscriber>): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(subscribers).set(data).where(eq(subscribers.id, id)).returning();
    return result[0];
  }

  async deleteSubscriber(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(subscribers).where(eq(subscribers.id, id));
    return true;
  }

  async addSubscriberToGroup(subscriberId: string, groupId: string): Promise<SubscriberGroupMembership> {
    await this.ensureInitialized();
    const result = await this.db.insert(subscriberGroupMemberships).values({ subscriberId, groupId }).returning();
    return result[0];
  }

  async removeSubscriberFromGroup(subscriberId: string, groupId: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(subscriberGroupMemberships).where(and(eq(subscriberGroupMemberships.subscriberId, subscriberId), eq(subscriberGroupMemberships.groupId, groupId)));
    return true;
  }

  // Newsletters
  async getNewslettersByUserId(userId: string): Promise<Newsletter[]> {
    await this.ensureInitialized();
    return await this.db.select().from(newsletters).where(eq(newsletters.userId, userId)).orderBy(desc(newsletters.createdAt));
  }

  async getNewsletter(id: string): Promise<Newsletter | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(newsletters).where(eq(newsletters.id, id)).limit(1);
    return result[0];
  }

  async createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    await this.ensureInitialized();
    const result = await this.db.insert(newsletters).values(newsletter).returning();
    return result[0];
  }

  async updateNewsletter(id: string, data: Partial<Newsletter>): Promise<Newsletter | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(newsletters)
      .set(data)
      .where(eq(newsletters.id, id))
      .returning();
    return result[0];
  }

  async deleteNewsletter(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(newsletters).where(eq(newsletters.id, id));
    return true;
  }

  // Newsletter Templates
  async getNewsletterTemplatesByUserId(userId: string): Promise<NewsletterTemplate[]> {
    await this.ensureInitialized();
    return await this.db.select().from(newsletterTemplates).where(eq(newsletterTemplates.userId, userId)).orderBy(desc(newsletterTemplates.updatedAt));
  }

  async getNewsletterTemplate(id: string): Promise<NewsletterTemplate | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(newsletterTemplates).where(eq(newsletterTemplates.id, id)).limit(1);
    return result[0];
  }

  async createNewsletterTemplate(template: InsertNewsletterTemplate): Promise<NewsletterTemplate> {
    await this.ensureInitialized();
    const result = await this.db.insert(newsletterTemplates).values(template).returning();
    return result[0];
  }

  async updateNewsletterTemplate(id: string, data: Partial<NewsletterTemplate>): Promise<NewsletterTemplate | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(newsletterTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(newsletterTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteNewsletterTemplate(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(newsletterTemplates).where(eq(newsletterTemplates.id, id));
    return true;
  }

  // Newsletter Analytics
  async getNewsletterAnalytics(newsletterId: string): Promise<NewsletterAnalytics | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(newsletterAnalytics).where(eq(newsletterAnalytics.newsletterId, newsletterId)).limit(1);
    return result[0];
  }

  async getNewsletterAnalyticsByUserId(userId: string): Promise<NewsletterAnalytics[]> {
    await this.ensureInitialized();
    const result = await this.db
      .select({
        id: newsletterAnalytics.id,
        newsletterId: newsletterAnalytics.newsletterId,
        userId: newsletterAnalytics.userId,
        totalSent: newsletterAnalytics.totalSent,
        totalDelivered: newsletterAnalytics.totalDelivered,
        totalOpened: newsletterAnalytics.totalOpened,
        totalClicked: newsletterAnalytics.totalClicked,
        totalBounced: newsletterAnalytics.totalBounced,
        totalUnsubscribed: newsletterAnalytics.totalUnsubscribed,
        openRate: newsletterAnalytics.openRate,
        clickRate: newsletterAnalytics.clickRate,
        bounceRate: newsletterAnalytics.bounceRate,
        createdAt: newsletterAnalytics.createdAt,
        lastUpdated: newsletterAnalytics.lastUpdated,
        newsletter: newsletters,
      })
      .from(newsletterAnalytics)
      .leftJoin(newsletters, eq(newsletterAnalytics.newsletterId, newsletters.id))
      .where(eq(newsletterAnalytics.userId, userId))
      .orderBy(desc(newsletterAnalytics.createdAt));
    return result as any;
  }

  async createNewsletterAnalytics(analytics: InsertNewsletterAnalytics): Promise<NewsletterAnalytics> {
    await this.ensureInitialized();
    // Use upsert to handle resends without failing
    const existing = await this.getNewsletterAnalytics(analytics.newsletterId);
    if (existing) {
      // Update existing record by adding to totalSent
      const result = await this.db
        .update(newsletterAnalytics)
        .set({
          totalSent: (existing.totalSent || 0) + (analytics.totalSent || 0),
          lastUpdated: new Date(),
        })
        .where(eq(newsletterAnalytics.newsletterId, analytics.newsletterId))
        .returning();
      return result[0];
    }
    const result = await this.db.insert(newsletterAnalytics).values(analytics).returning();
    return result[0];
  }

  async updateNewsletterAnalytics(newsletterId: string, data: Partial<NewsletterAnalytics>): Promise<NewsletterAnalytics | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(newsletterAnalytics).set(data).where(eq(newsletterAnalytics.newsletterId, newsletterId)).returning();
    return result[0];
  }

  // Newsletter Events
  async createNewsletterEvent(event: InsertNewsletterEvent): Promise<NewsletterEvent | null> {
    await this.ensureInitialized();
    try {
      const result = await this.db.insert(newsletterEvents).values(event).returning();
      return result[0];
    } catch (error: any) {
      // Only catch unique constraint violations (duplicate event) - propagate other errors
      if (error.code === '23505' || error.message?.includes('unique constraint')) {
        console.log('[Storage] Duplicate newsletter event, skipping:', event.eventType, event.recipientEmail);
        return null;
      }
      // Re-throw other database errors
      console.error('[Storage] Newsletter event creation error:', error);
      throw error;
    }
  }

  async getNewsletterEventsByNewsletterId(newsletterId: string): Promise<NewsletterEvent[]> {
    await this.ensureInitialized();
    return await this.db.select().from(newsletterEvents).where(eq(newsletterEvents.newsletterId, newsletterId));
  }

  async getNewsletterEventByWebhookId(webhookEventId: string): Promise<NewsletterEvent | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(newsletterEvents).where(eq(newsletterEvents.webhookEventId, webhookEventId)).limit(1);
    return result[0];
  }

  async createNftMint(nftMint: InsertNftMint): Promise<NftMint> {
    await this.ensureInitialized();
    const result = await this.db.insert(nftMints).values(nftMint).returning();
    return result[0];
  }

  async getNftMintsByUserId(userId: string): Promise<NftMint[]> {
    await this.ensureInitialized();
    return await this.db.select().from(nftMints).where(eq(nftMints.userId, userId)).orderBy(desc(nftMints.createdAt));
  }

  async getNftMintByOrderId(orderId: string): Promise<NftMint | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(nftMints).where(eq(nftMints.orderId, orderId)).limit(1);
    return result[0];
  }

  // Wholesale Products Methods
  async getAllWholesaleProducts(): Promise<WholesaleProduct[]> {
    await this.ensureInitialized();
    return await this.db.select().from(wholesaleProducts).orderBy(desc(wholesaleProducts.createdAt));
  }

  async getWholesaleProductsBySellerId(sellerId: string): Promise<WholesaleProduct[]> {
    await this.ensureInitialized();
    return await this.db.select().from(wholesaleProducts).where(eq(wholesaleProducts.sellerId, sellerId)).orderBy(desc(wholesaleProducts.createdAt));
  }

  async getWholesaleProduct(id: string): Promise<WholesaleProduct | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(wholesaleProducts).where(eq(wholesaleProducts.id, id)).limit(1);
    return result[0];
  }

  async createWholesaleProduct(product: InsertWholesaleProduct): Promise<WholesaleProduct> {
    await this.ensureInitialized();
    const result = await this.db.insert(wholesaleProducts).values(product).returning();
    return result[0];
  }

  async updateWholesaleProduct(id: string, product: Partial<InsertWholesaleProduct>): Promise<WholesaleProduct | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(wholesaleProducts)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(wholesaleProducts.id, id))
      .returning();
    return result[0];
  }

  async deleteWholesaleProduct(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(wholesaleProducts).where(eq(wholesaleProducts.id, id));
    return true;
  }

  // Wholesale Invitations Methods
  async createWholesaleInvitation(invitation: InsertWholesaleInvitation): Promise<WholesaleInvitation> {
    await this.ensureInitialized();
    // Generate a unique token for the invitation
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const result = await this.db.insert(wholesaleInvitations).values({ ...invitation, token }).returning();
    return result[0];
  }

  async getAllWholesaleInvitations(): Promise<WholesaleInvitation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(wholesaleInvitations).orderBy(desc(wholesaleInvitations.createdAt));
  }

  async getWholesaleInvitationsBySellerId(sellerId: string): Promise<WholesaleInvitation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(wholesaleInvitations).where(eq(wholesaleInvitations.sellerId, sellerId)).orderBy(desc(wholesaleInvitations.createdAt));
  }

  async getWholesaleInvitationByToken(token: string): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(wholesaleInvitations).where(eq(wholesaleInvitations.token, token)).limit(1);
    return result[0];
  }

  async acceptWholesaleInvitation(token: string, buyerUserId: string): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(wholesaleInvitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(wholesaleInvitations.token, token))
      .returning();
    return result[0];
  }

  async deleteWholesaleInvitation(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(wholesaleInvitations).where(eq(wholesaleInvitations.id, id));
    return true;
  }

  // Categories Methods
  async getAllCategories(): Promise<Category[]> {
    await this.ensureInitialized();
    return await this.db.select().from(categories).orderBy(categories.level, categories.name);
  }

  async getCategoriesByLevel(level: number): Promise<Category[]> {
    await this.ensureInitialized();
    return await this.db.select().from(categories).where(eq(categories.level, level)).orderBy(categories.name);
  }

  async getCategoriesByParentId(parentId: string | null): Promise<Category[]> {
    await this.ensureInitialized();
    if (parentId === null) {
      return await this.db.select().from(categories).where(eq(categories.parentId, sql`NULL`)).orderBy(categories.name);
    }
    return await this.db.select().from(categories).where(eq(categories.parentId, parentId)).orderBy(categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    await this.ensureInitialized();
    const result = await this.db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Notification Methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    await this.ensureInitialized();
    const result = await this.db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return result[0];
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(notifications)
      .set({ read: 1 })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async deleteNotification(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(notifications).where(eq(notifications.id, id));
    return true;
  }

  // Auth Token Methods
  async createAuthToken(token: InsertAuthToken): Promise<AuthToken> {
    await this.ensureInitialized();
    const result = await this.db.insert(authTokens).values(token).returning();
    return result[0];
  }

  async getAuthTokenByToken(token: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(authTokens)
      .where(eq(authTokens.token, token))
      .limit(1);
    return result[0];
  }

  async getAuthTokenByCode(email: string, code: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.email, email), eq(authTokens.code, code)))
      .limit(1);
    return result[0];
  }

  async markAuthTokenAsUsed(id: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(authTokens)
      .set({ used: 1 })
      .where(eq(authTokens.id, id))
      .returning();
    return result[0];
  }

  async deleteExpiredAuthTokens(): Promise<number> {
    await this.ensureInitialized();
    const result = await this.db
      .delete(authTokens)
      .where(lt(authTokens.expiresAt, new Date()))
      .returning();
    return result.length;
  }
}

export const storage = new DatabaseStorage();
