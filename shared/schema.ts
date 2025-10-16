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

export const storeContextRoleEnum = z.enum(["buyer", "seller", "owner"]);
export type StoreContextRole = z.infer<typeof storeContextRoleEnum>;

// New auth system: user_type enum (single source of truth for user identity)
export const userTypeEnum = z.enum(["seller", "buyer"]);
export type UserType = z.infer<typeof userTypeEnum>;

// PostgreSQL enum for user_type
export const userTypePgEnum = pgEnum("user_type", ["seller", "buyer"]);

// PostgreSQL enum for store context roles (buyer/seller/owner)
export const storeContextRolePgEnum = pgEnum("store_context_role", ["buyer", "seller", "owner"]);

// PostgreSQL enum for order event types
export const orderEventTypePgEnum = pgEnum("order_event_type", [
  "status_change",
  "email_sent",
  "payment_received",
  "refund_processed",
  "tracking_updated",
  "balance_payment_requested",
  "balance_payment_received",
  "document_generated"
]);

// PostgreSQL enum for balance payment status
export const balancePaymentStatusPgEnum = pgEnum("order_balance_payment_status", [
  "pending",
  "requested",
  "paid",
  "failed",
  "cancelled"
]);

// Refund system enums
export const refundLineItemTypeEnum = z.enum(["product", "shipping", "tax", "adjustment"]);
export type RefundLineItemType = z.infer<typeof refundLineItemTypeEnum>;

export const refundLineItemTypePgEnum = pgEnum("refund_line_item_type", [
  "product",
  "shipping",
  "tax",
  "adjustment"
]);

// PostgreSQL enums for Wholesale B2B System
export const wholesaleOrderStatusPgEnum = pgEnum("wholesale_order_status", [
  "pending",
  "deposit_paid",
  "awaiting_balance",
  "balance_overdue",
  "ready_to_release",
  "in_production",
  "fulfilled",
  "cancelled"
]);

export const wholesalePaymentTypePgEnum = pgEnum("wholesale_payment_type", [
  "deposit",
  "balance"
]);

export const wholesalePaymentStatusPgEnum = pgEnum("wholesale_payment_status", [
  "pending",
  "requested",
  "paid",
  "failed",
  "cancelled",
  "overdue"
]);

export const wholesaleShippingTypePgEnum = pgEnum("wholesale_shipping_type", [
  "freight_collect",
  "buyer_pickup"
]);

export const wholesaleOrderEventTypePgEnum = pgEnum("wholesale_order_event_type", [
  "order_created",
  "status_change",
  "deposit_payment_received",
  "balance_payment_requested",
  "balance_payment_received",
  "balance_payment_overdue",
  "email_sent",
  "tracking_updated",
  "order_fulfilled",
  "order_cancelled"
]);

export const wholesalePaymentIntentStatusPgEnum = pgEnum("wholesale_payment_intent_status", [
  "pending",
  "succeeded",
  "failed",
  "canceled"
]);

// PostgreSQL enums for Trade Quotation System
export const tradeQuotationStatusPgEnum = pgEnum("trade_quotation_status", [
  "draft",
  "sent", 
  "viewed",
  "accepted",
  "deposit_paid",
  "balance_due",
  "fully_paid",
  "completed",
  "cancelled",
  "expired"
]);

export const tradeQuotationEventTypePgEnum = pgEnum("trade_quotation_event_type", [
  "created",
  "sent",
  "viewed",
  "accepted",
  "deposit_paid",
  "balance_paid",
  "expired",
  "cancelled",
  "email_sent"
]);

export const tradePaymentTypePgEnum = pgEnum("trade_payment_type", [
  "deposit",
  "balance"
]);

export const tradePaymentStatusPgEnum = pgEnum("trade_payment_status", [
  "pending",
  "paid",
  "overdue",
  "cancelled"
]);

export const invitationStatusEnum = z.enum(["pending", "accepted", "expired"]);
export type InvitationStatus = z.infer<typeof invitationStatusEnum>;

export const productStatusEnum = z.enum(["active", "draft", "coming-soon", "paused", "out-of-stock", "archived"]);
export type ProductStatus = z.infer<typeof productStatusEnum>;

// Zod enums for Trade Quotation System
export const tradeQuotationStatusEnum = z.enum([
  "draft",
  "sent", 
  "viewed",
  "accepted",
  "deposit_paid",
  "balance_due",
  "fully_paid",
  "completed",
  "cancelled",
  "expired"
]);
export type TradeQuotationStatus = z.infer<typeof tradeQuotationStatusEnum>;

export const tradeQuotationEventTypeEnum = z.enum([
  "created",
  "sent",
  "viewed",
  "accepted",
  "deposit_paid",
  "balance_paid",
  "expired",
  "cancelled",
  "email_sent"
]);
export type TradeQuotationEventType = z.infer<typeof tradeQuotationEventTypeEnum>;

export const tradePaymentTypeEnum = z.enum([
  "deposit",
  "balance"
]);
export type TradePaymentType = z.infer<typeof tradePaymentTypeEnum>;

export const tradePaymentStatusEnum = z.enum([
  "pending",
  "paid",
  "overdue",
  "cancelled"
]);
export type TradePaymentStatus = z.infer<typeof tradePaymentStatusEnum>;

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

const baseInsertProductSchema = createInsertSchema(products).omit({ id: true }).extend({
  name: z.string().min(1, "Product name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000, "Description must be 5000 characters or less"),
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  sku: z.string().optional().nullable().transform(val => val?.trim() || undefined), // Optional SKU - auto-generated if not provided
  image: z.string().optional().nullable(), // Optional - can be extracted from images array
  category: z.string().min(1, "Category is required"),
  productType: z.string().default("in-stock"), // Default to in-stock for bulk uploads
  preOrderDate: z.coerce.date().optional().nullable().transform(val => val || undefined),
  discountPercentage: z.string().optional().nullable().transform(val => val || undefined),
  promotionEndDate: z.coerce.date().optional().nullable().transform(val => val || undefined),
  promotionActive: z.number().optional().nullable().transform(val => val ?? undefined),
  // CRITICAL: Include variants and other optional fields that were missing
  variants: z.any().optional().nullable(), // JSON array of variant objects [{size, color, stock, image, sku}]
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

export const insertProductSchema = baseInsertProductSchema.refine(
  (data) => {
    // Pre-order products must have a pre-order date
    if (data.productType === "pre-order" && !data.preOrderDate) {
      return false;
    }
    return true;
  },
  {
    message: "Pre-order date is required for pre-order products",
    path: ["preOrderDate"],
  }
).refine(
  (data) => {
    // Made-to-order products must have lead time days
    if (data.productType === "made-to-order" && (!data.madeToOrderDays || data.madeToOrderDays <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Lead time (days) is required for made-to-order products and must be greater than 0",
    path: ["madeToOrderDays"],
  }
);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Frontend product schema (without sellerId - added by backend)
export const frontendProductSchema = baseInsertProductSchema.omit({ sellerId: true }).extend({
  sku: z.string().optional().nullable().transform(val => val?.trim() || undefined), // Optional product SKU
  shippingType: z.enum(["flat", "matrix", "shippo", "free"]),
}).refine(
  (data) => {
    // Either image or images must be provided
    const hasImage = data.image && data.image.trim().length > 0;
    const hasImages = data.images && data.images.length > 0;
    return hasImage || hasImages;
  },
  {
    message: "At least one product image is required (Image or Images field)",
    path: ["image"],
  }
).refine(
  (data) => {
    // Pre-order products must have a pre-order date
    if (data.productType === "pre-order" && !data.preOrderDate) {
      return false;
    }
    return true;
  },
  {
    message: "Pre-order date is required for pre-order products",
    path: ["preOrderDate"],
  }
).refine(
  (data) => {
    // Made-to-order products must have lead time days
    if (data.productType === "made-to-order" && (!data.madeToOrderDays || data.madeToOrderDays <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Lead time (days) is required for made-to-order products and must be greater than 0",
    path: ["madeToOrderDays"],
  }
);
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
  sellerId: varchar("seller_id"), // CRITICAL: Required for filtering orders by seller
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
  
  // Shipping fields - calculated and stored at order creation
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  shippingMethod: varchar("shipping_method"), // "flat", "matrix", "shippo", "free"
  shippingZone: varchar("shipping_zone"), // For matrix shipping
  shippingCarrier: varchar("shipping_carrier"), // For Shippo shipping (e.g., "USPS", "FedEx")
  shippingEstimatedDays: varchar("shipping_estimated_days"), // Delivery estimate (e.g., "3-5 business days")
  
  // Shipping address (separate fields for better querying and display)
  shippingStreet: text("shipping_street"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingPostalCode: varchar("shipping_postal_code"),
  shippingCountry: varchar("shipping_country"),
  
  // Billing address (separate fields for billing information)
  billingName: text("billing_name"),
  billingEmail: text("billing_email"),
  billingPhone: varchar("billing_phone"),
  billingStreet: text("billing_street"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingPostalCode: varchar("billing_postal_code"),
  billingCountry: varchar("billing_country"),
  
  // Balance Payment Architecture 3 fields - for deposit-only pricing and balance payment flow
  depositAmountCents: integer("deposit_amount_cents"), // Deposit amount in cents (for precise calculations)
  balanceDueCents: integer("balance_due_cents"), // Balance due in cents (remaining product + shipping)
  balancePaidAt: timestamp("balance_paid_at"), // When balance payment was received
  shippingLocked: integer("shipping_locked").default(0), // 0 = can change address, 1 = locked (after shipping)
  pricingVersion: integer("pricing_version").default(1), // Pricing structure version (1 = old, 2 = deposit-only)
  
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type SelectOrder = typeof orders.$inferSelect;

// Customer details update schema - for updating customer information on orders
export const updateCustomerDetailsSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  shippingStreet: z.string().min(1, "Street address is required"),
  shippingCity: z.string().min(1, "City is required"),
  shippingState: z.string().min(1, "State is required"),
  shippingPostalCode: z.string().min(1, "Postal code is required"),
  shippingCountry: z.string().min(1, "Country is required"),
  billingStreet: z.string().min(1, "Street address is required"),
  billingCity: z.string().min(1, "City is required"),
  billingState: z.string().min(1, "State is required"),
  billingPostalCode: z.string().min(1, "Postal code is required"),
  billingCountry: z.string().min(1, "Country is required"),
  notify: z.boolean().optional()
});
export type UpdateCustomerDetails = z.infer<typeof updateCustomerDetailsSchema>;

// Checkout validation schemas - for /api/checkout/initiate endpoint
export const checkoutItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  variant: z.object({
    size: z.string().optional(),
    color: z.string().optional(),
  }).optional(),
});

export const shippingAddressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

export const billingAddressSchema = z.object({
  name: z.string().min(1, "Billing name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Phone number required"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

export type BillingAddress = z.infer<typeof billingAddressSchema>;

export const checkoutInitiateRequestSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "At least one item is required"),
  shippingAddress: shippingAddressSchema,
  billingAddress: billingAddressSchema,
  billingSameAsShipping: z.boolean().default(true),
  customerEmail: z.string().email("Valid email is required"),
  customerName: z.string().min(1, "Customer name is required"),
  checkoutSessionId: z.string().optional(),
});

export type CheckoutItem = z.infer<typeof checkoutItemSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type CheckoutInitiateRequest = z.infer<typeof checkoutInitiateRequestSchema>;

// Order Items - for item-level tracking and fulfillment
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  productId: varchar("product_id").notNull(), // Product/wholesale product ID
  productName: text("product_name").notNull(),
  productImage: text("product_image"),
  productType: text("product_type").notNull(), // "in-stock", "pre-order", "made-to-order", "wholesale"
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Price per unit at time of order (discounted if applicable)
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // Price before discount
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }), // Discount % applied
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }), // Dollar amount saved per unit
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(), // quantity * price
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }), // FIX BUG #3: Per-item balance tracking
  requiresDeposit: integer("requires_deposit").default(0),
  variant: jsonb("variant"), // {size, color} if applicable
  productSku: varchar("product_sku"), // Product-level SKU
  variantSku: varchar("variant_sku"), // Variant-specific SKU (if applicable)
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
  
  // Delivery date fields - for pre-order and made-to-order products
  preOrderDate: timestamp("pre_order_date"), // Customer-selected delivery date for pre-order items
  madeToOrderLeadTime: integer("made_to_order_lead_time"), // Lead time in days for made-to-order items
  
  // Delivery reminder tracking (per-item to support multiple items with different dates)
  deliveryReminderSentAt: timestamp("delivery_reminder_sent_at"), // Track when 7-day reminder was sent for this item
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect & {
  deliveryDate?: string | null;
};
export type SelectOrderItem = typeof orderItems.$inferSelect & {
  deliveryDate?: string | null;
};

// Stock Reservations - prevent overselling with temporary stock holds
export const reservationStatusEnum = z.enum(["active", "committed", "released", "expired"]);
export type ReservationStatus = z.infer<typeof reservationStatusEnum>;

export const stockReservations = pgTable("stock_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(), // References products.id or wholesale_products.id
  variantId: varchar("variant_id"), // Variant identifier (size-color combination) if applicable
  quantity: integer("quantity").notNull(), // How many units are reserved
  orderId: varchar("order_id"), // References orders.id (null until order created)
  sessionId: varchar("session_id"), // Checkout session ID for tracking
  userId: varchar("user_id"), // User who made the reservation (optional - guest checkout)
  status: text("status").notNull().default("active"), // "active", "committed", "released", "expired"
  expiresAt: timestamp("expires_at").notNull(), // Auto-release after this time (default 15 min)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  committedAt: timestamp("committed_at"), // When reservation was committed (payment success)
  releasedAt: timestamp("released_at"), // When reservation was released (checkout abandoned)
}, (table) => {
  return {
    // Performance indexes for availability checks and cleanup
    productVariantStatusIdx: index("stock_res_prod_var_status_idx").on(table.productId, table.variantId, table.status),
    expiresAtIdx: index("stock_res_expires_at_idx").on(table.expiresAt),
    sessionIdx: index("stock_res_session_idx").on(table.sessionId),
  };
});

export const insertStockReservationSchema = createInsertSchema(stockReservations).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertStockReservation = z.infer<typeof insertStockReservationSchema>;
export type StockReservation = typeof stockReservations.$inferSelect;

// Refunds - track all refund transactions (shared for B2C and B2B wholesale)
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id (for B2C) or wholesale_orders.id (for B2B, stored here for query compatibility)
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(), // Total refund amount across all line items
  currency: varchar("currency", { length: 3 }).notNull().default("USD"), // ISO 4217 currency code
  reason: text("reason"), // Refund reason (optional)
  stripeRefundId: varchar("stripe_refund_id"), // Stripe refund ID
  status: text("status").notNull().default("pending"), // "pending", "succeeded", "failed"
  processedBy: varchar("processed_by").notNull(), // User ID who processed the refund
  
  // Wholesale-specific fields (nullable for B2C compatibility)
  wholesaleOrderId: varchar("wholesale_order_id"), // References wholesale_orders.id (null for B2C)
  wholesalePaymentId: varchar("wholesale_payment_id"), // References wholesale_payments.id (null for B2C)
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index("refunds_order_id_idx").on(table.orderId),
    statusIdx: index("refunds_status_idx").on(table.status),
  };
});

export const insertRefundSchema = createInsertSchema(refunds).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refunds.$inferSelect;

// Refund Line Items - track individual items/components of a refund (products, shipping, tax, adjustments)
export const refundLineItems = pgTable("refund_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  refundId: varchar("refund_id").notNull(), // References refunds.id
  orderItemId: varchar("order_item_id"), // References order_items.id (null for shipping/tax/adjustment)
  type: refundLineItemTypePgEnum("type").notNull(), // "product", "shipping", "tax", "adjustment"
  quantity: integer("quantity"), // Quantity being refunded (for product type)
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Amount for this line item
  description: text("description"), // Optional description (e.g., "Shipping refund", "Partial product refund")
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    refundIdIdx: index("refund_line_items_refund_id_idx").on(table.refundId),
    orderItemIdIdx: index("refund_line_items_order_item_id_idx").on(table.orderItemId),
  };
});

export const insertRefundLineItemSchema = createInsertSchema(refundLineItems).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRefundLineItem = z.infer<typeof insertRefundLineItemSchema>;
export type RefundLineItem = typeof refundLineItems.$inferSelect;

// Order Events - track all order-related events (status changes, emails sent, etc.)
export const orderEventTypeEnum = z.enum([
  "status_change",
  "email_sent",
  "payment_received",
  "refund_processed",
  "tracking_updated",
  "balance_payment_requested",
  "balance_payment_received",
  "document_generated"
]);
export type OrderEventType = z.infer<typeof orderEventTypeEnum>;

export const orderEvents = pgTable("order_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  eventType: orderEventTypePgEnum("event_type").notNull(), // Uses PostgreSQL enum for type safety
  payload: jsonb("payload"), // Event-specific data (e.g., { emailType: "order_confirmation", recipient: "buyer@email.com" })
  description: text("description"), // Human-readable event description
  performedBy: varchar("performed_by"), // User ID who triggered the event (null for system events)
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index("order_events_order_id_idx").on(table.orderId),
    occurredAtIdx: index("order_events_occurred_at_idx").on(table.occurredAt),
  };
});

export const insertOrderEventSchema = createInsertSchema(orderEvents).omit({ 
  id: true, 
  occurredAt: true 
});
export type InsertOrderEvent = z.infer<typeof insertOrderEventSchema>;
export type OrderEvent = typeof orderEvents.$inferSelect;

// Order Balance Payments - track deposit and balance payment lifecycle for pre-orders/made-to-order
export const balancePaymentStatusEnum = z.enum([
  "pending", 
  "requested", 
  "paid", 
  "failed", 
  "cancelled"
]);
export type BalancePaymentStatus = z.infer<typeof balancePaymentStatusEnum>;

export const orderBalancePayments = pgTable("order_balance_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(), // Total balance amount due
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"), // Amount paid so far (notNull prevents NULL arithmetic errors)
  currency: varchar("currency", { length: 3 }).notNull(), // ISO 4217 currency code
  status: balancePaymentStatusPgEnum("status").notNull().default("pending"), // Uses PostgreSQL enum for type safety
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // Stripe payment intent ID for balance payment
  requestedAt: timestamp("requested_at"), // When balance payment was requested from buyer
  paidAt: timestamp("paid_at"), // When balance payment was received
  emailSentAt: timestamp("email_sent_at"), // When balance payment request email was sent
  lastReminderAt: timestamp("last_reminder_at"), // When last reminder was sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index("balance_payments_order_id_idx").on(table.orderId),
    statusIdx: index("balance_payments_status_idx").on(table.status),
  };
});

export const insertOrderBalancePaymentSchema = createInsertSchema(orderBalancePayments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertOrderBalancePayment = z.infer<typeof insertOrderBalancePaymentSchema>;
export type OrderBalancePayment = typeof orderBalancePayments.$inferSelect;

// Balance Requests - Architecture 3 balance payment sessions with token-based authentication
export const balanceRequestStatusEnum = z.enum([
  "pending",
  "requested",
  "paid",
  "failed",
  "cancelled"
]);
export type BalanceRequestStatus = z.infer<typeof balanceRequestStatusEnum>;

export const balanceRequestStatusPgEnum = pgEnum("balance_request_status", [
  "pending",
  "requested",
  "paid",
  "failed",
  "cancelled"
]);

export const balanceRequests = pgTable("balance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  createdBy: varchar("created_by").notNull(), // Seller/admin who created the request
  status: balanceRequestStatusPgEnum("status").notNull().default("pending"),
  sessionTokenHash: varchar("session_token_hash"), // HMAC hash of session token for security
  expiresAt: timestamp("expires_at"), // Session expiration (7 days from creation)
  pricingSnapshot: jsonb("pricing_snapshot"), // Snapshot of pricing calculation at request time
  shippingSnapshot: jsonb("shipping_snapshot"), // Snapshot of shipping details at request time
  paymentIntentId: varchar("payment_intent_id"), // Stripe payment intent ID for balance
  balanceDueCents: integer("balance_due_cents"), // Balance amount due in cents
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  emailSentAt: timestamp("email_sent_at"), // When balance payment email was sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index("balance_requests_order_id_idx").on(table.orderId),
    statusIdx: index("balance_requests_status_idx").on(table.status),
    tokenHashIdx: index("balance_requests_token_hash_idx").on(table.sessionTokenHash),
  };
});

export const insertBalanceRequestSchema = createInsertSchema(balanceRequests).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertBalanceRequest = z.infer<typeof insertBalanceRequestSchema>;
export type BalanceRequest = typeof balanceRequests.$inferSelect;

// Order Address Changes - audit trail for shipping address modifications during balance payment
export const orderAddressChanges = pgTable("order_address_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(), // References orders.id
  balanceRequestId: varchar("balance_request_id"), // References balance_requests.id if changed during balance flow
  changedBy: varchar("changed_by"), // User ID who made the change (null for system changes)
  previousAddress: jsonb("previous_address").notNull(), // Previous shipping address
  newAddress: jsonb("new_address").notNull(), // New shipping address
  previousShippingCostCents: integer("previous_shipping_cost_cents"), // Previous shipping cost in cents
  newShippingCostCents: integer("new_shipping_cost_cents"), // New shipping cost in cents
  reason: text("reason"), // Reason for change (e.g., "balance_payment_update", "customer_request")
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index("address_changes_order_id_idx").on(table.orderId),
    balanceRequestIdIdx: index("address_changes_balance_request_idx").on(table.balanceRequestId),
  };
});

export const insertOrderAddressChangeSchema = createInsertSchema(orderAddressChanges).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertOrderAddressChange = z.infer<typeof insertOrderAddressChangeSchema>;
export type OrderAddressChange = typeof orderAddressChanges.$inferSelect;

// Order Workflows - orchestration and state management for complex order creation flows
export const workflowStateEnum = z.enum([
  "INIT",
  "CART_VALIDATED",
  "SELLER_VERIFIED",
  "SHIPPING_PRICED",
  "PRICING_COMPUTED",
  "INVENTORY_RESERVED",
  "PAYMENT_INTENT_CREATED",
  "ORDER_CREATED",
  "AWAITING_PAYMENT_CONFIRMATION",
  "PAYMENT_CONFIRMED",
  "INVENTORY_COMMITTED",
  "NOTIFICATIONS_SENT",
  "COMPLETED",
  "FAILURE",
  "CANCELLED"
]);
export type WorkflowState = z.infer<typeof workflowStateEnum>;

export const workflowStatePgEnum = pgEnum("workflow_state", [
  "INIT",
  "CART_VALIDATED",
  "SELLER_VERIFIED",
  "SHIPPING_PRICED",
  "PRICING_COMPUTED",
  "INVENTORY_RESERVED",
  "PAYMENT_INTENT_CREATED",
  "ORDER_CREATED",
  "AWAITING_PAYMENT_CONFIRMATION",
  "PAYMENT_CONFIRMED",
  "INVENTORY_COMMITTED",
  "NOTIFICATIONS_SENT",
  "COMPLETED",
  "FAILURE",
  "CANCELLED"
]);

export const workflowEventTypeEnum = z.enum([
  "WORKFLOW_STARTED",
  "STATE_TRANSITION",
  "STEP_COMPLETED",
  "STEP_FAILED",
  "COMPENSATION_TRIGGERED",
  "RETRY_ATTEMPTED",
  "WORKFLOW_COMPLETED",
  "WORKFLOW_FAILED"
]);
export type WorkflowEventType = z.infer<typeof workflowEventTypeEnum>;

export const workflowEventTypePgEnum = pgEnum("workflow_event_type", [
  "WORKFLOW_STARTED",
  "STATE_TRANSITION",
  "STEP_COMPLETED",
  "STEP_FAILED",
  "COMPENSATION_TRIGGERED",
  "RETRY_ATTEMPTED",
  "WORKFLOW_COMPLETED",
  "WORKFLOW_FAILED"
]);

export const orderWorkflows = pgTable("order_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checkoutSessionId: varchar("checkout_session_id").notNull(), // Links to checkout session
  orderId: varchar("order_id"), // References orders.id (null until order created)
  paymentIntentId: varchar("payment_intent_id"), // Stripe payment intent ID (for tracking)
  status: text("status").notNull().default("running"), // "running", "completed", "failed", "cancelled"
  currentState: workflowStatePgEnum("current_state").notNull().default("INIT"),
  data: jsonb("data"), // Workflow context: { items, pricing, reservationIds, etc. }
  error: text("error"), // Error message if failed
  errorCode: varchar("error_code"), // Machine-readable error code
  retryCount: integer("retry_count").default(0), // Number of retry attempts
  lastRetryAt: timestamp("last_retry_at"), // When last retry was attempted
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    checkoutSessionIdx: uniqueIndex("order_workflows_checkout_session_idx").on(table.checkoutSessionId),
    orderIdIdx: index("order_workflows_order_id_idx").on(table.orderId),
    paymentIntentIdx: index("order_workflows_payment_intent_idx").on(table.paymentIntentId),
    statusStateIdx: index("order_workflows_status_state_idx").on(table.status, table.currentState),
  };
});

export const insertOrderWorkflowSchema = createInsertSchema(orderWorkflows).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertOrderWorkflow = z.infer<typeof insertOrderWorkflowSchema>;
export type OrderWorkflow = typeof orderWorkflows.$inferSelect;

// Order Workflow Events - audit trail and progress tracking for workflows
export const orderWorkflowEvents = pgTable("order_workflow_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull(), // References order_workflows.id
  eventType: workflowEventTypePgEnum("event_type").notNull(),
  fromState: workflowStatePgEnum("from_state"),
  toState: workflowStatePgEnum("to_state"),
  payload: jsonb("payload"), // Event-specific data
  error: text("error"), // Error details if step failed
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
}, (table) => {
  return {
    workflowIdIdx: index("workflow_events_workflow_id_idx").on(table.workflowId),
    occurredAtIdx: index("workflow_events_occurred_at_idx").on(table.occurredAt),
  };
});

export const insertOrderWorkflowEventSchema = createInsertSchema(orderWorkflowEvents).omit({ 
  id: true, 
  occurredAt: true 
});
export type InsertOrderWorkflowEvent = z.infer<typeof insertOrderWorkflowEventSchema>;
export type OrderWorkflowEvent = typeof orderWorkflowEvents.$inferSelect;

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
  
  // Optional Company Information - populated from Stripe Connect or manual entry
  companyName: varchar("company_name"), // Business/company name
  businessType: varchar("business_type"), // Business type (individual, company, etc.)
  businessPhone: varchar("business_phone"), // Business phone number from Stripe Connect
  taxId: varchar("tax_id"), // Tax ID / EIN number
  socialTiktok: varchar("social_tiktok"), // TikTok profile username
  socialSnapchat: varchar("social_snapchat"), // Snapchat profile username
  socialWebsite: varchar("social_website"), // Website URL
  
  // Tax settings (Stripe Tax integration - B2C only, not wholesale)
  taxEnabled: integer("tax_enabled").default(0), // Auto-collect tax at checkout (0=disabled, 1=enabled) - disabled by default until seller configures tax nexus
  taxNexusCountries: text("tax_nexus_countries").array(), // Countries where seller has tax nexus (e.g., ["US", "CA", "GB"])
  taxNexusStates: text("tax_nexus_states").array(), // US states where seller has tax nexus (e.g., ["NY", "CA", "TX"])
  taxProductCode: varchar("tax_product_code"), // Default Stripe Tax product code for all products (can be overridden per product)
  
  // Platform admin flag for Upfirst.io owners
  isPlatformAdmin: integer("is_platform_admin").default(0), // 0 = regular user, 1 = platform admin
  
  // Welcome email tracking - prevent duplicate welcome emails
  welcomeEmailSent: integer("welcome_email_sent").default(0), // 0 = not sent, 1 = sent
  
  // New auth system: user_type (single source of truth for user identity)
  // - seller: owns store, cannot buy from any store
  // - buyer: purchases from stores, cannot own/manage any store
  // - collaborator: team member of a store (via user_store_memberships), cannot buy
  userType: userTypePgEnum("user_type"), // NULL during migration, then set based on role
  
  // Terms & Conditions Management
  termsPdfUrl: varchar("terms_pdf_url"), // URL to custom Terms & Conditions PDF
  termsSource: varchar("terms_source").default('platform_default'), // "custom_pdf" or "platform_default" - defaults to platform
  
  // Warehouse/Fulfillment Address - origin address for Shippo shipping calculations
  warehouseStreet: varchar("warehouse_street"), // Warehouse street address
  warehouseCity: varchar("warehouse_city"), // Warehouse city
  warehouseState: varchar("warehouse_state"), // Warehouse state/province
  warehousePostalCode: varchar("warehouse_postal_code"), // Warehouse postal/ZIP code
  warehouseCountry: varchar("warehouse_country"), // Warehouse country (ISO 2-letter code)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// New Auth System Tables

// User Store Memberships - tracks collaborators (team members) of a store
// Simplified with single collaborator role and clear ownership tracking
export const userStoreMemberships = pgTable("user_store_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // The collaborator
  storeOwnerId: varchar("store_owner_id").notNull().references(() => users.id, { onDelete: "cascade" }), // The store owner (seller user id)
  accessLevel: varchar("access_level").notNull(), // "owner" | "collaborator"
  invitedBy: varchar("invited_by").references(() => users.id), // Who invited this member
  status: varchar("status").notNull().default("active"), // "active" | "revoked"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: one membership per user per store
  uniqueUserStore: uniqueIndex("unique_user_store_membership").on(table.userId, table.storeOwnerId),
}));

export const insertUserStoreMembershipSchema = createInsertSchema(userStoreMemberships).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertUserStoreMembership = z.infer<typeof insertUserStoreMembershipSchema>;
export type UserStoreMembership = typeof userStoreMemberships.$inferSelect;

// Wholesale Access Grants - tracks which buyers have wholesale access to which sellers
// Wholesale buyers are buyers with additive wholesale permissions
export const wholesaleAccessGrants = pgTable("wholesale_access_grants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }), // The buyer (user_type='buyer')
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }), // The seller granting access
  status: varchar("status").notNull().default("active"), // "active", "revoked"
  wholesaleTerms: jsonb("wholesale_terms"), // Optional: { minimumOrderValue, discountPercentage, paymentTerms }
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  // Unique constraint: one grant per buyer per seller
  uniqueBuyerSeller: uniqueIndex("unique_buyer_seller_grant").on(table.buyerId, table.sellerId),
}));

export const insertWholesaleAccessGrantSchema = createInsertSchema(wholesaleAccessGrants).omit({ 
  id: true, 
  createdAt: true, 
  revokedAt: true 
});
export type InsertWholesaleAccessGrant = z.infer<typeof insertWholesaleAccessGrantSchema>;
export type WholesaleAccessGrant = typeof wholesaleAccessGrants.$inferSelect;

// Team Invitations - invitations to join a store as a collaborator
export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  storeOwnerId: varchar("store_owner_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Store owner sending invite
  capabilities: jsonb("capabilities").notNull(), // { manageProducts: boolean, manageOrders: boolean, ... }
  status: varchar("status").notNull().default("pending"), // "pending", "accepted", "expired", "cancelled"
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({ 
  id: true, 
  createdAt: true, 
  acceptedAt: true 
});
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;

// Wholesale Invitations - invitations to become a wholesale buyer
export const wholesaleInvitations = pgTable("wholesale_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Seller sending invite
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "expired", "cancelled"
  token: varchar("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  wholesaleTerms: jsonb("wholesale_terms"), // Optional: { minimumOrderValue, discountPercentage, paymentTerms }
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertWholesaleInvitationSchema = createInsertSchema(wholesaleInvitations).omit({ 
  id: true, 
  createdAt: true, 
  acceptedAt: true 
});
export type InsertWholesaleInvitation = z.infer<typeof insertWholesaleInvitationSchema>;
export type WholesaleInvitation = typeof wholesaleInvitations.$inferSelect;

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

// Store Invitations - simplified team member invitations
export const storeInvitations = pgTable("store_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeOwnerId: varchar("store_owner_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Store owner (seller user id)
  inviteeEmail: varchar("invitee_email").notNull(),
  invitedByUserId: varchar("invited_by_user_id").notNull().references(() => users.id), // Who sent invitation
  status: varchar("status").notNull().default("pending"), // "pending" | "accepted" | "expired" | "revoked"
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: one pending invitation per email per store
  uniquePendingInvitation: uniqueIndex("unique_pending_store_invitation")
    .on(table.storeOwnerId, table.inviteeEmail)
    .where(sql`${table.status} = 'pending'`),
}));

export const insertStoreInvitationSchema = createInsertSchema(storeInvitations).omit({ 
  id: true, 
  createdAt: true,
  acceptedAt: true 
});
export type InsertStoreInvitation = z.infer<typeof insertStoreInvitationSchema>;
export type StoreInvitation = typeof storeInvitations.$inferSelect;

// Legacy invitations table - kept for backward compatibility
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
  preheader: text("preheader"), // Optional preheader text for email preview
  fromName: text("from_name"), // Optional custom sender name (e.g., "John's Store")
  content: text("content").notNull(), // Plain text content
  htmlContent: text("html_content"), // HTML content for email
  recipients: jsonb("recipients").notNull(), // Array of recipient email addresses
  groupIds: text("group_ids").array(), // Array of subscriber group IDs
  segmentIds: text("segment_ids").array(), // Array of segment IDs for targeting
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

// Newsletter Segments - Dynamic audience targeting
export const newsletterSegments = pgTable("newsletter_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  rules: jsonb("rules").notNull(), // Structured segment criteria
  subscriberCount: integer("subscriber_count").default(0),
  lastEvaluatedAt: timestamp("last_evaluated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("newsletter_segments_user_idx").on(table.userId),
  nameIdx: index("newsletter_segments_name_idx").on(table.name),
}));

export const insertNewsletterSegmentSchema = createInsertSchema(newsletterSegments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNewsletterSegment = z.infer<typeof insertNewsletterSegmentSchema>;
export type NewsletterSegment = typeof newsletterSegments.$inferSelect;

// Newsletter A/B Tests
export const newsletterABTests = pgTable("newsletter_ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => newsletters.id, { onDelete: "cascade" }),
  variantASubject: text("variant_a_subject").notNull(),
  variantAContent: text("variant_a_content").notNull(),
  variantBSubject: text("variant_b_subject").notNull(),
  variantBContent: text("variant_b_content").notNull(),
  splitPercentage: integer("split_percentage").default(50),
  winnerMetric: text("winner_metric").notNull(), // "open_rate" | "click_rate"
  status: text("status").notNull().default("running"), // "running" | "completed"
  winnerId: text("winner_id"), // "A" | "B"
  // Structured metrics for queryability
  variantASent: integer("variant_a_sent").default(0),
  variantAOpened: integer("variant_a_opened").default(0),
  variantAClicked: integer("variant_a_clicked").default(0),
  variantBSent: integer("variant_b_sent").default(0),
  variantBOpened: integer("variant_b_opened").default(0),
  variantBClicked: integer("variant_b_clicked").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  campaignIdx: index("newsletter_ab_tests_campaign_idx").on(table.campaignId),
  statusIdx: index("newsletter_ab_tests_status_idx").on(table.status),
}));

export const insertNewsletterABTestSchema = createInsertSchema(newsletterABTests).omit({ id: true, createdAt: true });
export type InsertNewsletterABTest = z.infer<typeof insertNewsletterABTestSchema>;
export type NewsletterABTest = typeof newsletterABTests.$inferSelect;

// Newsletter Workflows - Automation
export const newsletterWorkflows = pgTable("newsletter_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // "welcome" | "abandoned_cart" | "re_engagement" | "custom"
  trigger: jsonb("trigger").notNull(), // Trigger conditions
  actions: jsonb("actions").notNull(), // Array of workflow actions
  status: text("status").notNull().default("draft"), // "draft" | "active" | "paused"
  executionCount: integer("execution_count").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("newsletter_workflows_user_idx").on(table.userId),
  typeIdx: index("newsletter_workflows_type_idx").on(table.type),
  statusIdx: index("newsletter_workflows_status_idx").on(table.status),
}));

export const insertNewsletterWorkflowSchema = createInsertSchema(newsletterWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNewsletterWorkflow = z.infer<typeof insertNewsletterWorkflowSchema>;
export type NewsletterWorkflow = typeof newsletterWorkflows.$inferSelect;

// Newsletter Schedule - Scheduled campaigns
export const newsletterSchedule = pgTable("newsletter_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => newsletters.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  recurrence: text("recurrence"), // "daily" | "weekly" | "monthly" | null for one-time
  status: text("status").notNull().default("pending"), // "pending" | "sent" | "cancelled" | "failed"
  lockedAt: timestamp("locked_at"), // For preventing duplicate sends
  lockedBy: text("locked_by"), // Worker/process ID that locked this job
  sentAt: timestamp("sent_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  campaignIdx: index("newsletter_schedule_campaign_idx").on(table.campaignId),
  scheduledIdx: index("newsletter_schedule_scheduled_idx").on(table.scheduledAt),
  statusIdx: index("newsletter_schedule_status_idx").on(table.status),
}));

export const insertNewsletterScheduleSchema = createInsertSchema(newsletterSchedule).omit({ id: true, createdAt: true });
export type InsertNewsletterSchedule = z.infer<typeof insertNewsletterScheduleSchema>;
export type NewsletterSchedule = typeof newsletterSchedule.$inferSelect;

// Subscriber Engagement Scores
export const subscriberEngagement = pgTable("subscriber_engagement", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriberId: varchar("subscriber_id").notNull().references(() => subscribers.id, { onDelete: "cascade" }),
  engagementScore: integer("engagement_score").default(0), // 0-100
  lastOpenedAt: timestamp("last_opened_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  totalOpens: integer("total_opens").default(0),
  totalClicks: integer("total_clicks").default(0),
  totalSent: integer("total_sent").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  subscriberIdx: uniqueIndex("subscriber_engagement_subscriber_idx").on(table.subscriberId),
  scoreIdx: index("subscriber_engagement_score_idx").on(table.engagementScore),
}));

export const insertSubscriberEngagementSchema = createInsertSchema(subscriberEngagement).omit({ id: true });
export type InsertSubscriberEngagement = z.infer<typeof insertSubscriberEngagementSchema>;
export type SubscriberEngagement = typeof subscriberEngagement.$inferSelect;

// Newsletter Conversions - Track campaign ROI
export const newsletterConversions = pgTable("newsletter_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => newsletters.id, { onDelete: "cascade" }),
  subscriberEmail: text("subscriber_email").notNull(),
  conversionType: text("conversion_type").notNull(), // "purchase" | "signup" | "download" | "custom"
  conversionValue: decimal("conversion_value", { precision: 10, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  campaignIdx: index("newsletter_conversions_campaign_idx").on(table.campaignId),
  emailIdx: index("newsletter_conversions_email_idx").on(table.subscriberEmail),
  typeIdx: index("newsletter_conversions_type_idx").on(table.conversionType),
}));

export const insertNewsletterConversionSchema = createInsertSchema(newsletterConversions).omit({ id: true, createdAt: true });
export type InsertNewsletterConversion = z.infer<typeof insertNewsletterConversionSchema>;
export type NewsletterConversion = typeof newsletterConversions.$inferSelect;

// Automation Execution History - Audit trail
export const automationExecutions = pgTable("automation_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull().references(() => newsletterWorkflows.id, { onDelete: "cascade" }),
  subscriberId: varchar("subscriber_id").references(() => subscribers.id, { onDelete: "cascade" }),
  subscriberEmail: text("subscriber_email"), // Fallback if subscriber deleted
  triggerData: jsonb("trigger_data"), // What triggered this execution
  status: text("status").notNull(), // "success" | "failed" | "skipped"
  actionsTaken: jsonb("actions_taken"), // What actions were performed
  error: text("error"),
  executedAt: timestamp("executed_at").defaultNow(),
}, (table) => ({
  workflowIdx: index("automation_executions_workflow_idx").on(table.workflowId),
  subscriberIdx: index("automation_executions_subscriber_idx").on(table.subscriberId),
  statusIdx: index("automation_executions_status_idx").on(table.status),
  executedIdx: index("automation_executions_executed_idx").on(table.executedAt),
}));

export const insertAutomationExecutionSchema = createInsertSchema(automationExecutions).omit({ id: true, executedAt: true });
export type InsertAutomationExecution = z.infer<typeof insertAutomationExecutionSchema>;
export type AutomationExecution = typeof automationExecutions.$inferSelect;

// Newsletter Jobs - Persistent job queue
export const newsletterJobs = pgTable("newsletter_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "send_campaign" | "send_scheduled_campaign" | etc
  data: jsonb("data").notNull(),
  priority: integer("priority").default(0),
  scheduledFor: timestamp("scheduled_for"),
  maxRetries: integer("max_retries").default(3),
  retryCount: integer("retry_count").default(0),
  status: text("status").notNull().default("queued"), // "queued" | "running" | "completed" | "failed" | "cancelled"
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  statusIdx: index("newsletter_jobs_status_idx").on(table.status),
  scheduledIdx: index("newsletter_jobs_scheduled_idx").on(table.scheduledFor),
  typeIdx: index("newsletter_jobs_type_idx").on(table.type),
}));

export const insertNewsletterJobSchema = createInsertSchema(newsletterJobs).omit({ id: true, createdAt: true });
export type InsertNewsletterJob = z.infer<typeof insertNewsletterJobSchema>;
export type NewsletterJob = typeof newsletterJobs.$inferSelect;

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

// Wholesale Products - Extended for complete B2B functionality
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
  moq: integer("moq").notNull(), // Minimum Order Quantity (product-level)
  
  // Deposit/Balance Configuration (support both fixed and percentage)
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }), // Fixed deposit amount
  depositPercentage: decimal("deposit_percentage", { precision: 5, scale: 2 }), // Deposit % (e.g., 30.00 for 30%)
  balancePercentage: decimal("balance_percentage", { precision: 5, scale: 2 }), // Balance % (e.g., 70.00 for 70%)
  requiresDeposit: integer("requires_deposit").default(0), // 0 = false, 1 = true
  
  // Stock & Availability
  stock: integer("stock").default(0),
  readinessDays: integer("readiness_days"), // Days after order for production/delivery
  
  // B2B Specific Dates
  expectedShipDate: timestamp("expected_ship_date"), // When product will ship
  balancePaymentDate: timestamp("balance_payment_date"), // When balance payment is due
  orderDeadline: timestamp("order_deadline"), // Last day to place order
  
  // Shipping & Warehouse Configuration
  shipFromAddress: jsonb("ship_from_address"), // Warehouse address for freight/pickup: {street, city, state, zip, country}
  contactDetails: jsonb("contact_details"), // Warehouse contact: {name, phone, email}
  
  // Pricing & Terms
  suggestedRetailPrice: decimal("suggested_retail_price", { precision: 10, scale: 2 }), // SRP for retailers
  paymentTerms: varchar("payment_terms").default("Net 30"), // Net 30/60/90
  
  // Variants (extended to include per-variant MOQ and pricing)
  variants: jsonb("variants"), // [{size, color, stock, image, moq, wholesalePrice, sku}]
  
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

// ===== WHOLESALE B2B ORDER SYSTEM =====

// Wholesale Carts - Cart storage for B2B buyers
export const wholesaleCarts = pgTable("wholesale_carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().unique(),
  sellerId: varchar("seller_id").notNull(),
  items: jsonb("items").notNull(), // WholesaleCartItem[]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWholesaleCartSchema = createInsertSchema(wholesaleCarts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertWholesaleCart = z.infer<typeof insertWholesaleCartSchema>;
export type WholesaleCart = typeof wholesaleCarts.$inferSelect;

// Wholesale Orders - Main B2B order table
export const wholesaleOrders = pgTable("wholesale_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number").notNull().unique(), // WH-YYYYMMDD-XXXXX
  sellerId: varchar("seller_id").notNull(),
  buyerId: varchar("buyer_id").notNull(),
  
  // Order Status & Lifecycle
  status: wholesaleOrderStatusPgEnum("status").notNull().default("pending"),
  
  // Pricing & Amounts (in cents for precision)
  subtotalCents: integer("subtotal_cents").notNull(), // Subtotal in cents
  taxAmountCents: integer("tax_amount_cents").default(0), // Tax in cents
  totalCents: integer("total_cents").notNull(), // Total in cents
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  
  // Deposit & Balance Configuration
  depositAmountCents: integer("deposit_amount_cents").notNull(), // Deposit in cents
  balanceAmountCents: integer("balance_amount_cents").notNull(), // Balance in cents
  depositPercentage: decimal("deposit_percentage", { precision: 5, scale: 2 }), // e.g., 30.00 for 30%
  balancePercentage: decimal("balance_percentage", { precision: 5, scale: 2 }), // e.g., 70.00 for 70%
  
  // Payment Terms
  paymentTerms: varchar("payment_terms").default("Net 30"), // Net 30/60/90
  
  // Important Dates
  expectedShipDate: timestamp("expected_ship_date"),
  balancePaymentDueDate: timestamp("balance_payment_due_date"),
  orderDeadline: timestamp("order_deadline"),
  
  // Business Information
  poNumber: varchar("po_number"), // Purchase Order number
  vatNumber: varchar("vat_number"), // VAT/Tax ID
  incoterms: varchar("incoterms"), // FOB, CIF, DDP
  
  // Buyer Information (snapshot at order time)
  buyerCompanyName: text("buyer_company_name"),
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdIdx: index("wholesale_orders_seller_id_idx").on(table.sellerId),
    buyerIdIdx: index("wholesale_orders_buyer_id_idx").on(table.buyerId),
    statusIdx: index("wholesale_orders_status_idx").on(table.status),
    orderNumberIdx: index("wholesale_orders_order_number_idx").on(table.orderNumber),
  };
});

export const insertWholesaleOrderSchema = createInsertSchema(wholesaleOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertWholesaleOrder = z.infer<typeof insertWholesaleOrderSchema>;
export type WholesaleOrder = typeof wholesaleOrders.$inferSelect;

// Wholesale Order Items - Individual items in B2B orders
export const wholesaleOrderItems = pgTable("wholesale_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wholesaleOrderId: varchar("wholesale_order_id").notNull(),
  productId: varchar("product_id").notNull(), // References wholesale_products.id
  
  // Product Snapshot (at time of order)
  productName: text("product_name").notNull(),
  productImage: text("product_image"),
  productSku: varchar("product_sku"),
  
  // Quantity & MOQ
  quantity: integer("quantity").notNull(),
  moq: integer("moq").notNull(), // MOQ at time of order
  
  // Pricing (in cents)
  unitPriceCents: integer("unit_price_cents").notNull(), // Wholesale price per unit in cents
  subtotalCents: integer("subtotal_cents").notNull(), // quantity * unitPrice in cents
  
  // Variant Information
  variant: jsonb("variant"), // {size, color, sku}
  
  // Refund tracking (for item-level refunds)
  refundedQuantity: integer("refunded_quantity").default(0), // How many units have been refunded
  refundedAmountCents: integer("refunded_amount_cents").default(0), // Total refunded amount in cents
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    wholesaleOrderIdIdx: index("wholesale_order_items_order_id_idx").on(table.wholesaleOrderId),
    productIdIdx: index("wholesale_order_items_product_id_idx").on(table.productId),
  };
});

export const insertWholesaleOrderItemSchema = createInsertSchema(wholesaleOrderItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertWholesaleOrderItem = z.infer<typeof insertWholesaleOrderItemSchema>;
export type WholesaleOrderItem = typeof wholesaleOrderItems.$inferSelect;

// Wholesale Payments - Track deposit and balance payments
export const wholesalePayments = pgTable("wholesale_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wholesaleOrderId: varchar("wholesale_order_id").notNull(),
  
  // Payment Type & Status
  paymentType: wholesalePaymentTypePgEnum("payment_type").notNull(), // deposit or balance
  status: wholesalePaymentStatusPgEnum("status").notNull().default("pending"),
  
  // Amount & Currency (in cents)
  amountCents: integer("amount_cents").notNull(), // Payment amount in cents
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  
  // Stripe Integration
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  
  // Payment Timeline
  dueDate: timestamp("due_date"),
  requestedAt: timestamp("requested_at"),
  paidAt: timestamp("paid_at"),
  emailSentAt: timestamp("email_sent_at"),
  lastReminderAt: timestamp("last_reminder_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    wholesaleOrderIdIdx: index("wholesale_payments_order_id_idx").on(table.wholesaleOrderId),
    statusIdx: index("wholesale_payments_status_idx").on(table.status),
    paymentTypeIdx: index("wholesale_payments_payment_type_idx").on(table.paymentType),
  };
});

export const insertWholesalePaymentSchema = createInsertSchema(wholesalePayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertWholesalePayment = z.infer<typeof insertWholesalePaymentSchema>;
export type WholesalePayment = typeof wholesalePayments.$inferSelect;

// Wholesale Shipping Details - Freight collect or buyer pickup logistics
export const wholesaleShippingDetails = pgTable("wholesale_shipping_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wholesaleOrderId: varchar("wholesale_order_id").notNull().unique(), // One shipping detail per order
  
  // Shipping Type
  shippingType: wholesaleShippingTypePgEnum("shipping_type").notNull(), // freight_collect or buyer_pickup
  
  // Freight Collect Details
  carrierName: varchar("carrier_name"), // e.g., FedEx, UPS, DHL
  carrierAccountNumber: varchar("carrier_account_number"), // Buyer's carrier account
  prepaidLabelUrls: text("prepaid_label_urls").array(), // Uploaded prepaid shipping labels
  serviceLevel: varchar("service_level"), // e.g., Standard, Express
  
  // Buyer Pickup Details (seller's warehouse)
  pickupAddress: jsonb("pickup_address"), // {street, city, state, zip, country}
  pickupContactName: varchar("pickup_contact_name"),
  pickupContactPhone: varchar("pickup_contact_phone"),
  pickupContactEmail: varchar("pickup_contact_email"),
  
  // Invoicing Address (buyer's billing address)
  invoicingAddress: jsonb("invoicing_address"), // {street, city, state, zip, country}
  invoicingName: varchar("invoicing_name"),
  invoicingEmail: varchar("invoicing_email"),
  invoicingPhone: varchar("invoicing_phone"),
  rememberInvoicing: integer("remember_invoicing").default(0), // 0 = false, 1 = true
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    wholesaleOrderIdIdx: index("wholesale_shipping_details_order_id_idx").on(table.wholesaleOrderId),
  };
});

export const insertWholesaleShippingDetailSchema = createInsertSchema(wholesaleShippingDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertWholesaleShippingDetail = z.infer<typeof insertWholesaleShippingDetailSchema>;
export type WholesaleShippingDetail = typeof wholesaleShippingDetails.$inferSelect;

// Wholesale Order Events - Event log for B2B order lifecycle
export const wholesaleOrderEvents = pgTable("wholesale_order_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wholesaleOrderId: varchar("wholesale_order_id").notNull(),
  
  // Event Details
  eventType: wholesaleOrderEventTypePgEnum("event_type").notNull(),
  payload: jsonb("payload"), // Event-specific data
  description: text("description"), // Human-readable description
  
  // Event Attribution
  performedBy: varchar("performed_by"), // User ID (null for system events)
  
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
}, (table) => {
  return {
    wholesaleOrderIdIdx: index("wholesale_order_events_order_id_idx").on(table.wholesaleOrderId),
    occurredAtIdx: index("wholesale_order_events_occurred_at_idx").on(table.occurredAt),
  };
});

export const insertWholesaleOrderEventSchema = createInsertSchema(wholesaleOrderEvents).omit({
  id: true,
  occurredAt: true
});
export type InsertWholesaleOrderEvent = z.infer<typeof insertWholesaleOrderEventSchema>;
export type WholesaleOrderEvent = typeof wholesaleOrderEvents.$inferSelect;

// Warehouse Locations - Seller warehouse/pickup addresses
export const warehouseLocations = pgTable("warehouse_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  
  // Warehouse Details
  name: text("name").notNull(), // e.g., "Main Warehouse", "LA Distribution Center"
  address: jsonb("address").notNull(), // {street, city, state, zip, country}
  
  // Contact Information
  contactName: varchar("contact_name"),
  contactPhone: varchar("contact_phone"),
  contactEmail: varchar("contact_email"),
  
  // Settings
  isDefault: integer("is_default").default(0), // 0 = false, 1 = true (one default per seller)
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdIdx: index("warehouse_locations_seller_id_idx").on(table.sellerId),
  };
});

export const insertWarehouseLocationSchema = createInsertSchema(warehouseLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertWarehouseLocation = z.infer<typeof insertWarehouseLocationSchema>;
export type WarehouseLocation = typeof warehouseLocations.$inferSelect;

// Buyer Profiles - B2B buyer company information
export const buyerProfiles = pgTable("buyer_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // Links to users table
  
  // Company Information
  companyName: text("company_name"),
  vatNumber: varchar("vat_number"), // VAT/Tax ID
  
  // Addresses
  billingAddress: jsonb("billing_address"), // {street, city, state, zip, country}
  shippingAddress: jsonb("shipping_address"), // {street, city, state, zip, country}
  
  // Default Payment Terms
  defaultPaymentTerms: varchar("default_payment_terms").default("Net 30"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }), // Optional credit limit
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("buyer_profiles_user_id_idx").on(table.userId),
  };
});

export const insertBuyerProfileSchema = createInsertSchema(buyerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertBuyerProfile = z.infer<typeof insertBuyerProfileSchema>;
export type BuyerProfile = typeof buyerProfiles.$inferSelect;

// Wholesale Payment Intents - Track Stripe PaymentIntents for deposits and balance
export const wholesalePaymentIntents = pgTable("wholesale_payment_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("orderId").notNull(), // FK to wholesale_orders (camelCase to match existing DB)
  type: wholesalePaymentTypePgEnum("type").notNull(), // deposit or balance
  stripePaymentIntentId: varchar("stripePaymentIntentId").notNull().unique(), // camelCase to match existing DB
  amountCents: integer("amountCents").notNull(), // Amount in cents (camelCase to match existing DB)
  status: wholesalePaymentIntentStatusPgEnum("status").notNull().default("pending"),
  metadata: jsonb("metadata"), // Additional Stripe metadata
  createdAt: timestamp("createdAt").notNull().defaultNow(), // camelCase to match existing DB
  updatedAt: timestamp("updatedAt").notNull().defaultNow(), // camelCase to match existing DB
}, (table) => {
  return {
    orderIdIdx: index("wholesale_payment_intents_order_id_idx").on(table.orderId),
    stripePaymentIntentIdIdx: index("wholesale_payment_intents_stripe_id_idx").on(table.stripePaymentIntentId),
    statusIdx: index("wholesale_payment_intents_status_idx").on(table.status),
  };
});

export const insertWholesalePaymentIntentSchema = createInsertSchema(wholesalePaymentIntents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertWholesalePaymentIntent = z.infer<typeof insertWholesalePaymentIntentSchema>;
export type WholesalePaymentIntent = typeof wholesalePaymentIntents.$inferSelect;

// Wholesale Shipping Metadata - Additional shipping information
export const wholesaleShippingMetadata = pgTable("wholesale_shipping_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("orderId").notNull().unique(), // FK to wholesale_orders, one per order
  shippingType: wholesaleShippingTypePgEnum("shippingType").notNull(), // freight_collect or buyer_pickup
  freightAccount: varchar("freightAccount"), // For freight collect
  carrier: varchar("carrier"), // UPS, FedEx, DHL, etc.
  trackingNumber: varchar("trackingNumber"),
  pickupAddress: jsonb("pickupAddress"), // For buyer pickup: {street, city, state, zip, country}
  pickupInstructions: text("pickupInstructions"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index("wholesale_shipping_metadata_order_id_idx").on(table.orderId),
  };
});

export const insertWholesaleShippingMetadataSchema = createInsertSchema(wholesaleShippingMetadata).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertWholesaleShippingMetadata = z.infer<typeof insertWholesaleShippingMetadataSchema>;
export type WholesaleShippingMetadata = typeof wholesaleShippingMetadata.$inferSelect;

// Wholesale Invitations - enhanced for new auth system
export const wholesaleInvitations_legacy = pgTable("wholesale_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  token: varchar("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  // New auth system fields - for future use
  wholesaleTerms: jsonb("wholesale_terms"), // Optional: { minimumOrderValue, discountPercentage, paymentTerms }
  expiresAt: timestamp("expires_at"), // When invitation expires
});

export const insertWholesaleInvitationSchema_legacy = createInsertSchema(wholesaleInvitations_legacy).omit({ 
  id: true, 
  token: true,
  createdAt: true, 
  acceptedAt: true 
});
export type InsertWholesaleInvitation_Legacy = z.infer<typeof insertWholesaleInvitationSchema_legacy>;
export type WholesaleInvitation_Legacy = typeof wholesaleInvitations_legacy.$inferSelect;
export type SelectWholesaleInvitation_Legacy = typeof wholesaleInvitations_legacy.$inferSelect;

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

// Payment Intents - Provider-agnostic payment tracking
export const paymentIntents = pgTable("payment_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerName: varchar("provider_name").notNull(), // 'stripe' | 'paypal'
  providerIntentId: varchar("provider_intent_id").notNull(), // Provider's intent ID
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status").notNull(), // 'requires_payment_method' | 'succeeded' | etc.
  clientSecret: text("client_secret"),
  metadata: jsonb("metadata"),
  idempotencyKey: varchar("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    providerIntentIdx: index("payment_intents_provider_intent_idx").on(table.providerIntentId),
    idempotencyKeyIdx: index("payment_intents_idempotency_key_idx").on(table.idempotencyKey),
  };
});

export const insertPaymentIntentSchema = createInsertSchema(paymentIntents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentIntent = z.infer<typeof insertPaymentIntentSchema>;
export type PaymentIntent = typeof paymentIntents.$inferSelect;

// Webhook Events - Track processed webhook events for idempotency
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey(), // Provider's event ID
  providerName: varchar("provider_name").notNull(),
  eventType: varchar("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    providerEventTypeIdx: index("webhook_events_provider_event_type_idx").on(table.providerName, table.eventType),
    processedAtIdx: index("webhook_events_processed_at_idx").on(table.processedAt),
  };
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ createdAt: true });
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

// Failed Webhook Events - Dead letter queue for retry
export const failedWebhookEvents = pgTable("failed_webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id"),
  providerName: varchar("provider_name").notNull(),
  eventType: varchar("event_type").notNull(),
  payload: text("payload").notNull(),
  errorMessage: text("error_message").notNull(),
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    retryIdx: index("failed_webhook_events_retry_idx").on(table.retryCount, table.createdAt),
  };
});

export const insertFailedWebhookEventSchema = createInsertSchema(failedWebhookEvents).omit({ id: true, createdAt: true });
export type InsertFailedWebhookEvent = z.infer<typeof insertFailedWebhookEventSchema>;
export type FailedWebhookEvent = typeof failedWebhookEvents.$inferSelect;

// Shopping Carts - Session-based cart storage for guest and authenticated users
// Carts - One cart per buyer per seller (anonymous carts have null buyer_id)
export const carts = pgTable("carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  buyerId: varchar("buyer_id"), // NULLABLE for anonymous carts
  items: jsonb("items").notNull().default('[]'),
  status: varchar("status").default('active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Partial unique index: one cart per buyer per seller (only when buyer_id IS NOT NULL)
    buyerSellerIdx: uniqueIndex("carts_buyer_seller_idx")
      .on(table.sellerId, table.buyerId)
      .where(sql`${table.buyerId} IS NOT NULL`),
  };
});

// Cart Sessions - Bridge table: every session maps to exactly one cart
export const cartSessions = pgTable("cart_sessions", {
  sessionId: varchar("session_id").primaryKey(),
  cartId: varchar("cart_id").notNull().references(() => carts.id, { onDelete: 'cascade' }),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
});

export const insertCartSchema = createInsertSchema(carts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof carts.$inferSelect;

export const insertCartSessionSchema = createInsertSchema(cartSessions);
export type InsertCartSession = z.infer<typeof insertCartSessionSchema>;
export type CartSession = typeof cartSessions.$inferSelect;

// Trade Quotations - main quotation records
export const tradeQuotations = pgTable("trade_quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerId: varchar("buyer_id"),
  quotationNumber: varchar("quotation_number").notNull().unique(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).notNull(),
  depositPercentage: integer("deposit_percentage").notNull().default(50),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }).notNull(),
  status: tradeQuotationStatusPgEnum("status").notNull().default("draft"),
  orderId: varchar("order_id"), // Links to orders.id when converted - prevents duplicate order creation
  validUntil: timestamp("valid_until"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdx: index("trade_quotations_seller_idx").on(table.sellerId),
    buyerEmailIdx: index("trade_quotations_buyer_email_idx").on(table.buyerEmail),
    statusIdx: index("trade_quotations_status_idx").on(table.status),
    quotationNumberIdx: uniqueIndex("trade_quotations_quotation_number_idx").on(table.quotationNumber),
  };
});

export const insertTradeQuotationSchema = createInsertSchema(tradeQuotations).omit({ 
  id: true, 
  orderId: true, // System-generated when converted to order
  createdAt: true, 
  updatedAt: true 
});
export type InsertTradeQuotation = z.infer<typeof insertTradeQuotationSchema>;
export type TradeQuotation = typeof tradeQuotations.$inferSelect;

// Trade Quotation Items - line items
export const tradeQuotationItems = pgTable("trade_quotation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull(),
  lineNumber: integer("line_number").notNull(),
  description: text("description").notNull(),
  productId: varchar("product_id"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    quotationIdx: index("trade_quotation_items_quotation_idx").on(table.quotationId),
  };
});

export const insertTradeQuotationItemSchema = createInsertSchema(tradeQuotationItems).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTradeQuotationItem = z.infer<typeof insertTradeQuotationItemSchema>;
export type TradeQuotationItem = typeof tradeQuotationItems.$inferSelect;

// Trade Quotation Events - audit trail
export const tradeQuotationEvents = pgTable("trade_quotation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull(),
  eventType: tradeQuotationEventTypePgEnum("event_type").notNull(),
  performedBy: varchar("performed_by").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    quotationIdx: index("trade_quotation_events_quotation_idx").on(table.quotationId),
  };
});

export const insertTradeQuotationEventSchema = createInsertSchema(tradeQuotationEvents).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertTradeQuotationEvent = z.infer<typeof insertTradeQuotationEventSchema>;
export type TradeQuotationEvent = typeof tradeQuotationEvents.$inferSelect;

// Trade Payment Schedules - deposit/balance tracking
export const tradePaymentSchedules = pgTable("trade_payment_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull(),
  paymentType: tradePaymentTypePgEnum("payment_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  status: tradePaymentStatusPgEnum("status").notNull().default("pending"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    quotationIdx: index("trade_payment_schedules_quotation_idx").on(table.quotationId),
    statusIdx: index("trade_payment_schedules_status_idx").on(table.status),
    uniqueQuotationPaymentType: uniqueIndex("unique_quotation_payment_type")
      .on(table.quotationId, table.paymentType),
  };
});

export const insertTradePaymentScheduleSchema = createInsertSchema(tradePaymentSchedules).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTradePaymentSchedule = z.infer<typeof insertTradePaymentScheduleSchema>;
export type TradePaymentSchedule = typeof tradePaymentSchedules.$inferSelect;

// ===== BULK PRODUCT UPLOAD SYSTEM =====

// PostgreSQL enums for bulk upload
export const bulkUploadStatusPgEnum = pgEnum("bulk_upload_status", [
  "pending",          // File uploaded, waiting to start
  "preprocessed",     // Multi-row format detected and flattened
  "validating",       // Validating rows
  "validated",        // Validation complete, ready to import
  "importing",        // Creating products
  "completed",        // Successfully completed
  "completed_with_errors", // Completed but some rows failed
  "failed",           // Failed entirely
  "rolled_back"       // Import was rolled back
]);

export const bulkUploadItemStatusPgEnum = pgEnum("bulk_upload_item_status", [
  "pending",          // Not yet validated
  "valid",            // Validation passed
  "warning",          // Validation passed with warnings
  "error",            // Validation failed
  "imported",         // Successfully created product
  "failed"            // Failed to create product
]);

// Bulk Upload Jobs - tracks overall upload sessions
export const bulkUploadJobs = pgTable("bulk_upload_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  fileName: text("file_name").notNull(),
  status: bulkUploadStatusPgEnum("status").notNull().default("pending"),
  totalRows: integer("total_rows").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  warningCount: integer("warning_count").notNull().default(0),
  
  // Field mappings - stores user's column mapping choices
  // Example: { "Product Name": "name", "Price": "price", "Image 1": "image1" }
  mappings: jsonb("mappings"),
  
  // Error message if job failed
  errorMessage: text("error_message"),
  
  // Progress tracking
  processedRows: integer("processed_rows").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => {
  return {
    sellerIdx: index("bulk_upload_jobs_seller_idx").on(table.sellerId),
    statusIdx: index("bulk_upload_jobs_status_idx").on(table.status),
  };
});

export const insertBulkUploadJobSchema = createInsertSchema(bulkUploadJobs).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true
});
export type InsertBulkUploadJob = z.infer<typeof insertBulkUploadJobSchema>;
export type BulkUploadJob = typeof bulkUploadJobs.$inferSelect;

// Bulk Upload Items - individual rows from CSV
export const bulkUploadItems = pgTable("bulk_upload_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  rowNumber: integer("row_number").notNull(),
  
  // Original CSV row data (mapped to expected fields)
  rowData: jsonb("row_data").notNull(),
  
  // Validation status
  validationStatus: bulkUploadItemStatusPgEnum("validation_status").notNull().default("pending"),
  
  // Validation errors and warnings
  // Example: [{field: "price", message: "Price must be greater than 0", severity: "error"}]
  validationMessages: jsonb("validation_messages"),
  
  // Reference to created product (if successful)
  productId: varchar("product_id"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    jobIdx: index("bulk_upload_items_job_idx").on(table.jobId),
    statusIdx: index("bulk_upload_items_status_idx").on(table.validationStatus),
    productIdx: index("bulk_upload_items_product_idx").on(table.productId),
  };
});

export const insertBulkUploadItemSchema = createInsertSchema(bulkUploadItems).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertBulkUploadItem = z.infer<typeof insertBulkUploadItemSchema>;
export type BulkUploadItem = typeof bulkUploadItems.$inferSelect;

// ============================================================================
// META SOCIAL ADS SYSTEM (B2C Platform - Architecture 3)
// ============================================================================

// PostgreSQL enums for Meta Ads
export const metaAdAccountStatusPgEnum = pgEnum("meta_ad_account_status", [
  "pending_oauth",
  "connected",
  "token_expired",
  "disconnected",
  "suspended"
]);

export const metaCampaignStatusPgEnum = pgEnum("meta_campaign_status", [
  "draft",
  "pending_payment",
  "active",
  "paused",
  "completed",
  "cancelled",
  "failed"
]);

export const metaCampaignObjectivePgEnum = pgEnum("meta_campaign_objective", [
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES"
]);

export const metaBudgetStatusPgEnum = pgEnum("meta_budget_status", [
  "active",
  "low",
  "depleted",
  "suspended"
]);

export const metaTransactionTypePgEnum = pgEnum("meta_transaction_type", [
  "credit_purchase",
  "ad_spend",
  "upfirst_fee",
  "refund",
  "adjustment"
]);

export const backgroundJobStatusPgEnum = pgEnum("background_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "retrying"
]);

// Zod enums for validation
export const metaAdAccountStatusEnum = z.enum([
  "pending_oauth",
  "connected",
  "token_expired",
  "disconnected",
  "suspended"
]);
export type MetaAdAccountStatus = z.infer<typeof metaAdAccountStatusEnum>;

export const metaCampaignStatusEnum = z.enum([
  "draft",
  "pending_payment",
  "active",
  "paused",
  "completed",
  "cancelled",
  "failed"
]);
export type MetaCampaignStatus = z.infer<typeof metaCampaignStatusEnum>;

export const metaCampaignObjectiveEnum = z.enum([
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES"
]);
export type MetaCampaignObjective = z.infer<typeof metaCampaignObjectiveEnum>;

// Meta Ad Accounts - OAuth tokens and account linkage
export const metaAdAccounts = pgTable("meta_ad_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  
  // Meta OAuth credentials (encrypted at rest)
  metaUserId: text("meta_user_id").notNull(),
  metaAdAccountId: text("meta_ad_account_id").notNull(),
  accessToken: text("access_token").notNull(), // Should be encrypted
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Account status
  status: metaAdAccountStatusPgEnum("status").notNull().default("connected"),
  
  // Business details
  businessName: text("business_name"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  timezone: text("timezone").default("UTC"),
  
  // Billing
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0").notNull(), // 20% Upfirst fee
  
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdx: index("meta_ad_accounts_seller_idx").on(table.sellerId),
    statusIdx: index("meta_ad_accounts_status_idx").on(table.status),
    metaAccountIdx: uniqueIndex("meta_ad_accounts_meta_account_idx").on(table.metaAdAccountId),
  };
});

export const insertMetaAdAccountSchema = createInsertSchema(metaAdAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true
});
export type InsertMetaAdAccount = z.infer<typeof insertMetaAdAccountSchema>;
export type MetaAdAccount = typeof metaAdAccounts.$inferSelect;

// Meta Campaigns - Campaign configuration and tracking
export const metaCampaigns = pgTable("meta_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  adAccountId: varchar("ad_account_id").notNull(), // FK to meta_ad_accounts
  productId: varchar("product_id").notNull(), // Product being advertised
  
  // Campaign details
  name: text("name").notNull(),
  status: metaCampaignStatusPgEnum("status").notNull().default("draft"),
  objective: metaCampaignObjectivePgEnum("objective").notNull().default("OUTCOME_TRAFFIC"),
  
  // Meta IDs (populated after creation on Meta)
  metaCampaignId: text("meta_campaign_id"),
  metaAdSetId: text("meta_ad_set_id"),
  metaAdId: text("meta_ad_id"),
  
  // Ad Creative (generated by Gemini AI)
  primaryText: text("primary_text").notNull(), // Main ad copy
  headline: text("headline").notNull(), // Short headline
  description: text("description"), // Optional description
  callToAction: text("call_to_action").default("SHOP_NOW"), // CTA button
  
  // Targeting (JSON object with countries, languages, age, gender, interests)
  targeting: jsonb("targeting").notNull(),
  // Example: { countries: ["US", "CA"], languages: ["en"], ageMin: 18, ageMax: 65, gender: "all" }
  
  // Budget & Schedule
  dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }).notNull(),
  lifetimeBudget: decimal("lifetime_budget", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  
  // Advantage+ settings
  useAdvantagePlus: integer("use_advantage_plus").default(1).notNull(), // 1 = enabled
  advantagePlusConfig: jsonb("advantage_plus_config"),
  
  // Alert settings
  alertEmail: text("alert_email").notNull(),
  lowBudgetThreshold: decimal("low_budget_threshold", { precision: 5, scale: 2 }).default("20").notNull(), // Alert at 20%
  
  // Timestamps
  activatedAt: timestamp("activated_at"),
  pausedAt: timestamp("paused_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdx: index("meta_campaigns_seller_idx").on(table.sellerId),
    statusIdx: index("meta_campaigns_status_idx").on(table.status),
    adAccountIdx: index("meta_campaigns_ad_account_idx").on(table.adAccountId),
    productIdx: index("meta_campaigns_product_idx").on(table.productId),
    metaCampaignIdx: index("meta_campaigns_meta_id_idx").on(table.metaCampaignId),
  };
});

export const insertMetaCampaignSchema = createInsertSchema(metaCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
  pausedAt: true,
  completedAt: true
});
export type InsertMetaCampaign = z.infer<typeof insertMetaCampaignSchema>;
export type MetaCampaign = typeof metaCampaigns.$inferSelect;

// Meta Campaign Finance - Credit ledger and transactions
export const metaCampaignFinance = pgTable("meta_campaign_finance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  campaignId: varchar("campaign_id"), // Optional - can be account-level credit
  
  // Transaction details
  transactionType: metaTransactionTypePgEnum("transaction_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  // Credit purchase details
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  
  // Ad spend details
  metaTransactionId: text("meta_transaction_id"), // Meta's transaction ID for ad spend
  
  // Upfirst fee (20% of ad spend)
  upfirstFeeAmount: decimal("upfirst_fee_amount", { precision: 10, scale: 2 }),
  
  description: text("description"),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    sellerIdx: index("meta_campaign_finance_seller_idx").on(table.sellerId),
    campaignIdx: index("meta_campaign_finance_campaign_idx").on(table.campaignId),
    typeIdx: index("meta_campaign_finance_type_idx").on(table.transactionType),
    stripeIdx: index("meta_campaign_finance_stripe_idx").on(table.stripePaymentIntentId),
  };
});

export const insertMetaCampaignFinanceSchema = createInsertSchema(metaCampaignFinance).omit({
  id: true,
  createdAt: true
});
export type InsertMetaCampaignFinance = z.infer<typeof insertMetaCampaignFinanceSchema>;
export type MetaCampaignFinance = typeof metaCampaignFinance.$inferSelect;

// Meta Campaign Metrics Daily - Aggregated performance analytics
export const metaCampaignMetricsDaily = pgTable("meta_campaign_metrics_daily", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  date: timestamp("date").notNull(), // Date of the metrics (UTC)
  
  // Core metrics from Meta Insights API
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  reach: integer("reach").default(0).notNull(),
  frequency: decimal("frequency", { precision: 5, scale: 2 }).default("0"),
  
  // Engagement metrics
  likes: integer("likes").default(0).notNull(),
  comments: integer("comments").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
  saves: integer("saves").default(0).notNull(),
  
  // Conversion metrics
  linkClicks: integer("link_clicks").default(0).notNull(),
  websiteVisits: integer("website_visits").default(0).notNull(),
  purchases: integer("purchases").default(0).notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  
  // Financial metrics
  spend: decimal("spend", { precision: 10, scale: 2 }).default("0").notNull(),
  cpm: decimal("cpm", { precision: 10, scale: 4 }).default("0"), // Cost per 1000 impressions
  cpc: decimal("cpc", { precision: 10, scale: 4 }).default("0"), // Cost per click
  ctr: decimal("ctr", { precision: 5, scale: 2 }).default("0"), // Click-through rate %
  roas: decimal("roas", { precision: 10, scale: 2 }).default("0"), // Return on ad spend
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    campaignDateIdx: uniqueIndex("meta_metrics_campaign_date_idx").on(table.campaignId, table.date),
    dateIdx: index("meta_metrics_date_idx").on(table.date),
  };
});

export const insertMetaCampaignMetricsDailySchema = createInsertSchema(metaCampaignMetricsDaily).omit({
  id: true,
  createdAt: true
});
export type InsertMetaCampaignMetricsDaily = z.infer<typeof insertMetaCampaignMetricsDailySchema>;
export type MetaCampaignMetricsDaily = typeof metaCampaignMetricsDaily.$inferSelect;

// Background Job Runs - Observability for scheduled tasks
export const backgroundJobRuns = pgTable("background_job_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobName: text("job_name").notNull(),
  status: backgroundJobStatusPgEnum("status").notNull().default("pending"),
  
  // Execution details
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // milliseconds
  
  // Results
  recordsProcessed: integer("records_processed").default(0),
  recordsFailed: integer("records_failed").default(0),
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  
  // Retry logic
  retryCount: integer("retry_count").default(0).notNull(),
  nextRetryAt: timestamp("next_retry_at"),
  
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    jobNameIdx: index("background_job_runs_job_name_idx").on(table.jobName),
    statusIdx: index("background_job_runs_status_idx").on(table.status),
    createdAtIdx: index("background_job_runs_created_at_idx").on(table.createdAt),
  };
});

export const insertBackgroundJobRunSchema = createInsertSchema(backgroundJobRuns).omit({
  id: true,
  createdAt: true
});
export type InsertBackgroundJobRun = z.infer<typeof insertBackgroundJobRunSchema>;
export type BackgroundJobRun = typeof backgroundJobRuns.$inferSelect;
