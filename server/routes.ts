import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertProductSchema, orderStatusEnum } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import { setupAuth, isAuthenticated, isSeller } from "./replitAuth";
import Stripe from "stripe";
import { getExchangeRates, getUserCurrency } from "./currencyService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import emailAuthRoutes from "./auth-email";
import { createNotificationService } from "./notifications";

// Initialize notification service
const notificationService = createNotificationService(storage);

// Reference: javascript_stripe integration
// Initialize Stripe with secret key when available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });
}

// Helper function to generate random 8-digit username
function generateRandomUsername(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function generateUniqueUsername(): Promise<string> {
  const allUsers = await storage.getAllUsers();
  let username = generateRandomUsername();
  let attempts = 0;
  
  while (allUsers.some(u => u.username === username) && attempts < 10) {
    username = generateRandomUsername();
    attempts++;
  }
  
  return username;
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Email-based authentication routes
  app.use("/api/auth/email", emailAuthRoutes);

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify notification ownership before updating
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      if (notification.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to access this notification" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(id);
      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify notification ownership before deleting
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      if (notification.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to access this notification" });
      }
      
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/sellers", async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const sellers = allUsers.filter(u => 
        u.role === "seller" || u.role === "owner" || u.role === "admin"
      );
      res.json(sellers);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ error: "Failed to fetch sellers" });
    }
  });
  
  // Get seller by username
  app.get("/api/sellers/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const allUsers = await storage.getAllUsers();
      const seller = allUsers.find(u => 
        u.username === username && (u.role === "seller" || u.role === "owner" || u.role === "admin")
      );
      
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }
      
      res.json(seller);
    } catch (error) {
      console.error("Error fetching seller:", error);
      res.status(500).json({ error: "Failed to fetch seller" });
    }
  });

  // Seller-specific products (only products owned by this seller)
  app.get("/api/seller/products", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allProducts = await storage.getAllProducts();
      const sellerProducts = allProducts.filter(p => p.sellerId === userId);
      res.json(sellerProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Public products endpoint (for storefront - all products)
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  
  // Get products by seller ID (for seller storefronts)
  app.get("/api/products/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const allProducts = await storage.getAllProducts();
      const sellerProducts = allProducts.filter(p => p.sellerId === sellerId);
      res.json(sellerProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch seller products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validationResult = insertProductSchema.safeParse({
        ...req.body,
        sellerId: userId, // Add seller ID from authenticated user
      });
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      const product = await storage.createProduct(validationResult.data);

      // Auto-start 30-day trial if this is seller's first product
      const user = await storage.getUser(userId);
      
      if (user && !user.subscriptionStatus) {
        const allProducts = await storage.getAllProducts();
        const sellerProducts = allProducts.filter(p => p.sellerId === userId);
        
        // If this is the first product, start trial
        if (sellerProducts.length === 1) {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);

          await storage.upsertUser({
            ...user,
            subscriptionStatus: "trial",
            trialEndsAt,
          });
        }
      }

      // Send notifications to seller about new product listing
      if (user) {
        try {
          // Create in-app notification
          await notificationService.createNotification({
            userId: user.id,
            type: 'product_listed',
            title: 'Product Listed Successfully!',
            message: `Your product "${product.name}" is now live on your store`,
            emailSent: 0,
            metadata: { productId: product.id, productName: product.name, productPrice: product.price },
          });

          // Send confirmation email to seller
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Product Listed Successfully!</h2>
              <p>Hi ${user.firstName || 'there'},</p>
              <p>Your product has been successfully added to your Upfirst store:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">${product.name}</h3>
                <p style="color: #6b7280; margin: 10px 0;">Price: $${product.price}</p>
                <p style="color: #6b7280; margin: 10px 0;">Type: ${product.productType}</p>
                ${product.stock ? `<p style="color: #6b7280; margin: 10px 0;">Stock: ${product.stock} units</p>` : ''}
              </div>
              <p>Your product is now visible to customers on your storefront.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Best regards,<br>
                The Upfirst Team
              </p>
            </div>
          `;

          await notificationService.sendEmail({
            to: user.email,
            from: 'Upfirst <hello@upfirst.io>',
            subject: `Product Listed: ${product.name}`,
            html: emailHtml,
          });

          console.log(`[Notifications] Product listing confirmation sent to ${user.email}`);
        } catch (error) {
          console.error('[Notifications] Failed to send product listing notifications:', error);
          // Don't fail the request if notifications fail
        }
      }

      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.post("/api/products/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { products } = req.body;
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ error: "Products must be an array" });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string }>,
      };

      for (let i = 0; i < products.length; i++) {
        const productData = products[i];
        const rowNumber = i + 2; // +2 because of header row and 0-indexing

        try {
          // Convert date strings to Date objects if present
          if (productData.preOrderDate && typeof productData.preOrderDate === 'string') {
            productData.preOrderDate = new Date(productData.preOrderDate);
          }

          const validationResult = insertProductSchema.safeParse({
            ...productData,
            sellerId: userId, // Add seller ID from authenticated user
          });
          
          if (!validationResult.success) {
            const error = fromZodError(validationResult.error);
            results.failed++;
            results.errors.push({ 
              row: rowNumber, 
              error: error.message 
            });
            continue;
          }

          await storage.createProduct(validationResult.data);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({ 
            row: rowNumber, 
            error: error.message || "Failed to create product" 
          });
        }
      }

      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to process bulk upload" });
    }
  });

  app.post("/api/orders", async (req: any, res) => {
    try {
      let userId: string;

      // All orders require customerEmail (guest checkout flow)
      const { customerEmail } = req.body;
      
      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email is required for all orders" });
      }

      // Look up user by email (case-insensitive)
      const allUsers = await storage.getAllUsers();
      const normalizedEmail = customerEmail.toLowerCase().trim();
      let existingUser = allUsers.find(u => u.email?.toLowerCase().trim() === normalizedEmail);

      // Check if this is a seller email trying to checkout as a buyer
      const sellerRoles = ['admin', 'editor', 'viewer', 'seller', 'owner'];
      if (existingUser && sellerRoles.includes(existingUser.role)) {
        return res.status(403).json({ 
          error: "This is a seller account email. Sellers cannot checkout as buyers. Please use a different email address." 
        });
      }

      if (!existingUser) {
        // Auto-create buyer account for guest checkout
        const newUserId = Math.random().toString(36).substring(2, 8);
        const [firstName, ...lastNameParts] = (req.body.customerName || "Guest User").split(" ");
        const username = await generateUniqueUsername();
        
        existingUser = await storage.upsertUser({
          id: newUserId,
          email: normalizedEmail, // Use normalized email
          username,
          firstName: firstName || "Guest",
          lastName: lastNameParts.join(" ") || "User",
          profileImageUrl: null,
          role: "buyer",
          password: null, // Guest buyers have no password (cannot login via email auth)
        });

        console.log(`[Guest Checkout] Created new buyer account for ${normalizedEmail} with username ${username}`);
      }

      userId = existingUser.id;

      const validationResult = insertOrderSchema.omit({ userId: true }).safeParse(req.body);
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      const order = await storage.createOrder({ ...validationResult.data, userId });
      
      // Send order notifications (async, don't block response)
      void (async () => {
        try {
          const items = JSON.parse(order.items);
          const allProducts = await storage.getAllProducts();
          const products = items.map((item: any) => 
            allProducts.find(p => p.id === item.productId)
          ).filter(Boolean);
          
          // Get seller info (assuming first product's seller)
          if (products.length > 0 && products[0]?.sellerId) {
            const seller = await storage.getUser(products[0].sellerId);
            if (seller) {
              // Send order confirmation email to buyer with seller branding
              await notificationService.sendOrderConfirmation(order, seller, products);
              console.log(`[Notifications] Order confirmation sent for order ${order.id}`);
            }
          }
        } catch (error) {
          console.error('[Notifications] Failed to send order notifications:', error);
        }
      })();
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Seller-specific orders (only orders for products owned by this seller or their store)
  app.get("/api/seller/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get canonical owner ID:
      // - For owner/seller/buyer roles: use their own ID (they own their products/orders)
      // - For team roles (admin/editor/viewer): use their sellerId (products owned by store owner)
      const isTeamMember = ["admin", "editor", "viewer"].includes(currentUser.role);
      const canonicalOwnerId = isTeamMember ? currentUser.sellerId : currentUser.id;
      
      if (!canonicalOwnerId) {
        return res.status(400).json({ error: "No store owner found for this user" });
      }

      const allOrders = await storage.getAllOrders();
      const allProducts = await storage.getAllProducts();
      
      // Get all product IDs owned by this seller's store
      const sellerProductIds = new Set(
        allProducts.filter(p => p.sellerId === canonicalOwnerId).map(p => p.id)
      );
      
      // Filter orders that contain products from this seller's store
      const sellerOrders = allOrders.filter(order => {
        try {
          const items = JSON.parse(order.items);
          return items.some((item: any) => sellerProductIds.has(item.productId));
        } catch {
          return false;
        }
      });
      
      res.json(sellerOrders);
    } catch (error) {
      console.error("Error fetching seller orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // DEPRECATED: Use /api/seller/orders instead for proper filtering
  // This endpoint should only be used by admins/owners for platform-wide order management
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only allow owner/admin roles to see all orders
      if (user?.role !== 'owner' && user?.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Use /api/seller/orders for seller-specific orders." });
      }
      
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getOrdersByUserId(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user orders" });
    }
  });

  // Buyer orders endpoint - must be before /:id route
  app.get("/api/orders/my-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getOrdersByUserId(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // DEPRECATED: Use /api/seller/orders instead
  // This endpoint should only be used by admins/owners for platform-wide order management
  app.get("/api/orders/all-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only allow owner/admin roles to see all orders
      if (user?.role !== 'owner' && user?.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Use /api/seller/orders for seller-specific orders." });
      }
      
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Check authorization: user must be owner/admin, the buyer, or seller of products in the order
      const isBuyer = order.userId === userId;
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      
      if (!isBuyer && !isAdmin) {
        // Check if user is the seller of any products in this order
        try {
          const items = JSON.parse(order.items);
          const allProducts = await storage.getAllProducts();
          const orderProductIds = items.map((item: any) => item.productId);
          const sellerProducts = allProducts.filter(p => p.sellerId === userId);
          const sellerProductIds = new Set(sellerProducts.map(p => p.id));
          
          const isSeller = orderProductIds.some((id: string) => sellerProductIds.has(id));
          
          if (!isSeller) {
            return res.status(403).json({ error: "Access denied" });
          }
        } catch {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.put("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const validationResult = insertProductSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      const product = await storage.updateProduct(req.params.id, validationResult.data);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Categories Routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/level/:level", async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      const categories = await storage.getCategoriesByLevel(level);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/parent/:parentId", async (req, res) => {
    try {
      const parentId = req.params.parentId === "null" ? null : req.params.parentId;
      const categories = await storage.getCategoriesByParentId(parentId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const statusSchema = z.object({ status: orderStatusEnum });
      const validationResult = statusSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      // Check authorization before updating
      const existingOrder = await storage.getOrder(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Only seller of products in order or admin can update status
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      if (!isAdmin) {
        try {
          const items = JSON.parse(existingOrder.items);
          const allProducts = await storage.getAllProducts();
          const orderProductIds = items.map((item: any) => item.productId);
          const sellerProducts = allProducts.filter(p => p.sellerId === userId);
          const sellerProductIds = new Set(sellerProducts.map(p => p.id));
          
          const isSeller = orderProductIds.some((id: string) => sellerProductIds.has(id));
          
          if (!isSeller) {
            return res.status(403).json({ error: "Access denied" });
          }
        } catch {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const order = await storage.updateOrderStatus(req.params.id, validationResult.data.status);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.patch("/api/orders/:id/tracking", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const trackingSchema = z.object({
        trackingNumber: z.string().min(1, "Tracking number is required"),
        trackingLink: z.string().url("Invalid tracking link").or(z.literal("")),
        notifyCustomer: z.boolean().optional(),
      });
      
      const validationResult = trackingSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      // Check authorization before updating
      const existingOrder = await storage.getOrder(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Only seller of products in order or admin can update tracking
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      if (!isAdmin) {
        try {
          const items = JSON.parse(existingOrder.items);
          const allProducts = await storage.getAllProducts();
          const orderProductIds = items.map((item: any) => item.productId);
          const sellerProducts = allProducts.filter(p => p.sellerId === userId);
          const sellerProductIds = new Set(sellerProducts.map(p => p.id));
          
          const isSeller = orderProductIds.some((id: string) => sellerProductIds.has(id));
          
          if (!isSeller) {
            return res.status(403).json({ error: "Access denied" });
          }
        } catch {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const order = await storage.updateOrderTracking(
        req.params.id, 
        validationResult.data.trackingNumber,
        validationResult.data.trackingLink
      );
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Send shipping notification if requested
      if (validationResult.data.notifyCustomer) {
        void (async () => {
          try {
            const items = JSON.parse(order.items);
            const allProducts = await storage.getAllProducts();
            const products = items.map((item: any) => 
              allProducts.find(p => p.id === item.productId)
            ).filter(Boolean);
            
            // Get seller info
            if (products.length > 0 && products[0]?.sellerId) {
              const seller = await storage.getUser(products[0].sellerId);
              if (seller) {
                // Send order shipped email to buyer
                await notificationService.sendOrderShipped(order, seller);
                console.log(`[Notifications] Shipping notification sent for order ${order.id}`);
              }
            }
          } catch (error) {
            console.error('[Notifications] Failed to send shipping notification:', error);
          }
        })();
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tracking information" });
    }
  });

  app.post("/api/orders/:id/request-balance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!stripe) {
        return res.status(500).json({ 
          error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to secrets." 
        });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check authorization before requesting balance
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      if (!isAdmin) {
        try {
          const items = JSON.parse(order.items);
          const allProducts = await storage.getAllProducts();
          const orderProductIds = items.map((item: any) => item.productId);
          const sellerProducts = allProducts.filter(p => p.sellerId === userId);
          const sellerProductIds = new Set(sellerProducts.map(p => p.id));
          
          const isSeller = orderProductIds.some((id: string) => sellerProductIds.has(id));
          
          if (!isSeller) {
            return res.status(403).json({ error: "Access denied" });
          }
        } catch {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const remainingBalance = parseFloat(order.remainingBalance || "0");
      if (remainingBalance <= 0) {
        return res.status(400).json({ error: "No balance remaining on this order" });
      }

      // Create payment intent for remaining balance
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(remainingBalance * 100),
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: order.id,
          paymentType: "balance",
        },
      });

      // Update order with balance payment intent ID
      await storage.updateOrderBalancePaymentIntent(order.id, paymentIntent.id);

      // TODO: Send email to customer with payment link
      console.log(`[Balance Request] Payment link sent to ${order.customerEmail} for order ${order.id}`);

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        message: "Balance payment request sent successfully",
      });
    } catch (error: any) {
      console.error("Balance request error:", error);
      res.status(500).json({ error: "Failed to request balance payment" });
    }
  });

  // Reference: javascript_stripe integration
  // Stripe Connect payment intent creation for checkout
  // Note: No auth required - guest checkout needs this
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      // Test mode bypass for notification/checkout testing without full Stripe onboarding
      // Enabled in development mode or when STRIPE_TEST_MODE=true
      if (process.env.NODE_ENV === 'development' || process.env.STRIPE_TEST_MODE === 'true') {
        console.log('[Stripe Test Mode] Returning mock payment intent for testing');
        return res.json({
          clientSecret: 'pi_test_mock_1234567890_secret_abcdefghijklmnop',
          paymentIntentId: 'pi_test_mock_1234567890',
        });
      }

      if (!stripe) {
        return res.status(500).json({ 
          error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to secrets." 
        });
      }

      const { amount, orderId, paymentType = "full", items } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Determine seller from cart items
      let sellerId: string | null = null;
      let sellerConnectedAccountId: string | null = null;

      if (items && items.length > 0) {
        // Get first product to determine seller
        const firstProductId = items[0].id;
        const product = await storage.getProduct(firstProductId);
        
        if (product) {
          sellerId = product.sellerId;
          const seller = await storage.getUser(sellerId);
          sellerConnectedAccountId = seller?.stripeConnectedAccountId || null;
        }
      }

      // Calculate platform fee (1.5%)
      const platformFeeAmount = Math.round(amount * 100 * 0.015); // 1.5% to Uppfirst
      const totalAmount = Math.round(amount * 100);

      // Create payment intent with Stripe Connect if seller has connected account
      const paymentIntentParams: any = {
        amount: totalAmount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true, // Enables Apple Pay, Google Pay, and other payment methods
        },
        metadata: {
          orderId: orderId || "",
          paymentType,
          sellerId: sellerId || "",
        },
      };

      // Check if seller has Stripe account and can accept payments
      if (sellerConnectedAccountId && sellerId) {
        const seller = await storage.getUser(sellerId);
        
        // Check if seller can accept charges (doesn't need full verification for this)
        if (!seller?.stripeChargesEnabled) {
          return res.status(400).json({ 
            error: "This store is still setting up payment processing. Please check back soon.",
            errorCode: "STRIPE_CHARGES_DISABLED"
          });
        }

        paymentIntentParams.application_fee_amount = platformFeeAmount;
        paymentIntentParams.on_behalf_of = sellerConnectedAccountId; // Seller name appears on statement
        paymentIntentParams.transfer_data = {
          destination: sellerConnectedAccountId, // Money goes to seller
        };
        
        // Use seller's listing currency
        paymentIntentParams.currency = (seller.listingCurrency || 'USD').toLowerCase();
        
        console.log(`[Stripe Connect] Creating payment intent with ${platformFeeAmount/100} ${paymentIntentParams.currency.toUpperCase()} fee to platform, rest to seller ${sellerId}`);
      } else {
        // Seller must connect Stripe before accepting payments
        return res.status(400).json({ 
          error: "This store hasn't set up payment processing yet. Please contact the seller to complete their setup.",
          errorCode: "STRIPE_NOT_CONNECTED"
        });
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Stripe payment intent error:", error);
      res.status(500).json({ 
        error: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Team Management - Invite users
  app.post("/api/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !["owner", "admin"].includes(currentUser.role)) {
        return res.status(403).json({ error: "Only owners and admins can invite users" });
      }

      const { email, role } = req.body;
      if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
      }

      // Updated roles: admin, editor, viewer
      if (!["admin", "editor", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Valid roles: admin, editor, viewer" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Generate unique token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await storage.createInvitation({
        email,
        role,
        invitedBy: currentUser.id,
        status: "pending",
        token,
        expiresAt,
      });

      // In a real app, you'd send an email here with the invitation link
      const invitationLink = `${req.protocol}://${req.get('host')}/accept-invitation?token=${token}`;

      res.status(201).json({ 
        invitation,
        invitationLink, // For testing purposes
      });
    } catch (error: any) {
      console.error("Invitation error:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  // Get all invitations
  app.get("/api/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !["owner", "admin"].includes(currentUser.role)) {
        return res.status(403).json({ error: "Only owners and admins can view invitations" });
      }

      const invitations = await storage.getAllInvitations();
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  // Accept invitation - works for both new and existing users
  app.post("/api/invitations/accept/:token", async (req: any, res) => {
    try {
      const invitation = await storage.getInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation already used or expired" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateInvitationStatus(invitation.token, "expired");
        return res.status(400).json({ error: "Invitation has expired" });
      }

      // Get the inviter to determine sellerId
      const inviter = await storage.getUser(invitation.invitedBy);
      if (!inviter) {
        return res.status(400).json({ error: "Inviter not found" });
      }

      // Get canonical owner ID: if inviter is owner, use their ID; otherwise use their sellerId
      const canonicalOwnerId = inviter.role === "owner" ? inviter.id : inviter.sellerId;
      if (!canonicalOwnerId) {
        return res.status(400).json({ error: "Could not determine store owner" });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(invitation.email);
      
      if (user) {
        // User exists - update their role and sellerId
        await storage.upsertUser({
          ...user,
          role: invitation.role,
          sellerId: canonicalOwnerId,
        });
      } else {
        // New user - create account with admin role (no password, will use magic link)
        const newUserId = `usr_${Math.random().toString(36).substring(2, 15)}`;
        user = await storage.upsertUser({
          id: newUserId,
          email: invitation.email.toLowerCase().trim(),
          password: null, // No password - will use magic link auth
          role: invitation.role,
          sellerId: canonicalOwnerId,
          firstName: null,
          lastName: null,
          username: null,
          storeName: null,
          storeDescription: null,
          bannerImage: null,
          logoImage: null,
          storeActive: null,
          shippingCost: null,
          instagramUsername: null,
        });
      }

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.token, "accepted");

      // Send magic link for auto-login
      await notificationService.sendMagicLink(invitation.email, '/dashboard');

      res.json({ 
        message: "Invitation accepted successfully", 
        role: invitation.role,
        requiresLogin: true,
        email: invitation.email
      });
    } catch (error) {
      console.error("Accept invitation error:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // Get team members for current seller's store
  app.get("/api/team", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only sellers (admin/owner) can view their team
      if (!["admin", "owner"].includes(currentUser.role)) {
        return res.status(403).json({ error: "Only store owners can manage team members" });
      }

      // Get canonical owner ID: if owner, use their ID; otherwise use their sellerId
      const canonicalOwnerId = currentUser.role === "owner" ? currentUser.id : currentUser.sellerId;
      if (!canonicalOwnerId) {
        return res.status(400).json({ error: "No store owner found for this user" });
      }

      // Get team members for this seller's store
      const users = await storage.getTeamMembersBySellerId(canonicalOwnerId);
      
      // Don't expose sensitive info
      const sanitizedUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        createdAt: u.createdAt,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Update user role
  app.patch("/api/team/:userId/role", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !["owner", "admin"].includes(currentUser.role)) {
        return res.status(403).json({ error: "Only owners and admins can update roles" });
      }

      const { role } = req.body;
      // Updated roles: admin, editor, viewer (removed manager, staff, customer)
      if (!role || !["admin", "editor", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Valid roles: admin, editor, viewer" });
      }

      const updatedUser = await storage.updateUserRole(req.params.userId, role);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ message: "User role updated successfully", user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Delete team member
  app.delete("/api/team/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !["owner", "admin"].includes(currentUser.role)) {
        return res.status(403).json({ error: "Only owners and admins can delete team members" });
      }

      // Get canonical owner ID
      const canonicalOwnerId = currentUser.role === "owner" ? currentUser.id : currentUser.sellerId;
      if (!canonicalOwnerId) {
        return res.status(400).json({ error: "No store owner found for this user" });
      }

      const deleted = await storage.deleteTeamMember(req.params.userId, canonicalOwnerId);
      if (!deleted) {
        return res.status(404).json({ error: "Team member not found or doesn't belong to your store" });
      }

      res.json({ message: "Team member deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // User Settings Routes
  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ error: "First name and last name are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        firstName,
        lastName,
      });

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.patch("/api/user/branding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { storeBanner, storeLogo } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        storeBanner: storeBanner || null,
        storeLogo: storeLogo || null,
      });

      res.json({ message: "Branding updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Branding update error:", error);
      res.status(500).json({ error: "Failed to update branding" });
    }
  });

  // Toggle store active status
  app.patch("/api/user/store-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { storeActive } = req.body;

      if (storeActive === undefined || (storeActive !== 0 && storeActive !== 1)) {
        return res.status(400).json({ error: "Invalid store status" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        storeActive,
      });

      res.json({ message: "Store status updated successfully", user: updatedUser, storeActive });
    } catch (error) {
      console.error("Store status update error:", error);
      res.status(500).json({ error: "Failed to update store status" });
    }
  });

  app.patch("/api/user/payment-provider", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { paymentProvider } = req.body;

      if (!paymentProvider || !["stripe", "paypal"].includes(paymentProvider)) {
        return res.status(400).json({ error: "Invalid payment provider" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        paymentProvider,
      });

      res.json({ message: "Payment provider updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Payment provider update error:", error);
      res.status(500).json({ error: "Failed to update payment provider" });
    }
  });

  app.patch("/api/user/username", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { username } = req.body;

      if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ 
          error: "Username must be 3-20 characters and contain only letters, numbers, and underscores" 
        });
      }

      // Check if username is already taken
      const allUsers = await storage.getAllUsers();
      const usernameTaken = allUsers.some(u => u.username === username && u.id !== userId);
      if (usernameTaken) {
        return res.status(409).json({ error: "Username is already taken" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        username,
      });

      res.json({ message: "Username updated successfully", user: updatedUser });
    } catch (error: any) {
      console.error("Username update error:", error);
      res.status(500).json({ error: "Failed to update username" });
    }
  });

  app.patch("/api/user/custom-domain", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { customDomain } = req.body;

      // Basic domain validation
      if (customDomain && !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(customDomain)) {
        return res.status(400).json({ error: "Invalid domain format" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        customDomain: customDomain || null,
        customDomainVerified: 0, // Reset verification when domain changes
      });

      res.json({ message: "Custom domain updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Custom domain update error:", error);
      res.status(500).json({ error: "Failed to update custom domain" });
    }
  });

  app.patch("/api/user/shipping", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { shippingPrice } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate shipping price
      const price = parseFloat(shippingPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: "Invalid shipping price" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        shippingPrice: price.toString(),
      });

      res.json({ message: "Shipping price updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Shipping price update error:", error);
      res.status(500).json({ error: "Failed to update shipping price" });
    }
  });

  app.get("/api/shipping-settings", async (req, res) => {
    try {
      // Get the first seller's shipping price (store owner)
      const allUsers = await storage.getAllUsers();
      const seller = allUsers.find(u => u.role === "seller");
      
      const shippingPrice = seller?.shippingPrice ? parseFloat(seller.shippingPrice) : 0;
      
      res.json({ shippingPrice });
    } catch (error) {
      console.error("Error fetching shipping settings:", error);
      res.status(500).json({ error: "Failed to fetch shipping settings" });
    }
  });

  // Stripe Connect OAuth routes
  // Create or get Stripe Express account with minimal KYC
  app.post("/api/stripe/create-express-account", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { reset = false } = req.body; // Allow resetting/recreating the account
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user already has a connected account and not resetting, return its status
      if (user.stripeConnectedAccountId && !reset) {
        const account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
        
        // Update user with latest account status
        await storage.upsertUser({
          ...user,
          stripeChargesEnabled: account.charges_enabled ? 1 : 0,
          stripePayoutsEnabled: account.payouts_enabled ? 1 : 0,
          stripeDetailsSubmitted: account.details_submitted ? 1 : 0,
          listingCurrency: account.default_currency?.toUpperCase() || 'USD',
        });

        return res.json({
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          currency: account.default_currency,
        });
      }

      // Get country from IP geolocation headers
      const countryCode = (req.headers['x-replit-user-geo-country-code'] as string || 
                          req.headers['cf-ipcountry'] as string || 
                          'US').toUpperCase();

      console.log(`[Stripe Express] Creating account for user ${userId} with country: ${countryCode}`);

      // Create new Express account with minimal requirements
      const account = await stripe.accounts.create({
        type: 'express',
        country: countryCode,
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual', // Start with individual, can upgrade later
        settings: {
          payouts: {
            debit_negative_balances: true,
          },
        },
      });

      // Save account ID and initial status
      await storage.upsertUser({
        ...user,
        stripeConnectedAccountId: account.id,
        stripeChargesEnabled: account.charges_enabled ? 1 : 0,
        stripePayoutsEnabled: account.payouts_enabled ? 1 : 0,
        stripeDetailsSubmitted: account.details_submitted ? 1 : 0,
        listingCurrency: account.default_currency?.toUpperCase() || 'USD',
      });

      console.log(`[Stripe Express] Created account ${account.id} for user ${userId}`);

      res.json({
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currency: account.default_currency,
      });
    } catch (error: any) {
      console.error("Stripe Express account creation error:", error);
      
      // Check for specific Stripe Connect error
      if (error.message && error.message.includes("signed up for Connect")) {
        return res.status(400).json({ 
          error: "Stripe Connect Not Enabled",
          message: "Your Stripe account needs to enable Stripe Connect. Please visit https://dashboard.stripe.com/connect/accounts/overview and click 'Get Started' to activate Connect for your account.",
          stripeError: error.message
        });
      }
      
      res.status(500).json({ 
        error: "Failed to create Express account",
        message: error.message || "Unknown error occurred",
        stripeError: error.raw?.message || error.message
      });
    }
  });

  // Create Account Session for embedded onboarding
  app.post("/api/stripe/account-session", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { purpose = 'onboarding' } = req.body; // 'onboarding' or 'payouts'
      
      if (!user || !user.stripeConnectedAccountId) {
        return res.status(400).json({ error: "No Stripe account found. Create one first." });
      }

      // Create account session for embedded onboarding or payout setup
      // For Express accounts: don't include external_account_collection for initial onboarding
      const components: any = {
        account_onboarding: {
          enabled: true,
        },
      };

      // Only enable external_account_collection for payout setup
      if (purpose === 'payouts') {
        components.account_onboarding.features = {
          external_account_collection: true,
        };
      }

      const accountSession = await stripe.accountSessions.create({
        account: user.stripeConnectedAccountId,
        components,
      });

      res.json({ 
        clientSecret: accountSession.client_secret,
        accountId: user.stripeConnectedAccountId,
      });
    } catch (error: any) {
      console.error("Stripe Account Session error:", error);
      res.status(500).json({ error: "Failed to create account session" });
    }
  });

  // Generate Account Link for onboarding/verification
  app.post("/api/stripe/account-link", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const { type = 'account_onboarding' } = req.body; // account_onboarding or account_update
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeConnectedAccountId) {
        return res.status(400).json({ error: "No Stripe account found. Create one first." });
      }

      // Use the request origin for proper public URL (fixes Stripe redirect issues)
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
      const baseUrl = origin || (process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : `http://localhost:${process.env.PORT || 5000}`);

      const accountLink = await stripe.accountLinks.create({
        account: user.stripeConnectedAccountId,
        refresh_url: `${baseUrl}/settings?stripe=refresh`,
        return_url: `${baseUrl}/settings?stripe=connected`,
        type: type, // 'account_onboarding' for new accounts, 'account_update' for existing
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Stripe Account Link error:", error);
      res.status(500).json({ error: "Failed to generate account link" });
    }
  });

  // Check Stripe account status and update user
  app.get("/api/stripe/account-status", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeConnectedAccountId) {
        return res.json({ 
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        });
      }

      const account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
      
      // Update user with latest status
      await storage.upsertUser({
        ...user,
        stripeChargesEnabled: account.charges_enabled ? 1 : 0,
        stripePayoutsEnabled: account.payouts_enabled ? 1 : 0,
        stripeDetailsSubmitted: account.details_submitted ? 1 : 0,
        listingCurrency: account.default_currency?.toUpperCase() || 'USD',
      });

      res.json({
        connected: true,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currency: account.default_currency,
        requirements: account.requirements,
      });
    } catch (error: any) {
      console.error("Stripe account status error:", error);
      res.status(500).json({ error: "Failed to check account status" });
    }
  });

  // PayPal Commerce Platform Partner Integration
  app.post("/api/paypal/create-partner-referral", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // PayPal Partner Referral API integration
      // Note: Requires PAYPAL_PARTNER_ID and PAYPAL_CLIENT_SECRET
      const partnerId = process.env.PAYPAL_PARTNER_ID;
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

      if (!partnerId || !clientId || !clientSecret) {
        return res.status(501).json({ 
          error: "PayPal integration not configured. Please contact support.",
          errorCode: "PAYPAL_NOT_CONFIGURED"
        });
      }

      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : `http://localhost:${process.env.PORT || 5000}`;

      // Get PayPal access token
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const { access_token } = await tokenResponse.json();

      // Create partner referral
      const referralResponse = await fetch('https://api-m.paypal.com/v2/customer/partner-referrals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_id: userId,
          partner_config_override: {
            partner_logo_url: `${baseUrl}/logo.png`,
            return_url: `${baseUrl}/settings?paypal=connected`,
            return_url_description: "Return to your store settings",
            action_renewal_url: `${baseUrl}/settings?paypal=refresh`,
          },
          operations: [
            {
              operation: 'API_INTEGRATION',
              api_integration_preference: {
                rest_api_integration: {
                  integration_method: 'PAYPAL',
                  integration_type: 'THIRD_PARTY',
                  third_party_details: {
                    features: ['PAYMENT', 'REFUND', 'PARTNER_FEE'],
                  },
                },
              },
            },
          ],
          products: ['EXPRESS_CHECKOUT'],
          legal_consents: [
            {
              type: 'SHARE_DATA_CONSENT',
              granted: true,
            },
          ],
        }),
      });

      const referralData = await referralResponse.json();

      if (referralData.links) {
        const actionUrl = referralData.links.find((link: any) => link.rel === 'action_url')?.href;
        
        res.json({ 
          url: actionUrl,
          referralId: referralData.partner_referral_id,
        });
      } else {
        throw new Error('No action URL returned from PayPal');
      }
    } catch (error: any) {
      console.error("PayPal partner referral error:", error);
      res.status(500).json({ error: "Failed to create PayPal partner referral" });
    }
  });

  // PayPal merchant status check
  app.get("/api/paypal/merchant-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.paypalMerchantId) {
        return res.json({ 
          connected: false,
          merchantId: null,
        });
      }

      res.json({
        connected: true,
        merchantId: user.paypalMerchantId,
      });
    } catch (error: any) {
      console.error("PayPal merchant status error:", error);
      res.status(500).json({ error: "Failed to check PayPal status" });
    }
  });

  app.post("/api/stripe/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Disconnect the Stripe account
      await storage.upsertUser({
        ...user,
        stripeConnectedAccountId: null,
      });

      res.json({ message: "Stripe account disconnected successfully" });
    } catch (error: any) {
      console.error("Stripe disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Stripe account" });
    }
  });

  // Subscription Management Endpoints
  // Start 30-day free trial when seller creates their first product
  app.post("/api/subscription/start-trial", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if trial already started
      if (user.subscriptionStatus) {
        return res.json({ message: "Trial already started", user });
      }

      // Set trial to expire 30 days from now
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const updatedUser = await storage.upsertUser({
        ...user,
        subscriptionStatus: "trial",
        trialEndsAt,
      });

      res.json({ message: "Trial started successfully", user: updatedUser });
    } catch (error: any) {
      console.error("Start trial error:", error);
      res.status(500).json({ error: "Failed to start trial" });
    }
  });

  // Create SetupIntent to collect payment method without charging
  app.post("/api/subscription/setup-payment", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;

        // Save customer ID
        await storage.upsertUser({
          ...user,
          stripeCustomerId: customerId,
        });
      }

      // Create SetupIntent to collect payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      res.json({ 
        clientSecret: setupIntent.client_secret,
        customerId,
      });
    } catch (error: any) {
      console.error("Setup payment error:", error);
      res.status(500).json({ error: "Failed to setup payment method" });
    }
  });

  // Create subscription checkout session
  app.post("/api/subscription/create", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const { plan } = req.body; // "monthly" or "annual"
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Price IDs (Replace with actual Stripe Price IDs from dashboard)
      const priceId = plan === "annual" 
        ? "price_annual_99" // TODO: Replace with actual Stripe Price ID for $99/year
        : "price_monthly_999"; // TODO: Replace with actual Stripe Price ID for $9.99/month

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await storage.upsertUser({ ...user, stripeCustomerId: customerId });
      }

      // Calculate trial end date - only use if valid and in the future
      let trialEndTimestamp: number | undefined;
      let shouldUpdateTrialDate = false;
      
      if (user.trialEndsAt) {
        const existingTrialEnd = new Date(user.trialEndsAt);
        // Only use trial end if it's valid and in the future
        if (Number.isFinite(existingTrialEnd.getTime()) && existingTrialEnd.getTime() > Date.now()) {
          trialEndTimestamp = Math.floor(existingTrialEnd.getTime() / 1000);
        }
      } else {
        // No trial date set - create new 30-day trial
        const newTrialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        trialEndTimestamp = Math.floor(newTrialEnd.getTime() / 1000);
        shouldUpdateTrialDate = true;
      }

      // Create Checkout Session with trial if applicable
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        subscription_data: trialEndTimestamp ? {
          trial_end: trialEndTimestamp,
        } : undefined,
        success_url: `${req.headers.origin || 'http://localhost:5000'}/seller-dashboard?subscription=success`,
        cancel_url: `${req.headers.origin || 'http://localhost:5000'}/products?subscription=cancelled`,
        metadata: {
          userId: user.id,
          plan: plan,
        },
      });

      // Update trial end date if new trial was created
      if (shouldUpdateTrialDate) {
        const newTrialEndDate = new Date(trialEndTimestamp! * 1000);
        await storage.upsertUser({
          ...user,
          trialEndsAt: newTrialEndDate,
        });
      }

      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Create subscription error:", error);
      res.status(500).json({ error: "Failed to create subscription checkout" });
    }
  });

  // Get subscription status
  app.get("/api/subscription/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let subscription = null;
      if (user.stripeSubscriptionId && stripe) {
        try {
          subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        } catch (error) {
          console.error("Error fetching subscription:", error);
        }
      }

      res.json({
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        trialEndsAt: user.trialEndsAt,
        hasPaymentMethod: !!user.stripeCustomerId,
        subscription,
      });
    } catch (error: any) {
      console.error("Get subscription status error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Cancel subscription
  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription" });
      }

      // Cancel subscription
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);

      // Update user
      const updatedUser = await storage.upsertUser({
        ...user,
        subscriptionStatus: "canceled",
      });

      res.json({ 
        message: "Subscription canceled successfully",
        user: updatedUser,
      });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Stripe Webhook Handler
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).send("Stripe is not configured");
      }

      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        console.error("Webhook signature or secret missing");
        return res.status(400).send("Webhook signature or secret missing");
      }

      let event: Stripe.Event;

      try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`[Webhook] Received event: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan;

          if (userId && plan && session.subscription) {
            const user = await storage.getUser(userId);
            if (user) {
              // Retrieve the actual subscription to get correct status
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              
              let status: string;
              switch (subscription.status) {
                case 'trialing':
                  status = 'trial';
                  break;
                case 'active':
                  status = 'active';
                  break;
                case 'past_due':
                  status = 'past_due';
                  break;
                case 'canceled':
                case 'unpaid':
                  status = 'canceled';
                  break;
                default:
                  status = subscription.status;
              }

              await storage.upsertUser({
                ...user,
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: status,
                subscriptionPlan: plan,
              });
              console.log(`[Webhook] Checkout completed - user ${userId} subscription status: ${status}`);
            }
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          // Find user by Stripe customer ID (indexed lookup)
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (user) {
            let status: string;
            switch (subscription.status) {
              case 'trialing':
                status = 'trial';
                break;
              case 'active':
                status = 'active';
                break;
              case 'past_due':
                status = 'past_due';
                break;
              case 'canceled':
              case 'unpaid':
                status = 'canceled';
                break;
              default:
                status = subscription.status;
            }

            await storage.upsertUser({
              ...user,
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: status,
            });
            console.log(`[Webhook] Updated user ${user.id} subscription status to ${status}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (user) {
            await storage.upsertUser({
              ...user,
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
            });
            console.log(`[Webhook] Cancelled subscription for user ${user.id}`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (user) {
            await storage.upsertUser({
              ...user,
              subscriptionStatus: 'past_due',
            });
            console.log(`[Webhook] Marked user ${user.id} subscription as past_due`);
            
            // TODO: Send notification email to user about failed payment
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (user && user.subscriptionStatus === 'past_due') {
            await storage.upsertUser({
              ...user,
              subscriptionStatus: 'active',
            });
            console.log(`[Webhook] Restored user ${user.id} subscription to active`);
          }
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("[Webhook] Error processing webhook:", error);
      res.status(500).send("Webhook processing error");
    }
  });

  // Seller-triggered balance payment for pre-orders
  app.post("/api/trigger-balance-payment/:orderId", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to secrets." 
        });
      }

      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const remainingBalance = parseFloat(order.remainingBalance || "0");
      if (remainingBalance <= 0) {
        return res.status(400).json({ error: "No balance remaining" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(remainingBalance * 100),
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: order.id,
          paymentType: "balance",
        },
      });

      // Update order with balance payment intent ID
      await storage.updateOrderBalancePaymentIntent(order.id, paymentIntent.id);

      // Get seller information
      const seller = await storage.getUser(req.user.claims.sub);
      if (seller) {
        // Generate payment link (for email)
        const paymentLink = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/complete-balance-payment/${order.id}?payment_intent=${paymentIntent.id}`;
        
        // Send email to customer
        await notificationService.sendBalancePaymentRequest(order, seller, paymentLink);
      }

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: remainingBalance,
      });
    } catch (error: any) {
      console.error("Balance payment error:", error);
      res.status(500).json({ 
        error: "Error creating balance payment: " + error.message 
      });
    }
  });

  // Meta OAuth routes
  app.get("/api/meta-auth/connect", isAuthenticated, (req, res) => {
    const appId = process.env.META_APP_ID || "YOUR_APP_ID";
    const redirectUri = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/meta-auth/callback`;
    
    const scopes = ["ads_management", "ads_read", "business_management"];
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join(',')}&response_type=code`;
    
    res.redirect(authUrl);
  });

  app.get("/api/meta-auth/callback", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.query;
      const userId = req.user.claims.sub;
      
      if (!code) {
        return res.redirect("/meta-ads-setup?error=no_code");
      }

      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;
      const redirectUri = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/meta-auth/callback`;

      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return res.redirect("/meta-ads-setup?error=token_failed");
      }

      // Get user's ad accounts
      const adAccountsResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?access_token=${tokenData.access_token}`
      );
      const adAccountsData = await adAccountsResponse.json();

      const firstAdAccount = adAccountsData.data?.[0];
      
      // Store settings in database
      await storage.saveMetaSettings(userId, {
        accessToken: tokenData.access_token,
        adAccountId: firstAdAccount?.id || "",
        accountName: firstAdAccount?.name || "Facebook Ad Account",
        connected: 1,
      });

      // Send message to parent window and close popup
      res.send(`
        <html>
          <script>
            window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '*');
            window.close();
          </script>
          <body>
            <p>Connected successfully! This window will close automatically...</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Meta OAuth error:", error);
      res.send(`
        <html>
          <script>
            window.opener.postMessage({ type: 'META_AUTH_ERROR', error: 'Failed to connect' }, '*');
            window.close();
          </script>
          <body>
            <p>Connection failed. This window will close automatically...</p>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/meta-auth/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteMetaSettings(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.get("/api/meta-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getMetaSettings(userId);
      
      // Don't send the access token to frontend
      if (settings) {
        res.json({
          connected: settings.connected,
          adAccountId: settings.adAccountId,
          accountName: settings.accountName,
          accessToken: !!settings.accessToken, // Just indicate if token exists
        });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/meta-campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getMetaSettings(userId);
      
      if (!settings || !settings.accessToken) {
        return res.status(400).json({ error: "Meta account not connected" });
      }

      const {
        productId,
        campaignName,
        objective,
        dailyBudget,
        headline,
        primaryText,
        description,
        callToAction,
        targetAgeMin,
        targetAgeMax,
        targetGender,
        targetCountries,
      } = req.body;

      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const productUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/products/${productId}`;

      // Create Campaign
      const campaignResponse = await fetch(
        `https://graph.facebook.com/v21.0/${settings.adAccountId}/campaigns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: campaignName,
            objective: objective,
            status: "PAUSED",
            access_token: settings.accessToken,
          }),
        }
      );
      const campaignData = await campaignResponse.json();

      if (campaignData.error) {
        return res.status(400).json({ error: campaignData.error.message });
      }

      res.json({
        success: true,
        campaignId: campaignData.id,
        message: "Campaign created successfully!",
      });
    } catch (error: any) {
      console.error("Meta campaign error:", error);
      res.status(500).json({ error: error.message || "Failed to create campaign" });
    }
  });

  // TikTok OAuth routes
  app.get("/api/tiktok-auth/connect", isAuthenticated, (req, res) => {
    const appId = process.env.TIKTOK_APP_ID || "YOUR_APP_ID";
    const redirectUri = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/tiktok-auth/callback`;
    
    const authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=STATE`;
    
    res.redirect(authUrl);
  });

  app.get("/api/tiktok-auth/callback", isAuthenticated, async (req: any, res) => {
    try {
      const { auth_code } = req.query;
      const userId = req.user.claims.sub;
      
      if (!auth_code) {
        return res.send(`
          <html>
            <script>
              window.opener.postMessage({ type: 'TIKTOK_AUTH_ERROR', error: 'No authorization code' }, '*');
              window.close();
            </script>
            <body><p>Failed to connect. This window will close automatically...</p></body>
          </html>
        `);
      }

      const appId = process.env.TIKTOK_APP_ID;
      const appSecret = process.env.TIKTOK_APP_SECRET;

      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_id: appId,
            secret: appSecret,
            auth_code: auth_code,
          }),
        }
      );
      const tokenData = await tokenResponse.json();

      if (!tokenData.data?.access_token) {
        return res.send(`
          <html>
            <script>
              window.opener.postMessage({ type: 'TIKTOK_AUTH_ERROR', error: 'Token exchange failed' }, '*');
              window.close();
            </script>
            <body><p>Failed to connect. This window will close automatically...</p></body>
          </html>
        `);
      }

      // Get advertiser info
      const advertiserResponse = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/`,
        {
          method: "GET",
          headers: {
            "Access-Token": tokenData.data.access_token,
          },
        }
      );
      const advertiserData = await advertiserResponse.json();
      const firstAdvertiser = advertiserData.data?.list?.[0];
      
      // Store settings in database
      await storage.saveTikTokSettings(userId, {
        accessToken: tokenData.data.access_token,
        refreshToken: tokenData.data.refresh_token,
        advertiserId: firstAdvertiser?.advertiser_id || "",
        advertiserName: firstAdvertiser?.advertiser_name || "TikTok Advertiser",
        connected: 1,
      });

      res.send(`
        <html>
          <script>
            window.opener.postMessage({ type: 'TIKTOK_AUTH_SUCCESS' }, '*');
            window.close();
          </script>
          <body><p>Connected successfully! This window will close automatically...</p></body>
        </html>
      `);
    } catch (error) {
      console.error("TikTok OAuth error:", error);
      res.send(`
        <html>
          <script>
            window.opener.postMessage({ type: 'TIKTOK_AUTH_ERROR', error: 'Failed to connect' }, '*');
            window.close();
          </script>
          <body><p>Connection failed. This window will close automatically...</p></body>
        </html>
      `);
    }
  });

  app.post("/api/tiktok-auth/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteTikTokSettings(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.get("/api/tiktok-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getTikTokSettings(userId);
      
      if (settings) {
        res.json({
          connected: settings.connected,
          advertiserId: settings.advertiserId,
          advertiserName: settings.advertiserName,
          accessToken: !!settings.accessToken,
        });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // X (Twitter) OAuth routes - Note: X Ads API uses OAuth 1.0a
  app.get("/api/x-auth/connect", isAuthenticated, (req, res) => {
    // X Ads API requires OAuth 1.0a which is more complex
    // For now, return placeholder
    res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2>X (Twitter) Ads Integration</h2>
          <p>X Ads API uses OAuth 1.0a authentication.</p>
          <p>Please contact support for setup assistance.</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Close</button>
        </body>
      </html>
    `);
  });

  app.post("/api/x-auth/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteXSettings(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.get("/api/x-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getXSettings(userId);
      
      if (settings) {
        res.json({
          connected: settings.connected,
          accountId: settings.accountId,
          accountName: settings.accountName,
          accessToken: !!settings.accessToken,
        });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Newsletter routes
  app.get("/api/newsletters", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newsletters = await storage.getNewslettersByUserId(userId);
      res.json(newsletters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch newsletters" });
    }
  });

  app.post("/api/newsletters", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject, content, recipients } = req.body;
      
      console.log('[Newsletter] Create request body:', { subject, content, recipients: recipients?.length || 'undefined' });

      if (!subject || !content || !recipients || recipients.length === 0) {
        console.log('[Newsletter] Validation failed:', { subject: !!subject, content: !!content, recipients: recipients?.length });
        return res.status(400).json({ error: "Missing required fields" });
      }

      const newsletter = await storage.createNewsletter({
        userId,
        subject,
        content,
        recipients,
        status: "draft",
      });

      res.status(201).json(newsletter);
    } catch (error) {
      console.error("Newsletter creation error:", error);
      res.status(500).json({ error: "Failed to create newsletter" });
    }
  });

  app.post("/api/newsletters/:id/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newsletterId = req.params.id;

      // Fetch newsletter
      const newsletter = await storage.getNewsletter(newsletterId);
      if (!newsletter || newsletter.userId !== userId) {
        return res.status(404).json({ error: "Newsletter not found" });
      }

      if (newsletter.status === "sent") {
        return res.status(400).json({ error: "Newsletter has already been sent" });
      }

      // Fetch user/seller information for "from" field
      const seller = await storage.getUser(userId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Build recipients list from newsletter.recipients (array of email strings)
      const recipients = newsletter.recipients.map((email: string) => ({ email }));

      if (recipients.length === 0) {
        return res.status(400).json({ error: "No recipients found" });
      }

      // Send newsletter via Resend - use verified upfirst.io domain
      const result = await notificationService.sendNewsletter({
        userId,
        newsletterId,
        recipients,
        from: `${seller.firstName || seller.username} via Upfirst <hello@upfirst.io>`,
        replyTo: seller.email,
        subject: newsletter.subject,
        htmlContent: newsletter.content,
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send newsletter" });
      }

      // Update newsletter status
      await storage.updateNewsletter(newsletterId, {
        status: "sent",
        sentAt: new Date(),
      });

      res.json({ 
        success: true, 
        message: `Newsletter sent to ${recipients.length} recipients`,
        batchId: result.batchId 
      });
    } catch (error) {
      console.error("Newsletter send error:", error);
      res.status(500).json({ error: "Failed to send newsletter" });
    }
  });

  app.delete("/api/newsletters/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newsletterId = req.params.id;

      const newsletter = await storage.getNewsletter(newsletterId);
      if (!newsletter || newsletter.userId !== userId) {
        return res.status(404).json({ error: "Newsletter not found" });
      }

      await storage.deleteNewsletter(newsletterId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete newsletter" });
    }
  });

  // Send test newsletter
  app.post("/api/newsletters/:id/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newsletterId = req.params.id;
      const { testEmail } = req.body;

      if (!testEmail?.trim()) {
        return res.status(400).json({ error: "Test email address is required" });
      }

      const newsletter = await storage.getNewsletter(newsletterId);
      if (!newsletter || newsletter.userId !== userId) {
        return res.status(404).json({ error: "Newsletter not found" });
      }

      const seller = await storage.getUser(userId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Send test email using notification service
      const result = await notificationService.sendNewsletter({
        userId,
        newsletterId,
        recipients: [{ email: testEmail.trim() }],
        from: `${seller.firstName || seller.username} via Upfirst <hello@upfirst.io>`,
        replyTo: seller.email,
        subject: `[TEST] ${newsletter.subject}`,
        htmlContent: newsletter.content,
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send test email" });
      }

      res.json({ 
        success: true, 
        message: `Test email sent to ${testEmail}` 
      });
    } catch (error) {
      console.error("Test email send error:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Newsletter Templates
  app.get("/api/newsletter-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getNewsletterTemplatesByUserId(userId);
      res.json(templates);
    } catch (error) {
      console.error("Get newsletter templates error:", error);
      res.status(500).json({ error: "Failed to get newsletter templates" });
    }
  });

  app.post("/api/newsletter-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, subject, content, htmlContent, images } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Template name is required" });
      }

      if (!subject?.trim()) {
        return res.status(400).json({ error: "Subject is required" });
      }

      const template = await storage.createNewsletterTemplate({
        userId,
        name: name.trim(),
        subject: subject.trim(),
        content: content || '',
        htmlContent: htmlContent || null,
        images: images || null,
      });

      res.json(template);
    } catch (error) {
      console.error("Create newsletter template error:", error);
      res.status(500).json({ error: "Failed to create newsletter template" });
    }
  });

  app.delete("/api/newsletter-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateId = req.params.id;

      const template = await storage.getNewsletterTemplate(templateId);
      if (!template || template.userId !== userId) {
        return res.status(404).json({ error: "Template not found" });
      }

      await storage.deleteNewsletterTemplate(templateId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete newsletter template error:", error);
      res.status(500).json({ error: "Failed to delete newsletter template" });
    }
  });

  // Subscriber Groups
  app.get("/api/subscriber-groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getSubscriberGroupsByUserId(userId);
      
      // Add subscriber counts to each group
      const groupsWithCounts = await Promise.all(groups.map(async (group) => {
        const subscribers = await storage.getSubscribersByGroupId(userId, group.id);
        return {
          ...group,
          subscriberCount: subscribers.length
        };
      }));
      
      res.json(groupsWithCounts);
    } catch (error) {
      console.error("Get subscriber groups error:", error);
      res.status(500).json({ error: "Failed to get subscriber groups" });
    }
  });

  app.post("/api/subscriber-groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, description } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Group name is required" });
      }

      const group = await storage.createSubscriberGroup({
        userId,
        name: name.trim(),
        description: description?.trim() || null,
      });

      res.json(group);
    } catch (error) {
      console.error("Create subscriber group error:", error);
      res.status(500).json({ error: "Failed to create subscriber group" });
    }
  });

  app.delete("/api/subscriber-groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = req.params.id;

      const group = await storage.getSubscriberGroup(groupId);
      if (!group || group.userId !== userId) {
        return res.status(404).json({ error: "Subscriber group not found" });
      }

      await storage.deleteSubscriberGroup(groupId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subscriber group error:", error);
      res.status(500).json({ error: "Failed to delete subscriber group" });
    }
  });

  // Newsletter Analytics
  app.get("/api/newsletter-analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getNewsletterAnalyticsByUserId(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Get newsletter analytics error:", error);
      res.status(500).json({ error: "Failed to get newsletter analytics" });
    }
  });

  // Subscribers
  app.get("/api/subscribers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId } = req.query;
      
      let subscribers;
      if (groupId) {
        // Get subscribers for specific group
        subscribers = await storage.getSubscribersByGroupId(userId, groupId as string);
      } else {
        // Get all subscribers
        subscribers = await storage.getSubscribersByUserId(userId);
      }
      
      res.json(subscribers);
    } catch (error) {
      console.error("Get subscribers error:", error);
      res.status(500).json({ error: "Failed to get subscribers" });
    }
  });

  // Bulk import subscribers from CSV
  app.post("/api/subscribers/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscribers } = req.body; // Array of { email, name }

      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        return res.status(400).json({ error: "Subscribers array is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const results = {
        success: [] as string[],
        skipped: [] as { email: string; reason: string }[],
        errors: [] as { email: string; reason: string }[],
      };

      for (const item of subscribers) {
        const email = item.email?.trim().toLowerCase();
        const name = item.name?.trim() || null;

        // Validate email
        if (!email) {
          results.skipped.push({ email: item.email || 'unknown', reason: 'Empty email' });
          continue;
        }

        if (!emailRegex.test(email)) {
          results.skipped.push({ email, reason: 'Invalid email format' });
          continue;
        }

        try {
          // Check if subscriber already exists
          const existing = await storage.getSubscriberByEmail(userId, email);
          if (existing) {
            results.skipped.push({ email, reason: 'Already exists' });
            continue;
          }

          // Create subscriber
          await storage.createSubscriber({
            userId,
            email,
            name,
          });

          results.success.push(email);
        } catch (error: any) {
          results.errors.push({ email, reason: error.message || 'Failed to create' });
        }
      }

      res.json({
        total: subscribers.length,
        ...results,
        message: `Imported ${results.success.length} subscribers. ${results.skipped.length} skipped, ${results.errors.length} errors.`,
      });
    } catch (error) {
      console.error("Bulk import subscribers error:", error);
      res.status(500).json({ error: "Failed to import subscribers" });
    }
  });

  app.post("/api/subscribers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email, name, groupIds } = req.body;

      if (!email?.trim()) {
        return res.status(400).json({ error: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      const subscriber = await storage.createSubscriber({
        userId,
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
      });

      // Add to groups if specified
      if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
        for (const groupId of groupIds) {
          await storage.addSubscriberToGroup(subscriber.id, groupId);
        }
      }

      res.json(subscriber);
    } catch (error: any) {
      console.error("Create subscriber error:", error);
      if (error.message?.includes('unique constraint')) {
        return res.status(400).json({ error: "Subscriber with this email already exists" });
      }
      res.status(500).json({ error: "Failed to create subscriber" });
    }
  });

  app.delete("/api/subscribers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscriberId = req.params.id;

      const subscriber = await storage.getSubscriber(subscriberId);
      if (!subscriber || subscriber.userId !== userId) {
        return res.status(404).json({ error: "Subscriber not found" });
      }

      await storage.deleteSubscriber(subscriberId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subscriber error:", error);
      res.status(500).json({ error: "Failed to delete subscriber" });
    }
  });

  // NFT Minting route
  app.post("/api/nft/mint", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId, productData, walletAddress } = req.body;

      if (!orderId || !productData || !walletAddress) {
        return res.status(400).json({ error: "Missing required fields (orderId, productData, walletAddress)" });
      }

      // Verify order belongs to user
      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if order is fully paid
      if (order.paymentStatus !== "fully_paid") {
        return res.status(400).json({ error: "Order must be fully paid before minting NFT" });
      }

      // Check if NFT already minted for this order
      const existingMint = await storage.getNftMintByOrderId(orderId);
      if (existingMint) {
        return res.status(400).json({ 
          error: "NFT already minted for this order",
          mintAddress: existingMint.mintAddress 
        });
      }

      // Import Solana service dynamically to handle missing env vars gracefully
      const { solanaService } = await import("./solanaService");

      // Prepare NFT metadata
      const nftMetadata = {
        name: productData.name || "Product NFT",
        symbol: "UPSH",
        description: `NFT for ${productData.name} purchased on Uppshop`,
        image: productData.image || "",
        attributes: [
          { trait_type: "Product ID", value: productData.id || "unknown" },
          { trait_type: "Price", value: productData.price?.toString() || "0" },
          { trait_type: "Order ID", value: orderId },
        ],
        properties: {
          category: productData.category || "product",
        },
      };

      console.log("[NFT Mint] Starting mint for order:", orderId);
      console.log("[NFT Mint] Recipient wallet:", walletAddress);

      // Mint the actual NFT on Solana
      const mintResult = await solanaService.mintNFT(walletAddress, nftMetadata);

      console.log("[NFT Mint] Success!", mintResult);

      // Store mint record in database
      const nftMint = await storage.createNftMint({
        orderId,
        userId,
        mintAddress: mintResult.mintAddress,
        transactionSignature: mintResult.transactionSignature,
        metadata: { ...productData, metadataUri: mintResult.metadataUri },
      });

      res.json({
        success: true,
        signature: mintResult.transactionSignature,
        mintAddress: mintResult.mintAddress,
        metadataUri: mintResult.metadataUri,
        message: "NFT minted successfully on Solana blockchain!"
      });
    } catch (error: any) {
      console.error("NFT minting error:", error);
      
      if (error.message?.includes("SOLANA_PAYER_PRIVATE_KEY")) {
        return res.status(500).json({ 
          error: "Solana wallet not configured. Please contact support." 
        });
      }
      
      res.status(500).json({ 
        error: error.message || "Failed to mint NFT" 
      });
    }
  });

  // Wholesale Products Routes
  app.get("/api/wholesale/products", async (req, res) => {
    try {
      const products = await storage.getAllWholesaleProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching wholesale products:", error);
      res.status(500).json({ message: "Failed to fetch wholesale products" });
    }
  });

  app.get("/api/wholesale/products/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const products = await storage.getWholesaleProductsBySellerId(sellerId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching seller wholesale products:", error);
      res.status(500).json({ message: "Failed to fetch seller wholesale products" });
    }
  });

  app.get("/api/wholesale/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.getWholesaleProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Wholesale product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching wholesale product:", error);
      res.status(500).json({ message: "Failed to fetch wholesale product" });
    }
  });

  app.post("/api/wholesale/products", isAuthenticated, isSeller, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const productData = {
        ...req.body,
        sellerId: userId,
      };

      const product = await storage.createWholesaleProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating wholesale product:", error);
      res.status(500).json({ message: "Failed to create wholesale product" });
    }
  });

  app.patch("/api/wholesale/products/:id", isAuthenticated, isSeller, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existingProduct = await storage.getWholesaleProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Wholesale product not found" });
      }
      
      if (existingProduct.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized to update this product" });
      }

      const updatedProduct = await storage.updateWholesaleProduct(id, req.body);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating wholesale product:", error);
      res.status(500).json({ message: "Failed to update wholesale product" });
    }
  });

  app.delete("/api/wholesale/products/:id", isAuthenticated, isSeller, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existingProduct = await storage.getWholesaleProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Wholesale product not found" });
      }
      
      if (existingProduct.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized to delete this product" });
      }

      await storage.deleteWholesaleProduct(id);
      res.json({ message: "Wholesale product deleted successfully" });
    } catch (error) {
      console.error("Error deleting wholesale product:", error);
      res.status(500).json({ message: "Failed to delete wholesale product" });
    }
  });

  // Wholesale Invitations Routes
  app.get("/api/wholesale/invitations", isAuthenticated, isSeller, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitations = await storage.getWholesaleInvitationsBySellerId(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching wholesale invitations:", error);
      res.status(500).json({ message: "Failed to fetch wholesale invitations" });
    }
  });

  app.post("/api/wholesale/invitations", isAuthenticated, isSeller, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const invitationData = {
        ...req.body,
        sellerId: userId,
      };

      const invitation = await storage.createWholesaleInvitation(invitationData);
      res.status(201).json(invitation);
    } catch (error) {
      console.error("Error creating wholesale invitation:", error);
      res.status(500).json({ message: "Failed to create wholesale invitation" });
    }
  });

  app.get("/api/wholesale/invitations/token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getWholesaleInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      res.json(invitation);
    } catch (error) {
      console.error("Error fetching wholesale invitation:", error);
      res.status(500).json({ message: "Failed to fetch wholesale invitation" });
    }
  });

  app.post("/api/wholesale/invitations/:token/accept", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = req.user.claims.sub;
      
      const invitation = await storage.getWholesaleInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation has already been processed" });
      }

      const updated = await storage.acceptWholesaleInvitation(token, userId);
      res.json(updated);
    } catch (error) {
      console.error("Error accepting wholesale invitation:", error);
      res.status(500).json({ message: "Failed to accept wholesale invitation" });
    }
  });

  app.delete("/api/wholesale/invitations/:id", isAuthenticated, isSeller, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWholesaleInvitation(id);
      res.json({ message: "Wholesale invitation deleted successfully" });
    } catch (error) {
      console.error("Error deleting wholesale invitation:", error);
      res.status(500).json({ message: "Failed to delete wholesale invitation" });
    }
  });

  // Buyer Wholesale Routes (Invitation-Protected)
  app.get("/api/wholesale/buyer/catalog", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(403).json({ message: "User not found" });
      }

      // Check if user has any accepted invitations
      const allInvitations = await storage.getAllWholesaleInvitations();
      const userInvitations = allInvitations.filter(
        inv => inv.buyerEmail === user.email && inv.status === "accepted"
      );

      if (userInvitations.length === 0) {
        // No invitations - return empty catalog
        return res.json([]);
      }

      // Get all wholesale products from sellers who invited this buyer
      const sellerIds = userInvitations.map(inv => inv.sellerId);
      const allProducts = await storage.getAllWholesaleProducts();
      const invitedProducts = allProducts.filter(p => sellerIds.includes(p.sellerId));

      res.json(invitedProducts);
    } catch (error) {
      console.error("Error fetching buyer wholesale catalog:", error);
      res.status(500).json({ message: "Failed to fetch catalog" });
    }
  });

  app.get("/api/wholesale/buyer/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(403).json({ message: "User not found" });
      }

      // Get the product
      const product = await storage.getWholesaleProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if user has accepted invitation from this seller
      const allInvitations = await storage.getAllWholesaleInvitations();
      const hasInvitation = allInvitations.some(
        inv => inv.buyerEmail === user.email && 
               inv.sellerId === product.sellerId && 
               inv.status === "accepted"
      );

      if (!hasInvitation) {
        return res.status(403).json({ message: "Access denied. Invitation required." });
      }

      res.json(product);
    } catch (error) {
      console.error("Error fetching wholesale product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Instagram OAuth Routes
  app.get("/api/instagram/connect", isAuthenticated, async (req: any, res) => {
    try {
      const instagramAppId = process.env.INSTAGRAM_APP_ID;
      const redirectUri = `${process.env.REPL_URL || 'http://localhost:5000'}/api/instagram/callback`;
      
      if (!instagramAppId) {
        return res.status(400).json({ 
          error: "Instagram integration is not configured yet. Contact support to enable this feature.",
          errorCode: "INSTAGRAM_NOT_CONFIGURED"
        });
      }

      // Store user ID in session for callback
      req.session.instagramConnectUserId = req.user.claims.sub;
      
      const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${instagramAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile&response_type=code`;
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating Instagram OAuth:", error);
      res.status(500).json({ message: "Failed to initiate Instagram connection" });
    }
  });

  app.get("/api/instagram/callback", async (req: any, res) => {
    try {
      const { code } = req.query;
      const userId = req.session.instagramConnectUserId;

      if (!code || !userId) {
        return res.redirect('/settings?instagram=error');
      }

      const instagramAppId = process.env.INSTAGRAM_APP_ID;
      const instagramAppSecret = process.env.INSTAGRAM_APP_SECRET;
      const redirectUri = `${process.env.REPL_URL || 'http://localhost:5000'}/api/instagram/callback`;

      if (!instagramAppId || !instagramAppSecret) {
        return res.redirect('/settings?instagram=config_error');
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: instagramAppId,
          client_secret: instagramAppSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code as string,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Instagram token exchange failed:", await tokenResponse.text());
        return res.redirect('/settings?instagram=auth_error');
      }

      const tokenData = await tokenResponse.json();
      const { access_token, user_id } = tokenData;

      // Get user profile information
      const profileResponse = await fetch(`https://graph.instagram.com/${user_id}?fields=id,username&access_token=${access_token}`);
      
      if (!profileResponse.ok) {
        console.error("Instagram profile fetch failed:", await profileResponse.text());
        return res.redirect('/settings?instagram=profile_error');
      }

      const profileData = await profileResponse.json();

      // Update user with Instagram connection
      const user = await storage.getUser(userId);
      if (user) {
        await storage.upsertUser({
          ...user,
          instagramUserId: profileData.id,
          instagramUsername: profileData.username,
          instagramAccessToken: access_token,
          username: profileData.username, // Also update the main username field
        });
      }

      // Clear session data
      delete req.session.instagramConnectUserId;

      res.redirect('/settings?instagram=success');
    } catch (error) {
      console.error("Error in Instagram OAuth callback:", error);
      res.redirect('/settings?instagram=error');
    }
  });

  app.post("/api/instagram/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const user = await storage.getUser(userId);
      if (user) {
        await storage.upsertUser({
          ...user,
          instagramUserId: null,
          instagramUsername: null,
          instagramAccessToken: null,
        });
      }

      res.json({ message: "Instagram disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting Instagram:", error);
      res.status(500).json({ message: "Failed to disconnect Instagram" });
    }
  });

  // Currency API routes
  app.get("/api/currency/rates", async (req, res) => {
    try {
      const ratesData = await getExchangeRates();
      res.json(ratesData);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  app.get("/api/currency/detect", async (req, res) => {
    try {
      // Get country code from IP geolocation header (provided by Replit)
      const countryCode = req.headers['x-replit-user-geo-country-code'] as string || 
                         req.headers['cf-ipcountry'] as string;
      
      const currency = await getUserCurrency(countryCode);
      res.json({ currency, countryCode: countryCode || 'US' });
    } catch (error) {
      console.error("Error detecting currency:", error);
      res.json({ currency: 'USD', countryCode: 'US' });
    }
  });

  // Object Storage endpoints - from javascript_object_storage integration
  // Endpoint to get presigned upload URL
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint to normalize uploaded image path (after upload completes)
  app.put("/api/product-images", async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      // Normalize the path and set public ACL (product images are public)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: "system", // Product images owned by system
          visibility: "public", // Product images are publicly accessible
        }
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting product image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint to serve uploaded images (public access)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Extract just the object path (remove /objects/ prefix)
      const objectPath = req.params.objectPath || req.params[0];
      const objectFile = await objectStorageService.getObjectEntityFile(
        objectPath,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
