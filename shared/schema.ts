/**
 * Schema Compatibility Layer
 * 
 * This file re-exports types and validation schemas from their new locations
 * to maintain backward compatibility after removing Drizzle ORM.
 * 
 * Migration Status:
 * - Database operations: 100% Prisma ✓
 * - Types: Re-exported from @shared/prisma-types ✓
 * - Validation: Re-exported from @shared/validation-schemas ✓
 * - Drizzle packages: Uninstalled ✓
 * 
 * Future Work:
 * - Gradually update imports across codebase to use direct paths
 * - Eventually deprecate this compatibility layer
 */

// Re-export all Prisma types
export type {
  // User types
  User,
  InsertUser,
  UpdateUser,
  UpsertUser,
  
  // Product types
  Product,
  InsertProduct,
  UpdateProduct,
  WholesaleProduct,
  InsertWholesaleProduct,
  
  // Order types
  Order,
  InsertOrder,
  UpdateOrder,
  OrderItem,
  InsertOrderItem,
  WholesaleOrder,
  InsertWholesaleOrder,
  WholesaleOrderItem,
  InsertWholesaleOrderItem,
  
  // Cart types
  Cart,
  InsertCart,
  CartSession,
  InsertCartSession,
  WholesaleCart,
  InsertWholesaleCart,
  
  // Auth types
  AuthToken,
  InsertAuthToken,
  
  // Invitation types
  Invitation,
  InsertInvitation,
  WholesaleInvitation,
  InsertWholesaleInvitation,
  TeamInvitation,
  InsertTeamInvitation,
  StoreInvitation,
  InsertStoreInvitation,
  
  // Access types
  UserStoreMembership,
  InsertUserStoreMembership,
  WholesaleAccessGrant,
  InsertWholesaleAccessGrant,
  UserStoreRole,
  InsertUserStoreRole,
  
  // Category types
  Category,
  InsertCategory,
  
  // Notification types
  Notification,
  InsertNotification,
  
  // Shipping types
  ShippingMatrix,
  InsertShippingMatrix,
  ShippingZone,
  InsertShippingZone,
  WholesaleShippingDetail,
  InsertWholesaleShippingDetail,
  
  // Payment types
  BalancePaymentRequest,
  InsertBalancePaymentRequest,
  
  // Refund types
  Refund,
  InsertRefund,
  RefundLineItem,
  InsertRefundLineItem,
  
  // Saved address types
  SavedAddress,
  InsertSavedAddress,
  
  // Subscription types
  Subscription,
  InsertSubscription,
  
  // Newsletter types
  Newsletter,
  InsertNewsletter,
  NewsletterSubscriber,
  InsertNewsletterSubscriber,
  Campaign,
  InsertCampaign,
  NewsletterTemplate,
  InsertNewsletterTemplate,
  
  // Import queue types
  ImportQueueItem,
  InsertImportQueueItem,
  
  // Tax types
  TaxSettings,
  InsertTaxSettings,
  
  // Quotation types
  TradeQuotation,
  InsertTradeQuotation,
  TradeQuotationItem,
  InsertTradeQuotationItem,
  TradeQuotationEvent,
  InsertTradeQuotationEvent,
  TradePayment,
  InsertTradePayment,
  
  // Meta Ads types
  MetaAdAccount,
  InsertMetaAdAccount,
  MetaAdCampaign,
  InsertMetaAdCampaign,
  MetaAdSet,
  InsertMetaAdSet,
  MetaAd,
  InsertMetaAd,
  
  // Domain types
  Domain,
  InsertDomain,
  DomainSettings,
  InsertDomainSettings,
  
  // Store types
  Store,
  InsertStore,
  
  // Warehouse types
  WarehouseAddress,
  InsertWarehouseAddress,
  
  // Cart reservation types
  CartReservation,
  InsertCartReservation,
  
  // Product Variant types
  ProductVariant,
  InsertProductVariant,
} from '@shared/prisma-types';

// Re-export all validation schemas and enums
export {
  // Address schemas
  addressSchema,
  type AddressInput,
  type Address,
  
  // Product schemas
  insertProductSchema,
  type InsertProduct as InsertProductValidation,
  frontendProductSchema,
  type FrontendProduct,
  
  // Order schemas
  insertOrderSchema,
  type InsertOrder as InsertOrderValidation,
  
  // Saved address schemas
  insertSavedAddressSchema,
  type InsertSavedAddress as InsertSavedAddressValidation,
  
  // Checkout schemas
  shippingAddressSchema,
  billingAddressSchema,
  checkoutItemSchema,
  checkoutInitiateRequestSchema,
  type CheckoutInitiateRequest,
  
  // Order update schemas
  updateCustomerDetailsSchema,
  type UpdateCustomerDetails,
  
  // Wholesale product schemas
  insertWholesaleProductSchema,
  type InsertWholesaleProduct as InsertWholesaleProductValidation,
  
  // Enums
  productTypeEnum,
  type ProductType,
  orderStatusEnum,
  type OrderStatus,
  paymentStatusEnum,
  type PaymentStatus,
  itemStatusEnum,
  type ItemStatus,
  storeContextRoleEnum,
  type StoreContextRole,
  userTypeEnum,
  type UserType,
  invitationStatusEnum,
  type InvitationStatus,
  productStatusEnum,
  type ProductStatus,
  refundLineItemTypeEnum,
  type RefundLineItemType,
  tradeQuotationStatusEnum,
  type TradeQuotationStatus,
  tradeQuotationEventTypeEnum,
  type TradeQuotationEventType,
  tradePaymentTypeEnum,
  type TradePaymentType,
  tradePaymentStatusEnum,
  type TradePaymentStatus,
} from '@shared/validation-schemas';

// Import sources enum (still needed for some imports)
export const importSources = {
  shopify: 'shopify',
  csv: 'csv',
  manual: 'manual',
} as const;

export type ImportSource = typeof importSources[keyof typeof importSources];
