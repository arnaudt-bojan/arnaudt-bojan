# GraphQL Resolver Mapping Documentation

## Overview

This document maps each GraphQL query and mutation to the underlying service architecture, defines dataloader strategies for efficient data fetching, and outlines N+1 prevention patterns.

## Service Layer Architecture

### Existing Services Referenced

The GraphQL resolvers will leverage the existing service layer defined in `server/routes.ts`:

- **AuthorizationService** - Capability and permission checks
- **InventoryService** - Stock management and reservations
- **CartReservationService** - 30-minute cart hold reservations
- **SKUService** - Product SKU generation and management
- **ProductService** - Product CRUD operations
- **ProductVariantService** - Variant management
- **OrderService** - Order lifecycle management
- **WholesaleOrderService** - B2B order processing
- **WholesaleService** - Wholesale cart and invitation management
- **WholesaleInvitationEnhancedService** - Buyer invitations
- **QuotationService** - Trade quotation management
- **QuotationPaymentService** - Quotation payment processing
- **ShippingService** - Shipping rate calculation
- **TaxService** - Tax calculation
- **PaymentService** - Payment processing
- **RefundService** - Refund processing
- **SubscriptionService** - Seller subscription management
- **PaymentMethodsService** - Saved payment methods and addresses
- **MetaCampaignService** - Meta Ads campaign management
- **MetaOAuthService** - Meta OAuth integration
- **BudgetService** - Campaign budget management
- **CampaignService** - Newsletter campaign management
- **SubscriberService** - Newsletter subscriber management
- **SegmentationService** - Audience segmentation
- **AnalyticsService** - Newsletter analytics
- **DomainService** - Custom domain management
- **NotificationService** - User notifications
- **PlatformAnalyticsService** - Platform-wide analytics

---

## Module 1: Identity & Access

### Queries

#### `getCurrentUser: User`
- **Service**: Session management (Express session)
- **Implementation**: Read user ID from session, fetch from storage
- **N+1 Prevention**: None required (single user fetch)
- **Dataloader**: UserLoader (by ID)

#### `getUser(id: ID!): User`
- **Service**: Storage layer direct access
- **Implementation**: `storage.getUser(id)`
- **N+1 Prevention**: Use UserLoader for batch loading
- **Dataloader**: UserLoader (by ID)

#### `getSeller(id: ID!): SellerAccount`
- **Service**: Storage layer direct access
- **Implementation**: `storage.getSellerAccount(id)` or query users table
- **N+1 Prevention**: Use SellerAccountLoader
- **Dataloader**: SellerAccountLoader (by user ID)

#### `getStore(slug: String!): SellerAccount`
- **Service**: Storage layer direct access
- **Implementation**: Query users table by store_slug
- **N+1 Prevention**: Use SellerAccountBySlugLoader
- **Dataloader**: SellerAccountBySlugLoader (by slug)

#### `getBuyerProfile(userId: ID!): BuyerProfile`
- **Service**: Storage layer direct access
- **Implementation**: Query buyer_profiles table by user_id
- **N+1 Prevention**: Use BuyerProfileLoader
- **Dataloader**: BuyerProfileLoader (by user ID)

### Mutations

#### `login(email: String!, sellerContext: String): AuthToken!`
- **Service**: EmailAuthService (from `server/auth-email.ts`)
- **Implementation**: Generate auth token, send email with code
- **Side Effects**: Creates auth_tokens record, sends email

#### `verifyLoginCode(email: String!, code: String!): User!`
- **Service**: EmailAuthService
- **Implementation**: Verify code, create session, return user
- **Side Effects**: Marks token as used, creates Express session

#### `logout: Boolean!`
- **Service**: Session management
- **Implementation**: Destroy Express session
- **Side Effects**: Clears session data

#### `updateProfile(...): User!`
- **Service**: Storage layer
- **Implementation**: `storage.updateUser(userId, data)`
- **Side Effects**: Updates users table
- **Cache Invalidation**: Clear UserLoader cache for this user ID

#### `updateSellerAccount(...): SellerAccount!`
- **Service**: Storage layer
- **Implementation**: `storage.updateUser(userId, sellerData)`
- **Side Effects**: Updates users table (seller-specific fields)
- **Cache Invalidation**: Clear SellerAccountLoader cache

---

## Module 2: Catalog & Inventory

### Queries

#### `getProduct(id: ID!): Product`
- **Service**: ProductService
- **Implementation**: `productService.getProduct(id)`
- **N+1 Prevention**: Use ProductLoader
- **Dataloader**: ProductLoader (by ID)

#### `getProductBySlug(sellerId: ID!, slug: String!): Product`
- **Service**: ProductService
- **Implementation**: Query products table by seller_id and slug
- **N+1 Prevention**: Use ProductBySlugLoader
- **Dataloader**: ProductBySlugLoader (composite key: sellerId + slug)

#### `listProducts(filter, sort, pagination): ProductConnection!`
- **Service**: ProductService
- **Implementation**: `productService.listProducts(filter, sort, pagination)`
- **N+1 Prevention**: Batch load related data using dataloaders
- **Cursor-based Pagination**: Use product.id or created_at as cursor
- **Performance**: Add database indexes on filter/sort fields

#### `getInventory(productId: ID!): StockLevel`
- **Service**: InventoryService
- **Implementation**: `inventoryService.getStockLevel(productId)`
- **N+1 Prevention**: Use StockLevelLoader
- **Dataloader**: StockLevelLoader (by product ID)
- **Real-time Calculation**: 
  - Total stock from products.stock
  - Reserved stock from active stock_reservations
  - Available = Total - Reserved

#### `listCategories(parentId: ID, level: Int): [Category!]!`
- **Service**: Storage layer
- **Implementation**: Query categories table with filters
- **N+1 Prevention**: Batch load child categories
- **Dataloader**: CategoryLoader, CategoryChildrenLoader

#### `getCategory(id: ID!): Category`
- **Service**: Storage layer
- **Implementation**: `storage.getCategory(id)`
- **N+1 Prevention**: Use CategoryLoader
- **Dataloader**: CategoryLoader (by ID)

### Mutations

#### `createProduct(input: CreateProductInput!): Product!`
- **Service**: ProductService
- **Implementation**: `productService.createProduct(sellerId, input)`
- **Side Effects**: 
  - Creates products record
  - Generates SKU via SKUService
  - May create Stripe product if configured
- **Cache Invalidation**: None (new entity)

#### `updateProduct(id: ID!, input: UpdateProductInput!): Product!`
- **Service**: ProductService
- **Implementation**: `productService.updateProduct(id, input)`
- **Side Effects**: Updates products table
- **Cache Invalidation**: Clear ProductLoader cache for this ID

#### `deleteProduct(id: ID!): Boolean!`
- **Service**: ProductService
- **Implementation**: `productService.deleteProduct(id)`
- **Side Effects**: Soft delete (set status to 'archived') or hard delete
- **Cache Invalidation**: Clear ProductLoader cache

#### `reserveStock(...): StockReservation!`
- **Service**: CartReservationService
- **Implementation**: `cartReservationService.reserveStock(productId, variantId, quantity, sessionId)`
- **Side Effects**: Creates stock_reservations record with 30-min expiry
- **Stock Validation**: Checks available stock before reserving
- **Cache Invalidation**: Clear StockLevelLoader cache

#### `releaseStock(reservationId: ID!): Boolean!`
- **Service**: CartReservationService
- **Implementation**: `cartReservationService.releaseReservation(reservationId)`
- **Side Effects**: Marks reservation as released
- **Cache Invalidation**: Clear StockLevelLoader cache

---

## Module 3: Cart & Checkout

### Queries

#### `getCart(id: ID!): Cart`
- **Service**: Storage layer
- **Implementation**: Query carts table, parse JSON items
- **N+1 Prevention**: Use CartLoader, batch load products for cart items
- **Dataloader**: CartLoader (by ID)

#### `getCartBySession(sessionId: String!): Cart`
- **Service**: Storage layer
- **Implementation**: Query cart_sessions -> carts
- **N+1 Prevention**: Use CartBySessionLoader
- **Dataloader**: CartBySessionLoader (by session ID)

#### `getCheckoutSession(id: ID!): CheckoutSession`
- **Service**: CheckoutService
- **Implementation**: `checkoutService.getCheckoutSession(id)`
- **N+1 Prevention**: Use CheckoutSessionLoader
- **Dataloader**: CheckoutSessionLoader (by ID)
- **Pricing Calculation**: Uses PricingCalculationService

### Mutations

#### `addToCart(input: AddToCartInput!): Cart!`
- **Service**: CartValidationService, CartReservationService
- **Implementation**: 
  1. Validate product availability
  2. Reserve stock (30-min hold)
  3. Update cart items JSON
- **Side Effects**: Updates carts.items, creates stock_reservations
- **Cache Invalidation**: Clear CartLoader cache

#### `updateCartItem(cartId: ID!, input: UpdateCartItemInput!): Cart!`
- **Service**: CartValidationService, CartReservationService
- **Implementation**: 
  1. Adjust quantity in cart
  2. Update stock reservation
- **Side Effects**: Updates cart, adjusts reservation
- **Cache Invalidation**: Clear CartLoader cache

#### `removeFromCart(...): Cart!`
- **Service**: CartReservationService
- **Implementation**: Remove item from cart, release reservation
- **Side Effects**: Updates cart, releases stock
- **Cache Invalidation**: Clear CartLoader cache

#### `clearCart(cartId: ID!): Boolean!`
- **Service**: CartReservationService
- **Implementation**: Clear all items, release all reservations
- **Side Effects**: Empties cart, releases all stock
- **Cache Invalidation**: Clear CartLoader cache

#### `createCheckoutSession(input: CreateCheckoutSessionInput!): CheckoutSession!`
- **Service**: CheckoutService, PricingCalculationService
- **Implementation**: 
  1. Calculate pricing (subtotal, shipping, tax)
  2. Create checkout session
  3. Store addresses
- **Side Effects**: Creates checkout session record
- **Pricing**: Uses ShippingService + TaxService

---

## Module 4: Orders & Payments

### Queries

#### `getOrder(id: ID!): Order`
- **Service**: OrderService
- **Implementation**: `orderService.getOrder(id)`
- **N+1 Prevention**: Use OrderLoader, batch load order items
- **Dataloader**: OrderLoader (by ID), OrderItemsByOrderLoader

#### `getOrderByNumber(orderNumber: String!): Order`
- **Service**: OrderService
- **Implementation**: Query orders table by order_number
- **N+1 Prevention**: Use OrderByNumberLoader
- **Dataloader**: OrderByNumberLoader (by order number)

#### `listOrders(filter, sort, pagination): OrderConnection!`
- **Service**: OrderService
- **Implementation**: `orderService.listOrders(filter, sort, pagination)`
- **N+1 Prevention**: Batch load order items, products, users
- **Cursor Pagination**: Use order.created_at + id as cursor
- **Performance**: Indexes on seller_id, buyer_id, status, created_at

#### `getInvoice(id: ID!): Invoice`
- **Service**: DocumentGenerator
- **Implementation**: Query invoices table
- **N+1 Prevention**: Use InvoiceLoader
- **Dataloader**: InvoiceLoader (by ID)

#### `getInvoiceByOrder(orderId: ID!): Invoice`
- **Service**: DocumentGenerator
- **Implementation**: Query invoices by order_id
- **N+1 Prevention**: Use InvoiceByOrderLoader
- **Dataloader**: InvoiceByOrderLoader (by order ID)

#### `getPackingSlip(orderId: ID!): PackingSlip`
- **Service**: DocumentGenerator
- **Implementation**: Query packing_slips by order_id
- **N+1 Prevention**: Use PackingSlipByOrderLoader
- **Dataloader**: PackingSlipByOrderLoader (by order ID)

#### `getPaymentIntent(id: ID!): PaymentIntent`
- **Service**: PaymentService
- **Implementation**: Query payment_intents table
- **N+1 Prevention**: Use PaymentIntentLoader
- **Dataloader**: PaymentIntentLoader (by ID)

### Mutations

#### `createOrder(input: CreateOrderInput!): Order!`
- **Service**: CheckoutWorkflowOrchestrator
- **Implementation**: Orchestrates checkout workflow (Architecture 3):
  1. Validate cart (CartValidationService)
  2. Calculate pricing (PricingCalculationService)
  3. Reserve inventory (InventoryService)
  4. Create payment intent (PaymentService)
  5. Create order (OrderService)
- **Side Effects**: 
  - Creates order, order_items
  - Commits stock reservations
  - Creates payment intent
- **Workflow State Machine**: Uses workflow_executions for tracking
- **Error Handling**: Compensation logic for rollback

#### `capturePayment(orderId: ID!, paymentIntentId: ID!): Order!`
- **Service**: PaymentService, OrderService
- **Implementation**: 
  1. Capture Stripe payment intent
  2. Update order payment_status
  3. Send confirmation notification
- **Side Effects**: Updates order, creates order_events
- **Cache Invalidation**: Clear OrderLoader cache

#### `issueRefund(input: IssueRefundInput!): Refund!`
- **Service**: RefundService
- **Implementation**: `refundService.processRefund(orderId, lineItems, reason)`
- **Side Effects**: 
  - Creates refunds record
  - Creates refund_line_items
  - Processes Stripe refund
  - Releases inventory
  - Sends notification
- **Inventory**: Returns stock to available pool
- **Cache Invalidation**: Clear OrderLoader, ProductLoader caches

#### `updateFulfillment(input: UpdateOrderFulfillmentInput!): Order!`
- **Service**: OrderLifecycleService
- **Implementation**: Update fulfillment status, add tracking
- **Side Effects**: Updates order, creates order_events
- **Notifications**: Email to buyer with tracking info
- **Cache Invalidation**: Clear OrderLoader cache

#### `generateInvoice(orderId: ID!): Invoice!`
- **Service**: DocumentGenerator
- **Implementation**: `documentGenerator.generateInvoice(orderId)`
- **Side Effects**: 
  - Creates invoices record
  - Generates PDF via PDFKit
  - Uploads to object storage
- **Object Storage**: Stores PDF, returns URL

#### `generatePackingSlip(orderId: ID!): PackingSlip!`
- **Service**: DocumentGenerator
- **Implementation**: `documentGenerator.generatePackingSlip(orderId)`
- **Side Effects**: Creates packing_slips record, generates PDF

#### `purchaseShippingLabel(orderId: ID!, rateId: String!): ShippingLabel!`
- **Service**: ShippoLabelService
- **Implementation**: 
  1. Purchase label via Shippo API
  2. Calculate markup (20%)
  3. Debit seller credit ledger
  4. Update order with tracking
- **Side Effects**: 
  - Creates shipping_labels record
  - Creates seller_credit_ledgers entry
  - Updates order.tracking_number
- **Financial**: Charges seller account for label cost

---

## Module 5: Wholesale (B2B)

### Queries

#### `getWholesaleOrder(id: ID!): WholesaleOrder`
- **Service**: WholesaleOrderService
- **Implementation**: `wholesaleOrderService.getOrder(id)`
- **N+1 Prevention**: Use WholesaleOrderLoader, batch load items
- **Dataloader**: WholesaleOrderLoader (by ID)

#### `listWholesaleOrders(filter, pagination): WholesaleOrderConnection!`
- **Service**: WholesaleOrderService
- **Implementation**: `wholesaleOrderService.listOrders(filter, pagination)`
- **N+1 Prevention**: Batch load order items, products
- **Cursor Pagination**: Use created_at + id

#### `listWholesaleInvitations(...): WholesaleInvitationConnection!`
- **Service**: WholesaleInvitationEnhancedService
- **Implementation**: `wholesaleInvitationService.listInvitations(sellerId, status, pagination)`
- **N+1 Prevention**: Batch load seller/buyer users
- **Cursor Pagination**: Use created_at + id

#### `getWholesaleInvitation(token: String!): WholesaleInvitation`
- **Service**: WholesaleInvitationEnhancedService
- **Implementation**: Query wholesale_invitations by token
- **N+1 Prevention**: Use WholesaleInvitationByTokenLoader
- **Dataloader**: WholesaleInvitationByTokenLoader (by token)

### Mutations

#### `createWholesaleInvitation(input: CreateWholesaleInvitationInput!): WholesaleInvitation!`
- **Service**: WholesaleInvitationEnhancedService
- **Implementation**: `wholesaleInvitationService.createInvitation(sellerId, buyerEmail, message)`
- **Side Effects**: 
  - Creates wholesale_invitations record
  - Generates unique token
  - Sends invitation email
- **Email**: Uses NotificationService

#### `acceptInvitation(token: String!): WholesaleAccessGrant!`
- **Service**: WholesaleInvitationEnhancedService
- **Implementation**: `wholesaleInvitationService.acceptInvitation(token, userId)`
- **Side Effects**: 
  - Updates invitation status
  - Creates wholesale_access_grants record
  - Sends confirmation email
- **Access Control**: Grants buyer access to seller's wholesale catalog

#### `rejectInvitation(token: String!): Boolean!`
- **Service**: WholesaleInvitationEnhancedService
- **Implementation**: Update invitation status to rejected
- **Side Effects**: Updates invitation record

#### `placeWholesaleOrder(input: PlaceWholesaleOrderInput!): WholesaleOrder!`
- **Service**: WholesaleCheckoutWorkflowOrchestrator
- **Implementation**: Similar to retail checkout but with wholesale pricing
  1. Validate wholesale access
  2. Apply wholesale pricing tiers
  3. Calculate deposit (typically 50%)
  4. Reserve inventory (30-min hold via CartReservationService)
  5. Create wholesale order
  6. Create deposit payment intent
- **Side Effects**: 
  - Creates wholesale_orders record
  - Creates wholesale_order_items
  - Creates payment intent for deposit
  - Reserves stock
- **Pricing**: Uses WholesalePricingService

#### `requestWholesaleBalance(orderId: ID!): WholesaleOrder!`
- **Service**: WholesalePaymentService
- **Implementation**: 
  1. Create balance payment request
  2. Generate payment link
  3. Send email to buyer
- **Side Effects**: 
  - Creates wholesale_payment_requests record
  - Sends email with payment link
  - Updates order.balance_payment_status

---

## Module 6: Quotations (Trade)

### Queries

#### `getQuotation(id: ID!): Quotation`
- **Service**: QuotationService
- **Implementation**: `quotationService.getQuotation(id)`
- **N+1 Prevention**: Use QuotationLoader, batch load line items
- **Dataloader**: QuotationLoader (by ID)

#### `getQuotationByNumber(quotationNumber: String!): Quotation`
- **Service**: QuotationService
- **Implementation**: Query trade_quotations by quotation_number
- **N+1 Prevention**: Use QuotationByNumberLoader
- **Dataloader**: QuotationByNumberLoader (by quotation number)

#### `listQuotations(sellerId, buyerEmail, status, pagination): QuotationConnection!`
- **Service**: QuotationService
- **Implementation**: `quotationService.listQuotations(filters, pagination)`
- **N+1 Prevention**: Batch load line items, payment schedules
- **Cursor Pagination**: Use created_at + id

### Mutations

#### `createQuotation(input: CreateQuotationInput!): Quotation!`
- **Service**: QuotationService
- **Implementation**: `quotationService.createQuotation(sellerId, input)`
- **Side Effects**: 
  - Creates trade_quotations record
  - Creates trade_quotation_items
  - Generates quotation number
  - Creates payment schedule (deposit + balance)
- **Auto-calculation**: Calculates deposit/balance based on percentage

#### `updateQuotation(id: ID!, input: UpdateQuotationInput!): Quotation!`
- **Service**: QuotationService
- **Implementation**: Update quotation line items, terms
- **Side Effects**: 
  - Updates trade_quotations
  - Updates trade_quotation_items
  - Recalculates totals
- **Validation**: Only allow updates if status is 'draft'

#### `submitQuotation(id: ID!): Quotation!`
- **Service**: QuotationEmailService
- **Implementation**: 
  1. Update status to 'sent'
  2. Generate PDF quotation
  3. Send email to buyer
  4. Create activity event
- **Side Effects**: 
  - Updates quotation status
  - Creates trade_quotation_events record
  - Sends email

#### `acceptQuotation(id: ID!): Quotation!`
- **Service**: QuotationService
- **Implementation**: Update status to 'accepted'
- **Side Effects**: 
  - Updates quotation status
  - Creates activity event
  - Sends notification to seller

#### `payQuotationDeposit(id: ID!, paymentMethodId: String!): QuotationPayment!`
- **Service**: QuotationPaymentService
- **Implementation**: 
  1. Create Stripe payment intent for deposit
  2. Capture payment
  3. Update payment schedule
  4. Update quotation status
- **Side Effects**: 
  - Updates trade_payment_schedules.status
  - Creates order (converts quotation to order)
  - Creates order_events

#### `payQuotationBalance(id: ID!, paymentMethodId: String!): QuotationPayment!`
- **Service**: QuotationPaymentService
- **Implementation**: Similar to deposit but for balance payment
- **Side Effects**: 
  - Updates payment schedule
  - Updates quotation status to 'fully_paid'
  - Triggers order fulfillment

#### `cancelQuotation(id: ID!, reason: String): Quotation!`
- **Service**: QuotationService
- **Implementation**: Update status to 'cancelled'
- **Side Effects**: Updates quotation, creates activity event

---

## Module 7: Subscriptions & Billing

### Queries

#### `getSubscription(sellerId: ID!): SellerSubscription`
- **Service**: SubscriptionService
- **Implementation**: `subscriptionService.getSubscription(sellerId)`
- **N+1 Prevention**: Use SubscriptionBySellerLoader
- **Dataloader**: SubscriptionBySellerLoader (by seller ID)

#### `listInvoices(subscriptionId, pagination): SubscriptionInvoiceConnection!`
- **Service**: SubscriptionService
- **Implementation**: Query subscription_invoices with pagination
- **N+1 Prevention**: None required (single subscription's invoices)
- **Cursor Pagination**: Use created_at + id

#### `listPaymentMethods(userId: ID!): [StoredPaymentMethod!]!`
- **Service**: PaymentMethodsService
- **Implementation**: `paymentMethodsService.listPaymentMethods(userId)`
- **N+1 Prevention**: None required (single user's payment methods)

#### `listSavedAddresses(userId: ID!): [SavedAddress!]!`
- **Service**: PaymentMethodsService
- **Implementation**: `paymentMethodsService.listSavedAddresses(userId)`
- **N+1 Prevention**: None required (single user's addresses)

### Mutations

#### `createSubscription(tier, paymentMethodId): SellerSubscription!`
- **Service**: SubscriptionService
- **Implementation**: 
  1. Create Stripe subscription
  2. Create seller_subscriptions record
  3. Attach payment method
- **Side Effects**: 
  - Creates subscription record
  - Charges initial invoice
  - Grants tier capabilities

#### `updatePaymentMethod(subscriptionId, paymentMethodId): SellerSubscription!`
- **Service**: SubscriptionService
- **Implementation**: Update Stripe subscription payment method
- **Side Effects**: Updates Stripe subscription

#### `cancelSubscription(subscriptionId: ID!): SellerSubscription!`
- **Service**: SubscriptionService
- **Implementation**: Cancel Stripe subscription at period end
- **Side Effects**: Updates cancel_at_period_end flag

#### `savePaymentMethod(...): StoredPaymentMethod!`
- **Service**: PaymentMethodsService
- **Implementation**: 
  1. Attach Stripe payment method to customer
  2. Create saved_payment_methods record
- **Side Effects**: Creates saved payment method

#### `deletePaymentMethod(id: ID!): Boolean!`
- **Service**: PaymentMethodsService
- **Implementation**: Detach from Stripe, delete record
- **Side Effects**: Deletes saved_payment_methods record

#### `saveAddress(address, label, isDefault): SavedAddress!`
- **Service**: PaymentMethodsService
- **Implementation**: Create saved_addresses record
- **Side Effects**: Creates saved address, may update default

#### `deleteAddress(id: ID!): Boolean!`
- **Service**: PaymentMethodsService
- **Implementation**: Delete saved_addresses record
- **Side Effects**: Deletes saved address

---

## Module 8: Marketing (Meta Ads)

### Queries

#### `getCampaign(id: ID!): MetaCampaign`
- **Service**: MetaCampaignService
- **Implementation**: `metaCampaignService.getCampaign(id)`
- **N+1 Prevention**: Use MetaCampaignLoader
- **Dataloader**: MetaCampaignLoader (by ID)

#### `listCampaigns(sellerId, status, pagination): MetaCampaignConnection!`
- **Service**: MetaCampaignService
- **Implementation**: `metaCampaignService.listCampaigns(sellerId, status, pagination)`
- **N+1 Prevention**: Batch load products, metrics
- **Cursor Pagination**: Use created_at + id

#### `getCampaignMetrics(campaignId: ID!): MetaCampaignMetrics`
- **Service**: MetaAnalyticsService
- **Implementation**: Aggregate metrics from meta_ad_performance
- **N+1 Prevention**: None required (aggregated data)
- **Caching**: Cache metrics for 5 minutes

#### `getCampaignDailyMetrics(...): [MetaDailyMetrics!]!`
- **Service**: MetaAnalyticsService
- **Implementation**: Query meta_campaign_metrics_daily by date range
- **N+1 Prevention**: None required (time-series data)

#### `listMetaAdAccounts(sellerId: ID!): [MetaAdAccount!]!`
- **Service**: MetaOAuthService
- **Implementation**: Query meta_ad_accounts by seller_id
- **N+1 Prevention**: None required (single seller's accounts)

### Mutations

#### `launchMetaCampaign(input: LaunchMetaCampaignInput!): MetaCampaign!`
- **Service**: MetaCampaignService, BudgetService
- **Implementation**: 
  1. Validate budget and payment
  2. Create Stripe payment intent for total budget
  3. Create Meta campaign via Graph API
  4. Create ad sets and creatives
  5. Start campaign
- **Side Effects**: 
  - Creates meta_ad_campaigns record
  - Creates meta_campaign_finance entries
  - Charges seller via Stripe
  - Launches campaign on Meta

#### `pauseCampaign(campaignId: ID!): MetaCampaign!`
- **Service**: MetaCampaignService
- **Implementation**: Pause campaign via Meta Graph API
- **Side Effects**: Updates campaign status, pauses spend

#### `resumeCampaign(campaignId: ID!): MetaCampaign!`
- **Service**: MetaCampaignService
- **Implementation**: Resume campaign via Meta Graph API
- **Side Effects**: Updates campaign status, resumes spend

#### `updateBudget(input: UpdateCampaignBudgetInput!): MetaCampaign!`
- **Service**: BudgetService
- **Implementation**: 
  1. Charge additional budget if increased
  2. Update campaign budget via Meta API
- **Side Effects**: 
  - Updates campaign budget
  - May create additional payment intent
  - Updates meta_campaign_finance

#### `cancelCampaign(campaignId, reason): MetaCampaign!`
- **Service**: MetaCampaignService, BudgetService
- **Implementation**: 
  1. Stop campaign on Meta
  2. Calculate remaining budget
  3. Issue refund for unspent budget
- **Side Effects**: 
  - Updates campaign status
  - Creates refund record
  - Processes Stripe refund

#### `connectMetaAdAccount(accessToken, metaAdAccountId): MetaAdAccount!`
- **Service**: MetaOAuthService
- **Implementation**: 
  1. Validate access token via Meta API
  2. Fetch ad account details
  3. Store credentials
- **Side Effects**: Creates meta_ad_accounts record

#### `disconnectMetaAdAccount(id: ID!): Boolean!`
- **Service**: MetaOAuthService
- **Implementation**: Delete meta_ad_accounts record
- **Side Effects**: Revokes access, deletes record

---

## Module 9: Newsletter

### Queries

#### `getNewsletterCampaign(id: ID!): NewsletterCampaign`
- **Service**: CampaignService
- **Implementation**: `campaignService.getCampaign(id)`
- **N+1 Prevention**: Use NewsletterCampaignLoader
- **Dataloader**: NewsletterCampaignLoader (by ID)

#### `listNewsletterCampaigns(...): NewsletterCampaignConnection!`
- **Service**: CampaignService
- **Implementation**: `campaignService.listCampaigns(sellerId, status, pagination)`
- **N+1 Prevention**: Batch load segments
- **Cursor Pagination**: Use created_at + id

#### `listSubscribers(...): SubscriberConnection!`
- **Service**: SubscriberService
- **Implementation**: `subscriberService.listSubscribers(sellerId, segmentId, status, pagination)`
- **N+1 Prevention**: Batch load engagement data
- **Cursor Pagination**: Use created_at + id

#### `getNewsletterAnalytics(...): JSON`
- **Service**: AnalyticsService (Newsletter)
- **Implementation**: `analyticsService.getAnalytics(sellerId, dateFrom, dateTo)`
- **N+1 Prevention**: None required (aggregated data)
- **Aggregation**: Aggregate from newsletter_campaign_performance

#### `listSegments(sellerId: ID!): [Segment!]!`
- **Service**: SegmentationService
- **Implementation**: `segmentationService.listSegments(sellerId)`
- **N+1 Prevention**: Batch load subscriber counts

#### `listAutomationWorkflows(sellerId: ID!): [AutomationWorkflow!]!`
- **Service**: Storage layer (newsletter workflows)
- **Implementation**: Query newsletter_workflows table
- **N+1 Prevention**: None required

### Mutations

#### `createNewsletterCampaign(input): NewsletterCampaign!`
- **Service**: CampaignService
- **Implementation**: `campaignService.createCampaign(sellerId, input)`
- **Side Effects**: Creates newsletter_campaigns record
- **Validation**: Validate HTML content, sender email

#### `sendCampaign(campaignId: ID!): NewsletterCampaign!`
- **Service**: CampaignService, JobQueue
- **Implementation**: 
  1. Validate campaign ready to send
  2. Queue send job
  3. Process via newsletterJobQueue
  4. Send emails via Resend
  5. Track deliveries and opens
- **Side Effects**: 
  - Updates campaign status
  - Creates newsletter_deliveries
  - Queues background job

#### `addSubscriber(input: AddSubscriberInput!): Subscriber!`
- **Service**: SubscriberService
- **Implementation**: `subscriberService.addSubscriber(sellerId, input)`
- **Side Effects**: 
  - Creates subscribers record
  - Creates subscriber_group_memberships
  - Triggers welcome automation if configured

#### `unsubscribe(email: String!): Boolean!`
- **Service**: ComplianceService
- **Implementation**: Update subscriber status to 'unsubscribed'
- **Side Effects**: Updates subscriber status, logs event

#### `createSegment(name, description, criteria): Segment!`
- **Service**: SegmentationService
- **Implementation**: `segmentationService.createSegment(sellerId, name, description, criteria)`
- **Side Effects**: Creates subscriber_groups record
- **Dynamic Evaluation**: Criteria evaluated on-the-fly

#### `updateSegment(id, name, description, criteria): Segment!`
- **Service**: SegmentationService
- **Implementation**: Update subscriber_groups record
- **Side Effects**: Updates segment, re-evaluates membership

#### `deleteSegment(id: ID!): Boolean!`
- **Service**: SegmentationService
- **Implementation**: Delete subscriber_groups record
- **Side Effects**: Deletes segment, removes memberships

---

## Module 10: Domain & Platform Ops

### Queries

#### `getDomain(id: ID!): DomainConnection`
- **Service**: DomainService
- **Implementation**: Query domain_connections table
- **N+1 Prevention**: Use DomainConnectionLoader
- **Dataloader**: DomainConnectionLoader (by ID)

#### `listDomains(...): DomainConnectionConnection!`
- **Service**: DomainService
- **Implementation**: Query domain_connections with pagination
- **N+1 Prevention**: None required (single seller's domains)
- **Cursor Pagination**: Use created_at + id

#### `getJobRun(id: ID!): BackgroundJobRun`
- **Service**: Storage layer
- **Implementation**: Query background_job_runs table
- **N+1 Prevention**: Use BackgroundJobRunLoader
- **Dataloader**: BackgroundJobRunLoader (by ID)

#### `listJobRuns(...): BackgroundJobRunConnection!`
- **Service**: Storage layer
- **Implementation**: Query background_job_runs with pagination
- **N+1 Prevention**: None required
- **Cursor Pagination**: Use created_at + id

#### `getPlatformAnalytics(...): [PlatformAnalytics!]!`
- **Service**: PlatformAnalyticsService
- **Implementation**: Query daily_analytics table by date range
- **N+1 Prevention**: None required (time-series data)

#### `listNotifications(...): NotificationConnection!`
- **Service**: NotificationService
- **Implementation**: `notificationService.listNotifications(userId, unreadOnly, pagination)`
- **N+1 Prevention**: None required
- **Cursor Pagination**: Use created_at + id

### Mutations

#### `connectDomain(input: ConnectDomainInput!): DomainConnection!`
- **Service**: DomainService
- **Implementation**: 
  1. Validate domain format
  2. Generate verification token
  3. Create domain_connections record
  4. Return DNS instructions
- **Side Effects**: Creates domain connection record
- **Verification**: Requires DNS TXT record

#### `verifyDomain(id: ID!): DomainConnection!`
- **Service**: DomainService
- **Implementation**: 
  1. Check DNS TXT record
  2. If verified, provision SSL via Cloudflare
  3. Update status
- **Side Effects**: 
  - Updates domain status
  - Creates Cloudflare custom hostname
  - Provisions SSL certificate

#### `disconnectDomain(id: ID!): Boolean!`
- **Service**: DomainService
- **Implementation**: 
  1. Remove from Cloudflare
  2. Update status to deactivated
- **Side Effects**: Updates domain status, removes SSL

#### `setPrimaryDomain(id: ID!): DomainConnection!`
- **Service**: DomainService
- **Implementation**: Set is_primary flag, unset others
- **Side Effects**: Updates is_primary for all seller domains

#### `markNotificationRead(id: ID!): Notification!`
- **Service**: NotificationService
- **Implementation**: Update notification is_read flag
- **Side Effects**: Updates notifications.is_read

#### `markAllNotificationsRead: Boolean!`
- **Service**: NotificationService
- **Implementation**: Bulk update all unread notifications
- **Side Effects**: Updates multiple notifications

---

## Dataloader Strategy

### Core Dataloaders

#### UserLoader
- **Keys**: User ID
- **Batch Function**: `storage.getUsersByIds(ids)`
- **Cache TTL**: 5 minutes
- **Use Cases**: Fetching users for orders, quotations, invitations

#### ProductLoader
- **Keys**: Product ID
- **Batch Function**: `storage.getProductsByIds(ids)`
- **Cache TTL**: 2 minutes
- **Use Cases**: Cart items, order items, campaign products

#### OrderLoader
- **Keys**: Order ID
- **Batch Function**: `storage.getOrdersByIds(ids)`
- **Cache TTL**: 1 minute
- **Use Cases**: Fetching orders for invoices, refunds

#### OrderItemsByOrderLoader
- **Keys**: Order ID
- **Batch Function**: `storage.getOrderItemsByOrderIds(orderIds)`
- **Cache TTL**: 1 minute
- **Use Cases**: Loading order items when fetching orders

#### StockLevelLoader
- **Keys**: Product ID
- **Batch Function**: Calculate from products.stock and active reservations
- **Cache TTL**: 30 seconds
- **Real-time**: Short cache due to dynamic inventory

### Performance Patterns

#### N+1 Query Prevention

**Bad Pattern (N+1):**
```typescript
// For each order, fetch buyer separately (N+1 queries)
const orders = await getOrders();
for (const order of orders) {
  const buyer = await getUser(order.buyerId); // N queries!
}
```

**Good Pattern (Dataloader):**
```typescript
// Batch load all buyers in one query
const orders = await getOrders();
const buyers = await userLoader.loadMany(orders.map(o => o.buyerId)); // 1 query!
```

#### Dataloader Context

Dataloaders should be scoped to each GraphQL request:

```typescript
export function createDataloaders(storage: IStorage) {
  return {
    userLoader: new DataLoader(async (ids) => {
      const users = await storage.getUsersByIds(ids);
      return ids.map(id => users.find(u => u.id === id));
    }),
    productLoader: new DataLoader(async (ids) => {
      const products = await storage.getProductsByIds(ids);
      return ids.map(id => products.find(p => p.id === id));
    }),
    // ... other loaders
  };
}

// In GraphQL context
app.use('/graphql', (req, res) => {
  const context = {
    storage,
    loaders: createDataloaders(storage),
    userId: req.session.userId
  };
  // Execute GraphQL
});
```

#### Cache Invalidation

When mutations modify data, clear relevant dataloader caches:

```typescript
// After updating product
await productService.updateProduct(id, input);
context.loaders.productLoader.clear(id); // Clear cache for this product
```

---

## Pagination Implementation

### Cursor-Based Pagination

For Relay-style pagination, use cursor encoding:

```typescript
function encodeCursor(value: string | number): string {
  return Buffer.from(String(value)).toString('base64');
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf-8');
}

async function paginateProducts(args) {
  const { first, after, last, before } = args;
  
  let query = storage.db.selectFrom('products');
  
  if (after) {
    const afterId = decodeCursor(after);
    query = query.where('id', '>', afterId);
  }
  
  if (before) {
    const beforeId = decodeCursor(before);
    query = query.where('id', '<', beforeId);
  }
  
  const limit = first || last || 20;
  const products = await query.limit(limit + 1).execute();
  
  const hasMore = products.length > limit;
  const nodes = hasMore ? products.slice(0, limit) : products;
  
  return {
    edges: nodes.map(node => ({
      node,
      cursor: encodeCursor(node.id)
    })),
    pageInfo: {
      hasNextPage: first ? hasMore : false,
      hasPreviousPage: !!after,
      startCursor: nodes[0] ? encodeCursor(nodes[0].id) : null,
      endCursor: nodes[nodes.length - 1] ? encodeCursor(nodes[nodes.length - 1].id) : null
    },
    totalCount: await storage.db.selectFrom('products').select(db.fn.countAll().as('count')).executeTakeFirst()
  };
}
```

### Database Indexes for Pagination

Ensure indexes exist for cursor fields:

```sql
-- For product pagination
CREATE INDEX idx_products_id ON products(id);
CREATE INDEX idx_products_created_at ON products(created_at, id);

-- For order pagination with filters
CREATE INDEX idx_orders_seller_created ON orders(seller_id, created_at, id);
CREATE INDEX idx_orders_buyer_created ON orders(buyer_id, created_at, id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at, id);
```

---

## Authentication & Authorization

### Context Setup

```typescript
interface GraphQLContext {
  storage: IStorage;
  loaders: Dataloaders;
  userId?: string;
  userType?: 'seller' | 'buyer';
  sessionData: any;
}
```

### Authorization Patterns

#### Field-Level Authorization

Use directives or field resolvers:

```typescript
// Product resolver
Product: {
  async sellerNotes(parent, args, context) {
    // Only seller can see seller notes
    if (context.userId !== parent.sellerId) {
      return null; // Or throw error
    }
    return parent.sellerNotes;
  }
}
```

#### Mutation Authorization

Check permissions before executing:

```typescript
async updateProduct(parent, args, context) {
  const { id, input } = args;
  const product = await context.loaders.productLoader.load(id);
  
  // Verify ownership
  if (product.sellerId !== context.userId) {
    throw new Error('Not authorized');
  }
  
  return productService.updateProduct(id, input);
}
```

#### Capability-Based Authorization

Use AuthorizationService for fine-grained permissions:

```typescript
async deleteProduct(parent, args, context) {
  const hasCapability = await authorizationService.hasCapability(
    context.userId,
    'delete_products'
  );
  
  if (!hasCapability) {
    throw new Error('Insufficient permissions');
  }
  
  return productService.deleteProduct(args.id);
}
```

---

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid input (400)
2. **Authentication Errors**: Not logged in (401)
3. **Authorization Errors**: Insufficient permissions (403)
4. **Not Found Errors**: Resource doesn't exist (404)
5. **Conflict Errors**: Business logic violations (409)
6. **Server Errors**: Unexpected failures (500)

### GraphQL Error Format

```typescript
class ValidationError extends Error {
  constructor(message: string, public fields: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage in resolver
if (!input.email) {
  throw new ValidationError('Validation failed', {
    email: 'Email is required'
  });
}
```

---

## Real-Time Subscriptions

### WebSocket Setup

Use `graphql-ws` for subscriptions:

```typescript
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const wsServer = new WebSocketServer({ server: httpServer });
useServer({ schema, context: createContext }, wsServer);
```

### Subscription Implementations

#### `orderStatusUpdated`

Use existing WebSocket infrastructure from `server/routes.ts`:

```typescript
// In mutation resolvers
async updateFulfillment(parent, args, context) {
  const order = await orderService.updateFulfillment(args.input);
  
  // Publish to WebSocket clients
  pubsub.publish(`ORDER_${order.id}`, { orderStatusUpdated: order });
  pubsub.publish(`SELLER_${order.sellerId}`, { orderStatusUpdated: order });
  
  return order;
}
```

#### `cartSynced`

For real-time cart synchronization across devices:

```typescript
async addToCart(parent, args, context) {
  const cart = await cartService.addToCart(args.input);
  
  // Publish cart update
  pubsub.publish(`CART_${cart.id}`, { cartSynced: cart });
  
  return cart;
}
```

---

## Performance Optimization

### Query Complexity Analysis

Limit query depth and complexity:

```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const complexityLimit = createComplexityLimitRule(1000);
```

### Response Caching

Cache expensive queries:

```typescript
import { createInMemoryCache } from '@apollo/utils.keyvaluecache';

const cache = createInMemoryCache();

// In resolver
async getPlatformAnalytics(parent, args, context) {
  const cacheKey = `analytics:${args.dateFrom}:${args.dateTo}`;
  const cached = await cache.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const data = await analyticsService.getAnalytics(args.dateFrom, args.dateTo);
  await cache.set(cacheKey, JSON.stringify(data), { ttl: 300 }); // 5 min
  
  return data;
}
```

### Database Query Optimization

- Use `EXPLAIN ANALYZE` to optimize slow queries
- Add indexes for filter/sort fields
- Use database-level pagination (LIMIT/OFFSET)
- Avoid SELECT * - fetch only needed fields

---

## Monitoring & Observability

### Metrics to Track

1. **Query Performance**: Execution time per resolver
2. **Dataloader Efficiency**: Cache hit ratio
3. **Error Rates**: By error type
4. **Mutation Success Rates**: By mutation type
5. **Subscription Connections**: Active WebSocket connections

### Logging

Log GraphQL operations:

```typescript
app.use('/graphql', async (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info('GraphQL Request', {
      operation: req.body.operationName,
      duration: Date.now() - start,
      userId: req.session.userId,
      variables: req.body.variables
    });
  });
  
  next();
});
```

---

## Summary

This resolver mapping provides a comprehensive guide for implementing the GraphQL API on top of the existing service architecture. Key principles:

1. **Leverage Existing Services**: Reuse battle-tested services from REST API
2. **Prevent N+1 Queries**: Use dataloaders for all entity relationships
3. **Optimize Pagination**: Cursor-based pagination with proper indexing
4. **Secure by Default**: Authorization checks in every resolver
5. **Real-time Where Needed**: WebSocket subscriptions for live updates
6. **Performance First**: Caching, query complexity limits, efficient database queries

The GraphQL layer acts as a thin orchestration layer over the existing service architecture, providing a flexible, type-safe API for frontend clients while maintaining consistency with the existing REST API.
