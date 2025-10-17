/**
 * Notification Message Templates Service
 * 
 * Centralizes all notification messages and email subject lines.
 * NO HARDCODED MESSAGES - all content is defined in typed templates.
 */

import type { User, Order, Product, OrderItem } from '../../shared/schema';
import { formatPrice } from '../email-template';
import { formatCurrency } from '../currencyService';

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

  /**
   * Item Shipped (Seller → Buyer)
   */
  itemShipped(orderId: string, itemName: string): NotificationMessageTemplate {
    return {
      emailSubject: `Item shipped from order #${orderId.slice(0, 8)}`,
      emailPreheader: `${itemName} is on its way`,
      notificationTitle: 'Item Shipped',
      notificationMessage: `${itemName} from order #${orderId.slice(0, 8)} has shipped`,
    };
  }

  /**
   * Item Delivered (Seller → Buyer)
   */
  itemDelivered(orderId: string, itemName: string): NotificationMessageTemplate {
    return {
      emailSubject: `Item delivered from order #${orderId.slice(0, 8)}`,
      emailPreheader: `${itemName} has been delivered`,
      notificationTitle: 'Item Delivered',
      notificationMessage: `${itemName} from order #${orderId.slice(0, 8)} has been delivered`,
    };
  }

  /**
   * Item Cancelled (Seller → Buyer)
   */
  itemCancelled(orderId: string, itemName: string, reason?: string): NotificationMessageTemplate {
    return {
      emailSubject: `Item cancelled from order #${orderId.slice(0, 8)}`,
      emailPreheader: reason || 'Item has been cancelled',
      notificationTitle: 'Item Cancelled',
      notificationMessage: `${itemName} from order #${orderId.slice(0, 8)} has been cancelled${reason ? `: ${reason}` : ''}`,
    };
  }

  /**
   * Item Refunded (Seller → Buyer)
   */
  itemRefunded(orderId: string, itemName: string, refundAmount: number, currency: string): NotificationMessageTemplate {
    return {
      emailSubject: `Refund processed for order #${orderId.slice(0, 8)}`,
      emailPreheader: `${formatPrice(refundAmount, currency)} refund for ${itemName}`,
      notificationTitle: 'Refund Processed',
      notificationMessage: `${formatPrice(refundAmount, currency)} refund processed for ${itemName}`,
    };
  }

  // ============================================================================
  // WHOLESALE B2B NOTIFICATION TEMPLATES
  // ============================================================================

  /**
   * Wholesale Order Confirmation (Seller → Buyer)
   */
  wholesaleOrderConfirmation(
    orderNumber: string, 
    totalCents: number, 
    currency: string
  ): NotificationMessageTemplate {
    const formattedTotal = formatCurrency(totalCents / 100, currency);
    return {
      emailSubject: `Order Confirmed - ${orderNumber}`,
      emailPreheader: `Order ${orderNumber} confirmed - ${formattedTotal}`,
      notificationTitle: 'Wholesale Order Confirmed',
      notificationMessage: `Wholesale order ${orderNumber} confirmed for ${formattedTotal}`,
    };
  }

  /**
   * Wholesale Deposit Received (Seller → Buyer or Seller)
   */
  wholesaleDepositReceived(
    orderNumber: string,
    depositCents: number,
    currency: string,
    recipient: 'buyer' | 'seller'
  ): NotificationMessageTemplate {
    const formattedDeposit = formatCurrency(depositCents / 100, currency);
    
    if (recipient === 'buyer') {
      return {
        emailSubject: `Deposit Received - ${orderNumber}`,
        emailPreheader: `Deposit received for order ${orderNumber}`,
        notificationTitle: 'Deposit Received',
        notificationMessage: `Your deposit of ${formattedDeposit} has been received for order ${orderNumber}`,
      };
    } else {
      return {
        emailSubject: `Deposit Received - ${orderNumber}`,
        emailPreheader: `Deposit received for order ${orderNumber}`,
        notificationTitle: 'Deposit Payment Received',
        notificationMessage: `Deposit payment of ${formattedDeposit} received for wholesale order ${orderNumber}`,
      };
    }
  }

  /**
   * Wholesale Balance Payment Reminder (Seller → Buyer)
   */
  wholesaleBalanceReminder(
    orderNumber: string,
    balanceCents: number,
    currency: string
  ): NotificationMessageTemplate {
    const formattedBalance = formatCurrency(balanceCents / 100, currency);
    return {
      emailSubject: `Balance Payment Due - ${orderNumber}`,
      emailPreheader: `Balance payment due: ${formattedBalance}`,
      notificationTitle: 'Balance Payment Reminder',
      notificationMessage: `Balance payment of ${formattedBalance} due for order ${orderNumber}`,
    };
  }

  /**
   * Wholesale Balance Payment Overdue (Seller → Buyer or Seller)
   */
  wholesaleBalanceOverdue(
    orderNumber: string,
    balanceCents: number,
    currency: string,
    recipient: 'buyer' | 'seller'
  ): NotificationMessageTemplate {
    const formattedBalance = formatCurrency(balanceCents / 100, currency);
    
    if (recipient === 'buyer') {
      return {
        emailSubject: `OVERDUE: Balance Payment Required - ${orderNumber}`,
        emailPreheader: `OVERDUE: Balance payment for ${orderNumber}`,
        notificationTitle: 'Balance Payment Overdue',
        notificationMessage: `URGENT: Balance payment of ${formattedBalance} is overdue for order ${orderNumber}`,
      };
    } else {
      return {
        emailSubject: `Balance Payment Overdue - ${orderNumber}`,
        emailPreheader: `OVERDUE: Balance payment for ${orderNumber}`,
        notificationTitle: 'Balance Payment Overdue',
        notificationMessage: `Balance payment of ${formattedBalance} is overdue for wholesale order ${orderNumber}`,
      };
    }
  }

  /**
   * Wholesale Order Shipped (Seller → Buyer)
   */
  wholesaleOrderShipped(
    orderNumber: string,
    trackingNumber?: string
  ): NotificationMessageTemplate {
    return {
      emailSubject: `Order Shipped - ${orderNumber}`,
      emailPreheader: trackingNumber 
        ? `Order ${orderNumber} has shipped - Tracking: ${trackingNumber}` 
        : `Order ${orderNumber} has shipped`,
      notificationTitle: 'Wholesale Order Shipped',
      notificationMessage: trackingNumber
        ? `Wholesale order ${orderNumber} has shipped. Tracking: ${trackingNumber}`
        : `Wholesale order ${orderNumber} has shipped`,
    };
  }

  /**
   * Wholesale Order Fulfilled (Seller → Buyer)
   */
  wholesaleOrderFulfilled(
    orderNumber: string,
    fulfillmentType: 'shipped' | 'pickup'
  ): NotificationMessageTemplate {
    if (fulfillmentType === 'shipped') {
      return {
        emailSubject: `Order Ready - ${orderNumber}`,
        emailPreheader: `Order ${orderNumber} ${fulfillmentType === 'shipped' ? 'delivered' : 'ready for pickup'}`,
        notificationTitle: 'Wholesale Order Complete',
        notificationMessage: `Wholesale order ${orderNumber} has been delivered`,
      };
    } else {
      return {
        emailSubject: `Order Ready - ${orderNumber}`,
        emailPreheader: `Order ${orderNumber} ready for pickup`,
        notificationTitle: 'Wholesale Order Ready',
        notificationMessage: `Wholesale order ${orderNumber} is ready for pickup`,
      };
    }
  }
}

// Export singleton instance
export const notificationMessages = new NotificationMessagesService();
