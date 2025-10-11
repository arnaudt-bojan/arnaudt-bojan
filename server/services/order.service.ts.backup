/**
 * Order Service
 * 
 * Backend order processing - handles order creation, payment orchestration, and status management
 */

import type { IStorage } from "../storage";
import type { InsertOrder, Order } from "@shared/schema";
import { calculatePricing } from "./pricing.service";
import type { CartItem } from "./cart.service";

export interface OrderCreationData {
  items: CartItem[];
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  shippingCost: number;
  taxAmount?: number;
  paymentIntentId?: string;
}

export interface OrderSummary {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  depositAmount?: number;
  remainingBalance?: number;
  paymentType: "full" | "deposit";
}

export class OrderService {
  constructor(private storage: IStorage) {}

  /**
   * Calculate order summary before payment
   */
  async calculateOrderSummary(
    items: CartItem[],
    shippingCost: number,
    taxAmount: number = 0
  ): Promise<OrderSummary> {
    const pricing = calculatePricing(items, shippingCost, taxAmount);

    return {
      subtotal: pricing.subtotal,
      shippingCost: pricing.shippingCost,
      taxAmount,
      total: pricing.totalWithTax,
      depositAmount: pricing.payingDepositOnly ? pricing.depositTotal : undefined,
      remainingBalance: pricing.payingDepositOnly ? pricing.remainingBalance : undefined,
      paymentType: pricing.payingDepositOnly ? "deposit" : "full",
    };
  }

  /**
   * Create order after successful payment
   */
  async createOrder(data: OrderCreationData): Promise<Order> {
    const pricing = calculatePricing(
      data.items,
      data.shippingCost,
      data.taxAmount || 0
    );

    // Format shipping address
    const fullAddress = [
      data.shippingAddress.line1,
      data.shippingAddress.line2,
      `${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}`,
      data.shippingAddress.country,
    ]
      .filter(Boolean)
      .join("\n");

    // Create order data
    const orderData: InsertOrder = {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerAddress: fullAddress,
      items: JSON.stringify(
        data.items.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          productType: item.productType,
          depositAmount: item.depositAmount,
          requiresDeposit: item.requiresDeposit,
        }))
      ),
      total: pricing.fullTotal.toString(),
      amountPaid: pricing.amountToCharge.toString(),
      remainingBalance: pricing.remainingBalance.toString(),
      paymentType: pricing.payingDepositOnly ? "deposit" : "full",
      paymentStatus: pricing.payingDepositOnly ? "deposit_paid" : "paid",
      status: "pending",
      subtotalBeforeTax: pricing.subtotal.toString(),
      taxAmount: (data.taxAmount || 0).toString(),
      stripePaymentIntentId: data.paymentIntentId,
    };

    // Create order in database
    const order = await this.storage.createOrder(orderData);

    return order;
  }

  /**
   * Update order payment status
   */
  async updatePaymentStatus(
    orderId: string,
    status: "pending" | "paid" | "deposit_paid" | "failed",
    paymentIntentId?: string
  ): Promise<Order> {
    const order = await this.storage.getOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Use existing updateOrderPaymentStatus method
    const updated = await this.storage.updateOrderPaymentStatus(orderId, status);
    if (!updated) {
      throw new Error("Failed to update order payment status");
    }

    return updated;
  }

  /**
   * Process remaining balance payment
   */
  async processRemainingBalance(
    orderId: string,
    paymentIntentId: string
  ): Promise<Order> {
    const order = await this.storage.getOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.paymentStatus !== "deposit_paid") {
      throw new Error("Order is not in deposit_paid status");
    }

    // Update payment status to paid
    const updated = await this.storage.updateOrderPaymentStatus(orderId, "paid");
    if (!updated) {
      throw new Error("Failed to update order payment status");
    }

    // Update balance payment intent
    await this.storage.updateOrderBalancePaymentIntent(orderId, paymentIntentId);

    return updated;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | undefined> {
    return this.storage.getOrder(orderId);
  }

  /**
   * Get orders by seller
   */
  async getOrdersBySeller(sellerId: string): Promise<Order[]> {
    // Get seller's products
    const allProducts = await this.storage.getAllProducts();
    const sellerProductIds = allProducts
      .filter(p => p.sellerId === sellerId)
      .map(p => p.id);

    // Get all orders and filter by seller's products
    const allOrders = await this.storage.getAllOrders();
    return allOrders.filter(order => {
      try {
        const items = JSON.parse(order.items);
        return items.some((item: any) => sellerProductIds.includes(item.productId));
      } catch {
        return false;
      }
    });
  }

  /**
   * Get orders by customer email
   */
  async getOrdersByEmail(email: string): Promise<Order[]> {
    // Get all orders and filter by customer email
    const allOrders = await this.storage.getAllOrders();
    return allOrders.filter(order => order.customerEmail === email);
  }
}
