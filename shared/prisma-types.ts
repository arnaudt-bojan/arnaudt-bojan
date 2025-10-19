/**
 * Prisma Type Bridge Layer
 * 
 * This file re-exports Prisma types to maintain compatibility with
 * the existing codebase during the Drizzle → Prisma migration.
 * 
 * Strategy:
 * - Prisma Client types are exported with names matching Drizzle types
 * - Existing Zod schemas remain unchanged for validation
 * - Storage layer can use these types instead of Drizzle inferred types
 */

import type { Prisma } from "../generated/prisma";

// ============================================================================
// Core User Types
// ============================================================================

export type User = Prisma.usersGetPayload<{}>;
export type InsertUser = Prisma.usersCreateInput;
export type UpsertUser = Prisma.usersCreateInput;

// ============================================================================
// Product Types
// ============================================================================

export type Product = Prisma.productsGetPayload<{}>;
export type InsertProduct = Prisma.productsCreateInput;

export type WholesaleProduct = Prisma.wholesale_productsGetPayload<{}>;
export type InsertWholesaleProduct = Prisma.wholesale_productsCreateInput;

// ============================================================================
// Order Types
// ============================================================================

export type Order = Prisma.ordersGetPayload<{}>;
export type InsertOrder = Prisma.ordersCreateInput;

export type OrderItem = Prisma.order_itemsGetPayload<{}>;
export type InsertOrderItem = Prisma.order_itemsCreateInput;

export type WholesaleOrder = Prisma.wholesale_ordersGetPayload<{}>;
export type InsertWholesaleOrder = Prisma.wholesale_ordersCreateInput;

export type WholesaleOrderItem = Prisma.wholesale_order_itemsGetPayload<{}>;
export type InsertWholesaleOrderItem = Prisma.wholesale_order_itemsCreateInput;

// ============================================================================
// Cart Types
// ============================================================================

export type Cart = Prisma.cartsGetPayload<{}>;
export type InsertCart = Prisma.cartsCreateInput;

export type CartSession = Prisma.cart_sessionsGetPayload<{}>;
export type InsertCartSession = Prisma.cart_sessionsCreateInput;

export type WholesaleCart = Prisma.wholesale_cartsGetPayload<{}>;
export type InsertWholesaleCart = Prisma.wholesale_cartsCreateInput;

// ============================================================================
// Auth Types
// ============================================================================

export type AuthToken = Prisma.auth_tokensGetPayload<{}>;
export type InsertAuthToken = Prisma.auth_tokensCreateInput;

// ============================================================================
// Invitation Types
// ============================================================================

export type Invitation = Prisma.invitationsGetPayload<{}>;
export type InsertInvitation = Prisma.invitationsCreateInput;

export type WholesaleInvitation = Prisma.wholesale_invitationsGetPayload<{}>;
export type InsertWholesaleInvitation = Prisma.wholesale_invitationsCreateInput;

export type TeamInvitation = Prisma.team_invitationsGetPayload<{}>;
export type InsertTeamInvitation = Prisma.team_invitationsCreateInput;

export type StoreInvitation = Prisma.store_invitationsGetPayload<{}>;
export type InsertStoreInvitation = Prisma.store_invitationsCreateInput;

// ============================================================================
// Access & Membership Types
// ============================================================================

export type UserStoreMembership = Prisma.user_store_membershipsGetPayload<{}>;
export type InsertUserStoreMembership = Prisma.user_store_membershipsCreateInput;

export type WholesaleAccessGrant = Prisma.wholesale_access_grantsGetPayload<{}>;
export type InsertWholesaleAccessGrant = Prisma.wholesale_access_grantsCreateInput;

export type UserStoreRole = Prisma.user_store_rolesGetPayload<{}>;
export type InsertUserStoreRole = Prisma.user_store_rolesCreateInput;

// ============================================================================
// Category Types
// ============================================================================

export type Category = Prisma.categoriesGetPayload<{}>;
export type InsertCategory = Prisma.categoriesCreateInput;

// ============================================================================
// Notification Types
// ============================================================================

export type Notification = Prisma.notificationsGetPayload<{}>;
export type InsertNotification = Prisma.notificationsCreateInput;

// ============================================================================
// Shipping Types
// ============================================================================

export type ShippingMatrix = Prisma.shipping_matricesGetPayload<{}>;
export type InsertShippingMatrix = Prisma.shipping_matricesCreateInput;

export type ShippingZone = Prisma.shipping_zonesGetPayload<{}>;
export type InsertShippingZone = Prisma.shipping_zonesCreateInput;

export type WholesaleShippingDetail = Prisma.wholesale_shipping_detailsGetPayload<{}>;
export type InsertWholesaleShippingDetail = Prisma.wholesale_shipping_detailsCreateInput;

export type WholesaleShippingMetadata = Prisma.wholesale_shipping_metadataGetPayload<{}>;
export type InsertWholesaleShippingMetadata = Prisma.wholesale_shipping_metadataCreateInput;

// ============================================================================
// Document Types
// ============================================================================

export type Invoice = Prisma.invoicesGetPayload<{}>;
export type InsertInvoice = Prisma.invoicesCreateInput;

export type PackingSlip = Prisma.packing_slipsGetPayload<{}>;
export type InsertPackingSlip = Prisma.packing_slipsCreateInput;

// ============================================================================
// Refund Types
// ============================================================================

export type Refund = Prisma.refundsGetPayload<{}>;
export type InsertRefund = Prisma.refundsCreateInput;

export type RefundLineItem = Prisma.refund_line_itemsGetPayload<{}>;
export type InsertRefundLineItem = Prisma.refund_line_itemsCreateInput;

// ============================================================================
// Order Event Types
// ============================================================================

export type OrderEvent = Prisma.order_eventsGetPayload<{}>;
export type InsertOrderEvent = Prisma.order_eventsCreateInput;

export type OrderBalancePayment = Prisma.order_balance_paymentsGetPayload<{}>;
export type InsertOrderBalancePayment = Prisma.order_balance_paymentsCreateInput;

export type BalanceRequest = Prisma.balance_requestsGetPayload<{}>;
export type InsertBalanceRequest = Prisma.balance_requestsCreateInput;

export type OrderAddressChange = Prisma.order_address_changesGetPayload<{}>;
export type InsertOrderAddressChange = Prisma.order_address_changesCreateInput;

export type WholesaleOrderEvent = Prisma.wholesale_order_eventsGetPayload<{}>;
export type InsertWholesaleOrderEvent = Prisma.wholesale_order_eventsCreateInput;

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentIntent = Prisma.payment_intentsGetPayload<{}>;
export type InsertPaymentIntent = Prisma.payment_intentsCreateInput;

export type WholesalePayment = Prisma.wholesale_paymentsGetPayload<{}>;
export type InsertWholesalePayment = Prisma.wholesale_paymentsCreateInput;

export type WholesalePaymentIntent = Prisma.wholesale_payment_intentsGetPayload<{}>;
export type InsertWholesalePaymentIntent = Prisma.wholesale_payment_intentsCreateInput;

export type SavedPaymentMethod = Prisma.saved_payment_methodsGetPayload<{}>;
export type InsertSavedPaymentMethod = Prisma.saved_payment_methodsCreateInput;

// ============================================================================
// Address Types
// ============================================================================

export type SavedAddress = Prisma.saved_addressesGetPayload<{}>;
export type InsertSavedAddress = Prisma.saved_addressesCreateInput;

export type WarehouseAddress = Prisma.warehouse_addressesGetPayload<{}>;
export type InsertWarehouseAddress = Prisma.warehouse_addressesCreateInput;

export type WarehouseLocation = Prisma.warehouse_locationsGetPayload<{}>;
export type InsertWarehouseLocation = Prisma.warehouse_locationsCreateInput;

export type BuyerProfile = Prisma.buyer_profilesGetPayload<{}>;
export type InsertBuyerProfile = Prisma.buyer_profilesCreateInput;

// ============================================================================
// Stock Management Types
// ============================================================================

export type StockReservation = Prisma.stock_reservationsGetPayload<{}>;
export type InsertStockReservation = Prisma.stock_reservationsCreateInput;

// ============================================================================
// Webhook Types
// ============================================================================

export type WebhookEvent = Prisma.webhook_eventsGetPayload<{}>;
export type InsertWebhookEvent = Prisma.webhook_eventsCreateInput;

export type FailedWebhookEvent = Prisma.failed_webhook_eventsGetPayload<{}>;
export type InsertFailedWebhookEvent = Prisma.failed_webhook_eventsCreateInput;

// ============================================================================
// Workflow Types
// ============================================================================

export type OrderWorkflow = Prisma.order_workflowsGetPayload<{}>;
export type InsertOrderWorkflow = Prisma.order_workflowsCreateInput;

export type OrderWorkflowEvent = Prisma.order_workflow_eventsGetPayload<{}>;
export type InsertOrderWorkflowEvent = Prisma.order_workflow_eventsCreateInput;

// ============================================================================
// Homepage Types
// ============================================================================

export type SellerHomepage = Prisma.seller_homepagesGetPayload<{}>;
export type InsertSellerHomepage = Prisma.seller_homepagesCreateInput;

export type HomepageCtaOption = Prisma.homepage_cta_optionsGetPayload<{}>;
export type InsertHomepageCtaOption = Prisma.homepage_cta_optionsCreateInput;

export type HomepageMediaAsset = Prisma.homepage_media_assetsGetPayload<{}>;
export type InsertHomepageMediaAsset = Prisma.homepage_media_assetsCreateInput;

// ============================================================================
// Music Types
// ============================================================================

export type MusicTrack = Prisma.music_tracksGetPayload<{}>;
export type InsertMusicTrack = Prisma.music_tracksCreateInput;

// ============================================================================
// Newsletter Types
// ============================================================================

export type Newsletter = Prisma.newslettersGetPayload<{}>;
export type InsertNewsletter = Prisma.newslettersCreateInput;

export type NewsletterTemplate = Prisma.newsletter_templatesGetPayload<{}>;
export type InsertNewsletterTemplate = Prisma.newsletter_templatesCreateInput;

export type NewsletterAnalytics = Prisma.newsletter_analyticsGetPayload<{}>;
export type InsertNewsletterAnalytics = Prisma.newsletter_analyticsCreateInput;

export type NewsletterEvent = Prisma.newsletter_eventsGetPayload<{}>;
export type InsertNewsletterEvent = Prisma.newsletter_eventsCreateInput;

export type NewsletterSegment = Prisma.newsletter_segmentsGetPayload<{}>;
export type InsertNewsletterSegment = Prisma.newsletter_segmentsCreateInput;

export type NewsletterSchedule = Prisma.newsletter_scheduleGetPayload<{}>;
export type InsertNewsletterSchedule = Prisma.newsletter_scheduleCreateInput;

export type NewsletterABTest = Prisma.newsletter_ab_testsGetPayload<{}>;
export type InsertNewsletterABTest = Prisma.newsletter_ab_testsCreateInput;

export type Subscriber = Prisma.subscribersGetPayload<{}>;
export type InsertSubscriber = Prisma.subscribersCreateInput;

export type SubscriberGroup = Prisma.subscriber_groupsGetPayload<{}>;
export type InsertSubscriberGroup = Prisma.subscriber_groupsCreateInput;

export type SubscriberGroupMembership = Prisma.subscriber_group_membershipsGetPayload<{}>;
export type InsertSubscriberGroupMembership = Prisma.subscriber_group_membershipsCreateInput;

// ============================================================================
// Social Media Ad Types
// ============================================================================

export type MetaSettings = Prisma.meta_settingsGetPayload<{}>;
export type InsertMetaSettings = Prisma.meta_settingsCreateInput;

export type TikTokSettings = Prisma.tiktok_settingsGetPayload<{}>;
export type InsertTikTokSettings = Prisma.tiktok_settingsCreateInput;

export type XSettings = Prisma.x_settingsGetPayload<{}>;
export type InsertXSettings = Prisma.x_settingsCreateInput;

// ============================================================================
// NFT Types
// ============================================================================

export type NftMint = Prisma.nft_mintsGetPayload<{}>;
export type InsertNftMint = Prisma.nft_mintsCreateInput;

// ============================================================================
// Analytics Types
// ============================================================================

export type AnalyticsEvent = Prisma.analytics_eventsGetPayload<{}>;
export type InsertAnalyticsEvent = Prisma.analytics_eventsCreateInput;

export type DailyAnalytics = Prisma.daily_analyticsGetPayload<{}>;
export type InsertDailyAnalytics = Prisma.daily_analyticsCreateInput;

export type FeatureAdoption = Prisma.feature_adoptionsGetPayload<{}>;
export type InsertFeatureAdoption = Prisma.feature_adoptionsCreateInput;

// ============================================================================
// Meta Ads Types
// ============================================================================

export type MetaAdAccount = Prisma.meta_ad_accountsGetPayload<{}>;
export type InsertMetaAdAccount = Prisma.meta_ad_accountsCreateInput;

export type MetaAdCampaign = Prisma.meta_ad_campaignsGetPayload<{}>;
export type InsertMetaAdCampaign = Prisma.meta_ad_campaignsCreateInput;

export type MetaAdPayment = Prisma.meta_ad_paymentsGetPayload<{}>;
export type InsertMetaAdPayment = Prisma.meta_ad_paymentsCreateInput;

export type MetaAdPerformance = Prisma.meta_ad_performanceGetPayload<{}>;
export type InsertMetaAdPerformance = Prisma.meta_ad_performanceCreateInput;

export type MetaCampaignFinance = Prisma.meta_campaign_financeGetPayload<{}>;
export type InsertMetaCampaignFinance = Prisma.meta_campaign_financeCreateInput;

export type MetaCampaignMetricsDaily = Prisma.meta_campaign_metrics_dailyGetPayload<{}>;
export type InsertMetaCampaignMetricsDaily = Prisma.meta_campaign_metrics_dailyCreateInput;

export type MetaCampaign = Prisma.meta_campaignsGetPayload<{}>;
export type InsertMetaCampaign = Prisma.meta_campaignsCreateInput;

// ============================================================================
// Import System Types
// ============================================================================

export type ImportJob = Prisma.import_jobsGetPayload<{}>;
export type InsertImportJob = Prisma.import_jobsCreateInput;

export type ImportSource = Prisma.import_sourcesGetPayload<{}>;
export type InsertImportSource = Prisma.import_sourcesCreateInput;

export type ImportJobLog = Prisma.import_job_logsGetPayload<{}>;
export type InsertImportJobLog = Prisma.import_job_logsCreateInput;

export type ImportJobError = Prisma.import_job_errorsGetPayload<{}>;
export type InsertImportJobError = Prisma.import_job_errorsCreateInput;

export type ProductSourceMapping = Prisma.product_source_mappingsGetPayload<{}>;
export type InsertProductSourceMapping = Prisma.product_source_mappingsCreateInput;

// ============================================================================
// Newsletter Workflow Types
// ============================================================================

export type NewsletterWorkflow = Prisma.newsletter_workflowsGetPayload<{}>;
export type InsertNewsletterWorkflow = Prisma.newsletter_workflowsCreateInput;

export type NewsletterJob = Prisma.newsletter_jobsGetPayload<{}>;
export type InsertNewsletterJob = Prisma.newsletter_jobsCreateInput;

export type NewsletterConversion = Prisma.newsletter_conversionsGetPayload<{}>;
export type InsertNewsletterConversion = Prisma.newsletter_conversionsCreateInput;

export type AutomationExecution = Prisma.automation_executionsGetPayload<{}>;
export type InsertAutomationExecution = Prisma.automation_executionsCreateInput;

export type SubscriberEngagement = Prisma.subscriber_engagementGetPayload<{}>;
export type InsertSubscriberEngagement = Prisma.subscriber_engagementCreateInput;

// ============================================================================
// Domain Connection Types
// ============================================================================

export type DomainConnection = Prisma.domain_connectionsGetPayload<{}>;
export type InsertDomainConnection = Prisma.domain_connectionsCreateInput;

// ============================================================================
// Bulk Upload Types
// ============================================================================

export type BulkUploadJob = Prisma.bulk_upload_jobsGetPayload<{}>;
export type InsertBulkUploadJob = Prisma.bulk_upload_jobsCreateInput;

export type BulkUploadItem = Prisma.bulk_upload_itemsGetPayload<{}>;
export type InsertBulkUploadItem = Prisma.bulk_upload_itemsCreateInput;

// ============================================================================
// Request Types (Cancellation & Return)
// ============================================================================

export type CancellationRequest = Prisma.cancellation_requestsGetPayload<{}>;
export type InsertCancellationRequest = Prisma.cancellation_requestsCreateInput;

export type ReturnRequest = Prisma.return_requestsGetPayload<{}>;
export type InsertReturnRequest = Prisma.return_requestsCreateInput;

// ============================================================================
// Trade Quotation Types
// ============================================================================

export type TradeQuotation = Prisma.trade_quotationsGetPayload<{}>;
export type InsertTradeQuotation = Prisma.trade_quotationsCreateInput;

export type TradeQuotationItem = Prisma.trade_quotation_itemsGetPayload<{}>;
export type InsertTradeQuotationItem = Prisma.trade_quotation_itemsCreateInput;

export type TradeQuotationEvent = Prisma.trade_quotation_eventsGetPayload<{}>;
export type InsertTradeQuotationEvent = Prisma.trade_quotation_eventsCreateInput;

export type TradePaymentSchedule = Prisma.trade_payment_schedulesGetPayload<{}>;
export type InsertTradePaymentSchedule = Prisma.trade_payment_schedulesCreateInput;

// ============================================================================
// Shipping Label Types
// ============================================================================

export type ShippingLabel = Prisma.shipping_labelsGetPayload<{}>;
export type InsertShippingLabel = Prisma.shipping_labelsCreateInput;

export type ShippingLabelRefund = Prisma.shipping_label_refundsGetPayload<{}>;
export type InsertShippingLabelRefund = Prisma.shipping_label_refundsCreateInput;

// ============================================================================
// Credit & Ledger Types
// ============================================================================

export type SellerCreditLedger = Prisma.seller_credit_ledgersGetPayload<{}>;
export type InsertSellerCreditLedger = Prisma.seller_credit_ledgersCreateInput;

// ============================================================================
// Background Job Types
// ============================================================================

export type BackgroundJobRun = Prisma.background_job_runsGetPayload<{}>;
export type InsertBackgroundJobRun = Prisma.background_job_runsCreateInput;

// ============================================================================
// Session Types
// ============================================================================

export type Session = Prisma.sessionsGetPayload<{}>;
export type InsertSession = Prisma.sessionsCreateInput;

export type CartItem = Prisma.cart_itemsGetPayload<{}>;
export type InsertCartItem = Prisma.cart_itemsCreateInput;

// ============================================================================
// Trustpilot Types
// ============================================================================

export type TrustpilotReview = Prisma.trustpilot_reviewsGetPayload<{}>;
export type InsertTrustpilotReview = Prisma.trustpilot_reviewsCreateInput;

export type TrustpilotToken = Prisma.trustpilot_tokensGetPayload<{}>;
export type InsertTrustpilotToken = Prisma.trustpilot_tokensCreateInput;

/**
 * Export all Prisma-generated types for advanced usage
 */
export type { Prisma };
