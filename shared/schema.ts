import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const productTypeEnum = z.enum(["in-stock", "pre-order", "made-to-order", "wholesale"]);
export type ProductType = z.infer<typeof productTypeEnum>;

export const orderStatusEnum = z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]);
export type OrderStatus = z.infer<typeof orderStatusEnum>;

export const paymentStatusEnum = z.enum(["pending", "deposit_paid", "fully_paid", "refunded"]);
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

export const userRoleEnum = z.enum(["admin", "editor", "viewer", "buyer"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const invitationStatusEnum = z.enum(["pending", "accepted", "expired"]);
export type InvitationStatus = z.infer<typeof invitationStatusEnum>;

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
  variants: jsonb("variants"), // [{size, color, stock, image}]
  madeToOrderDays: integer("made_to_order_days"), // Days after purchase for made-to-order
  preOrderDate: timestamp("pre_order_date"), // Availability date for pre-order
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

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
  items: text("items").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  remainingBalance: decimal("remaining_balance", { precision: 10, scale: 2 }).default("0"),
  paymentType: text("payment_type").default("full"), // "full", "deposit", "balance"
  paymentStatus: text("payment_status").default("pending"), // "pending", "deposit_paid", "fully_paid"
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // Stripe payment intent ID for deposit
  stripeBalancePaymentIntentId: varchar("stripe_balance_payment_intent_id"), // Stripe payment intent ID for balance
  status: text("status").notNull().default("pending"),
  trackingNumber: varchar("tracking_number"),
  trackingLink: text("tracking_link"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type SelectOrder = typeof orders.$inferSelect;

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
  invitedBy: varchar("invited_by"), // User ID of who invited this user
  storeBanner: text("store_banner"), // Seller's store banner image URL
  storeLogo: text("store_logo"), // Seller's store logo URL
  paymentProvider: varchar("payment_provider").default("stripe"), // stripe, paypal
  stripeConnectedAccountId: varchar("stripe_connected_account_id"), // Stripe Connect account ID for receiving payments
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe Customer ID for subscription & saved payment methods
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Stripe Subscription ID for recurring billing
  subscriptionStatus: varchar("subscription_status"), // trial, active, past_due, canceled, null
  subscriptionPlan: varchar("subscription_plan"), // monthly, annual
  trialEndsAt: timestamp("trial_ends_at"), // When 30-day trial expires
  paypalMerchantId: varchar("paypal_merchant_id"), // PayPal merchant ID
  customDomain: varchar("custom_domain"), // Custom domain for store (e.g., mystore.com)
  customDomainVerified: integer("custom_domain_verified").default(0), // 0 = false, 1 = true
  instagramUserId: varchar("instagram_user_id"), // Instagram user ID from OAuth
  instagramUsername: varchar("instagram_username"), // Instagram username from OAuth
  instagramAccessToken: text("instagram_access_token"), // Instagram access token (encrypted in production)
  shippingPrice: decimal("shipping_price", { precision: 10, scale: 2 }).default("0"), // Flat shipping rate for seller
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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

export const newsletters = pgTable("newsletters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  recipients: jsonb("recipients").notNull(),
  status: text("status").notNull().default("draft"), // "draft", "sent", "failed"
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({ id: true, createdAt: true });
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletters.$inferSelect;
export type SelectNewsletter = typeof newsletters.$inferSelect;

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
