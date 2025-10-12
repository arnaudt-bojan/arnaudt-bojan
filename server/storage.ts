import { 
  type User, 
  type UpsertUser, 
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
  type OrderEvent,
  type InsertOrderEvent,
  type OrderBalancePayment,
  type InsertOrderBalancePayment,
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
  users,
  products,
  orders,
  orderItems,
  orderEvents,
  orderBalancePayments,
  refunds,
  stockReservations,
  invitations,
  metaSettings,
  tiktokSettings,
  xSettings,
  subscriberGroups,
  subscribers,
  subscriberGroupMemberships,
  newsletters,
  newsletterTemplates,
  newsletterAnalytics,
  newsletterEvents,
  nftMints,
  wholesaleProducts,
  wholesaleInvitations,
  categories,
  notifications,
  authTokens,
  shippingMatrices,
  shippingZones,
  invoices,
  packingSlips,
  savedAddresses,
  savedPaymentMethods,
  sellerHomepages,
  homepageCtaOptions,
  homepageMediaAssets,
  musicTracks,
  userStoreRoles,
  userStoreMemberships,
  wholesaleAccessGrants,
  teamInvitations,
  paymentIntents,
  webhookEvents,
  failedWebhookEvents
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc, sql, and, lt } from "drizzle-orm";
import ws from "ws";
import { logger } from './logger';

neonConfig.webSocketConstructor = ws;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
  getUserStoreMembershipsByStore(storeOwnerId: string): Promise<UserStoreMembership[]>;
  getUserStoreMembershipsByUser(userId: string): Promise<UserStoreMembership[]>;
  createUserStoreMembership(membership: InsertUserStoreMembership): Promise<UserStoreMembership>;
  updateUserStoreMembership(id: string, capabilities: any, status?: string): Promise<UserStoreMembership | undefined>;
  deleteUserStoreMembership(id: string): Promise<boolean>;
  
  // New Auth System - Wholesale Access Grants
  getWholesaleAccessGrant(buyerId: string, sellerId: string): Promise<WholesaleAccessGrant | undefined>;
  getWholesaleAccessGrantsBySeller(sellerId: string): Promise<WholesaleAccessGrant[]>;
  getWholesaleAccessGrantsByBuyer(buyerId: string): Promise<WholesaleAccessGrant[]>;
  createWholesaleAccessGrant(grant: InsertWholesaleAccessGrant): Promise<WholesaleAccessGrant>;
  updateWholesaleAccessGrant(id: string, status: string): Promise<WholesaleAccessGrant | undefined>;
  
  // New Auth System - Team Invitations
  getTeamInvitation(id: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationsByStore(storeOwnerId: string): Promise<TeamInvitation[]>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  updateTeamInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<TeamInvitation | undefined>;
  
  // New Auth System - Wholesale Invitations
  getWholesaleInvitation(id: string): Promise<WholesaleInvitation | undefined>;
  getWholesaleInvitationByToken(token: string): Promise<WholesaleInvitation | undefined>;
  getWholesaleInvitationsBySeller(sellerId: string): Promise<WholesaleInvitation[]>;
  createWholesaleInvitation(invitation: InsertWholesaleInvitation): Promise<WholesaleInvitation>;
  updateWholesaleInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<WholesaleInvitation | undefined>;
  
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
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
  
  getAllOrders(): Promise<Order[]>;
  getOrdersByUserId(userId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
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
  deleteOrder(id: string): Promise<boolean>;
  deleteOrderItems(orderId: string): Promise<boolean>;
  
  // Refunds
  createRefund(refund: InsertRefund): Promise<Refund>;
  getRefund(id: string): Promise<Refund | undefined>;
  getRefundsByOrderId(orderId: string): Promise<Refund[]>;
  updateRefundStatus(id: string, status: string, stripeRefundId?: string): Promise<Refund | undefined>;
  updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<Order | undefined>;
  
  // Order Events - track email and status history
  getOrderEvents(orderId: string): Promise<OrderEvent[]>;
  createOrderEvent(event: InsertOrderEvent): Promise<OrderEvent>;
  
  // Order Balance Payments - track deposit/balance lifecycle for pre-orders & made-to-order
  getBalancePaymentsByOrderId(orderId: string): Promise<OrderBalancePayment[]>;
  getBalancePayment(id: string): Promise<OrderBalancePayment | undefined>;
  createBalancePayment(payment: InsertOrderBalancePayment): Promise<OrderBalancePayment>;
  updateBalancePayment(id: string, data: Partial<OrderBalancePayment>): Promise<OrderBalancePayment | undefined>;
  
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
  
  createNftMint(nftMint: InsertNftMint): Promise<NftMint>;
  getNftMintsByUserId(userId: string): Promise<NftMint[]>;
  getNftMintByOrderId(orderId: string): Promise<NftMint | undefined>;
  
  getAllWholesaleProducts(): Promise<WholesaleProduct[]>;
  getWholesaleProductsBySellerId(sellerId: string): Promise<WholesaleProduct[]>;
  getWholesaleProduct(id: string): Promise<WholesaleProduct | undefined>;
  createWholesaleProduct(product: InsertWholesaleProduct): Promise<WholesaleProduct>;
  updateWholesaleProduct(id: string, product: Partial<InsertWholesaleProduct>): Promise<WholesaleProduct | undefined>;
  deleteWholesaleProduct(id: string): Promise<boolean>;
  
  createWholesaleInvitation(invitation: InsertWholesaleInvitation): Promise<WholesaleInvitation>;
  getAllWholesaleInvitations(): Promise<WholesaleInvitation[]>;
  getWholesaleInvitationsBySellerId(sellerId: string): Promise<WholesaleInvitation[]>;
  getWholesaleInvitationByToken(token: string): Promise<WholesaleInvitation | undefined>;
  acceptWholesaleInvitation(token: string, buyerUserId: string): Promise<WholesaleInvitation | undefined>;
  deleteWholesaleInvitation(id: string): Promise<boolean>;
  
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
}

export class DatabaseStorage implements IStorage {
  public db; // Made public for import queue access
  private initialized: Promise<void>;
  private initError: Error | null = null;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
    
    this.initialized = this.init();
  }

  private async init(): Promise<void> {
    try {
      // Seed products removed - test users can create their own products
      // await this.seedProducts();
    } catch (err) {
      console.error("Failed to initialize database:", err);
      this.initError = err instanceof Error ? err : new Error(String(err));
    }
  }

  private async ensureInitialized() {
    await this.initialized;
    if (this.initError) {
      throw this.initError;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    await this.ensureInitialized();
    
    // Check if user exists by email or ID
    let existingUser: User | undefined;
    if (userData.email) {
      const byEmail = await this.db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      existingUser = byEmail[0];
    }
    if (!existingUser && userData.id) {
      const byId = await this.db.select().from(users).where(eq(users.id, userData.id)).limit(1);
      existingUser = byId[0];
    }

    if (existingUser) {
      // Update existing user
      const result = await this.db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return result[0];
    } else {
      // Insert new user
      const result = await this.db
        .insert(users)
        .values(userData)
        .returning();
      return result[0];
    }
  }

  async getAllProducts(): Promise<Product[]> {
    await this.ensureInitialized();
    return await this.db.select().from(products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    await this.ensureInitialized();
    const result = await this.db.insert(products).values(insertProduct).returning();
    return result[0];
  }

  async getAllOrders(): Promise<Order[]> {
    await this.ensureInitialized();
    return await this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    await this.ensureInitialized();
    return await this.db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    await this.ensureInitialized();
    const result = await this.db.insert(orders).values(insertOrder).returning();
    return result[0];
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(products).set(updates).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  // Inventory Management - Stock Reservations
  async getStockReservation(id: string): Promise<StockReservation | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(stockReservations).where(eq(stockReservations.id, id)).limit(1);
    return result[0];
  }

  async getStockReservationsBySession(sessionId: string): Promise<StockReservation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(stockReservations).where(eq(stockReservations.sessionId, sessionId));
  }

  async getStockReservationsByProduct(productId: string): Promise<StockReservation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(stockReservations).where(eq(stockReservations.productId, productId));
  }

  async getExpiredStockReservations(now: Date): Promise<StockReservation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(stockReservations).where(
      and(
        eq(stockReservations.status, 'active'),
        lt(stockReservations.expiresAt, now)
      )
    );
  }

  async getReservedStock(productId: string, variantId?: string): Promise<number> {
    await this.ensureInitialized();
    const conditions = [
      eq(stockReservations.productId, productId),
      eq(stockReservations.status, 'active')
    ];
    
    if (variantId) {
      conditions.push(eq(stockReservations.variantId, variantId));
    }

    const reservations = await this.db.select().from(stockReservations).where(and(...conditions));
    
    return reservations.reduce((total, reservation) => total + reservation.quantity, 0);
  }

  async createStockReservation(reservation: InsertStockReservation): Promise<StockReservation> {
    await this.ensureInitialized();
    const result = await this.db.insert(stockReservations).values(reservation).returning();
    return result[0];
  }

  async updateStockReservation(id: string, data: Partial<StockReservation>): Promise<StockReservation | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(stockReservations).set(data).where(eq(stockReservations.id, id)).returning();
    return result[0];
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
      await this.db.transaction(async (tx) => {
        for (const reservation of activeReservations) {
          // 1. Update reservation status
          await tx
            .update(stockReservations)
            .set({
              status: 'committed',
              committedAt: new Date(),
              orderId,
            })
            .where(eq(stockReservations.id, reservation.id));

          // 2. Decrement stock (in same transaction)
          const product = await tx
            .select()
            .from(products)
            .where(eq(products.id, reservation.productId))
            .limit(1);

          if (!product[0]) {
            throw new Error(`Product ${reservation.productId} not found during commit`);
          }

          const variantId = reservation.variantId;
          if (variantId && product[0].variants) {
            const variants = Array.isArray(product[0].variants) ? product[0].variants : [];
            const updatedVariants = variants.map((v: any) => {
              const currentVariantId = v.color 
                ? `${v.size?.toLowerCase() || ''}-${v.color.toLowerCase()}`.replace(/\s+/g, '-')
                : v.size?.toLowerCase() || '';
              
              if (currentVariantId === variantId) {
                return {
                  ...v,
                  stock: Math.max(0, (v.stock || 0) - reservation.quantity),
                };
              }
              return v;
            });

            await tx
              .update(products)
              .set({ variants: updatedVariants })
              .where(eq(products.id, reservation.productId));
          } else {
            const newStock = Math.max(0, (product[0].stock || 0) - reservation.quantity);
            await tx
              .update(products)
              .set({ stock: newStock })
              .where(eq(products.id, reservation.productId));
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
        const variant = variants.find((v: any) => {
          const parts = [];
          if (v.size) parts.push(v.size);
          if (v.color) parts.push(v.color);
          const vId = parts.join('-').toLowerCase();
          return vId === variantId;
        });
        currentStock = variant?.stock || 0;
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

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async updateOrderTracking(id: string, trackingNumber: string, trackingLink: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orders).set({ 
      trackingNumber, 
      trackingLink 
    }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async updateOrderBalancePaymentIntent(id: string, paymentIntentId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orders).set({ stripeBalancePaymentIntentId: paymentIntentId }).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async updateOrderFulfillmentStatus(orderId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    
    // Get all items for this order
    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    
    if (items.length === 0) {
      return undefined;
    }
    
    // Count shipped items
    const shippedItems = items.filter(item => 
      item.itemStatus === 'shipped' || item.itemStatus === 'delivered'
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
    
    const result = await this.db.update(orders)
      .set({ fulfillmentStatus })
      .where(eq(orders.id, orderId))
      .returning();
    
    return result[0];
  }

  // Order Items methods
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    await this.ensureInitialized();
    return await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(orderItems.createdAt);
  }

  async getOrderItemById(itemId: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
    return result[0];
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    await this.ensureInitialized();
    const result = await this.db.insert(orderItems).values(item).returning();
    return result[0];
  }

  async createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]> {
    await this.ensureInitialized();
    if (items.length === 0) return [];
    const result = await this.db.insert(orderItems).values(items).returning();
    return result;
  }

  async updateOrderItemStatus(itemId: string, status: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const updateData: any = { 
      itemStatus: status,
      updatedAt: new Date()
    };
    
    // Set timestamps based on status
    if (status === 'shipped') {
      updateData.shippedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }
    
    const result = await this.db.update(orderItems)
      .set(updateData)
      .where(eq(orderItems.id, itemId))
      .returning();
    
    return result[0];
  }

  async updateOrderItemTracking(itemId: string, trackingNumber: string, trackingCarrier?: string, trackingUrl?: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orderItems)
      .set({ 
        trackingNumber,
        trackingCarrier: trackingCarrier || null,
        trackingUrl: trackingUrl || null,
        trackingLink: trackingUrl || null, // Legacy field for backward compatibility
        itemStatus: 'shipped',
        shippedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orderItems.id, itemId))
      .returning();
    
    return result[0];
  }

  async updateOrderItemRefund(itemId: string, refundedQuantity: number, refundedAmount: string, status: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const updateData: any = {
      refundedQuantity,
      refundedAmount,
      itemStatus: status,
      updatedAt: new Date()
    };
    
    // Set timestamps based on status
    if (status === 'returned') {
      updateData.returnedAt = new Date();
    } else if (status === 'refunded') {
      updateData.refundedAt = new Date();
    }
    
    const result = await this.db.update(orderItems)
      .set(updateData)
      .where(eq(orderItems.id, itemId))
      .returning();
    
    return result[0];
  }

  async deleteOrder(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(orders).where(eq(orders.id, id)).returning();
    return result.length > 0;
  }

  async deleteOrderItems(orderId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(orderItems).where(eq(orderItems.orderId, orderId)).returning();
    return result.length > 0;
  }

  // Refund methods
  async createRefund(refund: InsertRefund): Promise<Refund> {
    await this.ensureInitialized();
    const result = await this.db.insert(refunds).values(refund).returning();
    return result[0];
  }

  async getRefund(id: string): Promise<Refund | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(refunds).where(eq(refunds.id, id)).limit(1);
    return result[0];
  }

  async getRefundsByOrderId(orderId: string): Promise<Refund[]> {
    await this.ensureInitialized();
    return await this.db.select().from(refunds).where(eq(refunds.orderId, orderId)).orderBy(desc(refunds.createdAt));
  }

  async updateRefundStatus(id: string, status: string, stripeRefundId?: string): Promise<Refund | undefined> {
    await this.ensureInitialized();
    const updateData: any = { status };
    if (stripeRefundId) {
      updateData.stripeRefundId = stripeRefundId;
    }
    const result = await this.db.update(refunds).set(updateData).where(eq(refunds.id, id)).returning();
    return result[0];
  }

  async updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(orders).set({ paymentStatus }).where(eq(orders.id, orderId)).returning();
    return result[0];
  }

  // Order Events methods - track email and status history
  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    await this.ensureInitialized();
    return await this.db.select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, orderId))
      .orderBy(desc(orderEvents.occurredAt));
  }

  async createOrderEvent(event: InsertOrderEvent): Promise<OrderEvent> {
    await this.ensureInitialized();
    const result = await this.db.insert(orderEvents).values(event).returning();
    return result[0];
  }

  // Order Balance Payments methods - track deposit/balance lifecycle
  async getBalancePaymentsByOrderId(orderId: string): Promise<OrderBalancePayment[]> {
    await this.ensureInitialized();
    return await this.db.select()
      .from(orderBalancePayments)
      .where(eq(orderBalancePayments.orderId, orderId))
      .orderBy(desc(orderBalancePayments.createdAt));
  }

  async getBalancePayment(id: string): Promise<OrderBalancePayment | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select()
      .from(orderBalancePayments)
      .where(eq(orderBalancePayments.id, id))
      .limit(1);
    return result[0];
  }

  async createBalancePayment(payment: InsertOrderBalancePayment): Promise<OrderBalancePayment> {
    await this.ensureInitialized();
    const result = await this.db.insert(orderBalancePayments).values(payment).returning();
    return result[0];
  }

  async updateBalancePayment(id: string, data: Partial<OrderBalancePayment>): Promise<OrderBalancePayment | undefined> {
    await this.ensureInitialized();
    // Filter out undefined properties to prevent NULL clobbering
    const updateData: Record<string, any> = { updatedAt: new Date() };
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });
    const result = await this.db.update(orderBalancePayments)
      .set(updateData)
      .where(eq(orderBalancePayments.id, id))
      .returning();
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return result[0];
  }

  async updateWelcomeEmailSent(userId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(users).set({ welcomeEmailSent: 1, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return await this.db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
    return result[0];
  }

  async getTeamMembersBySellerId(sellerId: string): Promise<User[]> {
    await this.ensureInitialized();
    return await this.db.select().from(users).where(eq(users.sellerId, sellerId)).orderBy(desc(users.createdAt));
  }

  async deleteTeamMember(userId: string, sellerId: string): Promise<boolean> {
    await this.ensureInitialized();
    // Only delete if the user belongs to this seller
    const result = await this.db
      .delete(users)
      .where(and(eq(users.id, userId), eq(users.sellerId, sellerId)))
      .returning();
    return result.length > 0;
  }

  async getUserStoreRole(userId: string, storeOwnerId: string): Promise<UserStoreRole | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(userStoreRoles)
      .where(and(eq(userStoreRoles.userId, userId), eq(userStoreRoles.storeOwnerId, storeOwnerId)))
      .limit(1);
    return result[0];
  }

  async setUserStoreRole(userId: string, storeOwnerId: string, role: "buyer" | "seller" | "owner"): Promise<UserStoreRole> {
    await this.ensureInitialized();
    // Upsert: update if exists, insert if not
    const existing = await this.getUserStoreRole(userId, storeOwnerId);
    if (existing) {
      const result = await this.db
        .update(userStoreRoles)
        .set({ role })
        .where(and(eq(userStoreRoles.userId, userId), eq(userStoreRoles.storeOwnerId, storeOwnerId)))
        .returning();
      return result[0];
    } else {
      const result = await this.db
        .insert(userStoreRoles)
        .values({ userId, storeOwnerId, role })
        .returning();
      return result[0];
    }
  }

  async getUserStoreRoles(userId: string): Promise<UserStoreRole[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(userStoreRoles)
      .where(eq(userStoreRoles.userId, userId));
  }

  // New Auth System - User Store Memberships
  async getUserStoreMembership(userId: string, storeOwnerId: string): Promise<UserStoreMembership | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(userStoreMemberships)
      .where(and(
        eq(userStoreMemberships.userId, userId),
        eq(userStoreMemberships.storeOwnerId, storeOwnerId)
      ))
      .limit(1);
    return result[0];
  }

  async getUserStoreMembershipsByStore(storeOwnerId: string): Promise<UserStoreMembership[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(userStoreMemberships)
      .where(eq(userStoreMemberships.storeOwnerId, storeOwnerId));
  }

  async getUserStoreMembershipsByUser(userId: string): Promise<UserStoreMembership[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(userStoreMemberships)
      .where(eq(userStoreMemberships.userId, userId));
  }

  async createUserStoreMembership(membership: InsertUserStoreMembership): Promise<UserStoreMembership> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(userStoreMemberships)
      .values(membership)
      .returning();
    return result[0];
  }

  async updateUserStoreMembership(id: string, capabilities: any, status?: string): Promise<UserStoreMembership | undefined> {
    await this.ensureInitialized();
    const updates: any = { capabilities };
    if (status) updates.status = status;
    const result = await this.db
      .update(userStoreMemberships)
      .set(updates)
      .where(eq(userStoreMemberships.id, id))
      .returning();
    return result[0];
  }

  async deleteUserStoreMembership(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db
      .delete(userStoreMemberships)
      .where(eq(userStoreMemberships.id, id))
      .returning();
    return result.length > 0;
  }

  // New Auth System - Wholesale Access Grants
  async getWholesaleAccessGrant(buyerId: string, sellerId: string): Promise<WholesaleAccessGrant | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(wholesaleAccessGrants)
      .where(and(
        eq(wholesaleAccessGrants.buyerId, buyerId),
        eq(wholesaleAccessGrants.sellerId, sellerId)
      ))
      .limit(1);
    return result[0];
  }

  async getWholesaleAccessGrantsBySeller(sellerId: string): Promise<WholesaleAccessGrant[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(wholesaleAccessGrants)
      .where(eq(wholesaleAccessGrants.sellerId, sellerId));
  }

  async getWholesaleAccessGrantsByBuyer(buyerId: string): Promise<WholesaleAccessGrant[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(wholesaleAccessGrants)
      .where(eq(wholesaleAccessGrants.buyerId, buyerId));
  }

  async createWholesaleAccessGrant(grant: InsertWholesaleAccessGrant): Promise<WholesaleAccessGrant> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(wholesaleAccessGrants)
      .values(grant)
      .returning();
    return result[0];
  }

  async updateWholesaleAccessGrant(id: string, status: string): Promise<WholesaleAccessGrant | undefined> {
    await this.ensureInitialized();
    const updates: any = { status };
    if (status === 'revoked') {
      updates.revokedAt = new Date();
    }
    const result = await this.db
      .update(wholesaleAccessGrants)
      .set(updates)
      .where(eq(wholesaleAccessGrants.id, id))
      .returning();
    return result[0];
  }

  // New Auth System - Team Invitations
  async getTeamInvitation(id: string): Promise<TeamInvitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.id, id))
      .limit(1);
    return result[0];
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.token, token))
      .limit(1);
    return result[0];
  }

  async getTeamInvitationsByStore(storeOwnerId: string): Promise<TeamInvitation[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.storeOwnerId, storeOwnerId));
  }

  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(teamInvitations)
      .values(invitation)
      .returning();
    return result[0];
  }

  async updateTeamInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<TeamInvitation | undefined> {
    await this.ensureInitialized();
    const updates: any = { status };
    if (acceptedAt) updates.acceptedAt = acceptedAt;
    const result = await this.db
      .update(teamInvitations)
      .set(updates)
      .where(eq(teamInvitations.id, id))
      .returning();
    return result[0];
  }

  // New Auth System - Wholesale Invitations
  async getWholesaleInvitation(id: string): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(wholesaleInvitations)
      .where(eq(wholesaleInvitations.id, id))
      .limit(1);
    return result[0];
  }

  async getWholesaleInvitationByToken(token: string): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(wholesaleInvitations)
      .where(eq(wholesaleInvitations.token, token))
      .limit(1);
    return result[0];
  }

  async getWholesaleInvitationsBySeller(sellerId: string): Promise<WholesaleInvitation[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(wholesaleInvitations)
      .where(eq(wholesaleInvitations.sellerId, sellerId));
  }

  async createWholesaleInvitation(invitation: InsertWholesaleInvitation): Promise<WholesaleInvitation> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(wholesaleInvitations)
      .values(invitation)
      .returning();
    return result[0];
  }

  async updateWholesaleInvitationStatus(id: string, status: string, acceptedAt?: Date): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const updates: any = { status };
    if (acceptedAt) updates.acceptedAt = acceptedAt;
    const result = await this.db
      .update(wholesaleInvitations)
      .set(updates)
      .where(eq(wholesaleInvitations.id, id))
      .returning();
    return result[0];
  }

  // Legacy wholesale invitation methods (for backwards compatibility)
  async getAllWholesaleInvitations(): Promise<WholesaleInvitation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(wholesaleInvitations).orderBy(desc(wholesaleInvitations.createdAt));
  }

  async getWholesaleInvitationsBySellerId(sellerId: string): Promise<WholesaleInvitation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(wholesaleInvitations).where(eq(wholesaleInvitations.sellerId, sellerId)).orderBy(desc(wholesaleInvitations.createdAt));
  }

  async acceptWholesaleInvitation(token: string, buyerUserId: string): Promise<WholesaleInvitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(wholesaleInvitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(wholesaleInvitations.token, token))
      .returning();
    return result[0];
  }

  async deleteWholesaleInvitation(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(wholesaleInvitations).where(eq(wholesaleInvitations.id, id));
    return true;
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    await this.ensureInitialized();
    const result = await this.db.insert(invitations).values(insertInvitation).returning();
    return result[0];
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
    return result[0];
  }

  async updateInvitationStatus(token: string, status: string): Promise<Invitation | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(invitations).set({ status }).where(eq(invitations.token, token)).returning();
    return result[0];
  }

  async getAllInvitations(): Promise<Invitation[]> {
    await this.ensureInitialized();
    return await this.db.select().from(invitations).orderBy(desc(invitations.createdAt));
  }

  async saveMetaSettings(userId: string, settings: Partial<MetaSettings>): Promise<MetaSettings> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(metaSettings)
      .values({
        userId,
        ...settings,
        connected: settings.connected ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: metaSettings.userId,
        set: {
          ...settings,
          connected: settings.connected ? 1 : 0,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async getMetaSettings(userId: string): Promise<MetaSettings | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(metaSettings).where(eq(metaSettings.userId, userId)).limit(1);
    return result[0];
  }

  async deleteMetaSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(metaSettings).where(eq(metaSettings.userId, userId));
    return true;
  }

  async saveTikTokSettings(userId: string, settings: Partial<TikTokSettings>): Promise<TikTokSettings> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(tiktokSettings)
      .values({
        userId,
        ...settings,
      })
      .onConflictDoUpdate({
        target: tiktokSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async getTikTokSettings(userId: string): Promise<TikTokSettings | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(tiktokSettings).where(eq(tiktokSettings.userId, userId)).limit(1);
    return result[0];
  }

  async deleteTikTokSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(tiktokSettings).where(eq(tiktokSettings.userId, userId));
    return true;
  }

  async saveXSettings(userId: string, settings: Partial<XSettings>): Promise<XSettings> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(xSettings)
      .values({
        userId,
        ...settings,
      })
      .onConflictDoUpdate({
        target: xSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async getXSettings(userId: string): Promise<XSettings | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(xSettings).where(eq(xSettings.userId, userId)).limit(1);
    return result[0];
  }

  async deleteXSettings(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(xSettings).where(eq(xSettings.userId, userId));
    return true;
  }

  // Subscriber Groups
  async getSubscriberGroupsByUserId(userId: string): Promise<SubscriberGroup[]> {
    await this.ensureInitialized();
    return await this.db.select().from(subscriberGroups).where(eq(subscriberGroups.userId, userId)).orderBy(desc(subscriberGroups.createdAt));
  }

  async getSubscriberGroup(id: string): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(subscriberGroups).where(eq(subscriberGroups.id, id)).limit(1);
    return result[0];
  }

  async createSubscriberGroup(group: InsertSubscriberGroup): Promise<SubscriberGroup> {
    await this.ensureInitialized();
    const result = await this.db.insert(subscriberGroups).values(group).returning();
    return result[0];
  }

  async updateSubscriberGroup(id: string, data: Partial<SubscriberGroup>): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(subscriberGroups).set(data).where(eq(subscriberGroups.id, id)).returning();
    return result[0];
  }

  async deleteSubscriberGroup(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(subscriberGroups).where(eq(subscriberGroups.id, id));
    return true;
  }

  // Subscribers
  async getSubscribersByUserId(userId: string): Promise<Subscriber[]> {
    await this.ensureInitialized();
    return await this.db.select().from(subscribers).where(eq(subscribers.userId, userId)).orderBy(desc(subscribers.createdAt));
  }

  async getSubscribersByGroupId(userId: string, groupId: string): Promise<Subscriber[]> {
    await this.ensureInitialized();
    // Use SQL join to efficiently get subscribers in a specific group
    const result = await this.db
      .select({ 
        id: subscribers.id,
        userId: subscribers.userId,
        email: subscribers.email,
        name: subscribers.name,
        status: subscribers.status,
        createdAt: subscribers.createdAt
      })
      .from(subscribers)
      .innerJoin(subscriberGroupMemberships, eq(subscribers.id, subscriberGroupMemberships.subscriberId))
      .where(and(eq(subscribers.userId, userId), eq(subscriberGroupMemberships.groupId, groupId)));
    return result as Subscriber[];
  }

  async getSubscriber(id: string): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
    return result[0];
  }

  async getSubscriberByEmail(userId: string, email: string): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(subscribers).where(
      and(eq(subscribers.userId, userId), eq(subscribers.email, email))
    ).limit(1);
    return result[0];
  }

  async createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    await this.ensureInitialized();
    const result = await this.db.insert(subscribers).values(subscriber).returning();
    return result[0];
  }

  async updateSubscriber(id: string, data: Partial<Subscriber>): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(subscribers).set(data).where(eq(subscribers.id, id)).returning();
    return result[0];
  }

  async deleteSubscriber(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(subscribers).where(eq(subscribers.id, id));
    return true;
  }

  async addSubscriberToGroup(subscriberId: string, groupId: string): Promise<SubscriberGroupMembership> {
    await this.ensureInitialized();
    const result = await this.db.insert(subscriberGroupMemberships).values({ subscriberId, groupId }).returning();
    return result[0];
  }

  async removeSubscriberFromGroup(subscriberId: string, groupId: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(subscriberGroupMemberships).where(and(eq(subscriberGroupMemberships.subscriberId, subscriberId), eq(subscriberGroupMemberships.groupId, groupId)));
    return true;
  }

  // Newsletters
  async getNewslettersByUserId(userId: string): Promise<Newsletter[]> {
    await this.ensureInitialized();
    return await this.db.select().from(newsletters).where(eq(newsletters.userId, userId)).orderBy(desc(newsletters.createdAt));
  }

  async getNewsletter(id: string): Promise<Newsletter | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(newsletters).where(eq(newsletters.id, id)).limit(1);
    return result[0];
  }

  async createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    await this.ensureInitialized();
    const result = await this.db.insert(newsletters).values(newsletter).returning();
    return result[0];
  }

  async updateNewsletter(id: string, data: Partial<Newsletter>): Promise<Newsletter | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(newsletters)
      .set(data)
      .where(eq(newsletters.id, id))
      .returning();
    return result[0];
  }

  async deleteNewsletter(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(newsletters).where(eq(newsletters.id, id));
    return true;
  }

  // Newsletter Templates
  async getNewsletterTemplatesByUserId(userId: string): Promise<NewsletterTemplate[]> {
    await this.ensureInitialized();
    return await this.db.select().from(newsletterTemplates).where(eq(newsletterTemplates.userId, userId)).orderBy(desc(newsletterTemplates.updatedAt));
  }

  async getNewsletterTemplate(id: string): Promise<NewsletterTemplate | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(newsletterTemplates).where(eq(newsletterTemplates.id, id)).limit(1);
    return result[0];
  }

  async createNewsletterTemplate(template: InsertNewsletterTemplate): Promise<NewsletterTemplate> {
    await this.ensureInitialized();
    const result = await this.db.insert(newsletterTemplates).values(template).returning();
    return result[0];
  }

  async updateNewsletterTemplate(id: string, data: Partial<NewsletterTemplate>): Promise<NewsletterTemplate | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(newsletterTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(newsletterTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteNewsletterTemplate(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(newsletterTemplates).where(eq(newsletterTemplates.id, id));
    return true;
  }

  // Newsletter Analytics
  async getNewsletterAnalytics(newsletterId: string): Promise<NewsletterAnalytics | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(newsletterAnalytics).where(eq(newsletterAnalytics.newsletterId, newsletterId)).limit(1);
    return result[0];
  }

  async getNewsletterAnalyticsByUserId(userId: string): Promise<NewsletterAnalytics[]> {
    await this.ensureInitialized();
    const result = await this.db
      .select({
        id: newsletterAnalytics.id,
        newsletterId: newsletterAnalytics.newsletterId,
        userId: newsletterAnalytics.userId,
        totalSent: newsletterAnalytics.totalSent,
        totalDelivered: newsletterAnalytics.totalDelivered,
        totalOpened: newsletterAnalytics.totalOpened,
        totalClicked: newsletterAnalytics.totalClicked,
        totalBounced: newsletterAnalytics.totalBounced,
        totalUnsubscribed: newsletterAnalytics.totalUnsubscribed,
        openRate: newsletterAnalytics.openRate,
        clickRate: newsletterAnalytics.clickRate,
        bounceRate: newsletterAnalytics.bounceRate,
        createdAt: newsletterAnalytics.createdAt,
        lastUpdated: newsletterAnalytics.lastUpdated,
        newsletter: newsletters,
      })
      .from(newsletterAnalytics)
      .leftJoin(newsletters, eq(newsletterAnalytics.newsletterId, newsletters.id))
      .where(eq(newsletterAnalytics.userId, userId))
      .orderBy(desc(newsletterAnalytics.createdAt));
    return result as any;
  }

  async createNewsletterAnalytics(analytics: InsertNewsletterAnalytics): Promise<NewsletterAnalytics> {
    await this.ensureInitialized();
    // Use upsert to handle resends without failing
    const existing = await this.getNewsletterAnalytics(analytics.newsletterId);
    if (existing) {
      // Update existing record by adding to totalSent
      const result = await this.db
        .update(newsletterAnalytics)
        .set({
          totalSent: (existing.totalSent || 0) + (analytics.totalSent || 0),
          lastUpdated: new Date(),
        })
        .where(eq(newsletterAnalytics.newsletterId, analytics.newsletterId))
        .returning();
      return result[0];
    }
    const result = await this.db.insert(newsletterAnalytics).values(analytics).returning();
    return result[0];
  }

  async updateNewsletterAnalytics(newsletterId: string, data: Partial<NewsletterAnalytics>): Promise<NewsletterAnalytics | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(newsletterAnalytics).set(data).where(eq(newsletterAnalytics.newsletterId, newsletterId)).returning();
    return result[0];
  }

  // Newsletter Events
  async createNewsletterEvent(event: InsertNewsletterEvent): Promise<NewsletterEvent | null> {
    await this.ensureInitialized();
    try {
      const result = await this.db.insert(newsletterEvents).values(event).returning();
      return result[0];
    } catch (error: any) {
      // Only catch unique constraint violations (duplicate event) - propagate other errors
      if (error.code === '23505' || error.message?.includes('unique constraint')) {
        console.log('[Storage] Duplicate newsletter event, skipping:', event.eventType, event.recipientEmail);
        return null;
      }
      // Re-throw other database errors
      logger.error("[Storage] Newsletter event creation error:", error);
      throw error;
    }
  }

  async getNewsletterEventsByNewsletterId(newsletterId: string): Promise<NewsletterEvent[]> {
    await this.ensureInitialized();
    return await this.db.select().from(newsletterEvents).where(eq(newsletterEvents.newsletterId, newsletterId));
  }

  async getNewsletterEventByWebhookId(webhookEventId: string): Promise<NewsletterEvent | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(newsletterEvents).where(eq(newsletterEvents.webhookEventId, webhookEventId)).limit(1);
    return result[0];
  }

  async createNftMint(nftMint: InsertNftMint): Promise<NftMint> {
    await this.ensureInitialized();
    const result = await this.db.insert(nftMints).values(nftMint).returning();
    return result[0];
  }

  async getNftMintsByUserId(userId: string): Promise<NftMint[]> {
    await this.ensureInitialized();
    return await this.db.select().from(nftMints).where(eq(nftMints.userId, userId)).orderBy(desc(nftMints.createdAt));
  }

  async getNftMintByOrderId(orderId: string): Promise<NftMint | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(nftMints).where(eq(nftMints.orderId, orderId)).limit(1);
    return result[0];
  }

  // Wholesale Products Methods
  async getAllWholesaleProducts(): Promise<WholesaleProduct[]> {
    await this.ensureInitialized();
    return await this.db.select().from(wholesaleProducts).orderBy(desc(wholesaleProducts.createdAt));
  }

  async getWholesaleProductsBySellerId(sellerId: string): Promise<WholesaleProduct[]> {
    await this.ensureInitialized();
    return await this.db.select().from(wholesaleProducts).where(eq(wholesaleProducts.sellerId, sellerId)).orderBy(desc(wholesaleProducts.createdAt));
  }

  async getWholesaleProduct(id: string): Promise<WholesaleProduct | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(wholesaleProducts).where(eq(wholesaleProducts.id, id)).limit(1);
    return result[0];
  }

  async createWholesaleProduct(product: InsertWholesaleProduct): Promise<WholesaleProduct> {
    await this.ensureInitialized();
    const result = await this.db.insert(wholesaleProducts).values(product).returning();
    return result[0];
  }

  async updateWholesaleProduct(id: string, product: Partial<InsertWholesaleProduct>): Promise<WholesaleProduct | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(wholesaleProducts)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(wholesaleProducts.id, id))
      .returning();
    return result[0];
  }

  async deleteWholesaleProduct(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(wholesaleProducts).where(eq(wholesaleProducts.id, id));
    return true;
  }

  // Categories Methods
  async getAllCategories(): Promise<Category[]> {
    await this.ensureInitialized();
    return await this.db.select().from(categories).orderBy(categories.level, categories.name);
  }

  async getCategoriesByLevel(level: number): Promise<Category[]> {
    await this.ensureInitialized();
    return await this.db.select().from(categories).where(eq(categories.level, level)).orderBy(categories.name);
  }

  async getCategoriesByParentId(parentId: string | null): Promise<Category[]> {
    await this.ensureInitialized();
    if (parentId === null) {
      return await this.db.select().from(categories).where(eq(categories.parentId, sql`NULL`)).orderBy(categories.name);
    }
    return await this.db.select().from(categories).where(eq(categories.parentId, parentId)).orderBy(categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    await this.ensureInitialized();
    const result = await this.db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Notification Methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    await this.ensureInitialized();
    const result = await this.db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return result[0];
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(notifications)
      .set({ read: 1 })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async deleteNotification(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(notifications).where(eq(notifications.id, id));
    return true;
  }

  // Auth Token Methods
  async createAuthToken(token: InsertAuthToken): Promise<AuthToken> {
    await this.ensureInitialized();
    const result = await this.db.insert(authTokens).values(token).returning();
    return result[0];
  }

  async getAuthTokenByToken(token: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(authTokens)
      .where(eq(authTokens.token, token))
      .limit(1);
    return result[0];
  }

  async getAuthTokenByCode(email: string, code: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.email, email), eq(authTokens.code, code)))
      .limit(1);
    return result[0];
  }

  async markAuthTokenAsUsed(id: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(authTokens)
      .set({ used: 1 })
      .where(eq(authTokens.id, id))
      .returning();
    return result[0];
  }

  async deleteExpiredAuthTokens(): Promise<number> {
    await this.ensureInitialized();
    const result = await this.db
      .delete(authTokens)
      .where(lt(authTokens.expiresAt, new Date()))
      .returning();
    return result.length;
  }

  // Shipping Matrix Methods
  async getShippingMatricesBySellerId(sellerId: string): Promise<ShippingMatrix[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(shippingMatrices)
      .where(eq(shippingMatrices.sellerId, sellerId))
      .orderBy(desc(shippingMatrices.createdAt));
  }

  async getShippingMatrix(id: string): Promise<ShippingMatrix | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(shippingMatrices)
      .where(eq(shippingMatrices.id, id))
      .limit(1);
    return result[0];
  }

  async createShippingMatrix(matrix: InsertShippingMatrix): Promise<ShippingMatrix> {
    await this.ensureInitialized();
    const result = await this.db.insert(shippingMatrices).values(matrix).returning();
    return result[0];
  }

  async updateShippingMatrix(id: string, matrix: Partial<InsertShippingMatrix>): Promise<ShippingMatrix | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(shippingMatrices)
      .set({ ...matrix, updatedAt: new Date() })
      .where(eq(shippingMatrices.id, id))
      .returning();
    return result[0];
  }

  async deleteShippingMatrix(id: string): Promise<boolean> {
    await this.ensureInitialized();
    // Delete associated zones first
    await this.db.delete(shippingZones).where(eq(shippingZones.matrixId, id));
    // Delete the matrix
    await this.db.delete(shippingMatrices).where(eq(shippingMatrices.id, id));
    return true;
  }

  // Shipping Zone Methods
  async getShippingZonesByMatrixId(matrixId: string): Promise<ShippingZone[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(shippingZones)
      .where(eq(shippingZones.matrixId, matrixId));
  }

  async getShippingZone(id: string): Promise<ShippingZone | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(shippingZones)
      .where(eq(shippingZones.id, id))
      .limit(1);
    return result[0];
  }

  async createShippingZone(zone: InsertShippingZone): Promise<ShippingZone> {
    await this.ensureInitialized();
    const result = await this.db.insert(shippingZones).values(zone).returning();
    return result[0];
  }

  async updateShippingZone(id: string, zone: Partial<InsertShippingZone>): Promise<ShippingZone | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(shippingZones)
      .set(zone)
      .where(eq(shippingZones.id, id))
      .returning();
    return result[0];
  }

  async deleteShippingZone(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(shippingZones).where(eq(shippingZones.id, id));
    return true;
  }

  // Invoice Methods
  async getInvoicesByOrderId(orderId: string): Promise<Invoice[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.orderId, orderId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesBySellerId(sellerId: string): Promise<Invoice[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.sellerId, sellerId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    return result[0];
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceNumber))
      .limit(1);
    return result[0];
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    await this.ensureInitialized();
    const result = await this.db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  // Packing Slip Methods
  async getPackingSlipsByOrderId(orderId: string): Promise<PackingSlip[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(packingSlips)
      .where(eq(packingSlips.orderId, orderId))
      .orderBy(desc(packingSlips.createdAt));
  }

  async getPackingSlipsBySellerId(sellerId: string): Promise<PackingSlip[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(packingSlips)
      .where(eq(packingSlips.sellerId, sellerId))
      .orderBy(desc(packingSlips.createdAt));
  }

  async getPackingSlip(id: string): Promise<PackingSlip | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(packingSlips)
      .where(eq(packingSlips.id, id))
      .limit(1);
    return result[0];
  }

  async getPackingSlipByNumber(packingSlipNumber: string): Promise<PackingSlip | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(packingSlips)
      .where(eq(packingSlips.packingSlipNumber, packingSlipNumber))
      .limit(1);
    return result[0];
  }

  async createPackingSlip(packingSlip: InsertPackingSlip): Promise<PackingSlip> {
    await this.ensureInitialized();
    const result = await this.db.insert(packingSlips).values(packingSlip).returning();
    return result[0];
  }

  // Saved Address Methods
  async getSavedAddressesByUserId(userId: string): Promise<SavedAddress[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(savedAddresses)
      .where(eq(savedAddresses.userId, userId))
      .orderBy(desc(savedAddresses.isDefault), desc(savedAddresses.createdAt));
  }

  async getSavedAddress(id: string): Promise<SavedAddress | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(savedAddresses)
      .where(eq(savedAddresses.id, id))
      .limit(1);
    return result[0];
  }

  async createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress> {
    await this.ensureInitialized();
    const result = await this.db.insert(savedAddresses).values(address).returning();
    return result[0];
  }

  async updateSavedAddress(id: string, address: Partial<InsertSavedAddress>): Promise<SavedAddress | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(savedAddresses)
      .set({ ...address, updatedAt: new Date() })
      .where(eq(savedAddresses.id, id))
      .returning();
    return result[0];
  }

  async deleteSavedAddress(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(savedAddresses).where(eq(savedAddresses.id, id));
    return true;
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    await this.ensureInitialized();
    await this.db
      .update(savedAddresses)
      .set({ isDefault: 0 })
      .where(eq(savedAddresses.userId, userId));
    
    await this.db
      .update(savedAddresses)
      .set({ isDefault: 1, updatedAt: new Date() })
      .where(eq(savedAddresses.id, addressId));
  }

  // Saved Payment Method Methods
  async getSavedPaymentMethodsByUserId(userId: string): Promise<SavedPaymentMethod[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(savedPaymentMethods)
      .where(eq(savedPaymentMethods.userId, userId))
      .orderBy(desc(savedPaymentMethods.isDefault), desc(savedPaymentMethods.createdAt));
  }

  async getSavedPaymentMethod(id: string): Promise<SavedPaymentMethod | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(savedPaymentMethods)
      .where(eq(savedPaymentMethods.id, id))
      .limit(1);
    return result[0];
  }

  async getSavedPaymentMethodByStripeId(stripePaymentMethodId: string): Promise<SavedPaymentMethod | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(savedPaymentMethods)
      .where(eq(savedPaymentMethods.stripePaymentMethodId, stripePaymentMethodId))
      .limit(1);
    return result[0];
  }

  async createSavedPaymentMethod(paymentMethod: InsertSavedPaymentMethod): Promise<SavedPaymentMethod> {
    await this.ensureInitialized();
    const result = await this.db.insert(savedPaymentMethods).values(paymentMethod).returning();
    return result[0];
  }

  async deleteSavedPaymentMethod(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(savedPaymentMethods).where(eq(savedPaymentMethods.id, id));
    return true;
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    await this.ensureInitialized();
    await this.db
      .update(savedPaymentMethods)
      .set({ isDefault: 0 })
      .where(eq(savedPaymentMethods.userId, userId));
    
    await this.db
      .update(savedPaymentMethods)
      .set({ isDefault: 1, updatedAt: new Date() })
      .where(eq(savedPaymentMethods.id, paymentMethodId));
  }

  async getHomepageBySellerId(sellerId: string): Promise<SellerHomepage | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(sellerHomepages)
      .where(eq(sellerHomepages.sellerId, sellerId))
      .limit(1);
    return result[0];
  }

  async createHomepage(homepage: InsertSellerHomepage): Promise<SellerHomepage> {
    await this.ensureInitialized();
    const result = await this.db.insert(sellerHomepages).values(homepage).returning();
    return result[0];
  }

  async updateHomepage(id: string, homepage: Partial<InsertSellerHomepage>): Promise<SellerHomepage | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(sellerHomepages)
      .set({ ...homepage, updatedAt: new Date() })
      .where(eq(sellerHomepages.id, id))
      .returning();
    return result[0];
  }

  async publishHomepage(id: string): Promise<SellerHomepage | undefined> {
    await this.ensureInitialized();
    const homepage = await this.db
      .select()
      .from(sellerHomepages)
      .where(eq(sellerHomepages.id, id))
      .limit(1);
    
    if (!homepage[0]) return undefined;

    const result = await this.db
      .update(sellerHomepages)
      .set({
        status: 'published',
        lastPublishedAt: new Date(),
        publishedDesktopConfig: homepage[0].desktopConfig,
        publishedMobileConfig: homepage[0].mobileConfig,
        updatedAt: new Date()
      })
      .where(eq(sellerHomepages.id, id))
      .returning();
    return result[0];
  }

  async unpublishHomepage(id: string): Promise<SellerHomepage | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(sellerHomepages)
      .set({ status: 'unpublished', updatedAt: new Date() })
      .where(eq(sellerHomepages.id, id))
      .returning();
    return result[0];
  }

  async getAllCtaOptions(): Promise<HomepageCtaOption[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(homepageCtaOptions)
      .where(eq(homepageCtaOptions.isActive, 1))
      .orderBy(homepageCtaOptions.sortOrder);
  }

  async getCtaOption(id: string): Promise<HomepageCtaOption | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(homepageCtaOptions)
      .where(eq(homepageCtaOptions.id, id))
      .limit(1);
    return result[0];
  }

  async getHomepageMedia(homepageId: string): Promise<HomepageMediaAsset[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(homepageMediaAssets)
      .where(eq(homepageMediaAssets.homepageId, homepageId))
      .orderBy(homepageMediaAssets.sortOrder);
  }

  async createHomepageMedia(media: InsertHomepageMediaAsset): Promise<HomepageMediaAsset> {
    await this.ensureInitialized();
    const result = await this.db.insert(homepageMediaAssets).values(media).returning();
    return result[0];
  }

  async deleteHomepageMedia(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(homepageMediaAssets).where(eq(homepageMediaAssets.id, id));
    return true;
  }

  async searchMusicTracks(query: string, genre?: string): Promise<MusicTrack[]> {
    await this.ensureInitialized();
    let conditions = [eq(musicTracks.isActive, 1)];
    
    if (genre) {
      conditions.push(eq(musicTracks.genre, genre));
    }

    return await this.db
      .select()
      .from(musicTracks)
      .where(and(...conditions))
      .limit(50);
  }

  async getMusicTrack(id: string): Promise<MusicTrack | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(musicTracks)
      .where(eq(musicTracks.id, id))
      .limit(1);
    return result[0];
  }

  async createMusicTrack(track: InsertMusicTrack): Promise<MusicTrack> {
    await this.ensureInitialized();
    const result = await this.db.insert(musicTracks).values(track).returning();
    return result[0];
  }

  // Payment Intent Methods
  async getPaymentIntent(id: string): Promise<PaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, id))
      .limit(1);
    return result[0];
  }

  async getPaymentIntentByIdempotencyKey(idempotencyKey: string): Promise<PaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.idempotencyKey, idempotencyKey))
      .limit(1);
    return result[0];
  }

  async getPaymentIntentByProviderIntentId(providerIntentId: string): Promise<PaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.providerIntentId, providerIntentId))
      .limit(1);
    return result[0];
  }

  async storePaymentIntent(intent: InsertPaymentIntent): Promise<PaymentIntent> {
    await this.ensureInitialized();
    const result = await this.db.insert(paymentIntents).values(intent).returning();
    return result[0];
  }

  async updatePaymentIntentStatus(id: string, status: string): Promise<PaymentIntent | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(paymentIntents)
      .set({ status, updatedAt: new Date() })
      .where(eq(paymentIntents.id, id))
      .returning();
    return result[0];
  }

  // Webhook Event Methods
  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.id, eventId))
      .limit(1);
    return result.length > 0;
  }

  async markWebhookEventProcessed(eventId: string, payload: any, eventType: string, providerName: string): Promise<void> {
    await this.ensureInitialized();
    await this.db.insert(webhookEvents).values({
      id: eventId,
      providerName,
      eventType,
      payload,
      processedAt: new Date(),
    });
  }

  async storeFailedWebhookEvent(event: InsertFailedWebhookEvent): Promise<FailedWebhookEvent> {
    await this.ensureInitialized();
    const result = await this.db.insert(failedWebhookEvents).values(event).returning();
    return result[0];
  }

  async getUnprocessedFailedWebhooks(limit: number = 10): Promise<FailedWebhookEvent[]> {
    await this.ensureInitialized();
    return await this.db
      .select()
      .from(failedWebhookEvents)
      .where(lt(failedWebhookEvents.retryCount, 3))
      .orderBy(failedWebhookEvents.createdAt)
      .limit(limit);
  }

  async incrementWebhookRetryCount(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db
      .update(failedWebhookEvents)
      .set({ 
        retryCount: sql`${failedWebhookEvents.retryCount} + 1`,
        lastRetryAt: new Date(),
      })
      .where(eq(failedWebhookEvents.id, id));
  }

  async deleteFailedWebhookEvent(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db
      .delete(failedWebhookEvents)
      .where(eq(failedWebhookEvents.id, id));
  }
}

export const storage = new DatabaseStorage();
