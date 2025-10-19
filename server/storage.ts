import { 
  type User, 
  type UpsertUser, 
  type InsertUser,
  type Product, 
  type InsertProduct,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Invitation,
  type InsertInvitation,
  type MetaSettings,
  type TikTokSettings,
  type XSettings,
  type SubscriberGroup,
  type InsertSubscriberGroup,
  type Subscriber,
  type InsertSubscriber,
  type SubscriberGroupMembership,
  type InsertSubscriberGroupMembership,
  type Newsletter,
  type InsertNewsletter,
  type NewsletterTemplate,
  type InsertNewsletterTemplate,
  type NewsletterAnalytics,
  type InsertNewsletterAnalytics,
  type NewsletterEvent,
  type InsertNewsletterEvent,
  type NewsletterSegment,
  type InsertNewsletterSegment,
  type NewsletterSchedule,
  type InsertNewsletterSchedule,
  type NewsletterABTest,
  type InsertNewsletterABTest,
  type NftMint,
  type InsertNftMint,
  type WholesaleProduct,
  type InsertWholesaleProduct,
  type WholesaleInvitation,
  type InsertWholesaleInvitation,
  type UserStoreMembership,
  type InsertUserStoreMembership,
  type WholesaleAccessGrant,
  type InsertWholesaleAccessGrant,
  type TeamInvitation,
  type InsertTeamInvitation,
  type StoreInvitation,
  type InsertStoreInvitation,
  type Category,
  type InsertCategory,
  type Notification,
  type InsertNotification,
  type AuthToken,
  type InsertAuthToken,
  type ShippingMatrix,
  type InsertShippingMatrix,
  type ShippingZone,
  type InsertShippingZone,
  type Invoice,
  type InsertInvoice,
  type PackingSlip,
  type InsertPackingSlip,
  type Refund,
  type InsertRefund,
  type RefundLineItem,
  type InsertRefundLineItem,
  type OrderEvent,
  type InsertOrderEvent,
  type OrderBalancePayment,
  type InsertOrderBalancePayment,
  type BalanceRequest,
  type InsertBalanceRequest,
  type OrderAddressChange,
  type InsertOrderAddressChange,
  type SavedAddress,
  type InsertSavedAddress,
  type SavedPaymentMethod,
  type InsertSavedPaymentMethod,
  type SellerHomepage,
  type InsertSellerHomepage,
  type HomepageCtaOption,
  type InsertHomepageCtaOption,
  type HomepageMediaAsset,
  type InsertHomepageMediaAsset,
  type MusicTrack,
  type InsertMusicTrack,
  type UserStoreRole,
  type InsertUserStoreRole,
  type StockReservation,
  type InsertStockReservation,
  type PaymentIntent,
  type InsertPaymentIntent,
  type WebhookEvent,
  type InsertWebhookEvent,
  type FailedWebhookEvent,
  type InsertFailedWebhookEvent,
  type Cart,
  type InsertCart,
  type CartSession,
  type InsertCartSession,
  type OrderWorkflow,
  type InsertOrderWorkflow,
  type OrderWorkflowEvent,
  type InsertOrderWorkflowEvent,
  type WholesaleOrder,
  type InsertWholesaleOrder,
  type WholesaleOrderItem,
  type InsertWholesaleOrderItem,
  type WholesalePayment,
  type InsertWholesalePayment,
  type WholesaleShippingDetail,
  type InsertWholesaleShippingDetail,
  type WholesaleOrderEvent,
  type InsertWholesaleOrderEvent,
  type WarehouseLocation,
  type InsertWarehouseLocation,
  type BuyerProfile,
  type InsertBuyerProfile,
  type WholesaleCart,
  type InsertWholesaleCart,
  type WholesalePaymentIntent,
  type InsertWholesalePaymentIntent,
  type WholesaleShippingMetadata,
  type InsertWholesaleShippingMetadata,
  type WarehouseAddress,
  type InsertWarehouseAddress,
  type ShippingLabel,
  type InsertShippingLabel,
  type ShippingLabelRefund,
  type InsertShippingLabelRefund,
  type SellerCreditLedger,
  type InsertSellerCreditLedger,
  type BulkUploadJob,
  type InsertBulkUploadJob,
  type BulkUploadItem,
  type InsertBulkUploadItem,
  type MetaAdAccount,
  type InsertMetaAdAccount,
  type MetaCampaign,
  type InsertMetaCampaign,
  type MetaCampaignFinance,
  type InsertMetaCampaignFinance,
  type MetaCampaignMetricsDaily,
  type InsertMetaCampaignMetricsDaily,
  type BackgroundJobRun,
  type InsertBackgroundJobRun,
  type DomainConnection,
  type InsertDomainConnection,
  type NewsletterWorkflow,
  type InsertNewsletterWorkflow,
  type AutomationExecution,
  type InsertAutomationExecution,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type TradeQuotation,
  type InsertTradeQuotation
} from "@shared/prisma-types";

// Also import Drizzle schemas for unmigrated methods
import {
  users, products, orders, orderItems, orderEvents,
  orderBalancePayments, balanceRequests, orderAddressChanges,
  refunds, refundLineItems, stockReservations, invitations,
  metaSettings, tiktokSettings, xSettings, subscriberGroups,
  subscribers, subscriberGroupMemberships, newsletters,
  newsletterTemplates, newsletterAnalytics, newsletterEvents,
  newsletterSegments, newsletterSchedule, newsletterABTests,
  nftMints, wholesaleProducts, wholesaleInvitations,
  categories, notifications, authTokens, shippingMatrices,
  shippingZones, invoices, packingSlips, savedAddresses,
  savedPaymentMethods, sellerHomepages, homepageCtaOptions,
  homepageMediaAssets, musicTracks, userStoreRoles,
  userStoreMemberships, wholesaleAccessGrants, teamInvitations,
  storeInvitations, paymentIntents, webhookEvents,
  failedWebhookEvents, carts, cartSessions, orderWorkflows,
  orderWorkflowEvents, wholesaleOrders, wholesaleOrderItems,
  wholesalePayments, wholesaleShippingDetails,
  wholesaleOrderEvents, warehouseLocations, buyerProfiles,
  wholesaleCarts, wholesalePaymentIntents,
  wholesaleShippingMetadata, warehouseAddresses,
  shippingLabels, shippingLabelRefunds, sellerCreditLedgers,
  bulkUploadJobs, bulkUploadItems, metaAdAccounts,
  metaCampaigns, metaCampaignFinance, metaCampaignMetricsDaily,
  metaAdCampaigns, metaAdPayments, metaAdPerformance,
  backgroundJobRuns, domainConnections, newsletterWorkflows,
  automationExecutions, analyticsEvents, tradeQuotations,
  tradeQuotationItems, tradeQuotationEvents, tradePaymentSchedules,
  importJobs, importSources, importJobLogs, importJobErrors,
  productSourceMappings, newsletterJobs, newsletterConversions,
  subscriberEngagement, cancellationRequests, returnRequests,
  sessions, trustpilotReviews, trustpilotTokens, dailyAnalytics,
  featureAdoptions, cartItems
} from "@shared/schema";

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { eq, and, or, desc, asc, sql, inArray, gte, lte, lt, like, ilike, isNull, isNotNull, count, sum, avg } from 'drizzle-orm';
import ws from 'ws';

// Configure Neon to use ws WebSocket implementation for Node.js
neonConfig.webSocketConstructor = ws;

import { prisma } from './prisma';
import { logger } from './logger';

// Product Search Filters (B2C)
export interface ProductSearchFilters {
  search?: string; // Search in name, description, SKU
  categoryLevel1Id?: string;
  categoryLevel2Id?: string;
  categoryLevel3Id?: string;
  minPrice?: number; // Price in dollars (will be converted to cents)
  maxPrice?: number; // Price in dollars (will be converted to cents)
  sellerId?: string;
  productType?: string;
  status?: string | string[]; // Single status or array of statuses (e.g., ['active', 'coming-soon'])
  sortBy?: 'name' | 'price' | 'createdAt' | 'stock';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Wholesale Product Search Filters (B2B)
export interface WholesaleProductSearchFilters {
  search?: string; // Search in name, description, SKU
  categoryLevel1Id?: string;
  categoryLevel2Id?: string;
  categoryLevel3Id?: string;
  minPrice?: number; // Wholesale price in dollars (will be converted to cents)
  maxPrice?: number; // Wholesale price in dollars (will be converted to cents)
  sellerId?: string;
  minMoq?: number; // Minimum order quantity filter
  maxMoq?: number; // Maximum order quantity filter
  status?: string | string[]; // Single status or array of statuses (e.g., ['active', 'draft'])
  sortBy?: 'name' | 'wholesalePrice' | 'createdAt' | 'moq' | 'stock';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Search results with pagination metadata
export interface ProductSearchResult {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
}

export interface WholesaleProductSearchResult {
  products: WholesaleProduct[];
  total: number;
  limit: number;
  offset: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  updateWelcomeEmailSent(userId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getTeamMembersBySellerId(sellerId: string): Promise<User[]>;
  deleteTeamMember(userId: string, sellerId: string): Promise<boolean>;
  
  // User-Store Roles (context-specific roles)
  getUserStoreRole(userId: string, storeOwnerId: string): Promise<UserStoreRole | undefined>;
  setUserStoreRole(userId: string, storeOwnerId: string, role: "buyer" | "seller" | "owner"): Promise<UserStoreRole>;
  getUserStoreRoles(userId: string): Promise<UserStoreRole[]>;
  
  // New Auth System - User Store Memberships (collaborators/team members)
  getUserStoreMembership(userId: string, storeOwnerId: string): Promise<UserStoreMembership | undefined>;
  getUserStoreMembershipById(id: string): Promise<UserStoreMembership | undefined>;
  getUserStoreMembershipsByStore(storeOwnerId: string): Promise<UserStoreMembership[]>;
  getUserStoreMembershipsByUser(userId: string): Promise<UserStoreMembership[]>;
  getStoreCollaborators(storeOwnerId: string): Promise<UserStoreMembership[]>;
  createUserStoreMembership(membership: InsertUserStoreMembership): Promise<UserStoreMembership>;
  updateUserStoreMembership(id: string, updates: Partial<UserStoreMembership>): Promise<UserStoreMembership | undefined>;
  deleteUserStoreMembership(id: string): Promise<boolean>;
  
  // New Auth System - Wholesale Access Grants
  getWholesaleAccessGrant(buyerId: string, sellerId: string): Promise<WholesaleAccessGrant | undefined>;
  getWholesaleAccessGrantsBySeller(sellerId: string): Promise<WholesaleAccessGrant[]>;
  getWholesaleAccessGrantsByBuyer(buyerId: string): Promise<WholesaleAccessGrant[]>;
  createWholesaleAccessGrant(grant: InsertWholesaleAccessGrant): Promise<WholesaleAccessGrant>;
  updateWholesaleAccessGrant(id: string, status: string): Promise<WholesaleAccessGrant | undefined>;
  
  // New Auth System - Team Invitations (legacy)
  getTeamInvitation(id: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationsByStore(storeOwnerId: string): Promise<TeamInvitation[]>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  updateTeamInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<TeamInvitation | undefined>;
  
  // New Auth System - Store Invitations (new simplified system)
  getStoreInvitationById(id: string): Promise<StoreInvitation | undefined>;
  getStoreInvitationByToken(token: string): Promise<StoreInvitation | undefined>;
  getPendingStoreInvitations(storeOwnerId: string): Promise<StoreInvitation[]>;
  createStoreInvitation(invitation: InsertStoreInvitation): Promise<StoreInvitation>;
  updateStoreInvitationStatus(id: string, status: string): Promise<StoreInvitation | undefined>;
  
  // New Auth System - Wholesale Invitations
  getWholesaleInvitation(id: string): Promise<WholesaleInvitation | undefined>;
  getWholesaleInvitationByToken(token: string): Promise<WholesaleInvitation | undefined>;
  getWholesaleInvitationsBySeller(sellerId: string): Promise<WholesaleInvitation[]>;
  createWholesaleInvitation(invitation: InsertWholesaleInvitation): Promise<WholesaleInvitation>;
  updateWholesaleInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<WholesaleInvitation | undefined>;
  
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Product Search & Filtering (B2C)
  searchProducts(filters: ProductSearchFilters): Promise<ProductSearchResult>;
  countProducts(filters: ProductSearchFilters): Promise<number>;
  
  // Inventory Management - Stock Reservations
  getStockReservation(id: string): Promise<StockReservation | undefined>;
  getStockReservationsBySession(sessionId: string): Promise<StockReservation[]>;
  getStockReservationsByProduct(productId: string): Promise<StockReservation[]>;
  getExpiredStockReservations(now: Date): Promise<StockReservation[]>;
  getReservedStock(productId: string, variantId?: string): Promise<number>;
  createStockReservation(reservation: InsertStockReservation): Promise<StockReservation>;
  updateStockReservation(id: string, data: Partial<StockReservation>): Promise<StockReservation | undefined>;
  commitReservationsBySession(sessionId: string, orderId: string): Promise<{
    success: boolean;
    committed: number;
    error?: string;
  }>;
  atomicReserveStock(
    productId: string,
    quantity: number,
    sessionId: string,
    options?: {
      variantId?: string;
      userId?: string;
      expirationMinutes?: number;
    }
  ): Promise<{
    success: boolean;
    reservation?: StockReservation;
    error?: string;
    availability?: {
      available: boolean;
      currentStock: number;
      reservedStock: number;
      availableStock: number;
      productId: string;
      variantId?: string;
    };
  }>;
  updateReservationQuantityAtomic(
    reservationId: string,
    newQuantity: number
  ): Promise<{
    success: boolean;
    reservation?: StockReservation;
    error?: string;
    availability?: {
      available: boolean;
      currentStock: number;
      reservedStock: number;
      availableStock: number;
      productId: string;
      variantId?: string;
    };
  }>;
  
  getAllOrders(): Promise<Order[]>;
  getOrdersByUserId(userId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderTracking(id: string, trackingNumber: string, trackingLink: string): Promise<Order | undefined>;
  updateOrderBalancePaymentIntent(id: string, paymentIntentId: string): Promise<Order | undefined>;
  updateOrderFulfillmentStatus(orderId: string): Promise<Order | undefined>;
  
  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  getOrderItemById(itemId: string): Promise<OrderItem | undefined>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]>;
  updateOrderItemStatus(itemId: string, status: string): Promise<OrderItem | undefined>;
  updateOrderItemTracking(itemId: string, trackingNumber: string, trackingCarrier?: string, trackingUrl?: string): Promise<OrderItem | undefined>;
  updateOrderItemRefund(itemId: string, refundedQuantity: number, refundedAmount: string, status: string): Promise<OrderItem | undefined>;
  updateOrderItemDeliveryDate(itemId: string, preOrderDate: Date | null, madeToOrderLeadTime: number | null): Promise<OrderItem | undefined>;
  updateOrderCustomerDetails(orderId: string, details: { customerName: string; shippingStreet: string; shippingCity: string; shippingState: string; shippingPostalCode: string; shippingCountry: string; billingStreet: string; billingCity: string; billingState: string; billingPostalCode: string; billingCountry: string }): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  deleteOrderItems(orderId: string): Promise<boolean>;
  
  // Refunds
  createRefund(refund: InsertRefund): Promise<Refund>;
  getRefund(id: string): Promise<Refund | undefined>;
  getRefundsByOrderId(orderId: string): Promise<Refund[]>;
  updateRefundStatus(id: string, status: string, stripeRefundId?: string): Promise<Refund | undefined>;
  updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<Order | undefined>;
  
  // Refund Line Items
  createRefundLineItem(lineItem: InsertRefundLineItem): Promise<RefundLineItem>;
  createRefundLineItems(lineItems: InsertRefundLineItem[]): Promise<RefundLineItem[]>;
  getRefundLineItems(refundId: string): Promise<RefundLineItem[]>;
  
  // Refund Calculations & Validation
  getRefundableAmountForOrder(orderId: string): Promise<{ 
    totalRefundable: string; 
    refundedSoFar: string; 
    items: Array<{
      itemId: string;
      productName: string;
      quantity: number;
      refundedQuantity: number;
      price: string;
      refundableQuantity: number;
      refundableAmount: string;
    }>;
    shipping: { 
      total: string; 
      refunded: string; 
      refundable: string; 
    };
    tax: { 
      total: string; 
      refunded: string; 
      refundable: string; 
    };
  }>;
  getRefundHistoryWithLineItems(orderId: string): Promise<Array<Refund & { lineItems: RefundLineItem[] }>>;
  
  // Order Events - track email and status history
  getOrderEvents(orderId: string): Promise<OrderEvent[]>;
  createOrderEvent(event: InsertOrderEvent): Promise<OrderEvent>;
  
  // Order Balance Payments - track deposit/balance lifecycle for pre-orders & made-to-order
  getBalancePaymentsByOrderId(orderId: string): Promise<OrderBalancePayment[]>;
  getBalancePayment(id: string): Promise<OrderBalancePayment | undefined>;
  createBalancePayment(payment: InsertOrderBalancePayment): Promise<OrderBalancePayment>;
  updateBalancePayment(id: string, data: Partial<OrderBalancePayment>): Promise<OrderBalancePayment | undefined>;
  
  // Balance Requests - Architecture 3 balance payment sessions with token-based authentication
  getBalanceRequest(id: string): Promise<BalanceRequest | undefined>;
  getBalanceRequestByOrderId(orderId: string): Promise<BalanceRequest | undefined>;
  getBalanceRequestByToken(tokenHash: string): Promise<BalanceRequest | undefined>;
  createBalanceRequest(request: InsertBalanceRequest): Promise<BalanceRequest>;
  updateBalanceRequest(id: string, data: Partial<BalanceRequest>): Promise<BalanceRequest | undefined>;
  
  // Order Address Changes - audit trail for shipping address modifications
  getOrderAddressChanges(orderId: string): Promise<OrderAddressChange[]>;
  createOrderAddressChange(change: InsertOrderAddressChange): Promise<OrderAddressChange>;
  
  // Order Workflows - orchestration and state management for order creation
  createWorkflow(workflow: InsertOrderWorkflow): Promise<OrderWorkflow>;
  getWorkflow(id: string): Promise<OrderWorkflow | undefined>;
  getWorkflowByCheckoutSession(checkoutSessionId: string): Promise<OrderWorkflow | undefined>;
  getWorkflowByPaymentIntent(paymentIntentId: string): Promise<OrderWorkflow | undefined>;
  updateWorkflowState(id: string, state: string, data?: any): Promise<OrderWorkflow | undefined>;
  updateWorkflowStatus(id: string, status: string, error?: string, errorCode?: string): Promise<OrderWorkflow | undefined>;
  updateWorkflowOrderId(id: string, orderId: string): Promise<OrderWorkflow | undefined>;
  updateWorkflowPaymentIntentId(id: string, paymentIntentId: string): Promise<OrderWorkflow | undefined>;
  updateWorkflowRetry(id: string, retryCount: number): Promise<OrderWorkflow | undefined>;
  createWorkflowEvent(event: InsertOrderWorkflowEvent): Promise<OrderWorkflowEvent>;
  getWorkflowEvents(workflowId: string): Promise<OrderWorkflowEvent[]>;
  
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  updateInvitationStatus(token: string, status: string): Promise<Invitation | undefined>;
  getAllInvitations(): Promise<Invitation[]>;
  
  saveMetaSettings(userId: string, settings: Partial<MetaSettings>): Promise<MetaSettings>;
  getMetaSettings(userId: string): Promise<MetaSettings | undefined>;
  deleteMetaSettings(userId: string): Promise<boolean>;
  
  saveTikTokSettings(userId: string, settings: Partial<TikTokSettings>): Promise<TikTokSettings>;
  getTikTokSettings(userId: string): Promise<TikTokSettings | undefined>;
  deleteTikTokSettings(userId: string): Promise<boolean>;
  
  saveXSettings(userId: string, settings: Partial<XSettings>): Promise<XSettings>;
  getXSettings(userId: string): Promise<XSettings | undefined>;
  deleteXSettings(userId: string): Promise<boolean>;
  
  // Subscriber Groups
  getSubscriberGroupsByUserId(userId: string): Promise<SubscriberGroup[]>;
  getSubscriberGroup(id: string): Promise<SubscriberGroup | undefined>;
  getSubscriberGroupByName(userId: string, name: string): Promise<SubscriberGroup | undefined>;
  createSubscriberGroup(group: InsertSubscriberGroup): Promise<SubscriberGroup>;
  updateSubscriberGroup(id: string, data: Partial<SubscriberGroup>): Promise<SubscriberGroup | undefined>;
  deleteSubscriberGroup(id: string): Promise<boolean>;
  
  // Subscribers
  getSubscribersByUserId(userId: string): Promise<Subscriber[]>;
  getSubscribersByGroupId(userId: string, groupId: string): Promise<Subscriber[]>;
  getSubscriber(id: string): Promise<Subscriber | undefined>;
  getSubscriberByEmail(userId: string, email: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  updateSubscriber(id: string, data: Partial<Subscriber>): Promise<Subscriber | undefined>;
  deleteSubscriber(id: string): Promise<boolean>;
  addSubscriberToGroup(subscriberId: string, groupId: string): Promise<SubscriberGroupMembership>;
  removeSubscriberFromGroup(subscriberId: string, groupId: string): Promise<boolean>;
  
  // Newsletters
  getNewslettersByUserId(userId: string): Promise<Newsletter[]>;
  getNewsletter(id: string): Promise<Newsletter | undefined>;
  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
  updateNewsletter(id: string, data: Partial<Newsletter>): Promise<Newsletter | undefined>;
  deleteNewsletter(id: string): Promise<boolean>;
  
  // Newsletter Segments
  createNewsletterSegment(segment: InsertNewsletterSegment): Promise<NewsletterSegment>;
  getNewsletterSegment(id: string): Promise<NewsletterSegment | undefined>;
  getNewsletterSegmentsByUserId(userId: string): Promise<NewsletterSegment[]>;
  
  // Newsletter Schedules
  createNewsletterSchedule(schedule: InsertNewsletterSchedule): Promise<NewsletterSchedule>;
  getNewsletterSchedule(id: string): Promise<NewsletterSchedule | undefined>;
  getScheduledCampaigns(): Promise<NewsletterSchedule[]>;
  
  // Newsletter A/B Tests
  createNewsletterABTest(test: InsertNewsletterABTest): Promise<NewsletterABTest>;
  getNewsletterABTest(id: string): Promise<NewsletterABTest | undefined>;
  
  // Newsletter Templates
  getNewsletterTemplatesByUserId(userId: string): Promise<NewsletterTemplate[]>;
  getNewsletterTemplate(id: string): Promise<NewsletterTemplate | undefined>;
  createNewsletterTemplate(template: InsertNewsletterTemplate): Promise<NewsletterTemplate>;
  updateNewsletterTemplate(id: string, data: Partial<NewsletterTemplate>): Promise<NewsletterTemplate | undefined>;
  deleteNewsletterTemplate(id: string): Promise<boolean>;
  
  // Newsletter Analytics
  getNewsletterAnalytics(newsletterId: string): Promise<NewsletterAnalytics | undefined>;
  getNewsletterAnalyticsByUserId(userId: string): Promise<NewsletterAnalytics[]>;
  createNewsletterAnalytics(analytics: InsertNewsletterAnalytics): Promise<NewsletterAnalytics>;
  updateNewsletterAnalytics(newsletterId: string, data: Partial<NewsletterAnalytics>): Promise<NewsletterAnalytics | undefined>;
  
  // Newsletter Events
  createNewsletterEvent(event: InsertNewsletterEvent): Promise<NewsletterEvent | null>;
  getNewsletterEventsByNewsletterId(newsletterId: string): Promise<NewsletterEvent[]>;
  getNewsletterEventByWebhookId(webhookEventId: string): Promise<NewsletterEvent | undefined>;
  
  createNftMint(nftMint: InsertNftMint): Promise<NftMint>;
  getNftMintsByUserId(userId: string): Promise<NftMint[]>;
  getNftMintByOrderId(orderId: string): Promise<NftMint | undefined>;
  
  getAllWholesaleProducts(): Promise<WholesaleProduct[]>;
  getWholesaleProductsBySellerId(sellerId: string): Promise<WholesaleProduct[]>;
  getWholesaleProduct(id: string): Promise<WholesaleProduct | undefined>;
  createWholesaleProduct(product: InsertWholesaleProduct): Promise<WholesaleProduct>;
  updateWholesaleProduct(id: string, product: Partial<InsertWholesaleProduct>): Promise<WholesaleProduct | undefined>;
  deleteWholesaleProduct(id: string): Promise<boolean>;
  
  // Wholesale Product Search & Filtering (B2B)
  searchWholesaleProducts(filters: WholesaleProductSearchFilters): Promise<WholesaleProductSearchResult>;
  countWholesaleProducts(filters: WholesaleProductSearchFilters): Promise<number>;
  
  createWholesaleInvitation(invitation: InsertWholesaleInvitation): Promise<WholesaleInvitation>;
  getAllWholesaleInvitations(): Promise<WholesaleInvitation[]>;
  getWholesaleInvitationsBySellerId(sellerId: string): Promise<WholesaleInvitation[]>;
  getWholesaleInvitationByToken(token: string): Promise<WholesaleInvitation | undefined>;
  acceptWholesaleInvitation(token: string, buyerUserId: string): Promise<WholesaleInvitation | undefined>;
  deleteWholesaleInvitation(id: string): Promise<boolean>;
  
  // Wholesale Carts
  getWholesaleCart(buyerId: string): Promise<WholesaleCart | undefined>;
  createWholesaleCart(buyerId: string, sellerId: string, currency?: string): Promise<WholesaleCart>;
  updateWholesaleCart(buyerId: string, items: any[], currency?: string): Promise<WholesaleCart | undefined>;
  clearWholesaleCart(buyerId: string): Promise<boolean>;
  
  // Wholesale B2B Orders
  createWholesaleOrder(order: InsertWholesaleOrder): Promise<WholesaleOrder>;
  getWholesaleOrder(id: string): Promise<WholesaleOrder | undefined>;
  getWholesaleOrderByNumber(orderNumber: string): Promise<WholesaleOrder | undefined>;
  getWholesaleOrdersBySellerId(sellerId: string): Promise<WholesaleOrder[]>;
  getWholesaleOrdersByBuyerId(buyerId: string): Promise<WholesaleOrder[]>;
  getOrdersWithBalanceDueSoon(dueDate: Date): Promise<WholesaleOrder[]>;
  updateWholesaleOrder(id: string, updates: Partial<WholesaleOrder>): Promise<WholesaleOrder | undefined>;
  deleteWholesaleOrder(id: string): Promise<boolean>;
  
  // Wholesale Order Items
  createWholesaleOrderItem(item: InsertWholesaleOrderItem): Promise<WholesaleOrderItem>;
  getWholesaleOrderItems(wholesaleOrderId: string): Promise<WholesaleOrderItem[]>;
  getWholesaleOrderItem(id: string): Promise<WholesaleOrderItem | undefined>;
  updateWholesaleOrderItem(id: string, updates: Partial<WholesaleOrderItem>): Promise<WholesaleOrderItem | undefined>;
  updateWholesaleOrderItemRefund(itemId: string, refundedQuantity: number, refundedAmountCents: number): Promise<WholesaleOrderItem | undefined>;
  deleteWholesaleOrderItem(id: string): Promise<boolean>;
  
  // Wholesale Payments
  createWholesalePayment(payment: InsertWholesalePayment): Promise<WholesalePayment>;
  getWholesalePayment(id: string): Promise<WholesalePayment | undefined>;
  getWholesalePaymentsByOrderId(wholesaleOrderId: string): Promise<WholesalePayment[]>;
  updateWholesalePayment(id: string, updates: Partial<WholesalePayment>): Promise<WholesalePayment | undefined>;
  deleteWholesalePayment(id: string): Promise<boolean>;
  
  // Wholesale Payment Intents (Stripe Integration)
  createPaymentIntent(data: InsertWholesalePaymentIntent): Promise<WholesalePaymentIntent>;
  getPaymentIntentsByOrderId(orderId: string): Promise<WholesalePaymentIntent[]>;
  getPaymentIntentByStripeId(stripePaymentIntentId: string): Promise<WholesalePaymentIntent | undefined>;
  updateWholesalePaymentIntentStatus(id: string, status: string): Promise<WholesalePaymentIntent | undefined>;
  
  // Wholesale Shipping Metadata
  createShippingMetadata(data: InsertWholesaleShippingMetadata): Promise<WholesaleShippingMetadata>;
  getShippingMetadataByOrderId(orderId: string): Promise<WholesaleShippingMetadata | undefined>;
  updateShippingMetadata(id: string, data: Partial<InsertWholesaleShippingMetadata>): Promise<WholesaleShippingMetadata | undefined>;
  
  // Wholesale Shipping Details
  createWholesaleShippingDetails(details: InsertWholesaleShippingDetail): Promise<WholesaleShippingDetail>;
  getWholesaleShippingDetails(wholesaleOrderId: string): Promise<WholesaleShippingDetail | undefined>;
  updateWholesaleShippingDetails(wholesaleOrderId: string, updates: Partial<WholesaleShippingDetail>): Promise<WholesaleShippingDetail | undefined>;
  deleteWholesaleShippingDetails(wholesaleOrderId: string): Promise<boolean>;
  
  // Wholesale Order Events
  createWholesaleOrderEvent(event: InsertWholesaleOrderEvent): Promise<WholesaleOrderEvent>;
  getWholesaleOrderEvents(wholesaleOrderId: string): Promise<WholesaleOrderEvent[]>;
  
  // Warehouse Locations
  createWarehouseLocation(location: InsertWarehouseLocation): Promise<WarehouseLocation>;
  getWarehouseLocation(id: string): Promise<WarehouseLocation | undefined>;
  getWarehouseLocationsBySellerId(sellerId: string): Promise<WarehouseLocation[]>;
  getDefaultWarehouseLocation(sellerId: string): Promise<WarehouseLocation | undefined>;
  updateWarehouseLocation(id: string, updates: Partial<WarehouseLocation>): Promise<WarehouseLocation | undefined>;
  setDefaultWarehouseLocation(sellerId: string, locationId: string): Promise<WarehouseLocation | undefined>;
  deleteWarehouseLocation(id: string): Promise<boolean>;
  
  // Buyer Profiles
  createBuyerProfile(profile: InsertBuyerProfile): Promise<BuyerProfile>;
  getBuyerProfile(id: string): Promise<BuyerProfile | undefined>;
  getBuyerProfileByUserId(userId: string): Promise<BuyerProfile | undefined>;
  updateBuyerProfile(id: string, updates: Partial<BuyerProfile>): Promise<BuyerProfile | undefined>;
  deleteBuyerProfile(id: string): Promise<boolean>;
  
  getAllCategories(): Promise<Category[]>;
  getCategoriesByLevel(level: number): Promise<Category[]>;
  getCategoriesByParentId(parentId: string | null): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  
  createAuthToken(token: InsertAuthToken): Promise<AuthToken>;
  getAuthTokenByToken(token: string): Promise<AuthToken | undefined>;
  getAuthTokenByCode(email: string, code: string): Promise<AuthToken | undefined>;
  markAuthTokenAsUsed(id: string): Promise<AuthToken | undefined>;
  deleteExpiredAuthTokens(): Promise<number>;
  
  // Shipping Matrices
  getShippingMatricesBySellerId(sellerId: string): Promise<ShippingMatrix[]>;
  getShippingMatrix(id: string): Promise<ShippingMatrix | undefined>;
  createShippingMatrix(matrix: InsertShippingMatrix): Promise<ShippingMatrix>;
  updateShippingMatrix(id: string, matrix: Partial<InsertShippingMatrix>): Promise<ShippingMatrix | undefined>;
  deleteShippingMatrix(id: string): Promise<boolean>;
  
  // Shipping Zones
  getShippingZonesByMatrixId(matrixId: string): Promise<ShippingZone[]>;
  getShippingZone(id: string): Promise<ShippingZone | undefined>;
  createShippingZone(zone: InsertShippingZone): Promise<ShippingZone>;
  updateShippingZone(id: string, zone: Partial<InsertShippingZone>): Promise<ShippingZone | undefined>;
  deleteShippingZone(id: string): Promise<boolean>;
  
  // Warehouse Addresses - Multi-warehouse management
  getWarehouseAddress(id: string): Promise<WarehouseAddress | undefined>;
  getWarehouseAddressesBySellerId(sellerId: string): Promise<WarehouseAddress[]>;
  getDefaultWarehouseAddress(sellerId: string): Promise<WarehouseAddress | undefined>;
  createWarehouseAddress(address: InsertWarehouseAddress): Promise<WarehouseAddress>;
  updateWarehouseAddress(id: string, address: Partial<InsertWarehouseAddress>): Promise<WarehouseAddress | undefined>;
  deleteWarehouseAddress(id: string): Promise<boolean>;
  setDefaultWarehouseAddress(sellerId: string, warehouseId: string): Promise<boolean>;
  
  // Shipping Labels (Shippo Integration)
  getShippingLabel(id: string): Promise<ShippingLabel | undefined>;
  getShippingLabelsByOrderId(orderId: string): Promise<ShippingLabel[]>;
  getShippingLabelsBySellerId(sellerId: string): Promise<ShippingLabel[]>;
  createShippingLabel(label: InsertShippingLabel): Promise<ShippingLabel>;
  updateShippingLabel(id: string, label: Partial<InsertShippingLabel>): Promise<ShippingLabel | undefined>;
  
  // Shipping Label Refunds
  getShippingLabelRefund(id: string): Promise<ShippingLabelRefund | undefined>;
  getPendingShippingLabelRefunds(): Promise<ShippingLabelRefund[]>;
  createShippingLabelRefund(refund: InsertShippingLabelRefund): Promise<ShippingLabelRefund>;
  updateShippingLabelRefund(id: string, refund: Partial<InsertShippingLabelRefund>): Promise<ShippingLabelRefund | undefined>;
  
  // Seller Credit Ledger
  getSellerCreditLedgersBySellerId(sellerId: string): Promise<SellerCreditLedger[]>;
  createSellerCreditLedger(ledger: InsertSellerCreditLedger): Promise<SellerCreditLedger>;
  
  // User Update
  updateUser(userId: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  
  
  // Invoices
  getInvoicesByOrderId(orderId: string): Promise<Invoice[]>;
  getInvoicesBySellerId(sellerId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  
  // Packing Slips
  getPackingSlipsByOrderId(orderId: string): Promise<PackingSlip[]>;
  getPackingSlipsBySellerId(sellerId: string): Promise<PackingSlip[]>;
  getPackingSlip(id: string): Promise<PackingSlip | undefined>;
  getPackingSlipByNumber(packingSlipNumber: string): Promise<PackingSlip | undefined>;
  createPackingSlip(packingSlip: InsertPackingSlip): Promise<PackingSlip>;
  
  // Saved Addresses
  getSavedAddressesByUserId(userId: string): Promise<SavedAddress[]>;
  getSavedAddress(id: string): Promise<SavedAddress | undefined>;
  createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress>;
  updateSavedAddress(id: string, address: Partial<InsertSavedAddress>): Promise<SavedAddress | undefined>;
  deleteSavedAddress(id: string): Promise<boolean>;
  setDefaultAddress(userId: string, addressId: string): Promise<void>;
  
  // Saved Payment Methods
  getSavedPaymentMethodsByUserId(userId: string): Promise<SavedPaymentMethod[]>;
  getSavedPaymentMethod(id: string): Promise<SavedPaymentMethod | undefined>;
  getSavedPaymentMethodByStripeId(stripePaymentMethodId: string): Promise<SavedPaymentMethod | undefined>;
  createSavedPaymentMethod(paymentMethod: InsertSavedPaymentMethod): Promise<SavedPaymentMethod>;
  deleteSavedPaymentMethod(id: string): Promise<boolean>;
  setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void>;
  
  // Homepage Builder
  getHomepageBySellerId(sellerId: string): Promise<SellerHomepage | undefined>;
  createHomepage(homepage: InsertSellerHomepage): Promise<SellerHomepage>;
  updateHomepage(id: string, homepage: Partial<InsertSellerHomepage>): Promise<SellerHomepage | undefined>;
  publishHomepage(id: string): Promise<SellerHomepage | undefined>;
  unpublishHomepage(id: string): Promise<SellerHomepage | undefined>;
  
  // Homepage CTA Options
  getAllCtaOptions(): Promise<HomepageCtaOption[]>;
  getCtaOption(id: string): Promise<HomepageCtaOption | undefined>;
  
  // Homepage Media Assets
  getHomepageMedia(homepageId: string): Promise<HomepageMediaAsset[]>;
  createHomepageMedia(media: InsertHomepageMediaAsset): Promise<HomepageMediaAsset>;
  deleteHomepageMedia(id: string): Promise<boolean>;
  
  // Music Tracks
  searchMusicTracks(query: string, genre?: string): Promise<MusicTrack[]>;
  getMusicTrack(id: string): Promise<MusicTrack | undefined>;
  createMusicTrack(track: InsertMusicTrack): Promise<MusicTrack>;
  
  // Payment Intents
  getPaymentIntent(id: string): Promise<PaymentIntent | undefined>;
  getPaymentIntentByIdempotencyKey(idempotencyKey: string): Promise<PaymentIntent | undefined>;
  getPaymentIntentByProviderIntentId(providerIntentId: string): Promise<PaymentIntent | undefined>;
  storePaymentIntent(intent: InsertPaymentIntent): Promise<PaymentIntent>;
  updatePaymentIntentStatus(id: string, status: string): Promise<PaymentIntent | undefined>;
  
  // Webhook Events
  isWebhookEventProcessed(eventId: string): Promise<boolean>;
  markWebhookEventProcessed(eventId: string, payload: any, eventType: string, providerName: string): Promise<void>;
  storeFailedWebhookEvent(event: InsertFailedWebhookEvent): Promise<FailedWebhookEvent>;
  getUnprocessedFailedWebhooks(limit?: number): Promise<FailedWebhookEvent[]>;
  incrementWebhookRetryCount(id: string): Promise<void>;
  deleteFailedWebhookEvent(id: string): Promise<void>;
  
  // Shopping Carts - Bridge table pattern
  getCartBySession(sessionId: string): Promise<Cart | undefined>;
  getCartByUserId(userId: string): Promise<Cart | undefined>;
  saveCart(sessionId: string, sellerId: string, items: any[], userId?: string): Promise<Cart>;
  clearCartBySession(sessionId: string): Promise<void>;
  
  // Bulk Product Upload
  createBulkUploadJob(job: InsertBulkUploadJob): Promise<BulkUploadJob>;
  getBulkUploadJob(id: string): Promise<BulkUploadJob | undefined>;
  getBulkUploadJobsBySeller(sellerId: string): Promise<BulkUploadJob[]>;
  updateBulkUploadJob(id: string, updates: Partial<BulkUploadJob>): Promise<BulkUploadJob | undefined>;
  
  createBulkUploadItem(item: InsertBulkUploadItem): Promise<BulkUploadItem>;
  createBulkUploadItems(items: InsertBulkUploadItem[]): Promise<BulkUploadItem[]>;
  getBulkUploadItemsByJob(jobId: string): Promise<BulkUploadItem[]>;
  updateBulkUploadItem(id: string, updates: Partial<BulkUploadItem>): Promise<BulkUploadItem | undefined>;
  deleteBulkUploadItemsByJob(jobId: string): Promise<boolean>;
  
  // Meta Ad Accounts
  getMetaAdAccount(id: string): Promise<MetaAdAccount | undefined>;
  getMetaAdAccountBySeller(sellerId: string): Promise<MetaAdAccount | undefined>;
  getAllMetaAdAccountsBySeller(sellerId: string): Promise<MetaAdAccount[]>;
  getSelectedMetaAdAccount(sellerId: string): Promise<MetaAdAccount | undefined>;
  getMetaAdAccountByMetaAccountId(metaAdAccountId: string): Promise<MetaAdAccount | undefined>;
  createMetaAdAccount(account: InsertMetaAdAccount): Promise<string>;
  updateMetaAdAccount(id: string, updates: Partial<MetaAdAccount>): Promise<MetaAdAccount | undefined>;
  selectMetaAdAccount(sellerId: string, accountId: string): Promise<boolean>;
  
  // Meta Campaigns
  getMetaCampaign(id: string): Promise<MetaCampaign | undefined>;
  getMetaCampaignsBySeller(sellerId: string): Promise<MetaCampaign[]>;
  getMetaCampaignsByAdAccount(adAccountId: string): Promise<MetaCampaign[]>;
  createMetaCampaign(campaign: InsertMetaCampaign): Promise<string>;
  updateMetaCampaign(id: string, updates: Partial<MetaCampaign>): Promise<MetaCampaign | undefined>;
  
  // Meta Campaign Finance
  getMetaCampaignFinance(id: string): Promise<MetaCampaignFinance | undefined>;
  getMetaCampaignFinanceBySeller(sellerId: string): Promise<MetaCampaignFinance[]>;
  getMetaCampaignFinanceByCampaign(campaignId: string): Promise<MetaCampaignFinance[]>;
  createMetaCampaignFinanceRecord(record: InsertMetaCampaignFinance): Promise<string>;
  
  // Meta Campaign Metrics
  getMetaCampaignMetrics(campaignId: string, startDate?: Date, endDate?: Date): Promise<MetaCampaignMetricsDaily[]>;
  getMetaCampaignMetricsForDate(campaignId: string, date: Date): Promise<MetaCampaignMetricsDaily | undefined>;
  upsertMetaCampaignMetrics(metrics: InsertMetaCampaignMetricsDaily): Promise<string>;
  
  // Background Jobs
  getBackgroundJobRun(id: string): Promise<BackgroundJobRun | undefined>;
  getBackgroundJobRunsByName(jobName: string): Promise<BackgroundJobRun[]>;
  getRecentBackgroundJobRuns(jobName: string, limit: number): Promise<BackgroundJobRun[]>;
  createBackgroundJobRun(job: InsertBackgroundJobRun): Promise<string>;
  updateBackgroundJobRun(id: string, updates: Partial<BackgroundJobRun>): Promise<BackgroundJobRun | undefined>;
  
  // Custom Domain Connections (Dual-Strategy: Cloudflare + Manual)
  getAllDomainConnections(): Promise<DomainConnection[]>;
  getDomainConnectionById(id: string): Promise<DomainConnection | undefined>;
  getDomainConnectionByDomain(domain: string): Promise<DomainConnection | undefined>;
  getDomainConnectionsBySellerId(sellerId: string): Promise<DomainConnection[]>;
  getDomainConnectionByCloudflareId(cloudflareId: string): Promise<DomainConnection | undefined>;
  getDomainConnectionByVerificationToken(token: string): Promise<DomainConnection | undefined>;
  getDomainByName(domain: string): Promise<DomainConnection | null>;
  getDomainsInProvisioning(sellerId?: string): Promise<DomainConnection[]>;
  createDomainConnection(connection: InsertDomainConnection): Promise<DomainConnection>;
  updateDomainConnection(id: string, updates: Partial<DomainConnection>): Promise<DomainConnection | undefined>;
  deleteDomainConnection(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private pool: Pool;
  private db: any; // Drizzle client for unmigrated methods
  private initialized: boolean = false;
  
  constructor() {
    // Initialize Drizzle (for unmigrated methods)
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(this.pool);
    this.initialized = true;
    
    // Prisma client is imported from ./prisma.ts and already initialized
  }

  private async ensureInitialized() {
    // Already initialized in constructor
    return Promise.resolve();
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.findUnique({ where: { id } });
    return result ?? undefined;
  }

  /**
   * Helper function to map camelCase fields from UpsertUser to snake_case Prisma format
   */
  private mapUserDataToPrisma(userData: any): any {
    const mapped: any = {};
    
    // Fields that don't need transformation (already snake_case or no change needed)
    if (userData.id !== undefined) mapped.id = userData.id;
    if (userData.email !== undefined) mapped.email = userData.email;
    if (userData.username !== undefined) mapped.username = userData.username;
    if (userData.role !== undefined) mapped.role = userData.role;
    
    // CamelCase to snake_case transformations
    if (userData.firstName !== undefined) mapped.first_name = userData.firstName;
    if (userData.lastName !== undefined) mapped.last_name = userData.lastName;
    if (userData.profileImageUrl !== undefined) mapped.profile_image_url = userData.profileImageUrl;
    if (userData.sellerId !== undefined) mapped.seller_id = userData.sellerId;
    if (userData.invitedBy !== undefined) mapped.invited_by = userData.invitedBy;
    if (userData.storeBanner !== undefined) mapped.store_banner = userData.storeBanner;
    if (userData.storeLogo !== undefined) mapped.store_logo = userData.storeLogo;
    if (userData.paymentProvider !== undefined) mapped.payment_provider = userData.paymentProvider;
    if (userData.stripeConnectedAccountId !== undefined) mapped.stripe_connected_account_id = userData.stripeConnectedAccountId;
    if (userData.stripeChargesEnabled !== undefined) mapped.stripe_charges_enabled = userData.stripeChargesEnabled;
    if (userData.stripePayoutsEnabled !== undefined) mapped.stripe_payouts_enabled = userData.stripePayoutsEnabled;
    if (userData.stripeDetailsSubmitted !== undefined) mapped.stripe_details_submitted = userData.stripeDetailsSubmitted;
    if (userData.listingCurrency !== undefined) mapped.listing_currency = userData.listingCurrency;
    if (userData.stripeCustomerId !== undefined) mapped.stripe_customer_id = userData.stripeCustomerId;
    if (userData.stripeSubscriptionId !== undefined) mapped.stripe_subscription_id = userData.stripeSubscriptionId;
    if (userData.subscriptionStatus !== undefined) mapped.subscription_status = userData.subscriptionStatus;
    if (userData.subscriptionPlan !== undefined) mapped.subscription_plan = userData.subscriptionPlan;
    if (userData.trialEndsAt !== undefined) mapped.trial_ends_at = userData.trialEndsAt;
    if (userData.createdAt !== undefined) mapped.created_at = userData.createdAt;
    if (userData.updatedAt !== undefined) mapped.updated_at = userData.updatedAt;
    if (userData.welcomeEmailSent !== undefined) mapped.welcome_email_sent = userData.welcomeEmailSent;
    
    // Handle already snake_case fields (in case they're passed that way)
    if (userData.first_name !== undefined) mapped.first_name = userData.first_name;
    if (userData.last_name !== undefined) mapped.last_name = userData.last_name;
    if (userData.profile_image_url !== undefined) mapped.profile_image_url = userData.profile_image_url;
    if (userData.seller_id !== undefined) mapped.seller_id = userData.seller_id;
    if (userData.invited_by !== undefined) mapped.invited_by = userData.invited_by;
    if (userData.store_banner !== undefined) mapped.store_banner = userData.store_banner;
    if (userData.store_logo !== undefined) mapped.store_logo = userData.store_logo;
    if (userData.payment_provider !== undefined) mapped.payment_provider = userData.payment_provider;
    if (userData.stripe_connected_account_id !== undefined) mapped.stripe_connected_account_id = userData.stripe_connected_account_id;
    if (userData.stripe_charges_enabled !== undefined) mapped.stripe_charges_enabled = userData.stripe_charges_enabled;
    if (userData.stripe_payouts_enabled !== undefined) mapped.stripe_payouts_enabled = userData.stripe_payouts_enabled;
    if (userData.stripe_details_submitted !== undefined) mapped.stripe_details_submitted = userData.stripe_details_submitted;
    if (userData.listing_currency !== undefined) mapped.listing_currency = userData.listing_currency;
    if (userData.stripe_customer_id !== undefined) mapped.stripe_customer_id = userData.stripe_customer_id;
    if (userData.stripe_subscription_id !== undefined) mapped.stripe_subscription_id = userData.stripe_subscription_id;
    if (userData.subscription_status !== undefined) mapped.subscription_status = userData.subscription_status;
    if (userData.subscription_plan !== undefined) mapped.subscription_plan = userData.subscription_plan;
    if (userData.trial_ends_at !== undefined) mapped.trial_ends_at = userData.trial_ends_at;
    if (userData.created_at !== undefined) mapped.created_at = userData.created_at;
    if (userData.updated_at !== undefined) mapped.updated_at = userData.updated_at;
    if (userData.welcome_email_sent !== undefined) mapped.welcome_email_sent = userData.welcome_email_sent;
    
    return mapped;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    await this.ensureInitialized();
    
    // Map camelCase fields to snake_case for Prisma
    const mappedData = this.mapUserDataToPrisma(userData);
    
    // Prisma upsert requires a unique constraint to upsert on
    // First try by email (which is unique), then fallback to ID-based logic
    if (mappedData.email) {
      return await prisma.users.upsert({
        where: { email: mappedData.email },
        create: mappedData,
        update: {
          ...mappedData,
          updated_at: new Date()
        }
      });
    } else if (mappedData.id) {
      // If no email but has ID, try to update or create
      const existingUser = await prisma.users.findUnique({ where: { id: mappedData.id } });
      if (existingUser) {
        return await prisma.users.update({
          where: { id: mappedData.id },
          data: {
            ...mappedData,
            updated_at: new Date()
          }
        });
      } else {
        return await prisma.users.create({
          data: mappedData
        });
      }
    } else {
      // No email or ID, just create
      return await prisma.users.create({
        data: mappedData
      });
    }
  }

  async getAllProducts(): Promise<Product[]> {
    return await prisma.products.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await prisma.products.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    
    return await prisma.products.findMany({
      where: {
        id: { in: ids }
      }
    });
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    return await prisma.products.create({
      data: {
        ...insertProduct,
        image: insertProduct.image || ''
      }
    });
  }

  async getAllOrders(): Promise<Order[]> {
    await this.ensureInitialized();
    return await prisma.orders.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    await this.ensureInitialized();
    return await prisma.orders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getOrder(id: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await prisma.orders.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await prisma.orders.findFirst({
      where: { stripe_payment_intent_id: paymentIntentId }
    });
    return result ?? undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    await this.ensureInitialized();
    return await prisma.orders.create({
      data: insertOrder
    });
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.orders.update({
        where: { id },
        data: updates
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      const result = await prisma.products.update({
        where: { id },
        data: updates
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await prisma.products.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Product Search & Filtering (B2C)
  async searchProducts(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    const where: any = {};
    
    // Text search (name, description, SKU)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    // Category filters
    if (filters.categoryLevel1Id) {
      where.category_level_1_id = filters.categoryLevel1Id;
    }
    if (filters.categoryLevel2Id) {
      where.category_level_2_id = filters.categoryLevel2Id;
    }
    if (filters.categoryLevel3Id) {
      where.category_level_3_id = filters.categoryLevel3Id;
    }
    
    // Price range filters (convert dollars to cents)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        const minPriceCents = Math.round(filters.minPrice * 100).toString();
        where.price.gte = minPriceCents;
      }
      if (filters.maxPrice !== undefined) {
        const maxPriceCents = Math.round(filters.maxPrice * 100).toString();
        where.price.lte = maxPriceCents;
      }
    }
    
    // Seller filter
    if (filters.sellerId) {
      where.seller_id = filters.sellerId;
    }
    
    // Product type filter
    if (filters.productType) {
      where.product_type = filters.productType;
    }
    
    // Status filter (supports both single status and array of statuses)
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      where.status = { in: statuses };
    }
    
    // Sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy = { [sortBy]: sortOrder };
    
    // Pagination
    const take = filters.limit || 20;
    const skip = filters.offset || 0;
    
    // Execute query
    const products = await prisma.products.findMany({
      where,
      orderBy,
      take,
      skip
    });
    
    // Get total count
    const total = await this.countProducts(filters);
    
    return {
      products,
      total,
      limit: take,
      offset: skip,
    };
  }

  async countProducts(filters: ProductSearchFilters): Promise<number> {
    const where: any = {};
    
    // Text search (name, description, SKU)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    // Category filters
    if (filters.categoryLevel1Id) {
      where.category_level_1_id = filters.categoryLevel1Id;
    }
    if (filters.categoryLevel2Id) {
      where.category_level_2_id = filters.categoryLevel2Id;
    }
    if (filters.categoryLevel3Id) {
      where.category_level_3_id = filters.categoryLevel3Id;
    }
    
    // Price range filters (convert dollars to cents)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        const minPriceCents = Math.round(filters.minPrice * 100).toString();
        where.price.gte = minPriceCents;
      }
      if (filters.maxPrice !== undefined) {
        const maxPriceCents = Math.round(filters.maxPrice * 100).toString();
        where.price.lte = maxPriceCents;
      }
    }
    
    // Seller filter
    if (filters.sellerId) {
      where.seller_id = filters.sellerId;
    }
    
    // Product type filter
    if (filters.productType) {
      where.product_type = filters.productType;
    }
    
    // Status filter (supports both single status and array of statuses)
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      where.status = { in: statuses };
    }
    
    return await prisma.products.count({ where });
  }

  // Inventory Management - Stock Reservations
  async getStockReservation(id: string): Promise<StockReservation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.stock_reservations.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getStockReservationsBySession(sessionId: string): Promise<StockReservation[]> {
    await this.ensureInitialized();
    return await prisma.stock_reservations.findMany({
      where: { session_id: sessionId }
    });
  }

  async getStockReservationsByProduct(productId: string): Promise<StockReservation[]> {
    await this.ensureInitialized();
    return await prisma.stock_reservations.findMany({
      where: { product_id: productId }
    });
  }

  async getExpiredStockReservations(now: Date): Promise<StockReservation[]> {
    await this.ensureInitialized();
    return await prisma.stock_reservations.findMany({
      where: {
        status: 'active',
        expires_at: { lt: now }
      }
    });
  }

  async getReservedStock(productId: string, variantId?: string): Promise<number> {
    await this.ensureInitialized();
    const where: any = {
      product_id: productId,
      status: 'active'
    };
    
    if (variantId) {
      where.variant_id = variantId;
    }

    const reservations = await prisma.stock_reservations.findMany({ where });
    
    return reservations.reduce((total, reservation) => total + reservation.quantity, 0);
  }

  async createStockReservation(reservation: InsertStockReservation): Promise<StockReservation> {
    await this.ensureInitialized();
    return await prisma.stock_reservations.create({
      data: reservation
    });
  }

  async updateStockReservation(id: string, data: Partial<StockReservation>): Promise<StockReservation | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.stock_reservations.update({
        where: { id },
        data
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async commitReservationsBySession(sessionId: string, orderId: string): Promise<{
    success: boolean;
    committed: number;
    error?: string;
  }> {
    await this.ensureInitialized();
    try {
      const reservations = await this.getStockReservationsBySession(sessionId);
      const activeReservations = reservations.filter(r => r.status === 'active');
      
      if (activeReservations.length === 0) {
        return { success: true, committed: 0 };
      }

      // ATOMIC: Wrap ALL commits in a SINGLE transaction to prevent partial commits
      // Either ALL reservations commit and stock decrements, or NONE do
      await prisma.$transaction(async (tx) => {
        for (const reservation of activeReservations) {
          // 1. Update reservation status
          await tx.stock_reservations.update({
            where: { id: reservation.id },
            data: {
              status: 'committed',
              committed_at: new Date(),
              order_id: orderId,
            }
          });

          // 2. Decrement stock (in same transaction)
          const product = await tx.products.findUnique({
            where: { id: reservation.product_id }
          });

          if (!product) {
            throw new Error(`Product ${reservation.product_id} not found during commit`);
          }

          const variantId = reservation.variant_id;
          if (variantId && product.variants) {
            // FIXED: Handle nested variant structure properly
            // Structure: [{colorName, colorHex, sizes: [{size, stock, sku}]}] for color-size
            //       OR: [{size, stock, sku}] for size-only
            const variants = Array.isArray(product.variants) ? product.variants : [];
            let stockUpdated = false;
            
            const updatedVariants = variants.map((colorOrSizeVariant: any) => {
              // Handle nested color→sizes structure (check for sizes array directly)
              if (colorOrSizeVariant.sizes && Array.isArray(colorOrSizeVariant.sizes)) {
                const updatedSizes = colorOrSizeVariant.sizes.map((sizeVariant: any) => {
                  // Match variantId in multiple formats:
                  // 1. Full format: "size-color" (e.g., "s-orange")
                  // 2. Size-only format: "s" (fallback for legacy/simple reservations)
                  const fullVariantId = `${sizeVariant.size}-${colorOrSizeVariant.colorName}`.toLowerCase();
                  const sizeOnlyId = sizeVariant.size?.toLowerCase();
                  const normalizedVariantId = variantId.toLowerCase();
                  
                  if (fullVariantId === normalizedVariantId || sizeOnlyId === normalizedVariantId) {
                    stockUpdated = true;
                    return {
                      ...sizeVariant,
                      stock: Math.max(0, (sizeVariant.stock || 0) - reservation.quantity),
                    };
                  }
                  return sizeVariant;
                });
                
                return {
                  ...colorOrSizeVariant,
                  sizes: updatedSizes,
                };
              }
              // Handle simple size-only structure
              else {
                const currentVariantId = colorOrSizeVariant.size?.toLowerCase() || '';
                
                if (currentVariantId === variantId.toLowerCase()) {
                  stockUpdated = true;
                  return {
                    ...colorOrSizeVariant,
                    stock: Math.max(0, (colorOrSizeVariant.stock || 0) - reservation.quantity),
                  };
                }
                return colorOrSizeVariant;
              }
            });

            // Calculate new product.stock as sum of all variant stocks (Architecture 3)
            let totalVariantStock = 0;
            for (const variant of updatedVariants) {
              if (variant.sizes && Array.isArray(variant.sizes)) {
                // Color-size structure: sum all sizes
                for (const size of variant.sizes) {
                  totalVariantStock += size.stock || 0;
                }
              } else {
                // Size-only structure: direct stock
                totalVariantStock += variant.stock || 0;
              }
            }

            await tx.products.update({
              where: { id: reservation.product_id },
              data: { 
                variants: updatedVariants,
                stock: totalVariantStock  // Auto-sync: product.stock = sum of variant stocks
              }
            });
            
            logger.info('[Storage] Variant stock decremented in transaction', {
              orderId,
              productId: reservation.product_id,
              variantId,
              quantity: reservation.quantity,
              stockUpdated,
              newTotalStock: totalVariantStock,
            });
          } else {
            // No variants - just update master stock
            const newStock = Math.max(0, (product.stock || 0) - reservation.quantity);
            await tx.products.update({
              where: { id: reservation.product_id },
              data: { stock: newStock }
            });
            
            logger.info('[Storage] Product stock decremented in transaction', {
              orderId,
              productId: reservation.product_id,
              quantity: reservation.quantity,
              newStock,
            });
          }
        }
      });

      return {
        success: true,
        committed: activeReservations.length,
      };
    } catch (error: any) {
      return {
        success: false,
        committed: 0,
        error: error.message || 'Failed to commit reservations',
      };
    }
  }

  async atomicReserveStock(
    productId: string,
    quantity: number,
    sessionId: string,
    options?: {
      variantId?: string;
      userId?: string;
      expirationMinutes?: number;
    }
  ): Promise<{
    success: boolean;
    reservation?: StockReservation;
    error?: string;
    availability?: {
      available: boolean;
      currentStock: number;
      reservedStock: number;
      availableStock: number;
      productId: string;
      variantId?: string;
    };
  }> {
    await this.ensureInitialized();
    
    // Use database transaction to prevent race conditions
    // This ensures check-and-insert is atomic
    return await this.db.transaction(async (tx) => {
      // Step 1: Lock the product row with SELECT ... FOR UPDATE
      const product = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .for('update')
        .limit(1);
      
      if (!product || product.length === 0) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      const prod = product[0];
      
      // Step 2: Calculate current stock
      let currentStock = 0;
      const variantId = options?.variantId;
      
      if (variantId && prod.variants) {
        const variants = Array.isArray(prod.variants) ? prod.variants : [];
        const hasColors = prod.hasColors === 1;
        
        if (hasColors) {
          // ColorVariant structure: parse "size-color" format (e.g., "l-black")
          const [size, color] = variantId.split('-');
          
          if (size && color) {
            const colorVariant = variants.find((cv: any) => 
              cv.colorName?.toLowerCase() === color.toLowerCase()
            );
            
            if (colorVariant?.sizes) {
              const sizeVariant = colorVariant.sizes.find((s: any) => 
                s.size?.toLowerCase() === size.toLowerCase()
              );
              currentStock = sizeVariant?.stock || 0;
            }
          }
        } else {
          // SizeVariant structure: direct size lookup
          const sizeVariant = variants.find((v: any) => 
            v.size?.toLowerCase() === variantId.toLowerCase()
          );
          currentStock = sizeVariant?.stock || 0;
        }
      } else {
        currentStock = prod.stock || 0;
      }

      // Step 3: Get reserved stock (with lock on reservations)
      const conditions = [
        eq(stockReservations.productId, productId),
        eq(stockReservations.status, 'active')
      ];
      
      if (variantId) {
        conditions.push(eq(stockReservations.variantId, variantId));
      }

      const activeReservations = await tx
        .select()
        .from(stockReservations)
        .where(and(...conditions))
        .for('update');
      
      const reservedStock = activeReservations.reduce((total, res) => total + res.quantity, 0);
      const availableStock = Math.max(0, currentStock - reservedStock);

      const availability = {
        available: availableStock >= quantity,
        currentStock,
        reservedStock,
        availableStock,
        productId,
        variantId,
      };

      // Step 4: Check if enough stock is available
      if (availableStock < quantity) {
        return {
          success: false,
          error: `Insufficient stock. Only ${availableStock} available.`,
          availability,
        };
      }

      // Step 5: Create reservation (atomically within transaction)
      const expirationMinutes = options?.expirationMinutes || 15;
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      const reservationData: InsertStockReservation = {
        productId,
        variantId: variantId || null,
        quantity,
        sessionId,
        userId: options?.userId || null,
        status: 'active',
        expiresAt,
        orderId: null,
        committedAt: null,
        releasedAt: null,
      };

      const result = await tx.insert(stockReservations).values(reservationData).returning();
      
      return {
        success: true,
        reservation: result[0],
        availability,
      };
    });
  }

  async updateReservationQuantityAtomic(
    reservationId: string,
    newQuantity: number
  ): Promise<{
    success: boolean;
    reservation?: StockReservation;
    error?: string;
    availability?: {
      available: boolean;
      currentStock: number;
      reservedStock: number;
      availableStock: number;
      productId: string;
      variantId?: string;
    };
  }> {
    await this.ensureInitialized();
    
    // CRITICAL: Database transaction with row-level locking to prevent race conditions
    // Locks product row to get FRESH stock data (not stale)
    return await this.db.transaction(async (tx) => {
      // Step 1: Lock the reservation row with SELECT ... FOR UPDATE
      const currentReservation = await tx
        .select()
        .from(stockReservations)
        .where(eq(stockReservations.id, reservationId))
        .for('update')
        .limit(1);
      
      if (!currentReservation || currentReservation.length === 0) {
        return {
          success: false,
          error: 'Reservation not found',
        };
      }

      const reservation = currentReservation[0];

      if (reservation.status !== 'active') {
        return {
          success: false,
          error: `Cannot update ${reservation.status} reservation`,
        };
      }

      const productId = reservation.productId;
      const variantId = reservation.variantId;

      // Step 2: Lock product row and get FRESH stock (prevents stale data)
      const product = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .for('update')
        .limit(1);
      
      if (!product || product.length === 0) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      const prod = product[0];

      // Step 3: Calculate CURRENT stock (fresh, locked data)
      let currentStock = 0;
      
      if (variantId && prod.variants) {
        const variants = Array.isArray(prod.variants) ? prod.variants : [];
        const hasColors = prod.hasColors === 1;
        
        if (hasColors) {
          // ColorVariant structure: parse "size-color" format (e.g., "l-black")
          const [size, color] = variantId.split('-');
          
          if (size && color) {
            const colorVariant = variants.find((cv: any) => 
              cv.colorName?.toLowerCase() === color.toLowerCase()
            );
            
            if (colorVariant?.sizes) {
              const sizeVariant = colorVariant.sizes.find((s: any) => 
                s.size?.toLowerCase() === size.toLowerCase()
              );
              currentStock = sizeVariant?.stock || 0;
            }
          }
        } else {
          // SizeVariant structure: direct size lookup
          const sizeVariant = variants.find((v: any) => 
            v.size?.toLowerCase() === variantId.toLowerCase()
          );
          currentStock = sizeVariant?.stock || 0;
        }
      } else {
        currentStock = prod.stock || 0;
      }

      // Step 4: Lock all active reservations for this product/variant
      const conditions = [
        eq(stockReservations.productId, productId),
        eq(stockReservations.status, 'active')
      ];
      
      if (variantId) {
        conditions.push(eq(stockReservations.variantId, variantId));
      }

      const activeReservations = await tx
        .select()
        .from(stockReservations)
        .where(and(...conditions))
        .for('update');
      
      // Step 5: Calculate reserved stock EXCLUDING current reservation
      const allReservedStock = activeReservations.reduce((total, res) => total + res.quantity, 0);
      const otherReservedStock = allReservedStock - reservation.quantity;
      const availableStock = Math.max(0, currentStock - otherReservedStock);

      const availability = {
        available: availableStock >= newQuantity,
        currentStock,
        reservedStock: otherReservedStock,
        availableStock,
        productId,
        variantId: variantId || undefined,
      };

      // Step 6: Check if enough stock is available for new quantity
      if (availableStock < newQuantity) {
        return {
          success: false,
          error: `Insufficient stock. Only ${availableStock} available (excluding your current reservation).`,
          availability,
        };
      }

      // Step 7: Atomically update reservation quantity within transaction
      const result = await tx
        .update(stockReservations)
        .set({ quantity: newQuantity })
        .where(eq(stockReservations.id, reservationId))
        .returning();
      
      return {
        success: true,
        reservation: result[0],
        availability,
      };
    });
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.orders.update({
        where: { id },
        data: { status }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateOrderTracking(id: string, trackingNumber: string, trackingLink: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.orders.update({
        where: { id },
        data: {
          trackingNumber,
          trackingLink
        }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateOrderBalancePaymentIntent(id: string, paymentIntentId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.orders.update({
        where: { id },
        data: { stripeBalancePaymentIntentId: paymentIntentId }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateOrderFulfillmentStatus(orderId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    
    // Get all items for this order
    const items = await prisma.order_items.findMany({
      where: { orderId }
    });
    
    if (items.length === 0) {
      return undefined;
    }
    
    // Count shipped items
    const shippedItems = items.filter(item => 
      item.item_status === 'shipped' || item.item_status === 'delivered'
    );
    
    // Determine fulfillment status
    let fulfillmentStatus: string;
    if (shippedItems.length === 0) {
      fulfillmentStatus = 'unfulfilled';
    } else if (shippedItems.length === items.length) {
      fulfillmentStatus = 'fulfilled';
    } else {
      fulfillmentStatus = 'partially_fulfilled';
    }
    
    try {
      const result = await prisma.orders.update({
        where: { id: orderId },
        data: { fulfillment_status: fulfillmentStatus }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  // Order Items methods
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    await this.ensureInitialized();
    return await prisma.order_items.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'asc' }
    });
  }

  async getOrderItemById(itemId: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const result = await prisma.order_items.findUnique({
      where: { id: itemId }
    });
    return result ?? undefined;
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    await this.ensureInitialized();
    return await prisma.order_items.create({
      data: item
    });
  }

  async createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]> {
    await this.ensureInitialized();
    if (items.length === 0) return [];
    
    const created = await Promise.all(
      items.map(item => prisma.order_items.create({ data: item }))
    );
    return created;
  }

  async updateOrderItemStatus(itemId: string, status: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const updateData: any = { 
      item_status: status,
      updated_at: new Date()
    };
    
    // Set timestamps based on status
    if (status === 'shipped') {
      updateData.shipped_at = new Date();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date();
    }
    
    try {
      const result = await prisma.order_items.update({
        where: { id: itemId },
        data: updateData
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateOrderItemTracking(itemId: string, trackingNumber: string, trackingCarrier?: string, trackingUrl?: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.order_items.update({
        where: { id: itemId },
        data: {
          tracking_number: trackingNumber,
          tracking_carrier: trackingCarrier || null,
          tracking_url: trackingUrl || null,
          tracking_link: trackingUrl || null,
          item_status: 'shipped',
          shipped_at: new Date(),
          updated_at: new Date()
        }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateOrderItemRefund(itemId: string, refundedQuantity: number, refundedAmount: string, status: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const updateData: any = {
      refunded_quantity: refundedQuantity,
      refunded_amount: refundedAmount,
      item_status: status,
      updated_at: new Date()
    };
    
    // Set timestamps based on status
    if (status === 'returned') {
      updateData.returned_at = new Date();
    } else if (status === 'refunded') {
      updateData.refunded_at = new Date();
    }
    
    try {
      const result = await prisma.order_items.update({
        where: { id: itemId },
        data: updateData
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateOrderItemDeliveryDate(itemId: string, preOrderDate: Date | null, madeToOrderLeadTime: number | null): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const updateData: any = {
      updated_at: new Date(),
      // CRITICAL: Reset reminder flag when delivery date changes so a new reminder will be sent
      delivery_reminder_sent_at: null
    };

    if (preOrderDate !== null) {
      updateData.pre_order_date = preOrderDate;
    }
    
    if (madeToOrderLeadTime !== null) {
      updateData.made_to_order_lead_time = madeToOrderLeadTime;
    }

    try {
      const result = await prisma.order_items.update({
        where: { id: itemId },
        data: updateData
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateOrderCustomerDetails(orderId: string, details: { customerName: string; shippingStreet: string; shippingCity: string; shippingState: string; shippingPostalCode: string; shippingCountry: string; billingStreet: string; billingCity: string; billingState: string; billingPostalCode: string; billingCountry: string }): Promise<Order | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.orders.update({
        where: { id: orderId },
        data: {
          customer_name: details.customerName,
          shipping_street: details.shippingStreet,
          shipping_city: details.shippingCity,
          shipping_state: details.shippingState,
          shipping_postal_code: details.shippingPostalCode,
          shipping_country: details.shippingCountry,
          billing_street: details.billingStreet,
          billing_city: details.billingCity,
          billing_state: details.billingState,
          billing_postal_code: details.billingPostalCode,
          billing_country: details.billingCountry
        }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.orders.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteOrderItems(orderId: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.order_items.deleteMany({
        where: { orderId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Refund methods
  async createRefund(refund: InsertRefund): Promise<Refund> {
    await this.ensureInitialized();
    return await prisma.refunds.create({
      data: refund
    });
  }

  async getRefund(id: string): Promise<Refund | undefined> {
    await this.ensureInitialized();
    const result = await prisma.refunds.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getRefundsByOrderId(orderId: string): Promise<Refund[]> {
    await this.ensureInitialized();
    return await prisma.refunds.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateRefundStatus(id: string, status: string, stripeRefundId?: string): Promise<Refund | undefined> {
    await this.ensureInitialized();
    const updateData: any = { status };
    if (stripeRefundId) {
      updateData.stripe_refund_id = stripeRefundId;
    }
    try {
      const result = await prisma.refunds.update({
        where: { id },
        data: updateData
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.orders.update({
        where: { id: orderId },
        data: { payment_status: paymentStatus }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  // Refund Line Items methods
  async createRefundLineItem(lineItem: InsertRefundLineItem): Promise<RefundLineItem> {
    await this.ensureInitialized();
    return await prisma.refund_line_items.create({
      data: lineItem
    });
  }

  async createRefundLineItems(lineItems: InsertRefundLineItem[]): Promise<RefundLineItem[]> {
    await this.ensureInitialized();
    const created = await Promise.all(
      lineItems.map(item => prisma.refund_line_items.create({ data: item }))
    );
    return created;
  }

  async getRefundLineItems(refundId: string): Promise<RefundLineItem[]> {
    await this.ensureInitialized();
    return await prisma.refund_line_items.findMany({
      where: { refund_id: refundId },
      orderBy: { created_at: 'desc' }
    });
  }

  // Refund Calculations & Validation methods
  async getRefundableAmountForOrder(orderId: string): Promise<{ 
    totalRefundable: string; 
    refundedSoFar: string; 
    items: Array<{
      itemId: string;
      productName: string;
      quantity: number;
      refundedQuantity: number;
      price: string;
      refundableQuantity: number;
      refundableAmount: string;
    }>;
    shipping: { total: string; refunded: string; refundable: string; };
    tax: { total: string; refunded: string; refundable: string; };
  }> {
    await this.ensureInitialized();
    
    // Get order details
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    // Get all order items
    const items = await this.getOrderItems(orderId);
    
    // Get all refunds for this order to calculate what's been refunded
    const allRefunds = await this.getRefundsByOrderId(orderId);
    const successfulRefunds = allRefunds.filter(r => r.status === 'succeeded');
    
    // Get all refund line items for successful refunds
    const refundLineItemsPromises = successfulRefunds.map(r => this.getRefundLineItems(r.id));
    const allRefundLineItems = (await Promise.all(refundLineItemsPromises)).flat();
    
    // Calculate refunded amounts per item
    const itemRefundMap = new Map<string, { quantity: number; amount: number }>();
    let shippingRefunded = 0;
    let taxRefunded = 0;
    
    for (const lineItem of allRefundLineItems) {
      if (lineItem.type === 'product' && lineItem.orderItemId) {
        const existing = itemRefundMap.get(lineItem.orderItemId) || { quantity: 0, amount: 0 };
        itemRefundMap.set(lineItem.orderItemId, {
          quantity: existing.quantity + (lineItem.quantity || 0),
          amount: existing.amount + parseFloat(lineItem.amount)
        });
      } else if (lineItem.type === 'shipping') {
        shippingRefunded += parseFloat(lineItem.amount);
      } else if (lineItem.type === 'tax') {
        taxRefunded += parseFloat(lineItem.amount);
      }
    }
    
    // Calculate how much was actually paid and can be refunded
    const amountPaid = parseFloat(order.amount_paid || order.total || "0");
    const totalRefunded = successfulRefunds.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
    const totalRefundablePool = Math.max(0, amountPaid - totalRefunded);
    
    // Calculate total catalog value of all refundable items, shipping, and tax
    const catalogItemsTotal = items.reduce((sum, item) => {
      const refunded = itemRefundMap.get(item.id) || { quantity: 0, amount: 0 };
      const refundableQuantity = item.quantity - refunded.quantity;
      const pricePerUnit = parseFloat(item.price);
      return sum + (refundableQuantity * pricePerUnit);
    }, 0);
    
    const catalogShippingTotal = parseFloat(order.shipping_cost || "0");
    const catalogTaxTotal = parseFloat(order.tax_amount || "0");
    const catalogGrandTotal = catalogItemsTotal + catalogShippingTotal + catalogTaxTotal;
    
    // Calculate proportional refundable amounts
    // For each component (items, shipping, tax), distribute the refundable pool proportionally
    const itemsProportion = catalogGrandTotal > 0 ? catalogItemsTotal / catalogGrandTotal : 0;
    const shippingProportion = catalogGrandTotal > 0 ? catalogShippingTotal / catalogGrandTotal : 0;
    const taxProportion = catalogGrandTotal > 0 ? catalogTaxTotal / catalogGrandTotal : 0;
    
    const itemsRefundablePool = totalRefundablePool * itemsProportion;
    const shippingRefundablePool = totalRefundablePool * shippingProportion;
    const taxRefundablePool = totalRefundablePool * taxProportion;
    
    // Build item refund details with proportional amounts
    const itemDetails = items.map(item => {
      const refunded = itemRefundMap.get(item.id) || { quantity: 0, amount: 0 };
      const refundableQuantity = item.quantity - refunded.quantity;
      const pricePerUnit = parseFloat(item.price);
      const catalogValue = refundableQuantity * pricePerUnit;
      
      // Calculate this item's share of the refundable pool
      const itemProportion = catalogItemsTotal > 0 ? catalogValue / catalogItemsTotal : 0;
      const refundableAmount = itemsRefundablePool * itemProportion;
      
      return {
        itemId: item.id,
        productName: item.productName,
        quantity: item.quantity,
        refundedQuantity: refunded.quantity,
        price: item.price,
        refundableQuantity,
        refundableAmount: refundableAmount.toFixed(2)
      };
    });
    
    // Calculate shipping refundable (from proportional pool, minus already refunded)
    const shippingTotal = parseFloat(order.shipping_cost || "0");
    const shippingRefundable = Math.max(0, Math.min(shippingRefundablePool, shippingTotal - shippingRefunded));
    
    // Calculate tax refundable (from proportional pool, minus already refunded)
    const taxTotal = parseFloat(order.tax_amount || "0");
    const taxRefundable = Math.max(0, Math.min(taxRefundablePool, taxTotal - taxRefunded));
    
    // Total refundable is simply the pool (amountPaid - totalRefunded)
    const totalRefundable = totalRefundablePool;
    
    return {
      totalRefundable: totalRefundable.toFixed(2),
      refundedSoFar: totalRefunded.toFixed(2),
      items: itemDetails,
      shipping: {
        total: shippingTotal.toFixed(2),
        refunded: shippingRefunded.toFixed(2),
        refundable: shippingRefundable.toFixed(2)
      },
      tax: {
        total: taxTotal.toFixed(2),
        refunded: taxRefunded.toFixed(2),
        refundable: taxRefundable.toFixed(2)
      }
    };
  }

  async getRefundHistoryWithLineItems(orderId: string): Promise<Array<Refund & { lineItems: RefundLineItem[] }>> {
    await this.ensureInitialized();
    
    const refundsList = await this.getRefundsByOrderId(orderId);
    const refundsWithLineItems = await Promise.all(
      refundsList.map(async (refund) => {
        const lineItems = await this.getRefundLineItems(refund.id);
        return { ...refund, lineItems };
      })
    );
    
    return refundsWithLineItems;
  }

  // Order Events methods - track email and status history
  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    await this.ensureInitialized();
    return await prisma.order_events.findMany({
      where: { order_id: orderId },
      orderBy: { occurred_at: 'desc' }
    });
  }

  async createOrderEvent(event: InsertOrderEvent): Promise<OrderEvent> {
    await this.ensureInitialized();
    return await prisma.order_events.create({
      data: event
    });
  }

  // Order Balance Payments methods - track deposit/balance lifecycle
  async getBalancePaymentsByOrderId(orderId: string): Promise<OrderBalancePayment[]> {
    await this.ensureInitialized();
    return await prisma.order_balance_payments.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getBalancePayment(id: string): Promise<OrderBalancePayment | undefined> {
    await this.ensureInitialized();
    const result = await prisma.order_balance_payments.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createBalancePayment(payment: InsertOrderBalancePayment): Promise<OrderBalancePayment> {
    await this.ensureInitialized();
    return await prisma.order_balance_payments.create({
      data: payment
    });
  }

  async updateBalancePayment(id: string, data: Partial<OrderBalancePayment>): Promise<OrderBalancePayment | undefined> {
    await this.ensureInitialized();
    // Filter out undefined properties to prevent NULL clobbering
    const updateData: Record<string, any> = { updated_at: new Date() };
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });
    try {
      const result = await prisma.order_balance_payments.update({
        where: { id },
        data: updateData
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  // Balance Requests methods - Architecture 3 balance payment sessions
  async getBalanceRequest(id: string): Promise<BalanceRequest | undefined> {
    await this.ensureInitialized();
    const result = await prisma.balance_requests.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getBalanceRequestByOrderId(orderId: string): Promise<BalanceRequest | undefined> {
    await this.ensureInitialized();
    const result = await prisma.balance_requests.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
    return result ?? undefined;
  }

  async getBalanceRequestByToken(tokenHash: string): Promise<BalanceRequest | undefined> {
    await this.ensureInitialized();
    const result = await prisma.balance_requests.findFirst({
      where: { session_token_hash: tokenHash }
    });
    return result ?? undefined;
  }

  async createBalanceRequest(request: InsertBalanceRequest): Promise<BalanceRequest> {
    await this.ensureInitialized();
    return await prisma.balance_requests.create({
      data: request
    });
  }

  async updateBalanceRequest(id: string, data: Partial<BalanceRequest>): Promise<BalanceRequest | undefined> {
    await this.ensureInitialized();
    // Filter out undefined properties to prevent NULL clobbering
    const updateData: Record<string, any> = { updated_at: new Date() };
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });
    try {
      const result = await prisma.balance_requests.update({
        where: { id },
        data: updateData
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  // Order Address Changes methods - audit trail for shipping address modifications
  async getOrderAddressChanges(orderId: string): Promise<OrderAddressChange[]> {
    await this.ensureInitialized();
    return await prisma.order_address_changes.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async createOrderAddressChange(change: InsertOrderAddressChange): Promise<OrderAddressChange> {
    await this.ensureInitialized();
    return await prisma.order_address_changes.create({
      data: change
    });
  }

  // Order Workflow methods - orchestration and state management
  async createWorkflow(workflow: InsertOrderWorkflow): Promise<OrderWorkflow> {
    await this.ensureInitialized();
    return await prisma.order_workflows.create({
      data: workflow
    });
  }

  async getWorkflow(id: string): Promise<OrderWorkflow | undefined> {
    await this.ensureInitialized();
    const result = await prisma.order_workflows.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getWorkflowByCheckoutSession(checkoutSessionId: string): Promise<OrderWorkflow | undefined> {
    await this.ensureInitialized();
    const result = await prisma.order_workflows.findFirst({
      where: { checkout_session_id: checkoutSessionId }
    });
    return result ?? undefined;
  }

  async getWorkflowByPaymentIntent(paymentIntentId: string): Promise<OrderWorkflow | undefined> {
    await this.ensureInitialized();
    const result = await prisma.order_workflows.findFirst({
      where: { payment_intent_id: paymentIntentId }
    });
    return result ?? undefined;
  }

  async updateWorkflowState(id: string, state: string, data?: any): Promise<OrderWorkflow | undefined> {
    await this.ensureInitialized();
    const updateData: Record<string, any> = { 
      current_state: state,
      updated_at: new Date() 
    };
    if (data !== undefined) {
      updateData.data = data;
    }
    try {
      const result = await prisma.order_workflows.update({
        where: { id },
        data: updateData
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateWorkflowStatus(id: string, status: string, error?: string, errorCode?: string): Promise<OrderWorkflow | undefined> {
    await this.ensureInitialized();
    const updateData: Record<string, any> = { 
      status,
      updated_at: new Date() 
    };
    if (error !== undefined) {
      updateData.error = error;
    }
    if (errorCode !== undefined) {
      updateData.error_code = errorCode;
    }
    try {
      const result = await prisma.order_workflows.update({
        where: { id },
        data: updateData
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async createWorkflowEvent(event: InsertOrderWorkflowEvent): Promise<OrderWorkflowEvent> {
    await this.ensureInitialized();
    return await prisma.order_workflow_events.create({
      data: event
    });
  }

  async getWorkflowEvents(workflowId: string): Promise<OrderWorkflowEvent[]> {
    await this.ensureInitialized();
    return await prisma.order_workflow_events.findMany({
      where: { workflow_id: workflowId },
      orderBy: { occurred_at: 'desc' }
    });
  }

  async updateWorkflowOrderId(id: string, orderId: string): Promise<OrderWorkflow | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.order_workflows.update({
        where: { id },
        data: { order_id: orderId, updated_at: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateWorkflowPaymentIntentId(id: string, paymentIntentId: string): Promise<OrderWorkflow | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.order_workflows.update({
        where: { id },
        data: { payment_intent_id: paymentIntentId, updated_at: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateWorkflowRetry(id: string, retryCount: number): Promise<OrderWorkflow | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.order_workflows.update({
        where: { id },
        data: { retryCount, lastRetryAt: new Date(), updatedAt: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.findUnique({ where: { email } });
    return result ?? undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.findUnique({ where: { username } });
    return result ?? undefined;
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.update({
      where: { id: userId },
      data: { role, updatedAt: new Date() }
    });
    return result ?? undefined;
  }

  async updateWelcomeEmailSent(userId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.update({
      where: { id: userId },
      data: { welcomeEmailSent: 1, updatedAt: new Date() }
    });
    return result ?? undefined;
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return await prisma.users.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.findFirst({ where: { stripe_customer_id: stripeCustomerId } });
    return result ?? undefined;
  }

  async getTeamMembersBySellerId(sellerId: string): Promise<User[]> {
    await this.ensureInitialized();
    return await prisma.users.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async deleteTeamMember(userId: string, sellerId: string): Promise<boolean> {
    await this.ensureInitialized();
    // Only delete if the user belongs to this seller
    try {
      await prisma.users.delete({
        where: {
          id: userId,
          sellerId: sellerId
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUserStoreRole(userId: string, storeOwnerId: string): Promise<UserStoreRole | undefined> {
    await this.ensureInitialized();
    const result = await prisma.user_store_roles.findFirst({
      where: {
        userId,
        storeOwnerId
      }
    });
    return result ?? undefined;
  }

  async setUserStoreRole(userId: string, storeOwnerId: string, role: "buyer" | "seller" | "owner"): Promise<UserStoreRole> {
    await this.ensureInitialized();
    // Upsert: update if exists, insert if not
    const existing = await this.getUserStoreRole(userId, storeOwnerId);
    if (existing) {
      return await prisma.user_store_roles.update({
        where: { id: existing.id },
        data: { role }
      });
    } else {
      return await prisma.user_store_roles.create({
        data: { userId, storeOwnerId, role }
      });
    }
  }

  async getUserStoreRoles(userId: string): Promise<UserStoreRole[]> {
    await this.ensureInitialized();
    return await prisma.user_store_roles.findMany({
      where: { userId }
    });
  }

  // New Auth System - User Store Memberships
  async getUserStoreMembership(userId: string, storeOwnerId: string): Promise<UserStoreMembership | undefined> {
    await this.ensureInitialized();
    const result = await prisma.user_store_memberships.findFirst({
      where: {
        userId,
        storeOwnerId
      }
    });
    return result ?? undefined;
  }

  async getUserStoreMembershipsByStore(storeOwnerId: string): Promise<UserStoreMembership[]> {
    await this.ensureInitialized();
    return await prisma.user_store_memberships.findMany({
      where: { storeOwnerId }
    });
  }

  async getUserStoreMembershipsByUser(userId: string): Promise<UserStoreMembership[]> {
    await this.ensureInitialized();
    return await prisma.user_store_memberships.findMany({
      where: { userId }
    });
  }

  async createUserStoreMembership(membership: InsertUserStoreMembership): Promise<UserStoreMembership> {
    await this.ensureInitialized();
    return await prisma.user_store_memberships.create({
      data: membership
    });
  }

  async updateUserStoreMembership(id: string, updates: Partial<UserStoreMembership>): Promise<UserStoreMembership | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.user_store_memberships.update({
        where: { id },
        data: updates
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteUserStoreMembership(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.user_store_memberships.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUserStoreMembershipById(id: string): Promise<UserStoreMembership | undefined> {
    await this.ensureInitialized();
    const membership = await prisma.user_store_memberships.findUnique({
      where: { id }
    });
    return membership ?? undefined;
  }

  async getStoreCollaborators(storeOwnerId: string): Promise<UserStoreMembership[]> {
    await this.ensureInitialized();
    const memberships = await prisma.user_store_memberships.findMany({
      where: {
        storeOwnerId,
        status: 'active'
      },
      include: {
        users: true
      }
    });
    
    return memberships.map(m => ({
      ...m,
      user: m.users!
    })) as any;
  }

  // New Auth System - Wholesale Access Grants
  async getWholesaleAccessGrant(buyerId: string, sellerId: string): Promise<WholesaleAccessGrant | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_access_grants.findFirst({
      where: {
        buyerId,
        sellerId
      }
    });
    return result ?? undefined;
  }

  async getWholesaleAccessGrantsBySeller(sellerId: string): Promise<WholesaleAccessGrant[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_access_grants.findMany({
      where: { sellerId }
    });
  }

  async getWholesaleAccessGrantsByBuyer(buyerId: string): Promise<WholesaleAccessGrant[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_access_grants.findMany({
      where: { buyerId }
    });
  }

  async createWholesaleAccessGrant(grant: InsertWholesaleAccessGrant): Promise<WholesaleAccessGrant> {
    await this.ensureInitialized();
    return await prisma.wholesale_access_grants.create({
      data: grant
    });
  }

  async updateWholesaleAccessGrant(id: string, status: string): Promise<WholesaleAccessGrant | undefined> {
    await this.ensureInitialized();
    const updates: any = { status };
    if (status === 'revoked') {
      updates.revokedAt = new Date();
    }
    try {
      const result = await prisma.wholesale_access_grants.update({
        where: { id },
        data: updates
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  // New Auth System - Team Invitations
  async getTeamInvitation(id: string): Promise<TeamInvitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.team_invitations.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.team_invitations.findFirst({
      where: { token }
    });
    return result ?? undefined;
  }

  async getTeamInvitationsByStore(storeOwnerId: string): Promise<TeamInvitation[]> {
    await this.ensureInitialized();
    return await prisma.team_invitations.findMany({
      where: { store_owner_id: storeOwnerId }
    });
  }

  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    await this.ensureInitialized();
    return await prisma.team_invitations.create({
      data: invitation
    });
  }

  async updateTeamInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<TeamInvitation | undefined> {
    await this.ensureInitialized();
    const updates: any = { status };
    if (acceptedAt) updates.acceptedAt = acceptedAt;
    const result = await prisma.team_invitations.update({
      where: { id },
      data: updates
    });
    return result ?? undefined;
  }

  // New Auth System - Store Invitations (new simplified system)
  async getStoreInvitationById(id: string): Promise<StoreInvitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.store_invitations.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getStoreInvitationByToken(token: string): Promise<StoreInvitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.store_invitations.findFirst({
      where: { token }
    });
    return result ?? undefined;
  }

  async getPendingStoreInvitations(storeOwnerId: string): Promise<StoreInvitation[]> {
    await this.ensureInitialized();
    return await prisma.store_invitations.findMany({
      where: {
        store_owner_id: storeOwnerId,
        status: 'pending'
      }
    });
  }

  async createStoreInvitation(invitation: InsertStoreInvitation): Promise<StoreInvitation> {
    await this.ensureInitialized();
    return await prisma.store_invitations.create({
      data: invitation
    });
  }

  async updateStoreInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<StoreInvitation | undefined> {
    await this.ensureInitialized();
    const updates: any = { status };
    if (acceptedAt) updates.acceptedAt = acceptedAt;
    const result = await prisma.store_invitations.update({
      where: { id },
      data: updates
    });
    return result ?? undefined;
  }

  // New Auth System - Wholesale Invitations
  async getWholesaleInvitation(id: string): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_invitations.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getWholesaleInvitationByToken(token: string): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_invitations.findFirst({
      where: { token }
    });
    return result ?? undefined;
  }

  async getWholesaleInvitationsBySeller(sellerId: string): Promise<WholesaleInvitation[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_invitations.findMany({
      where: { sellerId }
    });
  }

  async createWholesaleInvitation(invitation: InsertWholesaleInvitation): Promise<WholesaleInvitation> {
    await this.ensureInitialized();
    return await prisma.wholesale_invitations.create({
      data: invitation
    });
  }

  async updateWholesaleInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const updates: any = { status };
    if (acceptedAt) updates.acceptedAt = acceptedAt;
    try {
      const result = await prisma.wholesale_invitations.update({
        where: { id },
        data: updates
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  // Legacy wholesale invitation methods (for backwards compatibility)
  async getAllWholesaleInvitations(): Promise<WholesaleInvitation[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_invitations.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  async getWholesaleInvitationsBySellerId(sellerId: string): Promise<WholesaleInvitation[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_invitations.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async acceptWholesaleInvitation(token: string, buyerUserId: string): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_invitations.update({
        where: { token },
        data: { 
          status: "accepted", 
          acceptedAt: new Date() 
        }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteWholesaleInvitation(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.wholesale_invitations.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    await this.ensureInitialized();
    return await prisma.invitations.create({
      data: insertInvitation
    });
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.invitations.findFirst({
      where: { token }
    });
    return result ?? undefined;
  }

  async updateInvitationStatus(token: string, status: string): Promise<Invitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.invitations.updateMany({
      where: { token },
      data: { status }
    });
    const updated = await prisma.invitations.findFirst({
      where: { token }
    });
    return updated ?? undefined;
  }

  async getAllInvitations(): Promise<Invitation[]> {
    await this.ensureInitialized();
    return await prisma.invitations.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  async saveMetaSettings(userId: string, settings: Partial<MetaSettings>): Promise<MetaSettings> {
    await this.ensureInitialized();
    return await prisma.meta_settings.upsert({
      where: { user_id: userId },
      update: {
        ...settings,
        connected: settings.connected ? 1 : 0,
        updated_at: new Date()
      },
      create: {
        user_id: userId,
        ...settings,
        connected: settings.connected ? 1 : 0
      }
    });
  }

  async getMetaSettings(userId: string): Promise<MetaSettings | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_settings.findUnique({
      where: { user_id: userId }
    });
    return result ?? undefined;
  }

  async deleteMetaSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.meta_settings.delete({
      where: { user_id: userId }
    });
    return true;
  }

  async saveTikTokSettings(userId: string, settings: Partial<TikTokSettings>): Promise<TikTokSettings> {
    await this.ensureInitialized();
    return await prisma.tiktok_settings.upsert({
      where: { user_id: userId },
      update: {
        ...settings,
        updated_at: new Date()
      },
      create: {
        user_id: userId,
        ...settings
      }
    });
  }

  async getTikTokSettings(userId: string): Promise<TikTokSettings | undefined> {
    await this.ensureInitialized();
    const result = await prisma.tiktok_settings.findUnique({
      where: { user_id: userId }
    });
    return result ?? undefined;
  }

  async deleteTikTokSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.tiktok_settings.delete({
      where: { user_id: userId }
    });
    return true;
  }

  async saveXSettings(userId: string, settings: Partial<XSettings>): Promise<XSettings> {
    await this.ensureInitialized();
    return await prisma.x_settings.upsert({
      where: { user_id: userId },
      update: {
        ...settings,
        updated_at: new Date()
      },
      create: {
        user_id: userId,
        ...settings
      }
    });
  }

  async getXSettings(userId: string): Promise<XSettings | undefined> {
    await this.ensureInitialized();
    const result = await prisma.x_settings.findUnique({
      where: { user_id: userId }
    });
    return result ?? undefined;
  }

  async deleteXSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.x_settings.delete({
      where: { user_id: userId }
    });
    return true;
  }

  // Subscriber Groups
  async getSubscriberGroupsByUserId(userId: string): Promise<SubscriberGroup[]> {
    await this.ensureInitialized();
    return await prisma.subscriber_groups.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getSubscriberGroup(id: string): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscriber_groups.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getSubscriberGroupByName(userId: string, name: string): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscriber_groups.findFirst({
      where: {
        user_id: userId,
        name: name
      }
    });
    return result ?? undefined;
  }

  async createSubscriberGroup(group: InsertSubscriberGroup): Promise<SubscriberGroup> {
    await this.ensureInitialized();
    return await prisma.subscriber_groups.create({
      data: group
    });
  }

  async updateSubscriberGroup(id: string, data: Partial<SubscriberGroup>): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscriber_groups.update({
      where: { id },
      data: data
    });
    return result ?? undefined;
  }

  async deleteSubscriberGroup(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.subscriber_groups.delete({
      where: { id }
    });
    return true;
  }

  // Subscribers
  async getSubscribersByUserId(userId: string): Promise<Subscriber[]> {
    await this.ensureInitialized();
    return await prisma.subscribers.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getSubscribersByGroupId(userId: string, groupId: string): Promise<Subscriber[]> {
    await this.ensureInitialized();
    const memberships = await prisma.subscriber_group_memberships.findMany({
      where: { group_id: groupId },
      include: {
        subscribers: true
      }
    });
    
    return memberships
      .map(m => m.subscribers)
      .filter(s => s.user_id === userId) as Subscriber[];
  }

  async getSubscriber(id: string): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscribers.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getSubscriberByEmail(userId: string, email: string): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscribers.findFirst({
      where: {
        user_id: userId,
        email: email
      }
    });
    return result ?? undefined;
  }

  async createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    await this.ensureInitialized();
    return await prisma.subscribers.create({
      data: subscriber
    });
  }

  async updateSubscriber(id: string, data: Partial<Subscriber>): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscribers.update({
      where: { id },
      data: data
    });
    return result ?? undefined;
  }

  async deleteSubscriber(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.subscribers.delete({
      where: { id }
    });
    return true;
  }

  async addSubscriberToGroup(subscriberId: string, groupId: string): Promise<SubscriberGroupMembership> {
    await this.ensureInitialized();
    return await prisma.subscriber_group_memberships.create({
      data: {
        subscriber_id: subscriberId,
        group_id: groupId
      }
    });
  }

  async removeSubscriberFromGroup(subscriberId: string, groupId: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.subscriber_group_memberships.deleteMany({
      where: {
        subscriber_id: subscriberId,
        group_id: groupId
      }
    });
    return true;
  }

  // Newsletters
  async getNewslettersByUserId(userId: string): Promise<Newsletter[]> {
    await this.ensureInitialized();
    return await prisma.newsletters.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getNewsletter(id: string): Promise<Newsletter | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletters.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    await this.ensureInitialized();
    return await prisma.newsletters.create({
      data: newsletter
    });
  }

  async updateNewsletter(id: string, data: Partial<Newsletter>): Promise<Newsletter | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletters.update({
      where: { id },
      data: data
    });
    return result ?? undefined;
  }

  async deleteNewsletter(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.newsletters.delete({
      where: { id }
    });
    return true;
  }

  // Newsletter Templates
  async getNewsletterTemplatesByUserId(userId: string): Promise<NewsletterTemplate[]> {
    await this.ensureInitialized();
    return await prisma.newsletter_templates.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' }
    });
  }

  async getNewsletterTemplate(id: string): Promise<NewsletterTemplate | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_templates.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createNewsletterTemplate(template: InsertNewsletterTemplate): Promise<NewsletterTemplate> {
    await this.ensureInitialized();
    return await prisma.newsletter_templates.create({
      data: template
    });
  }

  async updateNewsletterTemplate(id: string, data: Partial<NewsletterTemplate>): Promise<NewsletterTemplate | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_templates.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async deleteNewsletterTemplate(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.newsletter_templates.delete({
      where: { id }
    });
    return true;
  }

  // Newsletter Segments
  async createNewsletterSegment(segment: InsertNewsletterSegment): Promise<NewsletterSegment> {
    await this.ensureInitialized();
    return await prisma.newsletter_segments.create({
      data: segment
    });
  }

  async getNewsletterSegment(id: string): Promise<NewsletterSegment | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_segments.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getNewsletterSegmentsByUserId(userId: string): Promise<NewsletterSegment[]> {
    await this.ensureInitialized();
    return await prisma.newsletter_segments.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  // Newsletter Schedules
  async createNewsletterSchedule(schedule: InsertNewsletterSchedule): Promise<NewsletterSchedule> {
    await this.ensureInitialized();
    return await prisma.newsletter_schedule.create({
      data: schedule
    });
  }

  async getNewsletterSchedule(id: string): Promise<NewsletterSchedule | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_schedule.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getScheduledCampaigns(): Promise<NewsletterSchedule[]> {
    await this.ensureInitialized();
    return await prisma.newsletter_schedule.findMany({
      where: { status: 'scheduled' },
      orderBy: { scheduled_at: 'asc' }
    });
  }

  // Newsletter A/B Tests
  async createNewsletterABTest(test: InsertNewsletterABTest): Promise<NewsletterABTest> {
    await this.ensureInitialized();
    return await prisma.newsletter_ab_tests.create({
      data: test
    });
  }

  async getNewsletterABTest(id: string): Promise<NewsletterABTest | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_ab_tests.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  // Newsletter Analytics
  async getNewsletterAnalytics(newsletterId: string): Promise<NewsletterAnalytics | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_analytics.findUnique({
      where: { newsletter_id: newsletterId }
    });
    return result ?? undefined;
  }

  async getNewsletterAnalyticsByUserId(userId: string): Promise<NewsletterAnalytics[]> {
    await this.ensureInitialized();
    return await prisma.newsletter_analytics.findMany({
      where: { user_id: userId },
      include: {
        newsletters: true
      },
      orderBy: { created_at: 'desc' }
    }) as any;
  }

  async createNewsletterAnalytics(analytics: InsertNewsletterAnalytics): Promise<NewsletterAnalytics> {
    await this.ensureInitialized();
    const existing = await this.getNewsletterAnalytics(analytics.newsletterId);
    if (existing) {
      const result = await prisma.newsletter_analytics.update({
        where: { newsletter_id: analytics.newsletterId },
        data: {
          total_sent: (existing.total_sent || 0) + (analytics.totalSent || 0),
          last_updated: new Date()
        }
      });
      return result;
    }
    return await prisma.newsletter_analytics.create({
      data: analytics
    });
  }

  async updateNewsletterAnalytics(newsletterId: string, data: Partial<NewsletterAnalytics>): Promise<NewsletterAnalytics | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_analytics.update({
      where: { newsletter_id: newsletterId },
      data: data
    });
    return result ?? undefined;
  }

  // Newsletter Events
  async createNewsletterEvent(event: InsertNewsletterEvent): Promise<NewsletterEvent | null> {
    await this.ensureInitialized();
    try {
      return await prisma.newsletter_events.create({
        data: event
      });
    } catch (error: any) {
      if (error.code === 'P2002' || error.code === '23505' || error.message?.includes('unique constraint')) {
        console.log('[Storage] Duplicate newsletter event, skipping:', event.eventType, event.recipientEmail);
        return null;
      }
      logger.error("[Storage] Newsletter event creation error:", error);
      throw error;
    }
  }

  async getNewsletterEventsByNewsletterId(newsletterId: string): Promise<NewsletterEvent[]> {
    await this.ensureInitialized();
    return await prisma.newsletter_events.findMany({
      where: { newsletter_id: newsletterId }
    });
  }

  async getNewsletterEventByWebhookId(webhookEventId: string): Promise<NewsletterEvent | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_events.findFirst({
      where: { webhook_event_id: webhookEventId }
    });
    return result ?? undefined;
  }

  async createNftMint(nftMint: InsertNftMint): Promise<NftMint> {
    await this.ensureInitialized();
    return await prisma.nft_mints.create({
      data: nftMint
    });
  }

  async getNftMintsByUserId(userId: string): Promise<NftMint[]> {
    await this.ensureInitialized();
    return await prisma.nft_mints.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getNftMintByOrderId(orderId: string): Promise<NftMint | undefined> {
    await this.ensureInitialized();
    const result = await prisma.nft_mints.findFirst({
      where: { order_id: orderId }
    });
    return result ?? undefined;
  }

  // Wholesale Cart Methods
  async getWholesaleCart(buyerId: string): Promise<WholesaleCart | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_carts.findFirst({
      where: { buyer_id: buyerId }
    });
    return result ?? undefined;
  }

  async createWholesaleCart(buyerId: string, sellerId: string, currency?: string): Promise<WholesaleCart> {
    await this.ensureInitialized();
    const cart: InsertWholesaleCart = {
      buyerId,
      sellerId,
      items: [],
      currency: currency || 'USD',
    };
    return await prisma.wholesale_carts.create({
      data: cart
    });
  }

  async updateWholesaleCart(buyerId: string, items: any[], currency?: string): Promise<WholesaleCart | undefined> {
    await this.ensureInitialized();
    const updateData: any = { 
      items: items as any,
      updated_at: new Date()
    };
    
    if (currency) {
      updateData.currency = currency;
    }
    
    const carts = await prisma.wholesale_carts.findMany({
      where: { buyer_id: buyerId }
    });
    
    if (carts.length === 0) return undefined;
    
    const result = await prisma.wholesale_carts.update({
      where: { id: carts[0].id },
      data: updateData
    });
    return result ?? undefined;
  }

  async clearWholesaleCart(buyerId: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.wholesale_carts.deleteMany({
      where: { buyer_id: buyerId }
    });
    return true;
  }

  // Wholesale Products Methods
  async getAllWholesaleProducts(): Promise<WholesaleProduct[]> {
    return await prisma.wholesale_products.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  async getWholesaleProductsBySellerId(sellerId: string): Promise<WholesaleProduct[]> {
    return await prisma.wholesale_products.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getWholesaleProduct(id: string): Promise<WholesaleProduct | undefined> {
    const result = await prisma.wholesale_products.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createWholesaleProduct(product: InsertWholesaleProduct): Promise<WholesaleProduct> {
    return await prisma.wholesale_products.create({
      data: {
        ...product,
        image: product.image || ''
      }
    });
  }

  async updateWholesaleProduct(id: string, product: Partial<InsertWholesaleProduct>): Promise<WholesaleProduct | undefined> {
    try {
      const result = await prisma.wholesale_products.update({
        where: { id },
        data: {
          ...product,
          updated_at: new Date()
        }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteWholesaleProduct(id: string): Promise<boolean> {
    try {
      await prisma.wholesale_products.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Wholesale Product Search & Filtering (B2B)
  async searchWholesaleProducts(filters: WholesaleProductSearchFilters): Promise<WholesaleProductSearchResult> {
    const where: any = {};
    
    // Text search (name, description, SKU)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    // Category filters
    if (filters.categoryLevel1Id) {
      where.category_level_1_id = filters.categoryLevel1Id;
    }
    if (filters.categoryLevel2Id) {
      where.category_level_2_id = filters.categoryLevel2Id;
    }
    if (filters.categoryLevel3Id) {
      where.category_level_3_id = filters.categoryLevel3Id;
    }
    
    // Price range filters (convert dollars to cents for wholesalePrice)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.wholesale_price = {};
      if (filters.minPrice !== undefined) {
        const minPriceCents = Math.round(filters.minPrice * 100).toString();
        where.wholesale_price.gte = minPriceCents;
      }
      if (filters.maxPrice !== undefined) {
        const maxPriceCents = Math.round(filters.maxPrice * 100).toString();
        where.wholesale_price.lte = maxPriceCents;
      }
    }
    
    // Seller filter
    if (filters.sellerId) {
      where.seller_id = filters.sellerId;
    }
    
    // MOQ filters (Minimum Order Quantity)
    if (filters.minMoq !== undefined || filters.maxMoq !== undefined) {
      where.moq = {};
      if (filters.minMoq !== undefined) {
        where.moq.gte = filters.minMoq;
      }
      if (filters.maxMoq !== undefined) {
        where.moq.lte = filters.maxMoq;
      }
    }
    
    // Status filter (supports both single status and array of statuses)
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      where.status = { in: statuses };
    }
    
    // Sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy = { [sortBy]: sortOrder };
    
    // Pagination
    const take = filters.limit || 20;
    const skip = filters.offset || 0;
    
    // Execute query
    const products = await prisma.wholesale_products.findMany({
      where,
      orderBy,
      take,
      skip
    });
    
    // Get total count
    const total = await this.countWholesaleProducts(filters);
    
    return {
      products,
      total,
      limit: take,
      offset: skip,
    };
  }

  async countWholesaleProducts(filters: WholesaleProductSearchFilters): Promise<number> {
    const where: any = {};
    
    // Text search (name, description, SKU)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    // Category filters
    if (filters.categoryLevel1Id) {
      where.category_level_1_id = filters.categoryLevel1Id;
    }
    if (filters.categoryLevel2Id) {
      where.category_level_2_id = filters.categoryLevel2Id;
    }
    if (filters.categoryLevel3Id) {
      where.category_level_3_id = filters.categoryLevel3Id;
    }
    
    // Price range filters (convert dollars to cents for wholesalePrice)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.wholesale_price = {};
      if (filters.minPrice !== undefined) {
        const minPriceCents = Math.round(filters.minPrice * 100).toString();
        where.wholesale_price.gte = minPriceCents;
      }
      if (filters.maxPrice !== undefined) {
        const maxPriceCents = Math.round(filters.maxPrice * 100).toString();
        where.wholesale_price.lte = maxPriceCents;
      }
    }
    
    // Seller filter
    if (filters.sellerId) {
      where.seller_id = filters.sellerId;
    }
    
    // MOQ filters (Minimum Order Quantity)
    if (filters.minMoq !== undefined || filters.maxMoq !== undefined) {
      where.moq = {};
      if (filters.minMoq !== undefined) {
        where.moq.gte = filters.minMoq;
      }
      if (filters.maxMoq !== undefined) {
        where.moq.lte = filters.maxMoq;
      }
    }
    
    // Status filter (supports both single status and array of statuses)
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      where.status = { in: statuses };
    }
    
    return await prisma.wholesale_products.count({ where });
  }

  // Wholesale Orders Methods
  async createWholesaleOrder(order: InsertWholesaleOrder): Promise<WholesaleOrder> {
    await this.ensureInitialized();
    return await prisma.wholesale_orders.create({
      data: order
    });
  }

  async getWholesaleOrder(id: string): Promise<WholesaleOrder | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_orders.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getWholesaleOrderByNumber(orderNumber: string): Promise<WholesaleOrder | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_orders.findFirst({
      where: { order_number: orderNumber }
    });
    return result ?? undefined;
  }

  async getWholesaleOrdersBySellerId(sellerId: string): Promise<WholesaleOrder[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_orders.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getWholesaleOrdersByBuyerId(buyerId: string): Promise<WholesaleOrder[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_orders.findMany({
      where: { buyer_id: buyerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getOrdersWithBalanceDueSoon(dueDate: Date): Promise<WholesaleOrder[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_orders.findMany({
      where: {
        status: {
          in: ['deposit_paid', 'awaiting_balance']
        },
        balance_payment_due_date: {
          lte: dueDate
        }
      },
      orderBy: { balance_payment_due_date: 'asc' }
    });
  }

  async updateWholesaleOrder(id: string, updates: Partial<WholesaleOrder>): Promise<WholesaleOrder | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_orders.update({
        where: { id },
        data: { ...updates, updated_at: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteWholesaleOrder(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.wholesale_orders.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Wholesale Order Items Methods
  async createWholesaleOrderItem(item: InsertWholesaleOrderItem): Promise<WholesaleOrderItem> {
    await this.ensureInitialized();
    return await prisma.wholesale_order_items.create({
      data: item
    });
  }

  async getWholesaleOrderItems(wholesaleOrderId: string): Promise<WholesaleOrderItem[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_order_items.findMany({
      where: { wholesale_order_id: wholesaleOrderId }
    });
  }

  async getWholesaleOrderItem(id: string): Promise<WholesaleOrderItem | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_order_items.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async updateWholesaleOrderItem(id: string, updates: Partial<WholesaleOrderItem>): Promise<WholesaleOrderItem | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_order_items.update({
        where: { id },
        data: { ...updates, updated_at: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async updateWholesaleOrderItemRefund(itemId: string, refundedQuantity: number, refundedAmountCents: number): Promise<WholesaleOrderItem | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_order_items.update({
        where: { id: itemId },
        data: {
          refunded_quantity: refundedQuantity,
          refunded_amount_cents: refundedAmountCents,
          updated_at: new Date(),
        }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteWholesaleOrderItem(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.wholesale_order_items.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Wholesale Payments Methods
  async createWholesalePayment(payment: InsertWholesalePayment): Promise<WholesalePayment> {
    await this.ensureInitialized();
    return await prisma.wholesale_payments.create({
      data: payment
    });
  }

  async getWholesalePayment(id: string): Promise<WholesalePayment | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_payments.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getWholesalePaymentsByOrderId(wholesaleOrderId: string): Promise<WholesalePayment[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_payments.findMany({
      where: { wholesale_order_id: wholesaleOrderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateWholesalePayment(id: string, updates: Partial<WholesalePayment>): Promise<WholesalePayment | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_payments.update({
        where: { id },
        data: { ...updates, updated_at: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteWholesalePayment(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.wholesale_payments.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Wholesale Payment Intents Methods (Stripe Integration)
  async createPaymentIntent(data: InsertWholesalePaymentIntent): Promise<WholesalePaymentIntent> {
    await this.ensureInitialized();
    return await prisma.wholesale_payment_intents.create({
      data: data
    });
  }

  async getPaymentIntentsByOrderId(orderId: string): Promise<WholesalePaymentIntent[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_payment_intents.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getPaymentIntentByStripeId(stripePaymentIntentId: string): Promise<WholesalePaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_payment_intents.findFirst({
      where: { stripe_payment_intent_id: stripePaymentIntentId }
    });
    return result ?? undefined;
  }

  async updateWholesalePaymentIntentStatus(id: string, status: string): Promise<WholesalePaymentIntent | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_payment_intents.update({
        where: { id },
        data: { status: status as any, updatedAt: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  // Wholesale Shipping Metadata Methods
  async createShippingMetadata(data: InsertWholesaleShippingMetadata): Promise<WholesaleShippingMetadata> {
    await this.ensureInitialized();
    return await prisma.wholesale_shipping_metadata.create({
      data: data
    });
  }

  async getShippingMetadataByOrderId(orderId: string): Promise<WholesaleShippingMetadata | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_shipping_metadata.findFirst({
      where: { orderId }
    });
    return result ?? undefined;
  }

  async updateShippingMetadata(id: string, data: Partial<InsertWholesaleShippingMetadata>): Promise<WholesaleShippingMetadata | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_shipping_metadata.update({
        where: { id },
        data: { ...data, updatedAt: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  // Wholesale Shipping Details Methods
  async createWholesaleShippingDetails(details: InsertWholesaleShippingDetail): Promise<WholesaleShippingDetail> {
    await this.ensureInitialized();
    return await prisma.wholesale_shipping_details.create({
      data: details
    });
  }

  async getWholesaleShippingDetails(wholesaleOrderId: string): Promise<WholesaleShippingDetail | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_shipping_details.findFirst({
      where: { wholesale_order_id: wholesaleOrderId }
    });
    return result ?? undefined;
  }

  async updateWholesaleShippingDetails(wholesaleOrderId: string, updates: Partial<WholesaleShippingDetail>): Promise<WholesaleShippingDetail | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_shipping_details.updateMany({
        where: { wholesale_order_id: wholesaleOrderId },
        data: { ...updates, updated_at: new Date() }
      });
      if (result.count > 0) {
        return await this.getWholesaleShippingDetails(wholesaleOrderId);
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  async deleteWholesaleShippingDetails(wholesaleOrderId: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.wholesale_shipping_details.deleteMany({
        where: { wholesale_order_id: wholesaleOrderId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Wholesale Order Events Methods
  async createWholesaleOrderEvent(event: InsertWholesaleOrderEvent): Promise<WholesaleOrderEvent> {
    await this.ensureInitialized();
    return await prisma.wholesale_order_events.create({
      data: event
    });
  }

  async getWholesaleOrderEvents(wholesaleOrderId: string): Promise<WholesaleOrderEvent[]> {
    await this.ensureInitialized();
    return await prisma.wholesale_order_events.findMany({
      where: { wholesale_order_id: wholesaleOrderId },
      orderBy: { occurredAt: 'desc' }
    });
  }

  // Warehouse Locations Methods
  async createWarehouseLocation(location: InsertWarehouseLocation): Promise<WarehouseLocation> {
    await this.ensureInitialized();
    return await prisma.warehouse_locations.create({
      data: location
    });
  }

  async getWarehouseLocation(id: string): Promise<WarehouseLocation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.warehouse_locations.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getWarehouseLocationsBySellerId(sellerId: string): Promise<WarehouseLocation[]> {
    await this.ensureInitialized();
    return await prisma.warehouse_locations.findMany({
      where: { seller_id: sellerId },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' }
      ]
    });
  }

  async getDefaultWarehouseLocation(sellerId: string): Promise<WarehouseLocation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.warehouse_locations.findFirst({
      where: {
        seller_id: sellerId,
        is_default: 1
      }
    });
    return result ?? undefined;
  }

  async updateWarehouseLocation(id: string, updates: Partial<WarehouseLocation>): Promise<WarehouseLocation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.warehouse_locations.update({
      where: { id },
      data: {
        ...updates,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async setDefaultWarehouseLocation(sellerId: string, locationId: string): Promise<WarehouseLocation | undefined> {
    await this.ensureInitialized();
    await prisma.warehouse_locations.updateMany({
      where: { seller_id: sellerId },
      data: { is_default: 0 }
    });
    
    const result = await prisma.warehouse_locations.update({
      where: { id: locationId },
      data: {
        is_default: 1,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async deleteWarehouseLocation(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.warehouse_locations.delete({
      where: { id }
    });
    return true;
  }

  // Buyer Profiles Methods
  async createBuyerProfile(profile: InsertBuyerProfile): Promise<BuyerProfile> {
    await this.ensureInitialized();
    return await prisma.buyer_profiles.create({
      data: profile
    });
  }

  async getBuyerProfile(id: string): Promise<BuyerProfile | undefined> {
    await this.ensureInitialized();
    const result = await prisma.buyer_profiles.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getBuyerProfileByUserId(userId: string): Promise<BuyerProfile | undefined> {
    await this.ensureInitialized();
    const result = await prisma.buyer_profiles.findFirst({
      where: { user_id: userId }
    });
    return result ?? undefined;
  }

  async updateBuyerProfile(id: string, updates: Partial<BuyerProfile>): Promise<BuyerProfile | undefined> {
    await this.ensureInitialized();
    const result = await prisma.buyer_profiles.update({
      where: { id },
      data: {
        ...updates,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async deleteBuyerProfile(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.buyer_profiles.delete({
      where: { id }
    });
    return true;
  }

  // Categories Methods
  async getAllCategories(): Promise<Category[]> {
    await this.ensureInitialized();
    return await prisma.categories.findMany({
      orderBy: [
        { level: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  async getCategoriesByLevel(level: number): Promise<Category[]> {
    await this.ensureInitialized();
    return await prisma.categories.findMany({
      where: { level },
      orderBy: { name: 'asc' }
    });
  }

  async getCategoriesByParentId(parentId: string | null): Promise<Category[]> {
    await this.ensureInitialized();
    return await prisma.categories.findMany({
      where: { parent_id: parentId },
      orderBy: { name: 'asc' }
    });
  }

  async getCategory(id: string): Promise<Category | undefined> {
    await this.ensureInitialized();
    const result = await prisma.categories.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    await this.ensureInitialized();
    return await prisma.categories.create({
      data: category
    });
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    await this.ensureInitialized();
    const result = await prisma.categories.update({
      where: { id },
      data: {
        ...category,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.categories.delete({
      where: { id }
    });
    return true;
  }

  // Notification Methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    await this.ensureInitialized();
    return await prisma.notifications.create({
      data: notification
    });
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    await this.ensureInitialized();
    const result = await prisma.notifications.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    await this.ensureInitialized();
    return await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    await this.ensureInitialized();
    const result = await prisma.notifications.update({
      where: { id },
      data: { read: 1 }
    });
    return result ?? undefined;
  }

  async deleteNotification(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.notifications.delete({
      where: { id }
    });
    return true;
  }

  // Auth Token Methods
  async createAuthToken(token: InsertAuthToken): Promise<AuthToken> {
    await this.ensureInitialized();
    return await prisma.auth_tokens.create({
      data: token
    });
  }

  async getAuthTokenByToken(token: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await prisma.auth_tokens.findUnique({
      where: { token }
    });
    return result ?? undefined;
  }

  async getAuthTokenByCode(email: string, code: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await prisma.auth_tokens.findFirst({
      where: {
        email,
        code
      }
    });
    return result ?? undefined;
  }

  async markAuthTokenAsUsed(id: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.auth_tokens.update({
        where: { id },
        data: { used: 1 }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async deleteExpiredAuthTokens(): Promise<number> {
    await this.ensureInitialized();
    const result = await prisma.auth_tokens.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    return result.count;
  }

  // Shipping Matrix Methods
  async getShippingMatricesBySellerId(sellerId: string): Promise<ShippingMatrix[]> {
    await this.ensureInitialized();
    return await prisma.shipping_matrices.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getShippingMatrix(id: string): Promise<ShippingMatrix | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_matrices.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createShippingMatrix(matrix: InsertShippingMatrix): Promise<ShippingMatrix> {
    await this.ensureInitialized();
    return await prisma.shipping_matrices.create({
      data: matrix
    });
  }

  async updateShippingMatrix(id: string, matrix: Partial<InsertShippingMatrix>): Promise<ShippingMatrix | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_matrices.update({
      where: { id },
      data: {
        ...matrix,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async deleteShippingMatrix(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.shipping_zones.deleteMany({
      where: { matrix_id: id }
    });
    await prisma.shipping_matrices.delete({
      where: { id }
    });
    return true;
  }

  // Shipping Zone Methods
  async getShippingZonesByMatrixId(matrixId: string): Promise<ShippingZone[]> {
    await this.ensureInitialized();
    return await prisma.shipping_zones.findMany({
      where: { matrix_id: matrixId }
    });
  }

  async getShippingZone(id: string): Promise<ShippingZone | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_zones.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createShippingZone(zone: InsertShippingZone): Promise<ShippingZone> {
    await this.ensureInitialized();
    return await prisma.shipping_zones.create({
      data: zone
    });
  }

  async updateShippingZone(id: string, zone: Partial<InsertShippingZone>): Promise<ShippingZone | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_zones.update({
      where: { id },
      data: zone
    });
    return result ?? undefined;
  }

  async deleteShippingZone(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.shipping_zones.delete({
      where: { id }
    });
    return true;
  }

  // Warehouse Address Methods - Multi-warehouse management
  async getWarehouseAddress(id: string): Promise<WarehouseAddress | undefined> {
    await this.ensureInitialized();
    const result = await prisma.warehouse_addresses.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getWarehouseAddressesBySellerId(sellerId: string): Promise<WarehouseAddress[]> {
    await this.ensureInitialized();
    return await prisma.warehouse_addresses.findMany({
      where: { seller_id: sellerId },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' }
      ]
    });
  }

  async getDefaultWarehouseAddress(sellerId: string): Promise<WarehouseAddress | undefined> {
    await this.ensureInitialized();
    const result = await prisma.warehouse_addresses.findFirst({
      where: {
        seller_id: sellerId,
        is_default: 1
      }
    });
    return result ?? undefined;
  }

  async createWarehouseAddress(address: InsertWarehouseAddress): Promise<WarehouseAddress> {
    await this.ensureInitialized();
    return await prisma.warehouse_addresses.create({
      data: address
    });
  }

  async updateWarehouseAddress(id: string, address: Partial<InsertWarehouseAddress>): Promise<WarehouseAddress | undefined> {
    await this.ensureInitialized();
    const result = await prisma.warehouse_addresses.update({
      where: { id },
      data: {
        ...address,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async deleteWarehouseAddress(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.warehouse_addresses.delete({
      where: { id }
    });
    return true;
  }

  async setDefaultWarehouseAddress(sellerId: string, warehouseId: string): Promise<boolean> {
    await this.ensureInitialized();
    
    await prisma.warehouse_addresses.updateMany({
      where: { seller_id: sellerId },
      data: {
        is_default: 0,
        updated_at: new Date()
      }
    });
    
    await prisma.warehouse_addresses.update({
      where: { id: warehouseId },
      data: {
        is_default: 1,
        updated_at: new Date()
      }
    });
    
    return true;
  }

  // Shipping Label Methods (Shippo Integration)
  async getShippingLabel(id: string): Promise<ShippingLabel | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_labels.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getShippingLabelsByOrderId(orderId: string): Promise<ShippingLabel[]> {
    await this.ensureInitialized();
    return await prisma.shipping_labels.findMany({
      where: { order_id: orderId }
    });
  }

  async getShippingLabelsBySellerId(sellerId: string): Promise<ShippingLabel[]> {
    await this.ensureInitialized();
    return await prisma.shipping_labels.findMany({
      where: { seller_id: sellerId }
    });
  }

  async createShippingLabel(label: InsertShippingLabel): Promise<ShippingLabel> {
    await this.ensureInitialized();
    return await prisma.shipping_labels.create({
      data: label
    });
  }

  async updateShippingLabel(id: string, label: Partial<InsertShippingLabel>): Promise<ShippingLabel | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_labels.update({
      where: { id },
      data: label
    });
    return result ?? undefined;
  }

  // Shipping Label Refund Methods
  async getShippingLabelRefund(id: string): Promise<ShippingLabelRefund | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_label_refunds.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getPendingShippingLabelRefunds(): Promise<ShippingLabelRefund[]> {
    await this.ensureInitialized();
    return await prisma.shipping_label_refunds.findMany({
      where: {
        status: { in: ['queued', 'pending'] }
      }
    });
  }

  async createShippingLabelRefund(refund: InsertShippingLabelRefund): Promise<ShippingLabelRefund> {
    await this.ensureInitialized();
    return await prisma.shipping_label_refunds.create({
      data: refund
    });
  }

  async updateShippingLabelRefund(id: string, refund: Partial<InsertShippingLabelRefund>): Promise<ShippingLabelRefund | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_label_refunds.update({
      where: { id },
      data: refund
    });
    return result ?? undefined;
  }

  // Seller Credit Ledger Methods
  async getSellerCreditLedgersBySellerId(sellerId: string): Promise<SellerCreditLedger[]> {
    await this.ensureInitialized();
    return await prisma.seller_credit_ledgers.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getCreditLedgerEntryByStripeSession(stripeSessionId: string): Promise<SellerCreditLedger | undefined> {
    await this.ensureInitialized();
    const result = await prisma.seller_credit_ledgers.findFirst({
      where: { stripe_session_id: stripeSessionId }
    });
    return result ?? undefined;
  }

  async createSellerCreditLedger(ledger: InsertSellerCreditLedger): Promise<SellerCreditLedger> {
    await this.ensureInitialized();
    return await prisma.seller_credit_ledgers.create({
      data: ledger
    });
  }

  // User Update Method
  async updateUser(userId: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.update({
      where: { id: userId },
      data: data
    });
    return result ?? undefined;
  }

  // Invoice Methods
  async getInvoicesByOrderId(orderId: string): Promise<Invoice[]> {
    await this.ensureInitialized();
    return await prisma.invoices.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getInvoicesBySellerId(sellerId: string): Promise<Invoice[]> {
    await this.ensureInitialized();
    return await prisma.invoices.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    await this.ensureInitialized();
    const result = await prisma.invoices.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    await this.ensureInitialized();
    const result = await prisma.invoices.findFirst({
      where: { invoice_number: invoiceNumber }
    });
    return result ?? undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    await this.ensureInitialized();
    return await prisma.invoices.create({
      data: invoice
    });
  }

  // Packing Slip Methods
  async getPackingSlipsByOrderId(orderId: string): Promise<PackingSlip[]> {
    await this.ensureInitialized();
    return await prisma.packing_slips.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getPackingSlipsBySellerId(sellerId: string): Promise<PackingSlip[]> {
    await this.ensureInitialized();
    return await prisma.packing_slips.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getPackingSlip(id: string): Promise<PackingSlip | undefined> {
    await this.ensureInitialized();
    const result = await prisma.packing_slips.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getPackingSlipByNumber(packingSlipNumber: string): Promise<PackingSlip | undefined> {
    await this.ensureInitialized();
    const result = await prisma.packing_slips.findFirst({
      where: { packing_slip_number: packingSlipNumber }
    });
    return result ?? undefined;
  }

  async createPackingSlip(packingSlip: InsertPackingSlip): Promise<PackingSlip> {
    await this.ensureInitialized();
    return await prisma.packing_slips.create({
      data: packingSlip
    });
  }

  // Saved Address Methods
  async getSavedAddressesByUserId(userId: string): Promise<SavedAddress[]> {
    await this.ensureInitialized();
    return await prisma.saved_addresses.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' }
      ]
    });
  }

  async getSavedAddress(id: string): Promise<SavedAddress | undefined> {
    await this.ensureInitialized();
    const result = await prisma.saved_addresses.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress> {
    await this.ensureInitialized();
    return await prisma.saved_addresses.create({
      data: address
    });
  }

  async updateSavedAddress(id: string, address: Partial<InsertSavedAddress>): Promise<SavedAddress | undefined> {
    await this.ensureInitialized();
    const result = await prisma.saved_addresses.update({
      where: { id },
      data: {
        ...address,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async deleteSavedAddress(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.saved_addresses.delete({
      where: { id }
    });
    return true;
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    await this.ensureInitialized();
    await prisma.saved_addresses.updateMany({
      where: { user_id: userId },
      data: { is_default: 0 }
    });
    
    await prisma.saved_addresses.update({
      where: { id: addressId },
      data: {
        is_default: 1,
        updated_at: new Date()
      }
    });
  }

  // Saved Payment Method Methods
  async getSavedPaymentMethodsByUserId(userId: string): Promise<SavedPaymentMethod[]> {
    await this.ensureInitialized();
    return await prisma.saved_payment_methods.findMany({
      where: { user_id: userId },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' }
      ]
    });
  }

  async getSavedPaymentMethod(id: string): Promise<SavedPaymentMethod | undefined> {
    await this.ensureInitialized();
    const result = await prisma.saved_payment_methods.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getSavedPaymentMethodByStripeId(stripePaymentMethodId: string): Promise<SavedPaymentMethod | undefined> {
    await this.ensureInitialized();
    const result = await prisma.saved_payment_methods.findFirst({
      where: { stripe_payment_method_id: stripePaymentMethodId }
    });
    return result ?? undefined;
  }

  async createSavedPaymentMethod(paymentMethod: InsertSavedPaymentMethod): Promise<SavedPaymentMethod> {
    await this.ensureInitialized();
    return await prisma.saved_payment_methods.create({
      data: paymentMethod
    });
  }

  async deleteSavedPaymentMethod(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.saved_payment_methods.delete({
      where: { id }
    });
    return true;
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    await this.ensureInitialized();
    await prisma.saved_payment_methods.updateMany({
      where: { user_id: userId },
      data: { is_default: 0 }
    });
    
    await prisma.saved_payment_methods.update({
      where: { id: paymentMethodId },
      data: {
        is_default: 1,
        updated_at: new Date()
      }
    });
  }

  async getHomepageBySellerId(sellerId: string): Promise<SellerHomepage | undefined> {
    await this.ensureInitialized();
    const result = await prisma.seller_homepages.findFirst({
      where: { seller_id: sellerId }
    });
    return result ?? undefined;
  }

  async createHomepage(homepage: InsertSellerHomepage): Promise<SellerHomepage> {
    await this.ensureInitialized();
    return await prisma.seller_homepages.create({
      data: homepage
    });
  }

  async updateHomepage(id: string, homepage: Partial<InsertSellerHomepage>): Promise<SellerHomepage | undefined> {
    await this.ensureInitialized();
    const result = await prisma.seller_homepages.update({
      where: { id },
      data: {
        ...homepage,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async publishHomepage(id: string): Promise<SellerHomepage | undefined> {
    await this.ensureInitialized();
    const homepage = await prisma.seller_homepages.findUnique({
      where: { id }
    });
    
    if (!homepage) return undefined;

    const result = await prisma.seller_homepages.update({
      where: { id },
      data: {
        status: 'published',
        last_published_at: new Date(),
        published_desktop_config: homepage.desktop_config,
        published_mobile_config: homepage.mobile_config,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async unpublishHomepage(id: string): Promise<SellerHomepage | undefined> {
    await this.ensureInitialized();
    const result = await prisma.seller_homepages.update({
      where: { id },
      data: {
        status: 'unpublished',
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  async getAllCtaOptions(): Promise<HomepageCtaOption[]> {
    await this.ensureInitialized();
    return await prisma.homepage_cta_options.findMany({
      where: { is_active: 1 },
      orderBy: { sort_order: 'asc' }
    });
  }

  async getCtaOption(id: string): Promise<HomepageCtaOption | undefined> {
    await this.ensureInitialized();
    const result = await prisma.homepage_cta_options.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getHomepageMedia(homepageId: string): Promise<HomepageMediaAsset[]> {
    await this.ensureInitialized();
    return await prisma.homepage_media_assets.findMany({
      where: { homepage_id: homepageId },
      orderBy: { sort_order: 'asc' }
    });
  }

  async createHomepageMedia(media: InsertHomepageMediaAsset): Promise<HomepageMediaAsset> {
    await this.ensureInitialized();
    return await prisma.homepage_media_assets.create({
      data: media
    });
  }

  async deleteHomepageMedia(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.homepage_media_assets.delete({
      where: { id }
    });
    return true;
  }

  async searchMusicTracks(query: string, genre?: string): Promise<MusicTrack[]> {
    await this.ensureInitialized();
    const where: any = { is_active: 1 };
    
    if (genre) {
      where.genre = genre;
    }

    return await prisma.music_tracks.findMany({
      where,
      take: 50
    });
  }

  async getMusicTrack(id: string): Promise<MusicTrack | undefined> {
    await this.ensureInitialized();
    const result = await prisma.music_tracks.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async createMusicTrack(track: InsertMusicTrack): Promise<MusicTrack> {
    await this.ensureInitialized();
    return await prisma.music_tracks.create({
      data: track
    });
  }

  // Payment Intent Methods
  async getPaymentIntent(id: string): Promise<PaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await prisma.payment_intents.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getPaymentIntentByIdempotencyKey(idempotencyKey: string): Promise<PaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await prisma.payment_intents.findFirst({
      where: { idempotency_key: idempotencyKey }
    });
    return result ?? undefined;
  }

  async getPaymentIntentByProviderIntentId(providerIntentId: string): Promise<PaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await prisma.payment_intents.findFirst({
      where: { provider_intent_id: providerIntentId }
    });
    return result ?? undefined;
  }

  async storePaymentIntent(intent: InsertPaymentIntent): Promise<PaymentIntent> {
    await this.ensureInitialized();
    return await prisma.payment_intents.create({
      data: intent
    });
  }

  async updatePaymentIntentStatus(id: string, status: string): Promise<PaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await prisma.payment_intents.update({
      where: { id },
      data: {
        status,
        updated_at: new Date()
      }
    });
    return result ?? undefined;
  }

  // Webhook Event Methods
  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await prisma.webhook_events.findUnique({
      where: { id: eventId }
    });
    return result !== null;
  }

  async markWebhookEventProcessed(eventId: string, payload: any, eventType: string, providerName: string): Promise<void> {
    await this.ensureInitialized();
    await prisma.webhook_events.create({
      data: {
        id: eventId,
        provider_name: providerName,
        event_type: eventType,
        payload,
        processed_at: new Date(),
      }
    });
  }

  async storeFailedWebhookEvent(event: InsertFailedWebhookEvent): Promise<FailedWebhookEvent> {
    await this.ensureInitialized();
    return await prisma.failed_webhook_events.create({
      data: event
    });
  }

  async getUnprocessedFailedWebhooks(limit: number = 10): Promise<FailedWebhookEvent[]> {
    await this.ensureInitialized();
    return await prisma.failed_webhook_events.findMany({
      where: {
        retry_count: { lt: 3 }
      },
      orderBy: { created_at: 'asc' },
      take: limit
    });
  }

  async incrementWebhookRetryCount(id: string): Promise<void> {
    await this.ensureInitialized();
    await prisma.failed_webhook_events.update({
      where: { id },
      data: {
        retry_count: { increment: 1 },
        last_retry_at: new Date()
      }
    });
  }

  async deleteFailedWebhookEvent(id: string): Promise<void> {
    await this.ensureInitialized();
    await prisma.failed_webhook_events.delete({
      where: { id }
    });
  }

  // Shopping Carts - Session-based cart storage
  async getCartBySession(sessionId: string): Promise<Cart | undefined> {
    await this.ensureInitialized();
    const sessionMap = await prisma.cart_sessions.findUnique({
      where: { session_id: sessionId }
    });
    
    if (!sessionMap) return undefined;
    
    const cart = await prisma.carts.findUnique({
      where: { id: sessionMap.cart_id }
    });
    
    return cart ?? undefined;
  }

  async getCartByUserId(userId: string): Promise<Cart | undefined> {
    await this.ensureInitialized();
    const result = await prisma.carts.findFirst({
      where: { buyer_id: userId },
      orderBy: { updated_at: 'desc' }
    });
    return result ?? undefined;
  }

  async saveCart(sessionId: string, sellerId: string, items: any[], userId?: string): Promise<Cart> {
    await this.ensureInitialized();
    
    return await this.db.transaction(async (tx) => {
      let targetCart: Cart | undefined;
      
      if (userId) {
        // Auth user: lock and get/create cart for (sellerId, userId)
        const existing = await tx.select().from(carts)
          .where(and(eq(carts.sellerId, sellerId), eq(carts.buyerId, userId)))
          .for('update').limit(1);
        
        if (existing[0]) {
          targetCart = existing[0];
        } else {
          // Create new authenticated cart
          const [newCart] = await tx.insert(carts).values({
            sellerId,
            buyerId: userId,
            items,
          }).returning();
          targetCart = newCart;
        }
      } else {
        // Guest: get cart via session mapping or create new
        const sessionMap = await tx.select().from(cartSessions)
          .where(eq(cartSessions.sessionId, sessionId)).limit(1);
        
        if (sessionMap[0]) {
          const [existingCart] = await tx.select().from(carts)
            .where(eq(carts.id, sessionMap[0].cartId)).limit(1);
          targetCart = existingCart;
        } else {
          // Create new guest cart
          const [newCart] = await tx.insert(carts).values({
            sellerId,
            buyerId: null,
            items,
          }).returning();
          targetCart = newCart;
        }
      }
      
      // Update cart items (only mutable fields)
      await tx.update(carts)
        .set({ items, sellerId, buyerId: userId || null, updatedAt: new Date() })
        .where(eq(carts.id, targetCart.id));
      
      // Upsert session mapping
      await tx.insert(cartSessions)
        .values({ sessionId, cartId: targetCart.id, lastSeen: new Date() })
        .onConflictDoUpdate({
          target: cartSessions.sessionId,
          set: { cartId: targetCart.id, lastSeen: new Date() },
        });
      
      return targetCart;
    });
  }

  async clearCartBySession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    await prisma.cart_sessions.delete({
      where: { session_id: sessionId }
    });
  }

  // ===== BULK PRODUCT UPLOAD METHODS =====
  
  async createBulkUploadJob(job: InsertBulkUploadJob): Promise<BulkUploadJob> {
    await this.ensureInitialized();
    return await prisma.bulk_upload_jobs.create({
      data: job
    });
  }

  async getBulkUploadJob(id: string): Promise<BulkUploadJob | undefined> {
    await this.ensureInitialized();
    const result = await prisma.bulk_upload_jobs.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getBulkUploadJobsBySeller(sellerId: string): Promise<BulkUploadJob[]> {
    await this.ensureInitialized();
    return await prisma.bulk_upload_jobs.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateBulkUploadJob(id: string, updates: Partial<BulkUploadJob>): Promise<BulkUploadJob | undefined> {
    await this.ensureInitialized();
    const result = await prisma.bulk_upload_jobs.update({
      where: { id },
      data: updates
    });
    return result ?? undefined;
  }

  async createBulkUploadItem(item: InsertBulkUploadItem): Promise<BulkUploadItem> {
    await this.ensureInitialized();
    return await prisma.bulk_upload_items.create({
      data: item
    });
  }

  async createBulkUploadItems(items: InsertBulkUploadItem[]): Promise<BulkUploadItem[]> {
    await this.ensureInitialized();
    if (items.length === 0) return [];
    return await prisma.$transaction(
      items.map(item => prisma.bulk_upload_items.create({ data: item }))
    );
  }

  async getBulkUploadItemsByJob(jobId: string): Promise<BulkUploadItem[]> {
    await this.ensureInitialized();
    return await prisma.bulk_upload_items.findMany({
      where: { job_id: jobId },
      orderBy: { row_number: 'asc' }
    });
  }

  async updateBulkUploadItem(id: string, updates: Partial<BulkUploadItem>): Promise<BulkUploadItem | undefined> {
    await this.ensureInitialized();
    const result = await prisma.bulk_upload_items.update({
      where: { id },
      data: updates
    });
    return result ?? undefined;
  }

  async deleteBulkUploadItemsByJob(jobId: string): Promise<boolean> {
    await this.ensureInitialized();
    await prisma.bulk_upload_items.deleteMany({
      where: { job_id: jobId }
    });
    return true;
  }

  // ===== META AD ACCOUNTS METHODS =====
  
  async getMetaAdAccount(id: string): Promise<MetaAdAccount | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getMetaAdAccountBySeller(sellerId: string): Promise<MetaAdAccount | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.findFirst({
      where: { seller_id: sellerId }
    });
    return result ?? undefined;
  }

  async getMetaAdAccountByMetaAccountId(metaAdAccountId: string): Promise<MetaAdAccount | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.findFirst({
      where: { meta_ad_account_id: metaAdAccountId }
    });
    return result ?? undefined;
  }

  async createMetaAdAccount(account: InsertMetaAdAccount): Promise<string> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.create({
      data: account
    });
    return result.id;
  }

  async updateMetaAdAccount(id: string, updates: Partial<MetaAdAccount>): Promise<MetaAdAccount | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.update({
      where: { id },
      data: updates
    });
    return result ?? undefined;
  }

  async getAllMetaAdAccountsBySeller(sellerId: string): Promise<MetaAdAccount[]> {
    await this.ensureInitialized();
    return await prisma.meta_ad_accounts.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getSelectedMetaAdAccount(sellerId: string): Promise<MetaAdAccount | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.findFirst({
      where: {
        seller_id: sellerId,
        is_selected: 1
      }
    });
    return result ?? undefined;
  }

  async selectMetaAdAccount(sellerId: string, accountId: string): Promise<boolean> {
    await this.ensureInitialized();
    
    // First, deselect all accounts for this seller
    await prisma.meta_ad_accounts.updateMany({
      where: { seller_id: sellerId },
      data: { is_selected: 0 }
    });
    
    // Then, select the specified account
    const result = await prisma.meta_ad_accounts.update({
      where: { id: accountId },
      data: { is_selected: 1 }
    });
    
    return !!result;
  }

  // ===== META CAMPAIGNS METHODS =====
  
  async getMetaCampaign(id: string): Promise<MetaCampaign | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_campaigns.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getMetaCampaignsBySeller(sellerId: string): Promise<MetaCampaign[]> {
    await this.ensureInitialized();
    return await prisma.meta_campaigns.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getMetaCampaignsByAdAccount(adAccountId: string): Promise<MetaCampaign[]> {
    await this.ensureInitialized();
    return await prisma.meta_campaigns.findMany({
      where: { ad_account_id: adAccountId },
      orderBy: { created_at: 'desc' }
    });
  }

  async createMetaCampaign(campaign: InsertMetaCampaign): Promise<string> {
    await this.ensureInitialized();
    const result = await prisma.meta_campaigns.create({
      data: campaign
    });
    return result.id;
  }

  async updateMetaCampaign(id: string, updates: Partial<MetaCampaign>): Promise<MetaCampaign | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_campaigns.update({
      where: { id },
      data: updates
    });
    return result ?? undefined;
  }

  // ===== META CAMPAIGN FINANCE METHODS =====
  
  async getMetaCampaignFinance(id: string): Promise<MetaCampaignFinance | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_campaign_finance.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getMetaCampaignFinanceBySeller(sellerId: string): Promise<MetaCampaignFinance[]> {
    await this.ensureInitialized();
    return await prisma.meta_campaign_finance.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getMetaCampaignFinanceByCampaign(campaignId: string): Promise<MetaCampaignFinance[]> {
    await this.ensureInitialized();
    return await prisma.meta_campaign_finance.findMany({
      where: { campaign_id: campaignId },
      orderBy: { created_at: 'desc' }
    });
  }

  async createMetaCampaignFinanceRecord(record: InsertMetaCampaignFinance): Promise<string> {
    await this.ensureInitialized();
    const result = await prisma.meta_campaign_finance.create({
      data: record
    });
    return result.id;
  }

  // ===== META CAMPAIGN METRICS METHODS =====
  
  async getMetaCampaignMetrics(campaignId: string, startDate?: Date, endDate?: Date): Promise<MetaCampaignMetricsDaily[]> {
    await this.ensureInitialized();
    
    const conditions = [eq(metaCampaignMetricsDaily.campaignId, campaignId)];
    
    if (startDate) {
      conditions.push(sql`${metaCampaignMetricsDaily.date} >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`${metaCampaignMetricsDaily.date} <= ${endDate}`);
    }
    
    return await this.db
      .select()
      .from(metaCampaignMetricsDaily)
      .where(and(...conditions))
      .orderBy(desc(metaCampaignMetricsDaily.date));
  }

  async getMetaCampaignMetricsForDate(campaignId: string, date: Date): Promise<MetaCampaignMetricsDaily | undefined> {
    await this.ensureInitialized();
    const [result] = await this.db
      .select()
      .from(metaCampaignMetricsDaily)
      .where(
        and(
          eq(metaCampaignMetricsDaily.campaignId, campaignId),
          sql`DATE(${metaCampaignMetricsDaily.date}) = DATE(${date})`
        )
      )
      .limit(1);
    return result;
  }

  async upsertMetaCampaignMetrics(metrics: InsertMetaCampaignMetricsDaily): Promise<string> {
    await this.ensureInitialized();
    const [result] = await this.db
      .insert(metaCampaignMetricsDaily)
      .values(metrics)
      .onConflictDoUpdate({
        target: [metaCampaignMetricsDaily.campaignId, metaCampaignMetricsDaily.date],
        set: {
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          reach: metrics.reach,
          frequency: metrics.frequency,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          linkClicks: metrics.linkClicks,
          websiteVisits: metrics.websiteVisits,
          purchases: metrics.purchases,
          revenue: metrics.revenue,
          spend: metrics.spend,
          cpm: metrics.cpm,
          cpc: metrics.cpc,
          ctr: metrics.ctr,
          roas: metrics.roas,
        }
      })
      .returning();
    return result.id;
  }

  // ===== BACKGROUND JOB RUNS METHODS =====
  
  async getBackgroundJobRun(id: string): Promise<BackgroundJobRun | undefined> {
    await this.ensureInitialized();
    const [result] = await this.db
      .select()
      .from(backgroundJobRuns)
      .where(eq(backgroundJobRuns.id, id))
      .limit(1);
    return result;
  }

  async getBackgroundJobRunsByName(jobName: string): Promise<BackgroundJobRun[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(backgroundJobRuns)
      .where(eq(backgroundJobRuns.jobName, jobName))
      .orderBy(desc(backgroundJobRuns.createdAt));
  }

  async getRecentBackgroundJobRuns(jobName: string, limit: number): Promise<BackgroundJobRun[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(backgroundJobRuns)
      .where(eq(backgroundJobRuns.jobName, jobName))
      .orderBy(desc(backgroundJobRuns.createdAt))
      .limit(limit);
  }

  async createBackgroundJobRun(job: InsertBackgroundJobRun): Promise<string> {
    await this.ensureInitialized();
    const result = await prisma.background_job_runs.create({
      data: {
        job_name: job.jobName,
        status: job.status,
        started_at: job.startedAt,
        finished_at: job.finishedAt,
        error_message: job.errorMessage,
        retry_count: job.retryCount ?? 0,
        records_processed: job.recordsProcessed
      }
    });
    return result.id;
  }

  async updateBackgroundJobRun(id: string, updates: Partial<BackgroundJobRun>): Promise<BackgroundJobRun | undefined> {
    await this.ensureInitialized();
    const data: any = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.finishedAt !== undefined) data.finished_at = updates.finishedAt;
    if (updates.errorMessage !== undefined) data.error_message = updates.errorMessage;
    if (updates.recordsProcessed !== undefined) data.records_processed = updates.recordsProcessed;
    if (updates.retryCount !== undefined) data.retry_count = updates.retryCount;
    
    const result = await prisma.background_job_runs.update({
      where: { id },
      data
    });
    return result ?? undefined;
  }

  // ===== DOMAIN CONNECTIONS METHODS (CUSTOM DOMAINS SYSTEM) =====
  
  async getAllDomainConnections(): Promise<DomainConnection[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(domainConnections)
      .orderBy(desc(domainConnections.createdAt));
  }

  async getDomainConnectionById(id: string): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    const [result] = await this.db
      .select()
      .from(domainConnections)
      .where(eq(domainConnections.id, id))
      .limit(1);
    return result;
  }

  async getDomainConnectionByDomain(domain: string): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    // Normalize domain to lowercase for case-insensitive lookup
    const normalizedDomain = domain.toLowerCase();
    const [result] = await this.db
      .select()
      .from(domainConnections)
      .where(eq(domainConnections.normalizedDomain, normalizedDomain))
      .limit(1);
    return result;
  }

  async getDomainConnectionsBySellerId(sellerId: string): Promise<DomainConnection[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(domainConnections)
      .where(eq(domainConnections.sellerId, sellerId))
      .orderBy(desc(domainConnections.isPrimary), desc(domainConnections.createdAt));
  }

  async getDomainConnectionByCloudflareId(cloudflareId: string): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    const [result] = await this.db
      .select()
      .from(domainConnections)
      .where(eq(domainConnections.cloudflareCustomHostnameId, cloudflareId))
      .limit(1);
    return result;
  }

  async getDomainConnectionByVerificationToken(token: string): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    const [result] = await this.db
      .select()
      .from(domainConnections)
      .where(eq(domainConnections.verificationToken, token))
      .limit(1);
    return result;
  }

  async createDomainConnection(connection: InsertDomainConnection): Promise<DomainConnection> {
    await this.ensureInitialized();
    // Auto-generate normalizedDomain from domain
    const normalizedDomain = connection.domain.toLowerCase();
    const [result] = await this.db
      .insert(domainConnections)
      .values({
        ...connection,
        normalizedDomain,
      })
      .returning();
    return result;
  }

  async updateDomainConnection(id: string, updates: Partial<DomainConnection>): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    // If domain is being updated, also update normalizedDomain
    const updateData = { ...updates };
    if (updates.domain) {
      updateData.normalizedDomain = updates.domain.toLowerCase();
    }
    updateData.updatedAt = new Date();
    
    const [result] = await this.db
      .update(domainConnections)
      .set(updateData)
      .where(eq(domainConnections.id, id))
      .returning();
    return result;
  }

  async deleteDomainConnection(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db
      .delete(domainConnections)
      .where(eq(domainConnections.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getDomainByName(domain: string): Promise<DomainConnection | null> {
    await this.ensureInitialized();
    const normalizedDomain = domain.toLowerCase();
    const [result] = await this.db
      .select()
      .from(domainConnections)
      .where(eq(domainConnections.normalizedDomain, normalizedDomain))
      .limit(1);
    return result || null;
  }

  async getDomainsInProvisioning(sellerId?: string): Promise<DomainConnection[]> {
    await this.ensureInitialized();
    let query = this.db
      .select()
      .from(domainConnections)
      .where(eq(domainConnections.status, 'ssl_provisioning'));
    
    if (sellerId) {
      query = query.where(
        and(
          eq(domainConnections.status, 'ssl_provisioning'),
          eq(domainConnections.sellerId, sellerId)
        )
      );
    }
    
    return await query;
  }
}

export const storage = new DatabaseStorage();
