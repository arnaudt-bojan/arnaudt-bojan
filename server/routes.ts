import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertProductSchema, orderStatusEnum, insertSavedAddressSchema, checkoutInitiateRequestSchema, updateCustomerDetailsSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import { computeDeliveryDate } from "@shared/order-utils";
import { setupAuth } from "./replitAuth";
import { requireAuth, requireUserType, requireCapability, requireStoreAccess, requireProductAccess, requireOrderAccess, requireCanPurchase } from "./middleware/auth";
import { AuthorizationService } from "./services/authorization.service";
import Stripe from "stripe";
import { getExchangeRates, getUserCurrency } from "./currencyService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import emailAuthRoutes from "./auth-email";
import { createNotificationService } from "./notifications";
import documentRoutes from "./routes/documents";
import wholesaleRefundRoutes from "./routes/wholesale-refunds";
import wholesaleDocumentRoutes from "./routes/wholesale-documents";
import { DocumentGenerator } from "./services/document-generator";
import { logger } from "./logger";
import { generateUniqueUsername, generateOrderNumber } from "./utils";
import { generateCollaboratorInvitationEmail } from "./utils/email-templates";
import { InventoryService } from "./services/inventory.service";
import { OrderService } from "./services/order.service";
import { CartValidationService } from "./services/cart-validation.service";
import { ShippingService } from "./services/shipping.service";
import { TaxService } from "./services/tax.service";
import { StripePaymentProvider } from "./services/payment/stripe-provider";
import { WebhookHandler } from "./services/payment/webhook-handler";
import { PaymentService } from "./services/payment/payment.service";
import { ProductService } from "./services/product.service";
import { productVariantService } from "./services/product-variant.service";
import { BulkUploadService } from "./services/bulk-upload.service";
import { AIFieldMappingService } from "./services/ai-field-mapping.service";
import { MultiRowProductPreprocessor } from "./services/multi-row-preprocessor.service";
import Papa from "papaparse";
import { generateCSVTemplate, generateInstructionsText, CSV_TEMPLATE_FIELDS } from "@shared/bulk-upload-template";
import { LegacyStripeCheckoutService } from "./services/legacy-stripe-checkout.service";
import { StripeConnectService } from "./services/stripe-connect.service";
import { SubscriptionService } from "./services/subscription.service";
import { WholesaleService } from "./services/wholesale.service";
import { WholesaleOrderService } from "./services/wholesale-order.service";
import { WholesaleInvitationEnhancedService } from "./services/wholesale-invitation-enhanced.service";
import { WholesalePaymentService } from "./services/wholesale-payment.service";
import { WholesaleShippingService } from "./services/wholesale-shipping.service";
import { TeamManagementService } from "./services/team-management.service";
import { OrderLifecycleService } from "./services/order-lifecycle.service";
import { PricingCalculationService } from "./services/pricing-calculation.service";
import { WholesalePricingService } from "./services/wholesale-pricing.service";
import { StripeWebhookService } from "./services/stripe-webhook.service";
import { MetaIntegrationService } from "./services/meta-integration.service";
import { BalancePaymentService } from "./services/balance-payment.service";
import { ConfigurationError } from "./errors";
import { PlatformAnalyticsService } from "./services/platform-analytics.service";
import { CheckoutService } from "./services/checkout.service";
import { CreateFlowService } from "./services/workflows/create-flow.service";
import type { WorkflowConfig } from "./services/workflows/types";
import { QuotationService } from "./services/quotation.service";
import { QuotationEmailService } from "./services/quotation-email.service";
import { QuotationPaymentService } from "./services/quotation-payment.service";
import { CartReservationService } from "./services/cart-reservation.service";
import { SKUService } from "./services/sku.service";
import { RefundService } from "./services/refund.service";
import crypto from "crypto";

// Import Newsletter Services (Architecture 3)
import { CampaignService } from "./services/newsletter/campaign.service";
import { SubscriberService } from "./services/newsletter/subscriber.service";
import { AnalyticsService } from "./services/newsletter/analytics.service";
import { TemplateService } from "./services/newsletter/template.service";
import { ComplianceService } from "./services/newsletter/compliance.service";
import { SegmentationService } from "./services/newsletter/segmentation.service";
import { emailProvider } from "./services/email-provider.service";
import { newsletterJobQueue } from "./services/newsletter/job-queue.service";

// Initialize notification service
const notificationService = createNotificationService(storage);

// Initialize Newsletter Architecture 3 Services
const campaignService = new CampaignService(storage, emailProvider, newsletterJobQueue);
const segmentationService = new SegmentationService(storage);
const templateService = new TemplateService(storage);
const analyticsService = new AnalyticsService(storage);

// Initialize authorization service for capability checks
const authorizationService = new AuthorizationService(storage);

// Initialize inventory service for stock management
const inventoryService = new InventoryService(storage);

// Initialize cart reservation service (Architecture 3)
const cartReservationService = new CartReservationService(storage, inventoryService);

// Initialize SKU service for product SKU generation
const skuService = new SKUService(storage);

// Reference: javascript_stripe integration
// Initialize Stripe with secret key when available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });
}

// Initialize cart validation, shipping, and tax services (Plan C architecture)
// Note: TaxService requires Stripe to be initialized first
const cartValidationService = new CartValidationService(storage);
const shippingService = new ShippingService(storage);
const taxService = new TaxService(storage, stripe || undefined);

// Initialize pricing calculation service (Architecture 3 migration)
const pricingCalculationService = new PricingCalculationService(
  storage,
  shippingService,
  taxService,
  stripe || undefined
);

// Initialize order service with all dependencies (BEFORE webhook handler for Architecture 3)
const orderService = new OrderService(
  storage,
  inventoryService,
  cartValidationService,
  shippingService,
  taxService,
  notificationService,
  stripe || undefined,
  pricingCalculationService // For balance payment calculations - LAST parameter to maintain backward compatibility
);

// Initialize payment provider, webhook handler, and payment service
let stripeProvider: StripePaymentProvider | null = null;
let webhookHandler: WebhookHandler | null = null;
let paymentService: PaymentService | null = null;
let stripeWebhookService: StripeWebhookService | null = null;

if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
  stripeProvider = new StripePaymentProvider(
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  webhookHandler = new WebhookHandler(
    storage,
    stripeProvider,
    inventoryService,
    notificationService,
    orderService
  );
  paymentService = new PaymentService(
    storage,
    stripeProvider,
    inventoryService
  );
}

// Initialize Stripe webhook service (requires stripe and webhookHandler)
if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
  stripeWebhookService = new StripeWebhookService(
    storage,
    stripe,
    notificationService,
    inventoryService,
    webhookHandler
  );
}

// Initialize Refund service for itemized refund processing
// RefundService only needs Stripe API access, not webhook handling
let refundService: RefundService | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  // Create a minimal stripe provider for refunds if full one isn't available
  const refundStripeProvider = stripeProvider || new StripePaymentProvider(
    process.env.STRIPE_SECRET_KEY,
    '' // Webhook secret not needed for refunds
  );
  refundService = new RefundService(storage, refundStripeProvider, notificationService);
}

// Initialize product service (Architecture 3 migration)
const productService = new ProductService(
  storage,
  notificationService,
  skuService,
  stripe || undefined
);

// Initialize bulk upload service for CSV imports
const bulkUploadService = new BulkUploadService(storage, productService);

// Initialize multi-row product preprocessor for WooCommerce/Shopify CSVs
const multiRowPreprocessor = new MultiRowProductPreprocessor(storage);

// Initialize AI field mapping service for intelligent CSV column mapping
const aiFieldMappingService = new AIFieldMappingService();

// Initialize legacy Stripe checkout service (Architecture 3 migration)
const legacyCheckoutService = new LegacyStripeCheckoutService(
  storage,
  stripe || null
);

// Initialize Stripe Connect service (Architecture 3 migration)
const stripeConnectService = new StripeConnectService(
  storage,
  stripe || null
);

// Initialize Subscription service (Architecture 3 migration)
const subscriptionService = new SubscriptionService(
  storage,
  stripe || null
);

// Initialize Wholesale service (Architecture 3 migration)
const wholesaleService = new WholesaleService(storage);

// Initialize Wholesale Order service for B2B order management
const wholesaleOrderService = new WholesaleOrderService(storage, notificationService);

// Initialize Wholesale Invitation Enhanced service for buyer invitations
const wholesaleInvitationService = new WholesaleInvitationEnhancedService(storage, notificationService);

// Initialize Wholesale Payment service for Stripe payment integration
const wholesalePaymentService = new WholesalePaymentService(
  storage,
  stripe || undefined,
  notificationService
);

// Initialize Wholesale Shipping service for freight collect and buyer pickup
const wholesaleShippingService = new WholesaleShippingService(storage);

// Initialize Wholesale Pricing service for B2B pricing calculations (Architecture 3)
const wholesalePricingService = new WholesalePricingService(storage);

// Initialize Team Management service (Architecture 3 migration)
const teamService = new TeamManagementService(storage);

// Initialize Order Lifecycle service for refund, status, and balance payment orchestration
const orderLifecycleService = new OrderLifecycleService(
  storage,
  notificationService,
  stripe || undefined
);

// Initialize Balance Payment service for wholesale deposit+balance payment flows (Architecture 3)
const balancePaymentService = new BalancePaymentService(
  storage,
  pricingCalculationService,
  shippingService,
  stripe || undefined
);

// Initialize Meta Integration service for Meta OAuth callback logic
const redirectUri = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/meta-auth/callback`;
const metaIntegrationService = new MetaIntegrationService(
  storage,
  process.env.META_APP_ID || "",
  process.env.META_APP_SECRET || "",
  redirectUri
);

// Initialize Platform Analytics service (Architecture 3)
const platformAnalyticsService = new PlatformAnalyticsService(storage);

// Initialize Trade Quotation services (Architecture 3)
const quotationService = new QuotationService();
const quotationEmailService = new QuotationEmailService(
  storage,
  notificationService,
  quotationService
);
const quotationPaymentService = new QuotationPaymentService(
  storage,
  quotationService,
  quotationEmailService,
  stripeConnectService,
  stripe || undefined
);

// Initialize additional Newsletter Services (Architecture 3)
const subscriberService = new SubscriberService(storage);
const complianceService = new ComplianceService(storage, analyticsService);

// Start the newsletter job queue
newsletterJobQueue.start();

// Register newsletter job processors (MUST be at module level, before registerRoutes)
newsletterJobQueue.registerProcessor('send_campaign', async (job, signal) => {
  const { campaignId, recipients, from, replyTo, subject, htmlContent, storeName } = job.data;
  
  logger.info(`[NewsletterProcessor] Processing send_campaign job for campaign ${campaignId} with ${recipients.length} recipients`);
  
  // Send emails to all recipients with personalized unsubscribe links
  for (const recipient of recipients) {
    if (signal.aborted) {
      throw new Error('Job aborted');
    }
    
    try {
      // Generate personalized unsubscribe URL for this recipient
      const unsubscribeUrl = complianceService.generateUnsubscribeUrl(campaignId, recipient.email);
      
      // Replace placeholders in HTML with personalized values
      const personalizedHtml = htmlContent
        .replace(/\{storeName\}/g, storeName || 'Store')
        .replace(/\{unsubscribeUrl\}/g, unsubscribeUrl);
      
      await emailProvider.sendEmail({
        to: recipient.email,
        from,
        replyTo,
        subject,
        html: personalizedHtml,
        tags: [{ name: 'campaignId', value: campaignId }],
      });
      logger.info(`[NewsletterProcessor] Email sent to ${recipient.email}`);
    } catch (error) {
      logger.error(`[NewsletterProcessor] Failed to send email to ${recipient.email}:`, error);
      // Continue with other recipients
    }
  }
  
  // Update campaign status to sent
  await storage.updateNewsletter(campaignId, {
    status: 'sent',
    sentAt: new Date(),
  });
  
  // Initialize analytics for this campaign
  await analyticsService.updateCampaignAnalytics(campaignId);
  
  logger.info(`[NewsletterProcessor] Campaign ${campaignId} sent successfully to ${recipients.length} recipients`);
});

newsletterJobQueue.registerProcessor('send_scheduled_campaign', async (job, signal) => {
  const { campaignId } = job.data;
  
  logger.info(`[NewsletterProcessor] Processing scheduled campaign ${campaignId}`);
  
  // Trigger the regular send process
  await campaignService.sendCampaign(campaignId);
});

// Initialize CreateFlowService workflow orchestrator (Architecture 3)
// Requires: storage, config, and all workflow step dependencies
let createFlowService: CreateFlowService | null = null;
let checkoutService: CheckoutService | null = null;

if (paymentService && stripeProvider) {
  const workflowConfig: WorkflowConfig = {
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 120000, // 2 minutes
  };

  createFlowService = new CreateFlowService(
    storage,
    workflowConfig,
    cartValidationService,
    shippingService,
    pricingCalculationService,
    inventoryService,
    paymentService,
    orderService,
    notificationService
  );

  // Initialize CheckoutService - thin adapter for CreateFlowService workflow
  checkoutService = new CheckoutService(
    storage,
    stripeProvider,
    createFlowService
  );
}

/**
 * API Key Middleware - Validates X-API-Key header using constant-time comparison
 */
const requireApiKey: any = (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.SHOPSWIFT_API_KEY;

  if (!expectedKey) {
    logger.error('[API Key Auth] SHOPSWIFT_API_KEY not configured');
    return res.status(500).json({ error: 'API key authentication not configured' });
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    const apiKeyBuffer = Buffer.from(apiKey as string);
    const expectedKeyBuffer = Buffer.from(expectedKey);

    if (apiKeyBuffer.length !== expectedKeyBuffer.length) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const isValid = crypto.timingSafeEqual(apiKeyBuffer, expectedKeyBuffer);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
  } catch (error) {
    logger.error('[API Key Auth] Comparison failed:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Email-based authentication routes
  app.use("/api/auth/email", emailAuthRoutes);

  // Magic link verification endpoint (JSON-based SPA flow)
  app.get('/api/auth/magic/verify', async (req: any, res: any) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required', success: false });
      }

      // Find auth token
      const authToken = await storage.getAuthTokenByToken(token);

      if (!authToken) {
        return res.status(401).json({ error: 'Invalid token', success: false });
      }

      // Check if already used (magic_link tokens are reusable, everything else is single-use)
      // Treat null/unknown tokenType as single-use for security (legacy tokens)
      if (authToken.tokenType !== 'magic_link' && authToken.used === 1) {
        return res.status(401).json({ error: 'Token already used', success: false });
      }

      // Check if expired
      if (new Date() > new Date(authToken.expiresAt)) {
        return res.status(401).json({ error: 'Token expired', success: false });
      }

      // Mark token as used (only magic_link tokens are reusable)
      if (authToken.tokenType !== 'magic_link') {
        await storage.markAuthTokenAsUsed(authToken.id);
      }

      // Get or create user
      const normalizedEmail = authToken.email.toLowerCase().trim();
      let user = await storage.getUserByEmail(normalizedEmail);
      
      if (!user) {
        // Create new user
        const sellerContext = authToken.sellerContext;
        const isMainDomain = !sellerContext;
        const role = isMainDomain ? 'admin' : 'buyer';
        
        user = await storage.upsertUser({
          email: normalizedEmail,
          role,
        });
        
        logger.auth('Created new user via magic link', {
          role,
          email: normalizedEmail,
          userId: user.id
        });
      }

      // Create session compatible with isAuthenticated middleware
      req.session.passport = {
        user: {
          id: user.id,
          access_token: 'email-auth',
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
          claims: {
            sub: user.id,
            email: user.email,
            aud: 'authenticated',
          },
        },
      };

      // CRITICAL: Save session before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.auth('User authenticated via magic link', {
        email: normalizedEmail,
        userId: user.id
      });

      // Determine redirect URL
      let redirectUrl = authToken.returnUrl || '/';
      
      // Sanitize returnUrl to prevent open redirect
      if (authToken.returnUrl && (!authToken.returnUrl.startsWith("/") || authToken.returnUrl.startsWith("//"))) {
        redirectUrl = '/';
      }
      
      if (!authToken.returnUrl) {
        // Default redirect based on role
        if (user.role === 'admin' || user.role === 'seller' || user.role === 'owner') {
          redirectUrl = '/seller-dashboard';
        } else if (user.role === 'buyer') {
          redirectUrl = '/buyer-dashboard';
        }
      }

      // Return JSON response
      res.json({
        success: true,
        redirectUrl,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('Magic link verify error', error, { module: 'auth' });
      res.status(500).json({ 
        error: 'Failed to verify magic link', 
        success: false 
      });
    }
  });

  // Document generation routes (invoices & packing slips)
  app.use("/api/documents", documentRoutes);

  // Wholesale refund routes
  app.use("/api/wholesale/orders", wholesaleRefundRoutes);

  // Wholesale document routes
  app.use("/api/wholesale/documents", wholesaleDocumentRoutes);

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
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.json(null);
      }
      
      // For collaborators, return the store owner's data (for settings page)
      // But keep the collaborator's own ID and capabilities
      const effectiveSellerId = currentUser.sellerId || userId;
      const displayUser = effectiveSellerId !== userId 
        ? await storage.getUser(effectiveSellerId)
        : currentUser;
      
      if (!displayUser) {
        return res.json(null);
      }
      
      // Debug: Log warehouse fields
      logger.info(`[Auth] User warehouse fields:`, {
        userId: displayUser.id,
        email: displayUser.email ?? undefined,
        warehouseStreet: displayUser.warehouseStreet ?? undefined,
        warehouseCity: displayUser.warehouseCity ?? undefined,
        warehouseCountry: displayUser.warehouseCountry ?? undefined,
      });
      
      // Get user capabilities from AuthorizationService (use actual user ID for capabilities)
      const capabilities = await authorizationService.getUserCapabilities(userId);
      
      // Return store owner's data with collaborator's capabilities and actual user ID
      res.json({
        ...displayUser,
        // Override with collaborator's actual ID so frontend knows who's logged in
        id: userId,
        capabilities: capabilities || {},
        // Add flag to indicate if this is a collaborator viewing store owner's data
        isCollaborator: effectiveSellerId !== userId,
        storeOwnerId: effectiveSellerId !== userId ? effectiveSellerId : undefined,
      });
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
      
      // For collaborators, use the store owner's ID; for store owners, use their own ID
      const effectiveSellerId = user.sellerId || userId;
      const storeOwner = await storage.getUser(effectiveSellerId);
      
      if (!storeOwner) {
        return res.status(404).json({ error: "Store owner not found" });
      }
      
      const hasStripeConnected = !!storeOwner.stripeConnectedAccountId;
      // Only return currency if Stripe is connected and has a currency set
      const currency = hasStripeConnected ? (storeOwner.listingCurrency || null) : null;
      
      res.json({
        hasStripeConnected,
        currency,
        stripeChargesEnabled: storeOwner.stripeChargesEnabled === 1,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment setup status" });
    }
  });

  // Seller-specific products (only products owned by this seller)
  app.get("/api/seller/products", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // For collaborators, use the store owner's ID; for store owners, use their own ID
      const effectiveSellerId = user.sellerId || userId;
      
      const allProducts = await storage.getAllProducts();
      const sellerProducts = allProducts.filter(p => p.sellerId === effectiveSellerId);
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
      
      // CRITICAL FIX: Explicitly ensure sellerId is included in response
      const productsWithSellerId = publicProducts.map(p => ({
        ...p,
        sellerId: p.sellerId, // Explicit field inclusion for cart validation
      }));
      
      res.json(productsWithSellerId);
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
      
      // CRITICAL FIX: Explicitly ensure sellerId is included in response (required for cart validation)
      const productsWithCurrency = sellerProducts.map(p => ({
        ...p,
        sellerId: p.sellerId, // Explicit field inclusion for cart validation
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
      
      // ARCHITECTURE 3: Get variant requirements from backend
      const variantRequirements = productVariantService.getVariantRequirements(product);
      
      res.json({
        ...product,
        currency, // Include seller's currency as single source of truth
        variantRequirements, // Include variant metadata for frontend
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const result = await productService.createProduct({
        productData: req.body,
        sellerId: userId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result.product);
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

      const results = await productService.bulkCreateProducts({
        products,
        sellerId: userId,
      });

      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to process bulk upload" });
    }
  });

  // Check stock availability for product or variant
  // ARCHITECTURE 3: Thin route handler - validates, calls service, returns
  app.get("/api/products/:productId/stock-availability", async (req, res) => {
    try {
      const { productId } = req.params;
      const { variantId } = req.query;

      // Validate: Check product exists (route responsibility)
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Validate: Check variant exists if variantId provided (route responsibility)
      if (variantId && product.variants && Array.isArray(product.variants)) {
        const variants = product.variants as any[];
        const variantIdStr = String(variantId).toLowerCase();
        const hasColors = product.hasColors === 1;
        
        let variantFound = false;
        
        if (hasColors) {
          // ColorVariant structure: [{colorName, colorHex, images, sizes: [{size, stock, sku}]}]
          const [size, color] = variantIdStr.split('-');
          
          if (size && color) {
            const colorVariant = variants.find((cv: any) => 
              cv.colorName?.toLowerCase() === color.toLowerCase()
            );
            
            if (colorVariant?.sizes) {
              variantFound = colorVariant.sizes.some((s: any) => 
                s.size?.toLowerCase() === size.toLowerCase()
              );
            }
          }
        } else {
          // SizeVariant structure: [{size, stock, sku}]
          variantFound = variants.some((v: any) => 
            v.size?.toLowerCase() === variantIdStr.toLowerCase()
          );
        }

        if (!variantFound) {
          return res.status(404).json({ error: "Variant not found" });
        }
      }

      // Delegate to service layer for business logic
      const availability = await inventoryService.checkAvailability(
        productId,
        1, // Check for at least 1 unit
        variantId ? String(variantId) : undefined
      );

      res.json({
        productId: availability.productId,
        variantId: availability.variantId,
        totalStock: availability.currentStock,
        reservedStock: availability.reservedStock,
        availableStock: availability.availableStock,
        isAvailable: availability.available,
        isVariant: !!variantId,
      });
    } catch (error) {
      logger.error("Error checking stock availability", error);
      res.status(500).json({ error: "Failed to check stock availability" });
    }
  });

  // Stock Reservations Routes
  app.get("/api/reservations", async (req, res) => {
    try {
      const { sessionId, productId } = req.query;
      
      if (sessionId && typeof sessionId === 'string') {
        const reservations = await storage.getStockReservationsBySession(sessionId);
        return res.json(reservations);
      }
      
      if (productId && typeof productId === 'string') {
        const reservations = await storage.getStockReservationsByProduct(productId);
        return res.json(reservations);
      }
      
      return res.status(400).json({ error: "sessionId or productId query parameter required" });
    } catch (error) {
      logger.error("Error fetching reservations", error);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  app.get("/api/reservations/:id", async (req, res) => {
    try {
      const reservation = await storage.getStockReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservation" });
    }
  });

  app.post("/api/reservations", async (req, res) => {
    try {
      const { productId, quantity, sessionId, variantId, userId } = req.body;
      
      if (!productId || !quantity || !sessionId) {
        return res.status(400).json({ error: "productId, quantity, and sessionId are required" });
      }
      
      const result = await inventoryService.reserveStock(productId, quantity, sessionId, {
        variantId,
        userId,
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error || "Failed to reserve stock",
          availability: result.availability,
        });
      }
      
      res.status(201).json(result.reservation);
    } catch (error) {
      logger.error("Error creating reservation", error);
      res.status(500).json({ error: "Failed to create reservation" });
    }
  });

  app.post("/api/orders", async (req: any, res) => {
    try {
      // Extract request data (frontend sends payment info after successful payment)
      const { 
        customerEmail, 
        customerName, 
        customerAddress, 
        items, 
        destination, 
        stripePaymentIntentId,
        amountPaid,
        paymentStatus,
        taxAmount,
        taxCalculationId,
        taxBreakdown,
        subtotalBeforeTax
      } = req.body;
      
      // Basic validation (business logic validation happens in OrderService)
      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email is required for all orders" });
      }

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Cart items are required" });
      }

      if (!destination || !destination.country) {
        return res.status(400).json({ error: "Shipping destination is required" });
      }

      // ARCHITECTURE 3: Validate variants for all items before order creation
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ 
            error: `Product not found: ${item.productId}` 
          });
        }

        // Parse variant from item
        let variantSelection: { size?: string; color?: string } | undefined;
        if (item.variant) {
          variantSelection = item.variant;
        } else if (item.variantId) {
          // Parse variantId (format: "size-color" or "size")
          const parts = item.variantId.split('-');
          if (parts.length >= 2) {
            variantSelection = { size: parts[0], color: parts[1] };
          } else if (parts.length === 1) {
            variantSelection = { size: parts[0] };
          }
        }

        // Validate variant selection
        const validation = productVariantService.validateVariantSelection(product, variantSelection);
        
        if (!validation.valid) {
          logger.warn('[Order] Variant validation failed', {
            productId: item.productId,
            productName: product.name,
            variantSelection,
            error: validation.error,
          });
          return res.status(400).json({ 
            error: `${product.name}: ${validation.error}` 
          });
        }
      }

      // Delegate to OrderService (service handles all orchestration)
      const result = await orderService.createOrder({
        customerEmail,
        customerName,
        customerAddress,
        items,
        destination,
        paymentIntentId: stripePaymentIntentId,
        amountPaid,
        paymentStatus,
        taxAmount,
        taxCalculationId,
        taxBreakdown,
        subtotalBeforeTax
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          details: result.details,
        });
      }

      res.status(201).json(result.order);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        return res.status(400).json({ error: error.message });
      }
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
      
      // DEBUG: Log filtering details
      logger.info(`[Seller Orders] Filtering for seller: ${canonicalOwnerId}`);
      logger.info(`[Seller Orders] Seller has ${sellerProductIds.size} products`);
      logger.info(`[Seller Orders] Total orders in DB: ${allOrders.length}`);
      
      // Filter orders that contain products from this seller's store
      const sellerOrders = allOrders.filter(order => {
        try {
          // Note: order.items is already parsed by Drizzle (jsonb column), no need for JSON.parse
          const items = Array.isArray(order.items) ? order.items : [];
          const hasSellerProduct = items.some((item: any) => sellerProductIds.has(item.productId));
          if (hasSellerProduct) {
            logger.info(`[Seller Orders] Order ${order.id} belongs to seller`);
          }
          return hasSellerProduct;
        } catch (e) {
          logger.error(`[Seller Orders] Failed to parse items for order ${order.id}:`, e);
          return false;
        }
      });
      
      logger.info(`[Seller Orders] Returning ${sellerOrders.length} orders`);
      
      // Inject deliveryDate into order items
      const ordersWithDeliveryDates = sellerOrders.map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        })) : order.items
      }));
      
      res.json(ordersWithDeliveryDates);
    } catch (error) {
      logger.error("Error fetching seller orders", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get detailed order information for seller (includes items, events, balance payments, refunds)
  app.get("/api/seller/orders/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orderId = req.params.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get canonical owner ID (handles team members)
      const isTeamMember = ["admin", "editor", "viewer"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalOwnerId = isTeamMember ? currentUser.sellerId : currentUser.id;

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify seller/team owns products in this order
      let orderItems = await storage.getOrderItems(orderId);
      
      // Fallback to legacy items jsonb column if order_items table is empty
      if (orderItems.length === 0 && order.items && Array.isArray(order.items)) {
        // Convert legacy items format to order_items format for response
        orderItems = order.items.map((item: any) => ({
          id: `legacy-${item.productId}`,
          orderId: order.id,
          productId: item.productId,
          productName: item.name || 'Unknown Product',
          productImage: item.image || null,
          productType: 'physical' as const,
          quantity: item.quantity,
          price: item.price,
          originalPrice: item.price,
          discountPercentage: null,
          discountAmount: null,
          subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
          depositAmount: null,
          balanceAmount: null,
          requiresDeposit: 0,
          variant: item.variant || null,
          itemStatus: 'pending' as const,
          trackingNumber: null,
          trackingCarrier: null,
          trackingUrl: null,
          trackingLink: null,
          shippedAt: null,
          deliveredAt: null,
          refundedQuantity: 0,
          refundedAmount: "0",
          returnedAt: null,
          refundedAt: null,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.createdAt),
        }));
      }

      if (orderItems.length === 0) {
        return res.status(404).json({ error: "Order has no items" });
      }

      const firstProduct = await storage.getProduct(orderItems[0].productId);
      if (!firstProduct || firstProduct.sellerId !== canonicalOwnerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Gather all related data
      const events = await storage.getOrderEvents(orderId);
      const balancePayments = await storage.getBalancePaymentsByOrderId(orderId);
      const refunds = await storage.getRefundsByOrderId(orderId);

      // Inject deliveryDate into order items
      const itemsWithDeliveryDates = orderItems.map((item: any) => ({
        ...item,
        deliveryDate: computeDeliveryDate(item, order.createdAt)
      }));

      res.json({
        order,
        items: itemsWithDeliveryDates,
        events,
        balancePayments,
        refunds,
      });
    } catch (error) {
      logger.error("Error fetching detailed order", error);
      res.status(500).json({ error: "Failed to fetch order details" });
    }
  });

  // Update delivery date for an order item
  app.put("/api/seller/orders/:orderId/items/:itemId/delivery-date", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId, itemId } = req.params;
      const { deliveryDate, notify } = req.body;

      if (!deliveryDate) {
        return res.status(400).json({ error: "deliveryDate is required" });
      }

      // Validate date format
      const newDate = new Date(deliveryDate);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ error: "Invalid delivery date format" });
      }

      // Validate date is in the future
      const now = new Date();
      if (newDate <= now) {
        return res.status(400).json({ error: "Delivery date must be in the future" });
      }

      // Get order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get order item
      const orderItem = await storage.getOrderItemById(itemId);
      if (!orderItem) {
        return res.status(404).json({ error: "Order item not found" });
      }
      
      if (orderItem.orderId !== orderId) {
        return res.status(404).json({ error: "Order item not found in this order" });
      }

      // Get product for authorization check
      const product = await storage.getProduct(orderItem.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // CRITICAL: Verify seller owns this product BEFORE any updates
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const isTeamMember = ["admin", "editor"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalOwnerId = isTeamMember ? currentUser.sellerId : userId;

      if (product.sellerId !== canonicalOwnerId) {
        return res.status(403).json({ error: "You do not have permission to update this product's delivery date" });
      }

      // Validate product type supports delivery date updates
      if (orderItem.productType !== "pre-order" && orderItem.productType !== "made-to-order") {
        return res.status(400).json({ error: "Can only update delivery dates for pre-order and made-to-order items" });
      }

      // Product type-specific validation and update
      if (orderItem.productType === "pre-order") {
        // For pre-order, the date should be reasonable for a pre-order (in the future)
        // Already validated above that newDate > now
        await storage.updateOrderItemDeliveryDate(itemId, newDate, null);
      } else if (orderItem.productType === "made-to-order") {
        // For made-to-order, calculate lead time and ensure it's positive
        const orderDate = new Date(order.createdAt);
        const leadTimeDays = Math.ceil((newDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (leadTimeDays <= 0) {
          return res.status(400).json({ error: "Delivery date must be after the order date for made-to-order items" });
        }
        
        await storage.updateOrderItemDeliveryDate(itemId, null, leadTimeDays);
      }

      // Send notification email ONLY if notify === true (not undefined or other truthy values)
      if (notify === true) {
        await notificationService.sendDeliveryDateChangeEmail(order, orderItem, newDate);
      }

      res.json({ 
        success: true, 
        message: notify === true ? "Delivery date updated and buyer notified" : "Delivery date updated"
      });
    } catch (error) {
      logger.error("Error updating delivery date", error);
      res.status(500).json({ error: "Failed to update delivery date" });
    }
  });

  // Update customer details for an order
  app.put("/api/seller/orders/:orderId/customer-details", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;
      
      // Parse and validate request body
      const parseResult = updateCustomerDetailsSchema.safeParse(req.body);
      if (!parseResult.success) {
        const error = fromZodError(parseResult.error);
        return res.status(400).json({ error: error.message });
      }
      
      const { notify, ...details } = parseResult.data;
      
      // Get order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Get at least one order item to verify seller ownership
      const orderItems = await storage.getOrderItems(orderId);
      if (!orderItems || orderItems.length === 0) {
        return res.status(404).json({ error: "Order items not found" });
      }
      
      // Get product for authorization check (use first item)
      const product = await storage.getProduct(orderItems[0].productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // CRITICAL: Verify seller owns this product BEFORE any updates
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const isTeamMember = ["admin", "editor"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalOwnerId = isTeamMember ? currentUser.sellerId : userId;
      
      if (product.sellerId !== canonicalOwnerId) {
        return res.status(403).json({ error: "You do not have permission to update this order's customer details" });
      }
      
      // Calculate diff of what changed for email
      const previousDetails = {
        customerName: order.customerName,
        shippingStreet: order.shippingStreet,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingPostalCode: order.shippingPostalCode,
        shippingCountry: order.shippingCountry,
        billingStreet: order.billingStreet,
        billingCity: order.billingCity,
        billingState: order.billingState,
        billingPostalCode: order.billingPostalCode,
        billingCountry: order.billingCountry,
      };
      
      // Update order in database
      const updatedOrder = await storage.updateOrderCustomerDetails(orderId, details);
      if (!updatedOrder) {
        return res.status(500).json({ error: "Failed to update customer details" });
      }
      
      // Send notification email ONLY if notify === true
      if (notify === true) {
        const seller = await storage.getUser(canonicalOwnerId);
        if (seller) {
          await notificationService.sendOrderCustomerDetailsUpdated(updatedOrder, seller, previousDetails, details);
        }
      }
      
      res.json({ 
        success: true, 
        message: notify === true ? "Customer details updated and buyer notified" : "Customer details updated"
      });
    } catch (error) {
      logger.error("Error updating customer details", error);
      res.status(500).json({ error: "Failed to update customer details" });
    }
  });

  // Create refund for an order (seller only)
  app.post("/api/seller/orders/:orderId/refunds", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!refundService) {
        return res.status(503).json({ error: "Refund service not available. Please configure Stripe." });
      }

      const userId = req.user.claims.sub;
      const { orderId } = req.params;
      
      // ARCHITECTURE 3: Validate request body - Frontend sends ONLY IDs and booleans
      const refundRequestSchema = z.object({
        reason: z.string().optional(),
        items: z.array(z.object({
          orderItemId: z.string(),
          quantity: z.number().positive(),
        })).optional(),
        refundShipping: z.boolean().optional(),
        refundTax: z.boolean().optional(),
        manualOverride: z.object({
          totalAmount: z.string(),
          reason: z.string(),
        }).optional(),
      });

      const parseResult = refundRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const error = fromZodError(parseResult.error);
        return res.status(400).json({ error: error.message });
      }

      const refundData = parseResult.data;

      // Get current user and canonical seller ID
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const isTeamMember = ["admin", "editor"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalSellerId = isTeamMember ? currentUser.sellerId : userId;

      // CRITICAL: Verify order ownership BEFORE processing refund
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify seller owns the order by checking product ownership
      const orderItems = await storage.getOrderItems(orderId);
      if (!orderItems || orderItems.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const product = await storage.getProduct(orderItems[0].productId);
      if (!product || product.sellerId !== canonicalSellerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Create refund via service (ARCHITECTURE 3: Pass only IDs and booleans)
      const result = await refundService.createRefund({
        orderId,
        sellerId: canonicalSellerId!,
        reason: refundData.reason,
        items: refundData.items,
        refundShipping: refundData.refundShipping,
        refundTax: refundData.refundTax,
        manualOverride: refundData.manualOverride,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to process refund" });
      }

      res.json({
        success: true,
        refundId: result.refundId,
        totalAmount: result.totalAmount,
        stripeRefundId: result.stripeRefundId,
      });
    } catch (error) {
      logger.error("Error creating refund:", error);
      res.status(500).json({ error: "Failed to create refund" });
    }
  });

  // Get refund history for an order (seller only)
  app.get("/api/seller/orders/:orderId/refunds", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!refundService) {
        return res.status(503).json({ error: "Refund service not available" });
      }

      const userId = req.user.claims.sub;
      const { orderId } = req.params;

      // Get order to verify seller ownership
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get current user and canonical seller ID
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const isTeamMember = ["admin", "editor", "viewer"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalSellerId = isTeamMember ? currentUser.sellerId : userId;

      // Verify seller ownership via order items
      const orderItems = await storage.getOrderItems(orderId);
      if (!orderItems || orderItems.length === 0) {
        return res.status(404).json({ error: "Order items not found" });
      }

      const product = await storage.getProduct(orderItems[0].productId);
      if (!product || product.sellerId !== canonicalSellerId) {
        return res.status(403).json({ error: "You do not have permission to view refunds for this order" });
      }

      const refundHistory = await refundService.getRefundHistory(orderId);
      res.json(refundHistory);
    } catch (error) {
      logger.error("Error fetching refund history:", error);
      res.status(500).json({ error: "Failed to fetch refund history" });
    }
  });

  // Get refundable amounts for an order (seller only)
  app.get("/api/seller/orders/:orderId/refundable", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!refundService) {
        return res.status(503).json({ error: "Refund service not available" });
      }

      const userId = req.user.claims.sub;
      const { orderId } = req.params;

      // Get order to verify seller ownership
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get current user and canonical seller ID
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const isTeamMember = ["admin", "editor", "viewer"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalSellerId = isTeamMember ? currentUser.sellerId : userId;

      // Verify seller ownership via order items
      const orderItems = await storage.getOrderItems(orderId);
      if (!orderItems || orderItems.length === 0) {
        return res.status(404).json({ error: "Order items not found" });
      }

      const product = await storage.getProduct(orderItems[0].productId);
      if (!product || product.sellerId !== canonicalSellerId) {
        return res.status(403).json({ error: "You do not have permission to view refundable amounts for this order" });
      }

      const refundableData = await refundService.getRefundableAmount(orderId);
      res.json(refundableData);
    } catch (error) {
      logger.error("Error fetching refundable amounts:", error);
      res.status(500).json({ error: "Failed to fetch refundable amounts" });
    }
  });

  // Get order events (email and status history)
  app.get("/api/orders/:id/events", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const orderId = req.params.id;

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get canonical owner ID (handles team members)
      const isTeamMember = ["admin", "editor", "viewer"].includes(user.role) && user.sellerId;
      const canonicalOwnerId = isTeamMember ? user.sellerId : user.id;

      // Check authorization: buyer, seller/team, or admin
      const isBuyer = order.userId === userId;
      const isAdmin = user.role === 'owner' || user.role === 'admin';
      
      if (!isBuyer && !isAdmin) {
        // Check if seller or team member
        const orderItems = await storage.getOrderItems(orderId);
        const isSeller = orderItems.length > 0 && 
          await storage.getProduct(orderItems[0].productId)
            .then(p => p?.sellerId === canonicalOwnerId)
            .catch(() => false);
        
        if (!isSeller) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const events = await storage.getOrderEvents(orderId);
      res.json(events);
    } catch (error) {
      logger.error("Error fetching order events", error);
      res.status(500).json({ error: "Failed to fetch order events" });
    }
  });

  // Resend balance payment request email
  app.post("/api/orders/:id/balance/resend", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orderId = req.params.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get canonical owner ID (handles team members)
      const isTeamMember = ["admin", "editor", "viewer"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalOwnerId = isTeamMember ? currentUser.sellerId : currentUser.id;

      if (!canonicalOwnerId) {
        return res.status(400).json({ error: "Owner ID not found" });
      }

      const result = await orderLifecycleService.resendBalancePaymentRequest(orderId, canonicalOwnerId);

      if (!result.success) {
        return res.status(result.statusCode || 500).json({ error: result.error });
      }

      res.json({ 
        message: "Balance payment request resent successfully",
        balancePaymentId: result.balancePaymentId,
      });
    } catch (error) {
      logger.error("Error resending balance payment request", error);
      res.status(500).json({ error: "Failed to resend balance payment request" });
    }
  });

  // Refund routes for sellers
  // Process a refund (full, partial, or item-level)
  app.post("/api/orders/:orderId/refunds", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const { refundItems, reason, refundType, customRefundAmount } = req.body;
      const userId = req.user.claims.sub;

      // CRITICAL: Verify order ownership BEFORE processing refund
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const isTeamMember = ["admin", "editor"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalSellerId = isTeamMember ? currentUser.sellerId : userId;

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify seller owns the order
      const orderItems = await storage.getOrderItems(orderId);
      if (!orderItems || orderItems.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const product = await storage.getProduct(orderItems[0].productId);
      if (!product || product.sellerId !== canonicalSellerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await orderLifecycleService.processRefund({
        orderId,
        sellerId: canonicalSellerId,
        refundType,
        refundItems,
        reason,
        customRefundAmount,
      });

      if (!result.success) {
        return res.status(result.statusCode || 500).json({ error: result.error });
      }

      res.json({
        success: true,
        refunds: result.refunds,
        stripeRefundId: result.stripeRefundId,
        refundAmount: result.refundAmount,
        status: result.status,
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

      const result = await orderLifecycleService.markItemsReturned(orderId, itemId, userId);

      if (!result.success) {
        return res.status(result.statusCode || 500).json({ error: result.error });
      }

      res.json(result.item);
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

      const result = await orderLifecycleService.getRefundHistory(orderId, userId);

      if (!result.success) {
        return res.status(result.statusCode || 500).json({ error: result.error });
      }

      res.json(result.refunds);
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
      
      // Inject deliveryDate into order items
      const ordersWithDeliveryDates = orders.map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        })) : order.items
      }));
      
      res.json(ordersWithDeliveryDates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/my", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getOrdersByUserId(userId);
      
      // Inject deliveryDate into order items
      const ordersWithDeliveryDates = orders.map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        })) : order.items
      }));
      
      res.json(ordersWithDeliveryDates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user orders" });
    }
  });

  // Buyer orders endpoint - must be before /:id route
  app.get("/api/orders/my-orders", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getOrdersByUserId(userId);
      
      // Inject deliveryDate into order items
      const ordersWithDeliveryDates = orders.map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        })) : order.items
      }));
      
      res.json(ordersWithDeliveryDates);
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
      
      // Inject deliveryDate into order items
      const ordersWithDeliveryDates = orders.map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        })) : order.items
      }));
      
      res.json(ordersWithDeliveryDates);
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
      
      // Inject deliveryDate into order items
      const orderWithDeliveryDates = {
        ...order,
        items: Array.isArray(order.items) ? order.items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        })) : order.items
      };
      
      res.json(orderWithDeliveryDates);
    } catch (error) {
      logger.error("Order lookup error", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.get("/api/orders/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const orderId = req.params.id;
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Check authorization: user must be owner/admin, the buyer, or seller of products in the order
      const isBuyer = order.userId === userId;
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      
      if (!isBuyer && !isAdmin) {
        // Check if user is the seller of any products in this order
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
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
      
      // Inject deliveryDate into order items
      const orderWithDeliveryDates = {
        ...order,
        items: Array.isArray(order.items) ? order.items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        })) : order.items
      };
      
      // Return just the order object for backward compatibility
      res.json(orderWithDeliveryDates);
    } catch (error) {
      logger.error("Error fetching order", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // New detailed order endpoint for buyer order details page
  app.get("/api/orders/:id/details", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const orderId = req.params.id;
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Check authorization: user must be owner/admin, the buyer, or seller of products in the order
      const isBuyer = order.userId === userId;
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      
      if (!isBuyer && !isAdmin) {
        // Check if user is the seller of any products in this order
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
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
      
      // Get order items from order_items table
      let orderItems = await storage.getOrderItems(orderId);
      
      // Fallback to legacy items jsonb column if order_items table is empty
      if (orderItems.length === 0 && order.items) {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          
          // Validate items is an array before processing
          if (Array.isArray(items) && items.length > 0) {
            // Fetch product details to get images for legacy items
            const productIds = items.map((item: any) => item.productId).filter(Boolean);
            const allProducts = await storage.getAllProducts();
            const productMap = new Map(
              allProducts
                .filter(p => productIds.includes(p.id))
                .map(p => [p.id, p])
            );
            
            // Convert legacy items format to order_items format for response
            orderItems = items.map((item: any) => {
              const product = productMap.get(item.productId);
              const productImage = product?.images?.[0] || null;
              
              return {
                id: `legacy-${item.productId}`,
                orderId: order.id,
                productId: item.productId,
                productName: item.name || product?.name || 'Unknown Product',
                productImage: productImage,
                productType: (item.productType || 'physical') as const,
                quantity: item.quantity,
                price: item.price,
                originalPrice: item.originalPrice || item.price,
                discountPercentage: item.discountPercentage || null,
                discountAmount: item.discountAmount || null,
                subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
                depositAmount: null,
                balanceAmount: null,
                requiresDeposit: 0,
                variant: item.variant || null,
                itemStatus: 'pending' as const,
                trackingNumber: null,
                trackingCarrier: null,
                trackingUrl: null,
                trackingLink: null,
                shippedAt: null,
                deliveredAt: null,
                refundedQuantity: 0,
                refundedAmount: "0",
                returnedAt: null,
                refundedAt: null,
                createdAt: new Date(order.createdAt),
                updatedAt: new Date(order.createdAt),
              };
            });
          }
        } catch (error) {
          logger.error("Error processing legacy order items", error);
          // If legacy items fail to parse, orderItems remains empty array
        }
      }
      
      // Gather all related data
      const events = await storage.getOrderEvents(orderId);
      const balancePayments = await storage.getBalancePaymentsByOrderId(orderId);
      const refunds = await storage.getRefundsByOrderId(orderId);
      
      // Inject deliveryDate into order items
      const itemsWithDeliveryDates = orderItems.map((item: any) => ({
        ...item,
        deliveryDate: computeDeliveryDate(item, order.createdAt)
      }));
      
      res.json({
        order,
        items: itemsWithDeliveryDates,
        events,
        balancePayments,
        refunds,
      });
    } catch (error) {
      logger.error("Error fetching order details", error);
      res.status(500).json({ error: "Failed to fetch order details" });
    }
  });

  app.put("/api/products/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const result = await productService.updateProduct({
        productId: req.params.id,
        sellerId: userId,
        updates: req.body,
      });

      if (!result.success) {
        const statusCode = result.error === 'Unauthorized' ? 403 : result.error === 'Product not found' ? 404 : 400;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json(result.product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Update product status (quick action)
  app.patch("/api/products/:id/status", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const { status } = req.body;
      const userId = req.user.claims.sub;
      const validStatuses = ['draft', 'active', 'coming-soon', 'paused', 'out-of-stock', 'archived'];
      
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: " + validStatuses.join(', ') });
      }

      const result = await productService.updateProductStatus(req.params.id, userId, status);

      if (!result.success) {
        const statusCode = result.error === 'Unauthorized' ? 403 : result.error === 'Product not found' ? 404 : 400;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json(result.product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product status" });
    }
  });

  app.delete("/api/products/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const result = await productService.deleteProduct(req.params.id, userId);

      if (!result.success) {
        const statusCode = result.error === 'Unauthorized' ? 403 : result.error === 'Product not found' ? 404 : 400;
        return res.status(statusCode).json({ error: result.error });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // ===== BULK PRODUCT UPLOAD ROUTES =====
  
  // Download CSV template
  app.get("/api/bulk-upload/template", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const csv = generateCSVTemplate();
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="upfirst-product-template.csv"');
      res.send(csv);
    } catch (error) {
      logger.error("Error generating CSV template", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Download instructions
  app.get("/api/bulk-upload/instructions", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const instructions = generateInstructionsText();
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="bulk-upload-instructions.txt"');
      res.send(instructions);
    } catch (error) {
      logger.error("Error generating instructions", error);
      res.status(500).json({ error: "Failed to generate instructions" });
    }
  });

  // Upload CSV file and create job
  app.post("/api/bulk-upload/upload", requireAuth, requireUserType('seller'), async (req: any, res) => {
    let jobId: string | null = null;
    
    try {
      const userId = req.user.claims.sub;
      
      if (!req.files || !req.files.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const uploadedFile: any = req.files.file;
      const fileContent = uploadedFile.data.toString('utf-8');
      
      // Parse CSV
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseResult.errors.length > 0) {
        return res.status(400).json({ 
          error: "CSV parsing error",
          details: parseResult.errors 
        });
      }

      const rows = parseResult.data;
      
      if (rows.length === 0) {
        return res.status(400).json({ error: "CSV file is empty" });
      }

      // Parse mappings - handle both JSON string and object
      let mappings = {};
      if (req.body.mappings) {
        try {
          mappings = typeof req.body.mappings === 'string' 
            ? JSON.parse(req.body.mappings) 
            : req.body.mappings;
        } catch (err) {
          logger.error("Error parsing mappings", err);
          // Continue with empty mappings rather than failing
        }
      }

      // Create bulk upload job
      const job = await storage.createBulkUploadJob({
        sellerId: userId,
        fileName: uploadedFile.name,
        status: 'pending' as any,
        totalRows: rows.length,
        mappings: mappings,
      });
      
      jobId = job.id;

      // Create bulk upload items
      const items = rows.map((row: any, index: number) => ({
        jobId: job.id,
        rowNumber: index + 1,
        rowData: row,
        validationStatus: 'pending' as any,
      }));

      await storage.createBulkUploadItems(items);

      // Extract headers from CSV for AI field mapping
      const headers = parseResult.meta?.fields || [];

      res.json({ 
        job,
        totalRows: rows.length,
        headers, // Include headers for AI mapping
        message: `Uploaded ${rows.length} rows successfully`
      });
    } catch (error) {
      logger.error("Error uploading CSV", error);
      
      // Cleanup on failure - delete job and items if created
      if (jobId) {
        try {
          await storage.deleteBulkUploadItemsByJob(jobId);
          await storage.updateBulkUploadJob(jobId, { 
            status: 'failed' as any, 
            errorMessage: error instanceof Error ? error.message : 'Upload failed'
          });
        } catch (cleanupError) {
          logger.error("Error cleaning up failed upload", cleanupError);
        }
      }
      
      res.status(500).json({ error: "Failed to upload CSV" });
    }
  });

  // Preprocess CSV for multi-row formats (WooCommerce, Shopify)
  app.post("/api/bulk-upload/preprocess/:jobId", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;

      // Verify job belongs to user
      const job = await storage.getBulkUploadJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get all job items
      const items = await storage.getBulkUploadItemsByJob(jobId);
      
      // Reconstruct CSV from items
      const rows = items.map(item => item.rowData);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      
      // Convert back to CSV string for preprocessing
      const csvData = Papa.unparse({
        fields: headers,
        data: rows,
      });

      // Preprocess the CSV
      const result = await multiRowPreprocessor.preprocess(csvData);

      // Update job with preprocessing results
      await storage.updateBulkUploadJob(jobId, {
        status: 'preprocessed' as any,
        totalRows: result.productCount, // Update with flattened product count
        metadata: {
          preprocessing: {
            format: result.format,
            originalRowCount: result.originalRowCount,
            productCount: result.productCount,
            warnings: result.warnings,
            diagnostics: result.diagnostics,
          }
        } as any,
      });

      // Replace job items with flattened rows
      if (result.format !== 'generic') {
        // Delete old items
        await storage.deleteBulkUploadItemsByJob(jobId);

        // Create new items from flattened rows
        const newItems = result.flattenedRows.map((row: any, index: number) => ({
          jobId,
          rowNumber: index + 1,
          rowData: row,
          validationStatus: 'pending' as any,
        }));

        console.log('[Preprocess] About to save items. Count:', newItems.length);
        console.log('[Preprocess] First item to save - keys:', Object.keys(newItems[0].rowData));
        console.log('[Preprocess] First item has variants?', newItems[0].rowData.variants !== undefined);
        console.log('[Preprocess] First item variants (first 200 chars):', JSON.stringify(newItems[0].rowData.variants || '').substring(0, 200));

        const savedItems = await storage.createBulkUploadItems(newItems);
        
        console.log('[Preprocess] Items saved. Retrieving them back...');
        const retrievedItems = await storage.getBulkUploadItemsByJob(jobId);
        console.log('[Preprocess] Retrieved items count:', retrievedItems.length);
        console.log('[Preprocess] First retrieved item - keys:', Object.keys(retrievedItems[0].rowData || {}));
        console.log('[Preprocess] First retrieved item has variants?', retrievedItems[0]?.rowData?.variants !== undefined);
      }

      // Extract new headers for AI mapping
      const newHeaders = result.flattenedRows.length > 0 
        ? Object.keys(result.flattenedRows[0]) 
        : headers;

      res.json({
        format: result.format,
        originalRowCount: result.originalRowCount,
        productCount: result.productCount,
        warnings: result.warnings,
        diagnostics: result.diagnostics,
        headers: newHeaders,
        message: result.format === 'generic' 
          ? 'CSV format is already single-row, no preprocessing needed'
          : `Preprocessed ${result.format} format: ${result.originalRowCount} rows → ${result.productCount} products`,
      });
    } catch (error) {
      logger.error("Error preprocessing CSV", error);
      res.status(500).json({ error: "Failed to preprocess CSV" });
    }
  });

  // Validate bulk upload job
  app.post("/api/bulk-upload/validate/:jobId", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;

      // Verify job belongs to user
      const job = await storage.getBulkUploadJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Update job status to validating
      await storage.updateBulkUploadJob(jobId, {
        status: 'validating' as any,
      });

      // Validate all rows
      const result = await bulkUploadService.validateBulkUpload(jobId, userId);

      res.json({
        message: "Validation complete",
        ...result,
      });
    } catch (error) {
      logger.error("Error validating bulk upload", error);
      res.status(500).json({ error: "Failed to validate upload" });
    }
  });

  // Import products from validated job
  app.post("/api/bulk-upload/import/:jobId", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;

      // Verify job belongs to user
      const job = await storage.getBulkUploadJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Check job is validated
      if (job.status !== 'validated') {
        return res.status(400).json({ error: "Job must be validated before import" });
      }

      // Import products
      const result = await bulkUploadService.importProducts(jobId, userId);

      res.json({
        message: "Import complete",
        ...result,
      });
    } catch (error) {
      logger.error("Error importing products", error);
      res.status(500).json({ error: "Failed to import products" });
    }
  });

  // Rollback bulk import
  app.post("/api/bulk-upload/rollback/:jobId", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;

      // Verify job belongs to user
      const job = await storage.getBulkUploadJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Rollback import
      const result = await bulkUploadService.rollbackBulkUpload(jobId);

      res.json({
        message: `Rolled back ${result.deletedCount} products`,
        ...result,
      });
    } catch (error) {
      logger.error("Error rolling back import", error);
      res.status(500).json({ error: "Failed to rollback import" });
    }
  });

  // Get all bulk upload jobs for seller
  app.get("/api/bulk-upload/jobs", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getBulkUploadJobsBySeller(userId);
      res.json(jobs);
    } catch (error) {
      logger.error("Error fetching bulk upload jobs", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Get specific job details with items
  app.get("/api/bulk-upload/job/:jobId", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;

      const job = await storage.getBulkUploadJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const items = await storage.getBulkUploadItemsByJob(jobId);

      res.json({
        ...job,
        items,
      });
    } catch (error) {
      logger.error("Error fetching job details", error);
      res.status(500).json({ error: "Failed to fetch job details" });
    }
  });

  // Get items for a specific job (for validation results table)
  app.get("/api/bulk-upload/job/:jobId/items", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;

      const job = await storage.getBulkUploadJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const items = await storage.getBulkUploadItemsByJob(jobId);
      res.json(items);
    } catch (error) {
      logger.error("Error fetching job items", error);
      res.status(500).json({ error: "Failed to fetch job items" });
    }
  });

  // ===== AI FIELD MAPPING ROUTES =====

  // Analyze CSV headers using AI and suggest field mappings
  app.post("/api/bulk-upload/analyze-headers", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const { headers } = req.body;

      if (!headers || !Array.isArray(headers)) {
        return res.status(400).json({ error: "Headers array is required" });
      }

      logger.info('[AIFieldMapping] Analyzing headers', { headers });

      const analysis = await aiFieldMappingService.analyzeHeaders(headers);

      logger.info('[AIFieldMapping] Analysis complete', { 
        mappingsCount: analysis.mappings.length,
        unmappedCount: analysis.unmappedUserFields.length,
        missingRequiredCount: analysis.missingRequiredFields.length
      });

      res.json(analysis);
    } catch (error) {
      logger.error("[AIFieldMapping] Error analyzing headers", error);
      res.status(500).json({ error: "Failed to analyze headers" });
    }
  });

  // Update field mappings for a job
  app.post("/api/bulk-upload/update-mappings/:jobId", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;
      const { mappings } = req.body;

      const job = await storage.getBulkUploadJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Validate mappings
      const validation = aiFieldMappingService.validateMapping(mappings);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Invalid mapping", 
          details: validation.errors 
        });
      }

      // Update job with mappings
      await storage.updateBulkUploadJob(jobId, { 
        mappings: mappings as any 
      });

      logger.info('[AIFieldMapping] Mappings updated', { jobId, mappingsCount: mappings.length });

      res.json({ success: true, mappings });
    } catch (error) {
      logger.error("[AIFieldMapping] Error updating mappings", error);
      res.status(500).json({ error: "Failed to update mappings" });
    }
  });

  // Apply mappings and transform CSV data
  app.post("/api/bulk-upload/apply-mappings/:jobId", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobId } = req.params;

      const job = await storage.getBulkUploadJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (job.sellerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!job.mappings) {
        return res.status(400).json({ error: "No mappings configured for this job" });
      }

      // Get items and apply mappings to transform data
      const items = await storage.getBulkUploadItemsByJob(jobId);
      const mappings = job.mappings as any[];

      let transformedCount = 0;
      for (const item of items) {
        const userRow = item.rowData as Record<string, any>;
        const transformedRow = aiFieldMappingService.applyMapping(userRow, mappings);
        
        // Update item with transformed data
        await storage.updateBulkUploadItem(item.id, {
          rowData: transformedRow as any
        });
        transformedCount++;
      }

      // Update job status to 'pending' so it's ready for validation
      await storage.updateBulkUploadJob(jobId, { 
        status: 'pending'
      });

      logger.info('[AIFieldMapping] Data transformed and status updated', { 
        jobId, 
        itemCount: transformedCount,
        newStatus: 'pending'
      });

      res.json({ 
        success: true, 
        transformedCount,
        message: "Data transformed successfully using AI mappings" 
      });
    } catch (error) {
      logger.error("[AIFieldMapping] Error applying mappings", error);
      res.status(500).json({ error: "Failed to apply mappings" });
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
      const statusSchema = z.object({ status: orderStatusEnum });
      const validationResult = statusSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }
      
      const result = await orderLifecycleService.updateOrderStatus(
        req.params.id,
        validationResult.data.status,
        userId
      );
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ error: result.error });
      }
      
      res.json(result.order);
    } catch (error) {
      logger.error("Order status update error", error);
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
          const items = typeof existingOrder.items === 'string' ? JSON.parse(existingOrder.items) : existingOrder.items;
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
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            const productIds = items.map((item: any) => item.productId);
            const products = await storage.getProductsByIds(productIds);
            
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

  // POST /api/orders/:id/request-balance (Architecture 3)
  // Seller/admin creates balance payment request with secure session token
  app.post("/api/orders/:id/request-balance", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orderId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!stripe) {
        return res.status(500).json({ 
          error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to secrets." 
        });
      }

      // Get order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Authorization: buyer (order owner), seller (owns products), OR admin
      const isAdmin = user?.role === 'owner' || user?.role === 'admin';
      // CRITICAL FIX: Guest orders have userId=null, so check email match for guest checkout
      const isBuyer = order.userId === userId || 
                      (!order.userId && user?.email && user.email === order.customerEmail);
      
      if (!isAdmin && !isBuyer) {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
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

      // Request balance payment via service
      const result = await balancePaymentService.requestBalancePayment(orderId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Get seller info for email
      const seller = await storage.getUser(userId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Send balance payment request email to customer
      if (result.balanceRequest && result.sessionToken) {
        try {
          await notificationService.sendBalancePaymentRequest(
            order,
            seller,
            result.balanceRequest,
            result.sessionToken
          );
          logger.info('[Balance Request] Balance payment email sent successfully', {
            orderId,
            customerEmail: order.customerEmail,
            balanceRequestId: result.balanceRequest.id
          });
        } catch (error) {
          logger.error('[Balance Request] Failed to send balance payment email', {
            orderId,
            error
          });
          // Continue - email failure shouldn't block the response
        }
      } else {
        logger.warn('[Balance Request] Missing balanceRequest or sessionToken - email not sent', {
          orderId,
          hasBalanceRequest: !!result.balanceRequest,
          hasSessionToken: !!result.sessionToken
        });
      }

      res.json({ 
        success: true, 
        balanceRequest: result.balanceRequest,
        sessionToken: result.sessionToken,
        message: "Balance payment request created successfully"
      });
    } catch (error: any) {
      logger.error("Balance request error", error);
      res.status(500).json({ error: "Failed to request balance payment" });
    }
  });

  // GET /api/orders/:orderId/balance-session (Architecture 3)
  // Get balance payment session by token (magic link) or authenticated user
  app.get("/api/orders/:orderId/balance-session", async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const { token } = req.query;
      
      // Check authentication: either valid token OR authenticated user owns order
      let isAuthorized = false;
      let userId: string | undefined;

      if (token && typeof token === 'string') {
        // Token-based access (magic link)
        const sessionResult = await balancePaymentService.getBalanceSession(token);
        
        logger.info(`[BalanceSession] Session response`, {
          success: sessionResult.success,
          hasSession: !!sessionResult.session,
          balanceRequestId: sessionResult.session?.balanceRequestId,
          sessionKeys: sessionResult.session ? Object.keys(sessionResult.session).join(', ') : 'none'
        });
        
        if (sessionResult.success && sessionResult.session) {
          return res.json(sessionResult.session);
        } else {
          return res.status(401).json({ error: sessionResult.error || "Invalid or expired token" });
        }
      } else if (req.isAuthenticated() && req.user?.claims?.sub) {
        // Authenticated user access
        userId = req.user.claims.sub;
        
        // Verify user owns the order
        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }
        
        if (order.userId === userId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(401).json({ error: "Unauthorized - token or authentication required" });
      }

      // Get session by order ID for authenticated user
      const sessionResult = await balancePaymentService.getBalanceSession(orderId, userId);
      
      if (!sessionResult.success) {
        return res.status(404).json({ error: sessionResult.error });
      }

      res.json(sessionResult.session);
    } catch (error: any) {
      logger.error("Get balance session error", error);
      res.status(500).json({ error: "Failed to retrieve balance session" });
    }
  });

  // PATCH /api/orders/:orderId/balance-session/address (Architecture 3)
  // Recalculate balance with new shipping address
  app.patch("/api/orders/:orderId/balance-session/address", async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const { token } = req.query;
      const { balanceRequestId, newAddress } = req.body;

      if (!balanceRequestId || !newAddress) {
        return res.status(400).json({ error: "balanceRequestId and newAddress are required" });
      }

      // Validate address fields
      if (!newAddress.street || !newAddress.city || !newAddress.country) {
        return res.status(400).json({ error: "Address must include street, city, and country" });
      }

      // Authorization: token OR authenticated user owns order
      let isAuthorized = false;

      if (token && typeof token === 'string') {
        // Verify token grants access to this balance request
        const sessionResult = await balancePaymentService.getBalanceSession(token);
        if (sessionResult.success && sessionResult.session?.orderId === orderId) {
          isAuthorized = true;
        }
      } else if (req.isAuthenticated() && req.user?.claims?.sub) {
        const order = await storage.getOrder(orderId);
        if (order && order.userId === req.user.claims.sub) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Recalculate balance with new address
      const result = await balancePaymentService.recalculateBalanceWithNewAddress(
        balanceRequestId,
        newAddress
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        newBalanceCents: result.newBalanceCents,
        newShippingCostCents: result.newShippingCostCents,
        pricingBreakdown: result.pricingBreakdown
      });
    } catch (error: any) {
      logger.error("Recalculate balance error", error);
      res.status(500).json({ error: "Failed to recalculate balance" });
    }
  });

  // POST /api/orders/:orderId/pay-balance (Architecture 3)
  // Create Stripe payment intent for balance payment
  app.post("/api/orders/:orderId/pay-balance", async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const { token } = req.query;
      const { balanceRequestId } = req.body;

      logger.info(`[BalancePayment] Pay balance request`, {
        orderId,
        hasToken: !!token,
        requestBody: req.body,
        balanceRequestId
      });

      if (!balanceRequestId) {
        return res.status(400).json({ error: "balanceRequestId is required" });
      }

      // Authorization: token OR authenticated user owns order
      let isAuthorized = false;

      if (token && typeof token === 'string') {
        // Verify token grants access to this balance request
        const sessionResult = await balancePaymentService.getBalanceSession(token);
        if (sessionResult.success && sessionResult.session?.orderId === orderId) {
          isAuthorized = true;
        }
      } else if (req.isAuthenticated() && req.user?.claims?.sub) {
        const order = await storage.getOrder(orderId);
        if (order && order.userId === req.user.claims.sub) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Create payment intent
      const result = await balancePaymentService.createBalancePaymentIntent(balanceRequestId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId
      });
    } catch (error: any) {
      logger.error("Create balance payment intent error", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Reference: javascript_stripe integration
  // Stripe Connect payment intent creation for checkout
  // Note: No auth required - guest checkout needs this
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, orderId, paymentType = "full", items, shippingAddress } = req.body;

      const result = await legacyCheckoutService.createPaymentIntent({
        amount,
        orderId,
        paymentType,
        items,
        shippingAddress,
      });

      if (!result.success) {
        const statusCode = result.errorCode === 'STRIPE_NOT_CONNECTED' || 
                          result.errorCode === 'STRIPE_CHARGES_DISABLED' ||
                          result.errorCode === 'STRIPE_CAPABILITIES_INACTIVE' ? 400 : 500;
        return res.status(statusCode).json({ 
          error: result.error,
          errorCode: result.errorCode 
        });
      }

      res.json({ 
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
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
      const { paymentIntentId } = req.params;
      const { address, email, name, phone } = req.body;

      const result = await legacyCheckoutService.updatePaymentIntentAddress({
        paymentIntentId,
        address,
        email,
        name,
        phone,
      });

      if (!result.success) {
        return res.status(result.error?.includes("Invalid") ? 400 : 500).json({ 
          error: result.error 
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error("Failed to update payment intent with wallet address", error);
      res.status(500).json({ error: "Failed to update payment intent" });
    }
  });

  // Retrieve Payment Intent with tax data after payment confirmation
  app.get("/api/payment-intent/:paymentIntentId/tax-data", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;

      const result = await legacyCheckoutService.getPaymentIntentTaxData(paymentIntentId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      logger.error("Failed to retrieve tax data", error);
      res.status(500).json({ error: "Failed to retrieve tax data" });
    }
  });

  // Retrieve Payment Intent details (for 3DS return flow) with client_secret validation
  app.get("/api/payment-intent/:paymentIntentId", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      const { client_secret } = req.query;

      if (!client_secret || typeof client_secret !== 'string') {
        return res.status(401).json({ error: "Unauthorized - client_secret required" });
      }

      const result = await legacyCheckoutService.getPaymentIntent(paymentIntentId, client_secret);

      if (!result.success) {
        const statusCode = result.error?.includes("Unauthorized") ? 401 : 500;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      logger.error("Failed to retrieve payment intent", error);
      res.status(500).json({ error: "Failed to retrieve payment intent" });
    }
  });

  // Cancel Payment Intent - releases inventory and cancels Stripe payment
  app.post("/api/payment-intent/:paymentIntentId/cancel", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      const { client_secret } = req.body;

      const result = await legacyCheckoutService.cancelPaymentIntent(
        { paymentIntentId, clientSecret: client_secret },
        paymentService
      );

      if (!result.success) {
        const statusCode = result.error?.includes("Unauthorized") ? 401 : 
                          result.error?.includes("not found") ? 404 :
                          result.error?.includes("Cannot cancel") ? 400 : 500;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json({ 
        success: true, 
        message: "Payment cancelled and inventory released" 
      });
    } catch (error: any) {
      logger.error(`[Payment Cancel] Failed to cancel payment intent`, error);
      res.status(500).json({ error: error.message || "Failed to cancel payment" });
    }
  });

  // **PRICING API - Single Source of Truth**
  // Calculate all pricing in seller's currency: subtotal, shipping, tax, total
  app.post("/api/pricing/calculate", async (req, res) => {
    try {
      const { sellerId, items, shippingAddress } = req.body;

      // Validate input
      if (!sellerId || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: "sellerId and items array are required" });
      }

      // Call pricing calculation service
      const pricingBreakdown = await pricingCalculationService.calculateCartPricing({
        sellerId,
        items,
        destination: shippingAddress,
      });

      res.json(pricingBreakdown);
    } catch (error: any) {
      if (error instanceof ConfigurationError) {
        return res.status(400).json({ error: error.message });
      }
      logger.error("[Pricing API] Error calculating pricing:", error);
      res.status(500).json({ error: "Failed to calculate pricing" });
    }
  });

  // Checkout - Server-orchestrated workflow (Architecture 3)
  // Delegates to CheckoutService → CreateFlowService workflow orchestrator
  app.post('/api/checkout/initiate', async (req, res) => {
    try {
      // Validate checkoutService availability
      if (!checkoutService) {
        logger.error('[API] CheckoutService not available - Stripe not configured');
        return res.status(500).json({ 
          error: 'Checkout service not available',
          errorCode: 'SERVICE_UNAVAILABLE' 
        });
      }

      // Validate request body with Zod schema
      let validatedData;
      try {
        validatedData = checkoutInitiateRequestSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            error: 'Validation failed',
            details: error.errors
          });
        }
        throw error;
      }

      const { items, shippingAddress, billingAddress, billingSameAsShipping, customerEmail, customerName, checkoutSessionId } = validatedData;

      // Use billing address if provided, otherwise fall back to shipping address
      const finalBillingAddress = billingSameAsShipping || !billingAddress 
        ? {
            name: customerName,
            email: customerEmail,
            phone: billingAddress?.phone || '',
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country,
          }
        : billingAddress;

      // Delegate to CheckoutService workflow orchestrator
      const result = await checkoutService.initiateCheckout({
        items,
        shippingAddress: {
          line1: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        billingAddress: finalBillingAddress,
        customerEmail,
        customerName,
        checkoutSessionId,
      });

      if (!result.success) {
        // Determine appropriate status code: 400 for client errors, 500 for server errors
        const isClientError = result.errorCode?.startsWith('VALIDATION_') || 
                              result.errorCode?.startsWith('CART_') ||
                              result.errorCode?.startsWith('SELLER_') ||
                              result.errorCode === 'INSUFFICIENT_STOCK';
        const statusCode = isClientError ? 400 : 500;
        
        return res.status(statusCode).json({
          error: result.error,
          errorCode: result.errorCode,
          retryable: result.retryable,
          step: result.step,
          state: result.state,
          details: result.details,
        });
      }

      return res.json({
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        checkoutSessionId: result.checkoutSessionId,
        amountToCharge: result.amountToCharge,
        currency: result.currency,
      });

    } catch (error: any) {
      logger.error('[API] Checkout initiate failed:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        errorCode: 'SERVER_ERROR' 
      });
    }
  });

  // Get workflow status by checkout session ID (idempotency support)
  app.get('/api/checkout/session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({ 
          error: 'Session ID is required',
          errorCode: 'MISSING_SESSION_ID' 
        });
      }

      // Fetch workflow by checkout session ID
      const workflow = await storage.getWorkflowByCheckoutSession(sessionId);

      if (!workflow) {
        return res.status(404).json({ 
          error: 'Workflow not found',
          errorCode: 'WORKFLOW_NOT_FOUND',
          sessionId 
        });
      }

      // Build response based on workflow status
      const response: any = {
        sessionId,
        status: workflow.status,
        currentState: workflow.currentState,
        orderId: workflow.orderId,
        paymentIntentId: workflow.paymentIntentId,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      };

      // Include error details if failed
      if (workflow.status === 'failed') {
        response.error = workflow.error;
        response.errorCode = workflow.errorCode;
        response.retryCount = workflow.retryCount;
        response.lastRetryAt = workflow.lastRetryAt;
      }

      // Include workflow data/context if completed (for retrieving results)
      if (workflow.status === 'completed' && workflow.data) {
        const context = workflow.data as any;
        response.result = {
          clientSecret: context.clientSecret,
          paymentIntentId: context.paymentIntentId,
          amountToCharge: context.totalAmount,
          currency: context.currency || 'USD',
        };
      }

      return res.json(response);

    } catch (error: any) {
      logger.error('[API] Get workflow status failed:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        errorCode: 'SERVER_ERROR' 
      });
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
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
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
      
      const result = await orderLifecycleService.updateItemTracking(
        req.params.id,
        validationResult.data,
        userId
      );
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ error: result.error });
      }
      
      res.json(result.item);
    } catch (error) {
      logger.error("Item tracking update error", error);
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
          const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
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
            // TODO: Implement sendItemDelivered in NotificationService
            logger.info(`[Notifications] Item delivered status updated for item ${updatedItem.id}`);
          } else if (validationResult.data.status === 'cancelled') {
            // TODO: Implement sendItemCancelled in NotificationService
            logger.info(`[Notifications] Item cancelled status updated for item ${updatedItem.id}`);
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
      
      const refundSchema = z.object({
        quantity: z.number().min(1, "Quantity must be at least 1"),
        amount: z.number().min(0.5, "Refund amount must be at least $0.50"),
        reason: z.string().optional(),
      });
      
      const validationResult = refundSchema.safeParse(req.body);
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }
      
      // Get the order item to find the order ID
      const item = await storage.getOrderItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Order item not found" });
      }

      // CRITICAL: Verify order ownership BEFORE processing refund
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const isTeamMember = ["admin", "editor"].includes(currentUser.role) && currentUser.sellerId;
      const canonicalSellerId = isTeamMember ? currentUser.sellerId : userId;

      const order = await storage.getOrder(item.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify seller owns the product
      const product = await storage.getProduct(item.productId);
      if (!product || product.sellerId !== canonicalSellerId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const result = await orderLifecycleService.processRefund({
        orderId: item.orderId,
        sellerId: canonicalSellerId,
        refundType: 'item',
        refundItems: [{
          itemId: req.params.id,
          quantity: validationResult.data.quantity,
          amount: validationResult.data.amount,
        }],
        reason: validationResult.data.reason || 'Customer request',
      });
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ error: result.error });
      }
      
      // Update order fulfillment status
      await storage.updateOrderFulfillmentStatus(item.orderId);
      
      // Get updated item for response
      const updatedItem = await storage.getOrderItemById(req.params.id);
      
      res.json({
        success: true,
        item: updatedItem,
        refundId: result.stripeRefundId,
        message: `Refund of $${result.refundAmount?.toFixed(2)} processed successfully`,
      });
    } catch (error) {
      logger.error("Item refund error", error);
      res.status(500).json({ error: "Failed to process refund" });
    }
  });

  // Team Management - Legacy routes (deprecated - use new routes below)
  // These routes are kept for backward compatibility but use new service methods
  app.post("/api/invitations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email, role } = req.body;
      
      if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
      }

      // Use new inviteCollaborator method
      const result = await teamService.inviteCollaborator({
        storeOwnerId: userId,
        inviteeEmail: email.toLowerCase().trim(),
        invitedByUserId: userId
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result.data);
    } catch (error: any) {
      logger.error("Invitation error", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  // Get all invitations
  app.get("/api/invitations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await teamService.getPendingInvitations(userId);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  // Accept invitation - works for both new and existing users
  app.post("/api/invitations/accept/:token", async (req: any, res) => {
    try {
      const result = await teamService.acceptInvitation({ token: req.params.token });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error) {
      logger.error("Accept invitation error", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // Get team members for current seller's store
  app.get("/api/team", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await teamService.listCollaborators(userId);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Update user role - deprecated, kept for backward compatibility
  app.patch("/api/team/:userId/role", requireAuth, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ error: "Role is required" });
      }

      // This functionality is deprecated - role changes should be done by recreating memberships
      res.status(501).json({ error: "Role updates are deprecated. Please revoke and re-invite the user with the new role." });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Delete team member
  app.delete("/api/team/:userId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get the membership ID for this user
      const membership = await storage.getUserStoreMembership(req.params.userId, userId);
      if (!membership) {
        return res.status(404).json({ error: "Team member not found" });
      }

      const result = await teamService.revokeCollaborator({
        membershipId: membership.id,
        revokedByUserId: userId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // New Team Management Routes (Architecture 3)
  app.post("/api/team/invite", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const result = await teamService.inviteCollaborator({
        storeOwnerId: userId,
        inviteeEmail: email.toLowerCase().trim(),
        invitedByUserId: userId
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Send invitation email
      const inviter = await storage.getUser(userId);
      const inviterName = `${inviter?.firstName || ''} ${inviter?.lastName || ''}`.trim() || 'A seller';
      const storeName = inviter?.username || 'a store';
      const invitationLink = `${req.protocol}://${req.get('host')}/accept-invitation?token=${result.data?.token}`;
      
      const emailHtml = generateCollaboratorInvitationEmail(
        inviterName,
        storeName,
        invitationLink
      );
      
      await notificationService.sendEmail({
        to: email,
        subject: `You've been invited to join ${storeName} on Upfirst`,
        html: emailHtml
      });
      
      res.json({ message: "Invitation sent successfully" });
    } catch (error) {
      logger.error("Error inviting collaborator", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  app.post("/api/team/accept-invitation", async (req: any, res) => {
    try {
      const { token } = req.body;
      const acceptingUserId = req.user?.claims?.sub; // May be null if not logged in
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      
      const result = await teamService.acceptInvitation({ token, acceptingUserId });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Log the user in by creating a session
      const user = result.data!.user;
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        access_token: 'email-auth', // Similar to local auth
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };
      
      // Use passport's login to properly set up the session
      req.login(sessionUser, (err: any) => {
        if (err) {
          logger.error('[TeamManagement] Error logging in after invitation acceptance', err);
          return res.status(500).json({ error: "Failed to log in" });
        }
        
        res.json({ 
          message: "Invitation accepted successfully",
          user: result.data?.user,
          redirectTo: "/seller-dashboard"
        });
      });
    } catch (error) {
      logger.error("Error accepting invitation", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  app.delete("/api/team/members/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const result = await teamService.revokeCollaborator({
        membershipId: id,
        revokedByUserId: userId
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: "Collaborator removed successfully" });
    } catch (error) {
      logger.error("Error revoking collaborator", error);
      res.status(500).json({ error: "Failed to remove collaborator" });
    }
  });

  app.get("/api/team/collaborators", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // For collaborators, use the store owner's ID; for store owners, use their own ID
      const effectiveSellerId = user.sellerId || userId;
      
      // Get both collaborators and pending invitations for the store owner
      const [collaboratorsResult, invitationsResult] = await Promise.all([
        teamService.listCollaborators(effectiveSellerId),
        teamService.getPendingInvitations(effectiveSellerId)
      ]);
      
      if (!collaboratorsResult.success) {
        return res.status(400).json({ error: collaboratorsResult.error });
      }
      
      if (!invitationsResult.success) {
        return res.status(400).json({ error: invitationsResult.error });
      }
      
      res.json({
        collaborators: collaboratorsResult.data || [],
        pendingInvitations: invitationsResult.data || []
      });
    } catch (error) {
      logger.error("Error listing team members", error);
      res.status(500).json({ error: "Failed to load team members" });
    }
  });

  app.delete("/api/team/invitations/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const result = await teamService.cancelInvitation({
        invitationId: id,
        cancelledByUserId: userId
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: "Invitation cancelled successfully" });
    } catch (error) {
      logger.error("Error cancelling invitation", error);
      res.status(500).json({ error: "Failed to cancel invitation" });
    }
  });

  // User Settings Routes
  app.patch("/api/user/profile", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contactEmail } = req.body;

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
        contactEmail: contactEmail || null,
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

  // Update Warehouse Address
  app.patch("/api/user/warehouse", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { warehouseStreet, warehouseCity, warehouseState, warehousePostalCode, warehouseCountry } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate country code is 2 letters
      if (warehouseCountry && warehouseCountry.length !== 2) {
        return res.status(400).json({ error: "Country code must be 2 letters (e.g., US, GB, CA)" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        warehouseStreet: warehouseStreet || null,
        warehouseCity: warehouseCity || null,
        warehouseState: warehouseState || null,
        warehousePostalCode: warehousePostalCode || null,
        warehouseCountry: warehouseCountry ? warehouseCountry.toUpperCase() : null,
      });

      res.json({ message: "Warehouse address updated successfully", user: updatedUser });
    } catch (error) {
      logger.error("Warehouse address update error", error);
      res.status(500).json({ error: "Failed to update warehouse address" });
    }
  });

  // Update Terms & Conditions settings
  app.post("/api/settings/terms", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { termsSource, termsPdfUrl } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate termsSource: must be provided and must be one of the allowed values or null (for removal)
      if (termsSource !== null && termsSource !== undefined && !['custom_pdf', 'platform_default'].includes(termsSource)) {
        return res.status(400).json({ error: "Invalid termsSource value. Must be 'custom_pdf', 'platform_default', or null" });
      }

      // If using custom_pdf, ensure PDF URL is provided
      if (termsSource === 'custom_pdf' && (!termsPdfUrl || termsPdfUrl.trim() === '')) {
        return res.status(400).json({ error: "PDF URL is required when using custom T&C" });
      }

      // Determine final values
      let finalTermsSource = null;
      let finalTermsPdfUrl = user.termsPdfUrl; // Preserve existing PDF URL by default

      if (termsSource === 'platform_default') {
        finalTermsSource = 'platform_default';
        // Keep existing termsPdfUrl so user can switch back to custom later
      } else if (termsSource === 'custom_pdf') {
        finalTermsSource = 'custom_pdf';
        finalTermsPdfUrl = termsPdfUrl; // Use the provided PDF URL
      } else if (termsSource === null || termsSource === undefined) {
        // Explicitly clearing T&C settings - clear both fields
        finalTermsSource = null;
        finalTermsPdfUrl = null;
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        termsSource: finalTermsSource,
        termsPdfUrl: finalTermsPdfUrl,
      });

      res.json({ message: "Terms & Conditions updated successfully", user: updatedUser });
    } catch (error) {
      logger.error("Terms & Conditions update error", error);
      res.status(500).json({ error: "Failed to update Terms & Conditions" });
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
        taxEnabled: updatedUser.taxEnabled ?? undefined,
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

      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
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
        if (stripe) {
          await stripe.paymentMethods.detach(existingPaymentMethod.stripePaymentMethodId);
        }
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
      const userId = req.user.claims.sub;
      const { reset = false, country } = req.body;

      const result = await stripeConnectService.createOrGetExpressAccount({
        userId,
        reset,
        country,
      });

      if (!result.success) {
        if (result.errorCode === 'STRIPE_CONNECT_NOT_ENABLED') {
          return res.status(400).json({
            error: result.error,
            message: "Your Stripe account needs to enable Stripe Connect. Please visit https://dashboard.stripe.com/connect/accounts/overview and click 'Get Started' to activate Connect for your account.",
          });
        }
        
        const statusCode = result.error === "User not found" ? 404 : 500;
        return res.status(statusCode).json({ 
          error: result.error,
          message: result.error 
        });
      }

      res.json(result.data);
    } catch (error: any) {
      logger.error("Stripe Express account creation error", error);
      res.status(500).json({ 
        error: "Failed to create Express account",
        message: error.message || "Unknown error occurred"
      });
    }
  });

  // Create Account Session for embedded onboarding
  app.post("/api/stripe/account-session", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { purpose = 'onboarding' } = req.body;

      const result = await stripeConnectService.createAccountSession({
        userId,
        purpose,
      });

      if (!result.success) {
        const statusCode = result.error?.includes("No Stripe account") ? 400 : 500;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      logger.error("Stripe Account Session error", error);
      res.status(500).json({ error: "Failed to create account session" });
    }
  });

  // Generate Account Link for onboarding/verification
  app.post("/api/stripe/account-link", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type = 'account_onboarding' } = req.body;

      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
      const baseUrl = origin || (process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : `http://localhost:${process.env.PORT || 5000}`);

      const result = await stripeConnectService.createAccountLink({
        userId,
        type,
        baseUrl,
      });

      if (!result.success) {
        const statusCode = result.error?.includes("No Stripe account") ? 400 : 500;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json({ url: result.url });
    } catch (error: any) {
      logger.error("Stripe Account Link error", error);
      res.status(500).json({ error: "Failed to generate account link" });
    }
  });

  // Check Stripe account status and update user
  app.get("/api/stripe/account-status", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const result = await stripeConnectService.getAccountStatus(userId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json(result.data);
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
  // Note: Trial now starts when user subscribes (with credit card on file)
  // Old auto-trial on first product listing has been removed
  // Payment method collection is handled by Stripe Checkout

  // Create subscription checkout session
  app.post("/api/subscription/create", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body;
      const origin = req.headers.origin || 'http://localhost:5000';

      const result = await subscriptionService.createCheckoutSession({
        userId,
        plan,
        origin,
      });

      if (!result.success) {
        const statusCode = result.error === "User not found" ? 404 : 500;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      logger.error("Create subscription error", error);
      res.status(500).json({ error: "Failed to create subscription checkout" });
    }
  });

  // Sync subscription status from Stripe (fallback when webhook not configured)
  app.post("/api/subscription/sync", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const result = await subscriptionService.syncSubscription({ userId });

      if (!result.success) {
        const statusCode = result.error === "No Stripe customer found" ? 404 : 500;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      logger.error("Sync subscription error", error);
      res.status(500).json({ error: "Failed to sync subscription status" });
    }
  });

  // DEBUG: Manual subscription fix endpoint (temporary)
  app.post("/api/subscription/fix", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const result = await subscriptionService.fixSubscription(userId);

      if (!result.success) {
        const statusCode = result.error === "No Stripe customer found" ? 404 : 500;
        return res.status(statusCode).json({ 
          success: false,
          error: result.error,
          customerId: result.customerId 
        });
      }

      res.json({
        success: true,
        ...result.data,
      });
    } catch (error: any) {
      logger.error("[DEBUG] Subscription fix error:", error);
      res.status(500).json({ error: error.message || "Failed to fix subscription" });
    }
  });

  // Get subscription status
  app.get("/api/subscription/status", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const result = await subscriptionService.getSubscriptionStatus(userId);

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      logger.error("Get subscription status error", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Cancel subscription (schedule cancellation at period end)
  app.post("/api/subscription/cancel", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const result = await subscriptionService.cancelSubscription(userId);

      if (!result.success) {
        const statusCode = result.error === "No active subscription" ? 400 : 500;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      logger.error("Cancel subscription error", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Reactivate subscription (remove scheduled cancellation)
  app.post("/api/subscription/reactivate", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const result = await subscriptionService.reactivateSubscription(userId);

      if (!result.success) {
        const statusCode = result.error === "No active subscription" ? 400 : 500;
        return res.status(statusCode).json({ error: result.error });
      }

      res.json(result.data);
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
      if (!stripe || !stripeWebhookService) {
        return res.status(500).send("Stripe is not configured");
      }
      
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!sig || !webhookSecret) {
        logger.error("Webhook signature or secret missing");
        return res.status(400).send("Webhook signature or secret missing");
      }

      // Ensure sig is a string (stripe-signature should always be a string)
      const signatureStr = Array.isArray(sig) ? sig[0] : sig;
      
      const result = await stripeWebhookService.processWebhook(req.body, signatureStr, webhookSecret);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error("[Webhook] Error processing webhook", error);
      res.status(500).send("Webhook processing error");
    }
  });

  // Wholesale Stripe Webhook Handler
  app.post("/api/webhooks/stripe/wholesale", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        logger.error("[Wholesale Webhook] Signature or secret missing");
        return res.status(400).json({ error: "Webhook signature or secret missing" });
      }

      // Ensure sig is a string
      const signatureStr = Array.isArray(sig) ? sig[0] : sig;

      // Construct Stripe event
      const event = stripe.webhooks.constructEvent(req.body, signatureStr, webhookSecret);

      // Process webhook through WholesalePaymentService
      const result = await wholesalePaymentService.handlePaymentWebhook(event);

      if (!result.success) {
        logger.error("[Wholesale Webhook] Processing failed", { error: result.error });
        return res.status(500).json({ error: result.error });
      }

      logger.info("[Wholesale Webhook] Processed successfully", { eventType: event.type });
      res.json({ received: true });
    } catch (error: any) {
      logger.error("[Wholesale Webhook] Error", error);
      res.status(400).json({ error: error.message || "Webhook error" });
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
      const sellerId = (req as any).user?.claims?.sub;
      if (sellerId) {
        const seller = await storage.getUser(sellerId);
        if (seller) {
          // Create a balance request record for email
          const balanceRequest = await storage.createBalanceRequest({
            orderId: order.id,
            requestedBy: sellerId,
            amountCents: Math.round(remainingBalance * 100),
            status: 'pending',
            sessionToken: paymentIntent.client_secret || '',
          });
          
          // Send email to customer
          await notificationService.sendBalancePaymentRequest(order, seller, balanceRequest, paymentIntent.client_secret || '');
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

      const result = await metaIntegrationService.handleOAuthCallback(code as string, userId);

      if (!result.success) {
        res.send(`
          <html>
            <script>
              window.opener.postMessage({ type: 'META_AUTH_ERROR', error: '${result.error}' }, '*');
              window.close();
            </script>
            <body>
              <p>Connection failed. This window will close automatically...</p>
            </body>
          </html>
        `);
      } else {
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
      }
    } catch (error) {
      logger.error("Meta OAuth callback error", error);
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

  // ========================================
  // Newsletter Routes (Architecture 3 - Service Layer)
  // ========================================
  
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
      
      const newsletterSchema = z.object({
        subject: z.string().min(1, "Subject is required"),
        content: z.string().optional(),
        htmlContent: z.string().optional(),
        recipients: z.array(z.string().email()).optional(),
        groupIds: z.array(z.string()).optional(),
        segmentIds: z.array(z.string()).optional(),
        scheduledAt: z.string().optional(),
      }).refine(data => data.content || data.htmlContent, {
        message: "Either content or htmlContent is required",
      });

      const validated = newsletterSchema.parse(req.body);
      
      logger.info('[Newsletter] Create request', { 
        subject: validated.subject, 
        hasContent: !!validated.content,
        hasHtml: !!validated.htmlContent,
        recipientCount: validated.recipients?.length || 0,
        groupCount: validated.groupIds?.length || 0,
        segmentCount: validated.segmentIds?.length || 0,
        scheduledAt: validated.scheduledAt 
      });

      // Use CampaignService to create campaign
      const campaign = await campaignService.createCampaign(userId, {
        subject: validated.subject,
        content: validated.content,
        htmlContent: validated.htmlContent || null,
        recipients: validated.recipients || [],
        groupIds: validated.groupIds || [],
        segmentIds: validated.segmentIds || [],
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : undefined,
      });

      res.status(201).json(campaign);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Newsletter creation error", error);
      res.status(500).json({ error: error.message || "Failed to create newsletter" });
    }
  });

  app.post("/api/newsletters/:id/send", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = req.params.id;

      // Verify ownership
      const campaign = await storage.getNewsletter(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Use CampaignService to send
      const result = await campaignService.sendCampaign(campaignId);

      res.json({ 
        success: result.success, 
        message: `Campaign queued for sending to ${result.recipientCount} recipients`,
        campaignId: result.campaignId
      });
    } catch (error: any) {
      logger.error("Campaign send error", error);
      res.status(500).json({ error: error.message || "Failed to send campaign" });
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
      const campaignId = req.params.id;
      
      const testEmailSchema = z.object({
        testEmail: z.string().email("Valid email address is required"),
      });

      const validated = testEmailSchema.parse(req.body);

      // Verify ownership
      const campaign = await storage.getNewsletter(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Use CampaignService to send test email
      await campaignService.sendTestEmail(campaignId, validated.testEmail.trim());

      res.json({ 
        success: true, 
        message: `Test email sent to ${validated.testEmail}` 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Test email send error", error);
      res.status(500).json({ error: error.message || "Failed to send test email" });
    }
  });

  // Track newsletter open (public endpoint - no auth required)
  app.get("/api/newsletters/track/:id/open", async (req, res) => {
    try {
      const campaignId = req.params.id;
      const recipientEmail = req.query.email as string;

      if (!recipientEmail) {
        return res.status(400).send("Email required");
      }

      // Use AnalyticsService to track open event
      await analyticsService.trackOpen(campaignId, recipientEmail);

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
      const userId = req.query.userId as string;

      if (!email || !userId) {
        return res.status(400).send("Email and user ID required");
      }

      // Use SubscriberService to unsubscribe
      await subscriberService.unsubscribe(userId, email, 'user_request');

      // Track unsubscribe event if campaign ID provided
      const campaignId = req.query.campaignId as string;
      if (campaignId) {
        await analyticsService.trackUnsubscribe(campaignId, email);
      }

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

  // GDPR-compliant token-based unsubscribe (public endpoint - no auth required)
  app.get("/api/unsubscribe/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).send("Invalid unsubscribe link");
      }

      // Use ComplianceService to handle unsubscribe
      const result = await complianceService.handleUnsubscribe(token);

      if (!result.success) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Unsubscribe Error - Upfirst</title>
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
                  color: #dc2626;
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
                <h1>Unsubscribe Error</h1>
                <p>${result.error || 'Unable to process your unsubscribe request.'}</p>
                <p>Please contact support if this problem persists.</p>
              </div>
            </body>
          </html>
        `);
      }

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
              .success-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✓</div>
              <h1>You've been unsubscribed</h1>
              <p>You will no longer receive newsletter emails at <strong>${escapeHtml(result.email || 'your email')}</strong></p>
              <p>If this was a mistake, please contact the sender directly to resubscribe.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      logger.error("Token-based unsubscribe error", error);
      res.status(500).send("An error occurred while unsubscribing. Please try again.");
    }
  });

  // Webhook endpoint for Resend events (public endpoint - validates signature)
  app.post("/api/newsletter/webhooks/resend", async (req, res) => {
    try {
      // TODO: Validate Resend webhook signature for security
      const signature = req.headers['resend-signature'] || req.headers['x-resend-signature'];
      
      // For now, accept the webhook (signature validation can be added later)
      const event = req.body;

      logger.info('[Newsletter Webhook] Received Resend webhook:', { 
        type: event.type,
        email: event.data?.email 
      });

      // Map Resend event types to our analytics events
      const eventTypeMap: Record<string, 'open' | 'click' | 'bounce' | 'unsubscribe'> = {
        'email.opened': 'open',
        'email.clicked': 'click',
        'email.bounced': 'bounce',
        'email.complained': 'bounce', // Treat complaints as bounces
        'email.delivered': 'open', // Track deliveries as potential opens
      };

      const analyticsEventType = eventTypeMap[event.type];

      // Extract campaignId from tags instead of event.data
      const campaignIdTag = event.data?.tags?.find((tag: any) => tag.name === 'campaignId');
      const campaignId = campaignIdTag?.value;

      if (analyticsEventType && event.data?.email && campaignId) {
        await analyticsService.ingestEvent({
          campaignId: campaignId,
          recipientEmail: event.data.email,
          eventType: analyticsEventType,
          eventData: event.data,
          webhookEventId: event.id || null,
        });

        logger.info('[Newsletter Webhook] Event ingested:', {
          type: analyticsEventType,
          email: event.data.email,
          campaignId: campaignId,
        });
      } else {
        logger.warn('[Newsletter Webhook] Unmapped or incomplete event:', { type: event.type });
      }

      // Always return 200 OK to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error("Newsletter webhook error", error);
      // Still return 200 to prevent webhook retries on our errors
      res.status(200).json({ received: true, error: 'processed with errors' });
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
      
      const templateSchema = z.object({
        name: z.string().min(1, "Template name is required"),
        subject: z.string().min(1, "Subject is required"),
        content: z.string().default(''),
        htmlContent: z.string().optional(),
        images: z.any().optional(),
        variables: z.array(z.string()).optional(),
      });

      const validated = templateSchema.parse(req.body);

      const template = await storage.createNewsletterTemplate({
        userId,
        name: validated.name.trim(),
        subject: validated.subject.trim(),
        content: validated.content,
        htmlContent: validated.htmlContent || null,
        images: validated.images || null,
      });

      res.json(template);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
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

  // Upload image for newsletter editor
  app.post("/api/newsletter/upload-image", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.files || !req.files.image) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageFile = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
      
      // Validate file type
      if (!imageFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "File must be an image" });
      }

      // Validate file size (max 5MB)
      if (imageFile.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Image must be less than 5MB" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Get upload URL
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      logger.info('[Newsletter] Generated presigned URL for image upload');
      
      // Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: imageFile.data,
        headers: {
          'Content-Type': imageFile.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        logger.error('[Newsletter] Storage upload failed:', uploadResponse.status, errorText);
        throw new Error(`Failed to upload to storage: ${uploadResponse.status}`);
      }
      
      // Normalize the path and set public ACL
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL,
        {
          owner: userId,
          visibility: "public",
        }
      );
      
      logger.info('[Newsletter] Image uploaded:', { userId, path: objectPath });
      
      // Construct the full URL that can be used in emails
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : 'http://localhost:5000';
      const url = `${baseUrl}${objectPath}`;

      res.json({ url });
    } catch (error: any) {
      logger.error("Newsletter image upload error", error);
      res.status(500).json({ error: error.message || "Failed to upload image" });
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

  // ============================================================================
  // Architecture 3 Campaign Routes - Using Services
  // ============================================================================

  // Create a new campaign
  app.post("/api/campaigns", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const campaignSchema = z.object({
        subject: z.string().min(1, "Subject is required"),
        content: z.string().min(1, "Content is required"),
        htmlContent: z.string().optional().nullable(),
        preheader: z.string().optional().nullable(),
        fromName: z.string().optional().nullable(),
        recipients: z.array(z.string().email()).optional(),
        sendToAll: z.boolean().optional(),
        templateId: z.string().optional(),
        segmentIds: z.array(z.string()).optional(),
        groupIds: z.array(z.string()).optional(),
        scheduledAt: z.string().datetime().optional(),
        timezone: z.string().optional(),
      });

      const validatedData = campaignSchema.parse(req.body);
      
      // Convert scheduledAt string to Date if present
      const campaignData = {
        ...validatedData,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
      };
      
      const campaign = await campaignService.createCampaign(userId, campaignData);
      res.json(campaign);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Create campaign error", error);
      res.status(500).json({ error: error.message || "Failed to create campaign" });
    }
  });

  // Get campaigns with optional filters
  app.get("/api/campaigns", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.query;
      
      let campaigns = await storage.getNewslettersByUserId(userId);
      
      if (status) {
        campaigns = campaigns.filter(c => c.status === status);
      }
      
      res.json(campaigns);
    } catch (error) {
      logger.error("Get campaigns error", error);
      res.status(500).json({ error: "Failed to get campaigns" });
    }
  });

  // Update campaign
  app.put("/api/campaigns/:id", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = req.params.id;
      
      // Verify ownership
      const existing = await storage.getNewsletter(campaignId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Only allow editing draft and scheduled campaigns
      if (existing.status !== 'draft' && existing.status !== 'scheduled') {
        return res.status(400).json({ error: "Cannot edit campaigns that have been sent" });
      }
      
      // Validate request body
      const updateSchema = z.object({
        subject: z.string().min(1, "Subject is required").optional(),
        content: z.string().min(1, "Content is required").optional(),
        htmlContent: z.string().optional().nullable(),
        preheader: z.string().optional().nullable(),
        fromName: z.string().optional().nullable(),
        recipients: z.array(z.string().email()).optional(),
        sendToAll: z.boolean().optional(),
        groupIds: z.array(z.string()).optional(),
        scheduledAt: z.string().datetime().optional(),
        timezone: z.string().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      
      // Convert scheduledAt string to Date if present
      const updateData: any = {
        ...validatedData,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
      };
      
      // Update campaign
      const updated = await storage.updateNewsletter(campaignId, updateData);
      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Update campaign error", error);
      res.status(500).json({ error: error.message || "Failed to update campaign" });
    }
  });

  // Send campaign immediately
  app.post("/api/campaigns/:id/send", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const result = await campaignService.sendCampaign(req.params.id);
      res.json(result);
    } catch (error: any) {
      logger.error("Send campaign error", error);
      res.status(500).json({ error: error.message || "Failed to send campaign" });
    }
  });

  // Schedule campaign for later
  app.post("/api/campaigns/:id/schedule", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      // Validate schedule data
      const scheduleSchema = z.object({
        scheduledAt: z.string().datetime("Invalid date format. Use ISO 8601 format (e.g., 2024-10-20T15:30:00Z)"),
        timezone: z.string().optional().default('UTC'),
      });

      const validated = scheduleSchema.parse(req.body);
      
      // Validate that scheduledAt is in the future
      const scheduledDate = new Date(validated.scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: "Scheduled time must be in the future" });
      }
      
      const schedule = await campaignService.scheduleCampaign(
        req.params.id,
        scheduledDate,
        validated.timezone
      );
      res.json(schedule);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Schedule campaign error", error);
      res.status(500).json({ error: error.message || "Failed to schedule campaign" });
    }
  });

  // Pause scheduled campaign
  app.post("/api/campaigns/:id/pause", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const result = await campaignService.pauseCampaign(req.params.id);
      res.json(result);
    } catch (error: any) {
      logger.error("Pause campaign error", error);
      res.status(500).json({ error: error.message || "Failed to pause campaign" });
    }
  });

  // Resume paused campaign
  app.post("/api/campaigns/:id/resume", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const result = await campaignService.resumeCampaign(req.params.id);
      res.json(result);
    } catch (error: any) {
      logger.error("Resume campaign error", error);
      res.status(500).json({ error: error.message || "Failed to resume campaign" });
    }
  });

  // ============================================================================
  // Segmentation Routes - Using SegmentationService
  // ============================================================================

  // Create a new segment
  app.post("/api/segments", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate segment data
      const segmentSchema = z.object({
        name: z.string().min(1, "Segment name is required"),
        description: z.string().optional(),
        rules: z.object({
          conditions: z.array(z.object({
            field: z.string(),
            operator: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
          })).min(1, "At least one condition is required"),
          operator: z.enum(['AND', 'OR']),
        }),
      });

      const validated = segmentSchema.parse(req.body);
      const segment = await segmentationService.createSegment(userId, validated);
      res.json(segment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Create segment error", error);
      res.status(500).json({ error: error.message || "Failed to create segment" });
    }
  });

  // Get segments
  app.get("/api/segments", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const segments = await storage.getNewsletterSegmentsByUserId(userId);
      res.json(segments);
    } catch (error) {
      logger.error("Get segments error", error);
      res.status(500).json({ error: "Failed to get segments" });
    }
  });

  // Preview segment subscriber count
  app.post("/api/segments/preview", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const previewSchema = z.object({
        rules: z.object({
          conditions: z.array(z.object({
            field: z.string(),
            operator: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
          })).min(1, "At least one condition is required"),
          operator: z.enum(['AND', 'OR']),
        }),
      });

      const validated = previewSchema.parse(req.body);
      const count = await segmentationService.previewSegment(userId, validated.rules);
      res.json({ subscriberCount: count });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Preview segment error", error);
      res.status(500).json({ error: error.message || "Failed to preview segment" });
    }
  });

  // Get subscribers matching a segment
  app.get("/api/segments/:id/subscribers", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const segment = await storage.getNewsletterSegment(req.params.id);
      
      if (!segment || segment.userId !== userId) {
        return res.status(404).json({ error: "Segment not found" });
      }
      
      const subscribers = await segmentationService.getSegmentSubscribers(userId, segment.rules);
      res.json(subscribers);
    } catch (error: any) {
      logger.error("Get segment subscribers error", error);
      res.status(500).json({ error: error.message || "Failed to get segment subscribers" });
    }
  });

  // ============================================================================
  // A/B Testing Routes
  // ============================================================================

  // Create A/B test for campaign
  app.post("/api/campaigns/:id/ab-test", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      // Validate request body
      const abTestSchema = z.object({
        variantA: z.object({
          subject: z.string().min(1, "Variant A subject is required"),
          content: z.string().min(1, "Variant A content is required"),
          htmlContent: z.string().optional(),
        }),
        variantB: z.object({
          subject: z.string().min(1, "Variant B subject is required"),
          content: z.string().min(1, "Variant B content is required"),
          htmlContent: z.string().optional(),
        }),
        splitPercentage: z.number().min(1).max(99).optional(),
        winnerMetric: z.enum(['open_rate', 'click_rate', 'conversion_rate']),
        testDuration: z.number().positive().optional(),
      });

      const validated = abTestSchema.parse(req.body);
      const abTest = await campaignService.createABTest(req.params.id, validated);
      res.json(abTest);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Create A/B test error", error);
      res.status(500).json({ error: error.message || "Failed to create A/B test" });
    }
  });

  // Get A/B test results
  app.get("/api/campaigns/:id/ab-test/results", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const results = await campaignService.getABTestResults(req.params.id);
      res.json(results);
    } catch (error: any) {
      logger.error("Get A/B test results error", error);
      res.status(500).json({ error: error.message || "Failed to get A/B test results" });
    }
  });

  // Select winning variant
  app.post("/api/campaigns/:id/ab-test/select-winner", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const winnerSchema = z.object({
        winningVariant: z.enum(['A', 'B'], { 
          errorMap: () => ({ message: "Winner ID must be either 'A' or 'B'" }) 
        }),
      });

      const validated = winnerSchema.parse(req.body);
      const result = await campaignService.selectWinner(req.params.id, validated.winningVariant);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Select A/B test winner error", error);
      res.status(500).json({ error: error.message || "Failed to select winner" });
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
      
      const bulkSubscriberSchema = z.object({
        subscribers: z.array(
          z.object({
            email: z.string().email("Invalid email format"),
            name: z.string().optional(),
          })
        ).min(1, "Subscribers array must contain at least one subscriber"),
      });

      const validated = bulkSubscriberSchema.parse(req.body);

      const results = {
        success: [] as string[],
        skipped: [] as { email: string; reason: string }[],
        errors: [] as { email: string; reason: string }[],
      };

      for (const item of validated.subscribers) {
        const email = item.email.trim().toLowerCase();
        const name = item.name?.trim() || null;

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
        total: validated.subscribers.length,
        ...results,
        message: `Imported ${results.success.length} subscribers. ${results.skipped.length} skipped, ${results.errors.length} errors.`,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Bulk import subscribers error", error);
      res.status(500).json({ error: "Failed to import subscribers" });
    }
  });

  app.post("/api/subscribers", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const subscriberSchema = z.object({
        email: z.string().email("Valid email address is required"),
        name: z.string().optional(),
        groupIds: z.array(z.string()).optional(),
      });

      const validated = subscriberSchema.parse(req.body);

      const subscriber = await storage.createSubscriber({
        userId,
        email: validated.email.trim().toLowerCase(),
        name: validated.name?.trim() || null,
      });

      // Add to groups if specified
      if (validated.groupIds && validated.groupIds.length > 0) {
        for (const groupId of validated.groupIds) {
          await storage.addSubscriberToGroup(subscriber.id, groupId);
        }
      }

      res.json(subscriber);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
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
  // Get seller's wholesale products (authenticated)
  app.get("/api/wholesale/products", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await wholesaleService.getProductsBySellerId(userId);
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error fetching seller wholesale products", error);
      res.status(500).json({ message: "Failed to fetch wholesale products" });
    }
  });

  app.get("/api/wholesale/products/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const result = await wholesaleService.getProductsBySellerId(sellerId);
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error fetching seller wholesale products", error);
      res.status(500).json({ message: "Failed to fetch seller wholesale products" });
    }
  });

  app.get("/api/wholesale/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await wholesaleService.getProduct(id);
      if (!result.success) {
        const statusCode = result.statusCode || 500;
        return res.status(statusCode).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error fetching wholesale product", error);
      res.status(500).json({ message: "Failed to fetch wholesale product" });
    }
  });

  app.post("/api/wholesale/products", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await wholesaleService.createProduct(req.body, userId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.status(201).json(result.data);
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
      
      const result = await wholesaleService.bulkUploadProducts({
        userId,
        fileContent,
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          details: result.details,
        });
      }

      res.json({
        success: true,
        ...result.data,
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
      
      const result = await wholesaleService.updateProduct({
        productId: id,
        userId,
        updates: req.body,
      });

      if (!result.success) {
        const statusCode = result.error === "Wholesale product not found" ? 404 : 
                          result.error === "Unauthorized to update this product" ? 403 : 500;
        return res.status(statusCode).json({ message: result.error });
      }

      res.json(result.data);
    } catch (error) {
      logger.error("Error updating wholesale product", error);
      res.status(500).json({ message: "Failed to update wholesale product" });
    }
  });

  app.delete("/api/wholesale/products/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const result = await wholesaleService.deleteProduct({
        productId: id,
        userId,
      });

      if (!result.success) {
        const statusCode = result.error === "Wholesale product not found" ? 404 : 
                          result.error === "Unauthorized to delete this product" ? 403 : 500;
        return res.status(statusCode).json({ message: result.error });
      }

      res.json(result.data);
    } catch (error) {
      logger.error("Error deleting wholesale product", error);
      res.status(500).json({ message: "Failed to delete wholesale product" });
    }
  });

  // Wholesale Invitations Routes
  app.get("/api/wholesale/invitations", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await wholesaleInvitationService.getSellerInvitations(userId);
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ message: result.error });
      }
      res.json(result.invitations);
    } catch (error) {
      logger.error("Error fetching wholesale invitations", error);
      res.status(500).json({ message: "Failed to fetch wholesale invitations" });
    }
  });

  app.post("/api/wholesale/invitations", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await wholesaleService.createInvitation(req.body, userId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.status(201).json(result.data);
    } catch (error) {
      logger.error("Error creating wholesale invitation", error);
      res.status(500).json({ message: "Failed to create wholesale invitation" });
    }
  });

  app.get("/api/wholesale/invitations/token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const result = await wholesaleService.getInvitationByToken(token);
      
      if (!result.success) {
        return res.status(404).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error fetching wholesale invitation", error);
      res.status(500).json({ message: "Failed to fetch wholesale invitation" });
    }
  });

  app.post("/api/wholesale/invitations/:token/accept", requireAuth, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = req.user.claims.sub;
      
      const result = await wholesaleService.acceptInvitation({ token, userId });
      
      if (!result.success) {
        const statusCode = result.error === "Invitation not found" ? 404 : 
                          result.error === "Invitation has already been processed" ? 400 : 500;
        return res.status(statusCode).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error accepting wholesale invitation", error);
      res.status(500).json({ message: "Failed to accept wholesale invitation" });
    }
  });

  app.delete("/api/wholesale/invitations/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const result = await wholesaleService.deleteInvitation(id);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.json(result.data);
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
      const result = await wholesaleService.checkBuyerAccess(userId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error checking wholesale access", error);
      res.status(500).json({ message: "Failed to check wholesale access" });
    }
  });

  app.get("/api/wholesale/buyer/catalog", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await wholesaleService.getBuyerCatalog(userId);
      
      if (!result.success) {
        return res.status(403).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error fetching buyer wholesale catalog", error);
      res.status(500).json({ message: "Failed to fetch catalog" });
    }
  });

  app.get("/api/wholesale/buyer/products/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const result = await wholesaleService.getBuyerProduct({ productId: id, userId });
      
      if (!result.success) {
        const statusCode = result.error === "Product not found" ? 404 : 
                          result.error === "Access denied. Invitation required." ? 403 :
                          result.error === "User not found" ? 403 : 500;
        return res.status(statusCode).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error fetching wholesale product", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Wholesale Orders Routes
  app.get("/api/wholesale/orders", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await wholesaleOrderService.getOrdersBySeller(userId);
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ message: result.error });
      }
      res.json(result.orders);
    } catch (error) {
      logger.error("Error fetching wholesale orders", error);
      res.status(500).json({ message: "Failed to fetch wholesale orders" });
    }
  });

  // Wholesale Buyers Routes
  app.get("/api/wholesale/buyers", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const buyers = await storage.getWholesaleAccessGrantsBySeller(userId);
      res.json(buyers);
    } catch (error) {
      logger.error("Error fetching wholesale buyers", error);
      res.status(500).json({ message: "Failed to fetch wholesale buyers" });
    }
  });

  // Wholesale Invite Route (using enhanced invitation service)
  app.post("/api/wholesale/invite", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email, expiryDays, wholesaleTerms } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const result = await wholesaleInvitationService.createInvitation(
        userId,
        email,
        expiryDays || 7,
        wholesaleTerms
      );
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ message: result.error });
      }
      res.status(201).json(result.invitation);
    } catch (error) {
      logger.error("Error creating wholesale invitation", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Wholesale Buyer Routes
  app.get("/api/wholesale/catalog", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      const { sellerId } = req.query;
      const result = await wholesaleService.getBuyerCatalog(buyerId, sellerId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error fetching buyer catalog", error);
      res.status(500).json({ message: "Failed to fetch catalog" });
    }
  });

  app.post("/api/wholesale/cart", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      const result = await wholesaleService.addToCart(buyerId, req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result.cart);
    } catch (error) {
      logger.error("Error adding to cart", error);
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  app.get("/api/wholesale/cart", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      const result = await wholesaleService.getCart(buyerId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.json(result.cart);
    } catch (error) {
      logger.error("Error fetching cart", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.put("/api/wholesale/cart/item", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      const { productId, variant, quantity } = req.body;
      
      if (!productId || quantity === undefined) {
        return res.status(400).json({ message: "productId and quantity are required" });
      }

      const result = await wholesaleService.updateCartItem(buyerId, productId, variant, quantity);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result.cart);
    } catch (error) {
      logger.error("Error updating cart item", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/wholesale/cart/item", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      const { productId, variant } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: "productId is required" });
      }

      const result = await wholesaleService.removeCartItem(buyerId, productId, variant);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result.cart);
    } catch (error) {
      logger.error("Error removing cart item", error);
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  // Wholesale pricing calculation endpoint (Architecture 3)
  app.post("/api/wholesale/pricing", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      // Zod schema for wholesale pricing request validation
      const wholesalePricingRequestSchema = z.object({
        sellerId: z.string().min(1),
        cartItems: z.array(z.object({
          productId: z.string(),
          quantity: z.number().int().positive(),
          variant: z.object({
            size: z.string().optional(),
            color: z.string().optional(),
            variantId: z.string().optional()
          }).optional()
        })).min(1),
        depositPercentage: z.number().min(0).max(100).optional(),
        depositAmountCents: z.number().int().min(0).optional()
      });

      // Validate request body with Zod schema
      const validation = wholesalePricingRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const { sellerId, cartItems, depositPercentage, depositAmountCents } = validation.data;

      // Calculate wholesale pricing using WholesalePricingService
      const pricingResult = await wholesalePricingService.calculateWholesalePricing({
        cartItems,
        sellerId,
        depositPercentage,
        depositAmountCents,
      });

      if (!pricingResult.success) {
        return res.status(400).json({ error: pricingResult.error || "Failed to calculate pricing" });
      }

      // Return pricing breakdown
      res.json({
        subtotalCents: pricingResult.subtotalCents,
        depositCents: pricingResult.depositCents,
        balanceCents: pricingResult.balanceCents,
        validatedItems: pricingResult.validatedItems,
        moqErrors: pricingResult.moqErrors || [],
      });
    } catch (error: any) {
      logger.error("Error calculating wholesale pricing", error);
      res.status(500).json({ error: error.message || "Failed to calculate pricing" });
    }
  });

  app.post("/api/wholesale/checkout", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      
      // Get cart
      const cartResult = await wholesaleService.getCart(buyerId);
      if (!cartResult.success || !cartResult.cart) {
        return res.status(400).json({ message: "Cart not found" });
      }

      // Validate required fields from request body
      const { sellerId, shippingData, buyerContact, depositTerms, acceptsTerms } = req.body;

      if (!sellerId) {
        return res.status(400).json({ message: "sellerId is required" });
      }

      if (!shippingData || !shippingData.shippingType) {
        return res.status(400).json({ message: "Shipping information is required" });
      }

      if (!buyerContact || !buyerContact.name || !buyerContact.email || !buyerContact.phone || !buyerContact.company) {
        return res.status(400).json({ message: "Complete buyer contact information is required (name, email, phone, company)" });
      }

      if (!acceptsTerms) {
        return res.status(400).json({ message: "You must accept the terms and conditions" });
      }

      // Build complete checkout data
      const checkoutData = {
        sellerId,
        buyerId,
        cartItems: cartResult.cart.items,
        shippingData: {
          shippingType: shippingData.shippingType,
          carrierName: shippingData.carrierName,
          freightAccountNumber: shippingData.freightAccountNumber,  // Changed from carrierAccountNumber
          pickupInstructions: shippingData.pickupInstructions,     // Added for buyer pickup
          pickupAddress: shippingData.pickupAddress,
          invoicingAddress: shippingData.invoicingAddress,
        },
        buyerCompanyName: buyerContact.company,
        buyerEmail: buyerContact.email,
        buyerName: buyerContact.name,
        buyerPhone: buyerContact.phone,
        depositPercentage: depositTerms?.depositPercentage,
        depositAmountCents: depositTerms?.depositAmount ? Math.round(depositTerms.depositAmount * 100) : undefined,
        paymentTerms: req.body.paymentTerms,
        poNumber: req.body.poNumber,
        vatNumber: req.body.vatNumber,
      };

      const result = await wholesaleService.processCheckout(checkoutData);
      
      if (!result.success) {
        return res.status(result.statusCode || 400).json({ message: result.error });
      }

      // Clear cart after successful checkout
      await wholesaleService.clearCart(buyerId);

      res.json({ 
        orderId: result.orderId, 
        orderNumber: result.orderNumber 
      });
    } catch (error) {
      logger.error("Error processing checkout", error);
      res.status(500).json({ message: "Failed to process checkout" });
    }
  });

  app.get("/api/wholesale/orders/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const result = await wholesaleOrderService.getOrder(id);
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ message: result.error });
      }
      res.json(result.order);
    } catch (error) {
      logger.error("Error fetching wholesale order", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Create balance payment intent for wholesale order
  app.post("/api/wholesale/orders/:orderId/balance-payment", requireAuth, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.claims.sub;

      // Get order to verify access and get balance amount
      const orderResult = await wholesaleOrderService.getOrder(orderId);
      
      if (!orderResult.success || !orderResult.order) {
        return res.status(orderResult.statusCode || 404).json({ 
          error: orderResult.error || 'Order not found' 
        });
      }

      const order = orderResult.order;

      // Verify order is in correct status for balance payment
      if (order.status !== 'deposit_paid' && order.status !== 'awaiting_balance') {
        return res.status(400).json({ 
          error: `Cannot create balance payment for order with status: ${order.status}` 
        });
      }

      // Create balance payment intent
      const result = await wholesalePaymentService.createBalancePaymentIntent(
        orderId,
        order.balanceAmountCents,
        {
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          orderNumber: order.orderNumber,
        }
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ clientSecret: result.clientSecret });
    } catch (error: any) {
      logger.error("[API] Balance payment creation error", error);
      res.status(500).json({ error: error.message || "Failed to create balance payment" });
    }
  });

  // Get payment page for balance payment (accessed via email link)
  app.get("/api/wholesale/orders/:orderId/pay-balance", requireAuth, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.claims.sub;

      // Get order to verify access
      const orderResult = await wholesaleOrderService.getOrder(orderId);
      
      if (!orderResult.success || !orderResult.order) {
        return res.status(orderResult.statusCode || 404).json({ 
          error: orderResult.error || 'Order not found' 
        });
      }

      const order = orderResult.order;

      // Verify order is in correct status for balance payment
      if (order.status !== 'deposit_paid' && order.status !== 'awaiting_balance') {
        return res.status(400).json({ 
          error: `Cannot pay balance for order with status: ${order.status}`,
          order 
        });
      }

      // Create balance payment intent
      const result = await wholesalePaymentService.createBalancePaymentIntent(
        orderId,
        order.balanceAmountCents,
        {
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          orderNumber: order.orderNumber,
        }
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // Return payment page data
      res.json({ 
        order,
        clientSecret: result.clientSecret,
        balanceAmount: order.balanceAmountCents,
        currency: order.currency || 'USD'
      });
    } catch (error: any) {
      logger.error("[API] Pay balance page error", error);
      res.status(500).json({ error: error.message || "Failed to load payment page" });
    }
  });

  // Get wholesale order details with all relations
  app.get("/api/wholesale/orders/:orderId/details", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;
      
      const result = await wholesaleOrderService.getOrderDetails(orderId, userId);
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ message: result.error });
      }
      
      res.json(result.orderDetails);
    } catch (error) {
      logger.error("Error fetching wholesale order details", error);
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });

  // Update wholesale order status
  app.post("/api/wholesale/orders/:orderId/update-status", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;
      const { newStatus } = req.body;

      if (!newStatus) {
        return res.status(400).json({ message: "newStatus is required" });
      }

      // Verify user is seller
      const order = await storage.getWholesaleOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.sellerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the order status using storage layer directly
      await storage.updateWholesaleOrderStatus(orderId, newStatus);
      
      // Get updated order
      const updatedOrder = await storage.getWholesaleOrder(orderId);
      
      // Create order event for status change
      await storage.createWholesaleOrderEvent({
        orderId: orderId,
        eventType: 'status_changed',
        eventData: { newStatus, changedBy: userId },
        createdBy: userId,
      });
      
      res.json({ order: updatedOrder });
    } catch (error) {
      logger.error("Error updating wholesale order status", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Update tracking information for wholesale order
  app.post("/api/wholesale/orders/:orderId/tracking", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;
      const { carrier, trackingNumber } = req.body;

      if (!carrier || !trackingNumber) {
        return res.status(400).json({ message: "carrier and trackingNumber are required" });
      }

      // Verify user is seller
      const order = await storage.getWholesaleOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.sellerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const result = await wholesaleShippingService.updateTrackingInfo(orderId, carrier, trackingNumber);
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ message: result.error });
      }
      
      res.json({ success: true });
    } catch (error) {
      logger.error("Error updating tracking information", error);
      res.status(500).json({ message: "Failed to update tracking information" });
    }
  });

  // Cancel wholesale order
  app.post("/api/wholesale/orders/:orderId/cancel", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;
      const { reason } = req.body;

      // Verify user is seller
      const order = await storage.getWholesaleOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.sellerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const result = await wholesaleOrderService.cancelOrder(orderId, userId, reason);
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ message: result.error });
      }
      
      res.json({ order: result.order });
    } catch (error) {
      logger.error("Error cancelling wholesale order", error);
      res.status(500).json({ message: "Failed to cancel order" });
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
        // Find seller by matching order items to seller's products
        const seller = allUsers.find(u => u.role === 'seller' || u.role === 'owner' || u.role === 'admin');
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
      const health: {
        database: "healthy" | "down";
        email: "healthy" | "down";
        stripe: "healthy" | "down";
        webhooks: "healthy" | "down";
        lastChecked: string;
      } = {
        database: "healthy",
        email: "healthy",
        stripe: "healthy",
        webhooks: "healthy",
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

  // Import additional services only for this section
  const { CartService } = await import("./services/cart.service");
  const { TaxService } = await import("./services/tax.service");
  const { calculatePricing, estimateTax } = await import("./services/pricing.service");

  const cartService = new CartService(storage);
  // Note: Tax service is already initialized at the top with proper dependencies
  
  // Note: cartValidationService, shippingService, and orderService are already initialized at the top

  // Cart API - Backend cart management with session-based storage
  app.post("/api/cart/add", async (req: any, res) => {
    try {
      const { productId, quantity = 1, variantId, variant } = req.body;
      const sessionId = req.sessionID;
      const userId = req.user?.claims?.sub;

      if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      if (!sessionId) {
        return res.status(500).json({ error: "Session not available" });
      }

      // ARCHITECTURE 3: Backend validation of variant selection
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Parse variant selection from request
      // Frontend can send either variant object {size, color} or pre-constructed variantId
      let variantSelection: { size?: string; color?: string } | undefined;
      if (variant) {
        variantSelection = variant;
      } else if (variantId) {
        // Parse variantId (format: "size-color" or "size")
        const parts = variantId.split('-');
        if (parts.length >= 2) {
          variantSelection = { size: parts[0], color: parts[1] };
        } else if (parts.length === 1) {
          variantSelection = { size: parts[0] };
        }
      }

      // Validate variant selection
      const validation = productVariantService.validateVariantSelection(product, variantSelection);
      
      if (!validation.valid) {
        logger.warn('[Cart] Variant validation failed', {
          productId,
          productName: product.name,
          variantSelection,
          error: validation.error,
        });
        return res.status(400).json({ error: validation.error });
      }

      // Construct variantId for cart storage
      const finalVariantId = productVariantService.constructVariantId(variantSelection);

      const result = await cartService.addToCart(sessionId, productId, quantity, finalVariantId, userId);
      
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
      const { itemId } = req.body;
      const sessionId = req.sessionID;
      const userId = req.user?.claims?.sub;

      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }

      if (!sessionId) {
        return res.status(500).json({ error: "Session not available" });
      }

      const result = await cartService.removeFromCart(sessionId, itemId, userId);
      res.json(result.cart);
    } catch (error) {
      logger.error("Cart remove error", error);
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  app.post("/api/cart/update", async (req: any, res) => {
    try {
      const { itemId, quantity } = req.body;
      const sessionId = req.sessionID;
      const userId = req.user?.claims?.sub;

      if (!itemId || quantity === undefined) {
        return res.status(400).json({ error: "Item ID and quantity are required" });
      }

      if (!sessionId) {
        return res.status(500).json({ error: "Session not available" });
      }

      const result = await cartService.updateQuantity(sessionId, itemId, quantity, userId);
      res.json(result.cart);
    } catch (error) {
      logger.error("Cart update error", error);
      res.status(500).json({ error: "Failed to update cart" });
    }
  });

  app.delete("/api/cart", async (req: any, res) => {
    try {
      const sessionId = req.sessionID;

      if (!sessionId) {
        return res.status(500).json({ error: "Session not available" });
      }

      const result = await cartService.clearCart(sessionId);
      res.json(result);
    } catch (error) {
      logger.error("Cart clear error", error);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  app.get("/api/cart", async (req: any, res) => {
    try {
      const sessionId = req.sessionID;

      if (!sessionId) {
        return res.status(500).json({ error: "Session not available" });
      }

      const cart = await cartService.getCart(sessionId);
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
      if (error instanceof ConfigurationError) {
        return res.status(400).json({ error: error.message });
      }
      logger.error("Shipping calculate error", error);
      res.status(500).json({ error: "Failed to calculate shipping" });
    }
  });

  // Cart Reservation API - Lifecycle management
  // NOTE: No auth required for cart reservations - these are session-based (guest checkout support)
  // However, sessionId must match req.sessionID to prevent unauthorized access

  // Extend reservation time (call when user is actively filling checkout form)
  app.post("/api/cart/reservations/extend", async (req: any, res) => {
    try {
      // Validate request body with Zod
      const schema = z.object({
        sessionId: z.string().min(1, "Session ID is required"),
        additionalMinutes: z.number().int().positive().optional().default(15),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: fromZodError(parsed.error).message 
        });
      }

      const { sessionId, additionalMinutes } = parsed.data;

      // SECURITY: Verify sessionId matches current session (prevent cross-session manipulation)
      if (sessionId !== req.sessionID) {
        return res.status(403).json({ error: "Session mismatch - cannot extend other sessions" });
      }

      const result = await cartReservationService.extendReservation(sessionId, additionalMinutes);
      
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json({ success: true, expiresAt: result.newExpiresAt });
    } catch (error: any) {
      logger.error("Extend reservation error", error);
      res.status(500).json({ error: "Failed to extend reservation" });
    }
  });

  // Release (cancel) session reservations
  app.delete("/api/cart/reservations/:sessionId", async (req: any, res) => {
    try {
      const { sessionId } = req.params;

      // SECURITY: Verify sessionId matches current session (prevent cross-session manipulation)
      if (sessionId !== req.sessionID) {
        return res.status(403).json({ error: "Session mismatch - cannot release other sessions" });
      }

      const result = await cartReservationService.releaseSessionReservations(sessionId);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ success: true, released: result.released });
    } catch (error: any) {
      logger.error("Release reservations error", error);
      res.status(500).json({ error: "Failed to release reservations" });
    }
  });

  // Get active reservations for session (for debugging/status check)
  app.get("/api/cart/reservations/:sessionId", async (req: any, res) => {
    try {
      const { sessionId } = req.params;

      // SECURITY: Verify sessionId matches current session (prevent cross-session snooping)
      if (sessionId !== req.sessionID) {
        return res.status(403).json({ error: "Session mismatch - cannot view other sessions" });
      }

      const result = await cartReservationService.getSessionReservations(sessionId);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ reservations: result.reservations });
    } catch (error: any) {
      logger.error("Get reservations error", error);
      res.status(500).json({ error: "Failed to get reservations" });
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

      // Calculate order summary manually
      const summary = {
        subtotal: validation.total,
        shipping: shipping.cost,
        tax: taxAmount,
        total: validation.total + shipping.cost + taxAmount,
      };
      
      res.json({
        ...summary,
        shipping,
        validatedItems: validation.items,
      });
    } catch (error) {
      if (error instanceof ConfigurationError) {
        return res.status(400).json({ error: error.message });
      }
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

  // Platform Analytics API - Requires API key authentication
  app.get("/api/platform-analytics", requireApiKey, async (req, res) => {
    try {
      const analytics = await platformAnalyticsService.getPlatformAnalytics();
      res.json(analytics);
    } catch (error) {
      logger.error("[PlatformAnalytics] Failed to get analytics:", error);
      res.status(500).json({ error: "Failed to retrieve platform analytics" });
    }
  });

  // ============================================================================
  // Trade Quotation Routes (Architecture 3)
  // ============================================================================

  // Validation schemas for quotation requests
  const createQuotationSchema = z.object({
    buyerEmail: z.string().email(),
    buyerId: z.string().optional(),
    currency: z.string().default("USD"),
    depositPercentage: z.number().min(0).max(100).default(50),
    validUntil: z.string().datetime().optional(),
    metadata: z.any().optional(),
    items: z.array(z.object({
      description: z.string().min(1),
      productId: z.string().optional(),
      unitPrice: z.number().positive(),
      quantity: z.number().int().positive(),
      taxRate: z.number().min(0).max(100).optional(),
      shippingCost: z.number().min(0).optional(),
    })).min(1),
  });

  const updateQuotationSchema = z.object({
    buyerEmail: z.string().email().optional(),
    buyerId: z.string().optional(),
    depositPercentage: z.number().min(0).max(100).optional(),
    validUntil: z.string().datetime().optional(),
    metadata: z.any().optional(),
    items: z.array(z.object({
      description: z.string().min(1),
      productId: z.string().optional(),
      unitPrice: z.number().positive(),
      quantity: z.number().int().positive(),
      taxRate: z.number().min(0).max(100).optional(),
      shippingCost: z.number().min(0).optional(),
    })).min(1).optional(),
  });

  // ============================================================================
  // Seller Routes (require seller authentication)
  // ============================================================================

  // POST /api/trade/quotations - Create draft quotation
  app.post("/api/trade/quotations", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validation = createQuotationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: fromZodError(validation.error).toString()
        });
      }

      const data = validation.data;
      
      // Create quotation
      const quotation = await quotationService.createQuotation(userId, {
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      });

      logger.info("[Trade] Quotation created", { quotationId: quotation.id, sellerId: userId });
      res.status(201).json(quotation);
    } catch (error: any) {
      logger.error("[Trade] Failed to create quotation", error);
      res.status(500).json({ error: error.message || "Failed to create quotation" });
    }
  });

  // GET /api/trade/quotations - List seller's quotations
  app.get("/api/trade/quotations", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, buyerEmail, limit, offset } = req.query;

      const quotations = await quotationService.listQuotations(userId, {
        status: status as any,
        buyerEmail: buyerEmail as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(quotations);
    } catch (error: any) {
      logger.error("[Trade] Failed to list quotations", error);
      res.status(500).json({ error: error.message || "Failed to list quotations" });
    }
  });

  // GET /api/trade/quotations/:id - Get single quotation
  app.get("/api/trade/quotations/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const quotation = await quotationService.getQuotation(id);
      
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      // Verify seller owns this quotation
      if (quotation.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(quotation);
    } catch (error: any) {
      logger.error("[Trade] Failed to get quotation", error);
      res.status(500).json({ error: error.message || "Failed to get quotation" });
    }
  });

  // PATCH /api/trade/quotations/:id - Update draft quotation
  app.patch("/api/trade/quotations/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      // Validate request body
      const validation = updateQuotationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: fromZodError(validation.error).toString()
        });
      }

      const data = validation.data;

      // Verify ownership and update
      const quotation = await quotationService.getQuotation(id);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      if (quotation.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await quotationService.updateQuotation(id, userId, {
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      });

      logger.info("[Trade] Quotation updated", { quotationId: id, sellerId: userId });
      res.json(updated);
    } catch (error: any) {
      logger.error("[Trade] Failed to update quotation", error);
      res.status(500).json({ error: error.message || "Failed to update quotation" });
    }
  });

  // DELETE /api/trade/quotations/:id - Delete draft quotation
  app.delete("/api/trade/quotations/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const quotation = await quotationService.getQuotation(id);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      if (quotation.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await quotationService.deleteQuotation(id, userId);

      logger.info("[Trade] Quotation deleted", { quotationId: id, sellerId: userId });
      res.json({ success: true });
    } catch (error: any) {
      logger.error("[Trade] Failed to delete quotation", error);
      res.status(500).json({ error: error.message || "Failed to delete quotation" });
    }
  });

  // POST /api/trade/quotations/:id/send - Send quotation to buyer
  app.post("/api/trade/quotations/:id/send", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const quotation = await quotationService.getQuotation(id);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      if (quotation.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Send quotation (updates status to 'sent')
      const updatedQuotation = await quotationService.sendQuotation(id, userId);

      // Send email to buyer
      const emailResult = await quotationEmailService.sendQuotationEmail(id);
      if (!emailResult.success) {
        logger.warn("[Trade] Failed to send quotation email", { quotationId: id, error: emailResult.error });
      }

      logger.info("[Trade] Quotation sent", { quotationId: id, sellerId: userId });
      res.json(updatedQuotation);
    } catch (error: any) {
      logger.error("[Trade] Failed to send quotation", error);
      res.status(500).json({ error: error.message || "Failed to send quotation" });
    }
  });

  // POST /api/trade/quotations/:id/cancel - Cancel quotation
  app.post("/api/trade/quotations/:id/cancel", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { reason } = req.body;

      // Verify ownership
      const quotation = await quotationService.getQuotation(id);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      if (quotation.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const cancelledQuotation = await quotationService.cancelQuotation(id, userId, reason);

      logger.info("[Trade] Quotation cancelled", { quotationId: id, sellerId: userId });
      res.json(cancelledQuotation);
    } catch (error: any) {
      logger.error("[Trade] Failed to cancel quotation", error);
      res.status(500).json({ error: error.message || "Failed to cancel quotation" });
    }
  });

  // POST /api/trade/quotations/:id/request-balance - Request balance payment
  app.post("/api/trade/quotations/:id/request-balance", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const quotation = await quotationService.getQuotation(id);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      if (quotation.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Mark quotation as balance_due
      const updatedQuotation = await quotationService.markBalanceDue(id, userId);

      // Send balance payment request email
      const emailResult = await quotationEmailService.sendBalanceRequestEmail(id);
      if (!emailResult.success) {
        logger.warn("[Trade] Failed to send balance request email", { quotationId: id, error: emailResult.error });
      }

      logger.info("[Trade] Balance payment requested", { quotationId: id, sellerId: userId });
      res.json(updatedQuotation);
    } catch (error: any) {
      logger.error("[Trade] Failed to request balance payment", error);
      res.status(500).json({ error: error.message || "Failed to request balance payment" });
    }
  });

  // ============================================================================
  // Buyer Routes (token-based authentication)
  // ============================================================================

  // GET /api/trade/quotations/view/:token - View quotation (public with token)
  app.get("/api/trade/quotations/view/:token", async (req, res) => {
    try {
      const { token } = req.params;

      // Verify token
      const tokenPayload = await quotationEmailService.verifyAccessToken(token);
      if (!tokenPayload) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Get quotation
      const quotation = await quotationService.getQuotation(tokenPayload.quotationId);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      // Mark as viewed if not already
      if (quotation.status === 'sent') {
        const viewedQuotation = await quotationService.markViewed(quotation.id, tokenPayload.buyerEmail);
        return res.json(viewedQuotation);
      }

      res.json(quotation);
    } catch (error: any) {
      logger.error("[Trade] Failed to view quotation", error);
      res.status(500).json({ error: error.message || "Failed to view quotation" });
    }
  });

  // POST /api/trade/quotations/view/:token/accept - Accept quotation
  app.post("/api/trade/quotations/view/:token/accept", async (req, res) => {
    try {
      const { token } = req.params;

      // Verify token
      const tokenPayload = await quotationEmailService.verifyAccessToken(token);
      if (!tokenPayload) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Accept quotation
      const acceptedQuotation = await quotationService.acceptQuotation(tokenPayload.quotationId, tokenPayload.buyerEmail);

      logger.info("[Trade] Quotation accepted", { quotationId: tokenPayload.quotationId });
      res.json(acceptedQuotation);
    } catch (error: any) {
      logger.error("[Trade] Failed to accept quotation", error);
      res.status(500).json({ error: error.message || "Failed to accept quotation" });
    }
  });

  // POST /api/trade/quotations/view/:token/payment-intent - Create payment intent
  app.post("/api/trade/quotations/view/:token/payment-intent", async (req, res) => {
    try {
      const { token } = req.params;
      const { paymentType } = req.body;

      // Validate payment type
      if (!paymentType || !['deposit', 'balance'].includes(paymentType)) {
        return res.status(400).json({ error: "Invalid payment type. Must be 'deposit' or 'balance'" });
      }

      // Verify token
      const tokenPayload = await quotationEmailService.verifyAccessToken(token);
      if (!tokenPayload) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Create payment intent
      let result;
      if (paymentType === 'deposit') {
        result = await quotationPaymentService.createDepositPaymentIntent(tokenPayload.quotationId);
      } else {
        result = await quotationPaymentService.createBalancePaymentIntent(tokenPayload.quotationId);
      }

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      logger.info("[Trade] Payment intent created", { 
        quotationId: tokenPayload.quotationId, 
        paymentType,
        paymentIntentId: result.paymentIntentId 
      });
      
      res.json({
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
      });
    } catch (error: any) {
      logger.error("[Trade] Failed to create payment intent", error);
      res.status(500).json({ error: error.message || "Failed to create payment intent" });
    }
  });

  // ============================================================================
  // Payment Webhook Routes
  // ============================================================================

  // POST /api/trade/webhooks/stripe - Handle Stripe webhooks for deposit/balance payments
  app.post("/api/trade/webhooks/stripe", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        logger.error("[Trade Webhook] Stripe not configured");
        return res.status(500).json({ error: "Stripe not configured" });
      }

      // Construct event from raw body
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        logger.error("[Trade Webhook] Signature verification failed", { error: err.message });
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      }

      // Handle payment_intent.succeeded event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Check if this is a trade quotation payment
        if (paymentIntent.metadata?.quotationId) {
          const paymentType = paymentIntent.metadata.paymentType;
          
          let result;
          if (paymentType === 'deposit') {
            result = await quotationPaymentService.handleDepositPaidWebhook(paymentIntent.id);
          } else if (paymentType === 'balance') {
            result = await quotationPaymentService.handleBalancePaidWebhook(paymentIntent.id);
          }

          if (result && !result.success) {
            logger.error("[Trade Webhook] Payment processing failed", { 
              error: result.error,
              paymentIntentId: paymentIntent.id 
            });
          } else {
            logger.info("[Trade Webhook] Payment processed successfully", { 
              paymentIntentId: paymentIntent.id,
              quotationId: paymentIntent.metadata.quotationId,
              paymentType
            });
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      logger.error("[Trade Webhook] Webhook processing failed", error);
      res.status(500).json({ error: error.message || "Webhook processing failed" });
    }
  });

  // ============================================================================
  // End Trade Quotation Routes
  // ============================================================================

  // DEVELOPMENT ONLY: Manual payment confirmation for testing webhooks
  if (process.env.NODE_ENV === 'development') {
    app.post("/api/dev/confirm-payment/:orderId", async (req, res) => {
      try {
        const { orderId } = req.params;
        
        // Get order
        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        // Get payment intent ID
        const paymentIntentId = order.stripePaymentIntentId;
        if (!paymentIntentId) {
          return res.status(400).json({ error: "No payment intent found for this order" });
        }

        // Get checkout session ID (if exists)
        const checkoutSessionId = `checkout_session_${orderId}`;

        // Calculate correct payment amount based on payment type
        // Use integer cents to avoid floating-point precision issues
        let amount: number;
        if (order.paymentType === 'deposit') {
          // For deposits, use seller-configured deposit amounts from order items
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          let depositTotal = 0;
          
          for (const item of items) {
            if (item.depositAmount && item.requiresDeposit) {
              const depositPerItem = parseFloat(item.depositAmount);
              const itemDeposit = depositPerItem * item.quantity;
              depositTotal += itemDeposit;
            }
          }
          
          // Calculate in cents to avoid floating-point issues
          const depositCents = Math.round(depositTotal * 100);
          const alreadyPaidCents = Math.round(parseFloat(order.amountPaid || '0') * 100);
          const amountCents = Math.max(0, depositCents - alreadyPaidCents); // Prevent negative amounts
          amount = amountCents / 100;
        } else if (order.paymentType === 'balance') {
          // For balance payments, use remaining balance
          const balanceCents = Math.round(parseFloat(order.remainingBalance || '0') * 100);
          amount = balanceCents / 100;
        } else {
          // For full payments, use total minus already paid
          const totalCents = Math.round(parseFloat(order.total) * 100);
          const alreadyPaidCents = Math.round(parseFloat(order.amountPaid || '0') * 100);
          const amountCents = totalCents - alreadyPaidCents;
          amount = amountCents / 100;
        }

        logger.info('[DEV] Manually confirming payment', {
          orderId,
          paymentIntentId,
          paymentType: order.paymentType ?? undefined,
          amount,
          checkoutSessionId,
        });

        // Call OrderService.confirmPayment() just like the webhook would
        const result = await orderService.confirmPayment(
          paymentIntentId,
          amount,
          checkoutSessionId
        );

        if (result.success) {
          res.json({ 
            success: true, 
            message: 'Payment confirmed, emails sent',
            orderId,
          });
        } else {
          res.status(500).json({ 
            success: false, 
            error: result.error 
          });
        }
      } catch (error: any) {
        logger.error('[DEV] Manual payment confirmation failed', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  const httpServer = createServer(app);

  // Initialize WebSocket for real-time order updates
  const { orderWebSocketService } = await import('./websocket');
  orderWebSocketService.initialize(httpServer);

  return httpServer;
}
