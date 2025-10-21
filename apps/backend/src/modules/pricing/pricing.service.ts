import { Injectable, Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import {
  CartTotals,
  ExchangeRate,
  WholesaleItem,
  QuotationLineItem,
  RefundType,
  RefundLineItem,
  ExchangeRateResponse,
} from './interfaces/pricing.interface';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private exchangeRateCache: Map<string, { rate: number; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
  
  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly lastKnownGoodRates = new Map<string, { rate: number; timestamp: number }>();

  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // Currency Conversion
  // ============================================================================

  /**
   * Convert price from one currency to another
   */
  async convertPrice(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Get exchange rate between two currencies with retry logic and LKG fallback
   */
  async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    
    // Check cache first
    const cached = await this.getCachedRate(from, to);
    if (cached !== null) {
      return cached;
    }
    
    // Try with retries
    let lastError: Error;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const rates = await this.fetchExchangeRates(from);
        const rate = rates[to.toLowerCase()];
        
        if (!rate) {
          throw new Error(`No exchange rate found for ${from} to ${to}`);
        }
        
        // Cache the rate
        await this.setCachedRate(from, to, rate);
        
        // Store as last-known-good
        this.lastKnownGoodRates.set(`${from}_${to}`, {
          rate,
          timestamp: Date.now(),
        });
        
        return rate;
      } catch (error) {
        lastError = error;
        if (attempt < this.MAX_RETRIES - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * Math.pow(2, attempt)));
        }
      }
    }
    
    // Check last-known-good rate
    const lkg = this.lastKnownGoodRates.get(`${from}_${to}`);
    if (lkg) {
      this.logger.warn(`Using last-known-good rate for ${from} to ${to} due to API failure`);
      return lkg.rate;
    }
    
    // If no last-known-good, throw explicit error
    throw new Error(`Failed to fetch exchange rate from ${from} to ${to} after ${this.MAX_RETRIES} attempts: ${lastError.message}`);
  }

  /**
   * Get full exchange rate details
   */
  async getExchangeRateDetails(from: string, to: string): Promise<ExchangeRate> {
    const rate = await this.getExchangeRate(from, to);
    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      timestamp: new Date(),
    };
  }

  /**
   * Fetch exchange rates from external API
   */
  private async fetchExchangeRates(
    baseCurrency: string,
  ): Promise<Record<string, number>> {
    try {
      const response = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseCurrency.toLowerCase()}.json`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();
      return data[baseCurrency.toLowerCase()] || {};
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rates for ${baseCurrency}`, error);
      return {};
    }
  }

  /**
   * Get cached exchange rate
   */
  private async getCachedRate(from: string, to: string): Promise<number | null> {
    const key = `${from}_${to}`;
    const cached = this.exchangeRateCache.get(key);

    if (!cached) return null;

    const now = new Date().getTime();
    const cacheAge = now - cached.timestamp.getTime();

    if (cacheAge > this.CACHE_TTL) {
      this.exchangeRateCache.delete(key);
      return null;
    }

    return cached.rate;
  }

  /**
   * Set cached exchange rate
   */
  private async setCachedRate(
    from: string,
    to: string,
    rate: number,
  ): Promise<void> {
    const key = `${from}_${to}`;
    this.exchangeRateCache.set(key, {
      rate,
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // Cart Calculations
  // ============================================================================

  /**
   * Calculate cart subtotal (before tax)
   */
  async calculateCartSubtotal(cartId: string): Promise<number> {
    const cart = await this.prisma.carts.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new GraphQLError('Cart not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const items = (cart.items as any[]) || [];

    return items.reduce((sum, item) => {
      const price = parseFloat(item.price || '0');
      const quantity = item.quantity || 0;
      return sum + price * quantity;
    }, 0);
  }

  /**
   * Calculate cart tax
   */
  async calculateCartTax(cartId: string, taxRate: number = 0.08): Promise<number> {
    const subtotal = await this.calculateCartSubtotal(cartId);
    return subtotal * taxRate;
  }

  /**
   * Calculate cart total (subtotal + tax)
   */
  async calculateCartTotal(cartId: string, taxRate?: number): Promise<number> {
    const subtotal = await this.calculateCartSubtotal(cartId);
    const tax = await this.calculateCartTax(cartId, taxRate);
    return subtotal + tax;
  }

  /**
   * Calculate all cart totals at once
   */
  async calculateCartTotals(
    cartId: string,
    taxRate: number = 0.08,
  ): Promise<CartTotals> {
    const cart = await this.prisma.carts.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new GraphQLError('Cart not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const subtotal = await this.calculateCartSubtotal(cartId);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      subtotal,
      tax,
      total,
      currency: 'USD', // Default currency, could be extended to support cart.currency
    };
  }

  // ============================================================================
  // Order Calculations
  // ============================================================================

  /**
   * Calculate order total
   */
  async calculateOrderTotal(orderId: string): Promise<number> {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new GraphQLError('Order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return parseFloat(String(order.total || 0));
  }

  /**
   * Calculate tax for an order
   */
  async calculateTaxForOrder(
    orderId: string,
    taxRate: number = 0.08,
  ): Promise<number> {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new GraphQLError('Order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const subtotal = parseFloat(String(order.subtotal_before_tax || order.total || 0));
    return subtotal * taxRate;
  }

  /**
   * Calculate refund amount
   */
  async calculateRefundAmount(
    orderId: string,
    refundType: RefundType,
    lineItems?: RefundLineItem[],
  ): Promise<number> {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new GraphQLError('Order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (refundType === RefundType.FULL) {
      return parseFloat(String(order.total || 0));
    }

    if (!lineItems || lineItems.length === 0) {
      throw new GraphQLError('Line items required for partial refund', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  }

  // ============================================================================
  // Wholesale Calculations
  // ============================================================================

  /**
   * Calculate wholesale deposit amount
   */
  async calculateWholesaleDeposit(
    items: WholesaleItem[],
    depositPercent: number,
  ): Promise<number> {
    const subtotal = items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    return subtotal * (depositPercent / 100);
  }

  /**
   * Calculate wholesale balance due
   */
  async calculateWholesaleBalance(orderId: string): Promise<number> {
    const order = await this.prisma.wholesale_orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new GraphQLError('Wholesale order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const totalCents = order.total_cents || 0;
    const depositCents = order.deposit_amount_cents || 0;

    return (totalCents - depositCents) / 100;
  }

  /**
   * Calculate wholesale order total from items
   */
  async calculateWholesaleOrderTotal(items: WholesaleItem[]): Promise<number> {
    return items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
  }

  // ============================================================================
  // Quotation Calculations
  // ============================================================================

  /**
   * Calculate quotation line item total
   */
  async calculateQuotationLineTotal(lineItem: QuotationLineItem): Promise<number> {
    const subtotal = lineItem.unitPrice * lineItem.quantity;
    const discount = lineItem.discount || 0;
    return subtotal - discount;
  }

  /**
   * Calculate quotation grand total
   */
  async calculateQuotationGrandTotal(quotationId: string): Promise<number> {
    const quotation = await this.prisma.trade_quotations.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new GraphQLError('Quotation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const subtotal = parseFloat(String(quotation.subtotal || 0));
    const shippingAmount = parseFloat(String(quotation.shipping_amount || 0));
    const taxAmount = parseFloat(String(quotation.tax_amount || 0));

    return subtotal + shippingAmount + taxAmount;
  }

  /**
   * Calculate quotation subtotal (before shipping and tax)
   */
  async calculateQuotationSubtotal(quotationId: string): Promise<number> {
    const quotation = await this.prisma.trade_quotations.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new GraphQLError('Quotation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return parseFloat(String(quotation.subtotal || 0));
  }

  /**
   * Calculate complete quotation totals (stateless, for previews)
   * Uses proper rounding to avoid floating point errors
   */
  calculateQuotationTotalsFromLineItems(input: {
    lineItems: Array<{ description: string; unitPrice: number; quantity: number }>;
    depositPercentage?: number;
    taxRate?: number;
    shippingAmount?: number;
  }): {
    lineItems: Array<{ description: string; unitPrice: number; quantity: number; lineTotal: number }>;
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    total: number;
    depositAmount: number;
    depositPercentage: number;
    balanceAmount: number;
  } {
    const depositPercentage = input.depositPercentage ?? 50;
    const taxRate = input.taxRate ?? 0;
    const shippingAmount = input.shippingAmount ?? 0;

    // Calculate line totals using cents to avoid rounding errors
    const lineItems = input.lineItems.map((item) => {
      const unitPriceCents = Math.round(item.unitPrice * 100);
      const lineTotalCents = unitPriceCents * item.quantity;
      const lineTotal = lineTotalCents / 100;

      return {
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: Math.round(lineTotal * 100) / 100, // Round to 2 decimals
      };
    });

    // Calculate subtotal in cents
    const subtotalCents = lineItems.reduce((sum, item) => {
      return sum + Math.round(item.lineTotal * 100);
    }, 0);

    const subtotal = subtotalCents / 100;

    // Calculate tax and shipping in cents
    const taxAmountCents = Math.round(subtotalCents * taxRate);
    const shippingAmountCents = Math.round(shippingAmount * 100);

    // Calculate total in cents
    const totalCents = subtotalCents + taxAmountCents + shippingAmountCents;

    // Calculate deposit and balance in cents
    const depositCents = Math.round((totalCents * depositPercentage) / 100);
    const balanceCents = totalCents - depositCents;

    return {
      lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: taxAmountCents / 100,
      shippingAmount: shippingAmountCents / 100,
      total: totalCents / 100,
      depositAmount: depositCents / 100,
      depositPercentage,
      balanceAmount: balanceCents / 100,
    };
  }

  // ============================================================================
  // Wholesale Cart Calculations
  // ============================================================================

  /**
   * Calculate wholesale cart totals (stateless)
   * All calculations in cents to avoid rounding errors
   */
  calculateWholesaleCartTotals(input: {
    items: Array<{
      productId: string;
      quantity: number;
      unitPriceCents: number;
      moq?: number;
    }>;
    depositPercentage?: number;
  }): {
    items: Array<{
      productId: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      moq?: number;
      moqCompliant: boolean;
    }>;
    subtotalCents: number;
    depositCents: number;
    balanceDueCents: number;
    depositPercentage: number;
    totalCents: number;
  } {
    const depositPercentage = input.depositPercentage ?? 50;

    // Calculate line totals and check MOQ compliance
    const items = input.items.map((item) => {
      const lineTotalCents = item.unitPriceCents * item.quantity;
      const moqCompliant = !item.moq || item.quantity >= item.moq;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents,
        moq: item.moq,
        moqCompliant,
      };
    });

    // Calculate subtotal in cents
    const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);

    // Calculate deposit and balance in cents
    const depositCents = Math.round((subtotalCents * depositPercentage) / 100);
    const balanceDueCents = subtotalCents - depositCents;

    return {
      items,
      subtotalCents,
      depositCents,
      balanceDueCents,
      depositPercentage,
      totalCents: subtotalCents,
    };
  }

  /**
   * Validate MOQ requirements for wholesale items
   */
  validateWholesaleMOQ(items: Array<{ quantity: number; moq?: number }>): {
    isValid: boolean;
    violations: Array<{ index: number; quantity: number; moq: number }>;
  } {
    const violations: Array<{ index: number; quantity: number; moq: number }> = [];

    items.forEach((item, index) => {
      if (item.moq && item.quantity < item.moq) {
        violations.push({
          index,
          quantity: item.quantity,
          moq: item.moq,
        });
      }
    });

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}
