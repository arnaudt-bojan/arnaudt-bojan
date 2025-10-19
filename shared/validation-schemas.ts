/**
 * Validation Schemas (Pure Zod - No Drizzle Dependencies)
 * 
 * This file contains Zod validation schemas for API request validation.
 * These schemas are independent of ORM implementations and work with Prisma types.
 */

import { z } from "zod";

// ============================================================================
// Address Validation
// ============================================================================

export const addressSchema = z.object({
  line1: z.string().min(1, "Street address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().length(2, "Country code must be ISO 3166-1 alpha-2 (2 letters)"),
  countryName: z.string().min(1, "Country name is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  validatedSource: z.enum(['locationiq', 'manual']).optional(),
  validatedAt: z.date().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryName: string;
  latitude?: number;
  longitude?: number;
  validatedSource?: 'locationiq' | 'manual';
  validatedAt?: Date;
}

// ============================================================================
// Product Validation
// ============================================================================

const baseInsertProductSchema = z.object({
  sellerId: z.string(),
  name: z.string().min(1, "Product name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000, "Description must be 5000 characters or less"),
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  sku: z.string().optional().nullable(),
  image: z.string().min(1).optional(),
  images: z.array(z.string()).optional().nullable(),
  category: z.string().min(1, "Category is required"),
  categoryLevel1Id: z.string().optional().nullable(),
  categoryLevel2Id: z.string().optional().nullable(),
  categoryLevel3Id: z.string().optional().nullable(),
  productType: z.string().default("in-stock"),
  stock: z.number().optional().nullable(),
  depositAmount: z.string().optional().nullable(),
  requiresDeposit: z.number().optional().nullable(),
  variants: z.any().optional().nullable(),
  hasColors: z.number().optional().nullable(),
  madeToOrderDays: z.number().optional().nullable(),
  preOrderDate: z.coerce.date().optional().nullable(),
  discountPercentage: z.string().optional().nullable(),
  promotionActive: z.number().optional().nullable(),
  promotionEndDate: z.coerce.date().optional().nullable(),
  shippingType: z.string().optional().nullable(),
  flatShippingRate: z.string().optional().nullable(),
  shippingMatrixId: z.string().optional().nullable(),
  shippoWeight: z.coerce.number().positive().optional().nullable(),
  shippoLength: z.coerce.number().positive().optional().nullable(),
  shippoWidth: z.coerce.number().positive().optional().nullable(),
  shippoHeight: z.coerce.number().positive().optional().nullable(),
  shippoTemplate: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

export const insertProductSchema = baseInsertProductSchema.refine(
  (data) => {
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

// Frontend Product Schema (for forms)
export const frontendProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().min(1, "Price is required"),
  category: z.string().min(1, "Category is required"),
  productType: z.string().min(1, "Product type is required"),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  stock: z.number().optional(),
  variants: z.any().optional(),
  hasColors: z.number().optional(),
  depositAmount: z.string().optional(),
  requiresDeposit: z.number().optional(),
  madeToOrderDays: z.number().optional(),
  preOrderDate: z.date().optional(),
  discountPercentage: z.string().optional(),
  promotionActive: z.number().optional(),
  promotionEndDate: z.date().optional(),
  shippingType: z.string().optional(),
  flatShippingRate: z.string().optional(),
  shippingMatrixId: z.string().optional(),
  shippoWeight: z.number().optional(),
  shippoLength: z.number().optional(),
  shippoWidth: z.number().optional(),
  shippoHeight: z.number().optional(),
  shippoTemplate: z.string().optional(),
  status: z.string().optional(),
  sku: z.string().optional(),
});

export type FrontendProduct = z.infer<typeof frontendProductSchema>;

// ============================================================================
// Order Validation
// ============================================================================

export const insertOrderSchema = z.object({
  userId: z.string(),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerAddress: z.any(), // JSON field
  total: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid total format"),
  status: z.string().default("pending"),
  items: z.any(), // JSON field
  amountPaid: z.string().optional(),
  remainingBalance: z.string().optional(),
  paymentType: z.string().optional(),
  paymentStatus: z.string().default("pending"),
  stripePaymentIntentId: z.string().optional(),
  stripeBalancePaymentIntentId: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingLink: z.string().optional(),
  taxAmount: z.string().optional(),
  taxCalculationId: z.string().optional(),
  taxBreakdown: z.any().optional(),
  subtotalBeforeTax: z.string().optional(),
  shippingCost: z.string().optional(),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;

// ============================================================================
// Saved Address Validation
// ============================================================================

export const insertSavedAddressSchema = z.object({
  userId: z.string(),
  label: z.string().min(1, "Label is required"),
  address: z.any(), // JSON field using Address type
  isDefault: z.number().default(0),
});

export type InsertSavedAddress = z.infer<typeof insertSavedAddressSchema>;

// ============================================================================
// Checkout Validation
// ============================================================================

export const shippingAddressSchema = addressSchema;
export const billingAddressSchema = addressSchema;

export const checkoutItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  selectedSize: z.string().optional(),
  selectedColor: z.string().optional(),
  selectedVariant: z.any().optional(),
});

export const checkoutInitiateRequestSchema = z.object({
  items: z.array(checkoutItemSchema),
  shippingAddress: shippingAddressSchema,
  billingAddress: billingAddressSchema.optional(),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  sellerId: z.string(),
  paymentType: z.enum(["full", "deposit"]).optional(),
  saveAddress: z.boolean().optional(),
  addressLabel: z.string().optional(),
  useExistingAddress: z.boolean().optional(),
  savedAddressId: z.string().optional(),
});

export type CheckoutInitiateRequest = z.infer<typeof checkoutInitiateRequestSchema>;

// ============================================================================
// Order Update Validation
// ============================================================================

export const updateCustomerDetailsSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").optional(),
  customerEmail: z.string().email("Valid email required").optional(),
  customerAddress: z.any().optional(), // JSON field
});

export type UpdateCustomerDetails = z.infer<typeof updateCustomerDetailsSchema>;

// ============================================================================
// Wholesale Product Validation
// ============================================================================

export const insertWholesaleProductSchema = z.object({
  sellerId: z.string(),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  currency: z.string().default("USD"),
  minimumOrderQuantity: z.number().min(1, "Minimum order quantity must be at least 1"),
  leadTimeDays: z.number().min(1, "Lead time must be at least 1 day"),
  images: z.array(z.string()).optional(),
  category: z.string().optional(),
  specifications: z.any().optional(),
  tieredPricing: z.any().optional(),
  status: z.string().default("active"),
  sku: z.string().optional(),
});

export type InsertWholesaleProduct = z.infer<typeof insertWholesaleProductSchema>;

// ============================================================================
// Enums
// ============================================================================

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

export const userTypeEnum = z.enum(["seller", "buyer"]);
export type UserType = z.infer<typeof userTypeEnum>;

export const invitationStatusEnum = z.enum(["pending", "accepted", "expired"]);
export type InvitationStatus = z.infer<typeof invitationStatusEnum>;

export const productStatusEnum = z.enum(["active", "draft", "coming-soon", "paused", "out-of-stock", "archived"]);
export type ProductStatus = z.infer<typeof productStatusEnum>;

export const refundLineItemTypeEnum = z.enum(["product", "shipping", "tax", "adjustment"]);
export type RefundLineItemType = z.infer<typeof refundLineItemTypeEnum>;

// Trade Quotation Enums
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

export const tradePaymentTypeEnum = z.enum(["deposit", "balance"]);
export type TradePaymentType = z.infer<typeof tradePaymentTypeEnum>;

export const tradePaymentStatusEnum = z.enum(["pending", "paid", "overdue", "cancelled"]);
export type TradePaymentStatus = z.infer<typeof tradePaymentStatusEnum>;
