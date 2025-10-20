import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly websocketGateway: AppWebSocketGateway,
  ) {}

  async createQuotation(input: any, sellerId: string) {
    const quotationNumber = `QT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const items = input.items || [];
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + parseFloat(item.unitPrice) * item.quantity;
    }, 0);

    const depositPercentage = input.depositPercentage || 50;
    const depositAmount = (subtotal * depositPercentage) / 100;
    const balanceAmount = subtotal - depositAmount;

    // Transaction: Create quotation, items, and events atomically
    const quotation = await this.prisma.runTransaction(async (tx) => {
      const quotationData = {
        seller_id: sellerId,
        buyer_email: input.buyerEmail,
        buyer_id: input.buyerId || null,
        quotation_number: quotationNumber,
        currency: input.currency || 'USD',
        subtotal,
        tax_amount: 0,
        shipping_amount: 0,
        total: subtotal,
        deposit_amount: depositAmount,
        deposit_percentage: depositPercentage,
        balance_amount: balanceAmount,
        status: 'draft' as const,
        valid_until: input.validUntil || null,
        delivery_terms: input.deliveryTerms || null,
        data_sheet_url: input.dataSheetUrl || null,
        terms_and_conditions_url: input.termsAndConditionsUrl || null,
        metadata: input.metadata || null,
      };

      // Step 1: Create quotation
      const created = await tx.trade_quotations.create({
        data: quotationData,
      });

      // Step 2: Create quotation items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await tx.trade_quotation_items.create({
          data: {
            quotation_id: created.id,
            line_number: i + 1,
            description: item.description,
            product_id: item.productId || null,
            unit_price: parseFloat(item.unitPrice),
            quantity: item.quantity,
            line_total: parseFloat(item.unitPrice) * item.quantity,
          },
        });
      }

      // Step 3: Create quotation event
      await tx.trade_quotation_events.create({
        data: {
          quotation_id: created.id,
          event_type: 'created',
          performed_by: sellerId,
          payload: { quotation_number: quotationNumber },
        },
      });

      return created;
    });

    // Cache invalidation: Clear quotation caches
    await this.cacheService.delPattern(`quotations:seller:${sellerId}`);

    // External API calls (Socket.IO) - OUTSIDE transaction
    this.websocketGateway.emitQuotationCreated(sellerId, {
      quotationId: quotation.id,
      sellerId: quotation.seller_id,
      quotationNumber: quotation.quotation_number,
      buyerEmail: quotation.buyer_email,
      total: quotation.total.toString(),
    });

    return this.mapQuotationToGraphQL(quotation);
  }

  async getQuotation(id: string, sellerId: string) {
    // CRITICAL FIX: Validate seller ownership before returning quotation
    const quotation = await this.prisma.trade_quotations.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new GraphQLError('Quotation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // AUTHORIZATION: Only the seller who created this quotation can access it
    if (quotation.seller_id !== sellerId) {
      // Security: Return "not found" instead of "unauthorized" to prevent enumeration
      throw new GraphQLError('Quotation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapQuotationToGraphQL(quotation);
  }

  async getQuotationByToken(token: string) {
    const quotation = await this.prisma.trade_quotations.findFirst({
      where: { id: token },
    });

    if (!quotation) {
      throw new GraphQLError('Quotation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapQuotationToGraphQL(quotation);
  }

  async listQuotations(sellerId: string) {
    const quotations = await this.prisma.trade_quotations.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' },
    });

    return quotations.map(q => this.mapQuotationToGraphQL(q));
  }

  async updateQuotation(id: string, input: any, sellerId: string) {
    // Pre-transaction validation
    const existing = await this.prisma.trade_quotations.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new GraphQLError('Quotation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (existing.seller_id !== sellerId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Transaction: Delete old items, create new items, update quotation atomically
    const quotation = await this.prisma.runTransaction(async (tx) => {
      const updateData: any = {};

      if (input.items) {
        // Step 1: Delete old quotation items
        await tx.trade_quotation_items.deleteMany({
          where: { quotation_id: id },
        });

        const subtotal = input.items.reduce((sum: number, item: any) => {
          return sum + parseFloat(item.unitPrice) * item.quantity;
        }, 0);

        const depositPercentage = input.depositPercentage || existing.deposit_percentage;
        const depositAmount = (subtotal * depositPercentage) / 100;
        const balanceAmount = subtotal - depositAmount;

        updateData.subtotal = subtotal;
        updateData.total = subtotal;
        updateData.deposit_amount = depositAmount;
        updateData.deposit_percentage = depositPercentage;
        updateData.balance_amount = balanceAmount;

        // Step 2: Create new quotation items
        for (let i = 0; i < input.items.length; i++) {
          const item = input.items[i];
          await tx.trade_quotation_items.create({
            data: {
              quotation_id: id,
              line_number: i + 1,
              description: item.description,
              product_id: item.productId || null,
              unit_price: parseFloat(item.unitPrice),
              quantity: item.quantity,
              line_total: parseFloat(item.unitPrice) * item.quantity,
            },
          });
        }
      }

      if (input.depositPercentage !== undefined) {
        updateData.deposit_percentage = input.depositPercentage;
        const depositAmount = (parseFloat(existing.subtotal.toString()) * input.depositPercentage) / 100;
        updateData.deposit_amount = depositAmount;
        updateData.balance_amount = parseFloat(existing.subtotal.toString()) - depositAmount;
      }

      if (input.validUntil !== undefined) {
        updateData.valid_until = input.validUntil;
      }

      // Step 3: Update quotation
      return await tx.trade_quotations.update({
        where: { id },
        data: updateData,
      });
    });

    // Cache invalidation: Clear quotation caches
    await this.cacheService.del(`quotation:${id}`);
    await this.cacheService.delPattern(`quotations:seller:${sellerId}`);

    // External API calls (Socket.IO) - OUTSIDE transaction
    this.websocketGateway.emitQuotationUpdated(sellerId, existing.buyer_id, {
      quotationId: quotation.id,
      sellerId: quotation.seller_id,
      quotationNumber: quotation.quotation_number,
      changes: {
        items: input.items !== undefined,
        pricing: input.depositPercentage !== undefined,
        terms: input.validUntil !== undefined,
      },
    });

    return this.mapQuotationToGraphQL(quotation);
  }

  async sendQuotation(id: string, sellerId: string) {
    // Pre-transaction validation
    const existing = await this.prisma.trade_quotations.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new GraphQLError('Quotation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (existing.seller_id !== sellerId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Transaction: Update quotation status and create event atomically
    const quotation = await this.prisma.runTransaction(async (tx) => {
      // Step 1: Update quotation status
      const updated = await tx.trade_quotations.update({
        where: { id },
        data: {
          status: 'sent',
        },
      });

      // Step 2: Create quotation event
      await tx.trade_quotation_events.create({
        data: {
          quotation_id: id,
          event_type: 'sent',
          performed_by: sellerId,
        },
      });

      return updated;
    });

    // Cache invalidation: Clear quotation caches
    await this.cacheService.del(`quotation:${id}`);
    await this.cacheService.delPattern(`quotations:seller:${sellerId}`);

    // External API calls (Socket.IO) - OUTSIDE transaction
    // TODO: Actual email notification should go here (OUTSIDE transaction)
    this.websocketGateway.emitQuotationSent(sellerId, existing.buyer_id, {
      quotationId: quotation.id,
      sellerId: quotation.seller_id,
      buyerId: existing.buyer_id || undefined,
      buyerEmail: quotation.buyer_email,
      quotationNumber: quotation.quotation_number,
    });

    return this.mapQuotationToGraphQL(quotation);
  }

  async acceptQuotation(id: string, buyerInfo: any) {
    // Pre-transaction validation
    const existing = await this.prisma.trade_quotations.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new GraphQLError('Quotation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Transaction: Update quotation, create event, and create payment schedules atomically
    const quotation = await this.prisma.runTransaction(async (tx) => {
      // Step 1: Update quotation status
      const updated = await tx.trade_quotations.update({
        where: { id },
        data: {
          status: 'accepted',
          buyer_id: buyerInfo?.buyerId || null,
        },
      });

      // Step 2: Create quotation event
      await tx.trade_quotation_events.create({
        data: {
          quotation_id: id,
          event_type: 'accepted',
          performed_by: buyerInfo?.buyerId || existing.buyer_email,
          payload: buyerInfo || null,
        },
      });

      // Step 3: Create payment schedules if they don't exist
      const depositSchedule = await tx.trade_payment_schedules.findFirst({
        where: {
          quotation_id: id,
          payment_type: 'deposit',
        },
      });

      if (!depositSchedule) {
        await tx.trade_payment_schedules.create({
          data: {
            quotation_id: id,
            payment_type: 'deposit',
            amount: existing.deposit_amount,
            status: 'pending',
          },
        });

        await tx.trade_payment_schedules.create({
          data: {
            quotation_id: id,
            payment_type: 'balance',
            amount: existing.balance_amount,
            status: 'pending',
          },
        });
      }

      return updated;
    });

    // Cache invalidation: Clear quotation caches
    await this.cacheService.del(`quotation:${id}`);
    await this.cacheService.delPattern(`quotations:seller:${existing.seller_id}`);

    // External API calls (Socket.IO) - OUTSIDE transaction
    this.websocketGateway.emitQuotationAccepted(
      existing.seller_id,
      buyerInfo?.buyerId || quotation.buyer_id,
      {
        quotationId: quotation.id,
        sellerId: quotation.seller_id,
        buyerId: buyerInfo?.buyerId || quotation.buyer_id,
        quotationNumber: quotation.quotation_number,
        total: quotation.total.toString(),
      }
    );

    return this.mapQuotationToGraphQL(quotation);
  }

  async getQuotationLineItems(quotationId: string) {
    const items = await this.prisma.trade_quotation_items.findMany({
      where: { quotation_id: quotationId },
      orderBy: { line_number: 'asc' },
    });

    return items.map(item => this.mapLineItemToGraphQL(item));
  }

  async getQuotationActivities(quotationId: string) {
    const events = await this.prisma.trade_quotation_events.findMany({
      where: { quotation_id: quotationId },
      orderBy: { created_at: 'desc' },
    });

    return events.map(event => ({
      id: event.id,
      quotationId: event.quotation_id,
      eventType: event.event_type,
      performedBy: event.performed_by,
      payload: event.payload,
      createdAt: event.created_at,
    }));
  }

  async getQuotationPayments(quotationId: string) {
    const payments = await this.prisma.trade_payment_schedules.findMany({
      where: { quotation_id: quotationId },
      orderBy: { created_at: 'asc' },
    });

    return payments.map(payment => ({
      id: payment.id,
      quotationId: payment.quotation_id,
      paymentType: payment.payment_type,
      amount: payment.amount,
      dueDate: payment.due_date,
      status: payment.status.toUpperCase(),
      stripePaymentIntentId: payment.stripe_payment_intent_id,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    }));
  }

  private mapQuotationToGraphQL(quotation: any) {
    return {
      id: quotation.id,
      quotationNumber: quotation.quotation_number,
      sellerId: quotation.seller_id,
      buyerEmail: quotation.buyer_email,
      buyerId: quotation.buyer_id,
      status: quotation.status.toUpperCase(),
      subtotal: quotation.subtotal,
      taxAmount: quotation.tax_amount,
      shippingAmount: quotation.shipping_amount,
      total: quotation.total,
      currency: quotation.currency,
      depositAmount: quotation.deposit_amount,
      depositPercentage: quotation.deposit_percentage,
      balanceAmount: quotation.balance_amount,
      validUntil: quotation.valid_until,
      deliveryTerms: quotation.delivery_terms,
      paymentTerms: null,
      dataSheetUrl: quotation.data_sheet_url,
      termsAndConditionsUrl: quotation.terms_and_conditions_url,
      orderId: quotation.order_id,
      metadata: quotation.metadata,
      createdAt: quotation.created_at,
      updatedAt: quotation.updated_at,
    };
  }

  private mapLineItemToGraphQL(item: any) {
    return {
      id: item.id,
      quotationId: item.quotation_id,
      lineNumber: item.line_number,
      description: item.description,
      productId: item.product_id,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineTotal: item.line_total,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }
}
