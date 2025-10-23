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

import type { Prisma } from "../../../backend/generated/prisma";

// ============================================================================
// Core User Types
// ============================================================================

export type User = Prisma.usersGetPayload<{}>;
export type InsertUser = Prisma.usersUncheckedCreateInput;
export type UpdateUser = Prisma.usersUncheckedUpdateInput;
export type UpsertUser = Prisma.usersUncheckedCreateInput;

// ============================================================================
// Product Types
// ============================================================================

export type Product = Prisma.productsGetPayload<{}>;
export type InsertProduct = Prisma.productsUncheckedCreateInput;
export type UpdateProduct = Prisma.productsUncheckedUpdateInput;

export type WholesaleProduct = Prisma.wholesale_productsGetPayload<{}>;
export type InsertWholesaleProduct = Prisma.wholesale_productsUncheckedCreateInput;

// ============================================================================
// Order Types
// ============================================================================

export type Order = Prisma.ordersGetPayload<{}>;
export type InsertOrder = Prisma.ordersUncheckedCreateInput;
export type UpdateOrder = Prisma.ordersUncheckedUpdateInput;

export type OrderItem = Prisma.order_itemsGetPayload<{}>;
export type InsertOrderItem = Prisma.order_itemsUncheckedCreateInput;

export type WholesaleOrder = Prisma.wholesale_ordersGetPayload<{}>;
export type InsertWholesaleOrder = Prisma.wholesale_ordersUncheckedCreateInput;

export type WholesaleOrderItem = Prisma.wholesale_order_itemsGetPayload<{}>;
export type InsertWholesaleOrderItem = Prisma.wholesale_order_itemsUncheckedCreateInput;

// ============================================================================
// Cart Types
// ============================================================================

export type Cart = Prisma.cartsGetPayload<{}>;
export type InsertCart = Prisma.cartsUncheckedCreateInput;

export type CartSession = Prisma.cart_sessionsGetPayload<{}>;
export type InsertCartSession = Prisma.cart_sessionsUncheckedCreateInput;

export type WholesaleCart = Prisma.wholesale_cartsGetPayload<{}>;
export type InsertWholesaleCart = Prisma.wholesale_cartsUncheckedCreateInput;

// ============================================================================
// Auth Types
// ============================================================================

export type AuthToken = Prisma.auth_tokensGetPayload<{}>;
export type InsertAuthToken = Prisma.auth_tokensUncheckedCreateInput;

// ============================================================================
// Invitation Types
// ============================================================================

export type Invitation = Prisma.invitationsGetPayload<{}>;
export type InsertInvitation = Prisma.invitationsUncheckedCreateInput;

export type WholesaleInvitation = Prisma.wholesale_invitationsGetPayload<{}>;
export type InsertWholesaleInvitation = Prisma.wholesale_invitationsUncheckedCreateInput;

export type TeamInvitation = Prisma.team_invitationsGetPayload<{}>;
export type InsertTeamInvitation = Prisma.team_invitationsUncheckedCreateInput;

export type StoreInvitation = Prisma.store_invitationsGetPayload<{}>;
export type InsertStoreInvitation = Prisma.store_invitationsUncheckedCreateInput;

// ============================================================================
// Access & Membership Types
// ============================================================================

export type UserStoreMembership = Prisma.user_store_membershipsGetPayload<{}>;
export type InsertUserStoreMembership = Prisma.user_store_membershipsUncheckedCreateInput;

export type WholesaleAccessGrant = Prisma.wholesale_access_grantsGetPayload<{}>;
export type InsertWholesaleAccessGrant = Prisma.wholesale_access_grantsUncheckedCreateInput;

export type UserStoreRole = Prisma.user_store_rolesGetPayload<{}>;
export type InsertUserStoreRole = Prisma.user_store_rolesUncheckedCreateInput;

// ============================================================================
// Category Types
// ============================================================================

export type Category = Prisma.categoriesGetPayload<{}>;
export type InsertCategory = Prisma.categoriesUncheckedCreateInput;

// ============================================================================
// Notification Types
// ============================================================================

export type Notification = Prisma.notificationsGetPayload<{}>;
export type InsertNotification = Prisma.notificationsUncheckedCreateInput;

// ============================================================================
// Shipping Types
// ============================================================================

export type ShippingMatrix = Prisma.shipping_matricesGetPayload<{}>;
export type InsertShippingMatrix = Prisma.shipping_matricesUncheckedCreateInput;

export type ShippingZone = Prisma.shipping_zonesGetPayload<{}>;
export type InsertShippingZone = Prisma.shipping_zonesUncheckedCreateInput;

export type WholesaleShippingDetail = Prisma.wholesale_shipping_detailsGetPayload<{}>;
export type InsertWholesaleShippingDetail = Prisma.wholesale_shipping_detailsUncheckedCreateInput;

export type WholesaleShippingMetadata = Prisma.wholesale_shipping_metadataGetPayload<{}>;
export type InsertWholesaleShippingMetadata = Prisma.wholesale_shipping_metadataUncheckedCreateInput;

// ============================================================================
// Document Types
// ============================================================================

export type Invoice = Prisma.invoicesGetPayload<{}>;
export type InsertInvoice = Prisma.invoicesUncheckedCreateInput;

export type PackingSlip = Prisma.packing_slipsGetPayload<{}>;
export type InsertPackingSlip = Prisma.packing_slipsUncheckedCreateInput;

// ============================================================================
// Refund Types
// ============================================================================

export type Refund = Prisma.refundsGetPayload<{}>;
export type InsertRefund = Prisma.refundsUncheckedCreateInput;

export type RefundLineItem = Prisma.refund_line_itemsGetPayload<{}>;
export type InsertRefundLineItem = Prisma.refund_line_itemsUncheckedCreateInput;

// ============================================================================
// Order Event Types
// ============================================================================

export type OrderEvent = Prisma.order_eventsGetPayload<{}>;
export type InsertOrderEvent = Prisma.order_eventsUncheckedCreateInput;

export type OrderBalancePayment = Prisma.order_balance_paymentsGetPayload<{}>;
export type InsertOrderBalancePayment = Prisma.order_balance_paymentsUncheckedCreateInput;

export type BalanceRequest = Prisma.balance_requestsGetPayload<{}>;
export type InsertBalanceRequest = Prisma.balance_requestsUncheckedCreateInput;

export type OrderAddressChange = Prisma.order_address_changesGetPayload<{}>;
export type InsertOrderAddressChange = Prisma.order_address_changesUncheckedCreateInput;

export type WholesaleOrderEvent = Prisma.wholesale_order_eventsGetPayload<{}>;
export type InsertWholesaleOrderEvent = Prisma.wholesale_order_eventsUncheckedCreateInput;

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentIntent = Prisma.payment_intentsGetPayload<{}>;
export type InsertPaymentIntent = Prisma.payment_intentsUncheckedCreateInput;

export type WholesalePayment = Prisma.wholesale_paymentsGetPayload<{}>;
export type InsertWholesalePayment = Prisma.wholesale_paymentsUncheckedCreateInput;

export type WholesalePaymentIntent = Prisma.wholesale_payment_intentsGetPayload<{}>;
export type InsertWholesalePaymentIntent = Prisma.wholesale_payment_intentsUncheckedCreateInput;

export type SavedPaymentMethod = Prisma.saved_payment_methodsGetPayload<{}>;
export type InsertSavedPaymentMethod = Prisma.saved_payment_methodsUncheckedCreateInput;

// ============================================================================
// Address Types
// ============================================================================

export type SavedAddress = Prisma.saved_addressesGetPayload<{}>;
export type InsertSavedAddress = Prisma.saved_addressesUncheckedCreateInput;

export type WarehouseAddress = Prisma.warehouse_addressesGetPayload<{}>;
export type InsertWarehouseAddress = Prisma.warehouse_addressesUncheckedCreateInput;

export type WarehouseLocation = Prisma.warehouse_locationsGetPayload<{}>;
export type InsertWarehouseLocation = Prisma.warehouse_locationsUncheckedCreateInput;

export type BuyerProfile = Prisma.buyer_profilesGetPayload<{}>;
export type InsertBuyerProfile = Prisma.buyer_profilesUncheckedCreateInput;

// ============================================================================
// Stock Management Types
// ============================================================================

export type StockReservation = Prisma.stock_reservationsGetPayload<{}>;
export type InsertStockReservation = Prisma.stock_reservationsUncheckedCreateInput;

// ============================================================================
// Webhook Types
// ============================================================================

export type WebhookEvent = Prisma.webhook_eventsGetPayload<{}>;
export type InsertWebhookEvent = Prisma.webhook_eventsUncheckedCreateInput;

export type FailedWebhookEvent = Prisma.failed_webhook_eventsGetPayload<{}>;
export type InsertFailedWebhookEvent = Prisma.failed_webhook_eventsUncheckedCreateInput;

// ============================================================================
// Workflow Types
// ============================================================================

export type OrderWorkflow = Prisma.order_workflowsGetPayload<{}>;
export type InsertOrderWorkflow = Prisma.order_workflowsUncheckedCreateInput;

export type OrderWorkflowEvent = Prisma.order_workflow_eventsGetPayload<{}>;
export type InsertOrderWorkflowEvent = Prisma.order_workflow_eventsUncheckedCreateInput;

// ============================================================================
// Homepage Types
// ============================================================================

export type SellerHomepage = Prisma.seller_homepagesGetPayload<{}>;
export type InsertSellerHomepage = Prisma.seller_homepagesUncheckedCreateInput;

export type HomepageCtaOption = Prisma.homepage_cta_optionsGetPayload<{}>;
export type InsertHomepageCtaOption = Prisma.homepage_cta_optionsUncheckedCreateInput;

export type HomepageMediaAsset = Prisma.homepage_media_assetsGetPayload<{}>;
export type InsertHomepageMediaAsset = Prisma.homepage_media_assetsUncheckedCreateInput;

// ============================================================================
// Music Types
// ============================================================================

export type MusicTrack = Prisma.music_tracksGetPayload<{}>;
export type InsertMusicTrack = Prisma.music_tracksUncheckedCreateInput;

// ============================================================================
// Newsletter Types
// ============================================================================

export type Newsletter = Prisma.newslettersGetPayload<{}>;
export type InsertNewsletter = Prisma.newslettersUncheckedCreateInput;

export type NewsletterTemplate = Prisma.newsletter_templatesGetPayload<{}>;
export type InsertNewsletterTemplate = Prisma.newsletter_templatesUncheckedCreateInput;

export type NewsletterAnalytics = Prisma.newsletter_analyticsGetPayload<{}>;
export type InsertNewsletterAnalytics = Prisma.newsletter_analyticsUncheckedCreateInput;

export type NewsletterEvent = Prisma.newsletter_eventsGetPayload<{}>;
export type InsertNewsletterEvent = Prisma.newsletter_eventsUncheckedCreateInput;

export type NewsletterSegment = Prisma.newsletter_segmentsGetPayload<{}>;
export type InsertNewsletterSegment = Prisma.newsletter_segmentsUncheckedCreateInput;

export type NewsletterSchedule = Prisma.newsletter_scheduleGetPayload<{}>;
export type InsertNewsletterSchedule = Prisma.newsletter_scheduleUncheckedCreateInput;

export type NewsletterABTest = Prisma.newsletter_ab_testsGetPayload<{}>;
export type InsertNewsletterABTest = Prisma.newsletter_ab_testsUncheckedCreateInput;

export type Subscriber = Prisma.subscribersGetPayload<{}>;
export type InsertSubscriber = Prisma.subscribersUncheckedCreateInput;

export type SubscriberGroup = Prisma.subscriber_groupsGetPayload<{}>;
export type InsertSubscriberGroup = Prisma.subscriber_groupsUncheckedCreateInput;

export type SubscriberGroupMembership = Prisma.subscriber_group_membershipsGetPayload<{}>;
export type InsertSubscriberGroupMembership = Prisma.subscriber_group_membershipsUncheckedCreateInput;

// ============================================================================
// Social Media Ad Types
// ============================================================================

export type MetaSettings = Prisma.meta_settingsGetPayload<{}>;
export type InsertMetaSettings = Prisma.meta_settingsUncheckedCreateInput;

export type TikTokSettings = Prisma.tiktok_settingsGetPayload<{}>;
export type InsertTikTokSettings = Prisma.tiktok_settingsUncheckedCreateInput;

export type XSettings = Prisma.x_settingsGetPayload<{}>;
export type InsertXSettings = Prisma.x_settingsUncheckedCreateInput;

// ============================================================================
// NFT Types
// ============================================================================

export type NftMint = Prisma.nft_mintsGetPayload<{}>;
export type InsertNftMint = Prisma.nft_mintsUncheckedCreateInput;

// ============================================================================
// Analytics Types
// ============================================================================

export type AnalyticsEvent = Prisma.analytics_eventsGetPayload<{}>;
export type InsertAnalyticsEvent = Prisma.analytics_eventsUncheckedCreateInput;

export type DailyAnalytics = Prisma.daily_analyticsGetPayload<{}>;
export type InsertDailyAnalytics = Prisma.daily_analyticsUncheckedCreateInput;

export type FeatureAdoption = Prisma.feature_adoptionsGetPayload<{}>;
export type InsertFeatureAdoption = Prisma.feature_adoptionsUncheckedCreateInput;

// ============================================================================
// Meta Ads Types
// ============================================================================

export type MetaAdAccount = Prisma.meta_ad_accountsGetPayload<{}>;
export type InsertMetaAdAccount = Prisma.meta_ad_accountsUncheckedCreateInput;

export type MetaAdCampaign = Prisma.meta_ad_campaignsGetPayload<{}>;
export type InsertMetaAdCampaign = Prisma.meta_ad_campaignsUncheckedCreateInput;

export type MetaAdPayment = Prisma.meta_ad_paymentsGetPayload<{}>;
export type InsertMetaAdPayment = Prisma.meta_ad_paymentsUncheckedCreateInput;

export type MetaAdPerformance = Prisma.meta_ad_performanceGetPayload<{}>;
export type InsertMetaAdPerformance = Prisma.meta_ad_performanceUncheckedCreateInput;

export type MetaCampaignFinance = Prisma.meta_campaign_financeGetPayload<{}>;
export type InsertMetaCampaignFinance = Prisma.meta_campaign_financeUncheckedCreateInput;

export type MetaCampaignMetricsDaily = Prisma.meta_campaign_metrics_dailyGetPayload<{}>;
export type InsertMetaCampaignMetricsDaily = Prisma.meta_campaign_metrics_dailyUncheckedCreateInput;

export type MetaCampaign = Prisma.meta_campaignsGetPayload<{}>;
export type InsertMetaCampaign = Prisma.meta_campaignsUncheckedCreateInput;

// ============================================================================
// Import System Types
// ============================================================================

export type ImportJob = Prisma.import_jobsGetPayload<{}>;
export type InsertImportJob = Prisma.import_jobsUncheckedCreateInput;

export type ImportSource = Prisma.import_sourcesGetPayload<{}>;
export type InsertImportSource = Prisma.import_sourcesUncheckedCreateInput;

export type ImportJobLog = Prisma.import_job_logsGetPayload<{}>;
export type InsertImportJobLog = Prisma.import_job_logsUncheckedCreateInput;

export type ImportJobError = Prisma.import_job_errorsGetPayload<{}>;
export type InsertImportJobError = Prisma.import_job_errorsUncheckedCreateInput;

export type ProductSourceMapping = Prisma.product_source_mappingsGetPayload<{}>;
export type InsertProductSourceMapping = Prisma.product_source_mappingsUncheckedCreateInput;

// ============================================================================
// Newsletter Workflow Types
// ============================================================================

export type NewsletterWorkflow = Prisma.newsletter_workflowsGetPayload<{}>;
export type InsertNewsletterWorkflow = Prisma.newsletter_workflowsUncheckedCreateInput;

export type NewsletterJob = Prisma.newsletter_jobsGetPayload<{}>;
export type InsertNewsletterJob = Prisma.newsletter_jobsUncheckedCreateInput;

export type NewsletterConversion = Prisma.newsletter_conversionsGetPayload<{}>;
export type InsertNewsletterConversion = Prisma.newsletter_conversionsUncheckedCreateInput;

export type AutomationExecution = Prisma.automation_executionsGetPayload<{}>;
export type InsertAutomationExecution = Prisma.automation_executionsUncheckedCreateInput;

export type SubscriberEngagement = Prisma.subscriber_engagementGetPayload<{}>;
export type InsertSubscriberEngagement = Prisma.subscriber_engagementUncheckedCreateInput;

// ============================================================================
// Domain Connection Types
// ============================================================================

export type DomainConnection = Prisma.domain_connectionsGetPayload<{}>;
export type InsertDomainConnection = Prisma.domain_connectionsUncheckedCreateInput;

// ============================================================================
// Bulk Upload Types
// ============================================================================

export type BulkUploadJob = Prisma.bulk_upload_jobsGetPayload<{}>;
export type InsertBulkUploadJob = Prisma.bulk_upload_jobsUncheckedCreateInput;

export type BulkUploadItem = Prisma.bulk_upload_itemsGetPayload<{}>;
export type InsertBulkUploadItem = Prisma.bulk_upload_itemsUncheckedCreateInput;

// ============================================================================
// Request Types (Cancellation & Return)
// ============================================================================

export type CancellationRequest = Prisma.cancellation_requestsGetPayload<{}>;
export type InsertCancellationRequest = Prisma.cancellation_requestsUncheckedCreateInput;

export type ReturnRequest = Prisma.return_requestsGetPayload<{}>;
export type InsertReturnRequest = Prisma.return_requestsUncheckedCreateInput;

// ============================================================================
// Trade Quotation Types
// ============================================================================

export type TradeQuotation = Prisma.trade_quotationsGetPayload<{}>;
export type InsertTradeQuotation = Prisma.trade_quotationsUncheckedCreateInput;

export type TradeQuotationItem = Prisma.trade_quotation_itemsGetPayload<{}>;
export type InsertTradeQuotationItem = Prisma.trade_quotation_itemsUncheckedCreateInput;

export type TradeQuotationEvent = Prisma.trade_quotation_eventsGetPayload<{}>;
export type InsertTradeQuotationEvent = Prisma.trade_quotation_eventsUncheckedCreateInput;

export type TradePaymentSchedule = Prisma.trade_payment_schedulesGetPayload<{}>;
export type InsertTradePaymentSchedule = Prisma.trade_payment_schedulesUncheckedCreateInput;

// ============================================================================
// Shipping Label Types
// ============================================================================

export type ShippingLabel = Prisma.shipping_labelsGetPayload<{}>;
export type InsertShippingLabel = Prisma.shipping_labelsUncheckedCreateInput;

export type ShippingLabelRefund = Prisma.shipping_label_refundsGetPayload<{}>;
export type InsertShippingLabelRefund = Prisma.shipping_label_refundsUncheckedCreateInput;

// ============================================================================
// Credit & Ledger Types
// ============================================================================

export type SellerCreditLedger = Prisma.seller_credit_ledgersGetPayload<{}>;
export type InsertSellerCreditLedger = Prisma.seller_credit_ledgersUncheckedCreateInput;

// ============================================================================
// Background Job Types
// ============================================================================

export type BackgroundJobRun = Prisma.background_job_runsGetPayload<{}>;
export type InsertBackgroundJobRun = Prisma.background_job_runsUncheckedCreateInput;

// ============================================================================
// Session Types
// ============================================================================

export type Session = Prisma.sessionsGetPayload<{}>;
export type InsertSession = Prisma.sessionsUncheckedCreateInput;

export type CartItem = Prisma.cart_itemsGetPayload<{}>;
export type InsertCartItem = Prisma.cart_itemsUncheckedCreateInput;

// ============================================================================
// Trustpilot Types
// ============================================================================

export type TrustpilotReview = Prisma.trustpilot_reviewsGetPayload<{}>;
export type InsertTrustpilotReview = Prisma.trustpilot_reviewsUncheckedCreateInput;

export type TrustpilotToken = Prisma.trustpilot_tokensGetPayload<{}>;
export type InsertTrustpilotToken = Prisma.trustpilot_tokensUncheckedCreateInput;

/**
 * Export all Prisma-generated types for advanced usage
 */
export type { Prisma };
