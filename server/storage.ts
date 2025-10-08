import { 
  type User, 
  type UpsertUser, 
  type Product, 
  type InsertProduct,
  type Order,
  type InsertOrder,
  type Invitation,
  type InsertInvitation,
  type MetaSettings,
  type TikTokSettings,
  type XSettings,
  type Newsletter,
  type InsertNewsletter,
  type NftMint,
  type InsertNftMint,
  users,
  products,
  orders,
  invitations,
  metaSettings,
  tiktokSettings,
  xSettings,
  newsletters,
  nftMints
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
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
  updateOrderBalancePaymentIntent(id: string, paymentIntentId: string): Promise<Order | undefined>;
  
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
  
  getNewslettersByUserId(userId: string): Promise<Newsletter[]>;
  getNewsletter(id: string): Promise<Newsletter | undefined>;
  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
  updateNewsletter(id: string, data: Partial<Newsletter>): Promise<Newsletter | undefined>;
  deleteNewsletter(id: string): Promise<boolean>;
  
  createNftMint(nftMint: InsertNftMint): Promise<NftMint>;
  getNftMintsByUserId(userId: string): Promise<NftMint[]>;
  getNftMintByOrderId(orderId: string): Promise<NftMint | undefined>;
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

  async updateOrderBalancePaymentIntent(id: string, paymentIntentId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orders).set({ stripeBalancePaymentIntentId: paymentIntentId }).where(eq(orders.id, id)).returning();
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
}

export const storage = new DatabaseStorage();
