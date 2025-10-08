import { 
  type User, 
  type UpsertUser, 
  type Product, 
  type InsertProduct,
  type Order,
  type InsertOrder,
  users,
  products,
  orders
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
    const result = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
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
}

export const storage = new DatabaseStorage();
