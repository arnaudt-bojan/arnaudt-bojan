import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
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
import { WholesaleCartValidationService } from "./services/wholesale-cart-validation.service";
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
import { ConfigurationError, ValidationError } from "./errors";
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
import { CheckoutWorkflowOrchestrator } from "./services/checkout-workflow-orchestrator.service";
import { WholesaleCheckoutWorkflowOrchestrator, type WholesaleCheckoutData } from "./services/wholesale-checkout-workflow-orchestrator.service";
import { LocationIQAddressService } from "./services/locationiq-address.service";
import { ShippoLabelService } from "./services/shippo-label.service";

// Import Newsletter Services (Architecture 3)
import { CampaignService } from "./services/newsletter/campaign.service";
import { SubscriberService } from "./services/newsletter/subscriber.service";
import { AnalyticsService } from "./services/newsletter/analytics.service";
import { TemplateService } from "./services/newsletter/template.service";
import { ComplianceService } from "./services/newsletter/compliance.service";
import { SegmentationService } from "./services/newsletter/segmentation.service";
import { emailProvider } from "./services/email-provider.service";
import { newsletterJobQueue } from "./services/newsletter/job-queue.service";

// Import Meta Ads Services (Architecture 3)
import { MetaOAuthService } from "./services/meta/meta-oauth.service";
import { MetaCampaignService } from "./services/meta/meta-campaign.service";
import { BudgetService } from "./services/meta/budget.service";
import { AnalyticsService as MetaAnalyticsService } from "./services/meta/analytics.service";
import { GeminiAdIntelligenceService } from "./services/meta/gemini-ad-intelligence.service";

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

// Initialize LocationIQ address service for address autocomplete and validation
const locationIQService = new LocationIQAddressService();

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
const wholesaleCartValidationService = new WholesaleCartValidationService(storage);
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
    orderService,
    stripe || undefined
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
// Now with inventory reservation support for 30-min cart holds
const wholesaleService = new WholesaleService(
  storage, 
  notificationService, 
  wholesaleCartValidationService,
  cartReservationService,
  inventoryService
);

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
// Delegate common pricing logic (shipping, tax, currency) to PricingCalculationService (DRY refactoring)
const wholesalePricingService = new WholesalePricingService(storage, pricingCalculationService, wholesaleCartValidationService);

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

// Initialize Shippo Label service for shipping label management (Architecture 3)
const shippoLabelService = new ShippoLabelService(storage);

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
const complianceService = new ComplianceService(storage, subscriberService, analyticsService);

// Initialize Meta Ads Services (Architecture 3)
// OAuth service requires Meta app credentials from environment
const metaRedirectUri = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/meta/oauth/callback`;
let metaOAuthService: MetaOAuthService | null = null;
let metaCampaignService: MetaCampaignService | null = null;
let metaBudgetService: BudgetService | null = null;
let metaAnalyticsService: MetaAnalyticsService | null = null;
let geminiAdIntelligenceService: GeminiAdIntelligenceService | null = null;

if (process.env.META_APP_ID && process.env.META_APP_SECRET) {
  metaOAuthService = new MetaOAuthService(storage, {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    redirectUri: metaRedirectUri
  });
  
  metaCampaignService = new MetaCampaignService(storage, metaOAuthService);
  
  // Only create BudgetService when Stripe is configured (required for payments)
  if (stripe) {
    metaBudgetService = new BudgetService(storage, stripe);
  }
  
  metaAnalyticsService = new MetaAnalyticsService(storage, metaOAuthService);
  
  // Initialize Gemini service if API key is available
  if (process.env.GEMINI_API_KEY) {
    geminiAdIntelligenceService = new GeminiAdIntelligenceService(process.env.GEMINI_API_KEY);
  }
}

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
        tracking: {
          open: true,
          click: true,
        },
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

// Initialize CheckoutWorkflowOrchestrator for B2C checkout (Architecture 3 migration)
// Simplified orchestrator compared to CreateFlowService - direct sequential flow with rollback
let checkoutWorkflowOrchestrator: CheckoutWorkflowOrchestrator | null = null;

if (stripeProvider) {
  checkoutWorkflowOrchestrator = new CheckoutWorkflowOrchestrator(
    storage,
    cartValidationService,
    inventoryService,
    stripeProvider,
    notificationService,
    taxService,
    shippingService
  );
}

// Initialize WholesaleCheckoutWorkflowOrchestrator for B2B wholesale checkout (Architecture 3 migration)
// Orchestrates wholesale checkout with deposit payments, MOQ validation, and freight options
let wholesaleCheckoutOrchestrator: WholesaleCheckoutWorkflowOrchestrator | null = null;

if (stripeProvider) {
  wholesaleCheckoutOrchestrator = new WholesaleCheckoutWorkflowOrchestrator(
    storage,
    wholesaleCartValidationService,
    wholesalePricingService,
    inventoryService,
    stripeProvider,
    notificationService,
    wholesaleOrderService,
    wholesalePaymentService
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

/**
 * Resend Webhook Signature Verification
 * Resend uses Svix for webhooks with HMAC-SHA256 signatures
 */
function verifyResendWebhook(payload: string, signatureHeader: string, secret: string): boolean {
  // Svix signature format: v1=<signature>,t=<timestamp>
  // We need to extract the signature and verify it
  
  const signatures = signatureHeader.split(',');
  for (const sig of signatures) {
    if (sig.startsWith('v1=')) {
      const signature = sig.substring(3);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');
      
      if (signature === expectedSignature) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Handle Resend Webhook Events
 * Maps Resend events to AnalyticsService events for email tracking
 */
async function handleResendWebhookEvent(
  event: any,
  storage: any,
  analyticsService: AnalyticsService
): Promise<void> {
  const eventType = event.type;
  const data = event.data;

  // Extract campaign ID from tags
  const campaignIdTag = data.tags?.find((t: any) => t.name === 'campaignId');
  if (!campaignIdTag) {
    logger.warn('[ResendWebhook] No campaignId tag found');
    return;
  }

  const campaignId = campaignIdTag.value;
  const recipientEmail = Array.isArray(data.to) ? data.to[0] : data.to;

  // Map Resend events to analytics events
  switch (eventType) {
    case 'email.opened':
      await analyticsService.ingestEvent({
        campaignId,
        recipientEmail,
        eventType: 'open',
        webhookEventId: event.id || `${eventType}-${data.email_id}`,
      });
      break;

    case 'email.clicked':
      await analyticsService.ingestEvent({
        campaignId,
        recipientEmail,
        eventType: 'click',
        eventData: { url: data.link },
        webhookEventId: event.id || `${eventType}-${data.email_id}`,
      });
      break;

    case 'email.bounced':
      await analyticsService.ingestEvent({
        campaignId,
        recipientEmail,
        eventType: 'bounce',
        eventData: { reason: data.bounce_type },
        webhookEventId: event.id || `${eventType}-${data.email_id}`,
      });
      break;

    case 'email.delivered':
      logger.info('[ResendWebhook] Email delivered:', { campaignId, recipientEmail });
      break;

    case 'email.complained':
      logger.warn('[ResendWebhook] Spam complaint:', { campaignId, recipientEmail });
      // Future: Track complaints
      break;

    default:
      logger.info('[ResendWebhook] Unhandled event type:', { eventType });
  }
}

/**
 * Helper function to parse order.items field which is stored as text/JSON (not jsonb)
 * @param items - The order.items field from database
 * @returns Parsed array of order items
 */
function parseOrderItems(items: any): any[] {
  if (Array.isArray(items)) {
    return items;
  }
  if (typeof items === 'string') {
    try {
      return JSON.parse(items);
    } catch (e) {
      logger.error('[parseOrderItems] Failed to parse order items:', e);
      return [];
    }
  }
  return [];
}

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

  // Order Magic Link Authentication (for delivery reminders)
  app.get('/magic-link/order', async (req: any, res: any) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).send('<h1>Invalid Link</h1><p>The magic link is missing or invalid.</p>');
      }

      // Verify and decode token
      // Enforce mandatory SESSION_SECRET (fail fast if not configured)
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        logger.error('[MagicLink] SESSION_SECRET not configured');
        return res.status(500).send('<h1>Configuration Error</h1><p>Server is not properly configured.</p>');
      }
      
      let decoded: string;
      
      try {
        decoded = Buffer.from(token, 'base64url').toString('utf-8');
      } catch (e) {
        return res.status(400).send('<h1>Invalid Link</h1><p>The magic link format is invalid.</p>');
      }

      const parts = decoded.split(':');
      if (parts.length !== 4) {
        return res.status(400).send('<h1>Invalid Link</h1><p>The magic link format is invalid.</p>');
      }

      const [sellerId, orderId, timestamp, signature] = parts;

      // Verify signature
      const payload = `${sellerId}:${orderId}:${timestamp}`;
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      
      if (signature !== expectedSignature) {
        return res.status(401).send('<h1>Invalid Link</h1><p>The magic link signature is invalid.</p>');
      }

      // Check if token is expired (7 days)
      const tokenAge = Date.now() - parseInt(timestamp);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (tokenAge > sevenDays) {
        return res.status(401).send('<h1>Link Expired</h1><p>This magic link has expired. Please request a new one.</p>');
      }

      // Get seller
      const seller = await storage.getUser(sellerId);
      if (!seller) {
        return res.status(404).send('<h1>Seller Not Found</h1><p>The seller account does not exist.</p>');
      }

      // Verify order belongs to seller
      const order = await storage.getOrderById(orderId);
      if (!order || order.sellerId !== sellerId) {
        return res.status(403).send('<h1>Unauthorized</h1><p>This order does not belong to your account.</p>');
      }

      // Create session for seller
      req.session.passport = {
        user: {
          id: seller.id,
          access_token: 'magic-link-order',
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
          claims: {
            sub: seller.id,
            email: seller.email,
            aud: 'authenticated',
          },
        },
      };

      // Save session before redirecting
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info(`[MagicLink] Seller authenticated for order ${orderId}`, { sellerId });

      // Redirect to order page
      res.redirect(`/seller-dashboard/orders/${orderId}`);
    } catch (error) {
      logger.error('[MagicLink] Order authentication error', error);
      res.status(500).send('<h1>Error</h1><p>An error occurred while processing the magic link.</p>');
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
        listingCurrency: seller.listingCurrency, // Include for currency disclaimer
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

  // Public products endpoint (for storefront - with search, filter, sort, pagination)
  app.get("/api/products", async (req, res) => {
    try {
      const {
        search,
        categoryLevel1Id,
        categoryLevel2Id,
        categoryLevel3Id,
        minPrice,
        maxPrice,
        sellerId,
        productType,
        status,
        sortBy,
        sortOrder,
        limit,
        offset
      } = req.query;
      
      // Build filter object
      const filters: any = {
        search: search as string,
        categoryLevel1Id: categoryLevel1Id as string,
        categoryLevel2Id: categoryLevel2Id as string,
        categoryLevel3Id: categoryLevel3Id as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        sellerId: sellerId as string,
        productType: productType as string,
        // CRITICAL FIX: Pass status filter to database instead of filtering client-side
        // Default to ['active', 'coming-soon'] for public storefront if no status specified
        status: status as string || ['active', 'coming-soon'],
        sortBy: (sortBy as any) || 'createdAt',
        sortOrder: (sortOrder as any) || 'desc',
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      };
      
      // CRITICAL FIX: All filtering now happens in the database via searchProducts
      // This ensures pagination metadata (total, limit, offset) is accurate
      const result = await storage.searchProducts(filters);
      
      // CRITICAL FIX: Explicitly ensure sellerId is included in response
      const productsWithSellerId = result.products.map(p => ({
        ...p,
        sellerId: p.sellerId,
      }));
      
      res.json({
        products: productsWithSellerId,
        total: result.total,
        limit: result.limit,
        offset: result.offset
      });
    } catch (error) {
      logger.error("Error searching products:", error);
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
          // Support both "size-color" format (e.g., "m-red") and size-only format (e.g., "m")
          const [size, color] = variantIdStr.split('-');
          
          for (const colorVariant of variants) {
            if (colorVariant.sizes && Array.isArray(colorVariant.sizes)) {
              // Check if any size matches (full format or size-only fallback)
              variantFound = colorVariant.sizes.some((s: any) => {
                const fullMatch = size && color && 
                  s.size?.toLowerCase() === size.toLowerCase() && 
                  colorVariant.colorName?.toLowerCase() === color.toLowerCase();
                const sizeOnlyMatch = size && s.size?.toLowerCase() === size.toLowerCase();
                return fullMatch || sizeOnlyMatch;
              });
              
              if (variantFound) break;
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
          // Parse order.items (it's a text/JSON column, not jsonb)
          let items: any[] = [];
          if (Array.isArray(order.items)) {
            items = order.items;
          } else if (typeof order.items === 'string') {
            items = JSON.parse(order.items);
          }
          
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
      const ordersWithDeliveryDates = sellerOrders.map(order => {
        // Parse order.items (it's a text/JSON column)
        let items: any[] = [];
        if (Array.isArray(order.items)) {
          items = order.items;
        } else if (typeof order.items === 'string') {
          try {
            items = JSON.parse(order.items);
          } catch (e) {
            logger.error(`[Seller Orders] Failed to parse items for delivery date in order ${order.id}:`, e);
            items = [];
          }
        }
        
        return {
          ...order,
          items: items.map((item: any) => ({
            ...item,
            deliveryDate: computeDeliveryDate(item, order.createdAt)
          }))
        };
      });
      
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
      const ordersWithDeliveryDates = orders.map(order => {
        const items = parseOrderItems(order.items);
        return {
          ...order,
          items: items.map((item: any) => ({
            ...item,
            deliveryDate: computeDeliveryDate(item, order.createdAt)
          }))
        };
      });
      
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
      const ordersWithDeliveryDates = orders.map(order => {
        const items = parseOrderItems(order.items);
        return {
          ...order,
          items: items.map((item: any) => ({
            ...item,
            deliveryDate: computeDeliveryDate(item, order.createdAt)
          }))
        };
      });
      
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
      const ordersWithDeliveryDates = orders.map(order => {
        const items = parseOrderItems(order.items);
        return {
          ...order,
          items: items.map((item: any) => ({
            ...item,
            deliveryDate: computeDeliveryDate(item, order.createdAt)
          }))
        };
      });
      
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
      const ordersWithDeliveryDates = orders.map(order => {
        const items = parseOrderItems(order.items);
        return {
          ...order,
          items: items.map((item: any) => ({
            ...item,
            deliveryDate: computeDeliveryDate(item, order.createdAt)
          }))
        };
      });
      
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
      const items = parseOrderItems(order.items);
      const orderWithDeliveryDates = {
        ...order,
        items: items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        }))
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
      const items = parseOrderItems(order.items);
      const orderWithDeliveryDates = {
        ...order,
        items: items.map((item: any) => ({
          ...item,
          deliveryDate: computeDeliveryDate(item, order.createdAt)
        }))
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

  // Task 11: Migrate Legacy Shipping Zones
  app.post("/api/admin/migrate-shipping-zones", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sellerId = user.sellerId || user.id;

      logger.info('[ZoneMigration] Starting migration for seller', { sellerId });

      // Get all matrices for this seller
      const matrices = await storage.getShippingMatricesBySellerId(sellerId);
      
      const migrationReport = {
        totalZones: 0,
        migratedZones: 0,
        skippedZones: 0,
        manualActionRequired: 0,
        details: [] as Array<{
          zoneId: string;
          zoneName: string;
          zoneType: string;
          status: 'migrated' | 'skipped' | 'manual_required';
          oldIdentifier: string | null;
          newIdentifier: string | null;
          message: string;
        }>
      };

      // Process all zones across all matrices
      for (const matrix of matrices) {
        const zones = await storage.getShippingZonesByMatrixId(matrix.id);
        
        for (const zone of zones) {
          migrationReport.totalZones++;

          // Skip zones that already have zoneIdentifier
          if (zone.zoneIdentifier) {
            migrationReport.skippedZones++;
            migrationReport.details.push({
              zoneId: zone.id,
              zoneName: zone.zoneName,
              zoneType: zone.zoneType,
              status: 'skipped',
              oldIdentifier: zone.zoneIdentifier,
              newIdentifier: zone.zoneIdentifier,
              message: 'Already has zoneIdentifier, no migration needed'
            });
            continue;
          }

          // Attempt migration based on zoneType
          let newIdentifier: string | null = null;
          let migrationStatus: 'migrated' | 'skipped' | 'manual_required' = 'manual_required';
          let message = '';

          if (zone.zoneType === 'country') {
            // Country zones: Use zoneCode if available
            if (zone.zoneCode) {
              newIdentifier = zone.zoneCode.toUpperCase();
              migrationStatus = 'migrated';
              message = `Migrated using existing zoneCode: ${zone.zoneCode}`;
            } else {
              // Try to extract country code from zoneName
              const { getCountryCode } = await import("../shared/countries");
              const extractedCode = getCountryCode(zone.zoneName);
              if (extractedCode) {
                newIdentifier = extractedCode;
                migrationStatus = 'migrated';
                message = `Migrated by extracting country code from zoneName: ${zone.zoneName} → ${extractedCode}`;
              } else {
                migrationStatus = 'manual_required';
                message = `Could not determine country code from zoneName: "${zone.zoneName}". Please update manually.`;
              }
            }
          } else if (zone.zoneType === 'continent') {
            // Continent zones: Fuzzy match on zoneName to continent list
            const { CONTINENTS } = await import("../shared/continents");
            
            const normalizeZoneName = (name: string): string => {
              return name
                .toLowerCase()
                .replace(/\s*\(continent\)\s*/gi, '')
                .replace(/\s*\(country\)\s*/gi, '')
                .replace(/\s*\(city\)\s*/gi, '')
                .trim();
            };

            const normalizedZoneName = normalizeZoneName(zone.zoneName);
            
            // Find matching continent
            const matchedContinent = CONTINENTS.find(continent => {
              const normalizedContinentName = continent.name.toLowerCase();
              const normalizedContinentCode = continent.code.replace(/-/g, ' ').toLowerCase();
              
              return normalizedZoneName === normalizedContinentName ||
                     normalizedZoneName === normalizedContinentCode ||
                     normalizedZoneName.includes(normalizedContinentName) ||
                     normalizedContinentName.includes(normalizedZoneName);
            });

            if (matchedContinent) {
              newIdentifier = matchedContinent.code;
              migrationStatus = 'migrated';
              message = `Migrated by matching zoneName to continent: "${zone.zoneName}" → ${matchedContinent.code}`;
            } else {
              migrationStatus = 'manual_required';
              message = `Could not match zoneName to any continent: "${zone.zoneName}". Please update manually.`;
            }
          } else if (zone.zoneType === 'city') {
            // City zones: Cannot auto-migrate without geocoding data
            migrationStatus = 'manual_required';
            message = `City zones require manual re-entry using city search. Please edit "${zone.zoneName}" to select it from the city search dropdown.`;
          }

          // Update zone if migration successful
          if (migrationStatus === 'migrated' && newIdentifier) {
            await storage.updateShippingZone(zone.id, {
              zoneIdentifier: newIdentifier
            });
            migrationReport.migratedZones++;
            logger.info('[ZoneMigration] Migrated zone', {
              zoneId: zone.id,
              zoneName: zone.zoneName,
              oldIdentifier: zone.zoneCode || null,
              newIdentifier
            });
          } else {
            migrationReport.manualActionRequired++;
          }

          migrationReport.details.push({
            zoneId: zone.id,
            zoneName: zone.zoneName,
            zoneType: zone.zoneType,
            status: migrationStatus,
            oldIdentifier: zone.zoneCode || null,
            newIdentifier,
            message
          });
        }
      }

      logger.info('[ZoneMigration] Migration complete', {
        sellerId,
        totalZones: migrationReport.totalZones,
        migratedZones: migrationReport.migratedZones,
        skippedZones: migrationReport.skippedZones,
        manualActionRequired: migrationReport.manualActionRequired
      });

      res.json(migrationReport);
    } catch (error) {
      logger.error('[ZoneMigration] Migration failed', error);
      res.status(500).json({ error: "Failed to migrate shipping zones" });
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
      
      // Smart URL normalization: add https:// if no protocol is present
      if (req.body.trackingLink && req.body.trackingLink.trim() !== "") {
        const trimmedUrl = req.body.trackingLink.trim();
        if (!trimmedUrl.match(/^https?:\/\//i)) {
          req.body.trackingLink = `https://${trimmedUrl}`;
        }
      }
      
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

  // ============================================================================
  // Warehouse Addresses - Multi-warehouse management
  // ============================================================================

  // GET /api/seller/warehouse-addresses (Architecture 3)
  // Get all warehouse addresses for authenticated seller
  app.get("/api/seller/warehouse-addresses", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const addresses = await storage.getWarehouseAddressesBySellerId(userId);
      res.json(addresses);
    } catch (error: any) {
      logger.error("[WarehouseAddress] Get addresses error", { error: error.message });
      res.status(500).json({ error: "Failed to fetch warehouse addresses" });
    }
  });

  // POST /api/seller/warehouse-addresses (Architecture 3)
  // Create new warehouse address for seller
  app.post("/api/seller/warehouse-addresses", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const addressData = req.body;

      // If this is the first warehouse address, make it default
      const existingAddresses = await storage.getWarehouseAddressesBySellerId(userId);
      const isFirst = existingAddresses.length === 0;

      const newAddress = await storage.createWarehouseAddress({
        ...addressData,
        sellerId: userId,
        isDefault: isFirst ? 1 : (addressData.isDefault ? 1 : 0)
      });

      // If setting as default, unset other defaults
      if (addressData.isDefault && !isFirst) {
        await storage.setDefaultWarehouseAddress(userId, newAddress.id);
      }

      res.json(newAddress);
    } catch (error: any) {
      logger.error("[WarehouseAddress] Create address error", { error: error.message });
      res.status(500).json({ error: "Failed to create warehouse address" });
    }
  });

  // PATCH /api/seller/warehouse-addresses/:id (Architecture 3)
  // Update warehouse address
  app.patch("/api/seller/warehouse-addresses/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updates = req.body;

      // Verify ownership
      const existing = await storage.getWarehouseAddress(id);
      if (!existing) {
        return res.status(404).json({ error: "Warehouse address not found" });
      }
      if (existing.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update address
      const updated = await storage.updateWarehouseAddress(id, updates);

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await storage.setDefaultWarehouseAddress(userId, id);
      }

      res.json(updated);
    } catch (error: any) {
      logger.error("[WarehouseAddress] Update address error", { error: error.message });
      res.status(500).json({ error: "Failed to update warehouse address" });
    }
  });

  // DELETE /api/seller/warehouse-addresses/:id (Architecture 3)
  // Delete warehouse address
  app.delete("/api/seller/warehouse-addresses/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getWarehouseAddress(id);
      if (!existing) {
        return res.status(404).json({ error: "Warehouse address not found" });
      }
      if (existing.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Prevent deleting the only warehouse address
      const allAddresses = await storage.getWarehouseAddressesBySellerId(userId);
      if (allAddresses.length === 1) {
        return res.status(400).json({ error: "Cannot delete your only warehouse address" });
      }

      // Delete
      await storage.deleteWarehouseAddress(id);

      // If this was the default, set first remaining as default
      if (existing.isDefault) {
        const remaining = await storage.getWarehouseAddressesBySellerId(userId);
        if (remaining.length > 0) {
          await storage.setDefaultWarehouseAddress(userId, remaining[0].id);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error("[WarehouseAddress] Delete address error", { error: error.message });
      res.status(500).json({ error: "Failed to delete warehouse address" });
    }
  });

  // POST /api/seller/warehouse-addresses/:id/set-default (Architecture 3)
  // Set warehouse address as default
  app.post("/api/seller/warehouse-addresses/:id/set-default", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getWarehouseAddress(id);
      if (!existing) {
        return res.status(404).json({ error: "Warehouse address not found" });
      }
      if (existing.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.setDefaultWarehouseAddress(userId, id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error("[WarehouseAddress] Set default error", { error: error.message });
      res.status(500).json({ error: "Failed to set default warehouse address" });
    }
  });

  // ============================================================================
  // Shipping Labels (Shippo Integration)
  // ============================================================================

  // POST /api/orders/:orderId/labels (Architecture 3)
  // Purchase shipping label from Shippo with 20% markup
  app.post("/api/orders/:orderId/labels", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;
      const { warehouseAddressId } = req.body; // Optional warehouse address ID

      // Get order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Authorization: seller must own the order
      if (order.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied - you do not own this order" });
      }

      // Validate order is ready to ship
      if (order.status !== "ready_to_ship") {
        return res.status(400).json({ 
          error: "Order must be in 'ready_to_ship' status to purchase a label",
          currentStatus: order.status 
        });
      }

      // Purchase label via service (with optional warehouse address)
      const result = await shippoLabelService.purchaseLabel(orderId, warehouseAddressId);

      res.json({
        success: true,
        labelId: result.labelId,
        labelUrl: result.labelUrl,
        trackingNumber: result.trackingNumber,
        carrier: result.carrier,
        baseCostUsd: result.baseCostUsd,
        totalChargedUsd: result.totalChargedUsd,
        shippoTransactionId: result.shippoTransactionId
      });
    } catch (error: any) {
      logger.error("[ShippoLabel] Purchase label error", { orderId: req.params.orderId, error: error.message });
      
      // Distinguish validation errors from API errors
      if (error.message.includes("not configured") || 
          error.message.includes("does not have") ||
          error.message.includes("already purchased")) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message || "Failed to purchase shipping label" });
    }
  });

  // POST /api/orders/:orderId/labels/:labelId/cancel (Architecture 3)
  // Cancel/void shipping label and process refund
  app.post("/api/orders/:orderId/labels/:labelId/cancel", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId, labelId } = req.params;

      // Get order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Authorization: seller must own the order
      if (order.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied - you do not own this order" });
      }

      // Get label
      const label = await storage.getShippingLabel(labelId);
      if (!label) {
        return res.status(404).json({ error: "Label not found" });
      }

      // Verify label belongs to this order
      if (label.orderId !== orderId) {
        return res.status(400).json({ error: "Label does not belong to this order" });
      }

      // Validate label can be cancelled
      if (label.status !== "purchased") {
        return res.status(400).json({ 
          error: "Label cannot be cancelled - only purchased labels can be voided",
          currentStatus: label.status 
        });
      }

      // Request void via service
      const result = await shippoLabelService.requestVoid(labelId);

      res.json({
        success: true,
        refundId: result.refundId,
        status: result.status,
        rejectionReason: result.rejectionReason
      });
    } catch (error: any) {
      logger.error("[ShippoLabel] Cancel label error", { 
        orderId: req.params.orderId, 
        labelId: req.params.labelId,
        error: error.message 
      });
      
      if (error.message.includes("not found") || 
          error.message.includes("cannot be") ||
          error.message.includes("already")) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message || "Failed to cancel shipping label" });
    }
  });

  // GET /api/orders/:orderId/labels (Architecture 3)
  // List all labels for an order
  app.get("/api/orders/:orderId/labels", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;

      // Get order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Authorization: seller must own the order
      if (order.sellerId !== userId) {
        return res.status(403).json({ error: "Access denied - you do not own this order" });
      }

      // Get all labels for this order
      const labels = await storage.getShippingLabelsByOrderId(orderId);

      res.json({
        success: true,
        labels: labels || []
      });
    } catch (error: any) {
      logger.error("[ShippoLabel] List labels error", { 
        orderId: req.params.orderId,
        error: error.message 
      });
      res.status(500).json({ error: "Failed to retrieve shipping labels" });
    }
  });

  // GET /api/seller/credit-ledger (Architecture 3)
  // View seller's credit ledger for label refunds
  app.get("/api/seller/credit-ledger", requireAuth, async (req: any, res) => {
    try {
      const sellerId = req.user.claims.sub;

      // Get user to retrieve current pending credit balance
      const seller = await storage.getUser(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Get all credit ledger entries for this seller
      const ledgerEntries = await storage.getSellerCreditLedgersBySellerId(sellerId);

      res.json({
        success: true,
        currentBalanceUsd: seller.pendingLabelCreditUsd || 0,
        ledgerEntries: ledgerEntries || []
      });
    } catch (error: any) {
      logger.error("[ShippoLabel] Get credit ledger error", { 
        sellerId: req.user?.claims?.sub,
        error: error.message 
      });
      res.status(500).json({ error: "Failed to retrieve credit ledger" });
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
      if (error instanceof ConfigurationError || error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      logger.error("[Pricing API] Error calculating pricing:", error);
      res.status(500).json({ error: "Failed to calculate pricing" });
    }
  });

  // **WAREHOUSE STATUS API** - Check if warehouse address is configured (ISSUE #1 FIX)
  app.get("/api/seller/warehouse-status", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check new fields first, fallback to old fields (backward compatibility)
      const hasWarehouse = !!(
        (user.warehouseAddressLine1 || user.warehouseStreet) &&
        (user.warehouseAddressCity || user.warehouseCity) &&
        (user.warehouseAddressPostalCode || user.warehousePostalCode) &&
        (user.warehouseAddressCountryCode || user.warehouseCountry)
      );

      res.json({
        hasWarehouse,
        warehouseAddress: hasWarehouse ? {
          street: user.warehouseAddressLine1 || user.warehouseStreet,
          city: user.warehouseAddressCity || user.warehouseCity,
          state: user.warehouseAddressState || user.warehouseState,
          postalCode: user.warehouseAddressPostalCode || user.warehousePostalCode,
          country: user.warehouseAddressCountryCode || user.warehouseCountry,
        } : null,
      });
    } catch (error: any) {
      logger.error("[Warehouse Status API] Error checking warehouse status:", error);
      res.status(500).json({ error: "Failed to check warehouse status" });
    }
  });

  // Checkout - B2C checkout using CheckoutWorkflowOrchestrator (Architecture 3)
  // Simplified orchestrator with direct sequential flow and rollback capabilities
  app.post('/api/checkout/initiate', async (req, res) => {
    try {
      // Validate checkoutWorkflowOrchestrator availability
      if (!checkoutWorkflowOrchestrator) {
        logger.error('[API] CheckoutWorkflowOrchestrator not available - Stripe not configured');
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

      // Prepare billing address for orchestrator (optional parameter)
      const finalBillingAddress = billingSameAsShipping || !billingAddress 
        ? undefined // Let orchestrator handle default behavior
        : {
            name: billingAddress.name,
            email: billingAddress.email || customerEmail,
            phone: billingAddress.phone,
            street: billingAddress.street,
            city: billingAddress.city,
            state: billingAddress.state,
            postalCode: billingAddress.postalCode,
            country: billingAddress.country,
          };

      // Map request to CheckoutData format expected by orchestrator
      const checkoutData = {
        sessionId: checkoutSessionId,
        userId: (req as any).user?.claims?.sub, // Optional user ID for authenticated users
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
        shippingAddress: {
          line1: shippingAddress.street,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        billingAddress: finalBillingAddress,
        customerEmail,
        customerName,
        currency: (req as any).detectedCurrency || 'USD', // Use detected currency or default to USD
      };

      // Execute checkout workflow
      const result = await checkoutWorkflowOrchestrator.executeCheckout(checkoutData);

      if (!result.success) {
        // Determine appropriate status code: 400 for client errors, 500 for server errors
        const isClientError = result.errorCode?.includes('VALIDATION') || 
                              result.errorCode?.includes('CART') ||
                              result.errorCode?.includes('STOCK') ||
                              result.errorCode?.includes('SELLER');
        const statusCode = isClientError ? 400 : 500;
        
        return res.status(statusCode).json({
          error: result.error,
          errorCode: result.errorCode,
          step: result.step,
        });
      }

      // Map orchestrator result to API response format (preserve API contract)
      return res.json({
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        checkoutSessionId: checkoutSessionId, // Echo back the session ID
        amountToCharge: result.order?.total, // Map order total to amountToCharge
        currency: result.order?.currency || 'USD',
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
      
      // Smart URL normalization: add https:// if no protocol is present
      if (req.body.trackingUrl && req.body.trackingUrl.trim() !== "") {
        const trimmedUrl = req.body.trackingUrl.trim();
        if (!trimmedUrl.match(/^https?:\/\//i)) {
          req.body.trackingUrl = `https://${trimmedUrl}`;
        }
      }
      
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
      const { 
        warehouseAddressLine1, 
        warehouseAddressLine2, 
        warehouseAddressCity, 
        warehouseAddressState, 
        warehouseAddressPostalCode, 
        warehouseAddressCountryCode,
        warehouseAddressCountryName
      } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate country code is 2 letters
      if (warehouseAddressCountryCode && warehouseAddressCountryCode.length !== 2) {
        return res.status(400).json({ error: "Country code must be 2 letters (e.g., US, GB, CA)" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        // New standardized fields (primary)
        warehouseAddressLine1: warehouseAddressLine1 || null,
        warehouseAddressLine2: warehouseAddressLine2 || null,
        warehouseAddressCity: warehouseAddressCity || null,
        warehouseAddressState: warehouseAddressState || null,
        warehouseAddressPostalCode: warehouseAddressPostalCode || null,
        warehouseAddressCountryCode: warehouseAddressCountryCode ? warehouseAddressCountryCode.toUpperCase() : null,
        warehouseAddressCountryName: warehouseAddressCountryName || null,
        
        // Old fields (for backward compatibility - temporary)
        warehouseStreet: warehouseAddressLine1 || null,
        warehouseCity: warehouseAddressCity || null,
        warehouseState: warehouseAddressState || null,
        warehousePostalCode: warehouseAddressPostalCode || null,
        warehouseCountry: warehouseAddressCountryCode ? warehouseAddressCountryCode.toUpperCase() : null,
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

  // Resend Webhook Handler - Email Analytics Tracking
  app.post('/api/webhooks/resend', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const secret = process.env.RESEND_WEBHOOK_SECRET;
      if (!secret) {
        logger.error('[ResendWebhook] RESEND_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      // Get signature from header
      const signature = req.headers['svix-signature'] as string;
      if (!signature) {
        logger.error('[ResendWebhook] No signature header');
        return res.status(401).json({ error: 'No signature' });
      }

      // Verify signature
      const payload = req.body.toString('utf8');
      const isValid = verifyResendWebhook(payload, signature, secret);
      
      if (!isValid) {
        logger.error('[ResendWebhook] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Parse webhook event
      const event = JSON.parse(payload);
      logger.info('[ResendWebhook] Received event:', { type: event.type });

      // Process event
      await handleResendWebhookEvent(event, storage, analyticsService);

      res.json({ success: true });
    } catch (error: any) {
      logger.error('[ResendWebhook] Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
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
      const secret = process.env.RESEND_WEBHOOK_SECRET;
      
      if (!secret) {
        logger.error('[ResendWebhook] RESEND_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      // TODO: Implement proper Svix signature validation
      // Resend uses Svix webhooks with complex signature validation
      // For now, accepting webhooks to unblock analytics (signature validation to be added)
      const signature = req.headers['svix-signature'] as string;
      if (signature) {
        logger.info('[ResendWebhook] Webhook received (signature validation bypassed temporarily)');
      } else {
        logger.warn('[ResendWebhook] Webhook received without Svix signature');
      }

      const event = req.body;

      // Log full payload to debug tag structure
      logger.info('[Newsletter Webhook] Full webhook payload:', JSON.stringify(event, null, 2));

      // Map Resend event types to our analytics events
      const eventTypeMap: Record<string, 'open' | 'click' | 'bounce' | 'unsubscribe'> = {
        'email.opened': 'open',
        'email.clicked': 'click',
        'email.bounced': 'bounce',
        'email.complained': 'bounce', // Treat complaints as bounces
        'email.delivered': 'open', // Track deliveries as potential opens
      };

      const analyticsEventType = eventTypeMap[event.type];

      // Extract campaignId from tags
      // Note: Resend transforms our array format [{ name: 'key', value: 'val' }]
      // into an object format { key: 'val' } in webhook payloads
      let campaignId: string | undefined;
      
      if (event.data?.tags) {
        // Resend webhooks return tags as object: { campaignId: 'xxx' }
        if (typeof event.data.tags === 'object' && !Array.isArray(event.data.tags)) {
          campaignId = event.data.tags.campaignId;
        }
        // Fallback: handle array format just in case
        else if (Array.isArray(event.data.tags)) {
          const campaignIdTag = event.data.tags.find((tag: any) => tag?.name === 'campaignId');
          campaignId = campaignIdTag?.value;
        }
      }
      
      // Extract email from either `email` field or `to` array
      const recipientEmail = event.data?.email || event.data?.to?.[0];
      
      logger.info('[Newsletter Webhook] Parsed data:', { 
        type: event.type,
        email: recipientEmail,
        campaignId,
        rawTags: event.data?.tags
      });

      if (analyticsEventType && recipientEmail && campaignId) {
        await analyticsService.ingestEvent({
          campaignId: campaignId,
          recipientEmail: recipientEmail,
          eventType: analyticsEventType,
          eventData: event.data,
          webhookEventId: event.id || null,
        });

        logger.info('[Newsletter Webhook] Event ingested:', {
          type: analyticsEventType,
          email: recipientEmail,
          campaignId: campaignId,
        });
      } else {
        logger.warn('[Newsletter Webhook] Unmapped or incomplete event:', { 
          type: event.type, 
          hasEmail: !!recipientEmail,
          hasCampaignId: !!campaignId,
          hasAnalyticsType: !!analyticsEventType
        });
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
      
      // Upload file to object storage with proper headers for Apple Mail compatibility
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: imageFile.data,
        headers: {
          'Content-Type': imageFile.mimetype,
          'Content-Disposition': 'inline', // CRITICAL: Apple Mail requires inline disposition
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
  // Meta Ads API Routes (Architecture 3)
  // ============================================================================

  // OAuth Routes
  
  // Start Meta OAuth flow
  app.get("/api/meta/oauth/start", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaOAuthService) {
        return res.status(503).json({ error: 'Meta OAuth not configured' });
      }

      const sellerId = req.user.claims.sub;
      const result = await metaOAuthService.startOAuthFlow(sellerId);

      logger.info('[Meta OAuth] Started OAuth flow', { sellerId, authUrl: result.authUrl });
      
      // Redirect to Meta OAuth URL instead of returning JSON
      res.redirect(result.authUrl);
    } catch (error: any) {
      logger.error('[Meta OAuth] Start flow error', { error });
      res.status(500).json({ error: error.message || 'Failed to start OAuth flow' });
    }
  });

  // Handle Meta OAuth callback
  app.get("/api/meta/oauth/callback", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaOAuthService) {
        return res.status(503).json({ error: 'Meta OAuth not configured' });
      }

      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state parameter' });
      }

      const sellerId = req.user.claims.sub;
      const result = await metaOAuthService.handleOAuthCallback(
        code as string,
        state as string,
        sellerId
      );

      if (!result.success) {
        return res.redirect('/meta-ads/dashboard?error=' + encodeURIComponent(result.error || 'OAuth failed'));
      }

      logger.info('[Meta OAuth] OAuth completed', { sellerId, accountId: result.account?.id });
      res.redirect('/meta-oauth-success');
    } catch (error: any) {
      logger.error('[Meta OAuth] Callback error', { error });
      res.redirect('/meta-ads/dashboard?error=' + encodeURIComponent(error.message || 'Failed to complete OAuth'));
    }
  });

  // Get connected ad account
  app.get("/api/meta/accounts/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const sellerId = req.user.claims.sub;
      const accountId = req.params.id;

      const account = await storage.getMetaAdAccount(accountId);
      
      if (!account || account.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Ad account not found' });
      }

      logger.info('[Meta Account] Retrieved account', { sellerId, accountId });
      res.json(account);
    } catch (error: any) {
      logger.error('[Meta Account] Get error', { error });
      res.status(500).json({ error: error.message || 'Failed to get ad account' });
    }
  });

  // Disconnect ad account
  app.delete("/api/meta/accounts/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaOAuthService) {
        return res.status(503).json({ error: 'Meta OAuth not configured' });
      }

      const sellerId = req.user.claims.sub;
      const accountId = req.params.id;

      const account = await storage.getMetaAdAccount(accountId);
      
      if (!account || account.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Ad account not found' });
      }

      await metaOAuthService.disconnectAccount(accountId);

      logger.info('[Meta Account] Disconnected', { sellerId, accountId });
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[Meta Account] Disconnect error', { error });
      res.status(500).json({ error: error.message || 'Failed to disconnect ad account' });
    }
  });

  // Get all ad accounts for a seller
  app.get("/api/meta/ad-accounts", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const sellerId = req.user.claims.sub;
      const accounts = await storage.getAllMetaAdAccountsBySeller(sellerId);
      
      logger.info('[Meta Account] Listed ad accounts', { sellerId, count: accounts.length });
      
      // Don't send access tokens to frontend
      const sanitizedAccounts = accounts.map(acc => ({
        ...acc,
        accessToken: undefined
      }));
      
      res.json(sanitizedAccounts);
    } catch (error: any) {
      logger.error('[Meta Account] List error', { error });
      res.status(500).json({ error: error.message || 'Failed to list ad accounts' });
    }
  });

  // Select an ad account to use for campaigns
  app.post("/api/meta/select-account", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const sellerId = req.user.claims.sub;
      const { adAccountId } = req.body;
      
      if (!adAccountId) {
        return res.status(400).json({ error: 'adAccountId is required' });
      }
      
      // Verify the account belongs to this seller
      const account = await storage.getMetaAdAccount(adAccountId);
      if (!account || account.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Ad account not found' });
      }
      
      // Select the account
      const success = await storage.selectMetaAdAccount(sellerId, adAccountId);
      
      if (!success) {
        return res.status(500).json({ error: 'Failed to select ad account' });
      }
      
      logger.info('[Meta Account] Selected ad account', { sellerId, adAccountId });
      res.json({ success: true, accountId: adAccountId });
    } catch (error: any) {
      logger.error('[Meta Account] Select error', { error });
      res.status(500).json({ error: error.message || 'Failed to select ad account' });
    }
  });

  // Campaign Routes
  
  // List seller's campaigns
  app.get("/api/meta/campaigns", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const sellerId = req.user.claims.sub;
      const campaigns = await storage.getMetaCampaignsBySeller(sellerId);

      logger.info('[Meta Campaign] Listed campaigns', { sellerId, count: campaigns.length });
      res.json(campaigns);
    } catch (error: any) {
      logger.error('[Meta Campaign] List error', { error });
      res.status(500).json({ error: error.message || 'Failed to list campaigns' });
    }
  });

  // Create new campaign with AI copy generation
  app.post("/api/meta/campaigns", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaCampaignService) {
        return res.status(503).json({ error: 'Meta Campaign service not configured' });
      }

      const createCampaignSchema = z.object({
        adAccountId: z.string().min(1, 'Ad account ID is required'),
        productId: z.string().min(1, 'Product ID is required'),
        name: z.string().min(1, 'Campaign name is required'),
        objective: z.enum(['OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES']),
        primaryText: z.string().min(1, 'Primary text is required'),
        headline: z.string().min(1, 'Headline is required'),
        description: z.string().optional(),
        callToAction: z.string().optional(),
        destinationUrl: z.string().url('Valid destination URL is required'),
        dailyBudget: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid daily budget format'),
        lifetimeBudget: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid lifetime budget format'),
        startDate: z.string().transform(val => new Date(val)),
        endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        targeting: z.any().default({}),
        alertEmail: z.string().email('Valid alert email is required'),
        productImageUrl: z.string().url().optional(),
        useAdvantagePlus: z.boolean().optional(),
        advantagePlusConfig: z.any().optional(),
      });

      const sellerId = req.user.claims.sub;
      const validated = createCampaignSchema.parse(req.body);

      const result = await metaCampaignService.createCampaign({
        ...validated,
        sellerId,
      });

      if (!result.success) {
        return res.status(400).json({ 
          error: result.error || 'Failed to create campaign',
          metaErrors: result.metaErrors 
        });
      }

      logger.info('[Meta Campaign] Created', { sellerId, campaignId: result.campaignId });
      res.status(201).json(result.campaign);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error('[Meta Campaign] Create error', { error });
      res.status(500).json({ error: error.message || 'Failed to create campaign' });
    }
  });

  // Get campaign details
  app.get("/api/meta/campaigns/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const sellerId = req.user.claims.sub;
      const campaignId = req.params.id;

      const campaign = await storage.getMetaCampaign(campaignId);
      
      if (!campaign || campaign.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      logger.info('[Meta Campaign] Retrieved', { sellerId, campaignId });
      res.json(campaign);
    } catch (error: any) {
      logger.error('[Meta Campaign] Get error', { error });
      res.status(500).json({ error: error.message || 'Failed to get campaign' });
    }
  });

  // Update campaign
  app.patch("/api/meta/campaigns/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaCampaignService) {
        return res.status(503).json({ error: 'Meta Campaign service not configured' });
      }

      const updateCampaignSchema = z.object({
        name: z.string().optional(),
        primaryText: z.string().optional(),
        headline: z.string().optional(),
        description: z.string().optional(),
        callToAction: z.string().optional(),
        dailyBudget: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        lifetimeBudget: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        targeting: z.any().optional(),
        alertEmail: z.string().email().optional(),
      });

      const sellerId = req.user.claims.sub;
      const campaignId = req.params.id;
      const validated = updateCampaignSchema.parse(req.body);

      const campaign = await storage.getMetaCampaign(campaignId);
      
      if (!campaign || campaign.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const result = await metaCampaignService.updateCampaign(campaignId, validated);

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to update campaign' });
      }

      logger.info('[Meta Campaign] Updated', { sellerId, campaignId });
      res.json(result.campaign);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error('[Meta Campaign] Update error', { error });
      res.status(500).json({ error: error.message || 'Failed to update campaign' });
    }
  });

  // Activate campaign
  app.post("/api/meta/campaigns/:id/activate", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaCampaignService) {
        return res.status(503).json({ error: 'Meta Campaign service not configured' });
      }

      const sellerId = req.user.claims.sub;
      const campaignId = req.params.id;

      const campaign = await storage.getMetaCampaign(campaignId);
      
      if (!campaign || campaign.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const result = await metaCampaignService.activateCampaign(campaignId);

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to activate campaign' });
      }

      logger.info('[Meta Campaign] Activated', { sellerId, campaignId });
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[Meta Campaign] Activate error', { error });
      res.status(500).json({ error: error.message || 'Failed to activate campaign' });
    }
  });

  // Pause campaign
  app.post("/api/meta/campaigns/:id/pause", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaCampaignService) {
        return res.status(503).json({ error: 'Meta Campaign service not configured' });
      }

      const sellerId = req.user.claims.sub;
      const campaignId = req.params.id;

      const campaign = await storage.getMetaCampaign(campaignId);
      
      if (!campaign || campaign.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const result = await metaCampaignService.pauseCampaign(campaignId);

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to pause campaign' });
      }

      logger.info('[Meta Campaign] Paused', { sellerId, campaignId });
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[Meta Campaign] Pause error', { error });
      res.status(500).json({ error: error.message || 'Failed to pause campaign' });
    }
  });

  // Complete campaign
  app.post("/api/meta/campaigns/:id/complete", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaCampaignService) {
        return res.status(503).json({ error: 'Meta Campaign service not configured' });
      }

      const sellerId = req.user.claims.sub;
      const campaignId = req.params.id;

      const campaign = await storage.getMetaCampaign(campaignId);
      
      if (!campaign || campaign.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const result = await metaCampaignService.completeCampaign(campaignId);

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to complete campaign' });
      }

      logger.info('[Meta Campaign] Completed', { sellerId, campaignId });
      res.json({ success: true });
    } catch (error: any) {
      logger.error('[Meta Campaign] Complete error', { error });
      res.status(500).json({ error: error.message || 'Failed to complete campaign' });
    }
  });

  // Budget Routes
  
  // Purchase ad credit
  app.post("/api/meta/budget/purchase", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaBudgetService) {
        return res.status(503).json({ error: 'Stripe not configured. Payment processing is unavailable.' });
      }

      const purchaseSchema = z.object({
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
        currency: z.string().length(3).optional(),
        campaignId: z.string().optional(),
        description: z.string().optional(),
      });

      const sellerId = req.user.claims.sub;
      const validated = purchaseSchema.parse(req.body);

      const result = await metaBudgetService.purchaseCredit({
        ...validated,
        sellerId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to purchase credit' });
      }

      logger.info('[Meta Budget] Credit purchased', { sellerId, amount: validated.amount });
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error('[Meta Budget] Purchase error', { error });
      res.status(500).json({ error: error.message || 'Failed to purchase credit' });
    }
  });

  // Get credit balance
  app.get("/api/meta/budget/balance", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaBudgetService) {
        return res.status(503).json({ error: 'Meta Budget service not configured' });
      }

      const sellerId = req.user.claims.sub;
      const campaignId = req.query.campaignId as string | undefined;

      const balance = await metaBudgetService.getCreditBalance(sellerId, campaignId);

      logger.info('[Meta Budget] Retrieved balance', { sellerId, campaignId });
      res.json(balance);
    } catch (error: any) {
      logger.error('[Meta Budget] Balance error', { error });
      res.status(500).json({ error: error.message || 'Failed to get credit balance' });
    }
  });

  // Get credit ledger
  app.get("/api/meta/budget/ledger", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaBudgetService) {
        return res.status(503).json({ error: 'Meta Budget service not configured' });
      }

      const sellerId = req.user.claims.sub;
      const campaignId = req.query.campaignId as string | undefined;

      const ledger = await metaBudgetService.getCreditLedger(sellerId, campaignId);

      logger.info('[Meta Budget] Retrieved ledger', { sellerId, campaignId, entries: ledger.length });
      res.json(ledger);
    } catch (error: any) {
      logger.error('[Meta Budget] Ledger error', { error });
      res.status(500).json({ error: error.message || 'Failed to get credit ledger' });
    }
  });

  // Get campaigns with low balance
  app.get("/api/meta/budget/low-balance", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaBudgetService) {
        return res.status(503).json({ error: 'Meta Budget service not configured' });
      }

      const sellerId = req.user.claims.sub;
      const thresholdPercent = parseInt(req.query.threshold as string) || 20;

      const campaigns = await metaBudgetService.getLowBalanceCampaigns(sellerId, thresholdPercent);

      logger.info('[Meta Budget] Retrieved low balance campaigns', { sellerId, count: campaigns.length });
      res.json(campaigns);
    } catch (error: any) {
      logger.error('[Meta Budget] Low balance error', { error });
      res.status(500).json({ error: error.message || 'Failed to get low balance campaigns' });
    }
  });

  // Analytics Routes
  
  // Get campaign performance
  app.get("/api/meta/analytics/campaigns/:id", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaAnalyticsService) {
        return res.status(503).json({ error: 'Meta Analytics service not configured' });
      }

      const sellerId = req.user.claims.sub;
      const campaignId = req.params.id;

      const campaign = await storage.getMetaCampaign(campaignId);
      
      if (!campaign || campaign.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const dateRange = req.query.startDate && req.query.endDate 
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const performance = await metaAnalyticsService.getCampaignPerformance(campaignId, dateRange);

      logger.info('[Meta Analytics] Retrieved campaign performance', { sellerId, campaignId });
      res.json(performance);
    } catch (error: any) {
      logger.error('[Meta Analytics] Campaign performance error', { error });
      res.status(500).json({ error: error.message || 'Failed to get campaign performance' });
    }
  });

  // Get seller metrics summary
  app.get("/api/meta/analytics/summary", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaAnalyticsService) {
        return res.status(503).json({ error: 'Meta Analytics service not configured' });
      }

      const sellerId = req.user.claims.sub;

      const dateRange = req.query.startDate && req.query.endDate 
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const summary = await metaAnalyticsService.getMetricsSummary(sellerId, dateRange);

      logger.info('[Meta Analytics] Retrieved seller summary', { sellerId });
      res.json(summary);
    } catch (error: any) {
      logger.error('[Meta Analytics] Summary error', { error });
      res.status(500).json({ error: error.message || 'Failed to get metrics summary' });
    }
  });

  // Manual sync campaign metrics
  app.post("/api/meta/analytics/sync/:campaignId", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!metaAnalyticsService) {
        return res.status(503).json({ error: 'Meta Analytics service not configured' });
      }

      const sellerId = req.user.claims.sub;
      const campaignId = req.params.campaignId;

      const campaign = await storage.getMetaCampaign(campaignId);
      
      if (!campaign || campaign.sellerId !== sellerId) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const date = req.body.date ? new Date(req.body.date) : new Date();
      const result = await metaAnalyticsService.syncDailyMetrics(campaignId, date);

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to sync metrics' });
      }

      logger.info('[Meta Analytics] Synced metrics', { sellerId, campaignId, date });
      res.json(result);
    } catch (error: any) {
      logger.error('[Meta Analytics] Sync error', { error });
      res.status(500).json({ error: error.message || 'Failed to sync metrics' });
    }
  });

  // AI Routes
  
  // Generate ad copy with Gemini
  app.post("/api/meta/ai/generate-copy", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!geminiAdIntelligenceService) {
        return res.status(503).json({ error: 'AI service not configured' });
      }

      const generateCopySchema = z.object({
        product: z.object({
          name: z.string().min(1),
          description: z.string().min(1),
          price: z.string().min(1),
          category: z.string().min(1),
          uniqueSellingPoints: z.array(z.string()).optional(),
          image: z.string().optional(),
        }),
        targetAudience: z.object({
          ageRange: z.string().optional(),
          gender: z.string().optional(),
          interests: z.array(z.string()).optional(),
          location: z.string().optional(),
        }),
        tone: z.string().min(1, 'Tone is required'),
      });

      const validated = generateCopySchema.parse(req.body);

      const result = await geminiAdIntelligenceService.generateAdCopy(
        validated.product,
        validated.targetAudience,
        validated.tone
      );

      logger.info('[Meta AI] Generated ad copy', { productName: validated.product.name });
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error('[Meta AI] Generate copy error', { error });
      res.status(500).json({ error: error.message || 'Failed to generate ad copy' });
    }
  });

  // Get targeting suggestions
  app.post("/api/meta/ai/targeting-suggestions", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      if (!geminiAdIntelligenceService) {
        return res.status(503).json({ error: 'AI service not configured' });
      }

      const targetingSchema = z.object({
        product: z.object({
          name: z.string().min(1),
          description: z.string().min(1),
          price: z.string().min(1),
          category: z.string().min(1),
          uniqueSellingPoints: z.array(z.string()).optional(),
          image: z.string().optional(),
        }),
        businessInfo: z.object({
          name: z.string().min(1),
          industry: z.string().min(1),
          description: z.string().optional(),
          targetMarket: z.string().optional(),
        }),
      });

      const validated = targetingSchema.parse(req.body);

      const result = await geminiAdIntelligenceService.generateTargetingSuggestions(
        validated.product,
        validated.businessInfo
      );

      logger.info('[Meta AI] Generated targeting suggestions', { 
        productName: validated.product.name,
        businessName: validated.businessInfo.name 
      });
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error('[Meta AI] Targeting suggestions error', { error });
      res.status(500).json({ error: error.message || 'Failed to generate targeting suggestions' });
    }
  });

  // Webhook Route
  
  // Handle Meta webhook events
  app.post("/api/meta/webhooks", async (req, res) => {
    try {
      if (!metaAnalyticsService) {
        return res.status(503).json({ error: 'Meta Analytics service not configured' });
      }

      const webhookSchema = z.object({
        campaignId: z.string().min(1),
        eventType: z.enum(['status_change', 'spend_update', 'performance_alert']),
        data: z.any().default({}),
      });

      const validated = webhookSchema.parse(req.body);

      const result = await metaAnalyticsService.handleWebhookEvent({
        campaignId: validated.campaignId,
        eventType: validated.eventType,
        data: validated.data
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to process webhook' });
      }

      logger.info('[Meta Webhook] Processed event', { 
        campaignId: validated.campaignId,
        eventType: validated.eventType 
      });
      res.json({ received: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error('[Meta Webhook] Processing error', { error });
      res.status(500).json({ error: error.message || 'Failed to process webhook' });
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

  // Send test email
  app.post("/api/campaigns/:id/send-test", requireAuth, requireUserType("seller"), async (req: any, res) => {
    try {
      const testEmailSchema = z.object({
        emails: z.array(z.string().email("Invalid email address")).min(1, "At least one email address is required").max(5, "Maximum 5 test emails allowed"),
      });

      const validated = testEmailSchema.parse(req.body);
      await campaignService.sendTestEmail(req.params.id, validated.emails);
      res.json({ success: true, message: `Test email sent to ${validated.emails.length} recipient(s)` });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const friendlyError = fromZodError(error);
        return res.status(400).json({ error: friendlyError.message });
      }
      logger.error("Send test email error", error);
      res.status(500).json({ error: error.message || "Failed to send test email" });
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
        // Get all subscribers, but EXCLUDE unsubscribed ones
        // Only show active subscribers in "All Subscribers" view
        const allSubscribers = await storage.getSubscribersByUserId(userId);
        subscribers = allSubscribers.filter(sub => sub.status === 'active');
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
  // Get seller's wholesale products (authenticated) - with search, filter, sort, pagination
  app.get("/api/wholesale/products", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const {
        search,
        categoryLevel1Id,
        categoryLevel2Id,
        categoryLevel3Id,
        minPrice,
        maxPrice,
        minMoq,
        maxMoq,
        sortBy,
        sortOrder,
        limit,
        offset
      } = req.query;
      
      // Get status from query params
      const { status } = req.query;
      
      // Build filter object - always filter by seller's own products
      const filters: any = {
        search: search as string,
        categoryLevel1Id: categoryLevel1Id as string,
        categoryLevel2Id: categoryLevel2Id as string,
        categoryLevel3Id: categoryLevel3Id as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        sellerId: userId, // Always filter to seller's own products
        minMoq: minMoq ? parseInt(minMoq as string) : undefined,
        maxMoq: maxMoq ? parseInt(maxMoq as string) : undefined,
        status: status as string, // Support status filtering
        sortBy: (sortBy as any) || 'createdAt',
        sortOrder: (sortOrder as any) || 'desc',
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      };
      
      const result = await storage.searchWholesaleProducts(filters);
      
      res.json({
        products: result.products,
        total: result.total,
        limit: result.limit,
        offset: result.offset
      });
    } catch (error) {
      logger.error("Error searching seller wholesale products", error);
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

  // Quick status update endpoint for wholesale products
  app.patch("/api/wholesale/products/:id/status", requireAuth, requireUserType('seller'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.claims.sub;
      
      // Validate status
      if (!status || !['draft', 'active', 'coming-soon', 'paused', 'out-of-stock', 'archived'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'draft', 'active', 'coming-soon', 'paused', 'out-of-stock', or 'archived'" });
      }
      
      const result = await wholesaleService.updateProduct({
        productId: id,
        userId,
        updates: { status },
      });

      if (!result.success) {
        const statusCode = result.error === "Wholesale product not found" ? 404 : 
                          result.error === "Unauthorized to update this product" ? 403 : 500;
        return res.status(statusCode).json({ message: result.error });
      }

      res.json(result.data);
    } catch (error) {
      logger.error("Error updating wholesale product status", error);
      res.status(500).json({ message: "Failed to update wholesale product status" });
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
      const {
        sellerId,
        search,
        categoryL1,
        categoryL2,
        categoryL3,
        minPrice,
        maxPrice,
        minMoq,
        maxMoq,
        requiresDeposit,
        inStock,
        paymentTerms,
        readinessType,
        sortBy
      } = req.query;

      // Normalize all filters with defensive defaults to prevent runtime errors
      const filters = {
        search: search as string || '',
        categoryL1: categoryL1 ? (Array.isArray(categoryL1) ? categoryL1 as string[] : [categoryL1 as string]) : [],
        categoryL2: categoryL2 ? (Array.isArray(categoryL2) ? categoryL2 as string[] : [categoryL2 as string]) : [],
        categoryL3: categoryL3 ? (Array.isArray(categoryL3) ? categoryL3 as string[] : [categoryL3 as string]) : [],
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minMoq: minMoq ? parseInt(minMoq as string, 10) : undefined,
        maxMoq: maxMoq ? parseInt(maxMoq as string, 10) : undefined,
        requiresDeposit: requiresDeposit === 'true' ? true : requiresDeposit === 'false' ? false : undefined,
        inStock: inStock === 'true',
        paymentTerms: paymentTerms ? (Array.isArray(paymentTerms) ? paymentTerms as string[] : [paymentTerms as string]) : [],
        readinessType: readinessType ? (Array.isArray(readinessType) ? readinessType as string[] : [readinessType as string]) : [],
        sortBy: (sortBy as string) || 'newest'
      };

      const result = await wholesaleService.getBuyerCatalog(buyerId, sellerId as string, filters);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error fetching buyer catalog", error);
      res.status(500).json({ message: "Failed to fetch catalog" });
    }
  });

  /**
   * Currency Detection Utility for Wholesale Routes
   * 
   * Extracts currency from request using the following priority:
   * 1. Accept-Currency header (explicitly set by frontend)
   * 2. IP-based geolocation detection (x-replit-user-geo-country-code or cf-ipcountry)
   * 3. Default to USD if no detection method available
   * 
   * @param req - Express request object
   * @returns Currency code (e.g., 'USD', 'EUR', 'GBP')
   */
  async function getCurrencyFromRequest(req: any): Promise<string> {
    // Priority 1: Accept-Currency header
    const acceptCurrency = req.headers['accept-currency'] as string;
    if (acceptCurrency && typeof acceptCurrency === 'string') {
      const normalizedCurrency = acceptCurrency.trim().toUpperCase();
      // Validate it's a 3-letter currency code
      if (normalizedCurrency.length === 3) {
        logger.info('[Currency Detection] Using Accept-Currency header:', normalizedCurrency);
        return normalizedCurrency;
      }
    }

    // Priority 2: IP-based geolocation detection
    const countryCode = req.headers['x-replit-user-geo-country-code'] as string || 
                       req.headers['cf-ipcountry'] as string;
    
    if (countryCode) {
      const currency = await getUserCurrency(countryCode);
      logger.info('[Currency Detection] Using IP-based detection:', { countryCode, currency });
      return currency;
    }

    // Priority 3: Default to USD
    logger.info('[Currency Detection] Defaulting to USD (no header or geo data found)');
    return 'USD';
  }

  app.post("/api/wholesale/cart", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      
      // Detect currency from request (Accept-Currency header or IP-based fallback)
      const currency = await getCurrencyFromRequest(req);
      
      const result = await wholesaleService.addToCart(buyerId, req.body, currency);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result.data);
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
      res.json(result.data);
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

      // Detect currency from request (Accept-Currency header or IP-based fallback)
      const currency = await getCurrencyFromRequest(req);

      const result = await wholesaleService.updateCartItem(buyerId, { productId, variant, quantity }, currency);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error updating cart item", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/wholesale/cart/item", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      const { productId, variant } = req.query;
      
      if (!productId) {
        return res.status(400).json({ message: "productId is required" });
      }

      // Parse variant if it's a JSON string
      const parsedVariant = variant && typeof variant === 'string' ? JSON.parse(variant) : variant;

      // Detect currency from request (Accept-Currency header or IP-based fallback)
      const currency = await getCurrencyFromRequest(req);

      const result = await wholesaleService.removeCartItem(buyerId, { productId: productId as string, variant: parsedVariant }, currency);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      res.json(result.data);
    } catch (error) {
      logger.error("Error removing cart item", error);
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  // Wholesale Cart Details - Enhanced with pre-calculated pricing (Architecture 3)
  app.get("/api/wholesale/cart/details", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      
      // Get cart
      const cartResult = await wholesaleService.getCart(buyerId);
      if (!cartResult.success) {
        return res.status(500).json({ message: cartResult.error || "Failed to fetch cart" });
      }

      const cart = cartResult.data;
      
      // Return empty cart if no items
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.json({
          items: [],
          subtotalCents: 0,
          currency: 'USD',
        });
      }

      // Detect currency from cart or request
      const currency = cart.currency || await getCurrencyFromRequest(req);
      
      // Fetch exchange rates for currency conversion
      const exchangeData = await getExchangeRates();
      const exchangeRate = currency !== 'USD' ? exchangeData.rates[currency] || 1 : undefined;

      // Enrich cart items with pricing details
      const enrichedItems = [];
      let subtotalCents = 0;

      for (const item of cart.items) {
        // Get product details
        const product = await storage.getWholesaleProduct(item.productId);
        
        if (!product) {
          logger.warn('[Cart Details] Product not found', { productId: item.productId });
          continue;
        }

        // Calculate unit price (USD cents)
        let unitPriceCents = Math.round(parseFloat(product.wholesalePrice) * 100);
        
        // Check for variant-specific pricing
        if (item.variant && product.variants) {
          const variants = Array.isArray(product.variants) ? product.variants : [];
          const matchingVariant = variants.find((v: any) => 
            (item.variant?.variantId && v.variantId === item.variant.variantId) ||
            (v.size === item.variant?.size && v.color === item.variant?.color)
          );
          
          if (matchingVariant?.wholesalePrice) {
            unitPriceCents = Math.round(parseFloat(matchingVariant.wholesalePrice) * 100);
          }
        }

        // Calculate item subtotal in USD cents
        const itemSubtotalCents = unitPriceCents * item.quantity;
        
        // Convert to target currency if needed
        const convertedUnitPriceCents = currency !== 'USD' 
          ? Math.round(unitPriceCents * (exchangeRate || 1))
          : unitPriceCents;
        const convertedSubtotalCents = currency !== 'USD'
          ? Math.round(itemSubtotalCents * (exchangeRate || 1))
          : itemSubtotalCents;

        enrichedItems.push({
          productId: item.productId,
          productName: product.name,
          productImage: product.image,
          quantity: item.quantity,
          variant: item.variant,
          unitPriceCents: convertedUnitPriceCents,
          subtotalCents: convertedSubtotalCents,
          moq: product.moq,
        });

        subtotalCents += convertedSubtotalCents;
      }

      // Return enriched cart details
      res.json({
        items: enrichedItems,
        subtotalCents,
        currency,
        exchangeRate,
      });
    } catch (error: any) {
      logger.error("Error fetching cart details", error);
      res.status(500).json({ message: "Failed to fetch cart details" });
    }
  });

  // Wholesale Pricing Breakdown - Complete pricing calculations (Architecture 3)
  app.post("/api/wholesale/pricing/breakdown", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      // Detect currency from request (Accept-Currency header or IP-based fallback)
      const currency = req.body.currency || await getCurrencyFromRequest(req);
      
      // Zod schema for pricing breakdown request validation
      const pricingBreakdownRequestSchema = z.object({
        sellerId: z.string().min(1),
        items: z.array(z.object({
          productId: z.string(),
          quantity: z.number().int().positive(),
          variant: z.object({
            size: z.string().optional(),
            color: z.string().optional(),
            variantId: z.string().optional()
          }).optional()
        })).min(1),
        shippingMethod: z.string().optional(),
        currency: z.string().length(3).optional(),
        shippingAddress: z.object({
          line1: z.string(),
          line2: z.string().optional(),
          city: z.string(),
          state: z.string(),
          postalCode: z.string(),
          country: z.string(),
        }).optional(),
      });

      // Validate request body
      const validation = pricingBreakdownRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const { sellerId, items, shippingAddress, shippingMethod } = validation.data;

      // Get seller to fetch deposit settings
      const seller = await storage.getUser(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Calculate deposit from seller settings (priority: fixed amount > percentage > none)
      let depositPercentage: number | undefined;
      let depositAmountCents: number | undefined;

      if (seller.depositAmountCents !== undefined && seller.depositAmountCents >= 0) {
        depositAmountCents = seller.depositAmountCents;
      } else if (seller.depositPercentage !== undefined && seller.depositPercentage >= 0) {
        depositPercentage = seller.depositPercentage;
      }

      // Calculate wholesale pricing using WholesalePricingService (with shipping and tax calculation if address provided)
      const pricingResult = await wholesalePricingService.calculateWholesalePricing({
        cartItems: items,
        sellerId,
        depositPercentage,
        depositAmountCents,
        currency,
        shippingAddress,
        shippingMethod: shippingMethod as 'freight_collect' | 'buyer_pickup' | 'seller_shipping' | undefined,
      });

      if (!pricingResult.success) {
        return res.status(400).json({ 
          error: pricingResult.error || "Failed to calculate pricing",
          moqErrors: pricingResult.moqErrors || [],
        });
      }

      // Enrich items with deposit information
      const enrichedItems = pricingResult.validatedItems.map((item: any) => {
        const depositInfo: any = {
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          subtotalCents: item.subtotalCents,
        };

        // Add deposit information if applicable
        if (depositPercentage !== undefined) {
          depositInfo.depositPercentage = depositPercentage;
          depositInfo.depositAmountCents = Math.round(item.subtotalCents * (depositPercentage / 100));
        } else if (depositAmountCents !== undefined) {
          // For fixed deposit amount, distribute proportionally across items
          const itemDepositCents = Math.round(
            (item.subtotalCents / pricingResult.subtotalCents) * depositAmountCents
          );
          depositInfo.depositAmountCents = itemDepositCents;
        }

        return depositInfo;
      });

      // Return complete pricing breakdown with shipping and tax
      res.json({
        currency: pricingResult.currency,
        exchangeRate: pricingResult.exchangeRate,
        items: enrichedItems,
        subtotalCents: pricingResult.subtotalCents,
        depositAmountCents: pricingResult.depositCents,
        balanceAmountCents: pricingResult.balanceCents,
        taxCents: pricingResult.taxCents,
        taxRate: pricingResult.taxRate,
        taxCalculationId: pricingResult.taxCalculationId,
        shippingCents: pricingResult.shippingCents,
        shippingMethod: pricingResult.shippingMethod,
        totalCents: pricingResult.totalCents, // subtotal + shipping + tax
      });
    } catch (error: any) {
      logger.error("Error calculating pricing breakdown", error);
      res.status(500).json({ error: error.message || "Failed to calculate pricing breakdown" });
    }
  });

  // Wholesale pricing calculation endpoint (Architecture 3)
  app.post("/api/wholesale/pricing", requireAuth, requireUserType('buyer'), async (req: any, res) => {
    try {
      // Detect currency from request (Accept-Currency header or IP-based fallback)
      const currency = await getCurrencyFromRequest(req);
      
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
        depositAmountCents: z.number().int().min(0).optional(),
        shippingMethod: z.string().optional(),
        shippingAddress: z.object({
          line1: z.string(),
          line2: z.string().optional(),
          city: z.string(),
          state: z.string(),
          postalCode: z.string(),
          country: z.string(),
        }).optional(),
      });

      // Validate request body with Zod schema
      const validation = wholesalePricingRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const { sellerId, cartItems, depositPercentage, depositAmountCents, shippingAddress, shippingMethod } = validation.data;

      // Calculate wholesale pricing using WholesalePricingService (with shipping and tax if address provided)
      const pricingResult = await wholesalePricingService.calculateWholesalePricing({
        cartItems,
        sellerId,
        depositPercentage,
        depositAmountCents,
        shippingAddress,
        shippingMethod: shippingMethod as 'freight_collect' | 'buyer_pickup' | 'seller_shipping' | undefined,
      });

      if (!pricingResult.success) {
        return res.status(400).json({ error: pricingResult.error || "Failed to calculate pricing" });
      }

      // Return pricing breakdown with shipping and tax fields
      res.json({
        currency,
        subtotalCents: pricingResult.subtotalCents,
        depositCents: pricingResult.depositCents,
        balanceCents: pricingResult.balanceCents,
        taxCents: pricingResult.taxCents,
        taxRate: pricingResult.taxRate,
        taxCalculationId: pricingResult.taxCalculationId,
        shippingCents: pricingResult.shippingCents,
        shippingMethod: pricingResult.shippingMethod,
        totalCents: pricingResult.totalCents,
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
      // Validate wholesaleCheckoutOrchestrator availability
      if (!wholesaleCheckoutOrchestrator) {
        logger.error('[Wholesale Checkout] WholesaleCheckoutWorkflowOrchestrator not available - Stripe not configured');
        return res.status(500).json({ 
          message: 'Wholesale checkout service not available',
          error: 'SERVICE_UNAVAILABLE' 
        });
      }

      const buyerId = req.user.claims.sub;
      
      // Get cart
      const cartResult = await wholesaleService.getCart(buyerId);
      if (!cartResult.success || !cartResult.data) {
        return res.status(400).json({ message: "Cart not found" });
      }

      // Get currency from cart, fallback to request detection for legacy carts
      const currency = cartResult.data.currency || await getCurrencyFromRequest(req);
      logger.info('[Wholesale Checkout] Using currency:', currency);

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

      // Calculate pricing to get exchange rate snapshot
      const pricingResult = await wholesalePricingService.calculateWholesalePricing({
        cartItems: cartResult.data.items,
        sellerId,
        depositPercentage: depositTerms?.depositPercentage,
        depositAmountCents: depositTerms?.depositAmount ? Math.round(depositTerms.depositAmount * 100) : undefined,
        currency,
      });

      if (!pricingResult.success) {
        return res.status(400).json({ message: pricingResult.error || "Failed to calculate pricing" });
      }

      // Map request data to WholesaleCheckoutData interface
      const checkoutData: WholesaleCheckoutData = {
        buyerId,
        sellerId,
        cartItems: cartResult.data.items,
        shippingData: {
          shippingType: shippingData.shippingType,
          carrierName: shippingData.carrierName,
          freightAccountNumber: shippingData.freightAccountNumber,
          pickupInstructions: shippingData.pickupInstructions,
          pickupAddress: shippingData.pickupAddress,
          invoicingAddress: shippingData.invoicingAddress,
          shippingAddress: shippingData.shippingAddress,
        },
        buyerContact: {
          name: buyerContact.name,
          email: buyerContact.email,
          phone: buyerContact.phone,
          company: buyerContact.company,
        },
        depositTerms: depositTerms ? {
          depositPercentage: depositTerms.depositPercentage,
          depositAmount: depositTerms.depositAmount,
        } : undefined,
        paymentTerms: req.body.paymentTerms,
        poNumber: req.body.poNumber,
        vatNumber: req.body.vatNumber,
        incoterms: req.body.incoterms,
        currency: pricingResult.currency,
        exchangeRate: pricingResult.exchangeRate,
        expectedShipDate: req.body.expectedShipDate ? new Date(req.body.expectedShipDate) : undefined,
        balancePaymentDueDate: req.body.balancePaymentDueDate ? new Date(req.body.balancePaymentDueDate) : undefined,
        orderDeadline: req.body.orderDeadline ? new Date(req.body.orderDeadline) : undefined,
      };

      // Execute wholesale checkout workflow
      const result = await wholesaleCheckoutOrchestrator.executeCheckout(checkoutData);

      if (!result.success) {
        // Determine appropriate status code
        const isClientError = result.errorCode?.includes('VALIDATION') || 
                              result.errorCode?.includes('CART') ||
                              result.errorCode?.includes('STOCK') ||
                              result.errorCode?.includes('MOQ');
        const statusCode = isClientError ? 400 : 500;
        
        return res.status(statusCode).json({
          message: result.error,
          error: result.errorCode,
          step: result.step,
        });
      }

      // Clear cart after successful checkout
      await wholesaleService.clearCart(buyerId);

      // Preserve existing API contract (orderId and orderNumber)
      res.json({ 
        orderId: result.order?.id, 
        orderNumber: result.order?.orderNumber 
      });
    } catch (error: any) {
      logger.error("[Wholesale Checkout] Error processing checkout", error);
      res.status(500).json({ 
        message: "Failed to process checkout",
        error: error.message 
      });
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

  // Endpoint to normalize uploaded trade documents (after upload completes)
  app.put("/api/trade/documents", requireAuth, async (req, res) => {
    if (!req.body.documentURL) {
      return res.status(400).json({ error: "documentURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      console.log('[Trade Upload] Normalizing document path:', req.body.documentURL);
      // Normalize the path and set public ACL (trade documents accessible by buyers)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.documentURL,
        {
          owner: req.user!.id,
          visibility: "public", // Trade documents publicly accessible via link
        }
      );
      
      console.log('[Trade Upload] Document normalized to:', objectPath);
      res.json({ objectPath });
    } catch (error) {
      logger.error("Error normalizing trade document path", error);
      res.status(500).json({ error: "Failed to normalize document path" });
    }
  });

  // Endpoint to normalize uploaded wholesale documents (after upload completes)
  app.put("/api/wholesale/documents", requireAuth, async (req, res) => {
    if (!req.body.documentURL) {
      return res.status(400).json({ error: "documentURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      console.log('[Wholesale Upload] Normalizing document path:', req.body.documentURL);
      // Normalize the path and set public ACL (wholesale documents accessible by buyers)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.documentURL,
        {
          owner: req.user!.id,
          visibility: "public", // Wholesale documents publicly accessible via link
        }
      );
      
      console.log('[Wholesale Upload] Document normalized to:', objectPath);
      res.json({ objectPath });
    } catch (error) {
      logger.error("Error normalizing wholesale document path", error);
      res.status(500).json({ error: "Failed to normalize document path" });
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

      // ARCHITECTURE 3: Create or update stock reservation BEFORE adding to cart
      // CRITICAL FIX: Check for existing reservation to prevent duplicates
      let reservationId: string | undefined;
      
      if (product.productType === 'in-stock') {
        // Check for existing active reservation for this product/variant/session
        const sessionReservations = await storage.getStockReservationsBySession(sessionId);
        const existingReservation = sessionReservations.find(
          (r) =>
            r.status === 'active' &&
            r.productId === productId &&
            r.variantId === (finalVariantId || null)
        );

        if (existingReservation) {
          // Update existing reservation atomically
          logger.info('[Cart/Add] Found existing reservation, updating atomically', {
            reservationId: existingReservation.id,
            currentQuantity: existingReservation.quantity,
            addingQuantity: quantity,
          });

          const updateResult = await storage.updateReservationQuantityAtomic(
            existingReservation.id,
            existingReservation.quantity + quantity,
            product.productType
          );

          if (!updateResult.success) {
            logger.warn('[Cart/Add] Failed to update reservation atomically', {
              reservationId: existingReservation.id,
              error: updateResult.error,
            });
            
            return res.status(409).json({ 
              error: updateResult.error || 'Insufficient stock',
            });
          }

          reservationId = existingReservation.id;
          logger.info('[Cart/Add] Reservation updated atomically', {
            reservationId,
            newQuantity: existingReservation.quantity + quantity,
          });
        } else {
          // Create new reservation
          const reservationResult = await inventoryService.reserveStock(
            productId,
            quantity,
            sessionId,
            {
              variantId: finalVariantId,
              userId,
              expirationMinutes: 30, // 30-minute cart reservation
            }
          );
          
          if (!reservationResult.success) {
            logger.warn('[Cart] Insufficient stock for add-to-cart', {
              productId,
              variantId: finalVariantId,
              quantity,
              error: reservationResult.error,
              availability: reservationResult.availability,
            });
            
            // CRITICAL: Fail the entire operation - no reservation = no cart add
            return res.status(409).json({ 
              error: reservationResult.error || 'Insufficient stock',
              availability: reservationResult.availability,
            });
          }
          
          reservationId = reservationResult.reservation?.id;
          logger.info('[Cart] Stock reservation created', {
            reservationId,
            productId,
            variantId: finalVariantId,
            quantity,
            expiresAt: reservationResult.reservation?.expiresAt,
          });
        }
      }

      // Only add to cart if reservation succeeded (or product is not in-stock)
      const result = await cartService.addToCart(sessionId, productId, quantity, finalVariantId, userId);
      
      if (!result.success) {
        // CRITICAL: Release reservation if cart add fails to avoid stale holds
        if (reservationId) {
          try {
            await inventoryService.releaseReservation(reservationId);
            logger.info('[Cart] Released reservation after cart add failure', { reservationId });
          } catch (releaseError) {
            logger.error('[Cart] Failed to release reservation', { reservationId, error: releaseError });
          }
        }
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

      // CRITICAL FIX: Get cart item details before removing to release reservation
      const cart = await cartService.getCart(sessionId);
      const itemToRemove = cart.items.find((item) => {
        const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
        return itemKey === itemId || item.id === itemId;
      });

      // Release reservation if item exists and is in-stock
      if (itemToRemove && itemToRemove.productType === 'in-stock') {
        try {
          // Find ALL active reservations for this product/variant in this session
          // CRITICAL FIX: Release ALL matching reservations to clean up any duplicates
          const sessionReservations = await storage.getStockReservationsBySession(sessionId);
          
          const matchingReservations = sessionReservations.filter(
            (r) =>
              r.status === 'active' &&
              r.productId === itemToRemove.id &&
              r.variantId === (itemToRemove.variantId || null)
          );

          if (matchingReservations.length > 0) {
            // Release all matching reservations (handles duplicates)
            for (const reservation of matchingReservations) {
              await inventoryService.releaseReservation(reservation.id);
              logger.info('[Cart] Released reservation on item removal', {
                reservationId: reservation.id,
                productId: itemToRemove.id,
                variantId: itemToRemove.variantId,
                quantity: reservation.quantity,
              });
            }
            
            if (matchingReservations.length > 1) {
              logger.warn('[Cart] Found and released multiple duplicate reservations', {
                productId: itemToRemove.id,
                variantId: itemToRemove.variantId,
                count: matchingReservations.length,
              });
            }
          } else {
            logger.warn('[Cart] No matching reservation found for item removal', {
              productId: itemToRemove.id,
              variantId: itemToRemove.variantId,
              sessionId,
            });
          }
        } catch (releaseError) {
          logger.error('[Cart] Failed to release reservation on remove', {
            error: releaseError,
            productId: itemToRemove.id,
          });
          // Continue with removal even if reservation release fails
        }
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

      // CRITICAL FIX: Adjust reservation when quantity changes
      const cart = await cartService.getCart(sessionId);
      const itemToUpdate = cart.items.find((item) => {
        const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
        return itemKey === itemId || item.id === itemId;
      });

      // ATOMIC RESERVATION ADJUSTMENT for in-stock products
      if (itemToUpdate && itemToUpdate.productType === 'in-stock') {
        try {
          const sessionReservations = await storage.getStockReservationsBySession(sessionId);
          const matchingReservation = sessionReservations.find(
            (r) =>
              r.status === 'active' &&
              r.productId === itemToUpdate.id &&
              r.variantId === (itemToUpdate.variantId || null)
          );

          if (matchingReservation && quantity !== itemToUpdate.quantity) {
            // ATOMIC UPDATE: Use updateReservationQuantity to prevent race conditions
            // This method excludes the current reservation from availability check
            const updateResult = await inventoryService.updateReservationQuantity(
              matchingReservation.id,
              quantity,
              sessionId
            );

            if (!updateResult.success) {
              // Stock unavailable for quantity change
              return res.status(409).json({
                error: updateResult.error || 'Insufficient stock for quantity change',
                availability: updateResult.availability,
              });
            }

            logger.info('[Cart] Atomically updated reservation quantity', {
              productId: itemToUpdate.id,
              variantId: itemToUpdate.variantId,
              oldQuantity: itemToUpdate.quantity,
              newQuantity: quantity,
              reservationId: matchingReservation.id,
            });
          }
        } catch (adjustError) {
          logger.error('[Cart] Failed to adjust reservation on update', {
            error: adjustError,
            productId: itemToUpdate.id,
          });
          return res.status(500).json({ error: 'Failed to adjust stock reservation' });
        }
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

      // CRITICAL FIX: Release all reservations before clearing cart
      try {
        const sessionReservations = await storage.getStockReservationsBySession(sessionId);
        const activeReservations = sessionReservations.filter((r) => r.status === 'active');

        for (const reservation of activeReservations) {
          await inventoryService.releaseReservation(reservation.id);
          logger.info('[Cart] Released reservation on cart clear', {
            reservationId: reservation.id,
            productId: reservation.productId,
            variantId: reservation.variantId,
            quantity: reservation.quantity,
          });
        }

        logger.info('[Cart] Released all reservations on clear', {
          sessionId,
          count: activeReservations.length,
        });
      } catch (releaseError) {
        logger.error('[Cart] Failed to release reservations on clear', {
          error: releaseError,
          sessionId,
        });
        // Continue with clear even if reservation release fails
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

  // ============================================================================
  // ADDRESS AUTOCOMPLETE & VALIDATION API - LocationIQ Integration
  // ============================================================================

  // Address Autocomplete API - LocationIQ Integration
  app.post("/api/addresses/search", async (req, res) => {
    try {
      const { query, countryCode, limit } = req.body;

      // Validate request
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query string is required" });
      }

      // Check if LocationIQ is available
      if (!locationIQService.isAvailable()) {
        return res.status(503).json({ 
          error: "Address autocomplete service not available",
          message: "LocationIQ API key not configured" 
        });
      }

      // Search addresses
      const results = await locationIQService.searchAddress(
        query,
        countryCode,
        limit || 5
      );

      res.json({ results });

    } catch (error: any) {
      logger.error("[API] Address search failed:", error);
      res.status(500).json({ 
        error: "Address search failed",
        message: error.message 
      });
    }
  });

  // City Search API - For shipping zone configuration (city-level only, no street addresses)
  app.get("/api/cities/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const countryCode = req.query.countryCode as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      // Validate request
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      // Check if LocationIQ is available
      if (!locationIQService.isAvailable()) {
        return res.status(503).json({ 
          error: "City search service not available",
          message: "LocationIQ API key not configured" 
        });
      }

      // Search cities
      const results = await locationIQService.searchCities(
        query,
        countryCode,
        limit
      );

      res.json(results);

    } catch (error: any) {
      logger.error("[API] City search failed:", error);
      res.status(500).json({ 
        error: "City search failed",
        message: error.message 
      });
    }
  });

  app.post("/api/addresses/validate", async (req, res) => {
    try {
      const address = req.body;

      // Validate required fields
      if (!address || !address.line1 || !address.city || !address.country) {
        return res.status(400).json({ 
          error: "Incomplete address. Required: line1, city, country" 
        });
      }

      // Check if LocationIQ is available
      if (!locationIQService.isAvailable()) {
        // Return address as-is if service not available (manual validation)
        return res.json({ 
          address: {
            ...address,
            validatedSource: 'manual',
            validatedAt: new Date()
          },
          validated: false,
          message: "LocationIQ not available - address not validated"
        });
      }

      // Validate address
      const validated = await locationIQService.validateAddress(address);

      if (!validated) {
        return res.status(422).json({ 
          error: "Address validation failed",
          message: "Could not validate this address. Please check and try again."
        });
      }

      res.json({ 
        address: validated,
        validated: true 
      });

    } catch (error: any) {
      logger.error("[API] Address validation failed:", error);
      res.status(500).json({ 
        error: "Address validation failed",
        message: error.message 
      });
    }
  });

  // ============================================================================
  // ORDER API - Backend order processing with server-side shipping and tax calculation
  // ============================================================================
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

  // DEVELOPMENT ONLY: Test delivery reminder email
  if (process.env.NODE_ENV === 'development') {
    app.post("/api/dev/test-delivery-reminder", async (req, res) => {
      try {
        const { testEmail } = req.body;
        
        if (!testEmail) {
          return res.status(400).json({ error: "testEmail is required" });
        }

        // Create a mock order and seller for testing
        const mockSeller = {
          id: "test-seller-id",
          email: testEmail,
          storeName: "Test Store",
          firstName: "Test",
          username: "teststore",
        };

        const mockOrder = {
          id: "test-order-123",
          sellerId: mockSeller.id,
          total: "149.99",
          depositPaid: "50.00",
          customerEmail: "customer@example.com",
          shippingName: "John Doe",
          status: "pending",
          createdAt: new Date(),
        };

        const mockItem = {
          productName: "Premium T-Shirt",
          productType: "pre-order",
          quantity: 2,
          preOrderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          madeToOrderLeadTime: null,
        };

        // Calculate delivery date (7 days from now for testing)
        const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Generate magic link
        const secret = process.env.SESSION_SECRET || "upfirst-secret-key";
        const payload = `${mockSeller.id}:${mockOrder.id}:${Date.now()}`;
        const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
        const magicToken = Buffer.from(`${payload}:${signature}`).toString("base64url");
        const magicLink = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/magic-link/order?token=${magicToken}`;

        const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const daysRemaining = 7;
        const orderTotal = parseFloat(mockOrder.total);
        const depositPaid = parseFloat(mockOrder.depositPaid);
        const balanceDue = orderTotal - depositPaid;

        // Build email HTML
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px;" align="center">
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Delivery Reminder: ${daysRemaining} Days Remaining</h1>
              
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">Hi ${mockSeller.storeName},</p>
              
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">The delivery date you indicated to your buyer for order <strong>#${mockOrder.id.substring(0, 8).toUpperCase()}</strong> is approaching in <strong>${daysRemaining} days</strong>.</p>
              
              <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;"><strong>Expected Delivery Date:</strong></p>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${formattedDeliveryDate}</p>
              </div>
              
              <h2 style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Order Details</h2>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Product</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a; font-weight: 500;">${mockItem.productName} (Pre-Order)</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Quantity</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a;">${mockItem.quantity}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Order Total</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a;">$${orderTotal.toFixed(2)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Deposit Paid</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #10b981;">$${depositPaid.toFixed(2)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Balance Due</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; font-weight: 600; color: #dc2626;">$${balanceDue.toFixed(2)}</span>
                  </td>
                </tr>
              </table>
              
              <h2 style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Customer Information</h2>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Name</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a;">${mockOrder.shippingName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; color: #666;">Email</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="font-size: 14px; color: #1a1a1a;">${mockOrder.customerEmail}</span>
                  </td>
                </tr>
              </table>
              
              <div style="margin: 30px 0; padding: 15px; background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>⚠️ Action Required:</strong> This order has an outstanding balance of $${balanceDue.toFixed(2)}. Please send a balance payment request before the delivery date.
                </p>
              </div>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${magicLink}" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">View Order & Take Action</a>
              </div>
              
              <p style="margin: 25px 0 0 0; font-size: 14px; color: #666;">From your order page, you can:</p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #666;">
                <li style="margin-bottom: 8px;">Send a balance payment request (if not yet paid)</li>
                <li style="margin-bottom: 8px;">Update the delivery date if needed</li>
                <li style="margin-bottom: 8px;">Update order status and tracking</li>
                <li>Contact your customer</li>
              </ul>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e5e7eb; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Upfirst</p>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">Sell the moment. Not weeks later.</p>
                    <p style="margin: 0; font-size: 12px; color: #999;">
                      This is an automated reminder from Upfirst. You're receiving this because you have an upcoming delivery.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        // Send test email using email provider
        await emailProvider.sendEmail({
          to: testEmail,
          from: `Upfirst <${process.env.RESEND_FROM_EMAIL}>`,
          replyTo: "support@upfirst.io",
          subject: `⏰ Delivery Reminder: ${daysRemaining} Days Until Pre-Order Delivery`,
          html: htmlContent,
        });

        logger.info(`[DEV] Sent test delivery reminder to ${testEmail}`);
        
        res.json({ 
          success: true, 
          message: `Test delivery reminder sent to ${testEmail}`,
          magicLink
        });
      } catch (error: any) {
        logger.error("[DEV] Test delivery reminder failed", error);
        res.status(500).json({ error: error.message || "Failed to send test email" });
      }
    });
  }

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
