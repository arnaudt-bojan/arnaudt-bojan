import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { products, users } from '@prisma/client';
import { GraphQLContext } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO 8601 date-time string (e.g., "2025-10-19T19:22:00Z") */
  DateTime: { input: any; output: any; }
  /** Precise decimal values for currency and percentages (e.g., "19.99") */
  Decimal: { input: any; output: any; }
  /** Arbitrary JSON data for flexible object storage */
  JSON: { input: any; output: any; }
  /** Validated URL string (e.g., "https://example.com") */
  URL: { input: any; output: any; }
};

export type AddSubscriberInput = {
  customFields?: InputMaybe<Scalars['JSON']['input']>;
  email: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  segmentIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type AddToCartInput = {
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
  sellerId: Scalars['ID']['input'];
  sessionId?: InputMaybe<Scalars['String']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

/** Physical address */
export type Address = {
  __typename?: 'Address';
  addressLine1: Scalars['String']['output'];
  addressLine2?: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  postalCode: Scalars['String']['output'];
  state: Scalars['String']['output'];
};

export type AddressInput = {
  addressLine1: Scalars['String']['input'];
  addressLine2?: InputMaybe<Scalars['String']['input']>;
  city: Scalars['String']['input'];
  country: Scalars['String']['input'];
  fullName: Scalars['String']['input'];
  phone?: InputMaybe<Scalars['String']['input']>;
  postalCode: Scalars['String']['input'];
  state: Scalars['String']['input'];
};

/** Authentication token for login */
export type AuthToken = {
  __typename?: 'AuthToken';
  code?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  sellerContext?: Maybe<Scalars['String']['output']>;
  token: Scalars['String']['output'];
  tokenType?: Maybe<Scalars['String']['output']>;
  used: Scalars['Boolean']['output'];
};

/** Automation execution record */
export type AutomationExecution = {
  __typename?: 'AutomationExecution';
  /** Actions performed */
  actionsTaken?: Maybe<Scalars['JSON']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  executedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  subscriber?: Maybe<Subscriber>;
  subscriberEmail?: Maybe<Scalars['String']['output']>;
  subscriberId?: Maybe<Scalars['ID']['output']>;
  /** Trigger data */
  triggerData?: Maybe<Scalars['JSON']['output']>;
  workflow: AutomationWorkflow;
  workflowId: Scalars['ID']['output'];
};

/** Automated email workflow */
export type AutomationWorkflow = {
  __typename?: 'AutomationWorkflow';
  /** Workflow actions */
  actions: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** Execution history */
  executions: Array<AutomationExecution>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  sellerId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  /** Trigger conditions */
  trigger: Scalars['JSON']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Background job execution */
export type BackgroundJobRun = {
  __typename?: 'BackgroundJobRun';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  duration?: Maybe<Scalars['Int']['output']>;
  /** Error details */
  errorMessage?: Maybe<Scalars['String']['output']>;
  errorStack?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Job name */
  jobName: Scalars['String']['output'];
  /** Job metadata */
  metadata?: Maybe<Scalars['JSON']['output']>;
  nextRetryAt?: Maybe<Scalars['DateTime']['output']>;
  recordsFailed: Scalars['Int']['output'];
  /** Processing stats */
  recordsProcessed: Scalars['Int']['output'];
  /** Retry tracking */
  retryCount: Scalars['Int']['output'];
  /** Timing */
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: BackgroundJobStatus;
};

export type BackgroundJobRunConnection = {
  __typename?: 'BackgroundJobRunConnection';
  edges: Array<BackgroundJobRunEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type BackgroundJobRunEdge = {
  __typename?: 'BackgroundJobRunEdge';
  cursor: Scalars['String']['output'];
  node: BackgroundJobRun;
};

export enum BackgroundJobStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING'
}

/** Buyer profile for B2B wholesale customers */
export type BuyerProfile = {
  __typename?: 'BuyerProfile';
  billingAddress?: Maybe<Address>;
  companyName?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Credit limit for wholesale purchases */
  creditLimit?: Maybe<Scalars['Decimal']['output']>;
  /** Default payment terms (e.g., "Net 30") */
  defaultPaymentTerms?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  shippingAddress?: Maybe<Address>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['ID']['output'];
  vatNumber?: Maybe<Scalars['String']['output']>;
};

export enum CampaignStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Draft = 'DRAFT',
  Failed = 'FAILED',
  Paused = 'PAUSED',
  PendingPayment = 'PENDING_PAYMENT'
}

/** Shopping cart */
export type Cart = {
  __typename?: 'Cart';
  buyer?: Maybe<User>;
  /** Buyer ID if logged in */
  buyerId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Current session associated with cart */
  currentSession?: Maybe<CartSession>;
  id: Scalars['ID']['output'];
  /** Number of items in cart */
  itemCount: Scalars['Int']['output'];
  /** Cart line items */
  items: Array<CartItem>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  /** Cart status */
  status: Scalars['String']['output'];
  /** Cart subtotal */
  subtotal: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Single item in shopping cart */
export type CartItem = {
  __typename?: 'CartItem';
  lineTotal: Scalars['Decimal']['output'];
  product: Product;
  productId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  /** Stock reservation for this cart item */
  reservation?: Maybe<StockReservation>;
  unitPrice: Scalars['Decimal']['output'];
  variant?: Maybe<ProductVariant>;
  variantId?: Maybe<Scalars['ID']['output']>;
};

/** Cart session for anonymous users */
export type CartSession = {
  __typename?: 'CartSession';
  cart: Cart;
  cartId: Scalars['ID']['output'];
  lastSeen: Scalars['DateTime']['output'];
  sessionId: Scalars['ID']['output'];
};

/** Product category for organization */
export type Category = {
  __typename?: 'Category';
  /** Child categories */
  children: Array<Category>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Nesting level (0 = top-level) */
  level: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  parent?: Maybe<Category>;
  /** Parent category for hierarchical organization */
  parentId?: Maybe<Scalars['ID']['output']>;
  slug: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Checkout session with pricing and payment */
export type CheckoutSession = {
  __typename?: 'CheckoutSession';
  /** Billing address */
  billingAddress?: Maybe<Address>;
  cart: Cart;
  cartId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** Currency for checkout */
  currency: Currency;
  /** Session expiration */
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  paymentIntent?: Maybe<PaymentIntent>;
  /** Payment intent for processing */
  paymentIntentId?: Maybe<Scalars['ID']['output']>;
  /** Shipping address */
  shippingAddress?: Maybe<Address>;
  shippingCost: Scalars['Decimal']['output'];
  /** Checkout session status */
  status: Scalars['String']['output'];
  /** Pricing breakdown */
  subtotal: Scalars['Decimal']['output'];
  taxAmount: Scalars['Decimal']['output'];
  total: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ConnectDomainInput = {
  domain: Scalars['String']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreateCheckoutSessionInput = {
  billingAddress?: InputMaybe<AddressInput>;
  cartId: Scalars['ID']['input'];
  shippingAddress: AddressInput;
};

export type CreateNewsletterCampaignInput = {
  fromEmail: Scalars['String']['input'];
  fromName: Scalars['String']['input'];
  htmlContent: Scalars['String']['input'];
  name: Scalars['String']['input'];
  scheduledAt?: InputMaybe<Scalars['DateTime']['input']>;
  segmentIds: Array<Scalars['ID']['input']>;
  subject: Scalars['String']['input'];
};

export type CreateOrderInput = {
  billingAddress?: InputMaybe<AddressInput>;
  buyerNotes?: InputMaybe<Scalars['String']['input']>;
  cartId: Scalars['ID']['input'];
  paymentMethodId: Scalars['String']['input'];
  shippingAddress: AddressInput;
};

export type CreateProductInput = {
  category: Scalars['String']['input'];
  description: Scalars['String']['input'];
  flatShippingRate?: InputMaybe<Scalars['Decimal']['input']>;
  image: Scalars['URL']['input'];
  images?: InputMaybe<Array<Scalars['URL']['input']>>;
  name: Scalars['String']['input'];
  price: Scalars['Decimal']['input'];
  productType: Scalars['String']['input'];
  shippingType?: InputMaybe<Scalars['String']['input']>;
  sku?: InputMaybe<Scalars['String']['input']>;
  stock: Scalars['Int']['input'];
  variants?: InputMaybe<Scalars['JSON']['input']>;
};

export type CreateQuotationInput = {
  buyerEmail: Scalars['String']['input'];
  deliveryTerms?: InputMaybe<Scalars['String']['input']>;
  depositPercentage: Scalars['Int']['input'];
  items: Array<QuotationLineItemInput>;
  paymentTerms?: InputMaybe<Scalars['String']['input']>;
  validUntil?: InputMaybe<Scalars['DateTime']['input']>;
};

export type CreateWholesaleInvitationInput = {
  buyerEmail: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
};

export enum Currency {
  Aud = 'AUD',
  Cad = 'CAD',
  Cny = 'CNY',
  Eur = 'EUR',
  Gbp = 'GBP',
  Inr = 'INR',
  Jpy = 'JPY',
  Usd = 'USD'
}

/** Custom domain connection */
export type DomainConnection = {
  __typename?: 'DomainConnection';
  /** Cloudflare integration */
  cloudflareCustomHostnameId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  dnsInstructions?: Maybe<Scalars['JSON']['output']>;
  /** Domain name */
  domain: Scalars['String']['output'];
  failureCode?: Maybe<Scalars['String']['output']>;
  /** Failure tracking */
  failureReason?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Primary domain flag */
  isPrimary: Scalars['Boolean']['output'];
  lastCheckedAt?: Maybe<Scalars['DateTime']['output']>;
  lastVerifiedAt?: Maybe<Scalars['DateTime']['output']>;
  normalizedDomain: Scalars['String']['output'];
  retryCount: Scalars['Int']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  sslExpiresAt?: Maybe<Scalars['DateTime']['output']>;
  sslIssuedAt?: Maybe<Scalars['DateTime']['output']>;
  sslProvider?: Maybe<Scalars['String']['output']>;
  sslRenewAt?: Maybe<Scalars['DateTime']['output']>;
  /** SSL certificate */
  sslStatus?: Maybe<Scalars['String']['output']>;
  status: DomainStatus;
  /** Connection strategy */
  strategy: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** Verification */
  verificationToken: Scalars['String']['output'];
};

export type DomainConnectionConnection = {
  __typename?: 'DomainConnectionConnection';
  edges: Array<DomainConnectionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type DomainConnectionEdge = {
  __typename?: 'DomainConnectionEdge';
  cursor: Scalars['String']['output'];
  node: DomainConnection;
};

export enum DomainStatus {
  Active = 'ACTIVE',
  Deactivated = 'DEACTIVATED',
  DnsVerified = 'DNS_VERIFIED',
  Error = 'ERROR',
  PendingVerification = 'PENDING_VERIFICATION',
  SslProvisioning = 'SSL_PROVISIONING'
}

/** Fulfillment event for order processing */
export type FulfillmentEvent = {
  __typename?: 'FulfillmentEvent';
  carrier?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Items being fulfilled */
  items: Array<OrderItem>;
  /** Fulfillment notes */
  notes?: Maybe<Scalars['String']['output']>;
  order: Order;
  orderId: Scalars['ID']['output'];
  status: FulfillmentStatus;
  /** Tracking information */
  trackingNumber?: Maybe<Scalars['String']['output']>;
};

export enum FulfillmentStatus {
  Delivered = 'DELIVERED',
  Fulfilled = 'FULFILLED',
  InTransit = 'IN_TRANSIT',
  PartiallyFulfilled = 'PARTIALLY_FULFILLED',
  Unfulfilled = 'UNFULFILLED'
}

export enum InventoryStatus {
  Backorder = 'BACKORDER',
  Discontinued = 'DISCONTINUED',
  InStock = 'IN_STOCK',
  LowStock = 'LOW_STOCK',
  OutOfStock = 'OUT_OF_STOCK'
}

/** Invoice document */
export type Invoice = {
  __typename?: 'Invoice';
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  documentType: Scalars['String']['output'];
  /** Document URL */
  documentUrl: Scalars['URL']['output'];
  /** Generation metadata */
  generatedBy?: Maybe<Scalars['ID']['output']>;
  generationTrigger: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  incoterms?: Maybe<Scalars['String']['output']>;
  invoiceNumber: Scalars['String']['output'];
  order: Order;
  orderId: Scalars['ID']['output'];
  /** Order type (retail or wholesale) */
  orderType: Scalars['String']['output'];
  paymentTerms?: Maybe<Scalars['String']['output']>;
  /** B2B invoice fields */
  poNumber?: Maybe<Scalars['String']['output']>;
  sellerId: Scalars['ID']['output'];
  taxAmount: Scalars['Decimal']['output'];
  /** Invoice totals */
  totalAmount: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
  vatNumber?: Maybe<Scalars['String']['output']>;
};

export type IssueRefundInput = {
  lineItems: Array<RefundLineItemInput>;
  orderId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type LaunchMetaCampaignInput = {
  adCopy: Scalars['String']['input'];
  campaignName: Scalars['String']['input'];
  dailyBudget: Scalars['Decimal']['input'];
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  headline: Scalars['String']['input'];
  productIds: Array<Scalars['ID']['input']>;
  startDate: Scalars['DateTime']['input'];
  targetCountries: Array<Scalars['String']['input']>;
  totalBudget: Scalars['Decimal']['input'];
};

/** Marketing audience segment */
export type MarketingAudience = {
  __typename?: 'MarketingAudience';
  /** Campaigns using this audience */
  campaigns: Array<MetaCampaign>;
  createdAt: Scalars['DateTime']['output'];
  /** Audience targeting criteria */
  criteria: Scalars['JSON']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** Estimated audience size */
  estimatedSize?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  sellerId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Meta ad account connection */
export type MetaAdAccount = {
  __typename?: 'MetaAdAccount';
  /** Access token */
  accessToken: Scalars['String']['output'];
  /** Account details */
  businessName?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency?: Maybe<Currency>;
  id: Scalars['ID']['output'];
  /** Selected for use */
  isSelected: Scalars['Boolean']['output'];
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Meta ad account ID */
  metaAdAccountId: Scalars['String']['output'];
  /** Meta user ID */
  metaUserId: Scalars['String']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  timezone?: Maybe<Scalars['String']['output']>;
  tokenExpiresAt?: Maybe<Scalars['DateTime']['output']>;
  totalRevenue: Scalars['Decimal']['output'];
  /** Spending totals */
  totalSpent: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Meta ad set within a campaign */
export type MetaAdSet = {
  __typename?: 'MetaAdSet';
  /** Budget allocation */
  budget: Scalars['Decimal']['output'];
  campaign: MetaCampaign;
  campaignId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** Creatives in this ad set */
  creatives: Array<MetaCreative>;
  id: Scalars['ID']['output'];
  /** Meta ad set ID */
  metaAdSetId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
  /** Targeting configuration */
  targeting: Scalars['JSON']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Meta (Facebook/Instagram) advertising campaign */
export type MetaCampaign = {
  __typename?: 'MetaCampaign';
  /** Ad creative */
  adCopy: Scalars['String']['output'];
  /** Ad sets */
  adSets: Array<MetaAdSet>;
  advantageAudience: Scalars['Boolean']['output'];
  advantagePlacements: Scalars['Boolean']['output'];
  /** Advantage+ settings */
  advantagePlusEnabled: Scalars['Boolean']['output'];
  /** Financial tracking */
  amountCharged: Scalars['Decimal']['output'];
  callToAction: Scalars['String']['output'];
  campaignName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** Budget */
  dailyBudget: Scalars['Decimal']['output'];
  /** Daily performance data */
  dailyMetrics: Array<MetaDailyMetrics>;
  endDate?: Maybe<Scalars['DateTime']['output']>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  headline: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Sync status */
  lastSyncAt?: Maybe<Scalars['DateTime']['output']>;
  /** Meta campaign ID */
  metaCampaignId?: Maybe<Scalars['String']['output']>;
  metaSpend: Scalars['Decimal']['output'];
  /** Performance metrics */
  metrics: MetaCampaignMetrics;
  /** Campaign objective */
  objective: Scalars['String']['output'];
  platformFee: Scalars['Decimal']['output'];
  /** Targeted products */
  productIds: Array<Scalars['ID']['output']>;
  products: Array<Product>;
  remainingBudget: Scalars['Decimal']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  /** Campaign schedule */
  startDate: Scalars['DateTime']['output'];
  status: CampaignStatus;
  /** Stripe payment intent */
  stripePaymentIntentId?: Maybe<Scalars['String']['output']>;
  targetAgeMax?: Maybe<Scalars['Int']['output']>;
  targetAgeMin?: Maybe<Scalars['Int']['output']>;
  /** Targeting */
  targetCountries: Array<Scalars['String']['output']>;
  targetGender?: Maybe<Scalars['String']['output']>;
  targetLanguages: Array<Scalars['String']['output']>;
  totalBudget: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type MetaCampaignConnection = {
  __typename?: 'MetaCampaignConnection';
  edges: Array<MetaCampaignEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type MetaCampaignEdge = {
  __typename?: 'MetaCampaignEdge';
  cursor: Scalars['String']['output'];
  node: MetaCampaign;
};

/** Aggregated campaign metrics */
export type MetaCampaignMetrics = {
  __typename?: 'MetaCampaignMetrics';
  clicks: Scalars['Int']['output'];
  /** Conversion rate */
  conversionRate: Scalars['Decimal']['output'];
  conversions: Scalars['Int']['output'];
  /** Cost per click */
  cpc: Scalars['Decimal']['output'];
  /** Cost per mille (1000 impressions) */
  cpm: Scalars['Decimal']['output'];
  /** Click-through rate */
  ctr: Scalars['Decimal']['output'];
  impressions: Scalars['Int']['output'];
  reach: Scalars['Int']['output'];
  /** Revenue attributed to campaign */
  revenue: Scalars['Decimal']['output'];
  /** Return on ad spend */
  roas: Scalars['Decimal']['output'];
  /** Total spend */
  spend: Scalars['Decimal']['output'];
};

/** Meta ad creative */
export type MetaCreative = {
  __typename?: 'MetaCreative';
  adCopy: Scalars['String']['output'];
  adSet: MetaAdSet;
  adSetId: Scalars['ID']['output'];
  callToAction: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  headline: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Creative content */
  imageUrl?: Maybe<Scalars['URL']['output']>;
  /** Meta creative ID */
  metaCreativeId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  videoUrl?: Maybe<Scalars['URL']['output']>;
};

/** Daily performance metrics */
export type MetaDailyMetrics = {
  __typename?: 'MetaDailyMetrics';
  clicks: Scalars['Int']['output'];
  comments: Scalars['Int']['output'];
  conversions: Scalars['Int']['output'];
  cpc: Scalars['Decimal']['output'];
  cpm: Scalars['Decimal']['output'];
  date: Scalars['DateTime']['output'];
  frequency: Scalars['Decimal']['output'];
  impressions: Scalars['Int']['output'];
  /** Engagement metrics */
  likes: Scalars['Int']['output'];
  /** Link metrics */
  linkClicks: Scalars['Int']['output'];
  /** Revenue metrics */
  purchases: Scalars['Int']['output'];
  reach: Scalars['Int']['output'];
  revenue: Scalars['Decimal']['output'];
  saves: Scalars['Int']['output'];
  shares: Scalars['Int']['output'];
  spend: Scalars['Decimal']['output'];
  websiteVisits: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Accept wholesale invitation */
  acceptInvitation: WholesaleAccessGrant;
  /** Accept quotation (buyer) */
  acceptQuotation: Quotation;
  /** Add subscriber */
  addSubscriber: Subscriber;
  /** Add item to cart */
  addToCart: Cart;
  /** Cancel campaign */
  cancelCampaign: MetaCampaign;
  /** Cancel quotation */
  cancelQuotation: Quotation;
  /** Cancel subscription */
  cancelSubscription: SellerSubscription;
  /** Capture payment for order */
  capturePayment: Order;
  /** Clear entire cart */
  clearCart: Scalars['Boolean']['output'];
  /** Connect custom domain */
  connectDomain: DomainConnection;
  /** Connect Meta ad account */
  connectMetaAdAccount: MetaAdAccount;
  /** Create checkout session */
  createCheckoutSession: CheckoutSession;
  /** Create newsletter campaign */
  createNewsletterCampaign: NewsletterCampaign;
  /** Create order from cart */
  createOrder: Order;
  /** Create new product */
  createProduct: Product;
  /** Create new quotation */
  createQuotation: Quotation;
  /** Create segment */
  createSegment: Segment;
  /** Create or update subscription */
  createSubscription: SellerSubscription;
  /** Create wholesale invitation */
  createWholesaleInvitation: WholesaleInvitation;
  /** Delete address */
  deleteAddress: Scalars['Boolean']['output'];
  /** Delete payment method */
  deletePaymentMethod: Scalars['Boolean']['output'];
  /** Delete product */
  deleteProduct: Scalars['Boolean']['output'];
  /** Delete segment */
  deleteSegment: Scalars['Boolean']['output'];
  /** Disconnect domain */
  disconnectDomain: Scalars['Boolean']['output'];
  /** Disconnect Meta ad account */
  disconnectMetaAdAccount: Scalars['Boolean']['output'];
  /** Generate invoice for order */
  generateInvoice: Invoice;
  /** Generate packing slip for order */
  generatePackingSlip: PackingSlip;
  /** Issue refund for order */
  issueRefund: Refund;
  /** Launch new Meta campaign */
  launchMetaCampaign: MetaCampaign;
  /** Send login code via email */
  login: AuthToken;
  /** Logout current user */
  logout: Scalars['Boolean']['output'];
  /** Mark all notifications as read */
  markAllNotificationsRead: Scalars['Boolean']['output'];
  /** Mark notification as read */
  markNotificationRead: Notification;
  /** Pause campaign */
  pauseCampaign: MetaCampaign;
  /** Pay quotation balance */
  payQuotationBalance: QuotationPayment;
  /** Pay quotation deposit */
  payQuotationDeposit: QuotationPayment;
  /** Place wholesale order */
  placeWholesaleOrder: WholesaleOrder;
  /** Purchase shipping label */
  purchaseShippingLabel: ShippingLabel;
  /** Reject wholesale invitation */
  rejectInvitation: Scalars['Boolean']['output'];
  /** Release stock reservation */
  releaseStock: Scalars['Boolean']['output'];
  /** Remove item from cart */
  removeFromCart: Cart;
  /** Request balance payment for wholesale order */
  requestWholesaleBalance: WholesaleOrder;
  /** Reserve stock for cart/checkout */
  reserveStock: StockReservation;
  /** Resume campaign */
  resumeCampaign: MetaCampaign;
  /** Save address */
  saveAddress: SavedAddress;
  /** Save payment method */
  savePaymentMethod: StoredPaymentMethod;
  /** Send newsletter campaign */
  sendCampaign: NewsletterCampaign;
  /** Set primary domain */
  setPrimaryDomain: DomainConnection;
  /** Submit quotation to buyer */
  submitQuotation: Quotation;
  /** Unsubscribe email */
  unsubscribe: Scalars['Boolean']['output'];
  /** Update campaign budget */
  updateBudget: MetaCampaign;
  /** Update cart item quantity */
  updateCartItem: Cart;
  /** Update order fulfillment */
  updateFulfillment: Order;
  /** Update payment method for subscription */
  updatePaymentMethod: SellerSubscription;
  /** Update existing product */
  updateProduct: Product;
  /** Update user profile */
  updateProfile: User;
  /** Update quotation */
  updateQuotation: Quotation;
  /** Update segment */
  updateSegment: Segment;
  /** Update seller account */
  updateSellerAccount: SellerAccount;
  /** Verify domain DNS */
  verifyDomain: DomainConnection;
  /** Verify login code and create session */
  verifyLoginCode: User;
};


export type MutationAcceptInvitationArgs = {
  token: Scalars['String']['input'];
};


export type MutationAcceptQuotationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAddSubscriberArgs = {
  input: AddSubscriberInput;
};


export type MutationAddToCartArgs = {
  input: AddToCartInput;
};


export type MutationCancelCampaignArgs = {
  campaignId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCancelQuotationArgs = {
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCancelSubscriptionArgs = {
  subscriptionId: Scalars['ID']['input'];
};


export type MutationCapturePaymentArgs = {
  orderId: Scalars['ID']['input'];
  paymentIntentId: Scalars['ID']['input'];
};


export type MutationClearCartArgs = {
  cartId: Scalars['ID']['input'];
};


export type MutationConnectDomainArgs = {
  input: ConnectDomainInput;
};


export type MutationConnectMetaAdAccountArgs = {
  accessToken: Scalars['String']['input'];
  metaAdAccountId: Scalars['String']['input'];
};


export type MutationCreateCheckoutSessionArgs = {
  input: CreateCheckoutSessionInput;
};


export type MutationCreateNewsletterCampaignArgs = {
  input: CreateNewsletterCampaignInput;
};


export type MutationCreateOrderArgs = {
  input: CreateOrderInput;
};


export type MutationCreateProductArgs = {
  input: CreateProductInput;
};


export type MutationCreateQuotationArgs = {
  input: CreateQuotationInput;
};


export type MutationCreateSegmentArgs = {
  criteria: Scalars['JSON']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationCreateSubscriptionArgs = {
  paymentMethodId: Scalars['String']['input'];
  tier: SubscriptionTier;
};


export type MutationCreateWholesaleInvitationArgs = {
  input: CreateWholesaleInvitationInput;
};


export type MutationDeleteAddressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePaymentMethodArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProductArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSegmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDisconnectDomainArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDisconnectMetaAdAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationGenerateInvoiceArgs = {
  orderId: Scalars['ID']['input'];
};


export type MutationGeneratePackingSlipArgs = {
  orderId: Scalars['ID']['input'];
};


export type MutationIssueRefundArgs = {
  input: IssueRefundInput;
};


export type MutationLaunchMetaCampaignArgs = {
  input: LaunchMetaCampaignInput;
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  sellerContext?: InputMaybe<Scalars['String']['input']>;
};


export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPauseCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


export type MutationPayQuotationBalanceArgs = {
  id: Scalars['ID']['input'];
  paymentMethodId: Scalars['String']['input'];
};


export type MutationPayQuotationDepositArgs = {
  id: Scalars['ID']['input'];
  paymentMethodId: Scalars['String']['input'];
};


export type MutationPlaceWholesaleOrderArgs = {
  input: PlaceWholesaleOrderInput;
};


export type MutationPurchaseShippingLabelArgs = {
  orderId: Scalars['ID']['input'];
  rateId: Scalars['String']['input'];
};


export type MutationRejectInvitationArgs = {
  token: Scalars['String']['input'];
};


export type MutationReleaseStockArgs = {
  reservationId: Scalars['ID']['input'];
};


export type MutationRemoveFromCartArgs = {
  cartId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
  variantId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationRequestWholesaleBalanceArgs = {
  orderId: Scalars['ID']['input'];
};


export type MutationReserveStockArgs = {
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
  sessionId?: InputMaybe<Scalars['String']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationResumeCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


export type MutationSaveAddressArgs = {
  address: AddressInput;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSavePaymentMethodArgs = {
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  paymentMethodId: Scalars['String']['input'];
};


export type MutationSendCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


export type MutationSetPrimaryDomainArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSubmitQuotationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnsubscribeArgs = {
  email: Scalars['String']['input'];
};


export type MutationUpdateBudgetArgs = {
  input: UpdateCampaignBudgetInput;
};


export type MutationUpdateCartItemArgs = {
  cartId: Scalars['ID']['input'];
  input: UpdateCartItemInput;
};


export type MutationUpdateFulfillmentArgs = {
  input: UpdateOrderFulfillmentInput;
};


export type MutationUpdatePaymentMethodArgs = {
  paymentMethodId: Scalars['String']['input'];
  subscriptionId: Scalars['ID']['input'];
};


export type MutationUpdateProductArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
};


export type MutationUpdateProfileArgs = {
  fullName?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  profileImageUrl?: InputMaybe<Scalars['URL']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateQuotationArgs = {
  id: Scalars['ID']['input'];
  input: UpdateQuotationInput;
};


export type MutationUpdateSegmentArgs = {
  criteria?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateSellerAccountArgs = {
  brandColor?: InputMaybe<Scalars['String']['input']>;
  businessEmail?: InputMaybe<Scalars['String']['input']>;
  businessName?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['URL']['input']>;
  storeName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationVerifyDomainArgs = {
  id: Scalars['ID']['input'];
};


export type MutationVerifyLoginCodeArgs = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
};

/** Email newsletter campaign */
export type NewsletterCampaign = {
  __typename?: 'NewsletterCampaign';
  bounceCount: Scalars['Int']['output'];
  bounceRate: Scalars['Decimal']['output'];
  clickCount: Scalars['Int']['output'];
  clickRate: Scalars['Decimal']['output'];
  createdAt: Scalars['DateTime']['output'];
  deliveredCount: Scalars['Int']['output'];
  fromEmail: Scalars['String']['output'];
  /** Sender information */
  fromName: Scalars['String']['output'];
  /** Email content */
  htmlContent: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  openCount: Scalars['Int']['output'];
  /** Calculated rates */
  openRate: Scalars['Decimal']['output'];
  /** Campaign statistics */
  recipientCount: Scalars['Int']['output'];
  replyToEmail?: Maybe<Scalars['String']['output']>;
  /** Scheduling */
  scheduledAt?: Maybe<Scalars['DateTime']['output']>;
  /** Recipient segments */
  segments: Array<Segment>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  sentAt?: Maybe<Scalars['DateTime']['output']>;
  sentCount: Scalars['Int']['output'];
  /** Campaign status */
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  template?: Maybe<NewsletterTemplate>;
  /** Template used */
  templateId?: Maybe<Scalars['ID']['output']>;
  textContent?: Maybe<Scalars['String']['output']>;
  unsubscribeCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type NewsletterCampaignConnection = {
  __typename?: 'NewsletterCampaignConnection';
  edges: Array<NewsletterCampaignEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type NewsletterCampaignEdge = {
  __typename?: 'NewsletterCampaignEdge';
  cursor: Scalars['String']['output'];
  node: NewsletterCampaign;
};

/** Newsletter email template */
export type NewsletterTemplate = {
  __typename?: 'NewsletterTemplate';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** Template content */
  htmlContent: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  sellerId: Scalars['ID']['output'];
  textContent?: Maybe<Scalars['String']['output']>;
  /** Preview image */
  thumbnailUrl?: Maybe<Scalars['URL']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  /** Template variables */
  variables: Array<Scalars['String']['output']>;
};

/** Notification for users */
export type Notification = {
  __typename?: 'Notification';
  /** Action URL */
  actionUrl?: Maybe<Scalars['URL']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Read status */
  isRead: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  readAt?: Maybe<Scalars['DateTime']['output']>;
  relatedEntityId?: Maybe<Scalars['ID']['output']>;
  /** Related entity */
  relatedEntityType?: Maybe<Scalars['String']['output']>;
  /** Notification content */
  title: Scalars['String']['output'];
  /** Notification type */
  type: Scalars['String']['output'];
  user: User;
  userId: Scalars['ID']['output'];
};

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  edges: Array<NotificationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  cursor: Scalars['String']['output'];
  node: Notification;
};

/** Customer order */
export type Order = {
  __typename?: 'Order';
  /** Balance payment */
  balanceDue?: Maybe<Scalars['Decimal']['output']>;
  balancePaidAt?: Maybe<Scalars['DateTime']['output']>;
  balancePaymentStatus?: Maybe<PaymentStatus>;
  billingAddress?: Maybe<Address>;
  buyer?: Maybe<User>;
  buyerId?: Maybe<Scalars['ID']['output']>;
  /** Order notes */
  buyerNotes?: Maybe<Scalars['String']['output']>;
  carrier?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  customerEmail: Scalars['String']['output'];
  /** Customer details */
  customerName: Scalars['String']['output'];
  customerPhone?: Maybe<Scalars['String']['output']>;
  /** Deposit payment (if required) */
  depositAmount?: Maybe<Scalars['Decimal']['output']>;
  depositPercentage?: Maybe<Scalars['Int']['output']>;
  /** Order events timeline */
  events: Array<OrderEvent>;
  /** Fulfillment status */
  fulfillmentStatus: FulfillmentStatus;
  id: Scalars['ID']['output'];
  /** Generated documents */
  invoice?: Maybe<Invoice>;
  /** Order line items */
  items: Array<OrderItem>;
  orderNumber: Scalars['String']['output'];
  packingSlip?: Maybe<PackingSlip>;
  paidAt?: Maybe<Scalars['DateTime']['output']>;
  paymentIntent?: Maybe<PaymentIntent>;
  /** Payment information */
  paymentIntentId?: Maybe<Scalars['ID']['output']>;
  /** Payment status */
  paymentStatus: PaymentStatus;
  /** Refunds */
  refunds: Array<Refund>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  sellerNotes?: Maybe<Scalars['String']['output']>;
  /** Addresses */
  shippingAddress: Address;
  shippingCost: Scalars['Decimal']['output'];
  shippingLabel?: Maybe<ShippingLabel>;
  /** Order status */
  status: OrderStatus;
  /** Pricing */
  subtotal: Scalars['Decimal']['output'];
  taxAmount: Scalars['Decimal']['output'];
  totalAmount: Scalars['Decimal']['output'];
  /** Shipping information */
  trackingNumber?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type OrderConnection = {
  __typename?: 'OrderConnection';
  edges: Array<OrderEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type OrderEdge = {
  __typename?: 'OrderEdge';
  cursor: Scalars['String']['output'];
  node: Order;
};

/** Order lifecycle event */
export type OrderEvent = {
  __typename?: 'OrderEvent';
  createdAt: Scalars['DateTime']['output'];
  /** Event description */
  description: Scalars['String']['output'];
  /** Event type */
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Event metadata */
  metadata?: Maybe<Scalars['JSON']['output']>;
  orderId: Scalars['ID']['output'];
  /** User who triggered event */
  performedBy?: Maybe<Scalars['ID']['output']>;
  performedByUser?: Maybe<User>;
};

export type OrderFilterInput = {
  buyerId?: InputMaybe<Scalars['ID']['input']>;
  dateFrom?: InputMaybe<Scalars['DateTime']['input']>;
  dateTo?: InputMaybe<Scalars['DateTime']['input']>;
  fulfillmentStatus?: InputMaybe<FulfillmentStatus>;
  paymentStatus?: InputMaybe<PaymentStatus>;
  search?: InputMaybe<Scalars['String']['input']>;
  sellerId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<OrderStatus>;
};

/** Line item in an order */
export type OrderItem = {
  __typename?: 'OrderItem';
  createdAt: Scalars['DateTime']['output'];
  /** Fulfillment status for this item */
  fulfillmentStatus: FulfillmentStatus;
  id: Scalars['ID']['output'];
  lineTotal: Scalars['Decimal']['output'];
  orderId: Scalars['ID']['output'];
  product: Product;
  productId: Scalars['ID']['output'];
  productImage?: Maybe<Scalars['URL']['output']>;
  /** Item details at time of order */
  productName: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  unitPrice: Scalars['Decimal']['output'];
  variantDetails?: Maybe<Scalars['JSON']['output']>;
  variantId?: Maybe<Scalars['ID']['output']>;
};

export enum OrderSortField {
  CreatedAt = 'CREATED_AT',
  OrderNumber = 'ORDER_NUMBER',
  Status = 'STATUS',
  TotalAmount = 'TOTAL_AMOUNT'
}

export type OrderSortInput = {
  direction: SortDirection;
  field: OrderSortField;
};

export enum OrderStatus {
  AwaitingBalance = 'AWAITING_BALANCE',
  AwaitingPayment = 'AWAITING_PAYMENT',
  BalanceOverdue = 'BALANCE_OVERDUE',
  Cancelled = 'CANCELLED',
  DepositPaid = 'DEPOSIT_PAID',
  Fulfilled = 'FULFILLED',
  InProduction = 'IN_PRODUCTION',
  Paid = 'PAID',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  ReadyToShip = 'READY_TO_SHIP',
  Refunded = 'REFUNDED'
}

/** Packing slip document */
export type PackingSlip = {
  __typename?: 'PackingSlip';
  createdAt: Scalars['DateTime']['output'];
  /** Document URL */
  documentUrl: Scalars['URL']['output'];
  /** Generation metadata */
  generatedBy?: Maybe<Scalars['ID']['output']>;
  generationTrigger: Scalars['String']['output'];
  giftMessage?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Include pricing on slip */
  includesPricing: Scalars['Boolean']['output'];
  order: Order;
  orderId: Scalars['ID']['output'];
  packingSlipNumber: Scalars['String']['output'];
  sellerId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** Warehouse notes */
  warehouseNotes?: Maybe<Scalars['String']['output']>;
};

/** Page information for cursor-based pagination */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** Cursor of the last item in the current page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Indicates if there are more items after the current page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Indicates if there are items before the current page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Cursor of the first item in the current page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

/** Payment intent for processing payments */
export type PaymentIntent = {
  __typename?: 'PaymentIntent';
  amount: Scalars['Int']['output'];
  /** Client secret for frontend payment confirmation */
  clientSecret?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  id: Scalars['ID']['output'];
  /** Additional metadata */
  metadata?: Maybe<Scalars['JSON']['output']>;
  /** Provider-specific intent ID */
  providerIntentId: Scalars['String']['output'];
  /** Payment provider (e.g., "stripe") */
  providerName: Scalars['String']['output'];
  status: PaymentStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export enum PaymentStatus {
  Cancelled = 'CANCELLED',
  Failed = 'FAILED',
  Overdue = 'OVERDUE',
  Paid = 'PAID',
  Pending = 'PENDING',
  Refunded = 'REFUNDED',
  Requested = 'REQUESTED',
  Succeeded = 'SUCCEEDED'
}

export type PlaceWholesaleOrderInput = {
  billingAddress?: InputMaybe<AddressInput>;
  items: Array<WholesaleOrderItemInput>;
  paymentTerms?: InputMaybe<Scalars['String']['input']>;
  poNumber?: InputMaybe<Scalars['String']['input']>;
  sellerId: Scalars['ID']['input'];
  shippingAddress: AddressInput;
};

/** Platform analytics snapshot */
export type PlatformAnalytics = {
  __typename?: 'PlatformAnalytics';
  activeUsers: Scalars['Int']['output'];
  date: Scalars['DateTime']['output'];
  newBuyers: Scalars['Int']['output'];
  newSellers: Scalars['Int']['output'];
  /** User metrics */
  newSignups: Scalars['Int']['output'];
  /** Order metrics */
  ordersPlaced: Scalars['Int']['output'];
  /** Product metrics */
  productsListed: Scalars['Int']['output'];
  revenue: Scalars['Decimal']['output'];
};

/** Product in a seller's catalog */
export type Product = {
  __typename?: 'Product';
  category: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  depositAmount?: Maybe<Scalars['Decimal']['output']>;
  description: Scalars['String']['output'];
  discountPercentage?: Maybe<Scalars['Decimal']['output']>;
  flatShippingRate?: Maybe<Scalars['Decimal']['output']>;
  id: Scalars['ID']['output'];
  /** Primary product image */
  image: Scalars['URL']['output'];
  /** Additional product images */
  images: Array<Scalars['URL']['output']>;
  /** Stock level information */
  inventoryStatus: InventoryStatus;
  /** Made-to-order lead time in days */
  madeToOrderDays?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  /** Pre-order availability date */
  preOrderDate?: Maybe<Scalars['DateTime']['output']>;
  price: Scalars['Decimal']['output'];
  productType: Scalars['String']['output'];
  /** Promotion settings */
  promotionActive: Scalars['Boolean']['output'];
  promotionEndDate?: Maybe<Scalars['DateTime']['output']>;
  /** Deposit payment settings */
  requiresDeposit: Scalars['Boolean']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  /** Shipping configuration */
  shippingType?: Maybe<Scalars['String']['output']>;
  shippoHeight?: Maybe<Scalars['Decimal']['output']>;
  shippoLength?: Maybe<Scalars['Decimal']['output']>;
  /** Package dimensions for shipping */
  shippoWeight?: Maybe<Scalars['Decimal']['output']>;
  shippoWidth?: Maybe<Scalars['Decimal']['output']>;
  /** SKU for inventory tracking */
  sku?: Maybe<Scalars['String']['output']>;
  status: ProductStatus;
  /** Current stock level */
  stock: Scalars['Int']['output'];
  /** Active stock reservations */
  stockReservations: Array<StockReservation>;
  updatedAt: Scalars['DateTime']['output'];
  /** Product variants (sizes, colors, etc.) */
  variants?: Maybe<Scalars['JSON']['output']>;
};

export type ProductConnection = {
  __typename?: 'ProductConnection';
  edges: Array<ProductEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ProductEdge = {
  __typename?: 'ProductEdge';
  cursor: Scalars['String']['output'];
  node: Product;
};

export type ProductFilterInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  inStock?: InputMaybe<Scalars['Boolean']['input']>;
  priceMax?: InputMaybe<Scalars['Decimal']['input']>;
  priceMin?: InputMaybe<Scalars['Decimal']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sellerId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<ProductStatus>;
};

export enum ProductSortField {
  CreatedAt = 'CREATED_AT',
  Name = 'NAME',
  Price = 'PRICE',
  Stock = 'STOCK'
}

export type ProductSortInput = {
  direction: SortDirection;
  field: ProductSortField;
};

export enum ProductStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT'
}

/** Product variant (size, color, etc.) */
export type ProductVariant = {
  __typename?: 'ProductVariant';
  /** Variant attributes (e.g., {"size": "L", "color": "Blue"}) */
  attributes: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  price?: Maybe<Scalars['Decimal']['output']>;
  product: Product;
  productId: Scalars['ID']['output'];
  sku?: Maybe<Scalars['String']['output']>;
  stock: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Get buyer profile */
  getBuyerProfile?: Maybe<BuyerProfile>;
  /** Get Meta campaign by ID */
  getCampaign?: Maybe<MetaCampaign>;
  /** Get campaign daily metrics */
  getCampaignDailyMetrics: Array<MetaDailyMetrics>;
  /** Get campaign metrics */
  getCampaignMetrics?: Maybe<MetaCampaignMetrics>;
  /** Get cart by ID */
  getCart?: Maybe<Cart>;
  /** Get cart by session */
  getCartBySession?: Maybe<Cart>;
  /** Get category by ID */
  getCategory?: Maybe<Category>;
  /** Get checkout session */
  getCheckoutSession?: Maybe<CheckoutSession>;
  /** Get currently authenticated user */
  getCurrentUser?: Maybe<User>;
  /** Get domain connection */
  getDomain?: Maybe<DomainConnection>;
  /** Get inventory status for a product */
  getInventory?: Maybe<StockLevel>;
  /** Get invoice by ID */
  getInvoice?: Maybe<Invoice>;
  /** Get invoice by order ID */
  getInvoiceByOrder?: Maybe<Invoice>;
  /** Get background job run */
  getJobRun?: Maybe<BackgroundJobRun>;
  /** Get newsletter analytics */
  getNewsletterAnalytics?: Maybe<Scalars['JSON']['output']>;
  /** Get newsletter campaign */
  getNewsletterCampaign?: Maybe<NewsletterCampaign>;
  /** Get order by ID */
  getOrder?: Maybe<Order>;
  /** Get order by order number */
  getOrderByNumber?: Maybe<Order>;
  /** Get packing slip by order ID */
  getPackingSlip?: Maybe<PackingSlip>;
  /** Get payment intent */
  getPaymentIntent?: Maybe<PaymentIntent>;
  /** Get platform analytics */
  getPlatformAnalytics: Array<PlatformAnalytics>;
  /** Get product by ID */
  getProduct?: Maybe<Product>;
  /** Get product by slug */
  getProductBySlug?: Maybe<Product>;
  /** Get quotation by ID */
  getQuotation?: Maybe<Quotation>;
  /** Get quotation by number */
  getQuotationByNumber?: Maybe<Quotation>;
  /** Get seller account by ID */
  getSeller?: Maybe<SellerAccount>;
  /** Get seller account by slug */
  getStore?: Maybe<SellerAccount>;
  /** Get seller subscription */
  getSubscription?: Maybe<SellerSubscription>;
  /** Get user by ID */
  getUser?: Maybe<User>;
  /** Get wholesale invitation by token */
  getWholesaleInvitation?: Maybe<WholesaleInvitation>;
  /** Get wholesale order by ID */
  getWholesaleOrder?: Maybe<WholesaleOrder>;
  /** List automation workflows */
  listAutomationWorkflows: Array<AutomationWorkflow>;
  /** List Meta campaigns */
  listCampaigns: MetaCampaignConnection;
  /** List categories */
  listCategories: Array<Category>;
  /** List domains for seller */
  listDomains: DomainConnectionConnection;
  /** List subscription invoices */
  listInvoices: SubscriptionInvoiceConnection;
  /** List background job runs */
  listJobRuns: BackgroundJobRunConnection;
  /** List Meta ad accounts */
  listMetaAdAccounts: Array<MetaAdAccount>;
  /** List newsletter campaigns */
  listNewsletterCampaigns: NewsletterCampaignConnection;
  /** List notifications for user */
  listNotifications: NotificationConnection;
  /** List orders with filtering and pagination */
  listOrders: OrderConnection;
  /** List stored payment methods */
  listPaymentMethods: Array<StoredPaymentMethod>;
  /** List products with filtering and pagination */
  listProducts: ProductConnection;
  /** List quotations */
  listQuotations: QuotationConnection;
  /** List saved addresses */
  listSavedAddresses: Array<SavedAddress>;
  /** List segments */
  listSegments: Array<Segment>;
  /** List subscribers */
  listSubscribers: SubscriberConnection;
  /** List wholesale invitations */
  listWholesaleInvitations: WholesaleInvitationConnection;
  /** List wholesale orders */
  listWholesaleOrders: WholesaleOrderConnection;
};


export type QueryGetBuyerProfileArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetCampaignDailyMetricsArgs = {
  campaignId: Scalars['ID']['input'];
  dateFrom: Scalars['DateTime']['input'];
  dateTo: Scalars['DateTime']['input'];
};


export type QueryGetCampaignMetricsArgs = {
  campaignId: Scalars['ID']['input'];
};


export type QueryGetCartArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetCartBySessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type QueryGetCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetCheckoutSessionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetDomainArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetInventoryArgs = {
  productId: Scalars['ID']['input'];
};


export type QueryGetInvoiceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetInvoiceByOrderArgs = {
  orderId: Scalars['ID']['input'];
};


export type QueryGetJobRunArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetNewsletterAnalyticsArgs = {
  dateFrom: Scalars['DateTime']['input'];
  dateTo: Scalars['DateTime']['input'];
  sellerId: Scalars['ID']['input'];
};


export type QueryGetNewsletterCampaignArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetOrderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetOrderByNumberArgs = {
  orderNumber: Scalars['String']['input'];
};


export type QueryGetPackingSlipArgs = {
  orderId: Scalars['ID']['input'];
};


export type QueryGetPaymentIntentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetPlatformAnalyticsArgs = {
  dateFrom: Scalars['DateTime']['input'];
  dateTo: Scalars['DateTime']['input'];
};


export type QueryGetProductArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetProductBySlugArgs = {
  sellerId: Scalars['ID']['input'];
  slug: Scalars['String']['input'];
};


export type QueryGetQuotationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetQuotationByNumberArgs = {
  quotationNumber: Scalars['String']['input'];
};


export type QueryGetSellerArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetStoreArgs = {
  slug: Scalars['String']['input'];
};


export type QueryGetSubscriptionArgs = {
  sellerId: Scalars['ID']['input'];
};


export type QueryGetUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetWholesaleInvitationArgs = {
  token: Scalars['String']['input'];
};


export type QueryGetWholesaleOrderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryListAutomationWorkflowsArgs = {
  sellerId: Scalars['ID']['input'];
};


export type QueryListCampaignsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sellerId: Scalars['ID']['input'];
  status?: InputMaybe<CampaignStatus>;
};


export type QueryListCategoriesArgs = {
  level?: InputMaybe<Scalars['Int']['input']>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryListDomainsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sellerId: Scalars['ID']['input'];
  status?: InputMaybe<DomainStatus>;
};


export type QueryListInvoicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  subscriptionId: Scalars['ID']['input'];
};


export type QueryListJobRunsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  jobName?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<BackgroundJobStatus>;
};


export type QueryListMetaAdAccountsArgs = {
  sellerId: Scalars['ID']['input'];
};


export type QueryListNewsletterCampaignsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sellerId: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryListNotificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  unreadOnly?: InputMaybe<Scalars['Boolean']['input']>;
  userId: Scalars['ID']['input'];
};


export type QueryListOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<OrderFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<OrderSortInput>;
};


export type QueryListPaymentMethodsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryListProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ProductFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProductSortInput>;
};


export type QueryListQuotationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  buyerEmail?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sellerId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<QuotationStatus>;
};


export type QueryListSavedAddressesArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryListSegmentsArgs = {
  sellerId: Scalars['ID']['input'];
};


export type QueryListSubscribersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  segmentId?: InputMaybe<Scalars['ID']['input']>;
  sellerId: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryListWholesaleInvitationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sellerId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<WholesaleInvitationStatus>;
};


export type QueryListWholesaleOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<OrderFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

/** Trade quotation for custom pricing */
export type Quotation = {
  __typename?: 'Quotation';
  /** Activity log */
  activities: Array<QuotationActivity>;
  balanceAmount: Scalars['Decimal']['output'];
  buyer?: Maybe<User>;
  buyerEmail: Scalars['String']['output'];
  /** Buyer ID if accepted and registered */
  buyerId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  /** Attached documents */
  dataSheetUrl?: Maybe<Scalars['URL']['output']>;
  /** Trade terms */
  deliveryTerms?: Maybe<Scalars['String']['output']>;
  /** Payment schedule */
  depositAmount: Scalars['Decimal']['output'];
  depositPercentage: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** Line items */
  items: Array<QuotationLineItem>;
  /** Metadata */
  metadata?: Maybe<Scalars['JSON']['output']>;
  order?: Maybe<Order>;
  /** Associated order if accepted */
  orderId?: Maybe<Scalars['ID']['output']>;
  paymentTerms?: Maybe<Scalars['String']['output']>;
  /** Payment tracking */
  payments: Array<QuotationPayment>;
  quotationNumber: Scalars['String']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  shippingAmount: Scalars['Decimal']['output'];
  status: QuotationStatus;
  /** Pricing */
  subtotal: Scalars['Decimal']['output'];
  taxAmount: Scalars['Decimal']['output'];
  termsAndConditionsUrl?: Maybe<Scalars['URL']['output']>;
  total: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** Quotation validity */
  validUntil?: Maybe<Scalars['DateTime']['output']>;
};

/** Activity event on a quotation */
export type QuotationActivity = {
  __typename?: 'QuotationActivity';
  createdAt: Scalars['DateTime']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Event payload */
  payload?: Maybe<Scalars['JSON']['output']>;
  /** User who performed action */
  performedBy: Scalars['ID']['output'];
  performedByUser: User;
  quotationId: Scalars['ID']['output'];
};

export type QuotationConnection = {
  __typename?: 'QuotationConnection';
  edges: Array<QuotationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type QuotationEdge = {
  __typename?: 'QuotationEdge';
  cursor: Scalars['String']['output'];
  node: Quotation;
};

/** Line item in a quotation */
export type QuotationLineItem = {
  __typename?: 'QuotationLineItem';
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lineNumber: Scalars['Int']['output'];
  lineTotal: Scalars['Decimal']['output'];
  product?: Maybe<Product>;
  /** Linked product (optional) */
  productId?: Maybe<Scalars['ID']['output']>;
  quantity: Scalars['Int']['output'];
  quotationId: Scalars['ID']['output'];
  unitPrice: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type QuotationLineItemInput = {
  description: Scalars['String']['input'];
  productId?: InputMaybe<Scalars['ID']['input']>;
  quantity: Scalars['Int']['input'];
  unitPrice: Scalars['Decimal']['input'];
};

/** Payment for a quotation */
export type QuotationPayment = {
  __typename?: 'QuotationPayment';
  amount: Scalars['Decimal']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** Due date */
  dueDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  paidAt?: Maybe<Scalars['DateTime']['output']>;
  /** Payment type (deposit or balance) */
  paymentType: Scalars['String']['output'];
  quotation: Quotation;
  quotationId: Scalars['ID']['output'];
  status: PaymentStatus;
  /** Stripe payment intent */
  stripePaymentIntentId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum QuotationStatus {
  Accepted = 'ACCEPTED',
  BalanceDue = 'BALANCE_DUE',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  DepositPaid = 'DEPOSIT_PAID',
  Draft = 'DRAFT',
  Expired = 'EXPIRED',
  FullyPaid = 'FULLY_PAID',
  Sent = 'SENT',
  Viewed = 'VIEWED'
}

/** Refund for an order */
export type Refund = {
  __typename?: 'Refund';
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  id: Scalars['ID']['output'];
  /** Refund line items */
  lineItems: Array<RefundLineItem>;
  order: Order;
  orderId: Scalars['ID']['output'];
  /** Admin who processed refund */
  processedBy: Scalars['ID']['output'];
  processedByUser: User;
  reason?: Maybe<Scalars['String']['output']>;
  status: PaymentStatus;
  /** Stripe refund ID */
  stripeRefundId?: Maybe<Scalars['String']['output']>;
  totalAmount: Scalars['Decimal']['output'];
};

/** Line item in a refund */
export type RefundLineItem = {
  __typename?: 'RefundLineItem';
  amount: Scalars['Decimal']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  orderItem?: Maybe<OrderItem>;
  /** Original order item being refunded */
  orderItemId?: Maybe<Scalars['ID']['output']>;
  /** Quantity being refunded (for product refunds) */
  quantity?: Maybe<Scalars['Int']['output']>;
  refundId: Scalars['ID']['output'];
  /** Type of refund (product, shipping, tax, adjustment) */
  type: Scalars['String']['output'];
};

export type RefundLineItemInput = {
  amount: Scalars['Decimal']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  orderItemId?: InputMaybe<Scalars['ID']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
  type: Scalars['String']['input'];
};

/** Stock keeping unit for precise inventory tracking */
export type Sku = {
  __typename?: 'SKU';
  id: Scalars['ID']['output'];
  productId: Scalars['ID']['output'];
  /** Available quantity for new orders */
  quantityAvailable: Scalars['Int']['output'];
  /** Current quantity on hand */
  quantityOnHand: Scalars['Int']['output'];
  /** Quantity reserved for pending orders */
  quantityReserved: Scalars['Int']['output'];
  /** Reorder point for low stock alerts */
  reorderPoint?: Maybe<Scalars['Int']['output']>;
  skuCode: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  variantId?: Maybe<Scalars['ID']['output']>;
};

/** Saved shipping/billing address */
export type SavedAddress = {
  __typename?: 'SavedAddress';
  /** Address details */
  address: Address;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Default address */
  isDefault: Scalars['Boolean']['output'];
  /** User-friendly label */
  label?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['ID']['output'];
};

/** Audience segment for targeting */
export type Segment = {
  __typename?: 'Segment';
  createdAt: Scalars['DateTime']['output'];
  /** Segment criteria */
  criteria: Scalars['JSON']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sellerId: Scalars['ID']['output'];
  /** Subscriber count */
  subscriberCount: Scalars['Int']['output'];
  /** Subscribers in segment */
  subscribers: Array<Subscriber>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Seller account with business information */
export type SellerAccount = {
  __typename?: 'SellerAccount';
  /** Store branding and customization */
  brandColor?: Maybe<Scalars['String']['output']>;
  businessEmail?: Maybe<Scalars['String']['output']>;
  businessName?: Maybe<Scalars['String']['output']>;
  businessPhone?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Connected custom domains */
  domains: Array<DomainConnection>;
  /** Homepage configuration */
  homepage?: Maybe<SellerHomepage>;
  id: Scalars['ID']['output'];
  logoUrl?: Maybe<Scalars['URL']['output']>;
  /** Notification preferences */
  notificationSettings?: Maybe<Scalars['JSON']['output']>;
  storeName: Scalars['String']['output'];
  storeSlug: Scalars['String']['output'];
  /** Stripe Connect account ID for payments */
  stripeAccountId?: Maybe<Scalars['String']['output']>;
  /** Current subscription tier */
  subscriptionTier: SubscriptionTier;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['ID']['output'];
};

/** Seller homepage configuration */
export type SellerHomepage = {
  __typename?: 'SellerHomepage';
  autoRedirectToHomepage: Scalars['Boolean']['output'];
  bodyCopy: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  ctaLabel?: Maybe<Scalars['String']['output']>;
  ctaUrl?: Maybe<Scalars['URL']['output']>;
  headline: Scalars['String']['output'];
  heroMediaType?: Maybe<Scalars['String']['output']>;
  heroMediaUrl?: Maybe<Scalars['URL']['output']>;
  id: Scalars['ID']['output'];
  lastPublishedAt?: Maybe<Scalars['DateTime']['output']>;
  musicEnabled: Scalars['Boolean']['output'];
  sellerId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  templateKey: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Seller subscription plan */
export type SellerSubscription = {
  __typename?: 'SellerSubscription';
  /** Cancellation */
  cancelAtPeriodEnd: Scalars['Boolean']['output'];
  canceledAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currentPeriodEnd: Scalars['DateTime']['output'];
  /** Billing cycle */
  currentPeriodStart: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  /** Subscription status */
  status: Scalars['String']['output'];
  /** Stripe subscription ID */
  stripeSubscriptionId?: Maybe<Scalars['String']['output']>;
  tier: SubscriptionTier;
  trialEnd?: Maybe<Scalars['DateTime']['output']>;
  /** Trial period */
  trialStart?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Shipment tracking information */
export type Shipment = {
  __typename?: 'Shipment';
  actualDeliveryDate?: Maybe<Scalars['DateTime']['output']>;
  carrier: Scalars['String']['output'];
  deliveredAt?: Maybe<Scalars['DateTime']['output']>;
  estimatedDeliveryDate?: Maybe<Scalars['DateTime']['output']>;
  /** Tracking events */
  events: Array<ShipmentEvent>;
  id: Scalars['ID']['output'];
  order: Order;
  orderId: Scalars['ID']['output'];
  shippedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Shipment status */
  status: Scalars['String']['output'];
  trackingNumber: Scalars['String']['output'];
};

/** Shipment tracking event */
export type ShipmentEvent = {
  __typename?: 'ShipmentEvent';
  description: Scalars['String']['output'];
  location?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

/** Shipping label */
export type ShippingLabel = {
  __typename?: 'ShippingLabel';
  /** Label costs */
  baseCostUsd: Scalars['Decimal']['output'];
  carrier?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Label details */
  labelUrl?: Maybe<Scalars['URL']['output']>;
  markupPercent?: Maybe<Scalars['Decimal']['output']>;
  order: Order;
  orderId: Scalars['ID']['output'];
  purchasedAt?: Maybe<Scalars['DateTime']['output']>;
  sellerId: Scalars['ID']['output'];
  serviceLevelName?: Maybe<Scalars['String']['output']>;
  shippoRateId?: Maybe<Scalars['String']['output']>;
  /** Shippo transaction ID */
  shippoTransactionId?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  totalChargedUsd: Scalars['Decimal']['output'];
  trackingNumber?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  voidedAt?: Maybe<Scalars['DateTime']['output']>;
};

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Stock level snapshot */
export type StockLevel = {
  __typename?: 'StockLevel';
  availableStock: Scalars['Int']['output'];
  inventoryStatus: InventoryStatus;
  lastUpdated: Scalars['DateTime']['output'];
  /** Low stock threshold */
  lowStockThreshold?: Maybe<Scalars['Int']['output']>;
  product: Product;
  productId: Scalars['ID']['output'];
  reservedStock: Scalars['Int']['output'];
  totalStock: Scalars['Int']['output'];
};

/** Temporary stock reservation for cart/checkout */
export type StockReservation = {
  __typename?: 'StockReservation';
  committedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Associated order if reservation is committed */
  orderId?: Maybe<Scalars['ID']['output']>;
  product: Product;
  productId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  releasedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Session ID for cart reservations */
  sessionId?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  /** User ID for logged-in reservations */
  userId?: Maybe<Scalars['ID']['output']>;
  variantId?: Maybe<Scalars['ID']['output']>;
};

/** Stored payment method */
export type StoredPaymentMethod = {
  __typename?: 'StoredPaymentMethod';
  /** Card details */
  cardBrand?: Maybe<Scalars['String']['output']>;
  cardExpMonth?: Maybe<Scalars['Int']['output']>;
  cardExpYear?: Maybe<Scalars['Int']['output']>;
  cardLast4?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Default payment method */
  isDefault: Scalars['Boolean']['output'];
  /** User-friendly label */
  label?: Maybe<Scalars['String']['output']>;
  /** Stripe payment method ID */
  stripePaymentMethodId: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['ID']['output'];
};

/** Newsletter subscriber */
export type Subscriber = {
  __typename?: 'Subscriber';
  createdAt: Scalars['DateTime']['output'];
  /** Custom fields */
  customFields?: Maybe<Scalars['JSON']['output']>;
  email: Scalars['String']['output'];
  /** Engagement metrics */
  engagement?: Maybe<SubscriberEngagement>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  /** Subscriber segments */
  segments: Array<Segment>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  subscribedAt: Scalars['DateTime']['output'];
  unsubscribedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type SubscriberConnection = {
  __typename?: 'SubscriberConnection';
  edges: Array<SubscriberEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SubscriberEdge = {
  __typename?: 'SubscriberEdge';
  cursor: Scalars['String']['output'];
  node: Subscriber;
};

/** Subscriber engagement metrics */
export type SubscriberEngagement = {
  __typename?: 'SubscriberEngagement';
  /** Engagement score (0-100) */
  engagementScore: Scalars['Int']['output'];
  lastClickedAt?: Maybe<Scalars['DateTime']['output']>;
  lastOpenedAt?: Maybe<Scalars['DateTime']['output']>;
  subscriberId: Scalars['ID']['output'];
  totalClicks: Scalars['Int']['output'];
  totalOpens: Scalars['Int']['output'];
  totalSent: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to cart synchronization */
  cartSynced: Cart;
  /** Subscribe to inventory threshold alerts */
  inventoryThresholdAlert: StockLevel;
  /** Subscribe to Meta campaign status changes */
  metaCampaignStatusChanged: MetaCampaign;
  /** Subscribe to newsletter campaign progress */
  newsletterCampaignProgress: NewsletterCampaign;
  /** Subscribe to notifications */
  notificationReceived: Notification;
  /** Subscribe to order status updates */
  orderStatusUpdated: Order;
  /** Subscribe to quotation status changes */
  quotationStatusChanged: Quotation;
};


export type SubscriptionCartSyncedArgs = {
  cartId?: InputMaybe<Scalars['ID']['input']>;
  sessionKey?: InputMaybe<Scalars['String']['input']>;
};


export type SubscriptionInventoryThresholdAlertArgs = {
  productIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  sellerId: Scalars['ID']['input'];
};


export type SubscriptionMetaCampaignStatusChangedArgs = {
  campaignId: Scalars['ID']['input'];
};


export type SubscriptionNewsletterCampaignProgressArgs = {
  campaignId: Scalars['ID']['input'];
};


export type SubscriptionNotificationReceivedArgs = {
  userId: Scalars['ID']['input'];
};


export type SubscriptionOrderStatusUpdatedArgs = {
  orderId?: InputMaybe<Scalars['ID']['input']>;
  sellerId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionQuotationStatusChangedArgs = {
  buyerId?: InputMaybe<Scalars['ID']['input']>;
  sellerId?: InputMaybe<Scalars['ID']['input']>;
};

/** Subscription invoice */
export type SubscriptionInvoice = {
  __typename?: 'SubscriptionInvoice';
  /** Invoice details */
  amountDue: Scalars['Decimal']['output'];
  amountPaid: Scalars['Decimal']['output'];
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  dueDate?: Maybe<Scalars['DateTime']['output']>;
  /** Invoice URLs */
  hostedInvoiceUrl?: Maybe<Scalars['URL']['output']>;
  id: Scalars['ID']['output'];
  invoicePdfUrl?: Maybe<Scalars['URL']['output']>;
  paidAt?: Maybe<Scalars['DateTime']['output']>;
  periodEnd: Scalars['DateTime']['output'];
  /** Billing period */
  periodStart: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  /** Stripe invoice ID */
  stripeInvoiceId: Scalars['String']['output'];
  subscription: SellerSubscription;
  subscriptionId: Scalars['ID']['output'];
};

export type SubscriptionInvoiceConnection = {
  __typename?: 'SubscriptionInvoiceConnection';
  edges: Array<SubscriptionInvoiceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SubscriptionInvoiceEdge = {
  __typename?: 'SubscriptionInvoiceEdge';
  cursor: Scalars['String']['output'];
  node: SubscriptionInvoice;
};

export enum SubscriptionTier {
  Enterprise = 'ENTERPRISE',
  Free = 'FREE',
  Professional = 'PROFESSIONAL',
  Starter = 'STARTER'
}

/** Team membership granting access to a seller's store */
export type TeamMembership = {
  __typename?: 'TeamMembership';
  /** Capabilities granted (JSON array) */
  capabilities: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Store owner/seller */
  storeOwner: User;
  storeOwnerId: Scalars['ID']['output'];
  /** Team member */
  teamMember: User;
  userId: Scalars['ID']['output'];
};

export type UpdateCampaignBudgetInput = {
  campaignId: Scalars['ID']['input'];
  dailyBudget?: InputMaybe<Scalars['Decimal']['input']>;
  totalBudget?: InputMaybe<Scalars['Decimal']['input']>;
};

export type UpdateCartItemInput = {
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateOrderFulfillmentInput = {
  carrier?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
  status: FulfillmentStatus;
  trackingNumber?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProductInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  image?: InputMaybe<Scalars['URL']['input']>;
  images?: InputMaybe<Array<Scalars['URL']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Decimal']['input']>;
  status?: InputMaybe<ProductStatus>;
  stock?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateQuotationInput = {
  depositPercentage?: InputMaybe<Scalars['Int']['input']>;
  items?: InputMaybe<Array<QuotationLineItemInput>>;
  validUntil?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Platform user account (buyer or seller) */
export type User = {
  __typename?: 'User';
  /** Buyer profile details if user is a buyer */
  buyerProfile?: Maybe<BuyerProfile>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  profileImageUrl?: Maybe<Scalars['URL']['output']>;
  /** Seller account details if user is a seller */
  sellerAccount?: Maybe<SellerAccount>;
  /** Team memberships across different stores */
  teamMemberships: Array<TeamMembership>;
  updatedAt: Scalars['DateTime']['output'];
  userType: UserType;
  username?: Maybe<Scalars['String']['output']>;
};

export enum UserType {
  Buyer = 'BUYER',
  Seller = 'SELLER'
}

/** Wholesale access grant for buyer-seller relationship */
export type WholesaleAccessGrant = {
  __typename?: 'WholesaleAccessGrant';
  buyer: User;
  buyerId: Scalars['ID']['output'];
  grantedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Access status */
  isActive: Scalars['Boolean']['output'];
  pricingTier?: Maybe<WholesalePricingTier>;
  /** Custom pricing tier */
  pricingTierId?: Maybe<Scalars['ID']['output']>;
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
  seller: User;
  sellerId: Scalars['ID']['output'];
};

/** Invitation to access wholesale products */
export type WholesaleInvitation = {
  __typename?: 'WholesaleInvitation';
  acceptedAt?: Maybe<Scalars['DateTime']['output']>;
  buyer?: Maybe<User>;
  buyerEmail: Scalars['String']['output'];
  /** Buyer ID once accepted */
  buyerId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  rejectedAt?: Maybe<Scalars['DateTime']['output']>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  status: WholesaleInvitationStatus;
  /** Invitation token */
  token: Scalars['String']['output'];
};

export type WholesaleInvitationConnection = {
  __typename?: 'WholesaleInvitationConnection';
  edges: Array<WholesaleInvitationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type WholesaleInvitationEdge = {
  __typename?: 'WholesaleInvitationEdge';
  cursor: Scalars['String']['output'];
  node: WholesaleInvitation;
};

export enum WholesaleInvitationStatus {
  Accepted = 'ACCEPTED',
  Expired = 'EXPIRED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

/** Wholesale B2B order */
export type WholesaleOrder = {
  __typename?: 'WholesaleOrder';
  /** Balance payment */
  balanceDue: Scalars['Decimal']['output'];
  balancePaidAt?: Maybe<Scalars['DateTime']['output']>;
  balanceRequestedAt?: Maybe<Scalars['DateTime']['output']>;
  billingAddress: Address;
  buyer: User;
  buyerId: Scalars['ID']['output'];
  carrier?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  /** Deposit payment */
  depositAmount: Scalars['Decimal']['output'];
  depositPaidAt?: Maybe<Scalars['DateTime']['output']>;
  depositPercentage: Scalars['Int']['output'];
  /** Order events */
  events: Array<WholesaleOrderEvent>;
  id: Scalars['ID']['output'];
  incoterms?: Maybe<Scalars['String']['output']>;
  /** Documents */
  invoice?: Maybe<Invoice>;
  /** Order line items */
  items: Array<WholesaleOrderItem>;
  orderNumber: Scalars['String']['output'];
  packingSlip?: Maybe<PackingSlip>;
  paymentStatus: PaymentStatus;
  /** Payment terms */
  paymentTerms: Scalars['String']['output'];
  /** B2B specific fields */
  poNumber?: Maybe<Scalars['String']['output']>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  /** Addresses */
  shippingAddress: Address;
  shippingCost: Scalars['Decimal']['output'];
  /** Shipping method */
  shippingType?: Maybe<Scalars['String']['output']>;
  status: OrderStatus;
  /** Pricing */
  subtotal: Scalars['Decimal']['output'];
  taxAmount: Scalars['Decimal']['output'];
  totalAmount: Scalars['Decimal']['output'];
  /** Tracking */
  trackingNumber?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  vatNumber?: Maybe<Scalars['String']['output']>;
};

export type WholesaleOrderConnection = {
  __typename?: 'WholesaleOrderConnection';
  edges: Array<WholesaleOrderEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type WholesaleOrderEdge = {
  __typename?: 'WholesaleOrderEdge';
  cursor: Scalars['String']['output'];
  node: WholesaleOrder;
};

/** Wholesale order event */
export type WholesaleOrderEvent = {
  __typename?: 'WholesaleOrderEvent';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Event metadata */
  metadata?: Maybe<Scalars['JSON']['output']>;
  orderId: Scalars['ID']['output'];
  performedBy?: Maybe<Scalars['ID']['output']>;
  performedByUser?: Maybe<User>;
};

/** Line item in wholesale order */
export type WholesaleOrderItem = {
  __typename?: 'WholesaleOrderItem';
  createdAt: Scalars['DateTime']['output'];
  /** Wholesale discount */
  discountPercentage?: Maybe<Scalars['Decimal']['output']>;
  id: Scalars['ID']['output'];
  lineTotal: Scalars['Decimal']['output'];
  orderId: Scalars['ID']['output'];
  product: Product;
  productId: Scalars['ID']['output'];
  /** Wholesale-specific pricing */
  productName: Scalars['String']['output'];
  productSku?: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  unitPrice: Scalars['Decimal']['output'];
};

export type WholesaleOrderItemInput = {
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
  unitPrice?: InputMaybe<Scalars['Decimal']['input']>;
};

/** Wholesale pricing tier for bulk discounts */
export type WholesalePricingTier = {
  __typename?: 'WholesalePricingTier';
  createdAt: Scalars['DateTime']['output'];
  /** Discount percentage */
  discountPercentage: Scalars['Decimal']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  /** Minimum order quantity */
  minQuantity: Scalars['Int']['output'];
  /** Tier name */
  name: Scalars['String']['output'];
  /** Applicable products */
  productIds: Array<Scalars['ID']['output']>;
  sellerId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AddSubscriberInput: AddSubscriberInput;
  AddToCartInput: AddToCartInput;
  Address: ResolverTypeWrapper<Address>;
  AddressInput: AddressInput;
  AuthToken: ResolverTypeWrapper<AuthToken>;
  AutomationExecution: ResolverTypeWrapper<Omit<AutomationExecution, 'subscriber' | 'workflow'> & { subscriber?: Maybe<ResolversTypes['Subscriber']>, workflow: ResolversTypes['AutomationWorkflow'] }>;
  AutomationWorkflow: ResolverTypeWrapper<Omit<AutomationWorkflow, 'executions'> & { executions: Array<ResolversTypes['AutomationExecution']> }>;
  BackgroundJobRun: ResolverTypeWrapper<BackgroundJobRun>;
  BackgroundJobRunConnection: ResolverTypeWrapper<BackgroundJobRunConnection>;
  BackgroundJobRunEdge: ResolverTypeWrapper<BackgroundJobRunEdge>;
  BackgroundJobStatus: BackgroundJobStatus;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BuyerProfile: ResolverTypeWrapper<Omit<BuyerProfile, 'user'> & { user: ResolversTypes['User'] }>;
  CampaignStatus: CampaignStatus;
  Cart: ResolverTypeWrapper<Omit<Cart, 'buyer' | 'currentSession' | 'items' | 'seller'> & { buyer?: Maybe<ResolversTypes['User']>, currentSession?: Maybe<ResolversTypes['CartSession']>, items: Array<ResolversTypes['CartItem']>, seller: ResolversTypes['User'] }>;
  CartItem: ResolverTypeWrapper<Omit<CartItem, 'product' | 'reservation' | 'variant'> & { product: ResolversTypes['Product'], reservation?: Maybe<ResolversTypes['StockReservation']>, variant?: Maybe<ResolversTypes['ProductVariant']> }>;
  CartSession: ResolverTypeWrapper<Omit<CartSession, 'cart'> & { cart: ResolversTypes['Cart'] }>;
  Category: ResolverTypeWrapper<Category>;
  CheckoutSession: ResolverTypeWrapper<Omit<CheckoutSession, 'cart'> & { cart: ResolversTypes['Cart'] }>;
  ConnectDomainInput: ConnectDomainInput;
  CreateCheckoutSessionInput: CreateCheckoutSessionInput;
  CreateNewsletterCampaignInput: CreateNewsletterCampaignInput;
  CreateOrderInput: CreateOrderInput;
  CreateProductInput: CreateProductInput;
  CreateQuotationInput: CreateQuotationInput;
  CreateWholesaleInvitationInput: CreateWholesaleInvitationInput;
  Currency: Currency;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DomainConnection: ResolverTypeWrapper<Omit<DomainConnection, 'seller'> & { seller: ResolversTypes['User'] }>;
  DomainConnectionConnection: ResolverTypeWrapper<Omit<DomainConnectionConnection, 'edges'> & { edges: Array<ResolversTypes['DomainConnectionEdge']> }>;
  DomainConnectionEdge: ResolverTypeWrapper<Omit<DomainConnectionEdge, 'node'> & { node: ResolversTypes['DomainConnection'] }>;
  DomainStatus: DomainStatus;
  FulfillmentEvent: ResolverTypeWrapper<Omit<FulfillmentEvent, 'items' | 'order'> & { items: Array<ResolversTypes['OrderItem']>, order: ResolversTypes['Order'] }>;
  FulfillmentStatus: FulfillmentStatus;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InventoryStatus: InventoryStatus;
  Invoice: ResolverTypeWrapper<Omit<Invoice, 'order'> & { order: ResolversTypes['Order'] }>;
  IssueRefundInput: IssueRefundInput;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LaunchMetaCampaignInput: LaunchMetaCampaignInput;
  MarketingAudience: ResolverTypeWrapper<Omit<MarketingAudience, 'campaigns'> & { campaigns: Array<ResolversTypes['MetaCampaign']> }>;
  MetaAdAccount: ResolverTypeWrapper<Omit<MetaAdAccount, 'seller'> & { seller: ResolversTypes['User'] }>;
  MetaAdSet: ResolverTypeWrapper<Omit<MetaAdSet, 'campaign' | 'creatives'> & { campaign: ResolversTypes['MetaCampaign'], creatives: Array<ResolversTypes['MetaCreative']> }>;
  MetaCampaign: ResolverTypeWrapper<Omit<MetaCampaign, 'adSets' | 'products' | 'seller'> & { adSets: Array<ResolversTypes['MetaAdSet']>, products: Array<ResolversTypes['Product']>, seller: ResolversTypes['User'] }>;
  MetaCampaignConnection: ResolverTypeWrapper<Omit<MetaCampaignConnection, 'edges'> & { edges: Array<ResolversTypes['MetaCampaignEdge']> }>;
  MetaCampaignEdge: ResolverTypeWrapper<Omit<MetaCampaignEdge, 'node'> & { node: ResolversTypes['MetaCampaign'] }>;
  MetaCampaignMetrics: ResolverTypeWrapper<MetaCampaignMetrics>;
  MetaCreative: ResolverTypeWrapper<Omit<MetaCreative, 'adSet'> & { adSet: ResolversTypes['MetaAdSet'] }>;
  MetaDailyMetrics: ResolverTypeWrapper<MetaDailyMetrics>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NewsletterCampaign: ResolverTypeWrapper<Omit<NewsletterCampaign, 'segments' | 'seller'> & { segments: Array<ResolversTypes['Segment']>, seller: ResolversTypes['User'] }>;
  NewsletterCampaignConnection: ResolverTypeWrapper<Omit<NewsletterCampaignConnection, 'edges'> & { edges: Array<ResolversTypes['NewsletterCampaignEdge']> }>;
  NewsletterCampaignEdge: ResolverTypeWrapper<Omit<NewsletterCampaignEdge, 'node'> & { node: ResolversTypes['NewsletterCampaign'] }>;
  NewsletterTemplate: ResolverTypeWrapper<NewsletterTemplate>;
  Notification: ResolverTypeWrapper<Omit<Notification, 'user'> & { user: ResolversTypes['User'] }>;
  NotificationConnection: ResolverTypeWrapper<Omit<NotificationConnection, 'edges'> & { edges: Array<ResolversTypes['NotificationEdge']> }>;
  NotificationEdge: ResolverTypeWrapper<Omit<NotificationEdge, 'node'> & { node: ResolversTypes['Notification'] }>;
  Order: ResolverTypeWrapper<Omit<Order, 'buyer' | 'events' | 'invoice' | 'items' | 'packingSlip' | 'refunds' | 'seller' | 'shippingLabel'> & { buyer?: Maybe<ResolversTypes['User']>, events: Array<ResolversTypes['OrderEvent']>, invoice?: Maybe<ResolversTypes['Invoice']>, items: Array<ResolversTypes['OrderItem']>, packingSlip?: Maybe<ResolversTypes['PackingSlip']>, refunds: Array<ResolversTypes['Refund']>, seller: ResolversTypes['User'], shippingLabel?: Maybe<ResolversTypes['ShippingLabel']> }>;
  OrderConnection: ResolverTypeWrapper<Omit<OrderConnection, 'edges'> & { edges: Array<ResolversTypes['OrderEdge']> }>;
  OrderEdge: ResolverTypeWrapper<Omit<OrderEdge, 'node'> & { node: ResolversTypes['Order'] }>;
  OrderEvent: ResolverTypeWrapper<Omit<OrderEvent, 'performedByUser'> & { performedByUser?: Maybe<ResolversTypes['User']> }>;
  OrderFilterInput: OrderFilterInput;
  OrderItem: ResolverTypeWrapper<Omit<OrderItem, 'product'> & { product: ResolversTypes['Product'] }>;
  OrderSortField: OrderSortField;
  OrderSortInput: OrderSortInput;
  OrderStatus: OrderStatus;
  PackingSlip: ResolverTypeWrapper<Omit<PackingSlip, 'order'> & { order: ResolversTypes['Order'] }>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PaymentIntent: ResolverTypeWrapper<PaymentIntent>;
  PaymentStatus: PaymentStatus;
  PlaceWholesaleOrderInput: PlaceWholesaleOrderInput;
  PlatformAnalytics: ResolverTypeWrapper<PlatformAnalytics>;
  Product: ResolverTypeWrapper<products>;
  ProductConnection: ResolverTypeWrapper<Omit<ProductConnection, 'edges'> & { edges: Array<ResolversTypes['ProductEdge']> }>;
  ProductEdge: ResolverTypeWrapper<Omit<ProductEdge, 'node'> & { node: ResolversTypes['Product'] }>;
  ProductFilterInput: ProductFilterInput;
  ProductSortField: ProductSortField;
  ProductSortInput: ProductSortInput;
  ProductStatus: ProductStatus;
  ProductVariant: ResolverTypeWrapper<Omit<ProductVariant, 'product'> & { product: ResolversTypes['Product'] }>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Quotation: ResolverTypeWrapper<Omit<Quotation, 'activities' | 'buyer' | 'items' | 'order' | 'payments' | 'seller'> & { activities: Array<ResolversTypes['QuotationActivity']>, buyer?: Maybe<ResolversTypes['User']>, items: Array<ResolversTypes['QuotationLineItem']>, order?: Maybe<ResolversTypes['Order']>, payments: Array<ResolversTypes['QuotationPayment']>, seller: ResolversTypes['User'] }>;
  QuotationActivity: ResolverTypeWrapper<Omit<QuotationActivity, 'performedByUser'> & { performedByUser: ResolversTypes['User'] }>;
  QuotationConnection: ResolverTypeWrapper<Omit<QuotationConnection, 'edges'> & { edges: Array<ResolversTypes['QuotationEdge']> }>;
  QuotationEdge: ResolverTypeWrapper<Omit<QuotationEdge, 'node'> & { node: ResolversTypes['Quotation'] }>;
  QuotationLineItem: ResolverTypeWrapper<Omit<QuotationLineItem, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  QuotationLineItemInput: QuotationLineItemInput;
  QuotationPayment: ResolverTypeWrapper<Omit<QuotationPayment, 'quotation'> & { quotation: ResolversTypes['Quotation'] }>;
  QuotationStatus: QuotationStatus;
  Refund: ResolverTypeWrapper<Omit<Refund, 'lineItems' | 'order' | 'processedByUser'> & { lineItems: Array<ResolversTypes['RefundLineItem']>, order: ResolversTypes['Order'], processedByUser: ResolversTypes['User'] }>;
  RefundLineItem: ResolverTypeWrapper<Omit<RefundLineItem, 'orderItem'> & { orderItem?: Maybe<ResolversTypes['OrderItem']> }>;
  RefundLineItemInput: RefundLineItemInput;
  SKU: ResolverTypeWrapper<Sku>;
  SavedAddress: ResolverTypeWrapper<Omit<SavedAddress, 'user'> & { user: ResolversTypes['User'] }>;
  Segment: ResolverTypeWrapper<Omit<Segment, 'subscribers'> & { subscribers: Array<ResolversTypes['Subscriber']> }>;
  SellerAccount: ResolverTypeWrapper<Omit<SellerAccount, 'domains' | 'user'> & { domains: Array<ResolversTypes['DomainConnection']>, user: ResolversTypes['User'] }>;
  SellerHomepage: ResolverTypeWrapper<SellerHomepage>;
  SellerSubscription: ResolverTypeWrapper<Omit<SellerSubscription, 'seller'> & { seller: ResolversTypes['User'] }>;
  Shipment: ResolverTypeWrapper<Omit<Shipment, 'order'> & { order: ResolversTypes['Order'] }>;
  ShipmentEvent: ResolverTypeWrapper<ShipmentEvent>;
  ShippingLabel: ResolverTypeWrapper<Omit<ShippingLabel, 'order'> & { order: ResolversTypes['Order'] }>;
  SortDirection: SortDirection;
  StockLevel: ResolverTypeWrapper<Omit<StockLevel, 'product'> & { product: ResolversTypes['Product'] }>;
  StockReservation: ResolverTypeWrapper<Omit<StockReservation, 'product'> & { product: ResolversTypes['Product'] }>;
  StoredPaymentMethod: ResolverTypeWrapper<Omit<StoredPaymentMethod, 'user'> & { user: ResolversTypes['User'] }>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscriber: ResolverTypeWrapper<Omit<Subscriber, 'segments' | 'seller'> & { segments: Array<ResolversTypes['Segment']>, seller: ResolversTypes['User'] }>;
  SubscriberConnection: ResolverTypeWrapper<Omit<SubscriberConnection, 'edges'> & { edges: Array<ResolversTypes['SubscriberEdge']> }>;
  SubscriberEdge: ResolverTypeWrapper<Omit<SubscriberEdge, 'node'> & { node: ResolversTypes['Subscriber'] }>;
  SubscriberEngagement: ResolverTypeWrapper<SubscriberEngagement>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  SubscriptionInvoice: ResolverTypeWrapper<Omit<SubscriptionInvoice, 'subscription'> & { subscription: ResolversTypes['SellerSubscription'] }>;
  SubscriptionInvoiceConnection: ResolverTypeWrapper<Omit<SubscriptionInvoiceConnection, 'edges'> & { edges: Array<ResolversTypes['SubscriptionInvoiceEdge']> }>;
  SubscriptionInvoiceEdge: ResolverTypeWrapper<Omit<SubscriptionInvoiceEdge, 'node'> & { node: ResolversTypes['SubscriptionInvoice'] }>;
  SubscriptionTier: SubscriptionTier;
  TeamMembership: ResolverTypeWrapper<Omit<TeamMembership, 'storeOwner' | 'teamMember'> & { storeOwner: ResolversTypes['User'], teamMember: ResolversTypes['User'] }>;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UpdateCampaignBudgetInput: UpdateCampaignBudgetInput;
  UpdateCartItemInput: UpdateCartItemInput;
  UpdateOrderFulfillmentInput: UpdateOrderFulfillmentInput;
  UpdateProductInput: UpdateProductInput;
  UpdateQuotationInput: UpdateQuotationInput;
  User: ResolverTypeWrapper<users>;
  UserType: UserType;
  WholesaleAccessGrant: ResolverTypeWrapper<Omit<WholesaleAccessGrant, 'buyer' | 'seller'> & { buyer: ResolversTypes['User'], seller: ResolversTypes['User'] }>;
  WholesaleInvitation: ResolverTypeWrapper<Omit<WholesaleInvitation, 'buyer' | 'seller'> & { buyer?: Maybe<ResolversTypes['User']>, seller: ResolversTypes['User'] }>;
  WholesaleInvitationConnection: ResolverTypeWrapper<Omit<WholesaleInvitationConnection, 'edges'> & { edges: Array<ResolversTypes['WholesaleInvitationEdge']> }>;
  WholesaleInvitationEdge: ResolverTypeWrapper<Omit<WholesaleInvitationEdge, 'node'> & { node: ResolversTypes['WholesaleInvitation'] }>;
  WholesaleInvitationStatus: WholesaleInvitationStatus;
  WholesaleOrder: ResolverTypeWrapper<Omit<WholesaleOrder, 'buyer' | 'events' | 'invoice' | 'items' | 'packingSlip' | 'seller'> & { buyer: ResolversTypes['User'], events: Array<ResolversTypes['WholesaleOrderEvent']>, invoice?: Maybe<ResolversTypes['Invoice']>, items: Array<ResolversTypes['WholesaleOrderItem']>, packingSlip?: Maybe<ResolversTypes['PackingSlip']>, seller: ResolversTypes['User'] }>;
  WholesaleOrderConnection: ResolverTypeWrapper<Omit<WholesaleOrderConnection, 'edges'> & { edges: Array<ResolversTypes['WholesaleOrderEdge']> }>;
  WholesaleOrderEdge: ResolverTypeWrapper<Omit<WholesaleOrderEdge, 'node'> & { node: ResolversTypes['WholesaleOrder'] }>;
  WholesaleOrderEvent: ResolverTypeWrapper<Omit<WholesaleOrderEvent, 'performedByUser'> & { performedByUser?: Maybe<ResolversTypes['User']> }>;
  WholesaleOrderItem: ResolverTypeWrapper<Omit<WholesaleOrderItem, 'product'> & { product: ResolversTypes['Product'] }>;
  WholesaleOrderItemInput: WholesaleOrderItemInput;
  WholesalePricingTier: ResolverTypeWrapper<WholesalePricingTier>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AddSubscriberInput: AddSubscriberInput;
  AddToCartInput: AddToCartInput;
  Address: Address;
  AddressInput: AddressInput;
  AuthToken: AuthToken;
  AutomationExecution: Omit<AutomationExecution, 'subscriber' | 'workflow'> & { subscriber?: Maybe<ResolversParentTypes['Subscriber']>, workflow: ResolversParentTypes['AutomationWorkflow'] };
  AutomationWorkflow: Omit<AutomationWorkflow, 'executions'> & { executions: Array<ResolversParentTypes['AutomationExecution']> };
  BackgroundJobRun: BackgroundJobRun;
  BackgroundJobRunConnection: BackgroundJobRunConnection;
  BackgroundJobRunEdge: BackgroundJobRunEdge;
  Boolean: Scalars['Boolean']['output'];
  BuyerProfile: Omit<BuyerProfile, 'user'> & { user: ResolversParentTypes['User'] };
  Cart: Omit<Cart, 'buyer' | 'currentSession' | 'items' | 'seller'> & { buyer?: Maybe<ResolversParentTypes['User']>, currentSession?: Maybe<ResolversParentTypes['CartSession']>, items: Array<ResolversParentTypes['CartItem']>, seller: ResolversParentTypes['User'] };
  CartItem: Omit<CartItem, 'product' | 'reservation' | 'variant'> & { product: ResolversParentTypes['Product'], reservation?: Maybe<ResolversParentTypes['StockReservation']>, variant?: Maybe<ResolversParentTypes['ProductVariant']> };
  CartSession: Omit<CartSession, 'cart'> & { cart: ResolversParentTypes['Cart'] };
  Category: Category;
  CheckoutSession: Omit<CheckoutSession, 'cart'> & { cart: ResolversParentTypes['Cart'] };
  ConnectDomainInput: ConnectDomainInput;
  CreateCheckoutSessionInput: CreateCheckoutSessionInput;
  CreateNewsletterCampaignInput: CreateNewsletterCampaignInput;
  CreateOrderInput: CreateOrderInput;
  CreateProductInput: CreateProductInput;
  CreateQuotationInput: CreateQuotationInput;
  CreateWholesaleInvitationInput: CreateWholesaleInvitationInput;
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  DomainConnection: Omit<DomainConnection, 'seller'> & { seller: ResolversParentTypes['User'] };
  DomainConnectionConnection: Omit<DomainConnectionConnection, 'edges'> & { edges: Array<ResolversParentTypes['DomainConnectionEdge']> };
  DomainConnectionEdge: Omit<DomainConnectionEdge, 'node'> & { node: ResolversParentTypes['DomainConnection'] };
  FulfillmentEvent: Omit<FulfillmentEvent, 'items' | 'order'> & { items: Array<ResolversParentTypes['OrderItem']>, order: ResolversParentTypes['Order'] };
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Invoice: Omit<Invoice, 'order'> & { order: ResolversParentTypes['Order'] };
  IssueRefundInput: IssueRefundInput;
  JSON: Scalars['JSON']['output'];
  LaunchMetaCampaignInput: LaunchMetaCampaignInput;
  MarketingAudience: Omit<MarketingAudience, 'campaigns'> & { campaigns: Array<ResolversParentTypes['MetaCampaign']> };
  MetaAdAccount: Omit<MetaAdAccount, 'seller'> & { seller: ResolversParentTypes['User'] };
  MetaAdSet: Omit<MetaAdSet, 'campaign' | 'creatives'> & { campaign: ResolversParentTypes['MetaCampaign'], creatives: Array<ResolversParentTypes['MetaCreative']> };
  MetaCampaign: Omit<MetaCampaign, 'adSets' | 'products' | 'seller'> & { adSets: Array<ResolversParentTypes['MetaAdSet']>, products: Array<ResolversParentTypes['Product']>, seller: ResolversParentTypes['User'] };
  MetaCampaignConnection: Omit<MetaCampaignConnection, 'edges'> & { edges: Array<ResolversParentTypes['MetaCampaignEdge']> };
  MetaCampaignEdge: Omit<MetaCampaignEdge, 'node'> & { node: ResolversParentTypes['MetaCampaign'] };
  MetaCampaignMetrics: MetaCampaignMetrics;
  MetaCreative: Omit<MetaCreative, 'adSet'> & { adSet: ResolversParentTypes['MetaAdSet'] };
  MetaDailyMetrics: MetaDailyMetrics;
  Mutation: Record<PropertyKey, never>;
  NewsletterCampaign: Omit<NewsletterCampaign, 'segments' | 'seller'> & { segments: Array<ResolversParentTypes['Segment']>, seller: ResolversParentTypes['User'] };
  NewsletterCampaignConnection: Omit<NewsletterCampaignConnection, 'edges'> & { edges: Array<ResolversParentTypes['NewsletterCampaignEdge']> };
  NewsletterCampaignEdge: Omit<NewsletterCampaignEdge, 'node'> & { node: ResolversParentTypes['NewsletterCampaign'] };
  NewsletterTemplate: NewsletterTemplate;
  Notification: Omit<Notification, 'user'> & { user: ResolversParentTypes['User'] };
  NotificationConnection: Omit<NotificationConnection, 'edges'> & { edges: Array<ResolversParentTypes['NotificationEdge']> };
  NotificationEdge: Omit<NotificationEdge, 'node'> & { node: ResolversParentTypes['Notification'] };
  Order: Omit<Order, 'buyer' | 'events' | 'invoice' | 'items' | 'packingSlip' | 'refunds' | 'seller' | 'shippingLabel'> & { buyer?: Maybe<ResolversParentTypes['User']>, events: Array<ResolversParentTypes['OrderEvent']>, invoice?: Maybe<ResolversParentTypes['Invoice']>, items: Array<ResolversParentTypes['OrderItem']>, packingSlip?: Maybe<ResolversParentTypes['PackingSlip']>, refunds: Array<ResolversParentTypes['Refund']>, seller: ResolversParentTypes['User'], shippingLabel?: Maybe<ResolversParentTypes['ShippingLabel']> };
  OrderConnection: Omit<OrderConnection, 'edges'> & { edges: Array<ResolversParentTypes['OrderEdge']> };
  OrderEdge: Omit<OrderEdge, 'node'> & { node: ResolversParentTypes['Order'] };
  OrderEvent: Omit<OrderEvent, 'performedByUser'> & { performedByUser?: Maybe<ResolversParentTypes['User']> };
  OrderFilterInput: OrderFilterInput;
  OrderItem: Omit<OrderItem, 'product'> & { product: ResolversParentTypes['Product'] };
  OrderSortInput: OrderSortInput;
  PackingSlip: Omit<PackingSlip, 'order'> & { order: ResolversParentTypes['Order'] };
  PageInfo: PageInfo;
  PaymentIntent: PaymentIntent;
  PlaceWholesaleOrderInput: PlaceWholesaleOrderInput;
  PlatformAnalytics: PlatformAnalytics;
  Product: products;
  ProductConnection: Omit<ProductConnection, 'edges'> & { edges: Array<ResolversParentTypes['ProductEdge']> };
  ProductEdge: Omit<ProductEdge, 'node'> & { node: ResolversParentTypes['Product'] };
  ProductFilterInput: ProductFilterInput;
  ProductSortInput: ProductSortInput;
  ProductVariant: Omit<ProductVariant, 'product'> & { product: ResolversParentTypes['Product'] };
  Query: Record<PropertyKey, never>;
  Quotation: Omit<Quotation, 'activities' | 'buyer' | 'items' | 'order' | 'payments' | 'seller'> & { activities: Array<ResolversParentTypes['QuotationActivity']>, buyer?: Maybe<ResolversParentTypes['User']>, items: Array<ResolversParentTypes['QuotationLineItem']>, order?: Maybe<ResolversParentTypes['Order']>, payments: Array<ResolversParentTypes['QuotationPayment']>, seller: ResolversParentTypes['User'] };
  QuotationActivity: Omit<QuotationActivity, 'performedByUser'> & { performedByUser: ResolversParentTypes['User'] };
  QuotationConnection: Omit<QuotationConnection, 'edges'> & { edges: Array<ResolversParentTypes['QuotationEdge']> };
  QuotationEdge: Omit<QuotationEdge, 'node'> & { node: ResolversParentTypes['Quotation'] };
  QuotationLineItem: Omit<QuotationLineItem, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  QuotationLineItemInput: QuotationLineItemInput;
  QuotationPayment: Omit<QuotationPayment, 'quotation'> & { quotation: ResolversParentTypes['Quotation'] };
  Refund: Omit<Refund, 'lineItems' | 'order' | 'processedByUser'> & { lineItems: Array<ResolversParentTypes['RefundLineItem']>, order: ResolversParentTypes['Order'], processedByUser: ResolversParentTypes['User'] };
  RefundLineItem: Omit<RefundLineItem, 'orderItem'> & { orderItem?: Maybe<ResolversParentTypes['OrderItem']> };
  RefundLineItemInput: RefundLineItemInput;
  SKU: Sku;
  SavedAddress: Omit<SavedAddress, 'user'> & { user: ResolversParentTypes['User'] };
  Segment: Omit<Segment, 'subscribers'> & { subscribers: Array<ResolversParentTypes['Subscriber']> };
  SellerAccount: Omit<SellerAccount, 'domains' | 'user'> & { domains: Array<ResolversParentTypes['DomainConnection']>, user: ResolversParentTypes['User'] };
  SellerHomepage: SellerHomepage;
  SellerSubscription: Omit<SellerSubscription, 'seller'> & { seller: ResolversParentTypes['User'] };
  Shipment: Omit<Shipment, 'order'> & { order: ResolversParentTypes['Order'] };
  ShipmentEvent: ShipmentEvent;
  ShippingLabel: Omit<ShippingLabel, 'order'> & { order: ResolversParentTypes['Order'] };
  StockLevel: Omit<StockLevel, 'product'> & { product: ResolversParentTypes['Product'] };
  StockReservation: Omit<StockReservation, 'product'> & { product: ResolversParentTypes['Product'] };
  StoredPaymentMethod: Omit<StoredPaymentMethod, 'user'> & { user: ResolversParentTypes['User'] };
  String: Scalars['String']['output'];
  Subscriber: Omit<Subscriber, 'segments' | 'seller'> & { segments: Array<ResolversParentTypes['Segment']>, seller: ResolversParentTypes['User'] };
  SubscriberConnection: Omit<SubscriberConnection, 'edges'> & { edges: Array<ResolversParentTypes['SubscriberEdge']> };
  SubscriberEdge: Omit<SubscriberEdge, 'node'> & { node: ResolversParentTypes['Subscriber'] };
  SubscriberEngagement: SubscriberEngagement;
  Subscription: Record<PropertyKey, never>;
  SubscriptionInvoice: Omit<SubscriptionInvoice, 'subscription'> & { subscription: ResolversParentTypes['SellerSubscription'] };
  SubscriptionInvoiceConnection: Omit<SubscriptionInvoiceConnection, 'edges'> & { edges: Array<ResolversParentTypes['SubscriptionInvoiceEdge']> };
  SubscriptionInvoiceEdge: Omit<SubscriptionInvoiceEdge, 'node'> & { node: ResolversParentTypes['SubscriptionInvoice'] };
  TeamMembership: Omit<TeamMembership, 'storeOwner' | 'teamMember'> & { storeOwner: ResolversParentTypes['User'], teamMember: ResolversParentTypes['User'] };
  URL: Scalars['URL']['output'];
  UpdateCampaignBudgetInput: UpdateCampaignBudgetInput;
  UpdateCartItemInput: UpdateCartItemInput;
  UpdateOrderFulfillmentInput: UpdateOrderFulfillmentInput;
  UpdateProductInput: UpdateProductInput;
  UpdateQuotationInput: UpdateQuotationInput;
  User: users;
  WholesaleAccessGrant: Omit<WholesaleAccessGrant, 'buyer' | 'seller'> & { buyer: ResolversParentTypes['User'], seller: ResolversParentTypes['User'] };
  WholesaleInvitation: Omit<WholesaleInvitation, 'buyer' | 'seller'> & { buyer?: Maybe<ResolversParentTypes['User']>, seller: ResolversParentTypes['User'] };
  WholesaleInvitationConnection: Omit<WholesaleInvitationConnection, 'edges'> & { edges: Array<ResolversParentTypes['WholesaleInvitationEdge']> };
  WholesaleInvitationEdge: Omit<WholesaleInvitationEdge, 'node'> & { node: ResolversParentTypes['WholesaleInvitation'] };
  WholesaleOrder: Omit<WholesaleOrder, 'buyer' | 'events' | 'invoice' | 'items' | 'packingSlip' | 'seller'> & { buyer: ResolversParentTypes['User'], events: Array<ResolversParentTypes['WholesaleOrderEvent']>, invoice?: Maybe<ResolversParentTypes['Invoice']>, items: Array<ResolversParentTypes['WholesaleOrderItem']>, packingSlip?: Maybe<ResolversParentTypes['PackingSlip']>, seller: ResolversParentTypes['User'] };
  WholesaleOrderConnection: Omit<WholesaleOrderConnection, 'edges'> & { edges: Array<ResolversParentTypes['WholesaleOrderEdge']> };
  WholesaleOrderEdge: Omit<WholesaleOrderEdge, 'node'> & { node: ResolversParentTypes['WholesaleOrder'] };
  WholesaleOrderEvent: Omit<WholesaleOrderEvent, 'performedByUser'> & { performedByUser?: Maybe<ResolversParentTypes['User']> };
  WholesaleOrderItem: Omit<WholesaleOrderItem, 'product'> & { product: ResolversParentTypes['Product'] };
  WholesaleOrderItemInput: WholesaleOrderItemInput;
  WholesalePricingTier: WholesalePricingTier;
}>;

export type AddressResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Address'] = ResolversParentTypes['Address']> = ResolversObject<{
  addressLine1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  addressLine2?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  country?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  postalCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type AuthTokenResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuthToken'] = ResolversParentTypes['AuthToken']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sellerContext?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tokenType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  used?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type AutomationExecutionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AutomationExecution'] = ResolversParentTypes['AutomationExecution']> = ResolversObject<{
  actionsTaken?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  executedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subscriber?: Resolver<Maybe<ResolversTypes['Subscriber']>, ParentType, ContextType>;
  subscriberEmail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subscriberId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  triggerData?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  workflow?: Resolver<ResolversTypes['AutomationWorkflow'], ParentType, ContextType>;
  workflowId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type AutomationWorkflowResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AutomationWorkflow'] = ResolversParentTypes['AutomationWorkflow']> = ResolversObject<{
  actions?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  executions?: Resolver<Array<ResolversTypes['AutomationExecution']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  trigger?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type BackgroundJobRunResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BackgroundJobRun'] = ResolversParentTypes['BackgroundJobRun']> = ResolversObject<{
  completedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  duration?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  errorStack?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jobName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  nextRetryAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  recordsFailed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recordsProcessed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  retryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BackgroundJobStatus'], ParentType, ContextType>;
}>;

export type BackgroundJobRunConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BackgroundJobRunConnection'] = ResolversParentTypes['BackgroundJobRunConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['BackgroundJobRunEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type BackgroundJobRunEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BackgroundJobRunEdge'] = ResolversParentTypes['BackgroundJobRunEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['BackgroundJobRun'], ParentType, ContextType>;
}>;

export type BuyerProfileResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BuyerProfile'] = ResolversParentTypes['BuyerProfile']> = ResolversObject<{
  billingAddress?: Resolver<Maybe<ResolversTypes['Address']>, ParentType, ContextType>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  creditLimit?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  defaultPaymentTerms?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  shippingAddress?: Resolver<Maybe<ResolversTypes['Address']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  vatNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type CartResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Cart'] = ResolversParentTypes['Cart']> = ResolversObject<{
  buyer?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  buyerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currentSession?: Resolver<Maybe<ResolversTypes['CartSession']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  itemCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['CartItem']>, ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subtotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type CartItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CartItem'] = ResolversParentTypes['CartItem']> = ResolversObject<{
  lineTotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reservation?: Resolver<Maybe<ResolversTypes['StockReservation']>, ParentType, ContextType>;
  unitPrice?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType>;
  variantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type CartSessionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CartSession'] = ResolversParentTypes['CartSession']> = ResolversObject<{
  cart?: Resolver<ResolversTypes['Cart'], ParentType, ContextType>;
  cartId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastSeen?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  sessionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type CategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  children?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  parentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type CheckoutSessionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CheckoutSession'] = ResolversParentTypes['CheckoutSession']> = ResolversObject<{
  billingAddress?: Resolver<Maybe<ResolversTypes['Address']>, ParentType, ContextType>;
  cart?: Resolver<ResolversTypes['Cart'], ParentType, ContextType>;
  cartId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  paymentIntent?: Resolver<Maybe<ResolversTypes['PaymentIntent']>, ParentType, ContextType>;
  paymentIntentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  shippingAddress?: Resolver<Maybe<ResolversTypes['Address']>, ParentType, ContextType>;
  shippingCost?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subtotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  taxAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface DecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Decimal'], any> {
  name: 'Decimal';
}

export type DomainConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DomainConnection'] = ResolversParentTypes['DomainConnection']> = ResolversObject<{
  cloudflareCustomHostnameId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dnsInstructions?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  failureCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  failureReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastCheckedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastVerifiedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  normalizedDomain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  retryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sslExpiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sslIssuedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sslProvider?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sslRenewAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sslStatus?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['DomainStatus'], ParentType, ContextType>;
  strategy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  verificationToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type DomainConnectionConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DomainConnectionConnection'] = ResolversParentTypes['DomainConnectionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['DomainConnectionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type DomainConnectionEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DomainConnectionEdge'] = ResolversParentTypes['DomainConnectionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['DomainConnection'], ParentType, ContextType>;
}>;

export type FulfillmentEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FulfillmentEvent'] = ResolversParentTypes['FulfillmentEvent']> = ResolversObject<{
  carrier?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['OrderItem']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['FulfillmentStatus'], ParentType, ContextType>;
  trackingNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type InvoiceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Invoice'] = ResolversParentTypes['Invoice']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  documentType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  documentUrl?: Resolver<ResolversTypes['URL'], ParentType, ContextType>;
  generatedBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  generationTrigger?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  incoterms?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  invoiceNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  paymentTerms?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  poNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  taxAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  vatNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MarketingAudienceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MarketingAudience'] = ResolversParentTypes['MarketingAudience']> = ResolversObject<{
  campaigns?: Resolver<Array<ResolversTypes['MetaCampaign']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  criteria?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  estimatedSize?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type MetaAdAccountResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetaAdAccount'] = ResolversParentTypes['MetaAdAccount']> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  businessName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<Maybe<ResolversTypes['Currency']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isSelected?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastSyncedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  metaAdAccountId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metaUserId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timezone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tokenExpiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  totalRevenue?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  totalSpent?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type MetaAdSetResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetaAdSet'] = ResolversParentTypes['MetaAdSet']> = ResolversObject<{
  budget?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  campaign?: Resolver<ResolversTypes['MetaCampaign'], ParentType, ContextType>;
  campaignId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  creatives?: Resolver<Array<ResolversTypes['MetaCreative']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metaAdSetId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targeting?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type MetaCampaignResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetaCampaign'] = ResolversParentTypes['MetaCampaign']> = ResolversObject<{
  adCopy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  adSets?: Resolver<Array<ResolversTypes['MetaAdSet']>, ParentType, ContextType>;
  advantageAudience?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  advantagePlacements?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  advantagePlusEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  amountCharged?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  callToAction?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  campaignName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dailyBudget?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  dailyMetrics?: Resolver<Array<ResolversTypes['MetaDailyMetrics']>, ParentType, ContextType>;
  endDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  headline?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastSyncAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  metaCampaignId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  metaSpend?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['MetaCampaignMetrics'], ParentType, ContextType>;
  objective?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  platformFee?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  productIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  products?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
  remainingBudget?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  startDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CampaignStatus'], ParentType, ContextType>;
  stripePaymentIntentId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  targetAgeMax?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  targetAgeMin?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  targetCountries?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  targetGender?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  targetLanguages?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  totalBudget?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type MetaCampaignConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetaCampaignConnection'] = ResolversParentTypes['MetaCampaignConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['MetaCampaignEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type MetaCampaignEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetaCampaignEdge'] = ResolversParentTypes['MetaCampaignEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['MetaCampaign'], ParentType, ContextType>;
}>;

export type MetaCampaignMetricsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetaCampaignMetrics'] = ResolversParentTypes['MetaCampaignMetrics']> = ResolversObject<{
  clicks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  conversionRate?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  conversions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  cpc?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  cpm?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  ctr?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  impressions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reach?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revenue?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  roas?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  spend?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
}>;

export type MetaCreativeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetaCreative'] = ResolversParentTypes['MetaCreative']> = ResolversObject<{
  adCopy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  adSet?: Resolver<ResolversTypes['MetaAdSet'], ParentType, ContextType>;
  adSetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  callToAction?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  headline?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  metaCreativeId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  videoUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
}>;

export type MetaDailyMetricsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MetaDailyMetrics'] = ResolversParentTypes['MetaDailyMetrics']> = ResolversObject<{
  clicks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  comments?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  conversions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  cpc?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  cpm?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  impressions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  likes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  linkClicks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  purchases?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reach?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revenue?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  saves?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  shares?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  spend?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  websiteVisits?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  acceptInvitation?: Resolver<ResolversTypes['WholesaleAccessGrant'], ParentType, ContextType, RequireFields<MutationAcceptInvitationArgs, 'token'>>;
  acceptQuotation?: Resolver<ResolversTypes['Quotation'], ParentType, ContextType, RequireFields<MutationAcceptQuotationArgs, 'id'>>;
  addSubscriber?: Resolver<ResolversTypes['Subscriber'], ParentType, ContextType, RequireFields<MutationAddSubscriberArgs, 'input'>>;
  addToCart?: Resolver<ResolversTypes['Cart'], ParentType, ContextType, RequireFields<MutationAddToCartArgs, 'input'>>;
  cancelCampaign?: Resolver<ResolversTypes['MetaCampaign'], ParentType, ContextType, RequireFields<MutationCancelCampaignArgs, 'campaignId'>>;
  cancelQuotation?: Resolver<ResolversTypes['Quotation'], ParentType, ContextType, RequireFields<MutationCancelQuotationArgs, 'id'>>;
  cancelSubscription?: Resolver<ResolversTypes['SellerSubscription'], ParentType, ContextType, RequireFields<MutationCancelSubscriptionArgs, 'subscriptionId'>>;
  capturePayment?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationCapturePaymentArgs, 'orderId' | 'paymentIntentId'>>;
  clearCart?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationClearCartArgs, 'cartId'>>;
  connectDomain?: Resolver<ResolversTypes['DomainConnection'], ParentType, ContextType, RequireFields<MutationConnectDomainArgs, 'input'>>;
  connectMetaAdAccount?: Resolver<ResolversTypes['MetaAdAccount'], ParentType, ContextType, RequireFields<MutationConnectMetaAdAccountArgs, 'accessToken' | 'metaAdAccountId'>>;
  createCheckoutSession?: Resolver<ResolversTypes['CheckoutSession'], ParentType, ContextType, RequireFields<MutationCreateCheckoutSessionArgs, 'input'>>;
  createNewsletterCampaign?: Resolver<ResolversTypes['NewsletterCampaign'], ParentType, ContextType, RequireFields<MutationCreateNewsletterCampaignArgs, 'input'>>;
  createOrder?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationCreateOrderArgs, 'input'>>;
  createProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationCreateProductArgs, 'input'>>;
  createQuotation?: Resolver<ResolversTypes['Quotation'], ParentType, ContextType, RequireFields<MutationCreateQuotationArgs, 'input'>>;
  createSegment?: Resolver<ResolversTypes['Segment'], ParentType, ContextType, RequireFields<MutationCreateSegmentArgs, 'criteria' | 'name'>>;
  createSubscription?: Resolver<ResolversTypes['SellerSubscription'], ParentType, ContextType, RequireFields<MutationCreateSubscriptionArgs, 'paymentMethodId' | 'tier'>>;
  createWholesaleInvitation?: Resolver<ResolversTypes['WholesaleInvitation'], ParentType, ContextType, RequireFields<MutationCreateWholesaleInvitationArgs, 'input'>>;
  deleteAddress?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteAddressArgs, 'id'>>;
  deletePaymentMethod?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeletePaymentMethodArgs, 'id'>>;
  deleteProduct?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteProductArgs, 'id'>>;
  deleteSegment?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteSegmentArgs, 'id'>>;
  disconnectDomain?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDisconnectDomainArgs, 'id'>>;
  disconnectMetaAdAccount?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDisconnectMetaAdAccountArgs, 'id'>>;
  generateInvoice?: Resolver<ResolversTypes['Invoice'], ParentType, ContextType, RequireFields<MutationGenerateInvoiceArgs, 'orderId'>>;
  generatePackingSlip?: Resolver<ResolversTypes['PackingSlip'], ParentType, ContextType, RequireFields<MutationGeneratePackingSlipArgs, 'orderId'>>;
  issueRefund?: Resolver<ResolversTypes['Refund'], ParentType, ContextType, RequireFields<MutationIssueRefundArgs, 'input'>>;
  launchMetaCampaign?: Resolver<ResolversTypes['MetaCampaign'], ParentType, ContextType, RequireFields<MutationLaunchMetaCampaignArgs, 'input'>>;
  login?: Resolver<ResolversTypes['AuthToken'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'email'>>;
  logout?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  markAllNotificationsRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  markNotificationRead?: Resolver<ResolversTypes['Notification'], ParentType, ContextType, RequireFields<MutationMarkNotificationReadArgs, 'id'>>;
  pauseCampaign?: Resolver<ResolversTypes['MetaCampaign'], ParentType, ContextType, RequireFields<MutationPauseCampaignArgs, 'campaignId'>>;
  payQuotationBalance?: Resolver<ResolversTypes['QuotationPayment'], ParentType, ContextType, RequireFields<MutationPayQuotationBalanceArgs, 'id' | 'paymentMethodId'>>;
  payQuotationDeposit?: Resolver<ResolversTypes['QuotationPayment'], ParentType, ContextType, RequireFields<MutationPayQuotationDepositArgs, 'id' | 'paymentMethodId'>>;
  placeWholesaleOrder?: Resolver<ResolversTypes['WholesaleOrder'], ParentType, ContextType, RequireFields<MutationPlaceWholesaleOrderArgs, 'input'>>;
  purchaseShippingLabel?: Resolver<ResolversTypes['ShippingLabel'], ParentType, ContextType, RequireFields<MutationPurchaseShippingLabelArgs, 'orderId' | 'rateId'>>;
  rejectInvitation?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRejectInvitationArgs, 'token'>>;
  releaseStock?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationReleaseStockArgs, 'reservationId'>>;
  removeFromCart?: Resolver<ResolversTypes['Cart'], ParentType, ContextType, RequireFields<MutationRemoveFromCartArgs, 'cartId' | 'productId'>>;
  requestWholesaleBalance?: Resolver<ResolversTypes['WholesaleOrder'], ParentType, ContextType, RequireFields<MutationRequestWholesaleBalanceArgs, 'orderId'>>;
  reserveStock?: Resolver<ResolversTypes['StockReservation'], ParentType, ContextType, RequireFields<MutationReserveStockArgs, 'productId' | 'quantity'>>;
  resumeCampaign?: Resolver<ResolversTypes['MetaCampaign'], ParentType, ContextType, RequireFields<MutationResumeCampaignArgs, 'campaignId'>>;
  saveAddress?: Resolver<ResolversTypes['SavedAddress'], ParentType, ContextType, RequireFields<MutationSaveAddressArgs, 'address'>>;
  savePaymentMethod?: Resolver<ResolversTypes['StoredPaymentMethod'], ParentType, ContextType, RequireFields<MutationSavePaymentMethodArgs, 'paymentMethodId'>>;
  sendCampaign?: Resolver<ResolversTypes['NewsletterCampaign'], ParentType, ContextType, RequireFields<MutationSendCampaignArgs, 'campaignId'>>;
  setPrimaryDomain?: Resolver<ResolversTypes['DomainConnection'], ParentType, ContextType, RequireFields<MutationSetPrimaryDomainArgs, 'id'>>;
  submitQuotation?: Resolver<ResolversTypes['Quotation'], ParentType, ContextType, RequireFields<MutationSubmitQuotationArgs, 'id'>>;
  unsubscribe?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationUnsubscribeArgs, 'email'>>;
  updateBudget?: Resolver<ResolversTypes['MetaCampaign'], ParentType, ContextType, RequireFields<MutationUpdateBudgetArgs, 'input'>>;
  updateCartItem?: Resolver<ResolversTypes['Cart'], ParentType, ContextType, RequireFields<MutationUpdateCartItemArgs, 'cartId' | 'input'>>;
  updateFulfillment?: Resolver<ResolversTypes['Order'], ParentType, ContextType, RequireFields<MutationUpdateFulfillmentArgs, 'input'>>;
  updatePaymentMethod?: Resolver<ResolversTypes['SellerSubscription'], ParentType, ContextType, RequireFields<MutationUpdatePaymentMethodArgs, 'paymentMethodId' | 'subscriptionId'>>;
  updateProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType, RequireFields<MutationUpdateProductArgs, 'id' | 'input'>>;
  updateProfile?: Resolver<ResolversTypes['User'], ParentType, ContextType, Partial<MutationUpdateProfileArgs>>;
  updateQuotation?: Resolver<ResolversTypes['Quotation'], ParentType, ContextType, RequireFields<MutationUpdateQuotationArgs, 'id' | 'input'>>;
  updateSegment?: Resolver<ResolversTypes['Segment'], ParentType, ContextType, RequireFields<MutationUpdateSegmentArgs, 'id'>>;
  updateSellerAccount?: Resolver<ResolversTypes['SellerAccount'], ParentType, ContextType, Partial<MutationUpdateSellerAccountArgs>>;
  verifyDomain?: Resolver<ResolversTypes['DomainConnection'], ParentType, ContextType, RequireFields<MutationVerifyDomainArgs, 'id'>>;
  verifyLoginCode?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationVerifyLoginCodeArgs, 'code' | 'email'>>;
}>;

export type NewsletterCampaignResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NewsletterCampaign'] = ResolversParentTypes['NewsletterCampaign']> = ResolversObject<{
  bounceCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  bounceRate?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  clickCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  clickRate?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deliveredCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fromEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fromName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  htmlContent?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  openCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  openRate?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  recipientCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  replyToEmail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  scheduledAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  segments?: Resolver<Array<ResolversTypes['Segment']>, ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sentAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  template?: Resolver<Maybe<ResolversTypes['NewsletterTemplate']>, ParentType, ContextType>;
  templateId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  textContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  unsubscribeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type NewsletterCampaignConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NewsletterCampaignConnection'] = ResolversParentTypes['NewsletterCampaignConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NewsletterCampaignEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type NewsletterCampaignEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NewsletterCampaignEdge'] = ResolversParentTypes['NewsletterCampaignEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['NewsletterCampaign'], ParentType, ContextType>;
}>;

export type NewsletterTemplateResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NewsletterTemplate'] = ResolversParentTypes['NewsletterTemplate']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  htmlContent?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  textContent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  thumbnailUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variables?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type NotificationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Notification'] = ResolversParentTypes['Notification']> = ResolversObject<{
  actionUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  readAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  relatedEntityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  relatedEntityType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type NotificationConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NotificationConnection'] = ResolversParentTypes['NotificationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NotificationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type NotificationEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NotificationEdge'] = ResolversParentTypes['NotificationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Notification'], ParentType, ContextType>;
}>;

export type OrderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Order'] = ResolversParentTypes['Order']> = ResolversObject<{
  balanceDue?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  balancePaidAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  balancePaymentStatus?: Resolver<Maybe<ResolversTypes['PaymentStatus']>, ParentType, ContextType>;
  billingAddress?: Resolver<Maybe<ResolversTypes['Address']>, ParentType, ContextType>;
  buyer?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  buyerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  buyerNotes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  carrier?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  customerEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  customerName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  customerPhone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  depositAmount?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  depositPercentage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  events?: Resolver<Array<ResolversTypes['OrderEvent']>, ParentType, ContextType>;
  fulfillmentStatus?: Resolver<ResolversTypes['FulfillmentStatus'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  invoice?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['OrderItem']>, ParentType, ContextType>;
  orderNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  packingSlip?: Resolver<Maybe<ResolversTypes['PackingSlip']>, ParentType, ContextType>;
  paidAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  paymentIntent?: Resolver<Maybe<ResolversTypes['PaymentIntent']>, ParentType, ContextType>;
  paymentIntentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  paymentStatus?: Resolver<ResolversTypes['PaymentStatus'], ParentType, ContextType>;
  refunds?: Resolver<Array<ResolversTypes['Refund']>, ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sellerNotes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  shippingAddress?: Resolver<ResolversTypes['Address'], ParentType, ContextType>;
  shippingCost?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  shippingLabel?: Resolver<Maybe<ResolversTypes['ShippingLabel']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrderStatus'], ParentType, ContextType>;
  subtotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  taxAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  trackingNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type OrderConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderConnection'] = ResolversParentTypes['OrderConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['OrderEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type OrderEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderEdge'] = ResolversParentTypes['OrderEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
}>;

export type OrderEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderEvent'] = ResolversParentTypes['OrderEvent']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  performedBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  performedByUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type OrderItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrderItem'] = ResolversParentTypes['OrderItem']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fulfillmentStatus?: Resolver<ResolversTypes['FulfillmentStatus'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineTotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  productImage?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  productName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unitPrice?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  variantDetails?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  variantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type PackingSlipResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PackingSlip'] = ResolversParentTypes['PackingSlip']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  documentUrl?: Resolver<ResolversTypes['URL'], ParentType, ContextType>;
  generatedBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  generationTrigger?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  giftMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  includesPricing?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  packingSlipNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  warehouseNotes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type PaymentIntentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PaymentIntent'] = ResolversParentTypes['PaymentIntent']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  clientSecret?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  providerIntentId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  providerName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['PaymentStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type PlatformAnalyticsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PlatformAnalytics'] = ResolversParentTypes['PlatformAnalytics']> = ResolversObject<{
  activeUsers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  newBuyers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  newSellers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  newSignups?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ordersPlaced?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  productsListed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revenue?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  depositAmount?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  discountPercentage?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  flatShippingRate?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  image?: Resolver<ResolversTypes['URL'], ParentType, ContextType>;
  images?: Resolver<Array<ResolversTypes['URL']>, ParentType, ContextType>;
  inventoryStatus?: Resolver<ResolversTypes['InventoryStatus'], ParentType, ContextType>;
  madeToOrderDays?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  preOrderDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  productType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  promotionActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  promotionEndDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  requiresDeposit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  shippingType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  shippoHeight?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  shippoLength?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  shippoWeight?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  shippoWidth?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  sku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ProductStatus'], ParentType, ContextType>;
  stock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  stockReservations?: Resolver<Array<ResolversTypes['StockReservation']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variants?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
}>;

export type ProductConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductConnection'] = ResolversParentTypes['ProductConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ProductEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductEdge'] = ResolversParentTypes['ProductEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
}>;

export type ProductVariantResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProductVariant'] = ResolversParentTypes['ProductVariant']> = ResolversObject<{
  attributes?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  price?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  stock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  getBuyerProfile?: Resolver<Maybe<ResolversTypes['BuyerProfile']>, ParentType, ContextType, RequireFields<QueryGetBuyerProfileArgs, 'userId'>>;
  getCampaign?: Resolver<Maybe<ResolversTypes['MetaCampaign']>, ParentType, ContextType, RequireFields<QueryGetCampaignArgs, 'id'>>;
  getCampaignDailyMetrics?: Resolver<Array<ResolversTypes['MetaDailyMetrics']>, ParentType, ContextType, RequireFields<QueryGetCampaignDailyMetricsArgs, 'campaignId' | 'dateFrom' | 'dateTo'>>;
  getCampaignMetrics?: Resolver<Maybe<ResolversTypes['MetaCampaignMetrics']>, ParentType, ContextType, RequireFields<QueryGetCampaignMetricsArgs, 'campaignId'>>;
  getCart?: Resolver<Maybe<ResolversTypes['Cart']>, ParentType, ContextType, RequireFields<QueryGetCartArgs, 'id'>>;
  getCartBySession?: Resolver<Maybe<ResolversTypes['Cart']>, ParentType, ContextType, RequireFields<QueryGetCartBySessionArgs, 'sessionId'>>;
  getCategory?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType, RequireFields<QueryGetCategoryArgs, 'id'>>;
  getCheckoutSession?: Resolver<Maybe<ResolversTypes['CheckoutSession']>, ParentType, ContextType, RequireFields<QueryGetCheckoutSessionArgs, 'id'>>;
  getCurrentUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  getDomain?: Resolver<Maybe<ResolversTypes['DomainConnection']>, ParentType, ContextType, RequireFields<QueryGetDomainArgs, 'id'>>;
  getInventory?: Resolver<Maybe<ResolversTypes['StockLevel']>, ParentType, ContextType, RequireFields<QueryGetInventoryArgs, 'productId'>>;
  getInvoice?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType, RequireFields<QueryGetInvoiceArgs, 'id'>>;
  getInvoiceByOrder?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType, RequireFields<QueryGetInvoiceByOrderArgs, 'orderId'>>;
  getJobRun?: Resolver<Maybe<ResolversTypes['BackgroundJobRun']>, ParentType, ContextType, RequireFields<QueryGetJobRunArgs, 'id'>>;
  getNewsletterAnalytics?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType, RequireFields<QueryGetNewsletterAnalyticsArgs, 'dateFrom' | 'dateTo' | 'sellerId'>>;
  getNewsletterCampaign?: Resolver<Maybe<ResolversTypes['NewsletterCampaign']>, ParentType, ContextType, RequireFields<QueryGetNewsletterCampaignArgs, 'id'>>;
  getOrder?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryGetOrderArgs, 'id'>>;
  getOrderByNumber?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType, RequireFields<QueryGetOrderByNumberArgs, 'orderNumber'>>;
  getPackingSlip?: Resolver<Maybe<ResolversTypes['PackingSlip']>, ParentType, ContextType, RequireFields<QueryGetPackingSlipArgs, 'orderId'>>;
  getPaymentIntent?: Resolver<Maybe<ResolversTypes['PaymentIntent']>, ParentType, ContextType, RequireFields<QueryGetPaymentIntentArgs, 'id'>>;
  getPlatformAnalytics?: Resolver<Array<ResolversTypes['PlatformAnalytics']>, ParentType, ContextType, RequireFields<QueryGetPlatformAnalyticsArgs, 'dateFrom' | 'dateTo'>>;
  getProduct?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryGetProductArgs, 'id'>>;
  getProductBySlug?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryGetProductBySlugArgs, 'sellerId' | 'slug'>>;
  getQuotation?: Resolver<Maybe<ResolversTypes['Quotation']>, ParentType, ContextType, RequireFields<QueryGetQuotationArgs, 'id'>>;
  getQuotationByNumber?: Resolver<Maybe<ResolversTypes['Quotation']>, ParentType, ContextType, RequireFields<QueryGetQuotationByNumberArgs, 'quotationNumber'>>;
  getSeller?: Resolver<Maybe<ResolversTypes['SellerAccount']>, ParentType, ContextType, RequireFields<QueryGetSellerArgs, 'id'>>;
  getStore?: Resolver<Maybe<ResolversTypes['SellerAccount']>, ParentType, ContextType, RequireFields<QueryGetStoreArgs, 'slug'>>;
  getSubscription?: Resolver<Maybe<ResolversTypes['SellerSubscription']>, ParentType, ContextType, RequireFields<QueryGetSubscriptionArgs, 'sellerId'>>;
  getUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryGetUserArgs, 'id'>>;
  getWholesaleInvitation?: Resolver<Maybe<ResolversTypes['WholesaleInvitation']>, ParentType, ContextType, RequireFields<QueryGetWholesaleInvitationArgs, 'token'>>;
  getWholesaleOrder?: Resolver<Maybe<ResolversTypes['WholesaleOrder']>, ParentType, ContextType, RequireFields<QueryGetWholesaleOrderArgs, 'id'>>;
  listAutomationWorkflows?: Resolver<Array<ResolversTypes['AutomationWorkflow']>, ParentType, ContextType, RequireFields<QueryListAutomationWorkflowsArgs, 'sellerId'>>;
  listCampaigns?: Resolver<ResolversTypes['MetaCampaignConnection'], ParentType, ContextType, RequireFields<QueryListCampaignsArgs, 'sellerId'>>;
  listCategories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType, Partial<QueryListCategoriesArgs>>;
  listDomains?: Resolver<ResolversTypes['DomainConnectionConnection'], ParentType, ContextType, RequireFields<QueryListDomainsArgs, 'sellerId'>>;
  listInvoices?: Resolver<ResolversTypes['SubscriptionInvoiceConnection'], ParentType, ContextType, RequireFields<QueryListInvoicesArgs, 'subscriptionId'>>;
  listJobRuns?: Resolver<ResolversTypes['BackgroundJobRunConnection'], ParentType, ContextType, Partial<QueryListJobRunsArgs>>;
  listMetaAdAccounts?: Resolver<Array<ResolversTypes['MetaAdAccount']>, ParentType, ContextType, RequireFields<QueryListMetaAdAccountsArgs, 'sellerId'>>;
  listNewsletterCampaigns?: Resolver<ResolversTypes['NewsletterCampaignConnection'], ParentType, ContextType, RequireFields<QueryListNewsletterCampaignsArgs, 'sellerId'>>;
  listNotifications?: Resolver<ResolversTypes['NotificationConnection'], ParentType, ContextType, RequireFields<QueryListNotificationsArgs, 'userId'>>;
  listOrders?: Resolver<ResolversTypes['OrderConnection'], ParentType, ContextType, Partial<QueryListOrdersArgs>>;
  listPaymentMethods?: Resolver<Array<ResolversTypes['StoredPaymentMethod']>, ParentType, ContextType, RequireFields<QueryListPaymentMethodsArgs, 'userId'>>;
  listProducts?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, Partial<QueryListProductsArgs>>;
  listQuotations?: Resolver<ResolversTypes['QuotationConnection'], ParentType, ContextType, Partial<QueryListQuotationsArgs>>;
  listSavedAddresses?: Resolver<Array<ResolversTypes['SavedAddress']>, ParentType, ContextType, RequireFields<QueryListSavedAddressesArgs, 'userId'>>;
  listSegments?: Resolver<Array<ResolversTypes['Segment']>, ParentType, ContextType, RequireFields<QueryListSegmentsArgs, 'sellerId'>>;
  listSubscribers?: Resolver<ResolversTypes['SubscriberConnection'], ParentType, ContextType, RequireFields<QueryListSubscribersArgs, 'sellerId'>>;
  listWholesaleInvitations?: Resolver<ResolversTypes['WholesaleInvitationConnection'], ParentType, ContextType, Partial<QueryListWholesaleInvitationsArgs>>;
  listWholesaleOrders?: Resolver<ResolversTypes['WholesaleOrderConnection'], ParentType, ContextType, Partial<QueryListWholesaleOrdersArgs>>;
}>;

export type QuotationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Quotation'] = ResolversParentTypes['Quotation']> = ResolversObject<{
  activities?: Resolver<Array<ResolversTypes['QuotationActivity']>, ParentType, ContextType>;
  balanceAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  buyer?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  buyerEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  buyerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  dataSheetUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  deliveryTerms?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  depositAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  depositPercentage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['QuotationLineItem']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Order']>, ParentType, ContextType>;
  orderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  paymentTerms?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  payments?: Resolver<Array<ResolversTypes['QuotationPayment']>, ParentType, ContextType>;
  quotationNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  shippingAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['QuotationStatus'], ParentType, ContextType>;
  subtotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  taxAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  termsAndConditionsUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validUntil?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type QuotationActivityResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuotationActivity'] = ResolversParentTypes['QuotationActivity']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  payload?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  performedBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  performedByUser?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  quotationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type QuotationConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuotationConnection'] = ResolversParentTypes['QuotationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['QuotationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type QuotationEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuotationEdge'] = ResolversParentTypes['QuotationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Quotation'], ParentType, ContextType>;
}>;

export type QuotationLineItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuotationLineItem'] = ResolversParentTypes['QuotationLineItem']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lineTotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  productId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  quotationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  unitPrice?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type QuotationPaymentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuotationPayment'] = ResolversParentTypes['QuotationPayment']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  paidAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  paymentType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  quotation?: Resolver<ResolversTypes['Quotation'], ParentType, ContextType>;
  quotationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['PaymentStatus'], ParentType, ContextType>;
  stripePaymentIntentId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type RefundResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Refund'] = ResolversParentTypes['Refund']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineItems?: Resolver<Array<ResolversTypes['RefundLineItem']>, ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  processedBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  processedByUser?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['PaymentStatus'], ParentType, ContextType>;
  stripeRefundId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
}>;

export type RefundLineItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RefundLineItem'] = ResolversParentTypes['RefundLineItem']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderItem?: Resolver<Maybe<ResolversTypes['OrderItem']>, ParentType, ContextType>;
  orderItemId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  refundId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type SkuResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SKU'] = ResolversParentTypes['SKU']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantityAvailable?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  quantityOnHand?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  quantityReserved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reorderPoint?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  skuCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type SavedAddressResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SavedAddress'] = ResolversParentTypes['SavedAddress']> = ResolversObject<{
  address?: Resolver<ResolversTypes['Address'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type SegmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Segment'] = ResolversParentTypes['Segment']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  criteria?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  subscriberCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subscribers?: Resolver<Array<ResolversTypes['Subscriber']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type SellerAccountResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SellerAccount'] = ResolversParentTypes['SellerAccount']> = ResolversObject<{
  brandColor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  businessEmail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  businessName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  businessPhone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  domains?: Resolver<Array<ResolversTypes['DomainConnection']>, ParentType, ContextType>;
  homepage?: Resolver<Maybe<ResolversTypes['SellerHomepage']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  logoUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  notificationSettings?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  storeName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  storeSlug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stripeAccountId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subscriptionTier?: Resolver<ResolversTypes['SubscriptionTier'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type SellerHomepageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SellerHomepage'] = ResolversParentTypes['SellerHomepage']> = ResolversObject<{
  autoRedirectToHomepage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  bodyCopy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  ctaLabel?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ctaUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  headline?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  heroMediaType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  heroMediaUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastPublishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  musicEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  templateKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type SellerSubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SellerSubscription'] = ResolversParentTypes['SellerSubscription']> = ResolversObject<{
  cancelAtPeriodEnd?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  canceledAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currentPeriodEnd?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currentPeriodStart?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stripeSubscriptionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tier?: Resolver<ResolversTypes['SubscriptionTier'], ParentType, ContextType>;
  trialEnd?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  trialStart?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type ShipmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Shipment'] = ResolversParentTypes['Shipment']> = ResolversObject<{
  actualDeliveryDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  carrier?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  deliveredAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  estimatedDeliveryDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  events?: Resolver<Array<ResolversTypes['ShipmentEvent']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  shippedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  trackingNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ShipmentEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ShipmentEvent'] = ResolversParentTypes['ShipmentEvent']> = ResolversObject<{
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type ShippingLabelResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ShippingLabel'] = ResolversParentTypes['ShippingLabel']> = ResolversObject<{
  baseCostUsd?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  carrier?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  labelUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  markupPercent?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Order'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  purchasedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  serviceLevelName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  shippoRateId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  shippoTransactionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalChargedUsd?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  trackingNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  voidedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type StockLevelResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['StockLevel'] = ResolversParentTypes['StockLevel']> = ResolversObject<{
  availableStock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  inventoryStatus?: Resolver<ResolversTypes['InventoryStatus'], ParentType, ContextType>;
  lastUpdated?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  lowStockThreshold?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reservedStock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalStock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type StockReservationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['StockReservation'] = ResolversParentTypes['StockReservation']> = ResolversObject<{
  committedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  releasedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sessionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  variantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type StoredPaymentMethodResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['StoredPaymentMethod'] = ResolversParentTypes['StoredPaymentMethod']> = ResolversObject<{
  cardBrand?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cardExpMonth?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cardExpYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cardLast4?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  stripePaymentMethodId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type SubscriberResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscriber'] = ResolversParentTypes['Subscriber']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customFields?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  engagement?: Resolver<Maybe<ResolversTypes['SubscriberEngagement']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  segments?: Resolver<Array<ResolversTypes['Segment']>, ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subscribedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  unsubscribedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type SubscriberConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SubscriberConnection'] = ResolversParentTypes['SubscriberConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['SubscriberEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type SubscriberEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SubscriberEdge'] = ResolversParentTypes['SubscriberEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Subscriber'], ParentType, ContextType>;
}>;

export type SubscriberEngagementResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SubscriberEngagement'] = ResolversParentTypes['SubscriberEngagement']> = ResolversObject<{
  engagementScore?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastClickedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastOpenedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  subscriberId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  totalClicks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalOpens?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalSent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  cartSynced?: SubscriptionResolver<ResolversTypes['Cart'], "cartSynced", ParentType, ContextType, Partial<SubscriptionCartSyncedArgs>>;
  inventoryThresholdAlert?: SubscriptionResolver<ResolversTypes['StockLevel'], "inventoryThresholdAlert", ParentType, ContextType, RequireFields<SubscriptionInventoryThresholdAlertArgs, 'sellerId'>>;
  metaCampaignStatusChanged?: SubscriptionResolver<ResolversTypes['MetaCampaign'], "metaCampaignStatusChanged", ParentType, ContextType, RequireFields<SubscriptionMetaCampaignStatusChangedArgs, 'campaignId'>>;
  newsletterCampaignProgress?: SubscriptionResolver<ResolversTypes['NewsletterCampaign'], "newsletterCampaignProgress", ParentType, ContextType, RequireFields<SubscriptionNewsletterCampaignProgressArgs, 'campaignId'>>;
  notificationReceived?: SubscriptionResolver<ResolversTypes['Notification'], "notificationReceived", ParentType, ContextType, RequireFields<SubscriptionNotificationReceivedArgs, 'userId'>>;
  orderStatusUpdated?: SubscriptionResolver<ResolversTypes['Order'], "orderStatusUpdated", ParentType, ContextType, Partial<SubscriptionOrderStatusUpdatedArgs>>;
  quotationStatusChanged?: SubscriptionResolver<ResolversTypes['Quotation'], "quotationStatusChanged", ParentType, ContextType, Partial<SubscriptionQuotationStatusChangedArgs>>;
}>;

export type SubscriptionInvoiceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SubscriptionInvoice'] = ResolversParentTypes['SubscriptionInvoice']> = ResolversObject<{
  amountDue?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  amountPaid?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  hostedInvoiceUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  invoicePdfUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  paidAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  periodEnd?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  periodStart?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stripeInvoiceId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subscription?: Resolver<ResolversTypes['SellerSubscription'], ParentType, ContextType>;
  subscriptionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type SubscriptionInvoiceConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SubscriptionInvoiceConnection'] = ResolversParentTypes['SubscriptionInvoiceConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['SubscriptionInvoiceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type SubscriptionInvoiceEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SubscriptionInvoiceEdge'] = ResolversParentTypes['SubscriptionInvoiceEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['SubscriptionInvoice'], ParentType, ContextType>;
}>;

export type TeamMembershipResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TeamMembership'] = ResolversParentTypes['TeamMembership']> = ResolversObject<{
  capabilities?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  storeOwner?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  storeOwnerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  teamMember?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export interface UrlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['URL'], any> {
  name: 'URL';
}

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  buyerProfile?: Resolver<Maybe<ResolversTypes['BuyerProfile']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  profileImageUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  sellerAccount?: Resolver<Maybe<ResolversTypes['SellerAccount']>, ParentType, ContextType>;
  teamMemberships?: Resolver<Array<ResolversTypes['TeamMembership']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userType?: Resolver<ResolversTypes['UserType'], ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type WholesaleAccessGrantResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleAccessGrant'] = ResolversParentTypes['WholesaleAccessGrant']> = ResolversObject<{
  buyer?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  buyerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  grantedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  pricingTier?: Resolver<Maybe<ResolversTypes['WholesalePricingTier']>, ParentType, ContextType>;
  pricingTierId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  revokedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type WholesaleInvitationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleInvitation'] = ResolversParentTypes['WholesaleInvitation']> = ResolversObject<{
  acceptedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  buyer?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  buyerEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  buyerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  rejectedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['WholesaleInvitationStatus'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type WholesaleInvitationConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleInvitationConnection'] = ResolversParentTypes['WholesaleInvitationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['WholesaleInvitationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type WholesaleInvitationEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleInvitationEdge'] = ResolversParentTypes['WholesaleInvitationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['WholesaleInvitation'], ParentType, ContextType>;
}>;

export type WholesaleOrderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleOrder'] = ResolversParentTypes['WholesaleOrder']> = ResolversObject<{
  balanceDue?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  balancePaidAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  balanceRequestedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  billingAddress?: Resolver<ResolversTypes['Address'], ParentType, ContextType>;
  buyer?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  buyerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  carrier?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  depositAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  depositPaidAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  depositPercentage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  events?: Resolver<Array<ResolversTypes['WholesaleOrderEvent']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  incoterms?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  invoice?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['WholesaleOrderItem']>, ParentType, ContextType>;
  orderNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  packingSlip?: Resolver<Maybe<ResolversTypes['PackingSlip']>, ParentType, ContextType>;
  paymentStatus?: Resolver<ResolversTypes['PaymentStatus'], ParentType, ContextType>;
  paymentTerms?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  poNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  shippingAddress?: Resolver<ResolversTypes['Address'], ParentType, ContextType>;
  shippingCost?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  shippingType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrderStatus'], ParentType, ContextType>;
  subtotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  taxAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  totalAmount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  trackingNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  vatNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type WholesaleOrderConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleOrderConnection'] = ResolversParentTypes['WholesaleOrderConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['WholesaleOrderEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type WholesaleOrderEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleOrderEdge'] = ResolversParentTypes['WholesaleOrderEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['WholesaleOrder'], ParentType, ContextType>;
}>;

export type WholesaleOrderEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleOrderEvent'] = ResolversParentTypes['WholesaleOrderEvent']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  performedBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  performedByUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type WholesaleOrderItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesaleOrderItem'] = ResolversParentTypes['WholesaleOrderItem']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  discountPercentage?: Resolver<Maybe<ResolversTypes['Decimal']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineTotal?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  productName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  productSku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unitPrice?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
}>;

export type WholesalePricingTierResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WholesalePricingTier'] = ResolversParentTypes['WholesalePricingTier']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  discountPercentage?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  minQuantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  productIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  sellerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  Address?: AddressResolvers<ContextType>;
  AuthToken?: AuthTokenResolvers<ContextType>;
  AutomationExecution?: AutomationExecutionResolvers<ContextType>;
  AutomationWorkflow?: AutomationWorkflowResolvers<ContextType>;
  BackgroundJobRun?: BackgroundJobRunResolvers<ContextType>;
  BackgroundJobRunConnection?: BackgroundJobRunConnectionResolvers<ContextType>;
  BackgroundJobRunEdge?: BackgroundJobRunEdgeResolvers<ContextType>;
  BuyerProfile?: BuyerProfileResolvers<ContextType>;
  Cart?: CartResolvers<ContextType>;
  CartItem?: CartItemResolvers<ContextType>;
  CartSession?: CartSessionResolvers<ContextType>;
  Category?: CategoryResolvers<ContextType>;
  CheckoutSession?: CheckoutSessionResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Decimal?: GraphQLScalarType;
  DomainConnection?: DomainConnectionResolvers<ContextType>;
  DomainConnectionConnection?: DomainConnectionConnectionResolvers<ContextType>;
  DomainConnectionEdge?: DomainConnectionEdgeResolvers<ContextType>;
  FulfillmentEvent?: FulfillmentEventResolvers<ContextType>;
  Invoice?: InvoiceResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  MarketingAudience?: MarketingAudienceResolvers<ContextType>;
  MetaAdAccount?: MetaAdAccountResolvers<ContextType>;
  MetaAdSet?: MetaAdSetResolvers<ContextType>;
  MetaCampaign?: MetaCampaignResolvers<ContextType>;
  MetaCampaignConnection?: MetaCampaignConnectionResolvers<ContextType>;
  MetaCampaignEdge?: MetaCampaignEdgeResolvers<ContextType>;
  MetaCampaignMetrics?: MetaCampaignMetricsResolvers<ContextType>;
  MetaCreative?: MetaCreativeResolvers<ContextType>;
  MetaDailyMetrics?: MetaDailyMetricsResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NewsletterCampaign?: NewsletterCampaignResolvers<ContextType>;
  NewsletterCampaignConnection?: NewsletterCampaignConnectionResolvers<ContextType>;
  NewsletterCampaignEdge?: NewsletterCampaignEdgeResolvers<ContextType>;
  NewsletterTemplate?: NewsletterTemplateResolvers<ContextType>;
  Notification?: NotificationResolvers<ContextType>;
  NotificationConnection?: NotificationConnectionResolvers<ContextType>;
  NotificationEdge?: NotificationEdgeResolvers<ContextType>;
  Order?: OrderResolvers<ContextType>;
  OrderConnection?: OrderConnectionResolvers<ContextType>;
  OrderEdge?: OrderEdgeResolvers<ContextType>;
  OrderEvent?: OrderEventResolvers<ContextType>;
  OrderItem?: OrderItemResolvers<ContextType>;
  PackingSlip?: PackingSlipResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PaymentIntent?: PaymentIntentResolvers<ContextType>;
  PlatformAnalytics?: PlatformAnalyticsResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductConnection?: ProductConnectionResolvers<ContextType>;
  ProductEdge?: ProductEdgeResolvers<ContextType>;
  ProductVariant?: ProductVariantResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Quotation?: QuotationResolvers<ContextType>;
  QuotationActivity?: QuotationActivityResolvers<ContextType>;
  QuotationConnection?: QuotationConnectionResolvers<ContextType>;
  QuotationEdge?: QuotationEdgeResolvers<ContextType>;
  QuotationLineItem?: QuotationLineItemResolvers<ContextType>;
  QuotationPayment?: QuotationPaymentResolvers<ContextType>;
  Refund?: RefundResolvers<ContextType>;
  RefundLineItem?: RefundLineItemResolvers<ContextType>;
  SKU?: SkuResolvers<ContextType>;
  SavedAddress?: SavedAddressResolvers<ContextType>;
  Segment?: SegmentResolvers<ContextType>;
  SellerAccount?: SellerAccountResolvers<ContextType>;
  SellerHomepage?: SellerHomepageResolvers<ContextType>;
  SellerSubscription?: SellerSubscriptionResolvers<ContextType>;
  Shipment?: ShipmentResolvers<ContextType>;
  ShipmentEvent?: ShipmentEventResolvers<ContextType>;
  ShippingLabel?: ShippingLabelResolvers<ContextType>;
  StockLevel?: StockLevelResolvers<ContextType>;
  StockReservation?: StockReservationResolvers<ContextType>;
  StoredPaymentMethod?: StoredPaymentMethodResolvers<ContextType>;
  Subscriber?: SubscriberResolvers<ContextType>;
  SubscriberConnection?: SubscriberConnectionResolvers<ContextType>;
  SubscriberEdge?: SubscriberEdgeResolvers<ContextType>;
  SubscriberEngagement?: SubscriberEngagementResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SubscriptionInvoice?: SubscriptionInvoiceResolvers<ContextType>;
  SubscriptionInvoiceConnection?: SubscriptionInvoiceConnectionResolvers<ContextType>;
  SubscriptionInvoiceEdge?: SubscriptionInvoiceEdgeResolvers<ContextType>;
  TeamMembership?: TeamMembershipResolvers<ContextType>;
  URL?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
  WholesaleAccessGrant?: WholesaleAccessGrantResolvers<ContextType>;
  WholesaleInvitation?: WholesaleInvitationResolvers<ContextType>;
  WholesaleInvitationConnection?: WholesaleInvitationConnectionResolvers<ContextType>;
  WholesaleInvitationEdge?: WholesaleInvitationEdgeResolvers<ContextType>;
  WholesaleOrder?: WholesaleOrderResolvers<ContextType>;
  WholesaleOrderConnection?: WholesaleOrderConnectionResolvers<ContextType>;
  WholesaleOrderEdge?: WholesaleOrderEdgeResolvers<ContextType>;
  WholesaleOrderEvent?: WholesaleOrderEventResolvers<ContextType>;
  WholesaleOrderItem?: WholesaleOrderItemResolvers<ContextType>;
  WholesalePricingTier?: WholesalePricingTierResolvers<ContextType>;
}>;

