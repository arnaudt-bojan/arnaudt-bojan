/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO 8601 date-time string (e.g., "2025-10-19T19:22:00Z") */
  DateTime: { input: string; output: string; }
  /** Precise decimal values for currency and percentages (e.g., "19.99") */
  Decimal: { input: string; output: string; }
  /** Arbitrary JSON data for flexible object storage */
  JSON: { input: Record<string, any>; output: Record<string, any>; }
  /** Validated URL string (e.g., "https://example.com") */
  URL: { input: string; output: string; }
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
  addressLine2: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  fullName: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
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
  code: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  sellerContext: Maybe<Scalars['String']['output']>;
  token: Scalars['String']['output'];
  tokenType: Maybe<Scalars['String']['output']>;
  used: Scalars['Boolean']['output'];
};

/** Automation execution record */
export type AutomationExecution = {
  __typename?: 'AutomationExecution';
  /** Actions performed */
  actionsTaken: Maybe<Scalars['JSON']['output']>;
  error: Maybe<Scalars['String']['output']>;
  executedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  subscriber: Maybe<Subscriber>;
  subscriberEmail: Maybe<Scalars['String']['output']>;
  subscriberId: Maybe<Scalars['ID']['output']>;
  /** Trigger data */
  triggerData: Maybe<Scalars['JSON']['output']>;
  workflow: AutomationWorkflow;
  workflowId: Scalars['ID']['output'];
};

/** Automated email workflow */
export type AutomationWorkflow = {
  __typename?: 'AutomationWorkflow';
  /** Workflow actions */
  actions: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
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
  completedAt: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  duration: Maybe<Scalars['Int']['output']>;
  /** Error details */
  errorMessage: Maybe<Scalars['String']['output']>;
  errorStack: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Job name */
  jobName: Scalars['String']['output'];
  /** Job metadata */
  metadata: Maybe<Scalars['JSON']['output']>;
  nextRetryAt: Maybe<Scalars['DateTime']['output']>;
  recordsFailed: Scalars['Int']['output'];
  /** Processing stats */
  recordsProcessed: Scalars['Int']['output'];
  /** Retry tracking */
  retryCount: Scalars['Int']['output'];
  /** Timing */
  startedAt: Maybe<Scalars['DateTime']['output']>;
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
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING'
}

/** Balance calculation for wholesale orders */
export type BalanceCalculation = {
  __typename?: 'BalanceCalculation';
  balancePercentage: Scalars['Float']['output'];
  balanceRemaining: Scalars['Float']['output'];
  depositPaid: Scalars['Float']['output'];
  orderValue: Scalars['Float']['output'];
};

/** Buyer profile for B2B wholesale customers */
export type BuyerProfile = {
  __typename?: 'BuyerProfile';
  billingAddress: Maybe<Address>;
  companyName: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Credit limit for wholesale purchases */
  creditLimit: Maybe<Scalars['Decimal']['output']>;
  /** Default payment terms (e.g., "Net 30") */
  defaultPaymentTerms: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  shippingAddress: Maybe<Address>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['ID']['output'];
  vatNumber: Maybe<Scalars['String']['output']>;
};

export enum CampaignStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  DRAFT = 'DRAFT',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  PENDING_PAYMENT = 'PENDING_PAYMENT'
}

/** Shopping cart */
export type Cart = {
  __typename?: 'Cart';
  buyer: Maybe<User>;
  /** Buyer ID if logged in */
  buyerId: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Current session associated with cart */
  currentSession: Maybe<CartSession>;
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
  /** Pricing totals with tax breakdown */
  totals: Maybe<CartTotals>;
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
  reservation: Maybe<StockReservation>;
  unitPrice: Scalars['Decimal']['output'];
  variant: Maybe<ProductVariant>;
  variantId: Maybe<Scalars['ID']['output']>;
};

/** Cart item validation result */
export type CartItemValidation = {
  __typename?: 'CartItemValidation';
  errors: Array<Scalars['String']['output']>;
  moqMet: Scalars['Boolean']['output'];
  stockAvailable: Scalars['Boolean']['output'];
  valid: Scalars['Boolean']['output'];
  warnings: Array<Scalars['String']['output']>;
};

/** Cart session for anonymous users */
export type CartSession = {
  __typename?: 'CartSession';
  cart: Cart;
  cartId: Scalars['ID']['output'];
  lastSeen: Scalars['DateTime']['output'];
  sessionId: Scalars['ID']['output'];
};

/** Cart pricing totals breakdown */
export type CartTotals = {
  __typename?: 'CartTotals';
  currency: Scalars['String']['output'];
  subtotal: Scalars['Decimal']['output'];
  tax: Scalars['Decimal']['output'];
  total: Scalars['Decimal']['output'];
};

/** Cart validation result */
export type CartValidation = {
  __typename?: 'CartValidation';
  allItemsInStock: Scalars['Boolean']['output'];
  allMOQsMet: Scalars['Boolean']['output'];
  errors: Array<Scalars['String']['output']>;
  items: Array<CartItemValidation>;
  totalItems: Scalars['Int']['output'];
  valid: Scalars['Boolean']['output'];
  warnings: Array<Scalars['String']['output']>;
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
  parent: Maybe<Category>;
  /** Parent category for hierarchical organization */
  parentId: Maybe<Scalars['ID']['output']>;
  slug: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Checkout session with pricing and payment */
export type CheckoutSession = {
  __typename?: 'CheckoutSession';
  /** Billing address */
  billingAddress: Maybe<Address>;
  cart: Cart;
  cartId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  /** Currency for checkout */
  currency: Currency;
  /** Session expiration */
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  paymentIntent: Maybe<PaymentIntent>;
  /** Payment intent for processing */
  paymentIntentId: Maybe<Scalars['ID']['output']>;
  /** Shipping address */
  shippingAddress: Maybe<Address>;
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
  AUD = 'AUD',
  CAD = 'CAD',
  CNY = 'CNY',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
  JPY = 'JPY',
  USD = 'USD'
}

/** Deposit calculation for wholesale orders */
export type DepositCalculation = {
  __typename?: 'DepositCalculation';
  balanceAmount: Scalars['Float']['output'];
  depositAmount: Scalars['Float']['output'];
  depositPercentage: Scalars['Float']['output'];
  orderValue: Scalars['Float']['output'];
};

/** Custom domain connection */
export type DomainConnection = {
  __typename?: 'DomainConnection';
  /** Cloudflare integration */
  cloudflareCustomHostnameId: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  dnsInstructions: Maybe<Scalars['JSON']['output']>;
  /** Domain name */
  domain: Scalars['String']['output'];
  failureCode: Maybe<Scalars['String']['output']>;
  /** Failure tracking */
  failureReason: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Primary domain flag */
  isPrimary: Scalars['Boolean']['output'];
  lastCheckedAt: Maybe<Scalars['DateTime']['output']>;
  lastVerifiedAt: Maybe<Scalars['DateTime']['output']>;
  normalizedDomain: Scalars['String']['output'];
  retryCount: Scalars['Int']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  sslExpiresAt: Maybe<Scalars['DateTime']['output']>;
  sslIssuedAt: Maybe<Scalars['DateTime']['output']>;
  sslProvider: Maybe<Scalars['String']['output']>;
  sslRenewAt: Maybe<Scalars['DateTime']['output']>;
  /** SSL certificate */
  sslStatus: Maybe<Scalars['String']['output']>;
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
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
  DNS_VERIFIED = 'DNS_VERIFIED',
  ERROR = 'ERROR',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SSL_PROVISIONING = 'SSL_PROVISIONING'
}

/** Exchange rate between two currencies */
export type ExchangeRate = {
  __typename?: 'ExchangeRate';
  from: Scalars['String']['output'];
  rate: Scalars['Float']['output'];
  timestamp: Scalars['DateTime']['output'];
  to: Scalars['String']['output'];
};

/** Fulfillment event for order processing */
export type FulfillmentEvent = {
  __typename?: 'FulfillmentEvent';
  carrier: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Items being fulfilled */
  items: Array<OrderItem>;
  /** Fulfillment notes */
  notes: Maybe<Scalars['String']['output']>;
  order: Order;
  orderId: Scalars['ID']['output'];
  status: FulfillmentStatus;
  /** Tracking information */
  trackingNumber: Maybe<Scalars['String']['output']>;
};

export enum FulfillmentStatus {
  DELIVERED = 'DELIVERED',
  FULFILLED = 'FULFILLED',
  IN_TRANSIT = 'IN_TRANSIT',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  UNFULFILLED = 'UNFULFILLED'
}

export enum InventoryStatus {
  BACKORDER = 'BACKORDER',
  DISCONTINUED = 'DISCONTINUED',
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
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
  generatedBy: Maybe<Scalars['ID']['output']>;
  generationTrigger: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  incoterms: Maybe<Scalars['String']['output']>;
  invoiceNumber: Scalars['String']['output'];
  order: Order;
  orderId: Scalars['ID']['output'];
  /** Order type (retail or wholesale) */
  orderType: Scalars['String']['output'];
  paymentTerms: Maybe<Scalars['String']['output']>;
  /** B2B invoice fields */
  poNumber: Maybe<Scalars['String']['output']>;
  sellerId: Scalars['ID']['output'];
  taxAmount: Scalars['Decimal']['output'];
  /** Invoice totals */
  totalAmount: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
  vatNumber: Maybe<Scalars['String']['output']>;
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

/** MOQ failure item details */
export type MoqFailureItem = {
  __typename?: 'MOQFailureItem';
  productId: Scalars['String']['output'];
  productName: Scalars['String']['output'];
  providedQuantity: Scalars['Int']['output'];
  requiredQuantity: Scalars['Int']['output'];
};

/** MOQ validation result */
export type MoqValidationResult = {
  __typename?: 'MOQValidationResult';
  errors: Array<Scalars['String']['output']>;
  itemsFailingMOQ: Array<MoqFailureItem>;
  valid: Scalars['Boolean']['output'];
};

/** Marketing audience segment */
export type MarketingAudience = {
  __typename?: 'MarketingAudience';
  /** Campaigns using this audience */
  campaigns: Array<MetaCampaign>;
  createdAt: Scalars['DateTime']['output'];
  /** Audience targeting criteria */
  criteria: Scalars['JSON']['output'];
  description: Maybe<Scalars['String']['output']>;
  /** Estimated audience size */
  estimatedSize: Maybe<Scalars['Int']['output']>;
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
  businessName: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Maybe<Currency>;
  id: Scalars['ID']['output'];
  /** Selected for use */
  isSelected: Scalars['Boolean']['output'];
  lastSyncedAt: Maybe<Scalars['DateTime']['output']>;
  /** Meta ad account ID */
  metaAdAccountId: Scalars['String']['output'];
  /** Meta user ID */
  metaUserId: Scalars['String']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  timezone: Maybe<Scalars['String']['output']>;
  tokenExpiresAt: Maybe<Scalars['DateTime']['output']>;
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
  endDate: Maybe<Scalars['DateTime']['output']>;
  errorMessage: Maybe<Scalars['String']['output']>;
  headline: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Sync status */
  lastSyncAt: Maybe<Scalars['DateTime']['output']>;
  /** Meta campaign ID */
  metaCampaignId: Maybe<Scalars['String']['output']>;
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
  stripePaymentIntentId: Maybe<Scalars['String']['output']>;
  targetAgeMax: Maybe<Scalars['Int']['output']>;
  targetAgeMin: Maybe<Scalars['Int']['output']>;
  /** Targeting */
  targetCountries: Array<Scalars['String']['output']>;
  targetGender: Maybe<Scalars['String']['output']>;
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
  imageUrl: Maybe<Scalars['URL']['output']>;
  /** Meta creative ID */
  metaCreativeId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  videoUrl: Maybe<Scalars['URL']['output']>;
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

/** Minimum order value validation */
export type MinimumValueValidation = {
  __typename?: 'MinimumValueValidation';
  currentValue: Scalars['Float']['output'];
  met: Scalars['Boolean']['output'];
  minimumValue: Scalars['Float']['output'];
  shortfall: Scalars['Float']['output'];
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
  replyToEmail: Maybe<Scalars['String']['output']>;
  /** Scheduling */
  scheduledAt: Maybe<Scalars['DateTime']['output']>;
  /** Recipient segments */
  segments: Array<Segment>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  sentAt: Maybe<Scalars['DateTime']['output']>;
  sentCount: Scalars['Int']['output'];
  /** Campaign status */
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  template: Maybe<NewsletterTemplate>;
  /** Template used */
  templateId: Maybe<Scalars['ID']['output']>;
  textContent: Maybe<Scalars['String']['output']>;
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
  description: Maybe<Scalars['String']['output']>;
  /** Template content */
  htmlContent: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  sellerId: Scalars['ID']['output'];
  textContent: Maybe<Scalars['String']['output']>;
  /** Preview image */
  thumbnailUrl: Maybe<Scalars['URL']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  /** Template variables */
  variables: Array<Scalars['String']['output']>;
};

/** Notification for users */
export type Notification = {
  __typename?: 'Notification';
  /** Action URL */
  actionUrl: Maybe<Scalars['URL']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Read status */
  isRead: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  readAt: Maybe<Scalars['DateTime']['output']>;
  relatedEntityId: Maybe<Scalars['ID']['output']>;
  /** Related entity */
  relatedEntityType: Maybe<Scalars['String']['output']>;
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
  balanceDue: Maybe<Scalars['Decimal']['output']>;
  balancePaidAt: Maybe<Scalars['DateTime']['output']>;
  balancePaymentStatus: Maybe<PaymentStatus>;
  billingAddress: Maybe<Address>;
  buyer: Maybe<User>;
  buyerId: Maybe<Scalars['ID']['output']>;
  /** Order notes */
  buyerNotes: Maybe<Scalars['String']['output']>;
  calculatedTax: Scalars['Decimal']['output'];
  /** Calculated pricing fields (via PricingService) */
  calculatedTotal: Scalars['Decimal']['output'];
  carrier: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  customerEmail: Scalars['String']['output'];
  /** Customer details */
  customerName: Scalars['String']['output'];
  customerPhone: Maybe<Scalars['String']['output']>;
  /** Deposit payment (if required) */
  depositAmount: Maybe<Scalars['Decimal']['output']>;
  depositPercentage: Maybe<Scalars['Int']['output']>;
  /** Order events timeline */
  events: Array<OrderEvent>;
  /** Fulfillment status */
  fulfillmentStatus: FulfillmentStatus;
  id: Scalars['ID']['output'];
  /** Generated documents */
  invoice: Maybe<Invoice>;
  /** Order line items */
  items: Array<OrderItem>;
  orderNumber: Scalars['String']['output'];
  packingSlip: Maybe<PackingSlip>;
  paidAt: Maybe<Scalars['DateTime']['output']>;
  paymentIntent: Maybe<PaymentIntent>;
  /** Payment information */
  paymentIntentId: Maybe<Scalars['ID']['output']>;
  /** Payment status */
  paymentStatus: PaymentStatus;
  /** Server-side presentation logic */
  presentation: OrderPresentation;
  /** Refunds */
  refunds: Array<Refund>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  sellerNotes: Maybe<Scalars['String']['output']>;
  /** Addresses */
  shippingAddress: Address;
  shippingCost: Scalars['Decimal']['output'];
  shippingLabel: Maybe<ShippingLabel>;
  /** Order status */
  status: OrderStatus;
  /** Pricing */
  subtotal: Scalars['Decimal']['output'];
  taxAmount: Scalars['Decimal']['output'];
  totalAmount: Scalars['Decimal']['output'];
  /** Shipping information */
  trackingNumber: Maybe<Scalars['String']['output']>;
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
  metadata: Maybe<Scalars['JSON']['output']>;
  orderId: Scalars['ID']['output'];
  /** User who triggered event */
  performedBy: Maybe<Scalars['ID']['output']>;
  performedByUser: Maybe<User>;
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
  productImage: Maybe<Scalars['URL']['output']>;
  /** Item details at time of order */
  productName: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  unitPrice: Scalars['Decimal']['output'];
  variantDetails: Maybe<Scalars['JSON']['output']>;
  variantId: Maybe<Scalars['ID']['output']>;
};

/** Server-side order presentation logic */
export type OrderPresentation = {
  __typename?: 'OrderPresentation';
  canCancel: Scalars['Boolean']['output'];
  canFulfill: Scalars['Boolean']['output'];
  canRefund: Scalars['Boolean']['output'];
  fulfillmentColor: Scalars['String']['output'];
  fulfillmentLabel: Scalars['String']['output'];
  nextStatuses: Array<Scalars['String']['output']>;
  statusColor: Scalars['String']['output'];
  statusLabel: Scalars['String']['output'];
};

export enum OrderSortField {
  CREATED_AT = 'CREATED_AT',
  ORDER_NUMBER = 'ORDER_NUMBER',
  STATUS = 'STATUS',
  TOTAL_AMOUNT = 'TOTAL_AMOUNT'
}

export type OrderSortInput = {
  direction: SortDirection;
  field: OrderSortField;
};

export enum OrderStatus {
  AWAITING_BALANCE = 'AWAITING_BALANCE',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  BALANCE_OVERDUE = 'BALANCE_OVERDUE',
  CANCELLED = 'CANCELLED',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  FULFILLED = 'FULFILLED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  PAID = 'PAID',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY_TO_SHIP = 'READY_TO_SHIP',
  REFUNDED = 'REFUNDED'
}

/** Packing slip document */
export type PackingSlip = {
  __typename?: 'PackingSlip';
  createdAt: Scalars['DateTime']['output'];
  /** Document URL */
  documentUrl: Scalars['URL']['output'];
  /** Generation metadata */
  generatedBy: Maybe<Scalars['ID']['output']>;
  generationTrigger: Scalars['String']['output'];
  giftMessage: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Include pricing on slip */
  includesPricing: Scalars['Boolean']['output'];
  order: Order;
  orderId: Scalars['ID']['output'];
  packingSlipNumber: Scalars['String']['output'];
  sellerId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** Warehouse notes */
  warehouseNotes: Maybe<Scalars['String']['output']>;
};

/** Page information for cursor-based pagination */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** Cursor of the last item in the current page */
  endCursor: Maybe<Scalars['String']['output']>;
  /** Indicates if there are more items after the current page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Indicates if there are items before the current page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Cursor of the first item in the current page */
  startCursor: Maybe<Scalars['String']['output']>;
};

/** Payment intent for processing payments */
export type PaymentIntent = {
  __typename?: 'PaymentIntent';
  amount: Scalars['Int']['output'];
  /** Client secret for frontend payment confirmation */
  clientSecret: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  id: Scalars['ID']['output'];
  /** Additional metadata */
  metadata: Maybe<Scalars['JSON']['output']>;
  /** Provider-specific intent ID */
  providerIntentId: Scalars['String']['output'];
  /** Payment provider (e.g., "stripe") */
  providerName: Scalars['String']['output'];
  status: PaymentStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export enum PaymentStatus {
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
  PENDING = 'PENDING',
  REFUNDED = 'REFUNDED',
  REQUESTED = 'REQUESTED',
  SUCCEEDED = 'SUCCEEDED'
}

/** Payment terms validation */
export type PaymentTermsValidation = {
  __typename?: 'PaymentTermsValidation';
  allowedTerms: Array<Scalars['String']['output']>;
  error: Maybe<Scalars['String']['output']>;
  requestedTerm: Scalars['String']['output'];
  valid: Scalars['Boolean']['output'];
};

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
  depositAmount: Maybe<Scalars['Decimal']['output']>;
  description: Scalars['String']['output'];
  discountPercentage: Maybe<Scalars['Decimal']['output']>;
  flatShippingRate: Maybe<Scalars['Decimal']['output']>;
  id: Scalars['ID']['output'];
  /** Primary product image */
  image: Scalars['URL']['output'];
  /** Additional product images */
  images: Array<Scalars['URL']['output']>;
  /** Stock level information */
  inventoryStatus: InventoryStatus;
  /** Made-to-order lead time in days */
  madeToOrderDays: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  /** Pre-order availability date */
  preOrderDate: Maybe<Scalars['DateTime']['output']>;
  /** Server-side presentation logic */
  presentation: ProductPresentation;
  price: Scalars['Decimal']['output'];
  productType: Scalars['String']['output'];
  /** Promotion settings */
  promotionActive: Scalars['Boolean']['output'];
  promotionEndDate: Maybe<Scalars['DateTime']['output']>;
  /** Deposit payment settings */
  requiresDeposit: Scalars['Boolean']['output'];
  seller: User;
  sellerId: Scalars['ID']['output'];
  /** Shipping configuration */
  shippingType: Maybe<Scalars['String']['output']>;
  shippoHeight: Maybe<Scalars['Decimal']['output']>;
  shippoLength: Maybe<Scalars['Decimal']['output']>;
  /** Package dimensions for shipping */
  shippoWeight: Maybe<Scalars['Decimal']['output']>;
  shippoWidth: Maybe<Scalars['Decimal']['output']>;
  /** SKU for inventory tracking */
  sku: Maybe<Scalars['String']['output']>;
  status: ProductStatus;
  /** Current stock level */
  stock: Scalars['Int']['output'];
  /** Active stock reservations */
  stockReservations: Array<StockReservation>;
  updatedAt: Scalars['DateTime']['output'];
  /** Product variants (sizes, colors, etc.) */
  variants: Maybe<Scalars['JSON']['output']>;
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

/** Server-side product presentation logic */
export type ProductPresentation = {
  __typename?: 'ProductPresentation';
  availabilityText: Scalars['String']['output'];
  availableForPurchase: Scalars['Boolean']['output'];
  badges: Array<Scalars['String']['output']>;
  isMadeToOrder: Scalars['Boolean']['output'];
  isPreOrder: Scalars['Boolean']['output'];
  isWholesale: Scalars['Boolean']['output'];
  lowStockThreshold: Scalars['Int']['output'];
  stockLevelIndicator: Scalars['String']['output'];
  stockQuantity: Scalars['Int']['output'];
};

export enum ProductSortField {
  CREATED_AT = 'CREATED_AT',
  NAME = 'NAME',
  PRICE = 'PRICE',
  STOCK = 'STOCK'
}

export type ProductSortInput = {
  direction: SortDirection;
  field: ProductSortField;
};

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DRAFT = 'DRAFT'
}

/** Product variant (size, color, etc.) */
export type ProductVariant = {
  __typename?: 'ProductVariant';
  /** Variant attributes (e.g., {"size": "L", "color": "Blue"}) */
  attributes: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  price: Maybe<Scalars['Decimal']['output']>;
  product: Product;
  productId: Scalars['ID']['output'];
  sku: Maybe<Scalars['String']['output']>;
  stock: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Calculate payment due date based on terms */
  calculatePaymentDueDate: Scalars['String']['output'];
  /** Calculate price in a different currency */
  calculatePrice: Scalars['Float']['output'];
  /** Calculate wholesale balance amount */
  calculateWholesaleBalance: BalanceCalculation;
  /** Calculate wholesale deposit amount */
  calculateWholesaleDeposit: DepositCalculation;
  /** Get buyer profile */
  getBuyerProfile: Maybe<BuyerProfile>;
  /** Get Meta campaign by ID */
  getCampaign: Maybe<MetaCampaign>;
  /** Get campaign daily metrics */
  getCampaignDailyMetrics: Array<MetaDailyMetrics>;
  /** Get campaign metrics */
  getCampaignMetrics: Maybe<MetaCampaignMetrics>;
  /** Get cart by ID */
  getCart: Maybe<Cart>;
  /** Get cart by session */
  getCartBySession: Maybe<Cart>;
  /** Get category by ID */
  getCategory: Maybe<Category>;
  /** Get checkout session */
  getCheckoutSession: Maybe<CheckoutSession>;
  /** Get currently authenticated user */
  getCurrentUser: Maybe<User>;
  /** Get domain connection */
  getDomain: Maybe<DomainConnection>;
  /** Get exchange rate between two currencies */
  getExchangeRate: ExchangeRate;
  /** Get inventory status for a product */
  getInventory: Maybe<StockLevel>;
  /** Get invoice by ID */
  getInvoice: Maybe<Invoice>;
  /** Get invoice by order ID */
  getInvoiceByOrder: Maybe<Invoice>;
  /** Get background job run */
  getJobRun: Maybe<BackgroundJobRun>;
  /** Get newsletter analytics */
  getNewsletterAnalytics: Maybe<Scalars['JSON']['output']>;
  /** Get newsletter campaign */
  getNewsletterCampaign: Maybe<NewsletterCampaign>;
  /** Get order by ID */
  getOrder: Maybe<Order>;
  /** Get order by order number */
  getOrderByNumber: Maybe<Order>;
  /** Get packing slip by order ID */
  getPackingSlip: Maybe<PackingSlip>;
  /** Get payment intent */
  getPaymentIntent: Maybe<PaymentIntent>;
  /** Get platform analytics */
  getPlatformAnalytics: Array<PlatformAnalytics>;
  /** Get product by ID */
  getProduct: Maybe<Product>;
  /** Get product by slug */
  getProductBySlug: Maybe<Product>;
  /** Get quotation by ID */
  getQuotation: Maybe<Quotation>;
  /** Get quotation by number */
  getQuotationByNumber: Maybe<Quotation>;
  /** Get seller account by ID */
  getSeller: Maybe<SellerAccount>;
  /** Get seller account by slug */
  getStore: Maybe<SellerAccount>;
  /** Get seller subscription */
  getSubscription: Maybe<SellerSubscription>;
  /** Get user by ID */
  getUser: Maybe<User>;
  /** Get wholesale invitation by token */
  getWholesaleInvitation: Maybe<WholesaleInvitation>;
  /** Get wholesale order by ID */
  getWholesaleOrder: Maybe<WholesaleOrder>;
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
  /** Validate cart items */
  validateCart: CartValidation;
  /** Validate wholesale cart */
  validateWholesaleCart: WholesaleCartValidation;
  /** Validate wholesale order comprehensively */
  validateWholesaleOrder: WholesaleOrderValidation;
  /** Get authenticated user ID (for testing authentication) */
  whoami: Maybe<Scalars['String']['output']>;
};


export type QueryCalculatePaymentDueDateArgs = {
  orderDate: Scalars['String']['input'];
  paymentTerms: Scalars['String']['input'];
};


export type QueryCalculatePriceArgs = {
  amount: Scalars['Float']['input'];
  fromCurrency: Scalars['String']['input'];
  toCurrency: Scalars['String']['input'];
};


export type QueryCalculateWholesaleBalanceArgs = {
  depositPaid: Scalars['Float']['input'];
  orderValue: Scalars['Float']['input'];
};


export type QueryCalculateWholesaleDepositArgs = {
  depositPercentage: Scalars['Float']['input'];
  orderValue: Scalars['Float']['input'];
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


export type QueryGetExchangeRateArgs = {
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
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


export type QueryValidateCartArgs = {
  cartId: Scalars['ID']['input'];
};


export type QueryValidateWholesaleCartArgs = {
  cartId: Scalars['ID']['input'];
};


export type QueryValidateWholesaleOrderArgs = {
  invitationId: Scalars['String']['input'];
  items: Array<WholesaleOrderItemInput>;
  paymentTerms: Scalars['String']['input'];
};

/** Trade quotation for custom pricing */
export type Quotation = {
  __typename?: 'Quotation';
  /** Activity log */
  activities: Array<QuotationActivity>;
  balanceAmount: Scalars['Decimal']['output'];
  buyer: Maybe<User>;
  buyerEmail: Scalars['String']['output'];
  /** Buyer ID if accepted and registered */
  buyerId: Maybe<Scalars['ID']['output']>;
  /** Calculated pricing fields (via PricingService) */
  calculatedGrandTotal: Scalars['Decimal']['output'];
  calculatedSubtotal: Scalars['Decimal']['output'];
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  /** Attached documents */
  dataSheetUrl: Maybe<Scalars['URL']['output']>;
  /** Trade terms */
  deliveryTerms: Maybe<Scalars['String']['output']>;
  /** Payment schedule */
  depositAmount: Scalars['Decimal']['output'];
  depositPercentage: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** Line items */
  items: Array<QuotationLineItem>;
  /** Metadata */
  metadata: Maybe<Scalars['JSON']['output']>;
  order: Maybe<Order>;
  /** Associated order if accepted */
  orderId: Maybe<Scalars['ID']['output']>;
  paymentTerms: Maybe<Scalars['String']['output']>;
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
  termsAndConditionsUrl: Maybe<Scalars['URL']['output']>;
  total: Scalars['Decimal']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** Quotation validity */
  validUntil: Maybe<Scalars['DateTime']['output']>;
};

/** Activity event on a quotation */
export type QuotationActivity = {
  __typename?: 'QuotationActivity';
  createdAt: Scalars['DateTime']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Event payload */
  payload: Maybe<Scalars['JSON']['output']>;
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
  product: Maybe<Product>;
  /** Linked product (optional) */
  productId: Maybe<Scalars['ID']['output']>;
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
  dueDate: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  paidAt: Maybe<Scalars['DateTime']['output']>;
  /** Payment type (deposit or balance) */
  paymentType: Scalars['String']['output'];
  quotation: Quotation;
  quotationId: Scalars['ID']['output'];
  status: PaymentStatus;
  /** Stripe payment intent */
  stripePaymentIntentId: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum QuotationStatus {
  ACCEPTED = 'ACCEPTED',
  BALANCE_DUE = 'BALANCE_DUE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  DRAFT = 'DRAFT',
  EXPIRED = 'EXPIRED',
  FULLY_PAID = 'FULLY_PAID',
  SENT = 'SENT',
  VIEWED = 'VIEWED'
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
  reason: Maybe<Scalars['String']['output']>;
  status: PaymentStatus;
  /** Stripe refund ID */
  stripeRefundId: Maybe<Scalars['String']['output']>;
  totalAmount: Scalars['Decimal']['output'];
};

/** Line item in a refund */
export type RefundLineItem = {
  __typename?: 'RefundLineItem';
  amount: Scalars['Decimal']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  orderItem: Maybe<OrderItem>;
  /** Original order item being refunded */
  orderItemId: Maybe<Scalars['ID']['output']>;
  /** Quantity being refunded (for product refunds) */
  quantity: Maybe<Scalars['Int']['output']>;
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
  reorderPoint: Maybe<Scalars['Int']['output']>;
  skuCode: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  variantId: Maybe<Scalars['ID']['output']>;
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
  label: Maybe<Scalars['String']['output']>;
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
  description: Maybe<Scalars['String']['output']>;
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
  brandColor: Maybe<Scalars['String']['output']>;
  businessEmail: Maybe<Scalars['String']['output']>;
  businessName: Maybe<Scalars['String']['output']>;
  businessPhone: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** Connected custom domains */
  domains: Array<DomainConnection>;
  /** Homepage configuration */
  homepage: Maybe<SellerHomepage>;
  id: Scalars['ID']['output'];
  logoUrl: Maybe<Scalars['URL']['output']>;
  /** Notification preferences */
  notificationSettings: Maybe<Scalars['JSON']['output']>;
  storeName: Scalars['String']['output'];
  storeSlug: Scalars['String']['output'];
  /** Stripe Connect account ID for payments */
  stripeAccountId: Maybe<Scalars['String']['output']>;
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
  ctaLabel: Maybe<Scalars['String']['output']>;
  ctaUrl: Maybe<Scalars['URL']['output']>;
  headline: Scalars['String']['output'];
  heroMediaType: Maybe<Scalars['String']['output']>;
  heroMediaUrl: Maybe<Scalars['URL']['output']>;
  id: Scalars['ID']['output'];
  lastPublishedAt: Maybe<Scalars['DateTime']['output']>;
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
  canceledAt: Maybe<Scalars['DateTime']['output']>;
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
  stripeSubscriptionId: Maybe<Scalars['String']['output']>;
  tier: SubscriptionTier;
  trialEnd: Maybe<Scalars['DateTime']['output']>;
  /** Trial period */
  trialStart: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Shipment tracking information */
export type Shipment = {
  __typename?: 'Shipment';
  actualDeliveryDate: Maybe<Scalars['DateTime']['output']>;
  carrier: Scalars['String']['output'];
  deliveredAt: Maybe<Scalars['DateTime']['output']>;
  estimatedDeliveryDate: Maybe<Scalars['DateTime']['output']>;
  /** Tracking events */
  events: Array<ShipmentEvent>;
  id: Scalars['ID']['output'];
  order: Order;
  orderId: Scalars['ID']['output'];
  shippedAt: Maybe<Scalars['DateTime']['output']>;
  /** Shipment status */
  status: Scalars['String']['output'];
  trackingNumber: Scalars['String']['output'];
};

/** Shipment tracking event */
export type ShipmentEvent = {
  __typename?: 'ShipmentEvent';
  description: Scalars['String']['output'];
  location: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

/** Shipping label */
export type ShippingLabel = {
  __typename?: 'ShippingLabel';
  /** Label costs */
  baseCostUsd: Scalars['Decimal']['output'];
  carrier: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Label details */
  labelUrl: Maybe<Scalars['URL']['output']>;
  markupPercent: Maybe<Scalars['Decimal']['output']>;
  order: Order;
  orderId: Scalars['ID']['output'];
  purchasedAt: Maybe<Scalars['DateTime']['output']>;
  sellerId: Scalars['ID']['output'];
  serviceLevelName: Maybe<Scalars['String']['output']>;
  shippoRateId: Maybe<Scalars['String']['output']>;
  /** Shippo transaction ID */
  shippoTransactionId: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  totalChargedUsd: Scalars['Decimal']['output'];
  trackingNumber: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  voidedAt: Maybe<Scalars['DateTime']['output']>;
};

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

/** Stock level snapshot */
export type StockLevel = {
  __typename?: 'StockLevel';
  availableStock: Scalars['Int']['output'];
  inventoryStatus: InventoryStatus;
  lastUpdated: Scalars['DateTime']['output'];
  /** Low stock threshold */
  lowStockThreshold: Maybe<Scalars['Int']['output']>;
  product: Product;
  productId: Scalars['ID']['output'];
  reservedStock: Scalars['Int']['output'];
  totalStock: Scalars['Int']['output'];
};

/** Temporary stock reservation for cart/checkout */
export type StockReservation = {
  __typename?: 'StockReservation';
  committedAt: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Associated order if reservation is committed */
  orderId: Maybe<Scalars['ID']['output']>;
  product: Product;
  productId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  releasedAt: Maybe<Scalars['DateTime']['output']>;
  /** Session ID for cart reservations */
  sessionId: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  /** User ID for logged-in reservations */
  userId: Maybe<Scalars['ID']['output']>;
  variantId: Maybe<Scalars['ID']['output']>;
};

/** Stored payment method */
export type StoredPaymentMethod = {
  __typename?: 'StoredPaymentMethod';
  /** Card details */
  cardBrand: Maybe<Scalars['String']['output']>;
  cardExpMonth: Maybe<Scalars['Int']['output']>;
  cardExpYear: Maybe<Scalars['Int']['output']>;
  cardLast4: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Default payment method */
  isDefault: Scalars['Boolean']['output'];
  /** User-friendly label */
  label: Maybe<Scalars['String']['output']>;
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
  customFields: Maybe<Scalars['JSON']['output']>;
  email: Scalars['String']['output'];
  /** Engagement metrics */
  engagement: Maybe<SubscriberEngagement>;
  id: Scalars['ID']['output'];
  name: Maybe<Scalars['String']['output']>;
  /** Subscriber segments */
  segments: Array<Segment>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  subscribedAt: Scalars['DateTime']['output'];
  unsubscribedAt: Maybe<Scalars['DateTime']['output']>;
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
  lastClickedAt: Maybe<Scalars['DateTime']['output']>;
  lastOpenedAt: Maybe<Scalars['DateTime']['output']>;
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
  dueDate: Maybe<Scalars['DateTime']['output']>;
  /** Invoice URLs */
  hostedInvoiceUrl: Maybe<Scalars['URL']['output']>;
  id: Scalars['ID']['output'];
  invoicePdfUrl: Maybe<Scalars['URL']['output']>;
  paidAt: Maybe<Scalars['DateTime']['output']>;
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
  ENTERPRISE = 'ENTERPRISE',
  FREE = 'FREE',
  PROFESSIONAL = 'PROFESSIONAL',
  STARTER = 'STARTER'
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
  buyerProfile: Maybe<BuyerProfile>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  fullName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  phoneNumber: Maybe<Scalars['String']['output']>;
  profileImageUrl: Maybe<Scalars['URL']['output']>;
  /** Seller account details if user is a seller */
  sellerAccount: Maybe<SellerAccount>;
  /** Team memberships across different stores */
  teamMemberships: Array<TeamMembership>;
  updatedAt: Scalars['DateTime']['output'];
  userType: UserType;
  username: Maybe<Scalars['String']['output']>;
};

export enum UserType {
  BUYER = 'BUYER',
  SELLER = 'SELLER'
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
  pricingTier: Maybe<WholesalePricingTier>;
  /** Custom pricing tier */
  pricingTierId: Maybe<Scalars['ID']['output']>;
  revokedAt: Maybe<Scalars['DateTime']['output']>;
  seller: User;
  sellerId: Scalars['ID']['output'];
};

/** Wholesale cart validation result */
export type WholesaleCartValidation = {
  __typename?: 'WholesaleCartValidation';
  allItemsInStock: Scalars['Boolean']['output'];
  allMOQsMet: Scalars['Boolean']['output'];
  currentOrderValue: Scalars['Float']['output'];
  depositRequired: Scalars['Float']['output'];
  errors: Array<Scalars['String']['output']>;
  items: Array<CartItemValidation>;
  minimumOrderValue: Scalars['Float']['output'];
  totalItems: Scalars['Int']['output'];
  valid: Scalars['Boolean']['output'];
  warnings: Array<Scalars['String']['output']>;
  wholesaleRulesMet: Scalars['Boolean']['output'];
};

/** Invitation to access wholesale products */
export type WholesaleInvitation = {
  __typename?: 'WholesaleInvitation';
  acceptedAt: Maybe<Scalars['DateTime']['output']>;
  buyer: Maybe<User>;
  buyerEmail: Scalars['String']['output'];
  /** Buyer ID once accepted */
  buyerId: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  rejectedAt: Maybe<Scalars['DateTime']['output']>;
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
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED'
}

/** Wholesale B2B order */
export type WholesaleOrder = {
  __typename?: 'WholesaleOrder';
  /** Balance payment */
  balanceDue: Scalars['Decimal']['output'];
  balancePaidAt: Maybe<Scalars['DateTime']['output']>;
  balanceRequestedAt: Maybe<Scalars['DateTime']['output']>;
  billingAddress: Address;
  buyer: User;
  buyerId: Scalars['ID']['output'];
  calculatedBalanceAmount: Scalars['Decimal']['output'];
  /** Calculated pricing fields (via PricingService) */
  calculatedDepositAmount: Scalars['Decimal']['output'];
  carrier: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Currency;
  /** Deposit payment */
  depositAmount: Scalars['Decimal']['output'];
  depositPaidAt: Maybe<Scalars['DateTime']['output']>;
  depositPercentage: Scalars['Int']['output'];
  /** Order events */
  events: Array<WholesaleOrderEvent>;
  id: Scalars['ID']['output'];
  incoterms: Maybe<Scalars['String']['output']>;
  /** Documents */
  invoice: Maybe<Invoice>;
  /** Order line items */
  items: Array<WholesaleOrderItem>;
  orderNumber: Scalars['String']['output'];
  packingSlip: Maybe<PackingSlip>;
  paymentStatus: PaymentStatus;
  /** Payment terms */
  paymentTerms: Scalars['String']['output'];
  /** B2B specific fields */
  poNumber: Maybe<Scalars['String']['output']>;
  seller: User;
  sellerId: Scalars['ID']['output'];
  /** Addresses */
  shippingAddress: Address;
  shippingCost: Scalars['Decimal']['output'];
  /** Shipping method */
  shippingType: Maybe<Scalars['String']['output']>;
  status: OrderStatus;
  /** Pricing */
  subtotal: Scalars['Decimal']['output'];
  taxAmount: Scalars['Decimal']['output'];
  totalAmount: Scalars['Decimal']['output'];
  /** Tracking */
  trackingNumber: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  vatNumber: Maybe<Scalars['String']['output']>;
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
  description: Maybe<Scalars['String']['output']>;
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Event metadata */
  metadata: Maybe<Scalars['JSON']['output']>;
  orderId: Scalars['ID']['output'];
  performedBy: Maybe<Scalars['ID']['output']>;
  performedByUser: Maybe<User>;
};

/** Line item in wholesale order */
export type WholesaleOrderItem = {
  __typename?: 'WholesaleOrderItem';
  createdAt: Scalars['DateTime']['output'];
  /** Wholesale discount */
  discountPercentage: Maybe<Scalars['Decimal']['output']>;
  id: Scalars['ID']['output'];
  lineTotal: Scalars['Decimal']['output'];
  orderId: Scalars['ID']['output'];
  product: Product;
  productId: Scalars['ID']['output'];
  /** Wholesale-specific pricing */
  productName: Scalars['String']['output'];
  productSku: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  unitPrice: Scalars['Decimal']['output'];
};

export type WholesaleOrderItemInput = {
  productId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};

/** Comprehensive wholesale order validation */
export type WholesaleOrderValidation = {
  __typename?: 'WholesaleOrderValidation';
  depositCalculation: DepositCalculation;
  errors: Array<Scalars['String']['output']>;
  minimumValueValidation: MinimumValueValidation;
  moqValidation: MoqValidationResult;
  paymentTermsValidation: PaymentTermsValidation;
  totalValue: Scalars['Float']['output'];
  valid: Scalars['Boolean']['output'];
  warnings: Array<Scalars['String']['output']>;
};

/** Wholesale pricing details */
export type WholesalePricing = {
  __typename?: 'WholesalePricing';
  basePrice: Scalars['Float']['output'];
  discount: Scalars['Float']['output'];
  productId: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  total: Scalars['Float']['output'];
  wholesalePrice: Scalars['Float']['output'];
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

export type AddToCartMutationVariables = Exact<{
  input: AddToCartInput;
}>;


export type AddToCartMutation = { __typename?: 'Mutation', addToCart: { __typename?: 'Cart', id: string, items: Array<{ __typename?: 'CartItem', productId: string, variantId: string | null, quantity: number, unitPrice: string, lineTotal: string, product: { __typename?: 'Product', id: string, name: string, image: string } }>, totals: { __typename?: 'CartTotals', subtotal: string, tax: string, total: string, currency: string } | null } };

export type UpdateCartItemMutationVariables = Exact<{
  cartId: Scalars['ID']['input'];
  input: UpdateCartItemInput;
}>;


export type UpdateCartItemMutation = { __typename?: 'Mutation', updateCartItem: { __typename?: 'Cart', id: string, items: Array<{ __typename?: 'CartItem', productId: string, variantId: string | null, quantity: number, unitPrice: string, lineTotal: string }>, totals: { __typename?: 'CartTotals', subtotal: string, tax: string, total: string, currency: string } | null } };

export type RemoveFromCartMutationVariables = Exact<{
  cartId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
  variantId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type RemoveFromCartMutation = { __typename?: 'Mutation', removeFromCart: { __typename?: 'Cart', id: string, items: Array<{ __typename?: 'CartItem', productId: string, variantId: string | null, quantity: number }>, totals: { __typename?: 'CartTotals', subtotal: string, tax: string, total: string, currency: string } | null } };

export type ClearCartMutationVariables = Exact<{
  cartId: Scalars['ID']['input'];
}>;


export type ClearCartMutation = { __typename?: 'Mutation', clearCart: boolean };

export type UpdateFulfillmentMutationVariables = Exact<{
  input: UpdateOrderFulfillmentInput;
}>;


export type UpdateFulfillmentMutation = { __typename?: 'Mutation', updateFulfillment: { __typename?: 'Order', id: string, orderNumber: string, status: OrderStatus, fulfillmentStatus: FulfillmentStatus, trackingNumber: string | null, carrier: string | null } };

export type CreateOrderMutationVariables = Exact<{
  input: CreateOrderInput;
}>;


export type CreateOrderMutation = { __typename?: 'Mutation', createOrder: { __typename?: 'Order', id: string, orderNumber: string, status: OrderStatus, totalAmount: string } };

export type DeleteProductMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteProductMutation = { __typename?: 'Mutation', deleteProduct: boolean };

export type CreateProductMutationVariables = Exact<{
  input: CreateProductInput;
}>;


export type CreateProductMutation = { __typename?: 'Mutation', createProduct: { __typename?: 'Product', id: string, name: string, description: string, price: string, category: string, productType: string, image: string, stock: number, inventoryStatus: InventoryStatus, status: ProductStatus } };

export type UpdateProductMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateProductInput;
}>;


export type UpdateProductMutation = { __typename?: 'Mutation', updateProduct: { __typename?: 'Product', id: string, name: string, description: string, price: string, category: string, productType: string, image: string, stock: number, inventoryStatus: InventoryStatus, status: ProductStatus } };

export type CreateWholesaleInvitationMutationVariables = Exact<{
  input: CreateWholesaleInvitationInput;
}>;


export type CreateWholesaleInvitationMutation = { __typename?: 'Mutation', createWholesaleInvitation: { __typename?: 'WholesaleInvitation', id: string, buyerEmail: string, token: string } };

export type GetCartQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCartQuery = { __typename?: 'Query', cart: { __typename?: 'Cart', id: string, items: Array<{ __typename?: 'CartItem', productId: string, variantId: string | null, quantity: number, unitPrice: string, lineTotal: string, product: { __typename?: 'Product', id: string, name: string, price: string, images: Array<string> } }>, totals: { __typename?: 'CartTotals', subtotal: string, tax: string, total: string, currency: string } | null } | null };

export type ListOrdersQueryVariables = Exact<{
  filter?: InputMaybe<OrderFilterInput>;
  sort?: InputMaybe<OrderSortInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListOrdersQuery = { __typename?: 'Query', listOrders: { __typename?: 'OrderConnection', totalCount: number, edges: Array<{ __typename?: 'OrderEdge', node: { __typename?: 'Order', id: string, orderNumber: string, status: OrderStatus, fulfillmentStatus: FulfillmentStatus, paymentStatus: PaymentStatus, totalAmount: string, currency: Currency, customerName: string, customerEmail: string, createdAt: string, buyer: { __typename?: 'User', id: string, email: string, fullName: string | null } | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor: string | null, endCursor: string | null } } };

export type GetOrderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOrderQuery = { __typename?: 'Query', getOrder: { __typename?: 'Order', id: string, orderNumber: string, status: OrderStatus, fulfillmentStatus: FulfillmentStatus, paymentStatus: PaymentStatus, subtotal: string, shippingCost: string, taxAmount: string, totalAmount: string, currency: Currency, customerName: string, customerEmail: string, customerPhone: string | null, trackingNumber: string | null, carrier: string | null, createdAt: string, updatedAt: string, paidAt: string | null, shippingAddress: { __typename?: 'Address', fullName: string | null, addressLine1: string, addressLine2: string | null, city: string, state: string, postalCode: string, country: string, phone: string | null }, billingAddress: { __typename?: 'Address', fullName: string | null, addressLine1: string, addressLine2: string | null, city: string, state: string, postalCode: string, country: string, phone: string | null } | null, buyer: { __typename?: 'User', id: string, email: string, fullName: string | null } | null, items: Array<{ __typename?: 'OrderItem', id: string, productId: string, productName: string, productImage: string | null, quantity: number, unitPrice: string, lineTotal: string, fulfillmentStatus: FulfillmentStatus, variantId: string | null, product: { __typename?: 'Product', id: string, name: string, images: Array<string> } }> } | null };

export type ListProductsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ProductFilterInput>;
}>;


export type ListProductsQuery = { __typename?: 'Query', listProducts: { __typename?: 'ProductConnection', totalCount: number, edges: Array<{ __typename?: 'ProductEdge', cursor: string, node: { __typename?: 'Product', id: string, name: string, description: string, price: string, category: string, productType: string, image: string, stock: number, status: ProductStatus, createdAt: string, presentation: { __typename?: 'ProductPresentation', availabilityText: string, badges: Array<string>, stockLevelIndicator: string, availableForPurchase: boolean, isPreOrder: boolean, isMadeToOrder: boolean, stockQuantity: number } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor: string | null, endCursor: string | null } } };

export type GetProductQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProductQuery = { __typename?: 'Query', getProduct: { __typename?: 'Product', id: string, name: string, description: string, price: string, category: string, productType: string, image: string, images: Array<string>, stock: number, status: ProductStatus, createdAt: string, presentation: { __typename?: 'ProductPresentation', availabilityText: string, badges: Array<string>, stockLevelIndicator: string, availableForPurchase: boolean, isPreOrder: boolean, isMadeToOrder: boolean, stockQuantity: number } } | null };

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentUserQuery = { __typename?: 'Query', getCurrentUser: { __typename?: 'User', id: string, email: string, username: string | null, fullName: string | null, userType: UserType } | null };

export type ListWholesaleInvitationsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListWholesaleInvitationsQuery = { __typename?: 'Query', listWholesaleInvitations: { __typename?: 'WholesaleInvitationConnection', edges: Array<{ __typename?: 'WholesaleInvitationEdge', node: { __typename?: 'WholesaleInvitation', id: string, buyerEmail: string, status: WholesaleInvitationStatus, createdAt: string, acceptedAt: string | null, buyer: { __typename?: 'User', id: string, email: string, fullName: string | null } | null } }> } };

export type QuotationFieldsFragment = { __typename?: 'Quotation', id: string, quotationNumber: string, sellerId: string, buyerEmail: string, buyerId: string | null, status: QuotationStatus, subtotal: string, taxAmount: string, shippingAmount: string, total: string, currency: Currency, depositAmount: string, depositPercentage: number, balanceAmount: string, validUntil: string | null, deliveryTerms: string | null, paymentTerms: string | null, dataSheetUrl: string | null, termsAndConditionsUrl: string | null, orderId: string | null, metadata: Record<string, any> | null, createdAt: string, updatedAt: string } & { ' $fragmentName'?: 'QuotationFieldsFragment' };

export type LineItemFieldsFragment = { __typename?: 'QuotationLineItem', id: string, quotationId: string, lineNumber: number, description: string, productId: string | null, unitPrice: string, quantity: number, lineTotal: string, createdAt: string, updatedAt: string } & { ' $fragmentName'?: 'LineItemFieldsFragment' };

export type GetQuotationQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetQuotationQuery = { __typename?: 'Query', getQuotation: (
    { __typename?: 'Quotation', items: Array<(
      { __typename?: 'QuotationLineItem' }
      & { ' $fragmentRefs'?: { 'LineItemFieldsFragment': LineItemFieldsFragment } }
    )>, seller: { __typename?: 'User', id: string, username: string | null, email: string }, buyer: { __typename?: 'User', id: string, email: string } | null }
    & { ' $fragmentRefs'?: { 'QuotationFieldsFragment': QuotationFieldsFragment } }
  ) | null };

export type ListQuotationsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListQuotationsQuery = { __typename?: 'Query', listQuotations: { __typename?: 'QuotationConnection', totalCount: number, edges: Array<{ __typename?: 'QuotationEdge', node: (
        { __typename?: 'Quotation', seller: { __typename?: 'User', id: string, username: string | null }, buyer: { __typename?: 'User', id: string, email: string } | null }
        & { ' $fragmentRefs'?: { 'QuotationFieldsFragment': QuotationFieldsFragment } }
      ) }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor: string | null, endCursor: string | null } } };

export type CreateQuotationMutationVariables = Exact<{
  input: CreateQuotationInput;
}>;


export type CreateQuotationMutation = { __typename?: 'Mutation', createQuotation: (
    { __typename?: 'Quotation' }
    & { ' $fragmentRefs'?: { 'QuotationFieldsFragment': QuotationFieldsFragment } }
  ) };

export type UpdateQuotationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateQuotationInput;
}>;


export type UpdateQuotationMutation = { __typename?: 'Mutation', updateQuotation: (
    { __typename?: 'Quotation' }
    & { ' $fragmentRefs'?: { 'QuotationFieldsFragment': QuotationFieldsFragment } }
  ) };

export type AcceptQuotationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AcceptQuotationMutation = { __typename?: 'Mutation', acceptQuotation: (
    { __typename?: 'Quotation' }
    & { ' $fragmentRefs'?: { 'QuotationFieldsFragment': QuotationFieldsFragment } }
  ) };

export type GetWholesaleInvitationQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type GetWholesaleInvitationQuery = { __typename?: 'Query', getWholesaleInvitation: { __typename?: 'WholesaleInvitation', id: string, sellerId: string, buyerEmail: string, buyerId: string | null, status: WholesaleInvitationStatus, token: string, expiresAt: string, acceptedAt: string | null, createdAt: string, seller: { __typename?: 'User', id: string, fullName: string | null, email: string, sellerAccount: { __typename?: 'SellerAccount', businessName: string | null, storeName: string } | null } } | null };

export type AcceptInvitationMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type AcceptInvitationMutation = { __typename?: 'Mutation', acceptInvitation: { __typename?: 'WholesaleAccessGrant', id: string, sellerId: string, buyerId: string, isActive: boolean, grantedAt: string } };

export type ListWholesaleProductsQueryVariables = Exact<{
  filter?: InputMaybe<ProductFilterInput>;
  sort?: InputMaybe<ProductSortInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListWholesaleProductsQuery = { __typename?: 'Query', listProducts: { __typename?: 'ProductConnection', totalCount: number, edges: Array<{ __typename?: 'ProductEdge', cursor: string, node: { __typename?: 'Product', id: string, name: string, description: string, price: string, image: string, images: Array<string>, category: string, sku: string | null, stock: number, status: ProductStatus, productType: string, seller: { __typename?: 'User', id: string, sellerAccount: { __typename?: 'SellerAccount', businessName: string | null, storeName: string } | null } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor: string | null, endCursor: string | null } } };

export type GetWholesaleProductQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetWholesaleProductQuery = { __typename?: 'Query', getProduct: { __typename?: 'Product', id: string, name: string, description: string, price: string, image: string, images: Array<string>, category: string, sku: string | null, stock: number, status: ProductStatus, productType: string, seller: { __typename?: 'User', id: string, email: string, sellerAccount: { __typename?: 'SellerAccount', businessName: string | null, storeName: string } | null } } | null };

export type ListWholesaleOrdersQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListWholesaleOrdersQuery = { __typename?: 'Query', listWholesaleOrders: { __typename?: 'WholesaleOrderConnection', totalCount: number, edges: Array<{ __typename?: 'WholesaleOrderEdge', cursor: string, node: { __typename?: 'WholesaleOrder', id: string, orderNumber: string, sellerId: string, buyerId: string, status: OrderStatus, paymentStatus: PaymentStatus, subtotal: string, taxAmount: string, totalAmount: string, currency: Currency, depositAmount: string, depositPercentage: number, balanceDue: string, paymentTerms: string, poNumber: string | null, balanceRequestedAt: string | null, balancePaidAt: string | null, createdAt: string, updatedAt: string, seller: { __typename?: 'User', id: string, sellerAccount: { __typename?: 'SellerAccount', businessName: string | null, storeName: string } | null } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor: string | null, endCursor: string | null } } };

export type GetWholesaleOrderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetWholesaleOrderQuery = { __typename?: 'Query', getWholesaleOrder: { __typename?: 'WholesaleOrder', id: string, orderNumber: string, sellerId: string, buyerId: string, status: OrderStatus, paymentStatus: PaymentStatus, subtotal: string, taxAmount: string, totalAmount: string, currency: Currency, depositAmount: string, depositPercentage: number, balanceDue: string, paymentTerms: string, poNumber: string | null, vatNumber: string | null, incoterms: string | null, balanceRequestedAt: string | null, balancePaidAt: string | null, trackingNumber: string | null, carrier: string | null, createdAt: string, updatedAt: string, calculatedDepositAmount: string, calculatedBalanceAmount: string, seller: { __typename?: 'User', id: string, email: string, sellerAccount: { __typename?: 'SellerAccount', businessName: string | null, storeName: string } | null }, buyer: { __typename?: 'User', id: string, fullName: string | null, email: string }, items: Array<{ __typename?: 'WholesaleOrderItem', id: string, productId: string, productName: string, productSku: string | null, quantity: number, unitPrice: string, lineTotal: string, discountPercentage: string | null }> } | null };

export type PlaceWholesaleOrderMutationVariables = Exact<{
  input: PlaceWholesaleOrderInput;
}>;


export type PlaceWholesaleOrderMutation = { __typename?: 'Mutation', placeWholesaleOrder: { __typename?: 'WholesaleOrder', id: string, orderNumber: string, sellerId: string, buyerId: string, status: OrderStatus, totalAmount: string, depositAmount: string, balanceDue: string, paymentTerms: string, createdAt: string } };

export const QuotationFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"QuotationFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Quotation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quotationNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"shippingAmount"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"balanceAmount"}},{"kind":"Field","name":{"kind":"Name","value":"validUntil"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryTerms"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"dataSheetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"termsAndConditionsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<QuotationFieldsFragment, unknown>;
export const LineItemFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LineItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"QuotationLineItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quotationId"}},{"kind":"Field","name":{"kind":"Name","value":"lineNumber"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"lineTotal"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<LineItemFieldsFragment, unknown>;
export const AddToCartDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddToCart"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddToCartInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addToCart"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"lineTotal"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"image"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"totals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"tax"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}}]}}]}}]}}]} as unknown as DocumentNode<AddToCartMutation, AddToCartMutationVariables>;
export const UpdateCartItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCartItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cartId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCartItemInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCartItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cartId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cartId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"lineTotal"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"tax"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateCartItemMutation, UpdateCartItemMutationVariables>;
export const RemoveFromCartDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveFromCart"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cartId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"productId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"variantId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeFromCart"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cartId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cartId"}}},{"kind":"Argument","name":{"kind":"Name","value":"productId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"productId"}}},{"kind":"Argument","name":{"kind":"Name","value":"variantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"variantId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"tax"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}}]}}]}}]}}]} as unknown as DocumentNode<RemoveFromCartMutation, RemoveFromCartMutationVariables>;
export const ClearCartDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClearCart"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cartId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clearCart"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cartId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cartId"}}}]}]}}]} as unknown as DocumentNode<ClearCartMutation, ClearCartMutationVariables>;
export const UpdateFulfillmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateFulfillment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateOrderFulfillmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateFulfillment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderNumber"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"trackingNumber"}},{"kind":"Field","name":{"kind":"Name","value":"carrier"}}]}}]}}]} as unknown as DocumentNode<UpdateFulfillmentMutation, UpdateFulfillmentMutationVariables>;
export const CreateOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateOrderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderNumber"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}}]}}]}}]} as unknown as DocumentNode<CreateOrderMutation, CreateOrderMutationVariables>;
export const DeleteProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProductMutation, DeleteProductMutationVariables>;
export const CreateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"stock"}},{"kind":"Field","name":{"kind":"Name","value":"inventoryStatus"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<CreateProductMutation, CreateProductMutationVariables>;
export const UpdateProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProductInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"stock"}},{"kind":"Field","name":{"kind":"Name","value":"inventoryStatus"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<UpdateProductMutation, UpdateProductMutationVariables>;
export const CreateWholesaleInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWholesaleInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWholesaleInvitationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWholesaleInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]}}]} as unknown as DocumentNode<CreateWholesaleInvitationMutation, CreateWholesaleInvitationMutationVariables>;
export const GetCartDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCart"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"cart"},"name":{"kind":"Name","value":"getCartBySession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"StringValue","value":"","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"lineTotal"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"images"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"totals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"tax"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}}]}}]}}]}}]} as unknown as DocumentNode<GetCartQuery, GetCartQueryVariables>;
export const ListOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListOrders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderFilterInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"OrderSortInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listOrders"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderNumber"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"paymentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"customerName"}},{"kind":"Field","name":{"kind":"Name","value":"customerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"buyer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}},{"kind":"Field","name":{"kind":"Name","value":"startCursor"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<ListOrdersQuery, ListOrdersQueryVariables>;
export const GetOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderNumber"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"paymentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"shippingCost"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"customerName"}},{"kind":"Field","name":{"kind":"Name","value":"customerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"customerPhone"}},{"kind":"Field","name":{"kind":"Name","value":"shippingAddress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"addressLine1"}},{"kind":"Field","name":{"kind":"Name","value":"addressLine2"}},{"kind":"Field","name":{"kind":"Name","value":"city"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"postalCode"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"billingAddress"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"addressLine1"}},{"kind":"Field","name":{"kind":"Name","value":"addressLine2"}},{"kind":"Field","name":{"kind":"Name","value":"city"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"postalCode"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"trackingNumber"}},{"kind":"Field","name":{"kind":"Name","value":"carrier"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"paidAt"}},{"kind":"Field","name":{"kind":"Name","value":"buyer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"productName"}},{"kind":"Field","name":{"kind":"Name","value":"productImage"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"lineTotal"}},{"kind":"Field","name":{"kind":"Name","value":"fulfillmentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"variantId"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"images"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetOrderQuery, GetOrderQueryVariables>;
export const ListProductsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListProducts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ProductFilterInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listProducts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"stock"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"presentation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availabilityText"}},{"kind":"Field","name":{"kind":"Name","value":"badges"}},{"kind":"Field","name":{"kind":"Name","value":"stockLevelIndicator"}},{"kind":"Field","name":{"kind":"Name","value":"availableForPurchase"}},{"kind":"Field","name":{"kind":"Name","value":"isPreOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isMadeToOrder"}},{"kind":"Field","name":{"kind":"Name","value":"stockQuantity"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"cursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}},{"kind":"Field","name":{"kind":"Name","value":"startCursor"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<ListProductsQuery, ListProductsQueryVariables>;
export const GetProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"images"}},{"kind":"Field","name":{"kind":"Name","value":"stock"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"presentation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availabilityText"}},{"kind":"Field","name":{"kind":"Name","value":"badges"}},{"kind":"Field","name":{"kind":"Name","value":"stockLevelIndicator"}},{"kind":"Field","name":{"kind":"Name","value":"availableForPurchase"}},{"kind":"Field","name":{"kind":"Name","value":"isPreOrder"}},{"kind":"Field","name":{"kind":"Name","value":"isMadeToOrder"}},{"kind":"Field","name":{"kind":"Name","value":"stockQuantity"}}]}}]}}]}}]} as unknown as DocumentNode<GetProductQuery, GetProductQueryVariables>;
export const GetCurrentUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCurrentUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getCurrentUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"userType"}}]}}]}}]} as unknown as DocumentNode<GetCurrentUserQuery, GetCurrentUserQueryVariables>;
export const ListWholesaleInvitationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListWholesaleInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listWholesaleInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"buyer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<ListWholesaleInvitationsQuery, ListWholesaleInvitationsQueryVariables>;
export const GetQuotationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetQuotation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getQuotation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"QuotationFields"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LineItemFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"seller"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buyer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"QuotationFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Quotation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quotationNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"shippingAmount"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"balanceAmount"}},{"kind":"Field","name":{"kind":"Name","value":"validUntil"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryTerms"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"dataSheetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"termsAndConditionsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LineItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"QuotationLineItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quotationId"}},{"kind":"Field","name":{"kind":"Name","value":"lineNumber"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"lineTotal"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GetQuotationQuery, GetQuotationQueryVariables>;
export const ListQuotationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListQuotations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listQuotations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"QuotationFields"}},{"kind":"Field","name":{"kind":"Name","value":"seller"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buyer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}},{"kind":"Field","name":{"kind":"Name","value":"startCursor"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"QuotationFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Quotation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quotationNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"shippingAmount"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"balanceAmount"}},{"kind":"Field","name":{"kind":"Name","value":"validUntil"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryTerms"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"dataSheetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"termsAndConditionsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ListQuotationsQuery, ListQuotationsQueryVariables>;
export const CreateQuotationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateQuotation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateQuotationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createQuotation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"QuotationFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"QuotationFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Quotation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quotationNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"shippingAmount"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"balanceAmount"}},{"kind":"Field","name":{"kind":"Name","value":"validUntil"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryTerms"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"dataSheetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"termsAndConditionsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CreateQuotationMutation, CreateQuotationMutationVariables>;
export const UpdateQuotationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateQuotation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateQuotationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateQuotation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"QuotationFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"QuotationFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Quotation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quotationNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"shippingAmount"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"balanceAmount"}},{"kind":"Field","name":{"kind":"Name","value":"validUntil"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryTerms"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"dataSheetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"termsAndConditionsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<UpdateQuotationMutation, UpdateQuotationMutationVariables>;
export const AcceptQuotationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptQuotation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptQuotation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"QuotationFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"QuotationFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Quotation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quotationNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"shippingAmount"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"balanceAmount"}},{"kind":"Field","name":{"kind":"Name","value":"validUntil"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryTerms"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"dataSheetUrl"}},{"kind":"Field","name":{"kind":"Name","value":"termsAndConditionsUrl"}},{"kind":"Field","name":{"kind":"Name","value":"orderId"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AcceptQuotationMutation, AcceptQuotationMutationVariables>;
export const GetWholesaleInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWholesaleInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getWholesaleInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerEmail"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"acceptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"seller"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"sellerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessName"}},{"kind":"Field","name":{"kind":"Name","value":"storeName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetWholesaleInvitationQuery, GetWholesaleInvitationQueryVariables>;
export const AcceptInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"grantedAt"}}]}}]}}]} as unknown as DocumentNode<AcceptInvitationMutation, AcceptInvitationMutationVariables>;
export const ListWholesaleProductsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListWholesaleProducts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ProductFilterInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ProductSortInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listProducts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"images"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"stock"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"seller"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sellerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessName"}},{"kind":"Field","name":{"kind":"Name","value":"storeName"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}},{"kind":"Field","name":{"kind":"Name","value":"startCursor"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<ListWholesaleProductsQuery, ListWholesaleProductsQueryVariables>;
export const GetWholesaleProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWholesaleProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getProduct"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"price"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"images"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"sku"}},{"kind":"Field","name":{"kind":"Name","value":"stock"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"seller"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"sellerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessName"}},{"kind":"Field","name":{"kind":"Name","value":"storeName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetWholesaleProductQuery, GetWholesaleProductQueryVariables>;
export const ListWholesaleOrdersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListWholesaleOrders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listWholesaleOrders"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paymentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"balanceDue"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"poNumber"}},{"kind":"Field","name":{"kind":"Name","value":"balanceRequestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"balancePaidAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"seller"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sellerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessName"}},{"kind":"Field","name":{"kind":"Name","value":"storeName"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}},{"kind":"Field","name":{"kind":"Name","value":"startCursor"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<ListWholesaleOrdersQuery, ListWholesaleOrdersQueryVariables>;
export const GetWholesaleOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWholesaleOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getWholesaleOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"paymentStatus"}},{"kind":"Field","name":{"kind":"Name","value":"subtotal"}},{"kind":"Field","name":{"kind":"Name","value":"taxAmount"}},{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositPercentage"}},{"kind":"Field","name":{"kind":"Name","value":"balanceDue"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"poNumber"}},{"kind":"Field","name":{"kind":"Name","value":"vatNumber"}},{"kind":"Field","name":{"kind":"Name","value":"incoterms"}},{"kind":"Field","name":{"kind":"Name","value":"balanceRequestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"balancePaidAt"}},{"kind":"Field","name":{"kind":"Name","value":"trackingNumber"}},{"kind":"Field","name":{"kind":"Name","value":"carrier"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"seller"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"sellerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"businessName"}},{"kind":"Field","name":{"kind":"Name","value":"storeName"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"buyer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"productName"}},{"kind":"Field","name":{"kind":"Name","value":"productSku"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"unitPrice"}},{"kind":"Field","name":{"kind":"Name","value":"lineTotal"}},{"kind":"Field","name":{"kind":"Name","value":"discountPercentage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"calculatedDepositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"calculatedBalanceAmount"}}]}}]}}]} as unknown as DocumentNode<GetWholesaleOrderQuery, GetWholesaleOrderQueryVariables>;
export const PlaceWholesaleOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PlaceWholesaleOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlaceWholesaleOrderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placeWholesaleOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"orderNumber"}},{"kind":"Field","name":{"kind":"Name","value":"sellerId"}},{"kind":"Field","name":{"kind":"Name","value":"buyerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"depositAmount"}},{"kind":"Field","name":{"kind":"Name","value":"balanceDue"}},{"kind":"Field","name":{"kind":"Name","value":"paymentTerms"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<PlaceWholesaleOrderMutation, PlaceWholesaleOrderMutationVariables>;