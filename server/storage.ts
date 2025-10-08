import { 
  type User, 
  type InsertUser, 
  type Product, 
  type InsertProduct,
  type Order,
  type InsertOrder
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private orders: Map<string, Order>;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.seedProducts();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { ...insertProduct, id };
    this.products.set(id, product);
    return product;
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const order: Order = { ...insertOrder, id, createdAt };
    this.orders.set(id, order);
    return order;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    const updated = { ...product, ...updates };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, status };
    this.orders.set(id, updated);
    return updated;
  }

  private seedProducts() {
    const products: InsertProduct[] = [
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

    products.forEach((product) => {
      const id = randomUUID();
      this.products.set(id, { ...product, id });
    });
  }
}

export const storage = new MemStorage();
