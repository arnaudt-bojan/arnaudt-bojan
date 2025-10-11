/**
 * Notification Message Templates Service
 * 
 * Centralizes all notification messages and email subject lines.
 * NO HARDCODED MESSAGES - all content is defined in typed templates.
 */

import type { User, Order, Product, OrderItem } from '../../shared/schema';
import { formatPrice } from '../email-template';

/**
 * Notification message template types
 */
export interface NotificationMessageTemplate {
  emailSubject: string;
  emailPreheader?: string;
  notificationTitle: string;
  notificationMessage: string;
}

/**
 * Notification Messages Service
 * Provides all message templates for emails and in-app notifications
 */
export class NotificationMessagesService {
  private platformName: string;

  constructor(platformName: string = 'Upfirst') {
    this.platformName = platformName;
  }

  /**
   * Order Confirmation (Seller → Buyer)
   */
  orderConfirmation(order: Order, sellerName: string): NotificationMessageTemplate {
    return {
      emailSubject: `Order Confirmation - ${order.id.slice(0, 8)}`,
      emailPreheader: `Thank you for your order from ${sellerName}`,
      notificationTitle: 'Order Confirmed',
      notificationMessage: `Your order has been confirmed and is being processed.`,
    };
  }

  /**
   * Order Shipped (Seller → Buyer)
   */
  orderShipped(order: Order, sellerName: string, trackingNumber?: string): NotificationMessageTemplate {
    return {
      emailSubject: `Your Order Has Shipped - ${order.id.slice(0, 8)}`,
      emailPreheader: trackingNumber ? `Tracking: ${trackingNumber}` : 'Your order is on its way',
      notificationTitle: 'Order Shipped',
      notificationMessage: trackingNumber 
        ? `Your order has shipped. Tracking: ${trackingNumber}`
        : 'Your order has shipped and is on its way.',
    };
  }

  /**
   * Item Tracking Update (Seller → Buyer)
   */
  itemTracking(item: OrderItem, trackingNumber: string): NotificationMessageTemplate {
    return {
      emailSubject: `Tracking Update - ${item.productName}`,
      emailPreheader: `Tracking: ${trackingNumber}`,
      notificationTitle: 'Tracking Updated',
      notificationMessage: `Tracking number available for ${item.productName}: ${trackingNumber}`,
    };
  }

  /**
   * New Order Received (Platform → Seller)
   */
  newOrderReceived(order: Order, currency?: string): NotificationMessageTemplate {
    const amount = formatPrice(parseFloat(order.total), currency || order.currency);
    return {
      emailSubject: `New Order Received - ${order.id.slice(0, 8)}`,
      emailPreheader: `Order total: ${amount}`,
      notificationTitle: 'New Order',
      notificationMessage: `You received a new order for ${amount}`,
    };
  }

  /**
   * Product Listed (Platform → Seller)
   */
  productListed(product: Product): NotificationMessageTemplate {
    return {
      emailSubject: `Product Listed - ${product.name}`,
      emailPreheader: 'Your product is now live',
      notificationTitle: 'Product Live',
      notificationMessage: `${product.name} is now visible in your store.`,
    };
  }

  /**
   * Authentication Code
   */
  authCode(code: string): NotificationMessageTemplate {
    return {
      emailSubject: `Your ${this.platformName} verification code: ${code}`,
      emailPreheader: `Verification code: ${code}`,
      notificationTitle: 'Verification Code',
      notificationMessage: `Your verification code is: ${code}`,
    };
  }

  /**
   * Magic Link
   */
  magicLink(): NotificationMessageTemplate {
    return {
      emailSubject: `Sign in to ${this.platformName}`,
      emailPreheader: 'Click to sign in securely',
      notificationTitle: 'Sign In Link',
      notificationMessage: 'Click the link in your email to sign in.',
    };
  }

  /**
   * Seller Welcome
   */
  sellerWelcome(seller: User): NotificationMessageTemplate {
    const name = seller.firstName || 'there';
    return {
      emailSubject: `Welcome to ${this.platformName}!`,
      emailPreheader: 'Start selling in minutes',
      notificationTitle: `Welcome to ${this.platformName}`,
      notificationMessage: `Welcome ${name}! Your store is ready to set up.`,
    };
  }

  /**
   * Stripe Onboarding Incomplete
   */
  stripeOnboardingIncomplete(seller: User): NotificationMessageTemplate {
    const name = seller.firstName || 'there';
    return {
      emailSubject: 'Complete Your Payment Setup',
      emailPreheader: 'Action required to accept payments',
      notificationTitle: 'Payment Setup Required',
      notificationMessage: `${name}, complete your Stripe setup to start accepting payments.`,
    };
  }

  /**
   * Order Payment Failed (Platform → Seller)
   */
  orderPaymentFailed(orderId: string, amount: number, currency: string, reason: string): NotificationMessageTemplate {
    return {
      emailSubject: 'Order Payment Failed',
      emailPreheader: `Order ${orderId.slice(0, 8)} - Payment issue`,
      notificationTitle: 'Payment Failed',
      notificationMessage: `Payment failed for order ${orderId.slice(0, 8)}: ${reason}`,
    };
  }

  /**
   * Buyer Payment Failed (Platform → Buyer)
   */
  buyerPaymentFailed(amount: number, currency: string, reason: string): NotificationMessageTemplate {
    return {
      emailSubject: 'Payment Failed',
      emailPreheader: 'Your payment could not be processed',
      notificationTitle: 'Payment Failed',
      notificationMessage: `Your payment of ${formatPrice(amount, currency)} failed: ${reason}`,
    };
  }

  /**
   * Subscription Payment Failed (Platform → Seller)
   */
  subscriptionPaymentFailed(amount: number, currency: string, reason: string): NotificationMessageTemplate {
    return {
      emailSubject: 'Subscription Payment Failed',
      emailPreheader: 'Action required - Update payment method',
      notificationTitle: 'Subscription Payment Failed',
      notificationMessage: `Your subscription payment of ${formatPrice(amount, currency)} failed: ${reason}`,
    };
  }

  /**
   * Inventory Out of Stock (Platform → Seller)
   */
  inventoryOutOfStock(product: Product): NotificationMessageTemplate {
    return {
      emailSubject: `Product Out of Stock - ${product.name}`,
      emailPreheader: 'Action required - Restock product',
      notificationTitle: 'Product Out of Stock',
      notificationMessage: `${product.name} is out of stock and hidden from your store.`,
    };
  }

  /**
   * Payout Failed (Platform → Seller)
   */
  payoutFailed(amount: number, currency: string, reason: string): NotificationMessageTemplate {
    return {
      emailSubject: 'Payout Failed',
      emailPreheader: 'Your payout could not be processed',
      notificationTitle: 'Payout Failed',
      notificationMessage: `Your payout of ${formatPrice(amount, currency)} failed: ${reason}`,
    };
  }

  /**
   * Balance Payment Request (Platform → Buyer)
   */
  balancePaymentRequest(order: Order, sellerName: string): NotificationMessageTemplate {
    return {
      emailSubject: `Payment Required - Order ${order.id.slice(0, 8)}`,
      emailPreheader: `Complete payment for your ${sellerName} order`,
      notificationTitle: 'Payment Required',
      notificationMessage: `Complete payment for your order from ${sellerName}`,
    };
  }

  /**
   * Subscription Invoice (Platform → Seller)
   */
  subscriptionInvoice(amount: number, currency: string, plan: string): NotificationMessageTemplate {
    return {
      emailSubject: `${this.platformName} Subscription Invoice`,
      emailPreheader: `${plan} - ${formatPrice(amount, currency)}`,
      notificationTitle: 'Subscription Invoice',
      notificationMessage: `Your ${plan} subscription invoice for ${formatPrice(amount, currency)}`,
    };
  }
}

// Export singleton instance
export const notificationMessages = new NotificationMessagesService();
