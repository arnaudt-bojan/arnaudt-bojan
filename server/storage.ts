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

// ============================================================================
// Phase 2 Migration Complete: 100% Prisma ORM
// ============================================================================
// All Drizzle operations have been migrated to Prisma using $transaction
// and $queryRaw for row-level locking semantics.
//
// Migrated methods:
// 1. saveCart() - cart persistence with FOR UPDATE locking
// 2. atomicReserveStock() - stock reservation with FOR UPDATE locking
// 3. updateReservationQuantityAtomic() - reservation updates with FOR UPDATE locking

import { prisma } from './prisma';
import { logger } from './logger';
import type { CartLockRow, ProductLockRow, StockReservationLockRow } from './utils/prisma-locking';

// ============================================================================
// Prisma Field Mapping Utilities (snake_case → camelCase)
// ============================================================================
// These mappers convert Prisma's snake_case field names to camelCase for
// compatibility with the existing API contract in routes.ts

function mapUserFromPrisma(u: any): any {
  if (!u) return u;
  return {
    ...u,
    firstName: u.first_name,
    lastName: u.last_name,
    profileImageUrl: u.profile_image_url,
    sellerId: u.seller_id,
    invitedBy: u.invited_by,
    storeBanner: u.store_banner,
    storeLogo: u.store_logo,
    paymentProvider: u.payment_provider,
    stripeConnectedAccountId: u.stripe_connected_account_id,
    stripeChargesEnabled: u.stripe_charges_enabled,
    stripePayoutsEnabled: u.stripe_payouts_enabled,
    stripeDetailsSubmitted: u.stripe_details_submitted,
    listingCurrency: u.listing_currency,
    stripeCustomerId: u.stripe_customer_id,
    stripeSubscriptionId: u.stripe_subscription_id,
    subscriptionStatus: u.subscription_status,
    subscriptionPlan: u.subscription_plan,
    trialEndsAt: u.trial_ends_at,
    paypalMerchantId: u.paypal_merchant_id,
    paypalPartnerId: u.paypal_partner_id,
    customDomain: u.custom_domain,
    customDomainVerified: u.custom_domain_verified,
    instagramUserId: u.instagram_user_id,
    instagramUsername: u.instagram_username,
    instagramAccessToken: u.instagram_access_token,
    shippingPrice: u.shipping_price,
    storeActive: u.store_active,
    shippingPolicy: u.shipping_policy,
    returnsPolicy: u.returns_policy,
    contactEmail: u.contact_email,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    taxEnabled: u.tax_enabled,
    taxNexusCountries: u.tax_nexus_countries,
    taxNexusStates: u.tax_nexus_states,
    taxProductCode: u.tax_product_code,
    isPlatformAdmin: u.is_platform_admin,
    aboutStory: u.about_story,
    socialInstagram: u.social_instagram,
    socialTwitter: u.social_twitter,
    socialTiktok: u.social_tiktok,
    socialSnapchat: u.social_snapchat,
    socialWebsite: u.social_website,
    welcomeEmailSent: u.welcome_email_sent,
    userType: u.user_type,
  };
}

// Map product from camelCase (app) to snake_case (Prisma)
function mapProductToPrisma(p: any): any {
  if (!p) return p;
  
  const mapped: any = {};
  
  // Copy all fields, handling both camelCase and snake_case
  for (const key in p) {
    if (p[key] !== undefined) {
      mapped[key] = p[key];
    }
  }
  
  // Map camelCase to snake_case (overwrite if present)
  if (p.sellerId !== undefined) mapped.seller_id = p.sellerId;
  if (p.categoryLevel1Id !== undefined) mapped.category_level_1_id = p.categoryLevel1Id;
  if (p.categoryLevel2Id !== undefined) mapped.category_level_2_id = p.categoryLevel2Id;
  if (p.categoryLevel3Id !== undefined) mapped.category_level_3_id = p.categoryLevel3Id;
  if (p.productType !== undefined) mapped.product_type = p.productType;
  if (p.depositAmount !== undefined) mapped.deposit_amount = p.depositAmount;
  if (p.requiresDeposit !== undefined) mapped.requires_deposit = p.requiresDeposit;
  if (p.madeToOrderDays !== undefined) mapped.made_to_order_days = p.madeToOrderDays;
  if (p.preOrderDate !== undefined) mapped.pre_order_date = p.preOrderDate;
  if (p.discountPercentage !== undefined) mapped.discount_percentage = p.discountPercentage;
  if (p.promotionActive !== undefined) mapped.promotion_active = p.promotionActive;
  if (p.promotionEndDate !== undefined) mapped.promotion_end_date = p.promotionEndDate;
  if (p.shippingType !== undefined) mapped.shipping_type = p.shippingType;
  if (p.flatShippingRate !== undefined) mapped.flat_shipping_rate = p.flatShippingRate;
  if (p.shippingMatrixId !== undefined) mapped.shipping_matrix_id = p.shippingMatrixId;
  if (p.shippoWeight !== undefined) mapped.shippo_weight = p.shippoWeight;
  if (p.shippoLength !== undefined) mapped.shippo_length = p.shippoLength;
  if (p.shippoWidth !== undefined) mapped.shippo_width = p.shippoWidth;
  if (p.shippoHeight !== undefined) mapped.shippo_height = p.shippoHeight;
  if (p.shippoTemplate !== undefined) mapped.shippo_template = p.shippoTemplate;
  if (p.hasColors !== undefined) mapped.has_colors = p.hasColors;
  if (p.createdAt !== undefined) mapped.created_at = p.createdAt;
  if (p.updatedAt !== undefined) mapped.updated_at = p.updatedAt;
  
  // Remove camelCase duplicates
  delete mapped.sellerId;
  delete mapped.categoryLevel1Id;
  delete mapped.categoryLevel2Id;
  delete mapped.categoryLevel3Id;
  delete mapped.productType;
  delete mapped.depositAmount;
  delete mapped.requiresDeposit;
  delete mapped.madeToOrderDays;
  delete mapped.preOrderDate;
  delete mapped.discountPercentage;
  delete mapped.promotionActive;
  delete mapped.promotionEndDate;
  delete mapped.shippingType;
  delete mapped.flatShippingRate;
  delete mapped.shippingMatrixId;
  delete mapped.shippoWeight;
  delete mapped.shippoLength;
  delete mapped.shippoWidth;
  delete mapped.shippoHeight;
  delete mapped.shippoTemplate;
  delete mapped.hasColors;
  delete mapped.createdAt;
  delete mapped.updatedAt;
  
  return mapped;
}

function mapProductFromPrisma(p: any): Product {
  if (!p) return p;
  return {
    ...p,
    sellerId: p.seller_id,
    categoryLevel1Id: p.category_level_1_id,
    categoryLevel2Id: p.category_level_2_id,
    categoryLevel3Id: p.category_level_3_id,
    productType: p.product_type,
    depositAmount: p.deposit_amount,
    requiresDeposit: p.requires_deposit,
    madeToOrderDays: p.made_to_order_days,
    preOrderDate: p.pre_order_date,
    discountPercentage: p.discount_percentage,
    promotionActive: p.promotion_active,
    promotionEndDate: p.promotion_end_date,
    shippingType: p.shipping_type,
    flatShippingRate: p.flat_shipping_rate,
    shippingMatrixId: p.shipping_matrix_id,
    shippoWeight: p.shippo_weight,
    shippoLength: p.shippo_length,
    shippoWidth: p.shippo_width,
    shippoHeight: p.shippo_height,
    shippoTemplate: p.shippo_template,
    hasColors: p.has_colors,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function mapOrderFromPrisma(o: any): any {
  if (!o) return o;
  return {
    ...o,
    userId: o.user_id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    customerAddress: o.customer_address,
    amountPaid: o.amount_paid,
    remainingBalance: o.remaining_balance,
    paymentType: o.payment_type,
    paymentStatus: o.payment_status,
    stripePaymentIntentId: o.stripe_payment_intent_id,
    stripeBalancePaymentIntentId: o.stripe_balance_payment_intent_id,
    fulfillmentStatus: o.fulfillment_status,
    trackingNumber: o.tracking_number,
    trackingLink: o.tracking_link,
    createdAt: o.created_at,
    taxAmount: o.tax_amount,
    taxCalculationId: o.tax_calculation_id,
    taxBreakdown: o.tax_breakdown,
    subtotalBeforeTax: o.subtotal_before_tax,
    shippingCost: o.shipping_cost,
    shippingMethod: o.shipping_method,
    shippingZone: o.shipping_zone,
    shippingCarrier: o.shipping_carrier,
    shippingEstimatedDays: o.shipping_estimated_days,
    shippingStreet: o.shipping_street,
    shippingCity: o.shipping_city,
    shippingState: o.shipping_state,
    shippingPostalCode: o.shipping_postal_code,
    shippingCountry: o.shipping_country,
    depositAmountCents: o.deposit_amount_cents,
    balanceDueCents: o.balance_due_cents,
    balancePaidAt: o.balance_paid_at,
    shippingLocked: o.shipping_locked,
    pricingVersion: o.pricing_version,
    sellerId: o.seller_id,
    billingName: o.billing_name,
    billingEmail: o.billing_email,
    billingPhone: o.billing_phone,
    billingStreet: o.billing_street,
    billingCity: o.billing_city,
    billingState: o.billing_state,
    billingPostalCode: o.billing_postal_code,
    billingCountry: o.billing_country,
    shippingLabelId: o.shipping_label_id,
  };
}

function mapOrderItemFromPrisma(i: any): any {
  if (!i) return i;
  return {
    ...i,
    orderId: i.order_id,
    productId: i.product_id,
    productName: i.product_name,
    productImage: i.product_image,
    unitPrice: i.unit_price,
    preOrderDate: i.pre_order_date,
    madeToOrderLeadTime: i.made_to_order_lead_time,
    trackingNumber: i.tracking_number,
    trackingCarrier: i.tracking_carrier,
    trackingUrl: i.tracking_url,
    fulfillmentStatus: i.fulfillment_status,
    refundedQuantity: i.refunded_quantity,
    refundedAmount: i.refunded_amount,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  };
}

function mapAuthTokenFromPrisma(t: any): AuthToken {
  if (!t) return t;
  return {
    ...t,
    tokenType: t.token_type,
    expiresAt: t.expires_at,
    sellerContext: t.seller_context,
    createdAt: t.created_at,
    returnUrl: t.return_url,
    loginContext: t.login_context,
  };
}

function mapNotificationFromPrisma(n: any): any {
  if (!n) return n;
  return {
    ...n,
    userId: n.user_id,
    notificationType: n.notification_type,
    relatedEntityType: n.related_entity_type,
    relatedEntityId: n.related_entity_id,
    isRead: n.is_read,
    createdAt: n.created_at,
  };
}

function mapCartFromPrisma(c: any): any {
  if (!c) return c;
  return {
    ...c,
    sellerId: c.seller_id,
    buyerId: c.buyer_id,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function mapCartSessionFromPrisma(cs: any): any {
  if (!cs) return cs;
  return {
    ...cs,
    sessionId: cs.session_id,
    cartId: cs.cart_id,
    lastSeen: cs.last_seen,
  };
}

function mapStockReservationFromPrisma(sr: any): any {
  if (!sr) return sr;
  return {
    ...sr,
    productId: sr.product_id,
    variantId: sr.variant_id,
    orderId: sr.order_id,
    sessionId: sr.session_id,
    userId: sr.user_id,
    expiresAt: sr.expires_at,
    createdAt: sr.created_at,
    committedAt: sr.committed_at,
    releasedAt: sr.released_at,
  };
}

function mapInvitationFromPrisma(inv: any): any {
  if (!inv) return inv;
  return {
    ...inv,
    invitedBy: inv.invited_by,
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
  };
}

function mapTeamInvitationFromPrisma(ti: any): any {
  if (!ti) return ti;
  return {
    ...ti,
    storeOwnerId: ti.store_owner_id,
    expiresAt: ti.expires_at,
    createdAt: ti.created_at,
    acceptedAt: ti.accepted_at,
  };
}

function mapStoreInvitationFromPrisma(si: any): any {
  if (!si) return si;
  return {
    ...si,
    storeOwnerId: si.store_owner_id,
    inviteeEmail: si.invitee_email,
    invitedByUserId: si.invited_by_user_id,
    expiresAt: si.expires_at,
    acceptedAt: si.accepted_at,
    createdAt: si.created_at,
  };
}

function mapWholesaleInvitationFromPrisma(wi: any): any {
  if (!wi) return wi;
  return {
    ...wi,
    sellerId: wi.seller_id,
    buyerId: wi.buyer_id,
    buyerEmail: wi.buyer_email,
    expiresAt: wi.expires_at,
    createdAt: wi.created_at,
    acceptedAt: wi.accepted_at,
  };
}

function mapUserStoreMembershipFromPrisma(usm: any): any {
  if (!usm) return usm;
  return {
    ...usm,
    userId: usm.user_id,
    storeOwnerId: usm.store_owner_id,
    createdAt: usm.created_at,
    updatedAt: usm.updated_at,
  };
}

function mapWholesaleAccessGrantFromPrisma(wag: any): any {
  if (!wag) return wag;
  return {
    ...wag,
    buyerId: wag.buyer_id,
    sellerId: wag.seller_id,
    createdAt: wag.created_at,
    updatedAt: wag.updated_at,
  };
}

function mapWholesaleProductFromPrisma(wp: any): any {
  if (!wp) return wp;
  return {
    ...wp,
    sellerId: wp.seller_id,
    categoryLevel1Id: wp.category_level_1_id,
    categoryLevel2Id: wp.category_level_2_id,
    categoryLevel3Id: wp.category_level_3_id,
    wholesalePrice: wp.wholesale_price,
    msrp: wp.msrp,
    productType: wp.product_type,
    madeToOrderDays: wp.made_to_order_days,
    preOrderDate: wp.pre_order_date,
    createdAt: wp.created_at,
    updatedAt: wp.updated_at,
  };
}

function mapWholesaleOrderFromPrisma(wo: any): any {
  if (!wo) return wo;
  return {
    ...wo,
    orderNumber: wo.order_number,
    sellerId: wo.seller_id,
    buyerId: wo.buyer_id,
    buyerEmail: wo.buyer_email,
    totalAmount: wo.total_amount,
    depositAmount: wo.deposit_amount,
    balanceAmount: wo.balance_amount,
    depositPaid: wo.deposit_paid,
    balancePaid: wo.balance_paid,
    taxAmount: wo.tax_amount,
    shippingCost: wo.shipping_cost,
    createdAt: wo.created_at,
    updatedAt: wo.updated_at,
    paymentTerms: wo.payment_terms,
    deliveryTerms: wo.delivery_terms,
    estimatedDeliveryDate: wo.estimated_delivery_date,
    poNumber: wo.po_number,
    vatNumber: wo.vat_number,
  };
}

function mapWholesaleOrderItemFromPrisma(woi: any): any {
  if (!woi) return woi;
  return {
    ...woi,
    orderId: woi.order_id,
    productId: woi.product_id,
    productName: woi.product_name,
    unitPrice: woi.unit_price,
    lineTotal: woi.line_total,
    createdAt: woi.created_at,
  };
}

function mapShippingMatrixFromPrisma(sm: any): any {
  if (!sm) return sm;
  return {
    ...sm,
    sellerId: sm.seller_id,
    createdAt: sm.created_at,
    updatedAt: sm.updated_at,
  };
}

function mapShippingZoneFromPrisma(sz: any): any {
  if (!sz) return sz;
  return {
    ...sz,
    matrixId: sz.matrix_id,
    zoneType: sz.zone_type,
    zoneName: sz.zone_name,
    zoneCode: sz.zone_code,
    estimatedDays: sz.estimated_days,
    zoneIdentifier: sz.zone_identifier,
  };
}

function mapRefundFromPrisma(r: any): any {
  if (!r) return r;
  return {
    ...r,
    orderId: r.order_id,
    totalAmount: r.total_amount,
    stripeRefundId: r.stripe_refund_id,
    processedBy: r.processed_by,
    createdAt: r.created_at,
    wholesaleOrderId: r.wholesale_order_id,
    wholesalePaymentId: r.wholesale_payment_id,
  };
}

function mapRefundLineItemFromPrisma(rli: any): any {
  if (!rli) return rli;
  return {
    ...rli,
    refundId: rli.refund_id,
    orderItemId: rli.order_item_id,
    createdAt: rli.created_at,
  };
}

function mapInvoiceFromPrisma(inv: any): any {
  if (!inv) return inv;
  return {
    ...inv,
    orderId: inv.order_id,
    sellerId: inv.seller_id,
    invoiceNumber: inv.invoice_number,
    documentUrl: inv.document_url,
    documentType: inv.document_type,
    orderType: inv.order_type,
    totalAmount: inv.total_amount,
    taxAmount: inv.tax_amount,
    poNumber: inv.po_number,
    vatNumber: inv.vat_number,
    paymentTerms: inv.payment_terms,
    generatedBy: inv.generated_by,
    generationTrigger: inv.generation_trigger,
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
  };
}

function mapPackingSlipFromPrisma(ps: any): any {
  if (!ps) return ps;
  return {
    ...ps,
    orderId: ps.order_id,
    sellerId: ps.seller_id,
    packingSlipNumber: ps.packing_slip_number,
    documentUrl: ps.document_url,
    documentType: ps.document_type,
    warehouseNotes: ps.warehouse_notes,
    giftMessage: ps.gift_message,
    includesPricing: ps.includes_pricing,
    generatedBy: ps.generated_by,
    generationTrigger: ps.generation_trigger,
    createdAt: ps.created_at,
    updatedAt: ps.updated_at,
  };
}

function mapOrderEventFromPrisma(oe: any): any {
  if (!oe) return oe;
  return {
    ...oe,
    orderId: oe.order_id,
    eventType: oe.event_type,
    createdAt: oe.created_at,
  };
}

function mapOrderBalancePaymentFromPrisma(obp: any): any {
  if (!obp) return obp;
  return {
    ...obp,
    orderId: obp.order_id,
    amountCents: obp.amount_cents,
    paymentIntentId: obp.payment_intent_id,
    createdAt: obp.created_at,
    paidAt: obp.paid_at,
  };
}

function mapBalanceRequestFromPrisma(br: any): any {
  if (!br) return br;
  return {
    ...br,
    orderId: br.order_id,
    createdBy: br.created_by,
    sessionTokenHash: br.session_token_hash,
    expiresAt: br.expires_at,
    pricingSnapshot: br.pricing_snapshot,
    shippingSnapshot: br.shipping_snapshot,
    paymentIntentId: br.payment_intent_id,
    balanceDueCents: br.balance_due_cents,
    emailSentAt: br.email_sent_at,
    createdAt: br.created_at,
    updatedAt: br.updated_at,
  };
}

function mapOrderAddressChangeFromPrisma(oac: any): any {
  if (!oac) return oac;
  return {
    ...oac,
    orderId: oac.order_id,
    changedBy: oac.changed_by,
    oldAddress: oac.old_address,
    newAddress: oac.new_address,
    createdAt: oac.created_at,
  };
}

function mapSavedAddressFromPrisma(sa: any): any {
  if (!sa) return sa;
  return {
    ...sa,
    userId: sa.user_id,
    fullName: sa.full_name,
    addressLine1: sa.address_line_1,
    addressLine2: sa.address_line_2,
    postalCode: sa.postal_code,
    isDefault: sa.is_default,
    createdAt: sa.created_at,
    updatedAt: sa.updated_at,
  };
}

function mapSavedPaymentMethodFromPrisma(spm: any): any {
  if (!spm) return spm;
  return {
    ...spm,
    userId: spm.user_id,
    stripePaymentMethodId: spm.stripe_payment_method_id,
    cardBrand: spm.card_brand,
    cardLast4: spm.card_last4,
    cardExpMonth: spm.card_exp_month,
    cardExpYear: spm.card_exp_year,
    isDefault: spm.is_default,
    createdAt: spm.created_at,
    updatedAt: spm.updated_at,
  };
}

function mapPaymentIntentFromPrisma(pi: any): any {
  if (!pi) return pi;
  return {
    ...pi,
    providerName: pi.provider_name,
    providerIntentId: pi.provider_intent_id,
    clientSecret: pi.client_secret,
    idempotencyKey: pi.idempotency_key,
    createdAt: pi.created_at,
    updatedAt: pi.updated_at,
  };
}

function mapNewsletterFromPrisma(n: any): any {
  if (!n) return n;
  return {
    ...n,
    userId: n.user_id,
    scheduledFor: n.scheduled_for,
    sentAt: n.sent_at,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

function mapNewsletterTemplateFromPrisma(nt: any): any {
  if (!nt) return nt;
  return {
    ...nt,
    userId: nt.user_id,
    createdAt: nt.created_at,
    updatedAt: nt.updated_at,
  };
}

function mapNewsletterAnalyticsFromPrisma(na: any): any {
  if (!na) return na;
  return {
    ...na,
    newsletterId: na.newsletter_id,
    totalSent: na.total_sent,
    totalDelivered: na.total_delivered,
    totalOpened: na.total_opened,
    totalClicked: na.total_clicked,
    totalBounced: na.total_bounced,
    totalUnsubscribed: na.total_unsubscribed,
    openRate: na.open_rate,
    clickRate: na.click_rate,
    bounceRate: na.bounce_rate,
    unsubscribeRate: na.unsubscribe_rate,
    createdAt: na.created_at,
    updatedAt: na.updated_at,
  };
}

function mapSubscriberFromPrisma(s: any): any {
  if (!s) return s;
  return {
    ...s,
    userId: s.user_id,
    createdAt: s.created_at,
  };
}

function mapSubscriberGroupFromPrisma(sg: any): any {
  if (!sg) return sg;
  return {
    ...sg,
    userId: sg.user_id,
    createdAt: sg.created_at,
  };
}

function mapSubscriberGroupMembershipFromPrisma(sgm: any): any {
  if (!sgm) return sgm;
  return {
    ...sgm,
    subscriberId: sgm.subscriber_id,
    groupId: sgm.group_id,
    createdAt: sgm.created_at,
  };
}

function mapNewsletterSegmentFromPrisma(ns: any): any {
  if (!ns) return ns;
  return {
    ...ns,
    userId: ns.user_id,
    subscriberCount: ns.subscriber_count,
    lastEvaluatedAt: ns.last_evaluated_at,
    createdAt: ns.created_at,
    updatedAt: ns.updated_at,
  };
}

function mapNewsletterScheduleFromPrisma(nsch: any): any {
  if (!nsch) return nsch;
  return {
    ...nsch,
    campaignId: nsch.campaign_id,
    scheduledAt: nsch.scheduled_at,
    lockedAt: nsch.locked_at,
    lockedBy: nsch.locked_by,
    sentAt: nsch.sent_at,
    createdAt: nsch.created_at,
  };
}

function mapNewsletterABTestFromPrisma(nabt: any): any {
  if (!nabt) return nabt;
  return {
    ...nabt,
    campaignId: nabt.campaign_id,
    variantASubject: nabt.variant_a_subject,
    variantAContent: nabt.variant_a_content,
    variantBSubject: nabt.variant_b_subject,
    variantBContent: nabt.variant_b_content,
    splitPercentage: nabt.split_percentage,
    winnerMetric: nabt.winner_metric,
    winnerId: nabt.winner_id,
    variantASent: nabt.variant_a_sent,
    variantAOpened: nabt.variant_a_opened,
    variantAClicked: nabt.variant_a_clicked,
    variantBSent: nabt.variant_b_sent,
    variantBOpened: nabt.variant_b_opened,
    variantBClicked: nabt.variant_b_clicked,
  };
}

function mapNewsletterEventFromPrisma(ne: any): any {
  if (!ne) return ne;
  return {
    ...ne,
    newsletterId: ne.newsletter_id,
    recipientEmail: ne.recipient_email,
    eventType: ne.event_type,
    eventData: ne.event_data,
    webhookEventId: ne.webhook_event_id,
    createdAt: ne.created_at,
  };
}

function mapUserStoreRoleFromPrisma(usr: any): any {
  if (!usr) return usr;
  return {
    ...usr,
    userId: usr.user_id,
    storeOwnerId: usr.store_owner_id,
    createdAt: usr.created_at,
  };
}

function mapCategoryFromPrisma(c: any): any {
  if (!c) return c;
  const { parent_id, created_at, updated_at, ...rest } = c;
  return {
    ...rest,
    parentId: parent_id,
    createdAt: created_at,
    updatedAt: updated_at,
  };
}

function mapOrderWorkflowFromPrisma(ow: any): any {
  if (!ow) return ow;
  return {
    ...ow,
    sellerId: ow.seller_id,
    buyerId: ow.buyer_id,
    checkoutSessionId: ow.checkout_session_id,
    paymentIntentId: ow.payment_intent_id,
    orderId: ow.order_id,
    retryCount: ow.retry_count,
    errorCode: ow.error_code,
    createdAt: ow.created_at,
    updatedAt: ow.updated_at,
  };
}

function mapOrderWorkflowEventFromPrisma(owe: any): any {
  if (!owe) return owe;
  return {
    ...owe,
    workflowId: owe.workflow_id,
    eventType: owe.event_type,
    createdAt: owe.created_at,
  };
}

function mapWholesaleCartFromPrisma(wc: any): any {
  if (!wc) return wc;
  return {
    ...wc,
    sellerId: wc.seller_id,
    buyerId: wc.buyer_id,
    createdAt: wc.created_at,
    updatedAt: wc.updated_at,
  };
}

function mapBulkUploadJobFromPrisma(buj: any): any {
  if (!buj) return buj;
  return {
    ...buj,
    sellerId: buj.seller_id,
    fileName: buj.file_name,
    totalRows: buj.total_rows,
    successCount: buj.success_count,
    errorCount: buj.error_count,
    warningCount: buj.warning_count,
    errorMessage: buj.error_message,
    processedRows: buj.processed_rows,
    createdAt: buj.created_at,
    completedAt: buj.completed_at,
  };
}

function mapBulkUploadItemFromPrisma(bui: any): any {
  if (!bui) return bui;
  return {
    ...bui,
    jobId: bui.job_id,
    rowNumber: bui.row_number,
    rowData: bui.row_data,
    validationStatus: bui.validation_status,
    validationMessages: bui.validation_messages,
    productId: bui.product_id,
    createdAt: bui.created_at,
  };
}

function mapMetaAdAccountFromPrisma(maa: any): any {
  if (!maa) return maa;
  return {
    ...maa,
    sellerId: maa.seller_id,
    metaUserId: maa.meta_user_id,
    metaAdAccountId: maa.meta_ad_account_id,
    accessToken: maa.access_token,
    tokenExpiresAt: maa.token_expires_at,
    businessName: maa.business_name,
    totalSpent: maa.total_spent,
    totalRevenue: maa.total_revenue,
    lastSyncedAt: maa.last_synced_at,
    createdAt: maa.created_at,
    updatedAt: maa.updated_at,
    isSelected: maa.is_selected,
  };
}

function mapMetaCampaignFromPrisma(mc: any): any {
  if (!mc) return mc;
  return {
    ...mc,
    sellerId: mc.seller_id,
    adAccountId: mc.ad_account_id,
    productId: mc.product_id,
    metaCampaignId: mc.meta_campaign_id,
    metaAdSetId: mc.meta_ad_set_id,
    metaAdId: mc.meta_ad_id,
    primaryText: mc.primary_text,
    callToAction: mc.call_to_action,
    dailyBudget: mc.daily_budget,
    lifetimeBudget: mc.lifetime_budget,
    startDate: mc.start_date,
    endDate: mc.end_date,
    useAdvantagePlus: mc.use_advantage_plus,
    advantagePlusConfig: mc.advantage_plus_config,
    alertEmail: mc.alert_email,
    lowBudgetThreshold: mc.low_budget_threshold,
    activatedAt: mc.activated_at,
    pausedAt: mc.paused_at,
    completedAt: mc.completed_at,
    createdAt: mc.created_at,
    updatedAt: mc.updated_at,
  };
}

function mapMetaSettingsFromPrisma(ms: any): any {
  if (!ms) return ms;
  return {
    ...ms,
    userId: ms.user_id,
    accessToken: ms.access_token,
    adAccountId: ms.ad_account_id,
    accountName: ms.account_name,
    createdAt: ms.created_at,
    updatedAt: ms.updated_at,
  };
}

function mapTikTokSettingsFromPrisma(ts: any): any {
  if (!ts) return ts;
  return {
    ...ts,
    userId: ts.user_id,
    accessToken: ts.access_token,
    refreshToken: ts.refresh_token,
    advertiserId: ts.advertiser_id,
    advertiserName: ts.advertiser_name,
    createdAt: ts.created_at,
    updatedAt: ts.updated_at,
  };
}

function mapXSettingsFromPrisma(xs: any): any {
  if (!xs) return xs;
  return {
    ...xs,
    userId: xs.user_id,
    accessToken: xs.access_token,
    accessTokenSecret: xs.access_token_secret,
    accountId: xs.account_id,
    accountName: xs.account_name,
    createdAt: xs.created_at,
    updatedAt: xs.updated_at,
  };
}

function mapDomainConnectionFromPrisma(dc: any): any {
  if (!dc) return dc;
  return {
    ...dc,
    sellerId: dc.seller_id,
    normalizedDomain: dc.normalized_domain,
    verificationToken: dc.verification_token,
    dnsInstructions: dc.dns_instructions,
    cloudflareCustomHostnameId: dc.cloudflare_custom_hostname_id,
    caddySiteId: dc.caddy_site_id,
    sslStatus: dc.ssl_status,
    sslProvider: dc.ssl_provider,
    sslRenewAt: dc.ssl_renew_at,
    sslIssuedAt: dc.ssl_issued_at,
    sslExpiresAt: dc.ssl_expires_at,
    lastCheckedAt: dc.last_checked_at,
    lastVerifiedAt: dc.last_verified_at,
    failureReason: dc.failure_reason,
    failureCode: dc.failure_code,
    retryCount: dc.retry_count,
    isPrimary: dc.is_primary,
    createdAt: dc.created_at,
    updatedAt: dc.updated_at,
  };
}

function mapTradeQuotationFromPrisma(tq: any): any {
  if (!tq) return tq;
  return {
    ...tq,
    sellerId: tq.seller_id,
    buyerEmail: tq.buyer_email,
    buyerId: tq.buyer_id,
    quotationNumber: tq.quotation_number,
    taxAmount: tq.tax_amount,
    shippingAmount: tq.shipping_amount,
    depositAmount: tq.deposit_amount,
    depositPercentage: tq.deposit_percentage,
    balanceAmount: tq.balance_amount,
    validUntil: tq.valid_until,
    createdAt: tq.created_at,
    updatedAt: tq.updated_at,
    orderId: tq.order_id,
    deliveryTerms: tq.delivery_terms,
    dataSheetUrl: tq.data_sheet_url,
    termsAndConditionsUrl: tq.terms_and_conditions_url,
  };
}

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
  // Note: Phase 2 migration completed - all cart and stock reservation operations
  // now use Prisma with $transaction and $queryRaw for row-level locking
  private initialized: boolean = false;
  
  constructor() {
    // All database operations now use Prisma client (imported from ./prisma.ts)
    // Previously used Drizzle for saveCart() and atomicReserveStock() - migrated in Phase 2
    this.initialized = true;
  }

  private async ensureInitialized() {
    // Already initialized in constructor
    return Promise.resolve();
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.findUnique({ where: { id } });
    return result ? mapUserFromPrisma(result) : undefined;
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
      const result = await prisma.users.upsert({
        where: { email: mappedData.email },
        create: mappedData,
        update: {
          ...mappedData,
          updated_at: new Date()
        }
      });
      return mapUserFromPrisma(result);
    } else if (mappedData.id) {
      // If no email but has ID, try to update or create
      const existingUser = await prisma.users.findUnique({ where: { id: mappedData.id } });
      if (existingUser) {
        const result = await prisma.users.update({
          where: { id: mappedData.id },
          data: {
            ...mappedData,
            updated_at: new Date()
          }
        });
        return mapUserFromPrisma(result);
      } else {
        const result = await prisma.users.create({
          data: mappedData
        });
        return mapUserFromPrisma(result);
      }
    } else {
      // No email or ID, just create
      const result = await prisma.users.create({
        data: mappedData
      });
      return mapUserFromPrisma(result);
    }
  }

  async getAllProducts(): Promise<Product[]> {
    const products = await prisma.products.findMany({
      orderBy: { created_at: 'desc' }
    });
    return products.map(mapProductFromPrisma);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await prisma.products.findUnique({
      where: { id }
    });
    return result ? mapProductFromPrisma(result) : undefined;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    
    const products = await prisma.products.findMany({
      where: {
        id: { in: ids }
      }
    });
    return products.map(mapProductFromPrisma);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    // Map camelCase to snake_case for Prisma
    const mappedData = mapProductToPrisma(insertProduct);
    
    const result = await prisma.products.create({
      data: {
        ...mappedData,
        image: mappedData.image || ''
      }
    });
    return mapProductFromPrisma(result);
  }

  async getAllOrders(): Promise<Order[]> {
    await this.ensureInitialized();
    const orders = await prisma.orders.findMany({
      orderBy: { created_at: 'desc' }
    });
    return orders.map(mapOrderFromPrisma);
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    await this.ensureInitialized();
    const orders = await prisma.orders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    return orders.map(mapOrderFromPrisma);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await prisma.orders.findUnique({
      where: { id }
    });
    return result ? mapOrderFromPrisma(result) : undefined;
  }

  async getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    const result = await prisma.orders.findFirst({
      where: { stripe_payment_intent_id: paymentIntentId }
    });
    return result ? mapOrderFromPrisma(result) : undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    await this.ensureInitialized();
    const result = await prisma.orders.create({
      data: insertOrder
    });
    return mapOrderFromPrisma(result);
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.orders.update({
        where: { id },
        data: updates
      });
      return mapOrderFromPrisma(result);
    } catch (error) {
      return undefined;
    }
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      // Map camelCase to snake_case for Prisma
      const mappedUpdates = mapProductToPrisma(updates);
      
      const result = await prisma.products.update({
        where: { id },
        data: mappedUpdates
      });
      return mapProductFromPrisma(result);
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
      products: products.map(mapProductFromPrisma),
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
    return result ? mapStockReservationFromPrisma(result) : undefined;
  }

  async getStockReservationsBySession(sessionId: string): Promise<StockReservation[]> {
    await this.ensureInitialized();
    const results = await prisma.stock_reservations.findMany({
      where: { session_id: sessionId }
    });
    return results.map(mapStockReservationFromPrisma);
  }

  async getStockReservationsByProduct(productId: string): Promise<StockReservation[]> {
    await this.ensureInitialized();
    const results = await prisma.stock_reservations.findMany({
      where: { product_id: productId }
    });
    return results.map(mapStockReservationFromPrisma);
  }

  async getExpiredStockReservations(now: Date): Promise<StockReservation[]> {
    await this.ensureInitialized();
    const results = await prisma.stock_reservations.findMany({
      where: {
        status: 'active',
        expires_at: { lt: now }
      }
    });
    return results.map(mapStockReservationFromPrisma);
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
    const result = await prisma.stock_reservations.create({
      data: reservation
    });
    return mapStockReservationFromPrisma(result);
  }

  async updateStockReservation(id: string, data: Partial<StockReservation>): Promise<StockReservation | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.stock_reservations.update({
        where: { id },
        data
      });
      return mapStockReservationFromPrisma(result);
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

  /**
   * ✅ PHASE 2 MIGRATION: Migrated from Drizzle to Prisma
   * 
   * Atomically reserve stock with row-level locking
   * Uses Prisma $transaction + $queryRaw for FOR UPDATE semantics
   */
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
    return await prisma.$transaction(async (tx) => {
      // Step 1: Lock the product row with SELECT ... FOR UPDATE
      const productRows = await tx.$queryRaw<ProductLockRow[]>`
        SELECT * FROM products WHERE id = ${productId} FOR UPDATE LIMIT 1
      `;
      
      if (!productRows || productRows.length === 0) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      const prod = productRows[0];
      
      // Step 2: Calculate current stock
      let currentStock = 0;
      const variantId = options?.variantId;
      
      if (variantId && prod.variants) {
        const variants = Array.isArray(prod.variants) ? prod.variants : [];
        const hasColors = prod.has_colors === 1;
        
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
      let activeReservations: StockReservationLockRow[];
      
      if (variantId) {
        activeReservations = await tx.$queryRaw<StockReservationLockRow[]>`
          SELECT * FROM stock_reservations
          WHERE product_id = ${productId}
            AND variant_id = ${variantId}
            AND status = 'active'
          FOR UPDATE
        `;
      } else {
        activeReservations = await tx.$queryRaw<StockReservationLockRow[]>`
          SELECT * FROM stock_reservations
          WHERE product_id = ${productId}
            AND status = 'active'
          FOR UPDATE
        `;
      }
      
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

      const reservation = await tx.stock_reservations.create({
        data: {
          product_id: productId,
          variant_id: variantId || null,
          quantity,
          session_id: sessionId,
          user_id: options?.userId || null,
          status: 'active',
          expires_at: expiresAt,
          order_id: null,
          committed_at: null,
          released_at: null,
        }
      });
      
      return {
        success: true,
        reservation: mapStockReservationFromPrisma(reservation),
        availability,
      };
    });
  }

  /**
   * ✅ PHASE 2 MIGRATION: Migrated from Drizzle to Prisma
   * 
   * Atomically update reservation quantity with row-level locking
   * Uses Prisma $transaction + $queryRaw for FOR UPDATE semantics
   */
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
    return await prisma.$transaction(async (tx) => {
      // Step 1: Lock the reservation row with SELECT ... FOR UPDATE
      const currentReservationRows = await tx.$queryRaw<StockReservationLockRow[]>`
        SELECT * FROM stock_reservations WHERE id = ${reservationId} FOR UPDATE LIMIT 1
      `;
      
      if (!currentReservationRows || currentReservationRows.length === 0) {
        return {
          success: false,
          error: 'Reservation not found',
        };
      }

      const reservation = currentReservationRows[0];

      if (reservation.status !== 'active') {
        return {
          success: false,
          error: `Cannot update ${reservation.status} reservation`,
        };
      }

      const productId = reservation.product_id;
      const variantId = reservation.variant_id;

      // Step 2: Lock product row and get FRESH stock (prevents stale data)
      const productRows = await tx.$queryRaw<ProductLockRow[]>`
        SELECT * FROM products WHERE id = ${productId} FOR UPDATE LIMIT 1
      `;
      
      if (!productRows || productRows.length === 0) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      const prod = productRows[0];

      // Step 3: Calculate CURRENT stock (fresh, locked data)
      let currentStock = 0;
      
      if (variantId && prod.variants) {
        const variants = Array.isArray(prod.variants) ? prod.variants : [];
        const hasColors = prod.has_colors === 1;
        
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
      let activeReservations: StockReservationLockRow[];
      
      if (variantId) {
        activeReservations = await tx.$queryRaw<StockReservationLockRow[]>`
          SELECT * FROM stock_reservations
          WHERE product_id = ${productId}
            AND variant_id = ${variantId}
            AND status = 'active'
          FOR UPDATE
        `;
      } else {
        activeReservations = await tx.$queryRaw<StockReservationLockRow[]>`
          SELECT * FROM stock_reservations
          WHERE product_id = ${productId}
            AND status = 'active'
          FOR UPDATE
        `;
      }
      
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
      const updatedReservation = await tx.stock_reservations.update({
        where: { id: reservationId },
        data: { quantity: newQuantity }
      });
      
      return {
        success: true,
        reservation: mapStockReservationFromPrisma(updatedReservation),
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
          tracking_number: trackingNumber,
          tracking_link: trackingLink
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
        data: { stripe_balance_payment_intent_id: paymentIntentId }
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
      where: { order_id: orderId }
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
    const results = await prisma.order_items.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'asc' }
    });
    return results.map(mapOrderItemFromPrisma);
  }

  async getOrderItemById(itemId: string): Promise<OrderItem | undefined> {
    await this.ensureInitialized();
    const result = await prisma.order_items.findUnique({
      where: { id: itemId }
    });
    return result ? mapOrderItemFromPrisma(result) : undefined;
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    await this.ensureInitialized();
    const result = await prisma.order_items.create({
      data: item
    });
    return mapOrderItemFromPrisma(result);
  }

  async createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]> {
    await this.ensureInitialized();
    if (items.length === 0) return [];
    
    const created = await Promise.all(
      items.map(item => prisma.order_items.create({ data: item }))
    );
    return created.map(mapOrderItemFromPrisma);
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
      return mapOrderItemFromPrisma(result);
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
      return mapOrderItemFromPrisma(result);
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
      return mapOrderItemFromPrisma(result);
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
      return mapOrderItemFromPrisma(result);
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
        where: { order_id: orderId }
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
        data: { retry_count: retryCount, last_retry_at: new Date(), updated_at: new Date() }
      });
      return result;
    } catch (error) {
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.findUnique({ where: { email } });
    return result ? mapUserFromPrisma(result) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.findUnique({ where: { username } });
    return result ? mapUserFromPrisma(result) : undefined;
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.update({
      where: { id: userId },
      data: { role, updated_at: new Date() }
    });
    return mapUserFromPrisma(result);
  }

  async updateWelcomeEmailSent(userId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.update({
      where: { id: userId },
      data: { welcome_email_sent: 1, updated_at: new Date() }
    });
    return mapUserFromPrisma(result);
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    const users = await prisma.users.findMany({
      orderBy: { created_at: 'desc' }
    });
    return users.map(mapUserFromPrisma);
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const result = await prisma.users.findFirst({ where: { stripe_customer_id: stripeCustomerId } });
    return result ? mapUserFromPrisma(result) : undefined;
  }

  async getTeamMembersBySellerId(sellerId: string): Promise<User[]> {
    await this.ensureInitialized();
    const users = await prisma.users.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
    return users.map(mapUserFromPrisma);
  }

  async deleteTeamMember(userId: string, sellerId: string): Promise<boolean> {
    await this.ensureInitialized();
    // Only delete if the user belongs to this seller
    try {
      await prisma.users.delete({
        where: {
          id: userId,
          seller_id: sellerId
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
        user_id: userId,
        store_owner_id: storeOwnerId
      }
    });
    return result ? mapUserStoreRoleFromPrisma(result) : undefined;
  }

  async setUserStoreRole(userId: string, storeOwnerId: string, role: "buyer" | "seller" | "owner"): Promise<UserStoreRole> {
    await this.ensureInitialized();
    // Upsert: update if exists, insert if not
    const existing = await this.getUserStoreRole(userId, storeOwnerId);
    if (existing) {
      const result = await prisma.user_store_roles.update({
        where: { id: existing.id },
        data: { role }
      });
      return mapUserStoreRoleFromPrisma(result);
    } else {
      const result = await prisma.user_store_roles.create({
        data: { user_id: userId, store_owner_id: storeOwnerId, role }
      });
      return mapUserStoreRoleFromPrisma(result);
    }
  }

  async getUserStoreRoles(userId: string): Promise<UserStoreRole[]> {
    await this.ensureInitialized();
    const roles = await prisma.user_store_roles.findMany({
      where: { user_id: userId }
    });
    return roles.map(mapUserStoreRoleFromPrisma);
  }

  // New Auth System - User Store Memberships
  async getUserStoreMembership(userId: string, storeOwnerId: string): Promise<UserStoreMembership | undefined> {
    await this.ensureInitialized();
    const result = await prisma.user_store_memberships.findFirst({
      where: {
        user_id: userId,
        store_owner_id: storeOwnerId
      }
    });
    return result ? mapUserStoreMembershipFromPrisma(result) : undefined;
  }

  async getUserStoreMembershipsByStore(storeOwnerId: string): Promise<UserStoreMembership[]> {
    await this.ensureInitialized();
    const memberships = await prisma.user_store_memberships.findMany({
      where: { store_owner_id: storeOwnerId }
    });
    return memberships.map(mapUserStoreMembershipFromPrisma);
  }

  async getUserStoreMembershipsByUser(userId: string): Promise<UserStoreMembership[]> {
    await this.ensureInitialized();
    const memberships = await prisma.user_store_memberships.findMany({
      where: { user_id: userId }
    });
    return memberships.map(mapUserStoreMembershipFromPrisma);
  }

  async createUserStoreMembership(membership: InsertUserStoreMembership): Promise<UserStoreMembership> {
    await this.ensureInitialized();
    const result = await prisma.user_store_memberships.create({
      data: membership
    });
    return mapUserStoreMembershipFromPrisma(result);
  }

  async updateUserStoreMembership(id: string, updates: Partial<UserStoreMembership>): Promise<UserStoreMembership | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.user_store_memberships.update({
        where: { id },
        data: updates
      });
      return mapUserStoreMembershipFromPrisma(result);
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
    return membership ? mapUserStoreMembershipFromPrisma(membership) : undefined;
  }

  async getStoreCollaborators(storeOwnerId: string): Promise<UserStoreMembership[]> {
    await this.ensureInitialized();
    const memberships = await prisma.user_store_memberships.findMany({
      where: {
        store_owner_id: storeOwnerId,
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
        buyer_id: buyerId,
        seller_id: sellerId
      }
    });
    return result ? mapWholesaleAccessGrantFromPrisma(result) : undefined;
  }

  async getWholesaleAccessGrantsBySeller(sellerId: string): Promise<WholesaleAccessGrant[]> {
    await this.ensureInitialized();
    const results = await prisma.wholesale_access_grants.findMany({
      where: { seller_id: sellerId }
    });
    return results.map(mapWholesaleAccessGrantFromPrisma);
  }

  async getWholesaleAccessGrantsByBuyer(buyerId: string): Promise<WholesaleAccessGrant[]> {
    await this.ensureInitialized();
    const results = await prisma.wholesale_access_grants.findMany({
      where: { buyer_id: buyerId }
    });
    return results.map(mapWholesaleAccessGrantFromPrisma);
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
    if (acceptedAt) updates.accepted_at = acceptedAt;
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
      where: { seller_id: sellerId }
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
    if (acceptedAt) updates.accepted_at = acceptedAt;
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
          accepted_at: new Date() 
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
    const result = await prisma.invitations.create({
      data: insertInvitation
    });
    return mapInvitationFromPrisma(result);
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    await this.ensureInitialized();
    const result = await prisma.invitations.findFirst({
      where: { token }
    });
    return result ? mapInvitationFromPrisma(result) : undefined;
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
    return updated ? mapInvitationFromPrisma(updated) : undefined;
  }

  async getAllInvitations(): Promise<Invitation[]> {
    await this.ensureInitialized();
    const invitations = await prisma.invitations.findMany({
      orderBy: { created_at: 'desc' }
    });
    return invitations.map(mapInvitationFromPrisma);
  }

  async saveMetaSettings(userId: string, settings: Partial<MetaSettings>): Promise<MetaSettings> {
    await this.ensureInitialized();
    const result = await prisma.meta_settings.upsert({
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
    return mapMetaSettingsFromPrisma(result);
  }

  async getMetaSettings(userId: string): Promise<MetaSettings | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_settings.findUnique({
      where: { user_id: userId }
    });
    return result ? mapMetaSettingsFromPrisma(result) : undefined;
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
    const result = await prisma.tiktok_settings.upsert({
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
    return mapTikTokSettingsFromPrisma(result);
  }

  async getTikTokSettings(userId: string): Promise<TikTokSettings | undefined> {
    await this.ensureInitialized();
    const result = await prisma.tiktok_settings.findUnique({
      where: { user_id: userId }
    });
    return result ? mapTikTokSettingsFromPrisma(result) : undefined;
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
    const result = await prisma.x_settings.upsert({
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
    return mapXSettingsFromPrisma(result);
  }

  async getXSettings(userId: string): Promise<XSettings | undefined> {
    await this.ensureInitialized();
    const result = await prisma.x_settings.findUnique({
      where: { user_id: userId }
    });
    return result ? mapXSettingsFromPrisma(result) : undefined;
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
    const results = await prisma.subscriber_groups.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapSubscriberGroupFromPrisma);
  }

  async getSubscriberGroup(id: string): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscriber_groups.findUnique({
      where: { id }
    });
    return result ? mapSubscriberGroupFromPrisma(result) : undefined;
  }

  async getSubscriberGroupByName(userId: string, name: string): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscriber_groups.findFirst({
      where: {
        user_id: userId,
        name: name
      }
    });
    return result ? mapSubscriberGroupFromPrisma(result) : undefined;
  }

  async createSubscriberGroup(group: InsertSubscriberGroup): Promise<SubscriberGroup> {
    await this.ensureInitialized();
    const result = await prisma.subscriber_groups.create({
      data: group
    });
    return mapSubscriberGroupFromPrisma(result);
  }

  async updateSubscriberGroup(id: string, data: Partial<SubscriberGroup>): Promise<SubscriberGroup | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscriber_groups.update({
      where: { id },
      data: data
    });
    return mapSubscriberGroupFromPrisma(result);
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
    const results = await prisma.subscribers.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapSubscriberFromPrisma);
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
      .filter(s => s.user_id === userId)
      .map(mapSubscriberFromPrisma);
  }

  async getSubscriber(id: string): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscribers.findUnique({
      where: { id }
    });
    return result ? mapSubscriberFromPrisma(result) : undefined;
  }

  async getSubscriberByEmail(userId: string, email: string): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscribers.findFirst({
      where: {
        user_id: userId,
        email: email
      }
    });
    return result ? mapSubscriberFromPrisma(result) : undefined;
  }

  async createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    await this.ensureInitialized();
    const result = await prisma.subscribers.create({
      data: subscriber
    });
    return mapSubscriberFromPrisma(result);
  }

  async updateSubscriber(id: string, data: Partial<Subscriber>): Promise<Subscriber | undefined> {
    await this.ensureInitialized();
    const result = await prisma.subscribers.update({
      where: { id },
      data: data
    });
    return mapSubscriberFromPrisma(result);
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
    const result = await prisma.subscriber_group_memberships.create({
      data: {
        subscriber_id: subscriberId,
        group_id: groupId
      }
    });
    return mapSubscriberGroupMembershipFromPrisma(result);
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
    const results = await prisma.newsletters.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapNewsletterFromPrisma);
  }

  async getNewsletter(id: string): Promise<Newsletter | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletters.findUnique({
      where: { id }
    });
    return result ? mapNewsletterFromPrisma(result) : undefined;
  }

  async createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    await this.ensureInitialized();
    const result = await prisma.newsletters.create({
      data: newsletter
    });
    return mapNewsletterFromPrisma(result);
  }

  async updateNewsletter(id: string, data: Partial<Newsletter>): Promise<Newsletter | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletters.update({
      where: { id },
      data: data
    });
    return mapNewsletterFromPrisma(result);
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
    const results = await prisma.newsletter_templates.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' }
    });
    return results.map(mapNewsletterTemplateFromPrisma);
  }

  async getNewsletterTemplate(id: string): Promise<NewsletterTemplate | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_templates.findUnique({
      where: { id }
    });
    return result ? mapNewsletterTemplateFromPrisma(result) : undefined;
  }

  async createNewsletterTemplate(template: InsertNewsletterTemplate): Promise<NewsletterTemplate> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_templates.create({
      data: template
    });
    return mapNewsletterTemplateFromPrisma(result);
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
    return mapNewsletterTemplateFromPrisma(result);
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
    const result = await prisma.newsletter_segments.create({
      data: segment
    });
    return mapNewsletterSegmentFromPrisma(result);
  }

  async getNewsletterSegment(id: string): Promise<NewsletterSegment | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_segments.findUnique({
      where: { id }
    });
    return result ? mapNewsletterSegmentFromPrisma(result) : undefined;
  }

  async getNewsletterSegmentsByUserId(userId: string): Promise<NewsletterSegment[]> {
    await this.ensureInitialized();
    const results = await prisma.newsletter_segments.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapNewsletterSegmentFromPrisma);
  }

  // Newsletter Schedules
  async createNewsletterSchedule(schedule: InsertNewsletterSchedule): Promise<NewsletterSchedule> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_schedule.create({
      data: schedule
    });
    return mapNewsletterScheduleFromPrisma(result);
  }

  async getNewsletterSchedule(id: string): Promise<NewsletterSchedule | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_schedule.findUnique({
      where: { id }
    });
    return result ? mapNewsletterScheduleFromPrisma(result) : undefined;
  }

  async getScheduledCampaigns(): Promise<NewsletterSchedule[]> {
    await this.ensureInitialized();
    const results = await prisma.newsletter_schedule.findMany({
      where: { status: 'scheduled' },
      orderBy: { scheduled_at: 'asc' }
    });
    return results.map(mapNewsletterScheduleFromPrisma);
  }

  // Newsletter A/B Tests
  async createNewsletterABTest(test: InsertNewsletterABTest): Promise<NewsletterABTest> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_ab_tests.create({
      data: test
    });
    return mapNewsletterABTestFromPrisma(result);
  }

  async getNewsletterABTest(id: string): Promise<NewsletterABTest | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_ab_tests.findUnique({
      where: { id }
    });
    return result ? mapNewsletterABTestFromPrisma(result) : undefined;
  }

  // Newsletter Analytics
  async getNewsletterAnalytics(newsletterId: string): Promise<NewsletterAnalytics | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_analytics.findUnique({
      where: { newsletter_id: newsletterId }
    });
    return result ? mapNewsletterAnalyticsFromPrisma(result) : undefined;
  }

  async getNewsletterAnalyticsByUserId(userId: string): Promise<NewsletterAnalytics[]> {
    await this.ensureInitialized();
    const results = await prisma.newsletter_analytics.findMany({
      where: { user_id: userId },
      include: {
        newsletters: true
      },
      orderBy: { created_at: 'desc' }
    }) as any;
    return results.map(mapNewsletterAnalyticsFromPrisma);
  }

  async createNewsletterAnalytics(analytics: InsertNewsletterAnalytics): Promise<NewsletterAnalytics> {
    await this.ensureInitialized();
    const existing = await this.getNewsletterAnalytics(analytics.newsletter_id);
    if (existing) {
      const result = await prisma.newsletter_analytics.update({
        where: { newsletter_id: analytics.newsletter_id },
        data: {
          total_sent: (existing.total_sent || 0) + (analytics.total_sent || 0),
          last_updated: new Date()
        }
      });
      return mapNewsletterAnalyticsFromPrisma(result);
    }
    const result = await prisma.newsletter_analytics.create({
      data: analytics
    });
    return mapNewsletterAnalyticsFromPrisma(result);
  }

  async updateNewsletterAnalytics(newsletterId: string, data: Partial<NewsletterAnalytics>): Promise<NewsletterAnalytics | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_analytics.update({
      where: { newsletter_id: newsletterId },
      data: data
    });
    return mapNewsletterAnalyticsFromPrisma(result);
  }

  // Newsletter Events
  async createNewsletterEvent(event: InsertNewsletterEvent): Promise<NewsletterEvent | null> {
    await this.ensureInitialized();
    try {
      const result = await prisma.newsletter_events.create({
        data: event
      });
      return mapNewsletterEventFromPrisma(result);
    } catch (error: any) {
      if (error.code === 'P2002' || error.code === '23505' || error.message?.includes('unique constraint')) {
        console.log('[Storage] Duplicate newsletter event, skipping:', event.event_type, event.recipient_email);
        return null;
      }
      logger.error("[Storage] Newsletter event creation error:", error);
      throw error;
    }
  }

  async getNewsletterEventsByNewsletterId(newsletterId: string): Promise<NewsletterEvent[]> {
    await this.ensureInitialized();
    const results = await prisma.newsletter_events.findMany({
      where: { newsletter_id: newsletterId }
    });
    return results.map(mapNewsletterEventFromPrisma);
  }

  async getNewsletterEventByWebhookId(webhookEventId: string): Promise<NewsletterEvent | undefined> {
    await this.ensureInitialized();
    const result = await prisma.newsletter_events.findFirst({
      where: { webhook_event_id: webhookEventId }
    });
    return result ? mapNewsletterEventFromPrisma(result) : undefined;
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
    const results = await prisma.wholesale_products.findMany({
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapWholesaleProductFromPrisma);
  }

  async getWholesaleProductsBySellerId(sellerId: string): Promise<WholesaleProduct[]> {
    const results = await prisma.wholesale_products.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapWholesaleProductFromPrisma);
  }

  async getWholesaleProduct(id: string): Promise<WholesaleProduct | undefined> {
    const result = await prisma.wholesale_products.findUnique({
      where: { id }
    });
    return result ? mapWholesaleProductFromPrisma(result) : undefined;
  }

  async createWholesaleProduct(product: InsertWholesaleProduct): Promise<WholesaleProduct> {
    const result = await prisma.wholesale_products.create({
      data: {
        ...product,
        image: product.image || ''
      }
    });
    return mapWholesaleProductFromPrisma(result);
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
      return mapWholesaleProductFromPrisma(result);
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
    const results = await prisma.wholesale_products.findMany({
      where,
      orderBy,
      take,
      skip
    });
    
    // Get total count
    const total = await this.countWholesaleProducts(filters);
    
    return {
      products: results.map(mapWholesaleProductFromPrisma),
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
    const result = await prisma.wholesale_orders.create({
      data: order
    });
    return mapWholesaleOrderFromPrisma(result);
  }

  async getWholesaleOrder(id: string): Promise<WholesaleOrder | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_orders.findUnique({
      where: { id }
    });
    return result ? mapWholesaleOrderFromPrisma(result) : undefined;
  }

  async getWholesaleOrderByNumber(orderNumber: string): Promise<WholesaleOrder | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_orders.findFirst({
      where: { order_number: orderNumber }
    });
    return result ? mapWholesaleOrderFromPrisma(result) : undefined;
  }

  async getWholesaleOrdersBySellerId(sellerId: string): Promise<WholesaleOrder[]> {
    await this.ensureInitialized();
    const results = await prisma.wholesale_orders.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapWholesaleOrderFromPrisma);
  }

  async getWholesaleOrdersByBuyerId(buyerId: string): Promise<WholesaleOrder[]> {
    await this.ensureInitialized();
    const results = await prisma.wholesale_orders.findMany({
      where: { buyer_id: buyerId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapWholesaleOrderFromPrisma);
  }

  async getOrdersWithBalanceDueSoon(dueDate: Date): Promise<WholesaleOrder[]> {
    await this.ensureInitialized();
    const results = await prisma.wholesale_orders.findMany({
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
    return results.map(mapWholesaleOrderFromPrisma);
  }

  async updateWholesaleOrder(id: string, updates: Partial<WholesaleOrder>): Promise<WholesaleOrder | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_orders.update({
        where: { id },
        data: { ...updates, updated_at: new Date() }
      });
      return mapWholesaleOrderFromPrisma(result);
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
    const result = await prisma.wholesale_order_items.create({
      data: item
    });
    return mapWholesaleOrderItemFromPrisma(result);
  }

  async getWholesaleOrderItems(wholesaleOrderId: string): Promise<WholesaleOrderItem[]> {
    await this.ensureInitialized();
    const results = await prisma.wholesale_order_items.findMany({
      where: { wholesale_order_id: wholesaleOrderId }
    });
    return results.map(mapWholesaleOrderItemFromPrisma);
  }

  async getWholesaleOrderItem(id: string): Promise<WholesaleOrderItem | undefined> {
    await this.ensureInitialized();
    const result = await prisma.wholesale_order_items.findUnique({
      where: { id }
    });
    return result ? mapWholesaleOrderItemFromPrisma(result) : undefined;
  }

  async updateWholesaleOrderItem(id: string, updates: Partial<WholesaleOrderItem>): Promise<WholesaleOrderItem | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_order_items.update({
        where: { id },
        data: { ...updates, updated_at: new Date() }
      });
      return mapWholesaleOrderItemFromPrisma(result);
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
      return mapWholesaleOrderItemFromPrisma(result);
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
        data: { status: status as any, updated_at: new Date() }
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
      where: { order_id: orderId }
    });
    return result ?? undefined;
  }

  async updateShippingMetadata(id: string, data: Partial<InsertWholesaleShippingMetadata>): Promise<WholesaleShippingMetadata | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.wholesale_shipping_metadata.update({
        where: { id },
        data: { ...data, updated_at: new Date() }
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
    const categories = await prisma.categories.findMany({
      orderBy: [
        { level: 'asc' },
        { name: 'asc' }
      ]
    });
    return categories.map(mapCategoryFromPrisma);
  }

  async getCategoriesByLevel(level: number): Promise<Category[]> {
    await this.ensureInitialized();
    const categories = await prisma.categories.findMany({
      where: { level },
      orderBy: { name: 'asc' }
    });
    return categories.map(mapCategoryFromPrisma);
  }

  async getCategoriesByParentId(parentId: string | null): Promise<Category[]> {
    await this.ensureInitialized();
    const categories = await prisma.categories.findMany({
      where: { parent_id: parentId },
      orderBy: { name: 'asc' }
    });
    return categories.map(mapCategoryFromPrisma);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    await this.ensureInitialized();
    const result = await prisma.categories.findUnique({
      where: { id }
    });
    return result ? mapCategoryFromPrisma(result) : undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    await this.ensureInitialized();
    const data: any = { ...category };
    if ('parentId' in data) {
      data.parent_id = data.parentId;
      delete data.parentId;
    }
    const result = await prisma.categories.create({
      data
    });
    return mapCategoryFromPrisma(result);
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    await this.ensureInitialized();
    const data: any = { ...category };
    if ('parentId' in data) {
      data.parent_id = data.parentId;
      delete data.parentId;
    }
    data.updated_at = new Date();
    const result = await prisma.categories.update({
      where: { id },
      data
    });
    return result ? mapCategoryFromPrisma(result) : undefined;
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
    const result = await prisma.notifications.create({
      data: notification
    });
    return mapNotificationFromPrisma(result);
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    await this.ensureInitialized();
    const result = await prisma.notifications.findUnique({
      where: { id }
    });
    return result ? mapNotificationFromPrisma(result) : undefined;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    await this.ensureInitialized();
    const notifications = await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    return notifications.map(mapNotificationFromPrisma);
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    await this.ensureInitialized();
    const result = await prisma.notifications.update({
      where: { id },
      data: { is_read: 1 }
    });
    return mapNotificationFromPrisma(result);
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
    const result = await prisma.auth_tokens.create({
      data: {
        token: token.token,
        email: token.email,
        code: token.code,
        token_type: token.type,
        expires_at: token.expiresAt,
        used: token.used ?? 0,
        seller_context: token.sellerContext,
        return_url: token.returnUrl,
        login_context: token.loginContext
      }
    });
    return mapAuthTokenFromPrisma(result);
  }

  async getAuthTokenByToken(token: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await prisma.auth_tokens.findUnique({
      where: { token }
    });
    return result ? mapAuthTokenFromPrisma(result) : undefined;
  }

  async getAuthTokenByCode(email: string, code: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    const result = await prisma.auth_tokens.findFirst({
      where: {
        email,
        code
      }
    });
    return result ? mapAuthTokenFromPrisma(result) : undefined;
  }

  async markAuthTokenAsUsed(id: string): Promise<AuthToken | undefined> {
    await this.ensureInitialized();
    try {
      const result = await prisma.auth_tokens.update({
        where: { id },
        data: { used: 1 }
      });
      return mapAuthTokenFromPrisma(result);
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
    const matrices = await prisma.shipping_matrices.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
    return matrices.map(mapShippingMatrixFromPrisma);
  }

  async getShippingMatrix(id: string): Promise<ShippingMatrix | undefined> {
    await this.ensureInitialized();
    const result = await prisma.shipping_matrices.findUnique({
      where: { id }
    });
    return result ? mapShippingMatrixFromPrisma(result) : undefined;
  }

  async createShippingMatrix(matrix: InsertShippingMatrix): Promise<ShippingMatrix> {
    await this.ensureInitialized();
    const result = await prisma.shipping_matrices.create({
      data: matrix
    });
    return mapShippingMatrixFromPrisma(result);
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
    return mapShippingMatrixFromPrisma(result);
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
    
    return cart ? mapCartFromPrisma(cart) : undefined;
  }

  async getCartByUserId(userId: string): Promise<Cart | undefined> {
    await this.ensureInitialized();
    const result = await prisma.carts.findFirst({
      where: { buyer_id: userId },
      orderBy: { updated_at: 'desc' }
    });
    return result ? mapCartFromPrisma(result) : undefined;
  }

  /**
   * Save cart with atomic updates using row-level locking
   * 
   * ✅ PHASE 2 MIGRATION: Migrated from Drizzle to Prisma
   * 
   * Implementation:
   * - Uses Prisma $transaction for atomic operations
   * - Uses $queryRaw with FOR UPDATE for row-level locking
   * - Preserves exact behavior: guest/auth flows, session mapping
   * - Ensures rollback on failure
   */
  async saveCart(sessionId: string, sellerId: string, items: any[], userId?: string): Promise<Cart> {
    await this.ensureInitialized();
    
    return await prisma.$transaction(async (tx) => {
      let targetCartId: string;
      
      if (userId) {
        // Auth user: lock and get/create cart for (sellerId, userId)
        const existingCarts = await tx.$queryRaw<CartLockRow[]>`
          SELECT * FROM carts 
          WHERE seller_id = ${sellerId} AND buyer_id = ${userId}
          FOR UPDATE LIMIT 1
        `;
        
        if (existingCarts[0]) {
          targetCartId = existingCarts[0].id;
        } else {
          // Create new authenticated cart
          const newCart = await tx.carts.create({
            data: {
              seller_id: sellerId,
              buyer_id: userId,
              items,
              status: 'active',
            }
          });
          targetCartId = newCart.id;
        }
      } else {
        // Guest: get cart via session mapping or create new
        const sessionMap = await tx.cart_sessions.findUnique({
          where: { session_id: sessionId }
        });
        
        if (sessionMap) {
          // Lock existing cart
          const existingCarts = await tx.$queryRaw<CartLockRow[]>`
            SELECT * FROM carts WHERE id = ${sessionMap.cart_id} FOR UPDATE LIMIT 1
          `;
          targetCartId = existingCarts[0]?.id || sessionMap.cart_id;
        } else {
          // Create new guest cart
          const newCart = await tx.carts.create({
            data: {
              seller_id: sellerId,
              buyer_id: null,
              items,
              status: 'active',
            }
          });
          targetCartId = newCart.id;
        }
      }
      
      // Update cart items (only mutable fields)
      const updatedCart = await tx.carts.update({
        where: { id: targetCartId },
        data: {
          items,
          seller_id: sellerId,
          buyer_id: userId || null,
          updated_at: new Date(),
        }
      });
      
      // Upsert session mapping
      await tx.cart_sessions.upsert({
        where: { session_id: sessionId },
        update: {
          cart_id: targetCartId,
          last_seen: new Date(),
        },
        create: {
          session_id: sessionId,
          cart_id: targetCartId,
          last_seen: new Date(),
        }
      });
      
      return mapCartFromPrisma(updatedCart);
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
    return result ? mapMetaAdAccountFromPrisma(result) : undefined;
  }

  async getMetaAdAccountBySeller(sellerId: string): Promise<MetaAdAccount | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.findFirst({
      where: { seller_id: sellerId }
    });
    return result ? mapMetaAdAccountFromPrisma(result) : undefined;
  }

  async getMetaAdAccountByMetaAccountId(metaAdAccountId: string): Promise<MetaAdAccount | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.findFirst({
      where: { meta_ad_account_id: metaAdAccountId }
    });
    return result ? mapMetaAdAccountFromPrisma(result) : undefined;
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
    return mapMetaAdAccountFromPrisma(result);
  }

  async getAllMetaAdAccountsBySeller(sellerId: string): Promise<MetaAdAccount[]> {
    await this.ensureInitialized();
    const results = await prisma.meta_ad_accounts.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapMetaAdAccountFromPrisma);
  }

  async getSelectedMetaAdAccount(sellerId: string): Promise<MetaAdAccount | undefined> {
    await this.ensureInitialized();
    const result = await prisma.meta_ad_accounts.findFirst({
      where: {
        seller_id: sellerId,
        is_selected: 1
      }
    });
    return result ? mapMetaAdAccountFromPrisma(result) : undefined;
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
    return result ? mapMetaCampaignFromPrisma(result) : undefined;
  }

  async getMetaCampaignsBySeller(sellerId: string): Promise<MetaCampaign[]> {
    await this.ensureInitialized();
    const results = await prisma.meta_campaigns.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapMetaCampaignFromPrisma);
  }

  async getMetaCampaignsByAdAccount(adAccountId: string): Promise<MetaCampaign[]> {
    await this.ensureInitialized();
    const results = await prisma.meta_campaigns.findMany({
      where: { ad_account_id: adAccountId },
      orderBy: { created_at: 'desc' }
    });
    return results.map(mapMetaCampaignFromPrisma);
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
    return mapMetaCampaignFromPrisma(result);
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
    
    const where: any = { campaign_id: campaignId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }
    
    return await prisma.meta_campaign_metrics_daily.findMany({
      where,
      orderBy: { date: 'desc' }
    });
  }

  async getMetaCampaignMetricsForDate(campaignId: string, date: Date): Promise<MetaCampaignMetricsDaily | undefined> {
    await this.ensureInitialized();
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await prisma.meta_campaign_metrics_daily.findFirst({
      where: {
        campaign_id: campaignId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    return result ?? undefined;
  }

  async upsertMetaCampaignMetrics(metrics: InsertMetaCampaignMetricsDaily): Promise<string> {
    await this.ensureInitialized();
    
    const result = await prisma.meta_campaign_metrics_daily.upsert({
      where: {
        campaign_id_date: {
          campaign_id: metrics.campaignId,
          date: metrics.date
        }
      },
      create: {
        campaign_id: metrics.campaignId,
        date: metrics.date,
        impressions: metrics.impressions ?? 0,
        clicks: metrics.clicks ?? 0,
        reach: metrics.reach ?? 0,
        frequency: metrics.frequency ?? 0,
        likes: metrics.likes ?? 0,
        comments: metrics.comments ?? 0,
        shares: metrics.shares ?? 0,
        saves: metrics.saves ?? 0,
        link_clicks: metrics.linkClicks ?? 0,
        website_visits: metrics.websiteVisits ?? 0,
        purchases: metrics.purchases ?? 0,
        revenue: metrics.revenue ?? 0,
        spend: metrics.spend ?? 0,
        cpm: metrics.cpm ?? 0,
        cpc: metrics.cpc ?? 0,
        ctr: metrics.ctr ?? 0,
        roas: metrics.roas ?? 0,
      },
      update: {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        reach: metrics.reach,
        frequency: metrics.frequency,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        link_clicks: metrics.linkClicks,
        website_visits: metrics.websiteVisits,
        purchases: metrics.purchases,
        revenue: metrics.revenue,
        spend: metrics.spend,
        cpm: metrics.cpm,
        cpc: metrics.cpc,
        ctr: metrics.ctr,
        roas: metrics.roas,
      }
    });
    return result.id;
  }

  // ===== BACKGROUND JOB RUNS METHODS =====
  
  async getBackgroundJobRun(id: string): Promise<BackgroundJobRun | undefined> {
    await this.ensureInitialized();
    const result = await prisma.background_job_runs.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getBackgroundJobRunsByName(jobName: string): Promise<BackgroundJobRun[]> {
    await this.ensureInitialized();
    return await prisma.background_job_runs.findMany({
      where: { job_name: jobName },
      orderBy: { created_at: 'desc' }
    });
  }

  async getRecentBackgroundJobRuns(jobName: string, limit: number): Promise<BackgroundJobRun[]> {
    await this.ensureInitialized();
    return await prisma.background_job_runs.findMany({
      where: { job_name: jobName },
      orderBy: { created_at: 'desc' },
      take: limit
    });
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
    return await prisma.domain_connections.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  async getDomainConnectionById(id: string): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    const result = await prisma.domain_connections.findUnique({
      where: { id }
    });
    return result ?? undefined;
  }

  async getDomainConnectionByDomain(domain: string): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    // Normalize domain to lowercase for case-insensitive lookup
    const normalizedDomain = domain.toLowerCase();
    const result = await prisma.domain_connections.findUnique({
      where: { normalized_domain: normalizedDomain }
    });
    return result ?? undefined;
  }

  async getDomainConnectionsBySellerId(sellerId: string): Promise<DomainConnection[]> {
    await this.ensureInitialized();
    return await prisma.domain_connections.findMany({
      where: { seller_id: sellerId },
      orderBy: [
        { is_primary: 'desc' },
        { created_at: 'desc' }
      ]
    });
  }

  async getDomainConnectionByCloudflareId(cloudflareId: string): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    const result = await prisma.domain_connections.findFirst({
      where: { cloudflare_custom_hostname_id: cloudflareId }
    });
    return result ?? undefined;
  }

  async getDomainConnectionByVerificationToken(token: string): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    const result = await prisma.domain_connections.findFirst({
      where: { verification_token: token }
    });
    return result ?? undefined;
  }

  async createDomainConnection(connection: InsertDomainConnection): Promise<DomainConnection> {
    await this.ensureInitialized();
    // Auto-generate normalizedDomain from domain
    const normalizedDomain = connection.domain.toLowerCase();
    
    const data: any = {
      seller_id: connection.sellerId,
      domain: connection.domain,
      normalized_domain: normalizedDomain,
      strategy: connection.strategy ?? 'cloudflare',
      status: connection.status ?? 'pending_verification',
      verification_token: connection.verificationToken,
    };
    
    if (connection.dnsInstructions !== undefined) data.dns_instructions = connection.dnsInstructions;
    if (connection.cloudflareCustomHostnameId !== undefined) data.cloudflare_custom_hostname_id = connection.cloudflareCustomHostnameId;
    if (connection.caddySiteId !== undefined) data.caddy_site_id = connection.caddySiteId;
    if (connection.sslStatus !== undefined) data.ssl_status = connection.sslStatus;
    if (connection.sslProvider !== undefined) data.ssl_provider = connection.sslProvider;
    if (connection.sslRenewAt !== undefined) data.ssl_renew_at = connection.sslRenewAt;
    if (connection.sslIssuedAt !== undefined) data.ssl_issued_at = connection.sslIssuedAt;
    if (connection.sslExpiresAt !== undefined) data.ssl_expires_at = connection.sslExpiresAt;
    if (connection.isPrimary !== undefined) data.is_primary = connection.isPrimary;
    if (connection.lastVerificationAttempt !== undefined) data.last_verification_attempt = connection.lastVerificationAttempt;
    if (connection.verificationAttempts !== undefined) data.verification_attempts = connection.verificationAttempts;
    if (connection.lastError !== undefined) data.last_error = connection.lastError;
    
    return await prisma.domain_connections.create({ data });
  }

  async updateDomainConnection(id: string, updates: Partial<DomainConnection>): Promise<DomainConnection | undefined> {
    await this.ensureInitialized();
    
    const data: any = { updated_at: new Date() };
    
    if (updates.domain !== undefined) {
      data.domain = updates.domain;
      data.normalized_domain = updates.domain.toLowerCase();
    }
    if (updates.strategy !== undefined) data.strategy = updates.strategy;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.verificationToken !== undefined) data.verification_token = updates.verificationToken;
    if (updates.dnsInstructions !== undefined) data.dns_instructions = updates.dnsInstructions;
    if (updates.cloudflareCustomHostnameId !== undefined) data.cloudflare_custom_hostname_id = updates.cloudflareCustomHostnameId;
    if (updates.caddySiteId !== undefined) data.caddy_site_id = updates.caddySiteId;
    if (updates.sslStatus !== undefined) data.ssl_status = updates.sslStatus;
    if (updates.sslProvider !== undefined) data.ssl_provider = updates.sslProvider;
    if (updates.sslRenewAt !== undefined) data.ssl_renew_at = updates.sslRenewAt;
    if (updates.sslIssuedAt !== undefined) data.ssl_issued_at = updates.sslIssuedAt;
    if (updates.sslExpiresAt !== undefined) data.ssl_expires_at = updates.sslExpiresAt;
    if (updates.isPrimary !== undefined) data.is_primary = updates.isPrimary;
    if (updates.lastVerificationAttempt !== undefined) data.last_verification_attempt = updates.lastVerificationAttempt;
    if (updates.verificationAttempts !== undefined) data.verification_attempts = updates.verificationAttempts;
    if (updates.lastError !== undefined) data.last_error = updates.lastError;
    
    const result = await prisma.domain_connections.update({
      where: { id },
      data
    });
    return result ?? undefined;
  }

  async deleteDomainConnection(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await prisma.domain_connections.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getDomainByName(domain: string): Promise<DomainConnection | null> {
    await this.ensureInitialized();
    const normalizedDomain = domain.toLowerCase();
    const result = await prisma.domain_connections.findUnique({
      where: { normalized_domain: normalizedDomain }
    });
    return result || null;
  }

  async getDomainsInProvisioning(sellerId?: string): Promise<DomainConnection[]> {
    await this.ensureInitialized();
    
    const where: any = { status: 'ssl_provisioning' };
    if (sellerId) {
      where.seller_id = sellerId;
    }
    
    return await prisma.domain_connections.findMany({ where });
  }
}

export const storage = new DatabaseStorage();
