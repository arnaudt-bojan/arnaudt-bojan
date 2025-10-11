import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertProductSchema, orderStatusEnum, insertSavedAddressSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import { setupAuth } from "./replitAuth";
import { requireAuth, requireUserType, requireCapability, requireStoreAccess, requireProductAccess, requireOrderAccess, requireCanPurchase } from "./middleware/auth";
import Stripe from "stripe";
import { getExchangeRates, getUserCurrency } from "./currencyService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import emailAuthRoutes from "./auth-email";
import { createNotificationService } from "./notifications";
import { PDFService } from "./pdf-service";
import documentRoutes from "./routes/documents";
import { DocumentGenerator } from "./services/document-generator";
import { logger } from "./logger";
import { generateUniqueUsername, generateOrderNumber } from "./utils";

// Initialize PDF service with Stripe secret key
const pdfService = new PDFService(process.env.STRIPE_SECRET_KEY);

// Initialize notification service
const notificationService = createNotificationService(storage, pdfService);

// Reference: javascript_stripe integration
// Initialize Stripe with secret key when available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Email-based authentication routes
  app.use("/api/auth/email", emailAuthRoutes);

  // Document generation routes (invoices & packing slips)
  app.use("/api/documents", documentRoutes);

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (error) {
      logger.error("Failed to fetch notifications", error, { userId: req.user.claims.sub });
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req: any, res) => {
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
      logger.error("Failed to mark notification as read", error, { notificationId: req.params.id, userId: req.user?.claims?.sub });
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req: any, res) => {
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
      logger.error("Failed to delete notification", error, { notificationId: req.params.id, userId: req.user?.claims?.sub });
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
      logger.error("Failed to fetch user", error, { userId: req.user?.claims?.sub });
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/sellers", async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const sellers = allUsers.filter(u => 
        u.role === "seller" || u.role === "owner" || u.role === "admin"
      );
      
      // Return only public fields for each seller
      const publicSellers = sellers.map(seller => ({
        id: seller.id,
        username: seller.username,
        firstName: seller.firstName,
        lastName: seller.lastName,
        profileImageUrl: seller.profileImageUrl,
        logo: seller.storeLogo,
        banner: seller.storeBanner,
        storeActive: seller.storeActive,
      }));
      
      res.json(publicSellers);
    } catch (error) {
      logger.error("Error fetching sellers", error);
      res.status(500).json({ error: "Failed to fetch sellers" });
    }
  });
  
  // Get seller by username (public endpoint for storefronts and previews)
  app.get("/api/sellers/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      if (!username || username.trim() === '') {
        return res.status(400).json({ error: "Username is required" });
      }
      
      const allUsers = await storage.getAllUsers();
      const seller = allUsers.find(u => 
        u.username === username && (u.role === "seller" || u.role === "owner" || u.role === "admin")
      );
      
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }
      
      // Return only public fields for storefront display
      const publicSellerInfo = {
        id: seller.id,
        username: seller.username,
        firstName: seller.firstName,
        lastName: seller.lastName,
        profileImageUrl: seller.profileImageUrl,
        logo: seller.storeLogo,
        banner: seller.storeBanner,
        storeActive: seller.storeActive,
        shippingPolicy: seller.shippingPolicy,
        returnsPolicy: seller.returnsPolicy,
        aboutStory: seller.aboutStory,
        contactEmail: seller.contactEmail,
        socialInstagram: seller.socialInstagram,
        socialTwitter: seller.socialTwitter,
        socialTiktok: seller.socialTiktok,
        socialSnapchat: seller.socialSnapchat,
        socialWebsite: seller.socialWebsite,
      };
      
      res.json(publicSellerInfo);
    } catch (error) {
      logger.error("Error fetching seller", error);
      res.status(500).json({ error: "Failed to fetch seller" });
    }
  });
  
  // Get seller by ID (public endpoint for order success pages)
  app.get("/api/sellers/id/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      
      const seller = await storage.getUser(sellerId);
      
      if (!seller || (seller.role !== 'seller' && seller.role !== 'owner' && seller.role !== 'admin')) {
        return res.status(404).json({ error: "Seller not found" });
      }
      
      // Return only public fields for order display
      const publicSellerInfo = {
        id: seller.id,
        username: seller.username,
        firstName: seller.firstName,
        lastName: seller.lastName,
        email: seller.email, // Include email for contact
        contactEmail: seller.contactEmail, // Include custom contact email if set
        profileImageUrl: seller.profileImageUrl,
        logo: seller.storeLogo,
        banner: seller.storeBanner,
        storeActive: seller.storeActive,
        shippingPolicy: seller.shippingPolicy,
        returnsPolicy: seller.returnsPolicy,
      };
      
      res.json(publicSellerInfo);
    } catch (error) {
      logger.error("Error fetching seller by ID", error);
      res.status(500).json({ error: "Failed to fetch seller" });
    }
  });

  // Seller payment setup status
  app.get("/api/seller/payment-setup", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const hasStripeConnected = !!user.stripeConnectedAccountId;
      // Only return currency if Stripe is connected and has a currency set
      const currency = hasStripeConnected ? (user.listingCurrency || null) : null;
      
      res.json({
        hasStripeConnected,
        currency,
        stripeChargesEnabled: user.stripeChargesEnabled === 1,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment setup status" });
    }
  });

  // Seller-specific products (only products owned by this seller)
  app.get("/api/seller/products", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allProducts = await storage.getAllProducts();
      const sellerProducts = allProducts.filter(p => p.sellerId === userId);
      res.json(sellerProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Public products endpoint (for storefront - only active and coming-soon products)
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      // Filter to only show active and coming-soon products to public
      const publicProducts = products.filter(p => 
        p.status === "active" || p.status === "coming-soon"
      );
      res.json(publicProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  
  // Get products by seller ID (for seller storefronts - only active and coming-soon)
  app.get("/api/products/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      
      // Get seller's currency
      const seller = await storage.getUser(sellerId);
      const currency = seller?.listingCurrency || 'USD';
      
      const allProducts = await storage.getAllProducts();
      // Filter to only show active and coming-soon products for public storefronts
      const sellerProducts = allProducts.filter(p => 
        p.sellerId === sellerId && 
        (p.status === "active" || p.status === "coming-soon")
      );
      
      // Add currency to each product
      const productsWithCurrency = sellerProducts.map(p => ({
        ...p,
        currency,
      }));
      
      res.json(productsWithCurrency);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch seller products" });
    }
  });

  app.get("/api/products/:id", async (req: any, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Check if user is authenticated and is the product owner
      const isAuthenticated = req.isAuthenticated() && req.user?.claims?.sub;
      const isOwner = isAuthenticated && req.user.claims.sub === product.sellerId;
      
      // If not owner, only show active and coming-soon products
      if (!isOwner && product.status !== "active" && product.status !== "coming-soon") {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Get seller's currency to include in response
      const seller = await storage.getUser(product.sellerId);
      const currency = seller?.listingCurrency || 'USD';
      
      res.json({
        ...product,
        currency, // Include seller's currency as single source of truth
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if Stripe is connected and sync currency if needed
      if (user?.stripeConnectedAccountId && stripe) {
        try {
          const account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
          const stripeCurrency = account.default_currency?.toUpperCase() || 'USD';
          
          // Update user currency if it's different from Stripe
          if (user.listingCurrency !== stripeCurrency) {
            await storage.upsertUser({
              ...user,
              listingCurrency: stripeCurrency,
            });
            logger.info(`[Product Creation] Synced currency from Stripe: ${stripeCurrency}`);
          }
        } catch (error) {
          logger.error("[Product Creation] Failed to sync Stripe currency:", error);
        }
      }
      
      const validationResult = insertProductSchema.safeParse({
        ...req.body,
        sellerId: userId, // Add seller ID from authenticated user
      });
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      // Generate SKU if not provided
      const { generateProductSKU, generateVariantSKU } = await import('../shared/sku-generator');
      const productData = validationResult.data;
      
      if (!productData.sku) {
        productData.sku = generateProductSKU();
      }
      
      // Generate variant SKUs if product has variants
      if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
        productData.variants = productData.variants.map((variant: any) => {
          if (!variant.sku) {
            variant.sku = generateVariantSKU(productData.sku!, {
              color: variant.color,
              size: variant.size,
            });
          }
          return variant;
        });
      }

      const product = await storage.createProduct(productData);

      // Auto-start 30-day trial if this is seller's first product
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

          if (user.email) {
            await notificationService.sendEmail({
              to: user.email,
              from: 'Upfirst <hello@upfirst.io>',
              subject: `Product Listed: ${product.name}`,
              html: emailHtml,
            });
          }

          logger.info(`[Notifications] Product listing confirmation sent to ${user.email}`);
        } catch (error) {
          logger.error("[Notifications] Failed to send product listing notifications:", error);
          // Don't fail the request if notifications fail
        }
      }

      res.status(201).json(product);
    } catch (error) {
      logger.error("Error creating product", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.post("/api/products/bulk", requireAuth, requireUserType('seller'), async (req: any, res) => {
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

      // SECURITY: Extract customer info and cart items (NOT totals/prices)
      const { customerEmail, customerName, customerAddress, items, destination } = req.body;
      
      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email is required for all orders" });
      }

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Cart items are required" });
      }

      if (!destination || !destination.country) {
        return res.status(400).json({ error: "Shipping destination is required" });
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
        const [firstName, ...lastNameParts] = (customerName || "Guest User").split(" ");
        const username = await generateUniqueUsername();
        
        existingUser = await storage.upsertUser({
          id: newUserId,
          email: normalizedEmail,
          username,
          firstName: firstName || "Guest",
          lastName: lastNameParts.join(" ") || "User",
          profileImageUrl: null,
          role: "buyer",
          password: null,
        });

        logger.info(`[Guest Checkout] Created new buyer account for ${normalizedEmail} with username ${username}`);
      }

      userId = existingUser.id;

      // SECURITY: Validate cart items and fetch server-side prices
      const validation = await cartValidationService.validateCart(items);
      
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Invalid cart items", 
          details: validation.errors 
        });
      }

      // SECURITY: Calculate shipping server-side
      const shipping = await shippingService.calculateShipping(
        items.map(i => ({ id: i.productId, quantity: i.quantity })),
        destination
      );

      // SECURITY: Calculate tax server-side
      const taxableAmount = validation.total + shipping.cost;
      const taxAmount = estimateTax(taxableAmount);

      // SECURITY: Calculate order totals server-side using PricingService
      const pricing = calculatePricing(
        validation.items,
        shipping.cost,
        taxAmount
      );

      // Get seller's currency from first product
      let sellerCurrency = 'USD'; // Default fallback
      if (validation.items.length > 0) {
        const firstProduct = await storage.getProduct(validation.items[0].id);
        if (firstProduct?.sellerId) {
          const seller = await storage.getUser(firstProduct.sellerId);
          if (seller?.listingCurrency) {
            sellerCurrency = seller.listingCurrency;
          }
        }
      }

      // Create order with SERVER-CALCULATED values only
      const orderData = {
        userId,
        customerName,
        customerEmail: normalizedEmail,
        customerAddress,
        items: JSON.stringify(
          validation.items.map((item) => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            productType: item.productType,
            depositAmount: item.depositAmount,
            requiresDeposit: item.requiresDeposit,
          }))
        ),
        total: pricing.fullTotal.toString(),
        amountPaid: "0", // Will be updated after payment
        remainingBalance: pricing.payingDepositOnly ? pricing.remainingBalance.toString() : "0",
        paymentType: pricing.payingDepositOnly ? "deposit" : "full",
        paymentStatus: "pending",
        status: "pending",
        subtotalBeforeTax: pricing.subtotal.toString(),
        taxAmount: taxAmount.toString(),
        currency: sellerCurrency, // Seller's currency at time of order
      };

      const order = await storage.createOrder(orderData);
      
      // Create order items for item-level tracking
      try {
        const items = JSON.parse(order.items);
        const orderItemsToCreate = items.map((item: any) => ({
          orderId: order.id,
          productId: item.productId || item.id, // Cart items use productId field
          productName: item.name,
          productImage: item.image || null,
          productType: item.productType || 'in-stock',
          quantity: item.quantity,
          price: String(item.price),
          subtotal: String(parseFloat(item.price) * item.quantity),
          depositAmount: item.depositAmount ? String(item.depositAmount) : null,
          requiresDeposit: item.requiresDeposit ? 1 : 0, // Coerce boolean to integer
          variant: item.variant || null,
          itemStatus: 'pending' as const,
        }));
        
        await storage.createOrderItems(orderItemsToCreate);
        logger.info(`[Order Items] Created ${orderItemsToCreate.length} order items for order ${order.id}`);
      } catch (error) {
        logger.error("[Order Items] Failed to create order items:", error);
        // Don't fail the order if items creation fails - legacy items field still works
      }
      
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
              logger.info(`[Notifications] Order confirmation sent for order ${order.id}`);
            }
          }
        } catch (error) {
          logger.error("[Notifications] Failed to send order notifications:", error);
        }
      })();
      
      res.status(201).json(order);
    } catch (error) {
      logger.error("Order creation error", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Seller-specific orders (only orders for products owned by this seller or their store)
  app.get("/api/seller/orders", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get canonical owner ID:
      // - For owner/seller/buyer roles: use their own ID (they own their products/orders)
      // - For team roles (admin/editor/viewer): use their sellerId if they're a team member (sellerId is set)
      // - For admins who ARE the seller (sellerId is null): use their own ID
      const isTeamMember = ["admin", "editor", "viewer"].includes(currentUser.role) && currentUser.sellerId;
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
      logger.error("Error fetching seller orders", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Refund routes for sellers
  // Process a refund (full, partial, or item-level)
  app.post("/api/orders/:orderId/refunds", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      const { orderId } = req.params;
      const { refundItems, reason, refundType } = req.body;
      const userId = req.user.claims.sub;
      
      // Validation
      if (!refundType || !['full', 'item'].includes(refundType)) {
        return res.status(400).json({ error: "Invalid refund type. Must be 'full' or 'item'" });
      }

      if (refundType === 'item' && (!refundItems || refundItems.length === 0)) {
        return res.status(400).json({ error: "refundItems required for item-level refund" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify seller owns this order
      const orderItems = await storage.getOrderItems(orderId);
      if (orderItems.length === 0) {
        return res.status(404).json({ error: "No order items found" });
      }

      // Check if seller owns the products (use first item's product to get seller)
      const firstItem = orderItems[0];
      const product = await storage.getProduct(firstItem.productId);
      if (!product || product.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to refund this order" });
      }

      // Calculate refund amount and validate - NEVER trust client-supplied amounts
      let refundAmount = 0;
      const itemsToRefund: Map<string, { item: any; quantity: number; amount: number }> = new Map();

      if (refundType === 'full') {
        // Full refund - calculate from remaining refundable amounts
        for (const item of orderItems) {
          const alreadyRefunded = parseFloat(item.refundedAmount || '0');
          const refundedQty = item.refundedQuantity || 0;
          const refundableQty = item.quantity - refundedQty;
          const itemTotal = parseFloat(item.subtotal);
          const itemRefundAmount = itemTotal - alreadyRefunded;
          
          if (refundableQty > 0 && itemRefundAmount > 0) {
            refundAmount += itemRefundAmount;
            itemsToRefund.set(item.id, {
              item,
              quantity: refundableQty,
              amount: itemRefundAmount,
            });
          }
        }
      } else if (refundType === 'item') {
        // Item-level refund with specified quantities
        // SECURITY: Always recompute amount from price × quantity, never trust client
        for (const refundItem of refundItems) {
          const item = orderItems.find(i => i.id === refundItem.itemId);
          if (!item) {
            return res.status(404).json({ error: `Order item ${refundItem.itemId} not found` });
          }

          const refundedQty = item.refundedQuantity || 0;
          const refundableQty = item.quantity - refundedQty;
          
          if (refundItem.quantity > refundableQty) {
            return res.status(400).json({ 
              error: `Cannot refund ${refundItem.quantity} units of item ${item.productName}. Only ${refundableQty} units available for refund.` 
            });
          }

          // SECURITY: Recompute refund amount from stored price - never trust client amount
          const pricePerUnit = parseFloat(item.price);
          const serverCalculatedAmount = pricePerUnit * refundItem.quantity;
          
          // Validate client amount matches (with small tolerance for floating point)
          const clientAmount = refundItem.amount || 0;
          const difference = Math.abs(serverCalculatedAmount - clientAmount);
          if (difference > 0.01) {
            console.warn(`[Refund Security] Client amount mismatch for item ${item.id}: client=${clientAmount}, server=${serverCalculatedAmount}`);
          }

          // Validate against remaining refundable balance
          const alreadyRefunded = parseFloat(item.refundedAmount || '0');
          const itemTotal = parseFloat(item.subtotal);
          const maxRefundable = itemTotal - alreadyRefunded;
          
          if (serverCalculatedAmount > maxRefundable + 0.01) {
            return res.status(400).json({ 
              error: `Refund amount $${serverCalculatedAmount.toFixed(2)} exceeds remaining refundable amount $${maxRefundable.toFixed(2)} for item ${item.productName}` 
            });
          }

          refundAmount += serverCalculatedAmount;
          itemsToRefund.set(item.id, {
            item,
            quantity: refundItem.quantity,
            amount: serverCalculatedAmount, // Use server-computed amount, not client amount
          });
        }
      }

      if (refundAmount <= 0) {
        return res.status(400).json({ error: "No refundable amount available" });
      }

      // Check if order has payment intents
      const paymentIntentId = order.stripeBalancePaymentIntentId || order.stripePaymentIntentId;
      
      let stripeRefund = null;
      
      // Process Stripe refund only if payment was made through Stripe
      if (paymentIntentId && order.paymentType !== 'manual' && order.paymentType !== 'cash') {
        logger.info(`[Refund] Processing Stripe refund for order ${orderId}, amount: $${refundAmount}`);
        
        stripeRefund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            orderId,
            refundType,
            orderItemIds: Array.from(itemsToRefund.keys()).join(','),
          }
        });
      } else {
        logger.info(`[Refund] Skipping Stripe refund for manual/cash payment - order ${orderId}, amount: $${refundAmount}`);
      }

      // Create refund records for each item
      const refunds = [];
      for (const [itemId, refundData] of itemsToRefund.entries()) {
        const { item, quantity, amount } = refundData;
        
        const refund = await storage.createRefund({
          orderId,
          orderItemId: item.id,
          amount: amount.toFixed(2),
          reason: reason || null,
          refundType: 'item',
          stripeRefundId: stripeRefund?.id || null,
          status: stripeRefund ? (stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending') : 'succeeded',
          processedBy: userId,
        });
        refunds.push(refund);

        // Update order item refund tracking
        const newRefundedQty = (item.refundedQuantity || 0) + quantity;
        const newRefundedAmount = parseFloat(item.refundedAmount || '0') + amount;
        const newStatus = newRefundedQty >= item.quantity ? 'refunded' : item.itemStatus;
        
        await storage.updateOrderItemRefund(
          item.id,
          newRefundedQty,
          newRefundedAmount.toFixed(2),
          newStatus
        );
      }

      // Update order payment status based on CUMULATIVE refunds
      // Get all refunds for this order (including the ones we just created)
      const allOrderRefunds = await storage.getRefundsByOrderId(orderId);
      const totalRefundedAmount = allOrderRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const orderTotal = parseFloat(order.amountPaid);
      
      // Update payment status based on cumulative refunds
      const newPaymentStatus = totalRefundedAmount >= orderTotal - 0.01 ? 'refunded' : 'partially_refunded';
      await storage.updateOrderPaymentStatus(orderId, newPaymentStatus);

      // Send refund notification (async, don't wait)
      void (async () => {
        try {
          const seller = await storage.getUser(userId);
          if (!seller) return;

          // Send email notification for each refunded item
          for (const [itemId, refundData] of itemsToRefund.entries()) {
            const { item, quantity, amount } = refundData;
            await notificationService.sendItemRefunded(
              order,
              item,
              seller,
              amount,
              quantity
            );
          }
          
          logger.info(`[Notifications] Refund notification emails sent for order ${orderId}, ${itemsToRefund.size} items`);
        } catch (error) {
          logger.error("[Notifications] Failed to send refund notification:", error);
        }
      })();

      res.json({
        success: true,
        refunds,
        stripeRefundId: stripeRefund?.id || null,
        refundAmount: refundAmount,
        status: stripeRefund?.status || 'succeeded',
      });
    } catch (error: any) {
      logger.error("Refund error", error);
      res.status(500).json({ error: error.message || "Failed to process refund" });
    }
  });

  // Mark order items as returned
  app.patch("/api/orders/:orderId/items/:itemId/returned", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const { orderId, itemId } = req.params;
      const userId = req.user.claims.sub;

      const orderItem = await storage.getOrderItemById(itemId);
      if (!orderItem || orderItem.orderId !== orderId) {
        return res.status(404).json({ error: "Order item not found" });
      }

      // Verify seller owns this product
      const product = await storage.getProduct(orderItem.productId);
      if (!product || product.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Update item status to returned
      const updatedItem = await storage.updateOrderItemStatus(itemId, 'returned');

      res.json(updatedItem);
    } catch (error: any) {
      logger.error("Error marking item as returned", error);
      res.status(500).json({ error: "Failed to mark item as returned" });
    }
  });

  // Get refund history for an order
  app.get("/api/orders/:orderId/refunds", requireAuth, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.claims.sub;

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify access (buyer or seller)
      const isBuyer = order.userId === userId;
      if (!isBuyer) {
        const orderItems = await storage.getOrderItems(orderId);
        if (orderItems.length > 0) {
          const product = await storage.getProduct(orderItems[0].productId);
          if (!product || product.sellerId !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
          }
        } else {
          return res.status(403).json({ error: "Unauthorized" });
        }
      }

      const refunds = await storage.getRefundsByOrderId(orderId);
      res.json(refunds);
    } catch (error: any) {
      logger.error("Error fetching refunds", error);
      res.status(500).json({ error: "Failed to fetch refunds" });
    }
  });

  // DEPRECATED: Use /api/seller/orders instead for proper filtering
  // This endpoint should only be used by admins/owners for platform-wide order management
  app.get("/api/orders", requireAuth, async (req: any, res) => {
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

  app.get("/api/orders/my", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getOrdersByUserId(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user orders" });
    }
  });

  // Buyer orders endpoint - must be before /:id route
  app.get("/api/orders/my-orders", requireAuth, async (req: any, res) => {
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
  app.get("/api/orders/all-orders", requireAuth, async (req: any, res) => {
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

  // Public order lookup (for guest checkout - no auth required)
  app.get("/api/orders/lookup/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required for order lookup" });
      }

      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Verify email matches (case-insensitive)
      if (order.customerEmail.toLowerCase() !== (email as string).toLowerCase()) {
        return res.status(403).json({ error: "Invalid email for this order" });
      }
      
      res.json(order);
    } catch (error) {
      logger.error("Order lookup error", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.get("/api/orders/:id", requireAuth, async (req: any, res) => {
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

  app.put("/api/products/:id", requireAuth, requireUserType('seller'), async (req, res) => {
    try {
      const validationResult = insertProductSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      // Generate SKUs for any variants that don't have them
      const { generateProductSKU, generateVariantSKU } = await import('../shared/sku-generator');
      const productData = validationResult.data;
      
      // If updating SKU and it's empty, generate one
      if (productData.sku === '' || (productData.sku === undefined && req.body.sku === '')) {
        productData.sku = generateProductSKU();
      }
      
      // Generate variant SKUs if needed
      if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
        // Get existing product to use its SKU for variant generation
        const existingProduct = await storage.getProduct(req.params.id);
        const baseSKU = productData.sku || existingProduct?.sku || generateProductSKU();
        
        productData.variants = productData.variants.map((variant: any) => {
          if (!variant.sku) {
            variant.sku = generateVariantSKU(baseSKU, {
              color: variant.color,
              size: variant.size,
            });
          }
          return variant;
        });
      }

      const product = await storage.updateProduct(req.params.id, productData);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Update product status (quick action)
  app.patch("/api/products/:id/status", requireAuth, requireUserType('seller'), async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['draft', 'active', 'coming-soon', 'paused', 'out-of-stock', 'archived'];
      
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: " + validStatuses.join(', ') });
      }

      const product = await storage.updateProduct(req.params.id, { status });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product status" });
    }
  });

  app.delete("/api/products/:id", requireAuth, requireUserType('seller'), async (req, res) => {
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

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Shipping Matrix Routes
  app.get("/api/shipping-matrices", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;
      const matrices = await storage.getShippingMatricesBySellerId(sellerId);
      res.json(matrices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping matrices" });
    }
  });

  app.post("/api/shipping-matrices", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;
      const matrix = await storage.createShippingMatrix({
        ...req.body,
        sellerId,
      });
      res.status(201).json(matrix);
    } catch (error) {
      res.status(500).json({ error: "Failed to create shipping matrix" });
    }
  });

  app.put("/api/shipping-matrices/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;
      
      // Verify ownership
      const existing = await storage.getShippingMatrix(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Shipping matrix not found" });
      }
      if (existing.sellerId !== sellerId) {
        return res.status(403).json({ error: "Unauthorized to modify this shipping matrix" });
      }
      
      const matrix = await storage.updateShippingMatrix(req.params.id, req.body);
      res.json(matrix);
    } catch (error) {
      res.status(500).json({ error: "Failed to update shipping matrix" });
    }
  });

  app.delete("/api/shipping-matrices/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;
      
      // Verify ownership
      const existing = await storage.getShippingMatrix(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Shipping matrix not found" });
      }
      if (existing.sellerId !== sellerId) {
        return res.status(403).json({ error: "Unauthorized to delete this shipping matrix" });
      }
      
      await storage.deleteShippingMatrix(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shipping matrix" });
    }
  });

  // Shipping Zone Routes
  app.get("/api/shipping-matrices/:matrixId/zones", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;
      
      // Verify matrix ownership
      const matrix = await storage.getShippingMatrix(req.params.matrixId);
      if (!matrix) {
        return res.status(404).json({ error: "Shipping matrix not found" });
      }
      if (matrix.sellerId !== sellerId) {
        return res.status(403).json({ error: "Unauthorized to view zones for this matrix" });
      }
      
      const zones = await storage.getShippingZonesByMatrixId(req.params.matrixId);
      res.json(zones);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping zones" });
    }
  });

  app.post("/api/shipping-zones", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;
      
      // Verify matrix ownership
      const matrix = await storage.getShippingMatrix(req.body.matrixId);
      if (!matrix) {
        return res.status(404).json({ error: "Shipping matrix not found" });
      }
      if (matrix.sellerId !== sellerId) {
        return res.status(403).json({ error: "Unauthorized to add zones to this matrix" });
      }
      
      const zone = await storage.createShippingZone(req.body);
      res.status(201).json(zone);
    } catch (error) {
      res.status(500).json({ error: "Failed to create shipping zone" });
    }
  });

  app.put("/api/shipping-zones/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;
      
      // Verify matrix ownership through zone
      const existing = await storage.getShippingZone(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Shipping zone not found" });
      }
      const matrix = await storage.getShippingMatrix(existing.matrixId);
      if (!matrix || matrix.sellerId !== sellerId) {
        return res.status(403).json({ error: "Unauthorized to modify this shipping zone" });
      }
      
      const zone = await storage.updateShippingZone(req.params.id, req.body);
      res.json(zone);
    } catch (error) {
      res.status(500).json({ error: "Failed to update shipping zone" });
    }
  });

  app.delete("/api/shipping-zones/:id", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;
      
      // Verify matrix ownership through zone
      const existing = await storage.getShippingZone(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Shipping zone not found" });
      }
      const matrix = await storage.getShippingMatrix(existing.matrixId);
      if (!matrix || matrix.sellerId !== sellerId) {
        return res.status(403).json({ error: "Unauthorized to delete this shipping zone" });
      }
      
      await storage.deleteShippingZone(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shipping zone" });
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, async (req: any, res) => {
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
      
      // Auto-generate documents based on status change
      void (async () => {
        try {
          const newStatus = validationResult.data.status;
          
          // Auto-generate invoice when order is paid
          if (newStatus === 'paid') {
            logger.info(`[Auto-Generate] Generating invoice for order ${order.id}`);
            const documentGenerator = new DocumentGenerator(storage);
            
            // Get seller ID from order
            const items = JSON.parse(order.items);
            if (items.length === 0) {
              logger.error("[Auto-Generate] Cannot generate invoice: order has no items");
              return;
            }
            
            const allProducts = await storage.getAllProducts();
            const firstProduct = allProducts.find(p => p.id === items[0].productId);
            if (!firstProduct) {
              logger.error("[Auto-Generate] Cannot generate invoice: product not found");
              return;
            }
            
            const sellerId = firstProduct.sellerId;
            const seller = await storage.getUser(sellerId);
            if (!seller) {
              logger.error("[Auto-Generate] Cannot generate invoice: seller not found");
              return;
            }
            
            // Determine order type based on product types
            // If any item is wholesale, it's a wholesale order
            const orderType = items.some((item: any) => item.productType === 'wholesale') ? 'wholesale' : 'b2c';
            
            await documentGenerator.generateInvoice({
              order,
              seller,
              orderType,
              generatedBy: userId, // System-triggered by user's status change
              generationTrigger: 'automatic',
            });
            
            logger.info(`[Auto-Generate] Invoice generated successfully for order ${order.id}`);
          }
          
          // Auto-generate packing slip when order is ready to ship
          if (newStatus === 'ready_to_ship') {
            logger.info(`[Auto-Generate] Generating packing slip for order ${order.id}`);
            const documentGenerator = new DocumentGenerator(storage);
            
            // Get seller ID from order
            const items = JSON.parse(order.items);
            if (items.length === 0) {
              logger.error("[Auto-Generate] Cannot generate packing slip: order has no items");
              return;
            }
            
            const allProducts = await storage.getAllProducts();
            const firstProduct = allProducts.find(p => p.id === items[0].productId);
            if (!firstProduct) {
              logger.error("[Auto-Generate] Cannot generate packing slip: product not found");
              return;
            }
            
            const sellerId = firstProduct.sellerId;
            const seller = await storage.getUser(sellerId);
            if (!seller) {
              logger.error("[Auto-Generate] Cannot generate packing slip: seller not found");
              return;
            }
            
            await documentGenerator.generatePackingSlip({
              order,
              seller,
              generatedBy: userId, // System-triggered by user's status change
              generationTrigger: 'automatic',
            });
            
            logger.info(`[Auto-Generate] Packing slip generated successfully for order ${order.id}`);
          }
        } catch (error) {
          logger.error("[Auto-Generate] Failed to generate document:", error);
          // Don't fail the status update if document generation fails
        }
      })();
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.patch("/api/orders/:id/tracking", requireAuth, async (req: any, res) => {
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
                logger.info(`[Notifications] Shipping notification sent for order ${order.id}`);
              }
            }
          } catch (error) {
            logger.error("[Notifications] Failed to send shipping notification:", error);
          }
        })();
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tracking information" });
    }
  });

  app.post("/api/orders/:id/request-balance", requireAuth, async (req: any, res) => {
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
          allow_redirects: 'never',
        },
        metadata: {
          orderId: order.id,
          paymentType: "balance",
        },
      });

      // Update order with balance payment intent ID
      await storage.updateOrderBalancePaymentIntent(order.id, paymentIntent.id);

      // TODO: Send email to customer with payment link
      logger.info(`[Balance Request] Payment link sent to ${order.customerEmail} for order ${order.id}`);

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        message: "Balance payment request sent successfully",
      });
    } catch (error: any) {
      logger.error("Balance request error", error);
      res.status(500).json({ error: "Failed to request balance payment" });
    }
  });

  // Reference: javascript_stripe integration
  // Stripe Connect payment intent creation for checkout
  // Note: No auth required - guest checkout needs this
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        logger.info("[Stripe] Cannot create payment intent - Stripe is not configured");
        return res.status(500).json({ 
          error: "Stripe is not configured. Please contact the store owner to set up payments." 
        });
      }

      const { amount, orderId, paymentType = "full", items, shippingAddress } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Determine seller from cart items
      let sellerId: string | null = null;
      let sellerConnectedAccountId: string | null = null;
      let seller: any = null;

      if (items && items.length > 0) {
        // Get first product to determine seller
        const firstProductId = items[0].productId || items[0].id; // Support both formats
        const product = await storage.getProduct(firstProductId);
        
        if (product) {
          sellerId = product.sellerId;
          seller = await storage.getUser(sellerId);
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
          enabled: true, // Enables Apple Pay, Google Pay, Link, and other payment methods
        },
        metadata: {
          orderId: orderId || "",
          paymentType,
          sellerId: sellerId || "",
        },
      };

      // Note: Stripe Tax (automatic_tax) is currently disabled
      // To enable: add taxEnabled boolean field to users table and set it per seller
      // Example code (commented out):
      // if (seller?.taxEnabled && shippingAddress && items?.every((item: any) => item.productType !== 'wholesale')) {
      //   const hasRequiredFields = shippingAddress.line1 && 
      //                             shippingAddress.city && 
      //                             shippingAddress.country &&
      //                             (shippingAddress.country !== 'US' || shippingAddress.state);
      //   
      //   if (hasRequiredFields) {
      //     paymentIntentParams.automatic_tax = { enabled: true };
      //     paymentIntentParams.shipping = {
      //       name: shippingAddress.name || 'Customer',
      //       address: {
      //         line1: shippingAddress.line1,
      //         line2: shippingAddress.line2 || undefined,
      //         city: shippingAddress.city,
      //         state: shippingAddress.state,
      //         postal_code: shippingAddress.postal_code,
      //         country: shippingAddress.country,
      //       },
      //     };
      //     logger.info(`[Stripe Tax] Enabled for seller ${sellerId}`);
      //   }
      // }
      
      // Use Stripe Connect if seller has connected account (works in both test and live mode)
      if (sellerConnectedAccountId && sellerId && seller) {
        
        // Check if seller can accept charges
        if (!seller?.stripeChargesEnabled) {
          return res.status(400).json({ 
            error: "This store is still setting up payment processing. Please check back soon.",
            errorCode: "STRIPE_CHARGES_DISABLED"
          });
        }

        // Check and request capabilities if needed (critical for on_behalf_of parameter)
        try {
          const account = await stripe.accounts.retrieve(sellerConnectedAccountId);
          const hasCardPayments = account.capabilities?.card_payments === 'active' || 
                                  account.capabilities?.card_payments === 'pending';
          const hasTransfers = account.capabilities?.transfers === 'active' || 
                              account.capabilities?.transfers === 'pending';
          
          if (!hasCardPayments || !hasTransfers) {
            console.log(`[Stripe] Account ${account.id} missing capabilities. card_payments: ${account.capabilities?.card_payments}, transfers: ${account.capabilities?.transfers}`);
            logger.info(`[Stripe] Requesting card_payments and transfers for account ${account.id}...`);
            
            await stripe.accounts.update(sellerConnectedAccountId, {
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
            });
            
            // Re-fetch to check updated status
            const updatedAccount = await stripe.accounts.retrieve(sellerConnectedAccountId);
            logger.info(`[Stripe] Capabilities after request - card_payments: ${updatedAccount.capabilities?.card_payments}, transfers: ${updatedAccount.capabilities?.transfers}`);
            
            // Allow pending/unrequested capabilities to proceed - Stripe will return a proper error if they're actually required
            // Blocking here prevents legitimate borderless accounts from transacting while their capabilities activate
            if (updatedAccount.capabilities?.card_payments === 'inactive' || 
                updatedAccount.capabilities?.transfers === 'inactive') {
              logger.info(`[Stripe] Capabilities inactive - payment may fail. Account may need additional information.`);
              return res.status(400).json({ 
                error: "This store needs to complete payment setup. Please contact the store owner to finish their Stripe onboarding.",
                errorCode: "STRIPE_CAPABILITIES_INACTIVE"
              });
            }
          }
        } catch (capError: any) {
          console.error(`[Stripe] Capability check failed:`, capError.message);
          return res.status(500).json({ 
            error: "Payment processing setup error. Please contact the store owner.",
            errorCode: "STRIPE_CAPABILITY_ERROR"
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
      } else if (sellerId) {
        // Seller exists but hasn't connected Stripe account
        return res.status(400).json({ 
          error: "This store hasn't set up payment processing yet. Please contact the seller to complete their Stripe setup.",
          errorCode: "STRIPE_NOT_CONNECTED"
        });
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      logger.error("Stripe payment intent error", error);
      res.status(500).json({ 
        error: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Update Payment Intent with wallet address for accurate tax calculation
  app.post("/api/payment-intent/:paymentIntentId/update-address", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const { paymentIntentId } = req.params;
      const { address, email, name, phone } = req.body;

      // Defensive validation
      if (!address || typeof address !== 'object') {
        return res.status(400).json({ error: "Invalid address data" });
      }

      if (!address.country || !address.postalCode) {
        return res.status(400).json({ error: "Country and postal code are required for tax calculation" });
      }

      // Update payment intent with shipping address for tax calculation
      await stripe.paymentIntents.update(paymentIntentId, {
        shipping: {
          name: name || "Customer",
          phone: phone || undefined,
          address: {
            line1: address.line1 || "",
            line2: address.line2 || undefined,
            city: address.city || "",
            state: address.state || "",
            postal_code: address.postalCode || "",
            country: address.country || "",
          },
        },
        receipt_email: email || undefined,
      });

      logger.info(`[Express Checkout] Updated PaymentIntent ${paymentIntentId} with wallet address`, {
        city: address.city,
        state: address.state,
        country: address.country,
      });

      res.json({ success: true });
    } catch (error: any) {
      logger.error("Failed to update payment intent with wallet address", error);
      res.status(500).json({ error: "Failed to update payment intent" });
    }
  });

  // Retrieve Payment Intent with tax data after payment confirmation
  app.get("/api/payment-intent/:paymentIntentId/tax-data", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const { paymentIntentId } = req.params;
      
      // Retrieve payment intent with expanded latest_charge (correct expand path)
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge'],
      });

      // Extract tax amount from latest charge total_details
      const charge = paymentIntent.latest_charge as any;
      const taxAmountInCents = charge?.total_details?.amount_tax || 0;
      const taxAmount = taxAmountInCents / 100;
      
      // Extract tax data
      const taxData = {
        taxAmount: taxAmount.toString(),
        taxCalculationId: (paymentIntent as any).automatic_tax?.calculation || null,
        taxBreakdown: charge?.total_details?.breakdown?.taxes || null,
        subtotalBeforeTax: ((paymentIntent.amount_received - taxAmountInCents) / 100).toString(),
      };

      logger.info(`[Stripe Tax] Retrieved tax data for payment ${paymentIntentId}: ${taxAmount > 0 ? `$${taxAmount} tax collected` : 'no tax'}`, {
        taxAmount,
        calculationId: taxData.taxCalculationId,
        hasBreakdown: !!taxData.taxBreakdown
      });


      res.json(taxData);
    } catch (error: any) {
      logger.error("Failed to retrieve tax data", error);
      res.status(500).json({ error: "Failed to retrieve tax data" });
    }
  });

  // **PRICING API - Single Source of Truth**
  // Calculate all pricing in seller's currency: subtotal, shipping, tax, total
  app.post("/api/pricing/calculate", async (req, res) => {
    try {
      const { sellerId, items, shippingAddress } = req.body;
      
      logger.info(`[Pricing API] Calculating pricing for seller ${sellerId}`, {
        itemCount: items?.length,
        hasShippingAddress: !!shippingAddress
      });

      // Validate input
      if (!sellerId || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: "sellerId and items array are required" });
      }

      // Get seller to retrieve currency and shipping settings
      const seller = await storage.getUser(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Get seller's currency (single source of truth)
      const currency = seller.listingCurrency || 'USD';
      logger.info(`[Pricing API] Using seller's currency: ${currency}`);

      // Calculate subtotal in seller's currency
      let subtotal = 0;
      const itemDetails = [];

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Product ${item.productId} not found` });
        }

        const itemPrice = parseFloat(product.price);
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;

        itemDetails.push({
          productId: item.productId,
          name: product.name,
          price: itemPrice,
          quantity: item.quantity,
          total: itemTotal,
          productType: product.productType,
          depositAmount: product.depositAmount ? parseFloat(product.depositAmount) : null,
        });
      }

      // Calculate shipping cost in seller's currency
      const shippingCost = seller.shippingPrice ? parseFloat(seller.shippingPrice.toString()) : 0;

      // Calculate tax if shipping address provided
      let taxAmount = 0;
      let taxCalculationId = null;

      if (shippingAddress && seller.taxEnabled && stripe) {
        try {
          // Create line items for Stripe Tax
          const lineItems = itemDetails.map(item => ({
            amount: Math.round(item.total * 100), // Convert to cents
            reference: item.productId,
            tax_code: seller.taxProductCode || 'txcd_99999999', // General merchandise
          }));

          // Add shipping as taxable line item
          if (shippingCost > 0) {
            lineItems.push({
              amount: Math.round(shippingCost * 100),
              reference: 'shipping',
              tax_code: 'txcd_92010001', // Shipping tax code
            });
          }

          const taxCalculation = await stripe.tax.calculations.create({
            currency: currency.toLowerCase(),
            line_items: lineItems,
            customer_details: {
              address: {
                line1: shippingAddress.line1,
                line2: shippingAddress.line2 || undefined,
                city: shippingAddress.city,
                state: shippingAddress.state || undefined,
                postal_code: shippingAddress.postalCode,
                country: shippingAddress.country,
              },
              address_source: 'shipping',
            },
            expand: ['line_items.data.tax_breakdown'],
          });

          taxAmount = taxCalculation.tax_amount_exclusive / 100; // Convert from cents
          taxCalculationId = taxCalculation.id;

          logger.info(`[Pricing API] Tax calculated via Stripe Tax: ${currency} ${taxAmount}`, {
            calculationId: taxCalculationId,
            taxBreakdown: taxCalculation.tax_breakdown
          });
        } catch (taxError: any) {
          logger.error(`[Pricing API] Failed to calculate tax:`, taxError);
          // Continue without tax if calculation fails
        }
      }

      // Calculate totals
      const subtotalWithShipping = subtotal + shippingCost;
      const total = subtotalWithShipping + taxAmount;

      const pricingBreakdown = {
        currency,
        subtotal,
        shippingCost,
        subtotalWithShipping,
        taxAmount,
        taxCalculationId,
        total,
        items: itemDetails,
      };

      logger.info(`[Pricing API] Pricing calculated successfully`, {
        currency,
        subtotal,
        shippingCost,
        taxAmount,
        total
      });

      res.json(pricingBreakdown);
    } catch (error: any) {
      logger.error("[Pricing API] Error calculating pricing:", error);
      res.status(500).json({ error: "Failed to calculate pricing" });
    }
  });

  // Create Setup Intent for saving payment methods (without immediate charge)
  app.post("/api/payment/setup-intent", requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create or retrieve Stripe Customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;

        // Save customer ID to user record
        await storage.upsertUser({
          ...user,
          stripeCustomerId: customerId,
        });
      }

      // Create Setup Intent for saving payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // For future charges when customer is not present
      });

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
      logger.error("[Stripe] Setup intent creation failed", error);
      res.status(500).json({ error: error.message || "Failed to create setup intent" });
    }
  });

  // Order Items - Get items for an order
  app.get("/api/orders/:orderId/items", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const order = await storage.getOrder(req.params.orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Authorization check: buyer can see their order items, seller can see their product items
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      const isBuyer = order.userId === userId;
      
      let isSeller = false;
      if (!isAdmin && !isBuyer) {
        try {
          const items = JSON.parse(order.items);
          const allProducts = await storage.getAllProducts();
          const orderProductIds = items.map((item: any) => item.productId);
          const sellerProducts = allProducts.filter(p => p.sellerId === userId);
          const sellerProductIds = new Set(sellerProducts.map(p => p.id));
          isSeller = orderProductIds.some((id: string) => sellerProductIds.has(id));
        } catch {}
      }
      
      if (!isAdmin && !isBuyer && !isSeller) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const orderItems = await storage.getOrderItems(req.params.orderId);
      res.json(orderItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order items" });
    }
  });

  // Order Items - Update item tracking
  app.patch("/api/order-items/:id/tracking", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const trackingSchema = z.object({
        trackingNumber: z.string().min(1, "Tracking number is required"),
        trackingCarrier: z.string().optional(),
        trackingUrl: z.string().optional().refine(
          (val) => !val || val === "" || /^https?:\/\/.+/.test(val),
          { message: "Tracking URL must be a valid URL starting with http:// or https://" }
        ),
        notifyCustomer: z.boolean().optional(),
      });
      
      const validationResult = trackingSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }
      
      // Get the order item to find the order
      const item = await storage.getOrderItemById(req.params.id);
      
      if (!item) {
        return res.status(404).json({ error: "Order item not found" });
      }
      
      const order = await storage.getOrder(item.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Authorization: only seller can update tracking
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      if (!isAdmin) {
        try {
          const orderItems = JSON.parse(order.items);
          const allProducts = await storage.getAllProducts();
          const orderProductIds = orderItems.map((item: any) => item.productId);
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
      
      // Update item tracking (automatically sets status to 'shipped')
      const updatedItem = await storage.updateOrderItemTracking(
        req.params.id,
        validationResult.data.trackingNumber,
        validationResult.data.trackingCarrier,
        validationResult.data.trackingUrl
      );
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Failed to update tracking" });
      }
      
      // Update order fulfillment status
      await storage.updateOrderFulfillmentStatus(item.orderId);
      
      // Send notification if requested
      if (validationResult.data.notifyCustomer) {
        void (async () => {
          try {
            const orderItemsAll = await storage.getOrderItems(item.orderId);
            const seller = await storage.getUser(userId);
            
            if (seller) {
              // Send item tracking notification to buyer
              await notificationService.sendItemTracking(order, updatedItem, seller);
              logger.info(`[Notifications] Item tracking notification sent for item ${updatedItem.id}`);
            }
          } catch (error) {
            logger.error("[Notifications] Failed to send item tracking notification:", error);
          }
        })();
      }
      
      res.json(updatedItem);
    } catch (error) {
      logger.error("[Order Items] Failed to update tracking:", error);
      res.status(500).json({ error: "Failed to update tracking information" });
    }
  });

  // Order Items - Update item status
  app.patch("/api/order-items/:id/status", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const statusSchema = z.object({
        status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
        reason: z.string().optional(), // Optional reason for cancellation
      });
      
      const validationResult = statusSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }
      
      // Get the order item to find the order
      const item = await storage.getOrderItemById(req.params.id);
      
      if (!item) {
        return res.status(404).json({ error: "Order item not found" });
      }
      
      const order = await storage.getOrder(item.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Authorization: only seller can update status
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      if (!isAdmin) {
        try {
          const orderItems = JSON.parse(order.items);
          const allProducts = await storage.getAllProducts();
          const orderProductIds = orderItems.map((item: any) => item.productId);
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
      
      // Update item status
      const updatedItem = await storage.updateOrderItemStatus(
        req.params.id,
        validationResult.data.status
      );
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Failed to update status" });
      }
      
      // Update order fulfillment status
      await storage.updateOrderFulfillmentStatus(item.orderId);
      
      // Send notification emails based on status change
      void (async () => {
        try {
          const seller = await storage.getUser(userId);
          if (!seller) return;

          // Send appropriate email based on new status
          if (validationResult.data.status === 'delivered') {
            await notificationService.sendItemDelivered(order, updatedItem, seller);
            logger.info(`[Notifications] Item delivered notification sent for item ${updatedItem.id}`);
          } else if (validationResult.data.status === 'cancelled') {
            const reason = req.body.reason; // Optional cancellation reason
            await notificationService.sendItemCancelled(order, updatedItem, seller, reason);
            logger.info(`[Notifications] Item cancelled notification sent for item ${updatedItem.id}`);
          }
        } catch (error) {
          logger.error("[Notifications] Failed to send status update notification:", error);
        }
      })();
      
      res.json(updatedItem);
    } catch (error) {
      logger.error("[Order Items] Failed to update status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Order Items - Process refund
  app.post("/api/order-items/:id/refund", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }
      
      const refundSchema = z.object({
        quantity: z.number().min(1, "Quantity must be at least 1"),
        amount: z.number().min(0.5, "Refund amount must be at least $0.50"),
      });
      
      const validationResult = refundSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }
      
      // Get the order item
      const item = await storage.getOrderItemById(req.params.id);
      
      if (!item) {
        return res.status(404).json({ error: "Order item not found" });
      }
      
      const order = await storage.getOrder(item.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Authorization: only seller can process refund
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      if (!isAdmin) {
        try {
          const orderItems = JSON.parse(order.items);
          const allProducts = await storage.getAllProducts();
          const orderProductIds = orderItems.map((item: any) => item.productId);
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

      // Process Stripe refund
      let refundId;
      try {
        const paymentIntentId = order.stripePaymentIntentId;
        if (!paymentIntentId) {
          return res.status(400).json({ error: "No payment found for this order" });
        }

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(validationResult.data.amount * 100), // Convert to cents
        });

        refundId = refund.id;
      } catch (stripeError: any) {
        console.error("Stripe refund error:", stripeError);
        return res.status(500).json({ error: `Refund failed: ${stripeError.message}` });
      }
      
      // Update item with refund info
      const updatedItem = await storage.updateOrderItemRefund(
        req.params.id,
        validationResult.data.quantity,
        validationResult.data.amount.toString(),
        'refunded'
      );
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Failed to update item refund status" });
      }

      // Create refund record
      await storage.createRefund({
        orderId: order.id,
        amount: validationResult.data.amount.toString(),
        stripeRefundId: refundId,
        status: 'completed',
        reason: req.body.reason || 'Customer request',
      });
      
      // Update order fulfillment status
      await storage.updateOrderFulfillmentStatus(item.orderId);
      
      // Send refund notification email
      void (async () => {
        try {
          const seller = await storage.getUser(userId);
          if (seller) {
            await notificationService.sendItemRefunded(
              order, 
              updatedItem, 
              seller,
              validationResult.data.amount,
              validationResult.data.quantity
            );
            logger.info(`[Notifications] Refund notification sent for item ${updatedItem.id}`);
          }
        } catch (error) {
          logger.error("[Notifications] Failed to send refund notification:", error);
        }
      })();
      
      res.json({
        success: true,
        item: updatedItem,
        refundId,
        message: `Refund of $${validationResult.data.amount.toFixed(2)} processed successfully`,
      });
    } catch (error) {
      logger.error("[Order Items] Failed to process refund:", error);
      res.status(500).json({ error: "Failed to process refund" });
    }
  });

  // Team Management - Invite users
  app.post("/api/invitations", requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      // Only sellers (not team members) can send invitations
      // Check: must be seller/owner/admin role AND must not have a sellerId (meaning they ARE the owner, not a team member)
      if (!currentUser || !["seller", "owner", "admin"].includes(currentUser.role) || currentUser.sellerId) {
        return res.status(403).json({ error: "Only store owners can invite team members" });
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
      logger.error("Invitation error", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  // Get all invitations
  app.get("/api/invitations", requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      // Only sellers (not team members) can view invitations
      if (!currentUser || !["seller", "owner", "admin"].includes(currentUser.role) || currentUser.sellerId) {
        return res.status(403).json({ error: "Only store owners can view invitations" });
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

      // Get canonical owner ID: if inviter has sellerId, they're a team member (use sellerId); otherwise they ARE the owner (use their ID)
      const canonicalOwnerId = inviter.sellerId || inviter.id;
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
          storeDescription: null,
          storeBanner: null,
          storeLogo: null,
          storeActive: null,
          shippingCost: null,
          instagramUsername: null,
        });
      }

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.token, "accepted");

      // Generate auth token for auto-login
      const authToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const authExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      await storage.createAuthToken({
        email: invitation.email,
        token: authToken,
        expiresAt: authExpiresAt,
        used: 0,
        sellerContext: null, // Team member is on main domain
      });

      // Generate magic link URL
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : `http://localhost:${process.env.PORT || 5000}`;
      const magicLink = `${baseUrl}/api/auth/email/verify-magic-link?token=${authToken}&redirect=/seller-dashboard`;

      // Send magic link for auto-login
      await notificationService.sendMagicLink(invitation.email, magicLink);

      res.json({ 
        message: "Invitation accepted successfully. Check your email for login link.", 
        role: invitation.role,
        requiresLogin: true,
        email: invitation.email
      });
    } catch (error) {
      logger.error("Accept invitation error", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // Get team members for current seller's store
  app.get("/api/team", requireAuth, async (req: any, res) => {
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
  app.patch("/api/team/:userId/role", requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      // Only sellers (not team members) can update roles
      if (!currentUser || !["seller", "owner", "admin"].includes(currentUser.role) || currentUser.sellerId) {
        return res.status(403).json({ error: "Only store owners can update team member roles" });
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
  app.delete("/api/team/:userId", requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      // Only sellers (not team members) can delete team members
      if (!currentUser || !["seller", "owner", "admin"].includes(currentUser.role) || currentUser.sellerId) {
        return res.status(403).json({ error: "Only store owners can remove team members" });
      }

      // Get canonical owner ID: if current user has sellerId, they're a team member (use sellerId); otherwise they ARE the owner (use their ID)
      const canonicalOwnerId = currentUser.sellerId || currentUser.id;
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
  app.patch("/api/user/profile", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, contactEmail } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ error: "First name and last name are required" });
      }

      // Validate contactEmail if provided
      if (contactEmail && contactEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return res.status(400).json({ error: "Invalid contact email format" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        firstName,
        lastName,
        contactEmail: contactEmail || null, // Save contactEmail or null if empty
      });

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      logger.error("Profile update error", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.patch("/api/user/branding", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { storeBanner, storeLogo, shippingPolicy, returnsPolicy } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        storeBanner: storeBanner || null,
        storeLogo: storeLogo || null,
        shippingPolicy: shippingPolicy || null,
        returnsPolicy: returnsPolicy || null,
      });

      res.json({ message: "Branding updated successfully", user: updatedUser });
    } catch (error) {
      logger.error("Branding update error", error);
      res.status(500).json({ error: "Failed to update branding" });
    }
  });

  app.patch("/api/user/about-contact", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { aboutStory, contactEmail, socialInstagram, socialTwitter, socialTiktok, socialSnapchat, socialWebsite } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate contactEmail if provided
      if (contactEmail && contactEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return res.status(400).json({ error: "Invalid contact email format" });
      }

      // Validate socialWebsite if provided (accepts both bare domains and full URLs)
      if (socialWebsite && socialWebsite !== "") {
        // If it already has protocol, validate as URL
        if (socialWebsite.startsWith('http://') || socialWebsite.startsWith('https://')) {
          try {
            new URL(socialWebsite);
          } catch {
            return res.status(400).json({ error: "Invalid website URL format" });
          }
        } else {
          // If it's a bare domain, prepend https:// and validate
          try {
            new URL(`https://${socialWebsite}`);
          } catch {
            return res.status(400).json({ error: "Invalid website domain format" });
          }
        }
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        aboutStory: aboutStory || null,
        contactEmail: contactEmail || null,
        socialInstagram: socialInstagram || null,
        socialTwitter: socialTwitter || null,
        socialTiktok: socialTiktok || null,
        socialSnapchat: socialSnapchat || null,
        socialWebsite: socialWebsite || null,
      });

      res.json({ message: "About & Contact updated successfully", user: updatedUser });
    } catch (error) {
      logger.error("About & Contact update error", error);
      res.status(500).json({ error: "Failed to update about & contact information" });
    }
  });

  // Toggle store active status
  app.patch("/api/user/store-status", requireAuth, async (req: any, res) => {
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

      // CRITICAL: Validate subscription status before allowing activation
      if (storeActive === 1) {
        const hasActiveSubscription = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial';
        
        if (!hasActiveSubscription) {
          return res.status(403).json({ 
            error: "Active subscription required", 
            message: "You need an active subscription to activate your store. Please subscribe to continue.",
            requiresSubscription: true
          });
        }
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        storeActive,
      });

      res.json({ message: "Store status updated successfully", user: updatedUser, storeActive });
    } catch (error) {
      logger.error("Store status update error", error);
      res.status(500).json({ error: "Failed to update store status" });
    }
  });

  app.patch("/api/user/payment-provider", requireAuth, async (req: any, res) => {
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
      logger.error("Payment provider update error", error);
      res.status(500).json({ error: "Failed to update payment provider" });
    }
  });

  app.patch("/api/user/username", requireAuth, async (req: any, res) => {
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
      logger.error("Username update error", error);
      res.status(500).json({ error: "Failed to update username" });
    }
  });

  app.patch("/api/user/custom-domain", requireAuth, async (req: any, res) => {
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
      logger.error("Custom domain update error", error);
      res.status(500).json({ error: "Failed to update custom domain" });
    }
  });

  app.patch("/api/user/shipping", requireAuth, async (req: any, res) => {
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
      logger.error("Shipping price update error", error);
      res.status(500).json({ error: "Failed to update shipping price" });
    }
  });

  // Tax Settings Route
  app.patch("/api/user/tax-settings", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const taxSettingsSchema = z.object({
        taxEnabled: z.number().min(0).max(1).optional(),
        taxNexusCountries: z.array(z.string()).optional(),
        taxNexusStates: z.array(z.string()).optional(),
        taxProductCode: z.string().optional().nullable(),
      });

      const validationResult = taxSettingsSchema.safeParse(req.body);
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      const { taxEnabled, taxNexusCountries, taxNexusStates, taxProductCode } = validationResult.data;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        taxEnabled: typeof taxEnabled === 'number' ? taxEnabled : user.taxEnabled,
        taxNexusCountries: taxNexusCountries !== undefined ? taxNexusCountries : user.taxNexusCountries,
        taxNexusStates: taxNexusStates !== undefined ? taxNexusStates : user.taxNexusStates,
        taxProductCode: taxProductCode !== undefined ? (taxProductCode || null) : user.taxProductCode,
      });

      logger.info(`Tax settings updated for user ${userId}`, {
        taxEnabled: updatedUser.taxEnabled,
        nexusCountries: updatedUser.taxNexusCountries?.length || 0,
        nexusStates: updatedUser.taxNexusStates?.length || 0,
      });

      res.json({ message: "Tax settings updated successfully", user: updatedUser });
    } catch (error) {
      logger.error("Tax settings update error", error);
      res.status(500).json({ error: "Failed to update tax settings" });
    }
  });

  // Saved Addresses Routes
  app.get("/api/user/addresses", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const addresses = await storage.getSavedAddressesByUserId(userId);
      res.json(addresses);
    } catch (error) {
      logger.error("Error fetching saved addresses", error);
      res.status(500).json({ error: "Failed to fetch saved addresses" });
    }
  });

  app.post("/api/user/addresses", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validationResult = insertSavedAddressSchema.safeParse({
        ...req.body,
        userId,
      });
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      const address = await storage.createSavedAddress(validationResult.data);
      res.status(201).json(address);
    } catch (error) {
      logger.error("Error creating saved address", error);
      res.status(500).json({ error: "Failed to create saved address" });
    }
  });

  app.patch("/api/user/addresses/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify address ownership
      const existingAddress = await storage.getSavedAddress(id);
      if (!existingAddress) {
        return res.status(404).json({ error: "Address not found" });
      }
      if (existingAddress.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this address" });
      }

      const updatedAddress = await storage.updateSavedAddress(id, req.body);
      res.json(updatedAddress);
    } catch (error) {
      logger.error("Error updating saved address", error);
      res.status(500).json({ error: "Failed to update saved address" });
    }
  });

  app.delete("/api/user/addresses/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify address ownership
      const existingAddress = await storage.getSavedAddress(id);
      if (!existingAddress) {
        return res.status(404).json({ error: "Address not found" });
      }
      if (existingAddress.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this address" });
      }

      await storage.deleteSavedAddress(id);
      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting saved address", error);
      res.status(500).json({ error: "Failed to delete saved address" });
    }
  });

  app.post("/api/user/addresses/:id/set-default", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify address ownership
      const existingAddress = await storage.getSavedAddress(id);
      if (!existingAddress) {
        return res.status(404).json({ error: "Address not found" });
      }
      if (existingAddress.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this address" });
      }

      await storage.setDefaultAddress(userId, id);
      res.json({ success: true });
    } catch (error) {
      logger.error("Error setting default address", error);
      res.status(500).json({ error: "Failed to set default address" });
    }
  });

  // Saved Payment Methods Routes
  app.get("/api/user/payment-methods", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paymentMethods = await storage.getSavedPaymentMethodsByUserId(userId);
      res.json(paymentMethods);
    } catch (error) {
      logger.error("Error fetching saved payment methods", error);
      res.status(500).json({ error: "Failed to fetch saved payment methods" });
    }
  });

  app.post("/api/user/payment-methods", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stripePaymentMethodId, label } = req.body;

      if (!stripePaymentMethodId) {
        return res.status(400).json({ error: "Stripe Payment Method ID is required" });
      }

      // Check if payment method already exists
      const existing = await storage.getSavedPaymentMethodByStripeId(stripePaymentMethodId);
      if (existing) {
        return res.status(400).json({ error: "Payment method already saved" });
      }

      // Retrieve payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
      
      if (!paymentMethod.card) {
        return res.status(400).json({ error: "Only card payment methods are supported" });
      }

      // Create saved payment method record with display info only
      const savedPaymentMethod = await storage.createSavedPaymentMethod({
        userId,
        stripePaymentMethodId,
        cardBrand: paymentMethod.card.brand,
        cardLast4: paymentMethod.card.last4,
        cardExpMonth: paymentMethod.card.exp_month,
        cardExpYear: paymentMethod.card.exp_year,
        label: label || null,
        isDefault: 0,
      });

      res.status(201).json(savedPaymentMethod);
    } catch (error: any) {
      logger.error("Error saving payment method", error);
      res.status(500).json({ error: error.message || "Failed to save payment method" });
    }
  });

  app.delete("/api/user/payment-methods/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify payment method ownership
      const existingPaymentMethod = await storage.getSavedPaymentMethod(id);
      if (!existingPaymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      if (existingPaymentMethod.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this payment method" });
      }

      // Detach from Stripe (removes the payment method from the customer)
      try {
        await stripe.paymentMethods.detach(existingPaymentMethod.stripePaymentMethodId);
      } catch (stripeError: any) {
        console.error("Error detaching payment method from Stripe:", stripeError);
        // Continue with deletion even if Stripe detach fails
      }

      await storage.deleteSavedPaymentMethod(id);
      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting saved payment method", error);
      res.status(500).json({ error: "Failed to delete saved payment method" });
    }
  });

  app.post("/api/user/payment-methods/:id/set-default", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify payment method ownership
      const existingPaymentMethod = await storage.getSavedPaymentMethod(id);
      if (!existingPaymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      if (existingPaymentMethod.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this payment method" });
      }

      await storage.setDefaultPaymentMethod(userId, id);
      res.json({ success: true });
    } catch (error) {
      logger.error("Error setting default payment method", error);
      res.status(500).json({ error: "Failed to set default payment method" });
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
      logger.error("Error fetching shipping settings", error);
      res.status(500).json({ error: "Failed to fetch shipping settings" });
    }
  });

  // Stripe Connect OAuth routes
  // Create or get Stripe Express account with minimal KYC
  app.post("/api/stripe/create-express-account", requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { reset = false, country } = req.body; // Accept country from request body
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If resetting, delete the old account first
      if (user.stripeConnectedAccountId && reset) {
        logger.info(`[Stripe Express] Resetting account for user ${userId}. Deleting old account ${user.stripeConnectedAccountId}...`);
        try {
          await stripe.accounts.del(user.stripeConnectedAccountId);
          logger.info(`[Stripe Express] Successfully deleted old account ${user.stripeConnectedAccountId}`);
        } catch (delError: any) {
          console.error(`[Stripe Express] Failed to delete old account:`, delError.message);
          // Continue anyway - create new account even if deletion fails
        }
        
        // Clear the connected account ID so we create a new one below
        await storage.upsertUser({
          ...user,
          stripeConnectedAccountId: null,
          stripeChargesEnabled: 0,
          stripePayoutsEnabled: 0,
          stripeDetailsSubmitted: 0,
        });
        user.stripeConnectedAccountId = null;
      }
      
      // If user already has a connected account and not resetting, return its status
      if (user.stripeConnectedAccountId && !reset) {
        let account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
        
        // Check if account needs card_payments capability (required for on_behalf_of)
        const hasCardPayments = account.capabilities?.card_payments === 'active' || 
                                account.capabilities?.card_payments === 'pending';
        const hasTransfers = account.capabilities?.transfers === 'active' || 
                            account.capabilities?.transfers === 'pending';
        
        // If missing capabilities, request them and re-fetch account
        if (!hasCardPayments || !hasTransfers) {
          console.log(`[Stripe] Account ${account.id} missing capabilities. card_payments: ${account.capabilities?.card_payments}, transfers: ${account.capabilities?.transfers}`);
          logger.info(`[Stripe] Requesting card_payments and transfers for account ${account.id}...`);
          
          try {
            await stripe.accounts.update(user.stripeConnectedAccountId, {
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
            });
            
            // Re-fetch account to get updated capability status
            account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
            console.log(`[Stripe] Capabilities updated for account ${account.id}. card_payments: ${account.capabilities?.card_payments}, transfers: ${account.capabilities?.transfers}`);
            
          } catch (capError: any) {
            console.error(`[Stripe] Failed to request capabilities for account ${account.id}:`, capError.message);
            return res.status(500).json({ 
              error: "Failed to update Stripe account capabilities",
              message: "Please complete your Stripe onboarding or contact support",
              stripeError: capError.message
            });
          }
        }
        
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
          capabilities: account.capabilities, // Include capabilities in response for debugging
        });
      }

      logger.info(`[Stripe Express] Creating borderless Express account for user ${userId} - user will select country during onboarding`);

      // Create new Express account with borderless onboarding
      // Request both card_payments and transfers capabilities for Stripe Connect
      // card_payments: Required to use on_behalf_of parameter (seller name on statement)
      // transfers: Required to transfer funds to connected accounts
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email || undefined,
        // Don't set country - allows user to select during onboarding for borderless support
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            debit_negative_balances: true,
          },
        },
      });

      // Save account ID and initial status
      // Note: country and currency may be null until user completes onboarding
      await storage.upsertUser({
        ...user,
        stripeConnectedAccountId: account.id,
        stripeChargesEnabled: account.charges_enabled ? 1 : 0,
        stripePayoutsEnabled: account.payouts_enabled ? 1 : 0,
        stripeDetailsSubmitted: account.details_submitted ? 1 : 0,
        // Currency will be set after user selects their country during onboarding
        listingCurrency: account.default_currency?.toUpperCase() || user.listingCurrency || 'USD',
      });

      logger.info(`[Stripe Express] Created account ${account.id} for user ${userId}`);

      res.json({
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currency: account.default_currency,
      });
    } catch (error: any) {
      logger.error("Stripe Express account creation error", error);
      
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
  app.post("/api/stripe/account-session", requireAuth, async (req: any, res) => {
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

      // Retrieve account to verify country is set correctly
      const account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
      console.log(`[Stripe Account Session] Account ${account.id} country: ${account.country}, default_currency: ${account.default_currency}`);

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
        country: account.country, // Include country for debugging
      });
    } catch (error: any) {
      logger.error("Stripe Account Session error", error);
      res.status(500).json({ error: "Failed to create account session" });
    }
  });

  // Generate Account Link for onboarding/verification
  app.post("/api/stripe/account-link", requireAuth, async (req: any, res) => {
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
      logger.error("Stripe Account Link error", error);
      res.status(500).json({ error: "Failed to generate account link" });
    }
  });

  // Check Stripe account status and update user
  app.get("/api/stripe/account-status", requireAuth, async (req: any, res) => {
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
        capabilities: {
          card_payments: account.capabilities?.card_payments || 'inactive',
          transfers: account.capabilities?.transfers || 'inactive',
        },
      });
    } catch (error: any) {
      logger.error("Stripe account status error", error);
      res.status(500).json({ error: "Failed to check account status" });
    }
  });

  // PayPal Commerce Platform Partner Integration
  app.post("/api/paypal/create-partner-referral", requireAuth, async (req: any, res) => {
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
      logger.error("PayPal partner referral error", error);
      res.status(500).json({ error: "Failed to create PayPal partner referral" });
    }
  });

  // PayPal merchant status check
  app.get("/api/paypal/merchant-status", requireAuth, async (req: any, res) => {
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
      logger.error("PayPal merchant status error", error);
      res.status(500).json({ error: "Failed to check PayPal status" });
    }
  });

  app.post("/api/stripe/disconnect", requireAuth, async (req: any, res) => {
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
      logger.error("Stripe disconnect error", error);
      res.status(500).json({ error: "Failed to disconnect Stripe account" });
    }
  });

  // Subscription Management Endpoints
  // Start 30-day free trial when seller creates their first product
  app.post("/api/subscription/start-trial", requireAuth, async (req: any, res) => {
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
      logger.error("Start trial error", error);
      res.status(500).json({ error: "Failed to start trial" });
    }
  });

  // Create SetupIntent to collect payment method without charging
  app.post("/api/subscription/setup-payment", requireAuth, async (req: any, res) => {
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
      logger.error("Setup payment error", error);
      res.status(500).json({ error: "Failed to setup payment method" });
    }
  });

  // Create subscription checkout session
  app.post("/api/subscription/create", requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const { plan, activateStore = false } = req.body; // "monthly" or "annual", auto-activate store
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get or create Stripe price IDs
      let priceId: string;
      
      // In test mode, create prices programmatically
      if (process.env.NODE_ENV === 'development' || !process.env.STRIPE_PRICE_MONTHLY || !process.env.STRIPE_PRICE_ANNUAL) {
        // Create product if it doesn't exist
        const products = await stripe.products.list({ limit: 1 });
        let product = products.data.find(p => p.name === 'Upfirst Pro');
        
        if (!product) {
          product = await stripe.products.create({
            name: 'Upfirst Pro',
            description: 'Professional e-commerce platform subscription',
          });
        }

        // Create or get prices
        const prices = await stripe.prices.list({ product: product.id });
        
        if (plan === "annual") {
          let annualPrice = prices.data.find(p => p.recurring?.interval === 'year' && p.unit_amount === 9900);
          if (!annualPrice) {
            annualPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: 9900, // $99.00
              currency: 'usd',
              recurring: { interval: 'year' },
            });
          }
          priceId = annualPrice.id;
        } else {
          let monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month' && p.unit_amount === 999);
          if (!monthlyPrice) {
            monthlyPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: 999, // $9.99
              currency: 'usd',
              recurring: { interval: 'month' },
            });
          }
          priceId = monthlyPrice.id;
        }
      } else {
        // Use environment variable price IDs for production
        priceId = plan === "annual" 
          ? process.env.STRIPE_PRICE_ANNUAL!
          : process.env.STRIPE_PRICE_MONTHLY!;
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
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
        success_url: `${req.headers.origin || 'http://localhost:5000'}/subscription-success`,
        cancel_url: `${req.headers.origin || 'http://localhost:5000'}/settings?subscription=cancelled`,
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
      logger.error("Create subscription error", error);
      res.status(500).json({ error: "Failed to create subscription checkout" });
    }
  });

  // Sync subscription status from Stripe (fallback when webhook not configured)
  app.post("/api/subscription/sync", requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: "No Stripe customer found" });
      }

      // Fetch all subscriptions for this customer from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 1,
        status: 'all',
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        
        // Map Stripe status to our app status
        let status = null;
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          status = 'active';
        } else if (subscription.status === 'past_due') {
          status = 'past_due';
        } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
          status = 'canceled';
        }

        // Update user with subscription info
        await storage.upsertUser({
          ...user,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: status,
          subscriptionPlan: subscription.items.data[0]?.price?.recurring?.interval || 'monthly',
        });

        logger.info(`[Subscription Sync] Updated user ${userId} with status: ${status}`);

        res.json({
          status,
          plan: subscription.items.data[0]?.price?.recurring?.interval || 'monthly',
          subscriptionId: subscription.id,
        });
      } else {
        // No subscription found
        res.json({
          status: null,
          plan: null,
        });
      }
    } catch (error: any) {
      logger.error("Sync subscription error", error);
      res.status(500).json({ error: "Failed to sync subscription status" });
    }
  });

  // Get subscription status
  app.get("/api/subscription/status", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let subscription = null;
      let paymentMethod = null;
      let upcomingInvoice = null;
      let billingHistory: any[] = [];
      let nextBillingDate = null;
      let cancelAtPeriodEnd = false;

      if (user.stripeSubscriptionId && stripe) {
        try {
          // Get subscription with expanded data
          subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
            expand: ['default_payment_method']
          });

          // Get payment method details if available
          if (subscription.default_payment_method) {
            paymentMethod = subscription.default_payment_method;
          }

          // Get upcoming invoice for next billing date and amount
          try {
            upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              customer: user.stripeCustomerId as string,
            });
            nextBillingDate = new Date(upcomingInvoice.period_end * 1000);
          } catch (invoiceError) {
            // No upcoming invoice (subscription might be canceled)
            logger.info("No upcoming invoice found");
          }

          // Get billing history (last 5 invoices)
          if (user.stripeCustomerId) {
            const invoices = await stripe.invoices.list({
              customer: user.stripeCustomerId,
              limit: 5,
            });
            logger.info(`[Subscription Status] Retrieved ${invoices.data.length} invoices for customer ${user.stripeCustomerId}`);
            billingHistory = invoices.data.map(inv => {
              console.log(`[Subscription Status] Invoice ${inv.id}: amount_paid=${inv.amount_paid}, total=${inv.total}, status=${inv.status}`);
              return {
                id: inv.id,
                amount: inv.amount_paid,
                currency: inv.currency,
                status: inv.status,
                date: new Date(inv.created * 1000),
                invoiceUrl: inv.hosted_invoice_url,
                invoicePdf: inv.invoice_pdf,
                number: inv.number,
              };
            });
          }

          cancelAtPeriodEnd = subscription.cancel_at_period_end;
        } catch (error) {
          logger.error("Error fetching subscription details", error);
        }
      }

      res.json({
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        trialEndsAt: user.trialEndsAt,
        hasPaymentMethod: !!user.stripeCustomerId,
        subscription,
        paymentMethod,
        nextBillingDate,
        cancelAtPeriodEnd,
        billingHistory,
        upcomingInvoice: upcomingInvoice ? {
          amount: upcomingInvoice.amount_due,
          currency: upcomingInvoice.currency,
          date: nextBillingDate,
        } : null,
      });
    } catch (error: any) {
      logger.error("Get subscription status error", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Cancel subscription (schedule cancellation at period end)
  app.post("/api/subscription/cancel", requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription" });
      }

      // Schedule subscription cancellation at the end of the billing period
      // This ensures the user keeps access through the period they've already paid for
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // User remains active until the period ends - webhook will handle final cancellation
      // Don't update subscriptionStatus here, keep it as 'active' until period ends
      res.json({ 
        message: "Subscription will be canceled at the end of your billing period",
        subscription,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        periodEnd: new Date(subscription.current_period_end * 1000),
      });
    } catch (error: any) {
      logger.error("Cancel subscription error", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Reactivate subscription (remove scheduled cancellation)
  app.post("/api/subscription/reactivate", requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription" });
      }

      // Remove the scheduled cancellation
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      res.json({ 
        message: "Subscription reactivated successfully",
        subscription,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } catch (error: any) {
      logger.error("Reactivate subscription error", error);
      res.status(500).json({ error: "Failed to reactivate subscription" });
    }
  });

  // Migration endpoint: Fix old users' subscription status
  app.post("/api/admin/migrate-subscriptions", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only allow admin users to run migrations
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      const sellersToMigrate = allUsers.filter(u => 
        (u.role === 'admin' || u.role === 'editor' || u.role === 'viewer') && 
        !u.subscriptionStatus
      );

      logger.info(`[Migration] Found ${sellersToMigrate.length} sellers to migrate`);

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      for (const seller of sellersToMigrate) {
        await storage.upsertUser({
          ...seller,
          subscriptionStatus: "trial",
          trialEndsAt,
        });
        logger.info(`[Migration] Migrated user ${seller.email} to trial status`);
      }

      res.json({ 
        message: `Successfully migrated ${sellersToMigrate.length} users to trial status`,
        count: sellersToMigrate.length,
        migratedUsers: sellersToMigrate.map(u => ({
          id: u.id,
          email: u.email,
          username: u.username
        }))
      });
    } catch (error: any) {
      logger.error("Subscription migration error", error);
      res.status(500).json({ error: "Failed to migrate subscriptions" });
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
        logger.error("Webhook signature or secret missing");
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

      logger.info(`[Webhook] Received event: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan;

          if (userId && plan && session.subscription) {
            const user = await storage.getUser(userId);
            if (user) {
              // Retrieve the subscription with expanded payment method
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
                expand: ['default_payment_method', 'latest_invoice']
              });
              
              // CRITICAL: Only activate subscription if payment method is actually attached
              // Check for default_payment_method or payment_intent success
              let hasValidPaymentMethod = false;
              
              if (subscription.default_payment_method) {
                hasValidPaymentMethod = true;
              } else if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
                const invoice = subscription.latest_invoice as Stripe.Invoice;
                if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
                  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
                  hasValidPaymentMethod = paymentIntent.status === 'succeeded';
                } else if (invoice.paid === true) {
                  hasValidPaymentMethod = true;
                }
              }
              
              let status: string;
              
              // Only activate trial or paid subscription if payment method is confirmed
              if (subscription.status === 'trialing' && hasValidPaymentMethod) {
                status = 'trial';
                logger.info(`[Webhook] Checkout completed - user ${userId} starting trial with confirmed payment method`);
              } else if (subscription.status === 'active' && hasValidPaymentMethod) {
                status = 'active';
                logger.info(`[Webhook] Checkout completed - user ${userId} subscription active (paid)`);
              } else {
                // No valid payment method - don't activate subscription
                logger.info(`[Webhook] Checkout completed - user ${userId} subscription status ${subscription.status} without payment method, awaiting payment`);
                await storage.upsertUser({
                  ...user,
                  stripeSubscriptionId: subscription.id,
                  subscriptionPlan: plan,
                  // Don't set subscriptionStatus - keep it null until payment confirmed
                });
                break;
              }

              await storage.upsertUser({
                ...user,
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: status,
                subscriptionPlan: plan,
              });
            }
          }
          break;
        }

        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          // Find user by Stripe customer ID (indexed lookup)
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (user) {
            // Only update subscription ID, don't change status yet
            // Status will be set by checkout.session.completed or invoice.payment_succeeded
            await storage.upsertUser({
              ...user,
              stripeSubscriptionId: subscription.id,
            });
            logger.info(`[Webhook] Subscription created for user ${user.id}, awaiting payment confirmation`);
          }
          break;
        }

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
            logger.info(`[Webhook] Updated user ${user.id} subscription status to ${status}`);
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
              storeActive: 0, // CRITICAL: Deactivate store when subscription is cancelled
            });
            logger.info(`[Webhook] Cancelled subscription for user ${user.id} and deactivated store`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (user) {
            // Retrieve subscription to check attempt count
            let shouldDeactivateStore = false;
            if (user.stripeSubscriptionId && stripe) {
              try {
                const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
                // If subscription is unpaid or cancelled due to payment failures, deactivate store
                if (subscription.status === 'unpaid' || subscription.status === 'canceled') {
                  shouldDeactivateStore = true;
                }
              } catch (error) {
                console.error(`[Webhook] Error retrieving subscription:`, error);
              }
            }

            await storage.upsertUser({
              ...user,
              subscriptionStatus: 'past_due',
              storeActive: shouldDeactivateStore ? 0 : user.storeActive, // Deactivate if subscription is dead
            });
            logger.info(`[Webhook] Marked user ${user.id} subscription as past_due${shouldDeactivateStore ? ' and deactivated store' : ''}`);
            
            // TODO: Send notification email to user about failed payment
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (user) {
            // CRITICAL: Activate subscription on first successful payment
            // This handles cases where trial period ends and first payment is collected
            // Or when user subscribes without trial
            const shouldActivate = !user.subscriptionStatus || 
                                  user.subscriptionStatus === 'past_due' || 
                                  user.subscriptionStatus === null;
            
            if (shouldActivate) {
              await storage.upsertUser({
                ...user,
                subscriptionStatus: 'active',
              });
              logger.info(`[Webhook] Activated user ${user.id} subscription (first payment succeeded)`);
            } else if (user.subscriptionStatus === 'past_due') {
              await storage.upsertUser({
                ...user,
                subscriptionStatus: 'active',
              });
              logger.info(`[Webhook] Restored user ${user.id} subscription to active`);
            }

            // Send invoice email for all successful subscription payments
            try {
              const periodStart = new Date(invoice.period_start * 1000).toLocaleDateString();
              const periodEnd = new Date(invoice.period_end * 1000).toLocaleDateString();

              await notificationService.sendSubscriptionInvoice(user, {
                amount: invoice.amount_paid,
                currency: invoice.currency,
                invoiceNumber: invoice.number || invoice.id,
                invoiceUrl: invoice.hosted_invoice_url || undefined,
                periodStart,
                periodEnd,
                plan: user.subscriptionPlan || 'monthly',
              });
              
              logger.info(`[Webhook] Subscription invoice email sent to ${user.email}`);
            } catch (emailError) {
              console.error(`[Webhook] Failed to send invoice email:`, emailError);
              // Continue processing - don't fail webhook if email fails
            }
          }
          break;
        }

        default:
          logger.info(`[Webhook] Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error("[Webhook] Error processing webhook", error);
      res.status(500).send("Webhook processing error");
    }
  });

  // Seller-triggered balance payment for pre-orders
  app.post("/api/trigger-balance-payment/:orderId", requireAuth, async (req, res) => {
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
          allow_redirects: 'never',
        },
        metadata: {
          orderId: order.id,
          paymentType: "balance",
        },
      });

      // Update order with balance payment intent ID
      await storage.updateOrderBalancePaymentIntent(order.id, paymentIntent.id);

      // Get seller information
      if (req.user?.claims?.sub) {
        const seller = await storage.getUser(req.user.claims.sub);
        if (seller) {
          // Generate payment link (for email)
          const paymentLink = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/complete-balance-payment/${order.id}?payment_intent=${paymentIntent.id}`;
          
          // Send email to customer
          await notificationService.sendBalancePaymentRequest(order, seller, paymentLink);
        }
      }

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: remainingBalance,
      });
    } catch (error: any) {
      logger.error("Balance payment error", error);
      res.status(500).json({ 
        error: "Error creating balance payment: " + error.message 
      });
    }
  });

  // Meta OAuth routes
  app.get("/api/meta-auth/connect", requireAuth, (req, res) => {
    const appId = process.env.META_APP_ID || "YOUR_APP_ID";
    const redirectUri = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/meta-auth/callback`;
    
    const scopes = ["ads_management", "ads_read", "business_management"];
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join(',')}&response_type=code`;
    
    res.redirect(authUrl);
  });

  app.get("/api/meta-auth/callback", requireAuth, async (req: any, res) => {
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
      logger.error("Meta OAuth error", error);
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

  app.post("/api/meta-auth/disconnect", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteMetaSettings(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.get("/api/meta-settings", requireAuth, async (req: any, res) => {
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

  app.post("/api/meta-campaigns", requireAuth, async (req: any, res) => {
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
      logger.error("Meta campaign error", error);
      res.status(500).json({ error: error.message || "Failed to create campaign" });
    }
  });

  // TikTok OAuth routes
  app.get("/api/tiktok-auth/connect", requireAuth, (req, res) => {
    const appId = process.env.TIKTOK_APP_ID || "YOUR_APP_ID";
    const redirectUri = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/tiktok-auth/callback`;
    
    const authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=STATE`;
    
    res.redirect(authUrl);
  });

  app.get("/api/tiktok-auth/callback", requireAuth, async (req: any, res) => {
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
      logger.error("TikTok OAuth error", error);
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

  app.post("/api/tiktok-auth/disconnect", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteTikTokSettings(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.get("/api/tiktok-settings", requireAuth, async (req: any, res) => {
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
  app.get("/api/x-auth/connect", requireAuth, (req, res) => {
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

  app.post("/api/x-auth/disconnect", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteXSettings(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.get("/api/x-settings", requireAuth, async (req: any, res) => {
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
  app.get("/api/newsletters", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newsletters = await storage.getNewslettersByUserId(userId);
      res.json(newsletters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch newsletters" });
    }
  });

  app.post("/api/newsletters", requireAuth, async (req: any, res) => {
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
      logger.error("Newsletter creation error", error);
      res.status(500).json({ error: "Failed to create newsletter" });
    }
  });

  app.post("/api/newsletters/:id/send", requireAuth, async (req: any, res) => {
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
      const recipients = Array.isArray(newsletter.recipients) 
        ? newsletter.recipients.map((email: any) => ({ email: String(email) }))
        : [];

      if (recipients.length === 0) {
        return res.status(400).json({ error: "No recipients found" });
      }

      // Send newsletter via Resend - use verified upfirst.io domain
      const result = await notificationService.sendNewsletter({
        userId,
        newsletterId,
        recipients,
        from: `${seller.firstName || seller.username} via Upfirst <hello@upfirst.io>`,
        replyTo: seller.email || undefined,
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
      logger.error("Newsletter send error", error);
      res.status(500).json({ error: "Failed to send newsletter" });
    }
  });

  app.delete("/api/newsletters/:id", requireAuth, async (req: any, res) => {
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
  app.post("/api/newsletters/:id/test", requireAuth, async (req: any, res) => {
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
        replyTo: seller.email || undefined,
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
      logger.error("Test email send error", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Track newsletter open (public endpoint - no auth required)
  app.get("/api/newsletters/track/:id/open", async (req, res) => {
    try {
      const newsletterId = req.params.id;
      const recipientEmail = req.query.email as string;

      if (!recipientEmail) {
        return res.status(400).send("Email required");
      }

      // Track the open event
      await notificationService.trackNewsletterEvent(
        newsletterId,
        recipientEmail,
        'open'
      );

      // Return a 1x1 transparent pixel
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      });
      res.end(pixel);
    } catch (error) {
      logger.error("Newsletter tracking error", error);
      // Still return pixel even on error to prevent broken images
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
      });
      res.end(pixel);
    }
  });

  // Unsubscribe from newsletters (public endpoint - no auth required)
  app.get("/api/newsletters/unsubscribe", async (req, res) => {
    try {
      const email = req.query.email as string;

      if (!email) {
        return res.status(400).send("Email required");
      }

      // Track unsubscribe event (if we have a newsletterId, otherwise just update subscriber)
      const newsletterId = req.query.newsletterId as string;
      if (newsletterId) {
        await notificationService.trackNewsletterEvent(
          newsletterId,
          email,
          'unsubscribe'
        );
      }

      // TODO: Implement subscriber management when newsletter subscriber table is added
      // For now, the tracking above is sufficient

      // HTML escape function to prevent XSS
      const escapeHtml = (unsafe: string) => {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      // Return a user-friendly unsubscribe confirmation page
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Unsubscribed - Upfirst</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f3f4f6;
              }
              .container {
                background: white;
                padding: 3rem;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
              }
              h1 {
                color: #2563eb;
                margin-bottom: 1rem;
              }
              p {
                color: #6b7280;
                line-height: 1.6;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>You've been unsubscribed</h1>
              <p>You will no longer receive newsletter emails at <strong>${escapeHtml(email)}</strong></p>
              <p>If this was a mistake, please contact the sender directly to resubscribe.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      logger.error("Unsubscribe error", error);
      res.status(500).send("An error occurred while unsubscribing. Please try again.");
    }
  });

  // Newsletter Templates
  app.get("/api/newsletter-templates", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getNewsletterTemplatesByUserId(userId);
      res.json(templates);
    } catch (error) {
      logger.error("Get newsletter templates error", error);
      res.status(500).json({ error: "Failed to get newsletter templates" });
    }
  });

  app.post("/api/newsletter-templates", requireAuth, async (req: any, res) => {
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
      logger.error("Create newsletter template error", error);
      res.status(500).json({ error: "Failed to create newsletter template" });
    }
  });

  app.delete("/api/newsletter-templates/:id", requireAuth, async (req: any, res) => {
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
      logger.error("Delete newsletter template error", error);
      res.status(500).json({ error: "Failed to delete newsletter template" });
    }
  });

  // Subscriber Groups
  app.get("/api/subscriber-groups", requireAuth, async (req: any, res) => {
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
      logger.error("Get subscriber groups error", error);
      res.status(500).json({ error: "Failed to get subscriber groups" });
    }
  });

  app.post("/api/subscriber-groups", requireAuth, async (req: any, res) => {
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
      logger.error("Create subscriber group error", error);
      res.status(500).json({ error: "Failed to create subscriber group" });
    }
  });

  app.delete("/api/subscriber-groups/:id", requireAuth, async (req: any, res) => {
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
      logger.error("Delete subscriber group error", error);
      res.status(500).json({ error: "Failed to delete subscriber group" });
    }
  });

  // Newsletter Analytics
  app.get("/api/newsletter-analytics", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getNewsletterAnalyticsByUserId(userId);
      res.json(analytics);
    } catch (error) {
      logger.error("Get newsletter analytics error", error);
      res.status(500).json({ error: "Failed to get newsletter analytics" });
    }
  });

  // Subscribers
  app.get("/api/subscribers", requireAuth, async (req: any, res) => {
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
      logger.error("Get subscribers error", error);
      res.status(500).json({ error: "Failed to get subscribers" });
    }
  });

  // Bulk import subscribers from CSV
  app.post("/api/subscribers/bulk", requireAuth, async (req: any, res) => {
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
      logger.error("Bulk import subscribers error", error);
      res.status(500).json({ error: "Failed to import subscribers" });
    }
  });

  app.post("/api/subscribers", requireAuth, async (req: any, res) => {
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
      logger.error("Create subscriber error", error);
      if (error.message?.includes('unique constraint')) {
        return res.status(400).json({ error: "Subscriber with this email already exists" });
      }
      res.status(500).json({ error: "Failed to create subscriber" });
    }
  });

  app.delete("/api/subscribers/:id", requireAuth, async (req: any, res) => {
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
      logger.error("Delete subscriber error", error);
      res.status(500).json({ error: "Failed to delete subscriber" });
    }
  });

  // NFT Minting route
  app.post("/api/nft/mint", requireAuth, async (req: any, res) => {
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
        description: `NFT for ${productData.name} purchased on Upfirst`,
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
      logger.error("NFT minting error", error);
      
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
      logger.error("Error fetching wholesale products", error);
      res.status(500).json({ message: "Failed to fetch wholesale products" });
    }
  });

  app.get("/api/wholesale/products/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const products = await storage.getWholesaleProductsBySellerId(sellerId);
      res.json(products);
    } catch (error) {
      logger.error("Error fetching seller wholesale products", error);
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
      logger.error("Error fetching wholesale product", error);
      res.status(500).json({ message: "Failed to fetch wholesale product" });
    }
  });

  app.post("/api/wholesale/products", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const productData = {
        ...req.body,
        sellerId: userId,
      };

      const product = await storage.createWholesaleProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      logger.error("Error creating wholesale product", error);
      res.status(500).json({ message: "Failed to create wholesale product" });
    }
  });

  // Bulk upload wholesale products from CSV
  app.post("/api/wholesale/products/bulk-upload", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.files || !req.files.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.files.file as any;
      const fileContent = file.data.toString('utf8');
      
      // Parse CSV using papaparse
      const Papa = (await import('papaparse')).default;
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        return res.status(400).json({ 
          error: "CSV parsing failed", 
          details: parsed.errors 
        });
      }

      const products = parsed.data as any[];
      const created: any[] = [];
      const errors: any[] = [];

      // Process each row
      for (let i = 0; i < products.length; i++) {
        const row = products[i];
        
        try {
          // Map and coerce CSV columns to product data with proper types
          const rawData = {
            sellerId: userId,
            name: (row['Name'] || row['name'] || '').trim(),
            description: (row['Description'] || row['description'] || '').trim(),
            image: (row['Image URL'] || row['image'] || row['Image'] || '').trim(),
            category: (row['Category'] || row['category'] || '').trim(),
            rrp: row['RRP'] || row['rrp'],
            wholesalePrice: row['Wholesale Price'] || row['wholesalePrice'] || row['wholesale_price'],
            moq: row['MOQ'] || row['moq'],
            stock: row['Stock'] || row['stock'] || '0',
            depositAmount: row['Deposit Amount'] || row['depositAmount'] || null,
            requiresDeposit: row['Requires Deposit'] || row['requiresDeposit'] || '0',
            readinessDays: row['Readiness Days'] || row['readinessDays'] || null,
          };

          // Validate required fields first
          if (!rawData.name || !rawData.description || !rawData.image || 
              !rawData.category || !rawData.rrp || !rawData.wholesalePrice || !rawData.moq) {
            errors.push({
              row: i + 2, // +2 because header is row 1
              error: "Missing required fields",
              data: row
            });
            continue;
          }

          // Convert to proper numeric types (round to 2 decimals for prices)
          const rrpNum = parseFloat(rawData.rrp.toString().replace(/[^0-9.]/g, ''));
          const wholesalePriceNum = parseFloat(rawData.wholesalePrice.toString().replace(/[^0-9.]/g, ''));
          const depositNum = rawData.depositAmount ? parseFloat(rawData.depositAmount.toString().replace(/[^0-9.]/g, '')) : null;
          
          const productData = {
            sellerId: rawData.sellerId,
            name: rawData.name,
            description: rawData.description,
            image: rawData.image,
            category: rawData.category,
            rrp: (Math.round(rrpNum * 100) / 100).toString(), // Convert to 2 decimal string for schema
            wholesalePrice: (Math.round(wholesalePriceNum * 100) / 100).toString(),
            moq: parseInt(rawData.moq.toString().replace(/[^0-9]/g, '')) || 1,
            stock: parseInt(rawData.stock.toString().replace(/[^0-9]/g, '')) || 0,
            depositAmount: depositNum ? (Math.round(depositNum * 100) / 100).toString() : null,
            requiresDeposit: parseInt(rawData.requiresDeposit.toString().replace(/[^0-9]/g, '')) || 0,
            readinessDays: rawData.readinessDays ? parseInt(rawData.readinessDays.toString().replace(/[^0-9]/g, '')) : null,
          };

          // Validate numeric conversions
          if (isNaN(rrpNum) || isNaN(wholesalePriceNum) || isNaN(productData.moq) || productData.moq < 1) {
            errors.push({
              row: i + 2,
              error: "Invalid numeric values for RRP, Wholesale Price, or MOQ",
              data: row
            });
            continue;
          }

          const product = await storage.createWholesaleProduct(productData);
          created.push(product);
        } catch (error: any) {
          errors.push({
            row: i + 2,
            error: error.message || "Failed to create product",
            data: row
          });
        }
      }

      res.json({
        success: true,
        created: created.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully created ${created.length} products${errors.length > 0 ? `, ${errors.length} errors` : ''}`
      });
    } catch (error: any) {
      logger.error("Bulk upload error", error);
      res.status(500).json({ error: error.message || "Bulk upload failed" });
    }
  });

  app.patch("/api/wholesale/products/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
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
      logger.error("Error updating wholesale product", error);
      res.status(500).json({ message: "Failed to update wholesale product" });
    }
  });

  app.delete("/api/wholesale/products/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
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
      logger.error("Error deleting wholesale product", error);
      res.status(500).json({ message: "Failed to delete wholesale product" });
    }
  });

  // Wholesale Invitations Routes
  app.get("/api/wholesale/invitations", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitations = await storage.getWholesaleInvitationsBySellerId(userId);
      res.json(invitations);
    } catch (error) {
      logger.error("Error fetching wholesale invitations", error);
      res.status(500).json({ message: "Failed to fetch wholesale invitations" });
    }
  });

  app.post("/api/wholesale/invitations", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const invitationData = {
        ...req.body,
        sellerId: userId,
      };

      const invitation = await storage.createWholesaleInvitation(invitationData);
      res.status(201).json(invitation);
    } catch (error) {
      logger.error("Error creating wholesale invitation", error);
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
      logger.error("Error fetching wholesale invitation", error);
      res.status(500).json({ message: "Failed to fetch wholesale invitation" });
    }
  });

  app.post("/api/wholesale/invitations/:token/accept", requireAuth, async (req: any, res) => {
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
      logger.error("Error accepting wholesale invitation", error);
      res.status(500).json({ message: "Failed to accept wholesale invitation" });
    }
  });

  app.delete("/api/wholesale/invitations/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWholesaleInvitation(id);
      res.json({ message: "Wholesale invitation deleted successfully" });
    } catch (error) {
      logger.error("Error deleting wholesale invitation", error);
      res.status(500).json({ message: "Failed to delete wholesale invitation" });
    }
  });

  // Buyer Wholesale Routes (Invitation-Protected)
  // Check if buyer has wholesale access (accepted invitations)
  app.get("/api/wholesale/buyer/access", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.json({ hasAccess: false });
      }

      // Check if user has any accepted invitations
      const allInvitations = await storage.getAllWholesaleInvitations();
      const hasAcceptedInvitations = allInvitations.some(
        inv => inv.buyerEmail === user.email && inv.status === "accepted"
      );

      res.json({ hasAccess: hasAcceptedInvitations });
    } catch (error) {
      logger.error("Error checking wholesale access", error);
      res.status(500).json({ message: "Failed to check wholesale access" });
    }
  });

  app.get("/api/wholesale/buyer/catalog", requireAuth, async (req: any, res) => {
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
      logger.error("Error fetching buyer wholesale catalog", error);
      res.status(500).json({ message: "Failed to fetch catalog" });
    }
  });

  app.get("/api/wholesale/buyer/products/:id", requireAuth, async (req: any, res) => {
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
      logger.error("Error fetching wholesale product", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Instagram OAuth Routes
  app.get("/api/instagram/connect", requireAuth, async (req: any, res) => {
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
      logger.error("Error initiating Instagram OAuth", error);
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
      logger.error("Error in Instagram OAuth callback", error);
      res.redirect('/settings?instagram=error');
    }
  });

  app.post("/api/instagram/disconnect", requireAuth, async (req: any, res) => {
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
      logger.error("Error disconnecting Instagram", error);
      res.status(500).json({ message: "Failed to disconnect Instagram" });
    }
  });

  // Currency API routes
  app.get("/api/currency/rates", async (req, res) => {
    try {
      const ratesData = await getExchangeRates();
      res.json(ratesData);
    } catch (error) {
      logger.error("Error fetching exchange rates", error);
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
      logger.error("Error detecting currency", error);
      res.json({ currency: 'USD', countryCode: 'US' });
    }
  });

  // Object Storage endpoints - from javascript_object_storage integration
  // Endpoint to upload file directly through backend (avoids CORS issues)
  app.post("/api/objects/upload-file", requireAuth, async (req: any, res) => {
    try {
      logger.info("[Upload] Received upload request");
      console.log('[Upload] Files:', req.files ? Object.keys(req.files) : 'none');
      console.log('[Upload] Body:', req.body);
      
      if (!req.files || !req.files.file) {
        logger.error("[Upload] No file found in request");
        return res.status(400).json({ error: "No file uploaded. Please select an image file." });
      }

      const file = req.files.file;
      console.log('[Upload] File details:', { name: file.name, size: file.size, mimetype: file.mimetype });
      
      const objectStorageService = new ObjectStorageService();
      
      // Get upload URL
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      console.log('[Upload] Generated presigned URL for file:', file.name);
      
      // Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file.data,
        headers: {
          'Content-Type': file.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[Upload] Storage upload failed:', uploadResponse.status, errorText);
        throw new Error(`Failed to upload to storage: ${uploadResponse.status}`);
      }
      
      // Normalize the path and set public ACL
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL,
        {
          owner: "system",
          visibility: "public",
        }
      );
      
      console.log('[Upload] File uploaded successfully:', objectPath);
      
      // Remove /objects/ prefix if present (frontend will add it)
      const cleanPath = objectPath.replace(/^\/objects\//, '');
      
      res.json({ objectPath: cleanPath });
    } catch (error) {
      logger.error("[Upload] Error uploading file", error);
      console.error("[Upload] Error details:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
  
  // Endpoint to get presigned upload URL (deprecated - kept for backward compatibility)
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      logger.info("[Upload] Generated presigned URL");
      res.json({ uploadURL });
    } catch (error) {
      logger.error("Error getting upload URL", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint to normalize uploaded image path (after upload completes)
  app.put("/api/product-images", requireAuth, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      console.log('[Upload] Normalizing image path:', req.body.imageURL);
      // Normalize the path and set public ACL (product images are public)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: "system", // Product images owned by system
          visibility: "public", // Product images are publicly accessible
        }
      );
      console.log('[Upload] Image normalized to:', objectPath);

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      logger.error("Error setting product image", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Handle CORS preflight requests for objects
  app.options("/objects/:objectPath(*)", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });

  // Endpoint to serve uploaded images (public access)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    
    // Set CORS headers for cross-origin image loading (needed for canvas/image editing)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    try {
      // Extract the object path from URL params (everything after /objects/)
      const pathSegment = req.params.objectPath || req.params[0];
      // Add /objects/ prefix back for getObjectEntityFile (it expects full path)
      const fullPath = `/objects/${pathSegment}`;
      const objectFile = await objectStorageService.getObjectEntityFile(fullPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      logger.error("Error accessing object", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Platform Admin middleware
  const isPlatformAdmin = async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || user.isPlatformAdmin !== 1) {
      return res.status(403).json({ error: "Not authorized - Platform admin access required" });
    }
    
    next();
  };

  // Admin: Platform metrics
  app.get("/api/admin/metrics", requireAuth, isPlatformAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allProducts = await storage.getAllProducts();
      const allOrders = await storage.getAllOrders();
      
      // Calculate metrics
      const sellers = allUsers.filter(u => u.role === 'seller');
      const totalSellers = sellers.length;
      const activeSellers = sellers.filter(u => u.storeActive === 1).length;
      const totalProducts = allProducts.length;
      const totalOrders = allOrders.length;
      
      // Calculate revenue and platform fees
      let totalRevenue = 0;
      let platformFees = 0;
      
      for (const order of allOrders) {
        const orderTotal = parseFloat(order.total);
        totalRevenue += orderTotal * 100; // Convert to cents
        platformFees += Math.round(orderTotal * 100 * 0.015); // 1.5% in cents
      }
      
      // Subscription metrics
      const activeSubscriptions = allUsers.filter(u => u.subscriptionStatus === 'active').length;
      const trialSubscriptions = allUsers.filter(u => u.subscriptionStatus === 'trial').length;
      
      res.json({
        totalSellers,
        activeSellers,
        totalProducts,
        totalOrders,
        totalRevenue,
        platformFees,
        activeSubscriptions,
        trialSubscriptions,
      });
    } catch (error) {
      logger.error("Admin metrics error", error);
      res.status(500).json({ error: "Failed to fetch platform metrics" });
    }
  });

  // Admin: Recent transactions
  app.get("/api/admin/transactions", requireAuth, isPlatformAdmin, async (req: any, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      const allUsers = await storage.getAllUsers();
      
      // Get last 20 orders
      const recentOrders = allOrders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);
      
      const transactions = recentOrders.map(order => {
        const seller = allUsers.find(u => u.id === order.sellerId);
        const amount = Math.round(parseFloat(order.total) * 100); // Convert to cents
        const platformFee = Math.round(amount * 0.015); // 1.5% fee
        
        return {
          id: order.id,
          sellerName: seller?.username || seller?.email || 'Unknown Seller',
          amount,
          platformFee,
          status: order.paymentStatus || 'completed',
          createdAt: order.createdAt,
        };
      });
      
      res.json(transactions);
    } catch (error) {
      logger.error("Admin transactions error", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Admin: System health check
  app.get("/api/admin/health", requireAuth, isPlatformAdmin, async (req: any, res) => {
    try {
      const health = {
        database: "healthy" as const,
        email: "healthy" as const,
        stripe: "healthy" as const,
        webhooks: "healthy" as const,
        lastChecked: new Date().toISOString(),
      };
      
      // Check database
      try {
        await storage.getAllUsers();
      } catch (error) {
        health.database = "down";
      }
      
      // Check email service
      if (!process.env.RESEND_API_KEY) {
        health.email = "down";
      }
      
      // Check Stripe
      if (!stripe) {
        health.stripe = "down";
      }
      
      res.json(health);
    } catch (error) {
      logger.error("Admin health check error", error);
      res.status(500).json({ error: "Failed to fetch system health" });
    }
  });

  // Admin: Critical errors (stub - would need error tracking system)
  app.get("/api/admin/errors", requireAuth, isPlatformAdmin, async (req: any, res) => {
    try {
      // For now, return empty array
      // In production, this would query an error logging service or database table
      res.json([]);
    } catch (error) {
      logger.error("Admin errors fetch error", error);
      res.status(500).json({ error: "Failed to fetch errors" });
    }
  });

  // =============================================================================
  // BACKEND SERVICES API - All business logic centralized on backend
  // =============================================================================

  // Import services
  const { CartService } = await import("./services/cart.service");
  const { CartValidationService } = await import("./services/cart-validation.service");
  const { ShippingService } = await import("./services/shipping.service");
  const { OrderService } = await import("./services/order.service");
  const { TaxService } = await import("./services/tax.service");
  const { calculatePricing, estimateTax } = await import("./services/pricing.service");

  const cartService = new CartService(storage);
  const cartValidationService = new CartValidationService(storage);
  const shippingService = new ShippingService(storage);
  const orderService = new OrderService(storage);
  const taxService = new TaxService();

  // Cart API - Backend cart management
  app.post("/api/cart/add", async (req: any, res) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.user?.claims?.sub || null;

      if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      const result = await cartService.addToCart(userId, productId, quantity);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.cart);
    } catch (error) {
      logger.error("Cart add error", error);
      res.status(500).json({ error: "Failed to add to cart" });
    }
  });

  app.post("/api/cart/remove", async (req: any, res) => {
    try {
      const { productId } = req.body;
      const userId = req.user?.claims?.sub || null;

      if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      const result = await cartService.removeFromCart(userId, productId);
      res.json(result.cart);
    } catch (error) {
      logger.error("Cart remove error", error);
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  app.post("/api/cart/update", async (req: any, res) => {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user?.claims?.sub || null;

      if (!productId || quantity === undefined) {
        return res.status(400).json({ error: "Product ID and quantity are required" });
      }

      const result = await cartService.updateQuantity(userId, productId, quantity);
      res.json(result.cart);
    } catch (error) {
      logger.error("Cart update error", error);
      res.status(500).json({ error: "Failed to update cart" });
    }
  });

  app.delete("/api/cart", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      const result = await cartService.clearCart(userId);
      res.json(result);
    } catch (error) {
      logger.error("Cart clear error", error);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  app.get("/api/cart", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      const cart = await cartService.getCart(userId);
      res.json(cart);
    } catch (error) {
      logger.error("Cart get error", error);
      res.status(500).json({ error: "Failed to get cart" });
    }
  });

  // Shipping API - Backend shipping calculations
  app.post("/api/shipping/calculate", async (req: any, res) => {
    try {
      const { items, destination } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Cart items are required" });
      }

      if (!destination || !destination.country) {
        return res.status(400).json({ error: "Shipping destination is required" });
      }

      const shipping = await shippingService.calculateShipping(items, destination);
      res.json(shipping);
    } catch (error) {
      logger.error("Shipping calculate error", error);
      res.status(500).json({ error: "Failed to calculate shipping" });
    }
  });

  // Cart Validation API - Validate cart with server-side pricing
  app.post("/api/cart/validate", async (req: any, res) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Cart items are required" });
      }

      const validation = await cartValidationService.validateCart(items);
      res.json(validation);
    } catch (error) {
      logger.error("Cart validation error", error);
      res.status(500).json({ error: "Failed to validate cart" });
    }
  });

  // Order API - Backend order processing with server-side shipping and tax calculation
  app.post("/api/orders/calculate", async (req: any, res) => {
    try {
      const { items, destination } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Cart items are required" });
      }

      if (!destination || !destination.country) {
        return res.status(400).json({ error: "Shipping destination is required" });
      }

      // SECURITY: Validate cart items and fetch server-side prices
      const validation = await cartValidationService.validateCart(items);
      
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Invalid cart items", 
          details: validation.errors 
        });
      }

      // SECURITY: Calculate shipping server-side (never trust client shipping cost)
      const shipping = await shippingService.calculateShipping(
        items.map(i => ({ id: i.productId, quantity: i.quantity })),
        destination
      );

      // SECURITY: Calculate tax server-side (never trust client tax amount)
      // For now using 8% estimate - TODO: integrate full Stripe Tax
      const taxableAmount = validation.total + shipping.cost;
      const taxAmount = estimateTax(taxableAmount);

      // Use validated items with server-calculated shipping and tax
      const summary = await orderService.calculateOrderSummary(
        validation.items,
        shipping.cost,
        taxAmount
      );
      
      res.json({
        ...summary,
        shipping,
        validatedItems: validation.items,
      });
    } catch (error) {
      logger.error("Order calculate error", error);
      res.status(500).json({ error: "Failed to calculate order" });
    }
  });

  // ============================================================================
  // HOMEPAGE BUILDER ROUTES
  // ============================================================================

  // Get seller homepage (for editing)
  app.get("/api/homepage", requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.user!.id;
      const homepage = await storage.getHomepageBySellerId(sellerId);
      
      if (!homepage) {
        return res.status(404).json({ error: "Homepage not found" });
      }

      res.json(homepage);
    } catch (error) {
      logger.error("Get homepage error", error);
      res.status(500).json({ error: "Failed to get homepage" });
    }
  });

  // Create seller homepage
  app.post("/api/homepage", requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.user!.id;

      // Check if homepage already exists
      const existing = await storage.getHomepageBySellerId(sellerId);
      if (existing) {
        return res.status(400).json({ error: "Homepage already exists" });
      }

      // Validate request body
      const { insertSellerHomepageSchema } = await import("@shared/schema");
      const validationResult = insertSellerHomepageSchema.safeParse({
        ...req.body,
        sellerId,
        status: "draft" // Force draft status on creation
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid homepage data", 
          details: validationResult.error.errors 
        });
      }

      const homepage = await storage.createHomepage(validationResult.data);
      res.json(homepage);
    } catch (error) {
      logger.error("Create homepage error", error);
      res.status(500).json({ error: "Failed to create homepage" });
    }
  });

  // Update seller homepage
  app.put("/api/homepage/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const sellerId = req.user!.id;

      // Verify ownership
      const existing = await storage.getHomepageBySellerId(sellerId);
      if (!existing || existing.id !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // SECURITY: Use safe update schema that excludes status and published fields
      const { updateSellerHomepageSchema } = await import("@shared/schema");
      const validationResult = updateSellerHomepageSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid update data", 
          details: validationResult.error.errors 
        });
      }

      // Only allow updates if homepage is in draft or unpublished state
      if (existing.status === 'published') {
        return res.status(400).json({ 
          error: "Cannot update published homepage. Unpublish it first to make changes." 
        });
      }

      const homepage = await storage.updateHomepage(id, validationResult.data);
      res.json(homepage);
    } catch (error) {
      logger.error("Update homepage error", error);
      res.status(500).json({ error: "Failed to update homepage" });
    }
  });

  // Publish homepage
  app.post("/api/homepage/:id/publish", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const sellerId = req.user!.id;

      // Verify ownership
      const existing = await storage.getHomepageBySellerId(sellerId);
      if (!existing || existing.id !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const homepage = await storage.publishHomepage(id);
      res.json(homepage);
    } catch (error) {
      logger.error("Publish homepage error", error);
      res.status(500).json({ error: "Failed to publish homepage" });
    }
  });

  // Unpublish homepage
  app.post("/api/homepage/:id/unpublish", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const sellerId = req.user!.id;

      // Verify ownership
      const existing = await storage.getHomepageBySellerId(sellerId);
      if (!existing || existing.id !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const homepage = await storage.unpublishHomepage(id);
      res.json(homepage);
    } catch (error) {
      logger.error("Unpublish homepage error", error);
      res.status(500).json({ error: "Failed to unpublish homepage" });
    }
  });

  // Get published homepage by username (public)
  app.get("/api/homepage/public/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      // Find seller by username
      const seller = await storage.getUserByUsername(username);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      const homepage = await storage.getHomepageBySellerId(seller.id);
      
      if (!homepage || homepage.status !== 'published') {
        return res.status(404).json({ error: "Homepage not found or not published" });
      }

      // Return only published config
      res.json({
        id: homepage.id,
        templateKey: homepage.templateKey,
        desktopConfig: homepage.publishedDesktopConfig,
        mobileConfig: homepage.publishedMobileConfig,
        heroMediaId: homepage.heroMediaId,
        heroMediaType: homepage.heroMediaType,
        headline: homepage.headline,
        bodyCopy: homepage.bodyCopy,
        selectedCtaId: homepage.selectedCtaId,
        musicTrackId: homepage.musicTrackId,
        musicEnabled: homepage.musicEnabled,
        lastPublishedAt: homepage.lastPublishedAt
      });
    } catch (error) {
      logger.error("Get public homepage error", error);
      res.status(500).json({ error: "Failed to get homepage" });
    }
  });

  // Get all CTA options
  app.get("/api/homepage/cta-options", async (req, res) => {
    try {
      const options = await storage.getAllCtaOptions();
      res.json(options);
    } catch (error) {
      logger.error("Get CTA options error", error);
      res.status(500).json({ error: "Failed to get CTA options" });
    }
  });

  // Get homepage media assets
  app.get("/api/homepage/:id/media", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const sellerId = req.user!.id;

      // Verify ownership
      const homepage = await storage.getHomepageBySellerId(sellerId);
      if (!homepage || homepage.id !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const media = await storage.getHomepageMedia(id);
      res.json(media);
    } catch (error) {
      logger.error("Get homepage media error", error);
      res.status(500).json({ error: "Failed to get media" });
    }
  });

  // Upload homepage media
  app.post("/api/homepage/:id/media", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const sellerId = req.user!.id;

      // Verify ownership
      const homepage = await storage.getHomepageBySellerId(sellerId);
      if (!homepage || homepage.id !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Validate media data
      const { insertHomepageMediaAssetSchema } = await import("@shared/schema");
      const validationResult = insertHomepageMediaAssetSchema.safeParse({
        ...req.body,
        homepageId: id
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid media data", 
          details: validationResult.error.errors 
        });
      }

      const media = await storage.createHomepageMedia(validationResult.data);
      res.json(media);
    } catch (error) {
      logger.error("Upload homepage media error", error);
      res.status(500).json({ error: "Failed to upload media" });
    }
  });

  // Delete homepage media
  app.delete("/api/homepage/media/:mediaId", requireAuth, async (req: any, res) => {
    try {
      const { mediaId } = req.params;
      const sellerId = req.user!.id;

      // Verify ownership through homepage
      const media = await storage.db
        .select()
        .from(require("@shared/schema").homepageMediaAssets)
        .where(require("drizzle-orm").eq(require("@shared/schema").homepageMediaAssets.id, mediaId))
        .limit(1);

      if (!media[0]) {
        return res.status(404).json({ error: "Media not found" });
      }

      const homepage = await storage.getHomepageBySellerId(sellerId);
      if (!homepage || homepage.id !== media[0].homepageId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteHomepageMedia(mediaId);
      res.json({ success: true });
    } catch (error) {
      logger.error("Delete homepage media error", error);
      res.status(500).json({ error: "Failed to delete media" });
    }
  });

  // Search music tracks
  app.get("/api/music/search", async (req, res) => {
    try {
      const { query, genre } = req.query;
      const tracks = await storage.searchMusicTracks(
        query as string || "", 
        genre as string | undefined
      );
      res.json(tracks);
    } catch (error) {
      logger.error("Music search error", error);
      res.status(500).json({ error: "Failed to search music" });
    }
  });

  // Get music track by ID
  app.get("/api/music/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const track = await storage.getMusicTrack(id);
      
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      res.json(track);
    } catch (error) {
      logger.error("Get music track error", error);
      res.status(500).json({ error: "Failed to get track" });
    }
  });

  // Auth system migration (admin only)
  app.post("/api/admin/migrate-auth", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can run migration
      if (!user || user.isPlatformAdmin !== 1) {
        return res.status(403).json({ error: "Forbidden - Platform admin access required" });
      }

      const { migrateAuthSystem } = await import("./scripts/migrate-auth-system");
      const result = await migrateAuthSystem();
      
      res.json(result);
    } catch (error) {
      logger.error("Auth migration error", error);
      res.status(500).json({ error: "Failed to run migration" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
