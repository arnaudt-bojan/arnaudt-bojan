import { sql } from "drizzle-orm";
import { pgTable, pgEnum, text, varchar, decimal, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const productTypeEnum = z.enum(["in-stock", "pre-order", "made-to-order", "wholesale"]);
export type ProductType = z.infer<typeof productTypeEnum>;

export const orderStatusEnum = z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]);
export type OrderStatus = z.infer<typeof orderStatusEnum>;

export const paymentStatusEnum = z.enum(["pending", "deposit_paid", "fully_paid", "refunded", "partially_refunded"]);
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

export const itemStatusEnum = z.enum(["pending", "processing", "ready_to_ship", "shipped", "delivered", "cancelled", "returned", "refunded"]);
export type ItemStatus = z.infer<typeof itemStatusEnum>;

export const userRoleEnum = z.enum(["admin", "editor", "viewer", "buyer"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const storeContextRoleEnum = z.enum(["buyer", "seller", "owner"]);
export type StoreContextRole = z.infer<typeof storeContextRoleEnum>;

// PostgreSQL enum for store context roles (buyer/seller/owner)
export const storeContextRolePgEnum = pgEnum("store_context_role", ["buyer", "seller", "owner"]);

export const invitationStatusEnum = z.enum(["pending", "accepted", "expired"]);
export type InvitationStatus = z.infer<typeof invitationStatusEnum>;

export const productStatusEnum = z.enum(["active", "draft", "coming-soon", "paused", "out-of-stock", "archived"]);
export type ProductStatus = z.infer<typeof productStatusEnum>;

// Categories table with hierarchical structure (3 levels max)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug").notNull(),
  parentId: varchar("parent_id"), // null for level 1, references parent for level 2 & 3
  level: integer("level").notNull(), // 1, 2, or 3
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(), // Seller who owns this product
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sku: text("sku"), // Stock Keeping Unit - auto-generated if not provided
  image: text("image").notNull(), // Primary/first image (backward compatibility)
  images: text("images").array(), // Array of all product images (up to 8-10)
  category: text("category").notNull(), // Legacy text field for backward compatibility
  categoryLevel1Id: varchar("category_level_1_id"), // Top-level category
  categoryLevel2Id: varchar("category_level_2_id"), // Mid-level category
  categoryLevel3Id: varchar("category_level_3_id"), // Leaf-level category
  productType: text("product_type").notNull(),
  stock: integer("stock").default(0),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  requiresDeposit: integer("requires_deposit").default(0), // 0 = false, 1 = true
  variants: jsonb("variants"), // [{size, color, stock, image, sku}] - each variant has its own SKU
  hasColors: integer("has_colors").default(0), // 0 = size-only mode, 1 = color mode
  madeToOrderDays: integer("made_to_order_days"), // Days after purchase for made-to-order
  preOrderDate: timestamp("pre_order_date"), // Availability date for pre-order
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }), // Discount percentage (0-100)
  promotionActive: integer("promotion_active").default(0), // 0 = false, 1 = true
  promotionEndDate: timestamp("promotion_end_date"), // When promotion ends
  
  // Shipping configuration
  shippingType: text("shipping_type").default("flat"), // "flat", "matrix", "shippo", "free"
  flatShippingRate: decimal("flat_shipping_rate", { precision: 10, scale: 2 }), // For flat shipping
  shippingMatrixId: varchar("shipping_matrix_id"), // References shipping_matrices.id
  shippoWeight: decimal("shippo_weight", { precision: 10, scale: 2 }), // Weight in lbs for Shippo
  shippoLength: decimal("shippo_length", { precision: 10, scale: 2 }), // Length in inches
  shippoWidth: decimal("shippo_width", { precision: 10, scale: 2 }), // Width in inches
  shippoHeight: decimal("shippo_height", { precision: 10, scale: 2 }), // Height in inches
  shippoTemplate: varchar("shippo_template"), // Carrier template token (e.g., "USPS_FlatRateBox")
  
  // Product visibility and status
  status: text("status").default("draft"), // "active", "draft", "coming-soon", "paused", "out-of-stock", "archived"
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true }).extend({
  name: z.string().min(1, "Product name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000, "Description must be 5000 characters or less"),
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  image: z.string().min(1, "At least one product image is required"),
  category: z.string().min(1, "Category is required"),
  productType: z.string().min(1, "Product type is required"),
  preOrderDate: z.coerce.date().optional().nullable().transform(val => val || undefined),
  discountPercentage: z.string().optional().nullable().transform(val => val || undefined),
  promotionEndDate: z.coerce.date().optional().nullable().transform(val => val || undefined),
  promotionActive: z.number().optional().nullable().transform(val => val ?? undefined),
  // CRITICAL: Include variants and other optional fields that were missing
  variants: z.any().optional().nullable(), // JSON array of variant objects
  hasColors: z.number().optional().nullable(), // 0 = size-only, 1 = color mode
  images: z.array(z.string()).optional().nullable(), // Array of image URLs
  stock: z.number().optional().nullable(),
  depositAmount: z.string().optional().nullable().transform(val => val || undefined),
  requiresDeposit: z.number().optional().nullable(),
  madeToOrderDays: z.number().optional().nullable(),
  // Shipping fields
  shippingType: z.string().optional().nullable(),
  flatShippingRate: z.string().optional().nullable().transform(val => val || undefined),
  shippingMatrixId: z.string().optional().nullable(),
  shippoWeight: z.string().optional().nullable().transform(val => val || undefined),
  shippoLength: z.string().optional().nullable().transform(val => val || undefined),
  shippoWidth: z.string().optional().nullable().transform(val => val || undefined),
  shippoHeight: z.string().optional().nullable().transform(val => val || undefined),
  shippoTemplate: z.string().optional().nullable(),
  // Category fields
  categoryLevel1Id: z.string().optional().nullable(),
  categoryLevel2Id: z.string().optional().nullable(),
  categoryLevel3Id: z.string().optional().nullable(),
  // Status
  status: z.string().optional().nullable(),
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Frontend product schema (without sellerId - added by backend)
export const frontendProductSchema = insertProductSchema.omit({ sellerId: true }).extend({
  shippingType: z.enum(["flat", "matrix", "shippo", "free"]),
});
export type FrontendProduct = z.infer<typeof frontendProductSchema>;

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerAddress: text("customer_address").notNull(),
  items: text("items").notNull(), // Legacy JSON field - kept for backward compatibility
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  remainingBalance: decimal("remaining_balance", { precision: 10, scale: 2 }).default("0"),
  paymentType: text("payment_type").default("full"), // "full", "deposit", "balance"
  paymentStatus: text("payment_status").default("pending"), // "pending", "deposit_paid", "fully_paid"
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // Stripe payment intent ID for deposit
  stripeBalancePaymentIntentId: varchar("stripe_balance_payment_intent_id"), // Stripe payment intent ID for balance
  status: text("status").notNull().default("pending"), // Overall order status
  fulfillmentStatus: text("fulfillment_status").default("unfulfilled"), // "unfulfilled", "partially_fulfilled", "fulfilled"
  trackingNumber: varchar("tracking_number"), // Legacy - kept for backward compatibility
  trackingLink: text("tracking_link"), // Legacy - kept for backward compatibility
  
  // Tax fields (Stripe Tax integration)
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"), // Total tax collected
  taxCalculationId: varchar("tax_calculation_id"), // Stripe Tax calculation ID
  taxBreakdown: jsonb("tax_breakdown"), // Detailed tax breakdown from Stripe Tax
  subtotalBeforeTax: decimal("subtotal_before_tax", { precision: 10, scale: 2 }), // Subtotal before tax
  
  // Currency field - seller's listing currency at time of order
  currency: varchar("currency", { length: 3 }).default("USD"), // ISO 4217 currency code (USD, GBP, EUR, etc.)
  
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type SelectOrder = typeof orders.$inferSelect;

// Order Items - for item-level tracking and fulfillment
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  productId: varchar("product_id").notNull(), // Product/wholesale product ID
  productName: text("product_name").notNull(),
  productImage: text("product_image"),
  productType: text("product_type").notNull(), // "in-stock", "pre-order", "made-to-order", "wholesale"
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Price per unit at time of order
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(), // quantity * price
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  requiresDeposit: integer("requires_deposit").default(0),
  variant: jsonb("variant"), // {size, color} if applicable
  itemStatus: text("item_status").notNull().default("pending"), // "pending", "processing", "ready_to_ship", "shipped", "delivered", "cancelled", "returned", "refunded"
  trackingNumber: varchar("tracking_number"),
  trackingCarrier: varchar("tracking_carrier"), // e.g., UPS, FedEx, USPS
  trackingUrl: text("tracking_url"), // Full tracking URL
  trackingLink: text("tracking_link"), // Legacy - for backward compatibility
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  
  // Refund tracking
  refundedQuantity: integer("refunded_quantity").default(0), // How many units of this item have been refunded
  refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 }).default("0"), // Total refunded amount for this item
  returnedAt: timestamp("returned_at"), // When item was marked as returned
  refundedAt: timestamp("refunded_at"), // When refund was processed
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type SelectOrderItem = typeof orderItems.$inferSelect;

// Refunds - track all refund transactions
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  orderItemId: varchar("order_item_id"), // References order_items.id (null for shipping refunds)
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Refund amount
  reason: text("reason"), // Refund reason (optional)
  refundType: text("refund_type").notNull(), // "full", "partial", "item", "shipping"
  stripeRefundId: varchar("stripe_refund_id"), // Stripe refund ID
  status: text("status").notNull().default("pending"), // "pending", "succeeded", "failed"
  processedBy: varchar("processed_by").notNull(), // User ID who processed the refund
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRefundSchema = createInsertSchema(refunds).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refunds.$inferSelect;

// Cancellation Requests - track buyer cancellation requests for pre-shipment orders
export const cancellationRequests = pgTable("cancellation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  buyerEmail: text("buyer_email").notNull(), // Buyer who made the request
  buyerName: text("buyer_name").notNull(),
  reason: text("reason"), // Cancellation reason
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  sellerId: varchar("seller_id").notNull(), // Seller who needs to review
  reviewedBy: varchar("reviewed_by"), // User ID who reviewed the request
  reviewedAt: timestamp("reviewed_at"), // When request was reviewed
  rejectionReason: text("rejection_reason"), // Why request was rejected (if applicable)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCancellationRequestSchema = createInsertSchema(cancellationRequests).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertCancellationRequest = z.infer<typeof insertCancellationRequestSchema>;
export type CancellationRequest = typeof cancellationRequests.$inferSelect;

// Return Requests - track buyer return requests for delivered orders
export const returnRequests = pgTable("return_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  orderItemId: varchar("order_item_id"), // Optional: specific item being returned (null for full order return)
  buyerEmail: text("buyer_email").notNull(), // Buyer who made the request
  buyerName: text("buyer_name").notNull(),
  reason: text("reason"), // Return reason
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "label_uploaded", "in_transit", "received", "completed"
  sellerId: varchar("seller_id").notNull(), // Seller who needs to review
  reviewedBy: varchar("reviewed_by"), // User ID who reviewed the request
  reviewedAt: timestamp("reviewed_at"), // When request was reviewed
  rejectionReason: text("rejection_reason"), // Why request was rejected
  
  // Return shipping method chosen by seller
  returnMethod: text("return_method"), // "seller_label" (seller uploads label) or "buyer_ships" (buyer ships and provides tracking)
  shippingLabelUrl: text("shipping_label_url"), // URL to seller-uploaded shipping label PDF
  
  // Buyer-provided tracking (if buyer_ships method)
  buyerTrackingNumber: varchar("buyer_tracking_number"),
  buyerTrackingCarrier: varchar("buyer_tracking_carrier"),
  buyerTrackingImage: text("buyer_tracking_image"), // Image of shipping receipt uploaded by buyer
  buyerShippedAt: timestamp("buyer_shipped_at"),
  
  // Seller confirmation
  receivedAt: timestamp("received_at"), // When seller marks return as received
  refundProcessedAt: timestamp("refund_processed_at"), // When refund was issued
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertReturnRequestSchema = createInsertSchema(returnRequests).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertReturnRequest = z.infer<typeof insertReturnRequestSchema>;
export type ReturnRequest = typeof returnRequests.$inferSelect;

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username").unique(), // Store subdomain username (8 digits or Instagram handle)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"), // For local test accounts
  role: varchar("role").notNull().default("customer"),
  sellerId: varchar("seller_id"), // ID of the seller/store owner this user belongs to (for team members)
  invitedBy: varchar("invited_by"), // User ID of who invited this user
  storeBanner: text("store_banner"), // Seller's store banner image URL
  storeLogo: text("store_logo"), // Seller's store logo URL
  paymentProvider: varchar("payment_provider"), // stripe, paypal, or null (not yet selected)
  stripeConnectedAccountId: varchar("stripe_connected_account_id"), // Stripe Connect account ID for receiving payments
  stripeChargesEnabled: integer("stripe_charges_enabled").default(0), // Can accept payments (0=no, 1=yes)
  stripePayoutsEnabled: integer("stripe_payouts_enabled").default(0), // Can receive payouts (0=no, 1=yes)
  stripeDetailsSubmitted: integer("stripe_details_submitted").default(0), // Has submitted onboarding info (0=no, 1=yes)
  listingCurrency: varchar("listing_currency", { length: 3 }).default("USD"), // Default currency from Stripe account (ISO 4217)
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe Customer ID for subscription & saved payment methods
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Stripe Subscription ID for recurring billing
  subscriptionStatus: varchar("subscription_status"), // trial, active, past_due, canceled, null
  subscriptionPlan: varchar("subscription_plan"), // monthly, annual
  trialEndsAt: timestamp("trial_ends_at"), // When 30-day trial expires
  paypalMerchantId: varchar("paypal_merchant_id"), // PayPal merchant ID
  paypalPartnerId: varchar("paypal_partner_id"), // PayPal partner attribution ID
  customDomain: varchar("custom_domain"), // Custom domain for store (e.g., mystore.com)
  customDomainVerified: integer("custom_domain_verified").default(0), // 0 = false, 1 = true
  instagramUserId: varchar("instagram_user_id"), // Instagram user ID from OAuth
  instagramUsername: varchar("instagram_username"), // Instagram username from OAuth
  instagramAccessToken: text("instagram_access_token"), // Instagram access token (encrypted in production)
  shippingPrice: decimal("shipping_price", { precision: 10, scale: 2 }).default("0"), // Flat shipping rate for seller
  storeActive: integer("store_active").default(1), // Store is active and visible (0=inactive, 1=active)
  shippingPolicy: text("shipping_policy"), // Optional: Custom shipping & delivery policy text
  returnsPolicy: text("returns_policy"), // Optional: Custom returns & exchanges policy text
  contactEmail: varchar("contact_email"), // Optional: Custom contact email for seller inquiries (fallback to email if not set)
  
  // About & Contact - displayed in storefront footer
  aboutStory: text("about_story"), // Seller's story/about text (max 1000 chars in form validation)
  socialInstagram: varchar("social_instagram"), // Instagram profile username
  socialTwitter: varchar("social_twitter"), // Twitter/X profile username
  socialTiktok: varchar("social_tiktok"), // TikTok profile username
  socialSnapchat: varchar("social_snapchat"), // Snapchat profile username
  socialWebsite: varchar("social_website"), // Website URL
  
  // Tax settings (Stripe Tax integration - B2C only, not wholesale)
  taxEnabled: integer("tax_enabled").default(1), // Auto-collect tax at checkout (0=disabled, 1=enabled)
  taxNexusCountries: text("tax_nexus_countries").array(), // Countries where seller has tax nexus (e.g., ["US", "CA", "GB"])
  taxNexusStates: text("tax_nexus_states").array(), // US states where seller has tax nexus (e.g., ["NY", "CA", "TX"])
  taxProductCode: varchar("tax_product_code"), // Default Stripe Tax product code for all products (can be overridden per product)
  
  // Platform admin flag for Upfirst.io owners
  isPlatformAdmin: integer("is_platform_admin").default(0), // 0 = regular user, 1 = platform admin
  
  // Welcome email tracking - prevent duplicate welcome emails
  welcomeEmailSent: integer("welcome_email_sent").default(0), // 0 = not sent, 1 = sent
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User-Store relationship table for context-specific roles
// Tracks whether a user is a buyer or seller/owner for a specific store
export const userStoreRoles = pgTable("user_store_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // FK to users.id
  storeOwnerId: varchar("store_owner_id").notNull().references(() => users.id, { onDelete: "cascade" }), // FK to users.id (the store owner)
  role: storeContextRolePgEnum("role").notNull(), // PostgreSQL enum enforcing buyer/seller/owner
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint: one role per user per store
  uniqueUserStore: uniqueIndex("unique_user_store").on(table.userId, table.storeOwnerId),
}));

export const insertUserStoreRoleSchema = createInsertSchema(userStoreRoles).omit({ id: true, createdAt: true }).extend({
  role: storeContextRoleEnum, // Enforce enum validation at API layer
});
export type InsertUserStoreRole = z.infer<typeof insertUserStoreRoleSchema>;
export type UserStoreRole = typeof userStoreRoles.$inferSelect;

export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  role: varchar("role").notNull(),
  invitedBy: varchar("invited_by").notNull(), // User ID of who sent invitation
  status: varchar("status").notNull().default("pending"),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({ id: true, createdAt: true });
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

export const metaSettings = pgTable("meta_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  accessToken: text("access_token"),
  adAccountId: varchar("ad_account_id"),
  accountName: varchar("account_name"),
  connected: integer("connected").default(0), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type MetaSettings = typeof metaSettings.$inferSelect;
export type InsertMetaSettings = typeof metaSettings.$inferInsert;

export const tiktokSettings = pgTable("tiktok_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  advertiserId: varchar("advertiser_id"),
  advertiserName: varchar("advertiser_name"),
  connected: integer("connected").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TikTokSettings = typeof tiktokSettings.$inferSelect;
export type InsertTikTokSettings = typeof tiktokSettings.$inferInsert;

export const xSettings = pgTable("x_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  accessToken: text("access_token"),
  accessTokenSecret: text("access_token_secret"),
  accountId: varchar("account_id"),
  accountName: varchar("account_name"),
  connected: integer("connected").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type XSettings = typeof xSettings.$inferSelect;
export type InsertXSettings = typeof xSettings.$inferInsert;

// Subscriber Groups for Newsletter Management
export const subscriberGroups = pgTable("subscriber_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriberGroupSchema = createInsertSchema(subscriberGroups).omit({ id: true, createdAt: true });
export type InsertSubscriberGroup = z.infer<typeof insertSubscriberGroupSchema>;
export type SubscriberGroup = typeof subscriberGroups.$inferSelect;

// Subscribers for Newsletter
export const subscribers = pgTable("subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  status: text("status").notNull().default("active"), // "active", "unsubscribed", "bounced"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userEmailUnique: uniqueIndex("subscribers_user_email_unique").on(table.userId, table.email),
}));

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({ id: true, createdAt: true });
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;

// Junction table for subscriber-group relationships
export const subscriberGroupMemberships = pgTable("subscriber_group_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriberId: varchar("subscriber_id").notNull().references(() => subscribers.id, { onDelete: "cascade" }),
  groupId: varchar("group_id").notNull().references(() => subscriberGroups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  subscriberGroupUnique: uniqueIndex("subscriber_group_unique").on(table.subscriberId, table.groupId),
}));

export const insertSubscriberGroupMembershipSchema = createInsertSchema(subscriberGroupMemberships).omit({ id: true, createdAt: true });
export type InsertSubscriberGroupMembership = z.infer<typeof insertSubscriberGroupMembershipSchema>;
export type SubscriberGroupMembership = typeof subscriberGroupMemberships.$inferSelect;

export const newsletters = pgTable("newsletters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(), // Plain text content
  htmlContent: text("html_content"), // HTML content for email
  recipients: jsonb("recipients").notNull(), // Array of recipient email addresses
  groupIds: text("group_ids").array(), // Array of subscriber group IDs
  images: jsonb("images"), // Array of {id, url, productId?, link, alt}
  status: text("status").notNull().default("draft"), // "draft", "sent", "failed"
  sentAt: timestamp("sent_at"),
  resendBatchId: text("resend_batch_id"), // Resend batch ID for tracking
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({ id: true, createdAt: true });
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletters.$inferSelect;
export type SelectNewsletter = typeof newsletters.$inferSelect;

// Newsletter Templates
export const newsletterTemplates = pgTable("newsletter_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  htmlContent: text("html_content"),
  images: jsonb("images"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNewsletterTemplateSchema = createInsertSchema(newsletterTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNewsletterTemplate = z.infer<typeof insertNewsletterTemplateSchema>;
export type NewsletterTemplate = typeof newsletterTemplates.$inferSelect;

// Newsletter Analytics
export const newsletterAnalytics = pgTable("newsletter_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsletterId: varchar("newsletter_id").notNull().references(() => newsletters.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  totalSent: integer("total_sent").default(0),
  totalDelivered: integer("total_delivered").default(0),
  totalOpened: integer("total_opened").default(0),
  totalClicked: integer("total_clicked").default(0),
  totalBounced: integer("total_bounced").default(0),
  totalUnsubscribed: integer("total_unsubscribed").default(0),
  openRate: decimal("open_rate", { precision: 5, scale: 2 }), // Percentage
  clickRate: decimal("click_rate", { precision: 5, scale: 2 }), // Percentage  
  bounceRate: decimal("bounce_rate", { precision: 5, scale: 2 }), // Percentage
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  newsletterIdUnique: uniqueIndex("newsletter_analytics_newsletter_id_unique").on(table.newsletterId),
}));

export const insertNewsletterAnalyticsSchema = createInsertSchema(newsletterAnalytics).omit({ id: true, createdAt: true });
export type InsertNewsletterAnalytics = z.infer<typeof insertNewsletterAnalyticsSchema>;
export type NewsletterAnalytics = typeof newsletterAnalytics.$inferSelect;

// Newsletter Events - Track individual recipient actions to prevent duplicates
export const newsletterEvents = pgTable("newsletter_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsletterId: varchar("newsletter_id").notNull().references(() => newsletters.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  eventType: text("event_type").notNull(), // "open", "click", "bounce", "unsubscribe"
  eventData: jsonb("event_data"), // Additional data like clicked link URL
  webhookEventId: text("webhook_event_id"), // Resend webhook event ID for idempotency
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Prevent duplicate events per recipient per newsletter per type
  recipientEventUnique: uniqueIndex("newsletter_events_recipient_event_unique").on(table.newsletterId, table.recipientEmail, table.eventType),
  // Index for webhook idempotency
  webhookEventIdIndex: index("newsletter_events_webhook_event_id_idx").on(table.webhookEventId),
}));

export const insertNewsletterEventSchema = createInsertSchema(newsletterEvents).omit({ id: true, createdAt: true });
export type InsertNewsletterEvent = z.infer<typeof insertNewsletterEventSchema>;
export type NewsletterEvent = typeof newsletterEvents.$inferSelect;

export const nftMints = pgTable("nft_mints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  userId: varchar("user_id").notNull(),
  mintAddress: text("mint_address").notNull(),
  transactionSignature: text("transaction_signature").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNftMintSchema = createInsertSchema(nftMints).omit({ id: true, createdAt: true });
export type InsertNftMint = z.infer<typeof insertNftMintSchema>;
export type NftMint = typeof nftMints.$inferSelect;
export type SelectNftMint = typeof nftMints.$inferSelect;

// Wholesale Products
export const wholesaleProducts = pgTable("wholesale_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  productId: varchar("product_id"), // Optional - reference to existing product
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(), // Primary/first image (backward compatibility)
  images: text("images").array(), // Array of all product images (up to 8-10)
  category: text("category").notNull(),
  rrp: decimal("rrp", { precision: 10, scale: 2 }).notNull(), // Recommended Retail Price
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }).notNull(),
  moq: integer("moq").notNull(), // Minimum Order Quantity
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  requiresDeposit: integer("requires_deposit").default(0), // 0 = false, 1 = true
  stock: integer("stock").default(0),
  readinessDays: integer("readiness_days"), // Days after order for production/delivery
  variants: jsonb("variants"), // [{size, color, stock, image, moq}]
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWholesaleProductSchema = createInsertSchema(wholesaleProducts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertWholesaleProduct = z.infer<typeof insertWholesaleProductSchema>;
export type WholesaleProduct = typeof wholesaleProducts.$inferSelect;
export type SelectWholesaleProduct = typeof wholesaleProducts.$inferSelect;

// Wholesale Invitations
export const wholesaleInvitations = pgTable("wholesale_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  token: varchar("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertWholesaleInvitationSchema = createInsertSchema(wholesaleInvitations).omit({ 
  id: true, 
  token: true,
  createdAt: true, 
  acceptedAt: true 
});
export type InsertWholesaleInvitation = z.infer<typeof insertWholesaleInvitationSchema>;
export type WholesaleInvitation = typeof wholesaleInvitations.$inferSelect;
export type SelectWholesaleInvitation = typeof wholesaleInvitations.$inferSelect;

// Magic Link Authentication Tokens
export const authTokens = pgTable("auth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  code: varchar("code", { length: 6 }), // 6-digit code for email authentication
  tokenType: text("token_type").default("login_code"), // "login_code" (single-use, 15min) or "magic_link" (reusable, 6 months)
  expiresAt: timestamp("expires_at").notNull(),
  used: integer("used").default(0), // 0 = false, 1 = true (only enforced for login_code type)
  sellerContext: text("seller_context"), // Seller username when logging in from seller storefront
  returnUrl: text("return_url"), // URL to redirect to after authentication
  loginContext: text("login_context"), // Context for login (e.g., "storefront", "dashboard", "main")
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuthTokenSchema = createInsertSchema(authTokens).omit({ id: true, createdAt: true });
export type InsertAuthToken = z.infer<typeof insertAuthTokenSchema>;
export type AuthToken = typeof authTokens.$inferSelect;

// Shipping configuration enums
export const shippingTypeEnum = z.enum(["flat", "matrix", "shippo", "free"]);
export type ShippingType = z.infer<typeof shippingTypeEnum>;

export const zoneTypeEnum = z.enum(["continent", "country", "city"]);
export type ZoneType = z.infer<typeof zoneTypeEnum>;

// Shipping Matrices - seller-defined shipping rate tables
export const shippingMatrices = pgTable("shipping_matrices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  name: text("name").notNull(), // e.g., "Standard International", "Express US"
  description: text("description"), // Optional description
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShippingMatrixSchema = createInsertSchema(shippingMatrices).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShippingMatrix = z.infer<typeof insertShippingMatrixSchema>;
export type ShippingMatrix = typeof shippingMatrices.$inferSelect;

// Shipping Zones - individual zone rates within a matrix
export const shippingZones = pgTable("shipping_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matrixId: varchar("matrix_id").notNull(), // References shipping_matrices.id
  zoneType: text("zone_type").notNull(), // "continent", "country", "city"
  zoneName: text("zone_name").notNull(), // e.g., "North America", "United States", "New York"
  zoneCode: varchar("zone_code"), // Optional: ISO code (US, CA, NY, etc.)
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(), // Shipping cost
  estimatedDays: integer("estimated_days"), // Optional delivery estimate
});

export const insertShippingZoneSchema = createInsertSchema(shippingZones).omit({ id: true });
export type InsertShippingZone = z.infer<typeof insertShippingZoneSchema>;
export type ShippingZone = typeof shippingZones.$inferSelect;

// Notifications (unified email + in-app)
export const notificationTypeEnum = z.enum([
  // Existing
  "order_placed", 
  "order_shipped", 
  "order_delivered",
  "payment_received",
  "product_listed",
  "product_updated",
  "wholesale_invitation",
  "system_alert",
  
  // Phase 1: Critical Revenue-Impacting
  "stripe_onboarding_incomplete",
  "order_payment_failed",
  "buyer_payment_failed",
  "subscription_payment_failed",
  "inventory_out_of_stock",
  "payout_failed",
  "seller_welcome",
  
  // Phase 2: Important Operations
  "stripe_onboarding_complete",
  "payout_received",
  "trial_ending_soon",
  "inventory_low",
  "payment_dispute",
  "order_refunded",
  
  // Phase 3: Enhanced Experience
  "order_cancelled",
  "preorder_deposit_received",
  "preorder_balance_due",
  "wholesale_application",
  "wholesale_order_placed",
  "subscription_activated",
  "subscription_payment_success",
  "trial_ended",
  "subscription_cancelled",
  "payment_method_expiring",
  "stripe_verification_required",
  "stripe_account_restricted",
]);
export type NotificationType = z.infer<typeof notificationTypeEnum>;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Recipient user ID
  type: text("type").notNull(), // notification type
  title: text("title").notNull(),
  message: text("message").notNull(),
  emailSent: integer("email_sent").default(0), // 0 = false, 1 = true
  emailId: text("email_id"), // Resend email ID for tracking
  read: integer("read").default(0), // 0 = false, 1 = true
  metadata: jsonb("metadata"), // Additional data (orderId, productId, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ===== CATALOG IMPORT SYSTEM =====

// Sync state enum
export const syncStateEnum = z.enum(["active", "deleted", "error"]);
export type SyncState = z.infer<typeof syncStateEnum>;

// Import platform enum
export const importPlatformEnum = z.enum(["shopify", "bigcommerce", "etsy", "woocommerce"]);
export type ImportPlatform = z.infer<typeof importPlatformEnum>;

// Import auth type enum
export const importAuthTypeEnum = z.enum(["oauth2", "api_key", "app_credentials"]);
export type ImportAuthType = z.infer<typeof importAuthTypeEnum>;

// Import source status enum
export const importSourceStatusEnum = z.enum(["active", "inactive", "error"]);
export type ImportSourceStatus = z.infer<typeof importSourceStatusEnum>;

// Import job type enum
export const importJobTypeEnum = z.enum(["full", "delta"]);
export type ImportJobType = z.infer<typeof importJobTypeEnum>;

// Import job status enum
export const importJobStatusEnum = z.enum(["queued", "running", "success", "failed", "partial"]);
export type ImportJobStatus = z.infer<typeof importJobStatusEnum>;

// Import job log level enum
export const importJobLogLevelEnum = z.enum(["info", "warn", "error"]);
export type ImportJobLogLevel = z.infer<typeof importJobLogLevelEnum>;

// Import job error stage enum
export const importJobErrorStageEnum = z.enum(["fetch", "transform", "persist", "webhook"]);
export type ImportJobErrorStage = z.infer<typeof importJobErrorStageEnum>;

// Import Sources - Store platform connections with credentials
export const importSources = pgTable("import_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id), // Owner of this import source
  platform: text("platform").notNull(), // "shopify", "bigcommerce", "etsy", "woocommerce"
  authType: text("auth_type").notNull(), // "oauth2", "api_key", "app_credentials"
  credentialsJson: jsonb("credentials_json").notNull(), // Encrypted credentials (API keys, tokens, etc.)
  status: text("status").notNull().default("active"), // "active", "inactive", "error"
  metadata: jsonb("metadata"), // Platform-specific metadata (store URL, shop name, etc.)
  autoPublish: integer("auto_publish").default(0), // 0 = draft, 1 = publish imported products automatically
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertImportSourceSchema = createInsertSchema(importSources)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    platform: importPlatformEnum,
    authType: importAuthTypeEnum,
    status: importSourceStatusEnum.optional(),
  });
export type InsertImportSource = z.infer<typeof insertImportSourceSchema>;
export type ImportSource = typeof importSources.$inferSelect;

// Import Jobs - Track import job execution
export const importJobs = pgTable("import_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull().references(() => importSources.id, { onDelete: "cascade" }), // References import_sources.id
  type: text("type").notNull(), // "full", "delta"
  status: text("status").notNull().default("queued"), // "queued", "running", "success", "failed", "partial"
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  errorCount: integer("error_count").default(0),
  lastCheckpoint: text("last_checkpoint"), // Cursor/token/timestamp for resuming
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id), // User who initiated the job
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertImportJobSchema = createInsertSchema(importJobs)
  .omit({ id: true, createdAt: true })
  .extend({
    type: importJobTypeEnum,
    status: importJobStatusEnum.optional(),
  });
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type ImportJob = typeof importJobs.$inferSelect;

// Import Job Logs - Structured logging for import jobs
export const importJobLogs = pgTable("import_job_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => importJobs.id, { onDelete: "cascade" }), // References import_jobs.id
  level: text("level").notNull(), // "info", "warn", "error"
  message: text("message").notNull(),
  detailsJson: jsonb("details_json"), // Additional context
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertImportJobLogSchema = createInsertSchema(importJobLogs)
  .omit({ id: true, createdAt: true })
  .extend({
    level: importJobLogLevelEnum,
  });
export type InsertImportJobLog = z.infer<typeof insertImportJobLogSchema>;
export type ImportJobLog = typeof importJobLogs.$inferSelect;

// Import Job Errors - Track errors for retry logic
export const importJobErrors = pgTable("import_job_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => importJobs.id, { onDelete: "cascade" }), // References import_jobs.id
  externalId: text("external_id"), // External platform product/item ID
  stage: text("stage").notNull(), // "fetch", "transform", "persist", "webhook"
  errorCode: text("error_code"),
  errorMessage: text("error_message").notNull(),
  retryCount: integer("retry_count").default(0),
  resolved: integer("resolved").default(0), // 0 = false, 1 = true
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertImportJobErrorSchema = createInsertSchema(importJobErrors)
  .omit({ id: true, createdAt: true })
  .extend({
    stage: importJobErrorStageEnum,
  });
export type InsertImportJobError = z.infer<typeof insertImportJobErrorSchema>;
export type ImportJobError = typeof importJobErrors.$inferSelect;

// Product Source Mappings - Link Upfirst products to external platform products
export const productSourceMappings = pgTable("product_source_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }), // References products.id
  sourceId: varchar("source_id").notNull().references(() => importSources.id, { onDelete: "cascade" }), // References import_sources.id
  externalProductId: text("external_product_id").notNull(), // Platform's product ID
  externalVariantId: text("external_variant_id"), // Platform's variant ID (if applicable)
  externalHandle: text("external_handle"), // Platform's product handle/slug
  lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
  syncState: text("sync_state").notNull().default("active"), // "active", "deleted", "error"
  checksum: text("checksum"), // Hash of product data to detect changes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Unique constraint: one mapping per product/source combination
    uniqueProductSource: uniqueIndex("product_source_mappings_product_source_unique").on(table.productId, table.sourceId),
    // Unique constraint: one mapping per product/source/external ID combination
    uniqueMapping: uniqueIndex("unique_product_source_mapping").on(table.productId, table.sourceId, table.externalProductId),
  };
});

export const insertProductSourceMappingSchema = createInsertSchema(productSourceMappings)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    syncState: syncStateEnum.optional(),
  });
export type InsertProductSourceMapping = z.infer<typeof insertProductSourceMappingSchema>;
export type ProductSourceMapping = typeof productSourceMappings.$inferSelect;

// Invoices - Track generated invoices for orders
export const documentTypeEnum = z.enum(["invoice", "packing_slip"]);
export type DocumentType = z.infer<typeof documentTypeEnum>;

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  sellerId: varchar("seller_id").notNull(), // Seller who owns this order
  invoiceNumber: varchar("invoice_number").notNull().unique(), // INV-YYYYMMDD-XXXXX
  documentUrl: text("document_url").notNull(), // URL to PDF in object storage
  documentType: text("document_type").notNull().default("invoice"), // "invoice" (for invoices table)
  orderType: text("order_type").notNull(), // "b2c" or "wholesale"
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  
  // Wholesale-specific fields
  poNumber: varchar("po_number"), // Purchase Order number
  vatNumber: varchar("vat_number"), // VAT/Tax ID
  incoterms: varchar("incoterms"), // e.g., "FOB", "CIF", "DDP"
  paymentTerms: varchar("payment_terms"), // e.g., "Net 30", "Net 60"
  
  // Metadata
  generatedBy: varchar("generated_by"), // User ID who manually generated (null for auto)
  generationTrigger: varchar("generation_trigger").notNull(), // "auto_on_payment", "auto_on_ship", "manual"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Index for fast order lookup
    orderIdIdx: index("invoices_order_id_idx").on(table.orderId),
    // Index for seller's invoices
    sellerIdIdx: index("invoices_seller_id_idx").on(table.sellerId),
  };
});

export const insertInvoiceSchema = createInsertSchema(invoices)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Packing Slips - Track generated packing slips for orders
export const packingSlips = pgTable("packing_slips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  sellerId: varchar("seller_id").notNull(), // Seller who owns this order
  packingSlipNumber: varchar("packing_slip_number").notNull().unique(), // PS-YYYYMMDD-XXXXX
  documentUrl: text("document_url").notNull(), // URL to PDF in object storage
  documentType: text("document_type").notNull().default("packing_slip"), // "packing_slip" (for packing_slips table)
  
  // Packing-specific fields
  warehouseNotes: text("warehouse_notes"), // Special handling instructions
  giftMessage: text("gift_message"), // Gift message if order is a gift
  includesPricing: integer("includes_pricing").default(0), // 0 = no prices (standard), 1 = include prices
  
  // Metadata
  generatedBy: varchar("generated_by"), // User ID who manually generated (null for auto)
  generationTrigger: varchar("generation_trigger").notNull(), // "auto_on_ready_to_ship", "manual"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Index for fast order lookup
    orderIdIdx: index("packing_slips_order_id_idx").on(table.orderId),
    // Index for seller's packing slips
    sellerIdIdx: index("packing_slips_seller_id_idx").on(table.sellerId),
  };
});

export const insertPackingSlipSchema = createInsertSchema(packingSlips)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPackingSlip = z.infer<typeof insertPackingSlipSchema>;
export type PackingSlip = typeof packingSlips.$inferSelect;

// Analytics Events - Track all user activities for admin dashboard
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userEmail: varchar("user_email"), // Duplicate for faster queries without joins
  eventType: varchar("event_type").notNull(), // signup, product_listed, sale_made, login, etc.
  eventCategory: varchar("event_category").notNull(), // user, product, order, etc.
  eventData: jsonb("event_data"), // Additional context about the event
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("analytics_events_user_id_idx").on(table.userId),
    eventTypeIdx: index("analytics_events_event_type_idx").on(table.eventType),
    createdAtIdx: index("analytics_events_created_at_idx").on(table.createdAt),
  };
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, createdAt: true });
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// Feature Adoptions - Track which features users have seen/adopted
export const featureAdoptions = pgTable("feature_adoptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  featureKey: varchar("feature_key").notNull(), // e.g., "wholesale_2024", "shipping_matrix_v2"
  featureName: varchar("feature_name").notNull(), // Human-readable name
  status: varchar("status").notNull().default("pending"), // pending, seen, adopted, dismissed
  adoptedAt: timestamp("adopted_at"), // When user clicked "Got it" or used the feature
  dismissedAt: timestamp("dismissed_at"), // When user clicked "Don't show again"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userFeatureIdx: uniqueIndex("feature_adoptions_user_feature_idx").on(table.userId, table.featureKey),
    statusIdx: index("feature_adoptions_status_idx").on(table.status),
  };
});

export const insertFeatureAdoptionSchema = createInsertSchema(featureAdoptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeatureAdoption = z.infer<typeof insertFeatureAdoptionSchema>;
export type FeatureAdoption = typeof featureAdoptions.$inferSelect;

// Daily Analytics Aggregates - Pre-computed for fast dashboard loading
export const dailyAnalytics = pgTable("daily_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(), // Date this data is for
  newSignups: integer("new_signups").default(0),
  newSellers: integer("new_sellers").default(0),
  newBuyers: integer("new_buyers").default(0),
  productsListed: integer("products_listed").default(0),
  ordersPlaced: integer("orders_placed").default(0),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  activeUsers: integer("active_users").default(0), // Users who took any action
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    dateIdx: uniqueIndex("daily_analytics_date_idx").on(table.date),
  };
});

export const insertDailyAnalyticsSchema = createInsertSchema(dailyAnalytics).omit({ id: true, createdAt: true });
export type InsertDailyAnalytics = z.infer<typeof insertDailyAnalyticsSchema>;
export type DailyAnalytics = typeof dailyAnalytics.$inferSelect;

// Saved Addresses - For both buyers and sellers
export const savedAddresses = pgTable("saved_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  
  // Address fields
  fullName: varchar("full_name").notNull(),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  postalCode: varchar("postal_code").notNull(),
  country: varchar("country").notNull().default("US"),
  
  // Phone number (optional but recommended for shipping)
  phone: varchar("phone"),
  
  // Metadata
  isDefault: integer("is_default").default(0), // 0 = no, 1 = yes (only one can be default per user)
  label: varchar("label"), // e.g., "Home", "Work", "Office"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("saved_addresses_user_id_idx").on(table.userId),
  };
});

export const insertSavedAddressSchema = createInsertSchema(savedAddresses).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSavedAddress = z.infer<typeof insertSavedAddressSchema>;
export type SavedAddress = typeof savedAddresses.$inferSelect;

// Saved Payment Methods - ONLY stores Stripe Payment Method IDs (PCI-compliant)
// NEVER stores raw card numbers, CVV, or sensitive data
export const savedPaymentMethods = pgTable("saved_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  
  // Stripe Payment Method ID (this is the secure token)
  stripePaymentMethodId: varchar("stripe_payment_method_id").notNull().unique(),
  
  // Display information ONLY (safe to store, provided by Stripe)
  cardBrand: varchar("card_brand"), // "visa", "mastercard", "amex"
  cardLast4: varchar("card_last4"), // Last 4 digits for display
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  
  // Metadata
  isDefault: integer("is_default").default(0), // 0 = no, 1 = yes
  label: varchar("label"), // e.g., "Personal", "Business"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("saved_payment_methods_user_id_idx").on(table.userId),
  };
});

export const insertSavedPaymentMethodSchema = createInsertSchema(savedPaymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSavedPaymentMethod = z.infer<typeof insertSavedPaymentMethodSchema>;
export type SavedPaymentMethod = typeof savedPaymentMethods.$inferSelect;

// ============================================================================
// TRUSTPILOT INTEGRATION
// ============================================================================

// Trustpilot OAuth Tokens - Store OAuth credentials per seller
export const trustpilotTokens = pgTable("trustpilot_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // One Trustpilot connection per seller
  
  // OAuth tokens
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: varchar("token_type").default("Bearer"),
  expiresAt: timestamp("expires_at").notNull(), // When access token expires
  
  // Trustpilot Business Unit
  businessUnitId: varchar("business_unit_id").notNull(), // Trustpilot business unit ID
  businessName: text("business_name"), // Store name from Trustpilot
  
  // Sync settings
  autoSync: integer("auto_sync").default(1), // 0 = manual only, 1 = auto sync
  lastSyncAt: timestamp("last_sync_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("trustpilot_tokens_user_id_idx").on(table.userId),
  };
});

export const insertTrustpilotTokenSchema = createInsertSchema(trustpilotTokens).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrustpilotToken = z.infer<typeof insertTrustpilotTokenSchema>;
export type TrustpilotToken = typeof trustpilotTokens.$inferSelect;

// Trustpilot Reviews - Store imported reviews
export const trustpilotReviews = pgTable("trustpilot_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(), // Seller who owns this review
  
  // Trustpilot Review Data
  trustpilotReviewId: varchar("trustpilot_review_id").notNull().unique(), // Trustpilot's review ID
  stars: integer("stars").notNull(), // 1-5
  title: text("title"),
  content: text("content").notNull(),
  
  // Reviewer Info
  reviewerName: text("reviewer_name").notNull(),
  reviewerCountry: varchar("reviewer_country"),
  verifiedBuyer: integer("verified_buyer").default(0), // 0 = no, 1 = yes
  
  // Product Association (optional - for product-specific reviews)
  productId: varchar("product_id"), // Link to our product if available
  productSku: varchar("product_sku"), // Trustpilot product SKU
  
  // Review Metadata
  reviewDate: timestamp("review_date").notNull(), // When review was posted on Trustpilot
  language: varchar("language").default("en"),
  
  // Reply (if seller responded)
  replyText: text("reply_text"),
  replyDate: timestamp("reply_date"),
  
  // Display Settings
  isVisible: integer("is_visible").default(1), // 0 = hidden, 1 = visible on storefront
  isFeatured: integer("is_featured").default(0), // 0 = no, 1 = featured review
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdIdx: index("trustpilot_reviews_seller_id_idx").on(table.sellerId),
    productIdIdx: index("trustpilot_reviews_product_id_idx").on(table.productId),
    starsIdx: index("trustpilot_reviews_stars_idx").on(table.stars),
  };
});

export const insertTrustpilotReviewSchema = createInsertSchema(trustpilotReviews).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrustpilotReview = z.infer<typeof insertTrustpilotReviewSchema>;
export type TrustpilotReview = typeof trustpilotReviews.$inferSelect;

// ============================================================================
// META ADS INTEGRATION
// ============================================================================

export const metaAdCampaignStatusEnum = z.enum(["active", "paused", "completed", "cancelled", "error"]);
export type MetaAdCampaignStatus = z.infer<typeof metaAdCampaignStatusEnum>;

export const metaAdObjectiveEnum = z.enum(["OUTCOME_SALES", "OUTCOME_LEADS", "OUTCOME_ENGAGEMENT", "OUTCOME_TRAFFIC", "OUTCOME_AWARENESS"]);
export type MetaAdObjective = z.infer<typeof metaAdObjectiveEnum>;

// Meta Ad Campaigns
export const metaAdCampaigns = pgTable("meta_ad_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(), // Seller who owns this campaign
  
  // Meta Campaign Info
  metaCampaignId: varchar("meta_campaign_id").unique(), // Meta's campaign ID (null until created)
  campaignName: text("campaign_name").notNull(),
  
  // Campaign Settings
  objective: varchar("objective").notNull().default("OUTCOME_SALES"), // OUTCOME_SALES, OUTCOME_LEADS, etc.
  status: varchar("status").notNull().default("paused"), // active, paused, completed, cancelled, error
  
  // Products & Creative
  productIds: text("product_ids").array().notNull(), // Products to advertise
  adCopy: text("ad_copy").notNull(), // Generated by Gemini
  headline: text("headline").notNull(),
  callToAction: varchar("call_to_action").default("SHOP_NOW"), // SHOP_NOW, LEARN_MORE, etc.
  
  // Targeting
  targetCountries: text("target_countries").array().notNull(), // ["US", "CA"]
  targetLanguages: text("target_languages").array(), // ["en", "es"]
  targetAgeMin: integer("target_age_min").default(18),
  targetAgeMax: integer("target_age_max").default(65),
  targetGender: varchar("target_gender"), // "male", "female", null = all
  
  // Advantage+ Settings
  advantagePlusEnabled: integer("advantage_plus_enabled").default(1), // 0 = no, 1 = yes
  advantageAudience: integer("advantage_audience").default(1), // AI-driven audience
  advantagePlacements: integer("advantage_placements").default(1), // Auto placements
  
  // Budget & Scheduling
  dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }).notNull(), // User's daily budget
  totalBudget: decimal("total_budget", { precision: 10, scale: 2 }).notNull(), // Total campaign budget
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // null = no end date
  
  // Payment & Fees
  amountCharged: decimal("amount_charged", { precision: 10, scale: 2 }).default("0"), // Total charged from user
  metaSpend: decimal("meta_spend", { precision: 10, scale: 2 }).default("0"), // Total spent on Meta
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default("0"), // 20% platform fee
  remainingBudget: decimal("remaining_budget", { precision: 10, scale: 2 }).default("0"),
  
  // Stripe Payment
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // Initial payment
  
  // Performance Metrics (cached)
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  reach: integer("reach").default(0),
  ctr: decimal("ctr", { precision: 5, scale: 2 }).default("0"), // Click-through rate
  cpc: decimal("cpc", { precision: 10, scale: 2 }).default("0"), // Cost per click
  
  // Error Handling
  errorMessage: text("error_message"), // If campaign creation fails
  lastSyncAt: timestamp("last_sync_at"), // Last performance data sync
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdIdx: index("meta_ad_campaigns_seller_id_idx").on(table.sellerId),
    statusIdx: index("meta_ad_campaigns_status_idx").on(table.status),
  };
});

export const insertMetaAdCampaignSchema = createInsertSchema(metaAdCampaigns).omit({ 
  id: true, 
  metaCampaignId: true,
  amountCharged: true,
  metaSpend: true,
  platformFee: true,
  remainingBudget: true,
  impressions: true,
  clicks: true,
  conversions: true,
  reach: true,
  ctr: true,
  cpc: true,
  lastSyncAt: true,
  createdAt: true, 
  updatedAt: true 
});
export type InsertMetaAdCampaign = z.infer<typeof insertMetaAdCampaignSchema>;
export type MetaAdCampaign = typeof metaAdCampaigns.$inferSelect;

// Meta Ad Performance (daily snapshots)
export const metaAdPerformance = pgTable("meta_ad_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(), // Our campaign ID
  metaCampaignId: varchar("meta_campaign_id"), // Meta's campaign ID
  
  // Performance Metrics
  date: varchar("date").notNull(), // YYYY-MM-DD
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  reach: integer("reach").default(0),
  spend: decimal("spend", { precision: 10, scale: 2 }).default("0"),
  
  // Calculated Metrics
  ctr: decimal("ctr", { precision: 5, scale: 2 }).default("0"), // Click-through rate
  cpc: decimal("cpc", { precision: 10, scale: 2 }).default("0"), // Cost per click
  cpm: decimal("cpm", { precision: 10, scale: 2 }).default("0"), // Cost per mille (1000 impressions)
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    campaignIdIdx: index("meta_ad_performance_campaign_id_idx").on(table.campaignId),
    dateIdx: index("meta_ad_performance_date_idx").on(table.date),
  };
});

export const insertMetaAdPerformanceSchema = createInsertSchema(metaAdPerformance).omit({ id: true, createdAt: true });
export type InsertMetaAdPerformance = z.infer<typeof insertMetaAdPerformanceSchema>;
export type MetaAdPerformance = typeof metaAdPerformance.$inferSelect;

// Meta Ad Payment Transactions
export const metaAdPayments = pgTable("meta_ad_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  
  // Payment Details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Total payment
  metaSpend: decimal("meta_spend", { precision: 10, scale: 2 }).notNull(), // Amount to Meta (80%)
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(), // Our fee (20%)
  
  // Stripe Info
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull(),
  paymentStatus: varchar("payment_status").notNull().default("pending"), // pending, succeeded, failed, refunded
  
  // Type
  paymentType: varchar("payment_type").notNull(), // "initial", "topup", "refund"
  
  // Refund Info
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }), // If refunded
  refundReason: text("refund_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    campaignIdIdx: index("meta_ad_payments_campaign_id_idx").on(table.campaignId),
    sellerIdIdx: index("meta_ad_payments_seller_id_idx").on(table.sellerId),
  };
});

export const insertMetaAdPaymentSchema = createInsertSchema(metaAdPayments).omit({ id: true, createdAt: true });
export type InsertMetaAdPayment = z.infer<typeof insertMetaAdPaymentSchema>;
export type MetaAdPayment = typeof metaAdPayments.$inferSelect;

// ============================================================================
// HOMEPAGE BUILDER
// ============================================================================

export const homepageStatusEnum = z.enum(["draft", "published", "unpublished"]);
export type HomepageStatus = z.infer<typeof homepageStatusEnum>;

export const homepageTemplateEnum = z.enum(["hero-cta", "split-hero", "minimal"]);
export type HomepageTemplate = z.infer<typeof homepageTemplateEnum>;

export const mediaTypeEnum = z.enum(["image", "video"]);
export type MediaType = z.infer<typeof mediaTypeEnum>;

// Seller Homepages - One homepage per seller
export const sellerHomepages = pgTable("seller_homepages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().unique(), // One homepage per seller
  
  // Status & Template
  status: varchar("status").notNull().default("draft"), // draft, published, unpublished
  templateKey: varchar("template_key").notNull().default("hero-cta"), // hero-cta, split-hero, minimal
  
  // Layout Configs (JSON for template slot values)
  desktopConfig: jsonb("desktop_config").notNull(), // Desktop layout config
  mobileConfig: jsonb("mobile_config").notNull(), // Mobile layout config
  
  // Hero Media
  heroMediaId: varchar("hero_media_id"), // References homepage_media_assets
  heroMediaType: varchar("hero_media_type"), // "image" or "video"
  
  // Content
  headline: text("headline").notNull(),
  bodyCopy: text("body_copy").notNull(),
  
  // CTA
  selectedCtaId: varchar("selected_cta_id").notNull(), // References homepage_cta_options
  
  // Music
  musicTrackId: varchar("music_track_id"), // References music_tracks (optional)
  musicEnabled: integer("music_enabled").default(0), // 0 = disabled, 1 = enabled
  
  // Auto-redirect setting
  autoRedirectToHomepage: integer("auto_redirect_to_homepage").default(0), // 0 = no, 1 = yes (redirect / to homepage)
  
  // Publishing
  lastPublishedAt: timestamp("last_published_at"),
  publishedDesktopConfig: jsonb("published_desktop_config"), // Published snapshot
  publishedMobileConfig: jsonb("published_mobile_config"), // Published snapshot
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdIdx: uniqueIndex("seller_homepages_seller_id_idx").on(table.sellerId),
  };
});

export const insertSellerHomepageSchema = createInsertSchema(sellerHomepages).omit({ 
  id: true, 
  lastPublishedAt: true,
  publishedDesktopConfig: true,
  publishedMobileConfig: true,
  createdAt: true, 
  updatedAt: true 
});
export type InsertSellerHomepage = z.infer<typeof insertSellerHomepageSchema>;
export type SellerHomepage = typeof sellerHomepages.$inferSelect;

// Safe update schema - ONLY allows updating draft fields, NOT status or published snapshots
export const updateSellerHomepageSchema = insertSellerHomepageSchema.omit({
  sellerId: true, // Cannot change seller
  status: true,   // Cannot change status directly (use publish/unpublish routes)
}).partial(); // All fields optional for partial updates
export type UpdateSellerHomepage = z.infer<typeof updateSellerHomepageSchema>;

// Homepage CTA Options - Predefined CTAs
export const homepageCtaOptions = pgTable("homepage_cta_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // CTA Details
  label: text("label").notNull(), // "Shop Now", "View Products", "Explore Collection"
  variant: varchar("variant").notNull().default("default"), // Button variant
  icon: varchar("icon"), // Lucide icon name
  description: text("description"), // Help text for seller
  
  // URL (relative to seller storefront)
  urlPath: text("url_path").notNull(), // "/s/:username", "/s/:username/products"
  
  // Display
  isActive: integer("is_active").default(1), // 0 = hidden, 1 = active
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHomepageCtaOptionSchema = createInsertSchema(homepageCtaOptions).omit({ id: true, createdAt: true });
export type InsertHomepageCtaOption = z.infer<typeof insertHomepageCtaOptionSchema>;
export type HomepageCtaOption = typeof homepageCtaOptions.$inferSelect;

// Homepage Media Assets
export const homepageMediaAssets = pgTable("homepage_media_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homepageId: varchar("homepage_id").notNull(), // Seller homepage ID
  
  // Media Details
  type: varchar("type").notNull(), // "image" or "video"
  objectKey: text("object_key").notNull(), // Object storage key
  url: text("url").notNull(), // Signed/public URL
  
  // Metadata
  altText: text("alt_text"),
  focalPoint: jsonb("focal_point"), // {x: 0.5, y: 0.5} for image cropping
  duration: integer("duration"), // Video duration in seconds
  
  // Display
  isHero: integer("is_hero").default(0), // 0 = no, 1 = hero media
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    homepageIdIdx: index("homepage_media_assets_homepage_id_idx").on(table.homepageId),
  };
});

export const insertHomepageMediaAssetSchema = createInsertSchema(homepageMediaAssets).omit({ id: true, createdAt: true });
export type InsertHomepageMediaAsset = z.infer<typeof insertHomepageMediaAssetSchema>;
export type HomepageMediaAsset = typeof homepageMediaAssets.$inferSelect;

// Music Tracks - Royalty-free music catalogue
export const musicTracks = pgTable("music_tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Provider Info
  provider: varchar("provider").notNull().default("pixabay"), // pixabay, artlist, manual
  providerTrackId: varchar("provider_track_id").notNull(), // External track ID
  
  // Track Details
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  duration: integer("duration").notNull(), // Duration in seconds
  
  // URLs
  previewUrl: text("preview_url").notNull(), // Preview/stream URL
  streamUrl: text("stream_url"), // Full track URL (if available)
  downloadUrl: text("download_url"), // Download URL (if available)
  
  // Metadata
  genre: varchar("genre"),
  mood: varchar("mood"), // "upbeat", "calm", "energetic"
  tags: text("tags").array(), // Search tags
  waveform: text("waveform"), // Waveform data for visualization
  
  // Licensing
  licenseTier: varchar("license_tier").default("free"), // "free", "premium"
  licenseUrl: text("license_url"), // Link to license terms
  
  // Cache
  isActive: integer("is_active").default(1), // 0 = removed from catalog, 1 = active
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    providerIdx: index("music_tracks_provider_idx").on(table.provider),
    genreIdx: index("music_tracks_genre_idx").on(table.genre),
  };
});

export const insertMusicTrackSchema = createInsertSchema(musicTracks).omit({ id: true, createdAt: true });
export type InsertMusicTrack = z.infer<typeof insertMusicTrackSchema>;
export type MusicTrack = typeof musicTracks.$inferSelect;
