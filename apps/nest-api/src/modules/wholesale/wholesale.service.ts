import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../../../../generated/prisma';
import { WholesaleRulesService } from '../wholesale-rules/wholesale-rules.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class WholesaleService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WholesaleRulesService))
    private readonly wholesaleRulesService: WholesaleRulesService,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly websocketGateway: AppWebSocketGateway,
  ) {}

  async createWholesaleInvitation(input: any, sellerId: string) {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await this.prisma.wholesale_invitations.create({
      data: {
        seller_id: sellerId,
        buyer_email: input.buyerEmail,
        buyer_name: input.buyerName || null,
        token,
        status: 'pending',
        expires_at: expiresAt,
        wholesale_terms: input.wholesaleTerms || null,
      },
    });

    this.websocketGateway.emitWholesaleInvitationSent(sellerId, {
      invitationId: invitation.id,
      sellerId: invitation.seller_id,
      buyerEmail: invitation.buyer_email,
      buyerName: invitation.buyer_name || undefined,
    });

    return this.mapInvitationToGraphQL(invitation);
  }

  async getWholesaleInvitations(sellerId: string) {
    const invitations = await this.prisma.wholesale_invitations.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' },
    });

    return invitations.map(inv => this.mapInvitationToGraphQL(inv));
  }

  async getWholesaleInvitationByToken(token: string) {
    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new GraphQLError('Invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (invitation.status !== 'pending') {
      throw new GraphQLError('Invitation has already been processed', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    if (invitation.expires_at && new Date() > invitation.expires_at) {
      throw new GraphQLError('Invitation has expired', {
        extensions: { code: 'EXPIRED' },
      });
    }

    return this.mapInvitationToGraphQL(invitation);
  }

  async acceptWholesaleInvitation(token: string, buyerId: string) {
    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new GraphQLError('Invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (invitation.status !== 'pending') {
      throw new GraphQLError('Invitation has already been processed', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    if (invitation.expires_at && new Date() > invitation.expires_at) {
      throw new GraphQLError('Invitation has expired', {
        extensions: { code: 'EXPIRED' },
      });
    }

    const existingGrant = await this.prisma.wholesale_access_grants.findFirst({
      where: {
        buyer_id: buyerId,
        seller_id: invitation.seller_id,
      },
    });

    if (existingGrant) {
      throw new GraphQLError('Access already granted', {
        extensions: { code: 'ALREADY_EXISTS' },
      });
    }

    await this.prisma.wholesale_invitations.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        accepted_at: new Date(),
      },
    });

    const grant = await this.prisma.wholesale_access_grants.create({
      data: {
        buyer_id: buyerId,
        seller_id: invitation.seller_id,
        status: 'active',
        wholesale_terms: invitation.wholesale_terms,
      },
    });

    this.websocketGateway.emitWholesaleInvitationAccepted(
      invitation.seller_id,
      buyerId,
      {
        invitationId: invitation.id,
        sellerId: invitation.seller_id,
        buyerId,
        buyerEmail: invitation.buyer_email,
      }
    );

    return this.mapAccessGrantToGraphQL(grant);
  }

  async rejectWholesaleInvitation(token: string) {
    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new GraphQLError('Invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (invitation.status !== 'pending') {
      throw new GraphQLError('Invitation has already been processed', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    await this.prisma.wholesale_invitations.update({
      where: { id: invitation.id },
      data: {
        status: 'rejected',
      },
    });

    this.websocketGateway.emitWholesaleInvitationRejected(invitation.seller_id, {
      invitationId: invitation.id,
      sellerId: invitation.seller_id,
      buyerEmail: invitation.buyer_email,
    });

    return true;
  }

  async getWholesaleAccessGrants(userId: string, userType?: string) {
    const where: any = {};
    
    if (userType === 'buyer') {
      where.buyer_id = userId;
    } else if (userType === 'seller') {
      where.seller_id = userId;
    } else {
      where.OR = [
        { buyer_id: userId },
        { seller_id: userId },
      ];
    }

    const grants = await this.prisma.wholesale_access_grants.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return grants.map(grant => this.mapAccessGrantToGraphQL(grant));
  }

  async placeWholesaleOrder(input: any, buyerId: string) {
    const { sellerId, items, shippingAddress, billingAddress, poNumber, paymentTerms } = input;

    const hasAccess = await this.prisma.wholesale_access_grants.findFirst({
      where: {
        buyer_id: buyerId,
        seller_id: sellerId,
        status: 'active',
      },
    });

    if (!hasAccess) {
      throw new GraphQLError('No wholesale access to this seller', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const invitation = await this.prisma.wholesale_invitations.findFirst({
      where: {
        buyer_id: buyerId,
        seller_id: sellerId,
        status: 'accepted',
      },
      orderBy: { accepted_at: 'desc' },
    });

    if (!invitation) {
      throw new GraphQLError('Wholesale invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    let subtotalCents = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await this.prisma.products.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new GraphQLError(`Product ${item.productId} not found`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (product.seller_id !== sellerId) {
        throw new GraphQLError(`Product ${item.productId} does not belong to this seller`, {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const unitPriceCents = item.unitPrice 
        ? Math.round(parseFloat(item.unitPrice) * 100)
        : Math.round(parseFloat(product.price.toString()) * 100);

      const itemSubtotalCents = unitPriceCents * item.quantity;
      subtotalCents += itemSubtotalCents;

      orderItems.push({
        product_id: item.productId,
        product_name: product.name,
        product_image: product.image || null,
        product_sku: product.sku || null,
        quantity: item.quantity,
        moq: 1,
        unit_price_cents: unitPriceCents,
        subtotal_cents: itemSubtotalCents,
        variant: item.variant || null,
      });
    }

    const validationItems = items.map((item: any) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    const validation = await this.wholesaleRulesService.validateWholesaleOrder(
      invitation.id,
      validationItems,
      paymentTerms || 'Net 30',
    );

    if (!validation.valid) {
      throw new GraphQLError(
        `Wholesale order validation failed: ${validation.errors.join('; ')}`,
        { extensions: { code: 'WHOLESALE_VALIDATION_FAILED', validation } },
      );
    }

    const depositPercentage = validation.depositCalculation.depositPercentage;
    const depositAmountCents = Math.round(subtotalCents * (depositPercentage / 100));
    const balanceAmountCents = subtotalCents - depositAmountCents;

    const orderNumber = `WHS-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const buyer = await this.prisma.users.findUnique({
      where: { id: buyerId },
    });

    const buyerName = buyer
      ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim()
      : '';

    const order = await this.prisma.wholesale_orders.create({
      data: {
        order_number: orderNumber,
        seller_id: sellerId,
        buyer_id: buyerId,
        status: 'pending',
        subtotal_cents: subtotalCents,
        tax_amount_cents: 0,
        total_cents: subtotalCents,
        deposit_amount_cents: depositAmountCents,
        balance_amount_cents: balanceAmountCents,
        deposit_percentage: depositPercentage,
        balance_percentage: 100 - depositPercentage,
        payment_terms: paymentTerms || 'Net 30',
        po_number: poNumber || null,
        buyer_email: buyer?.email || '',
        buyer_name: buyerName,
        currency: 'USD',
      },
    });

    for (const itemData of orderItems) {
      await this.prisma.wholesale_order_items.create({
        data: {
          wholesale_order_id: order.id,
          ...itemData,
        },
      });
    }

    await this.prisma.wholesale_order_events.create({
      data: {
        wholesale_order_id: order.id,
        event_type: 'order_created',
        description: 'Wholesale order placed',
        performed_by: buyerId,
      },
    });

    this.websocketGateway.emitWholesaleOrderPlaced(sellerId, buyerId, {
      orderId: order.id,
      sellerId: order.seller_id,
      buyerId: order.buyer_id,
      total: (order.total_cents / 100).toString(),
      depositAmount: (order.deposit_amount_cents / 100).toString(),
      balanceAmount: (order.balance_amount_cents / 100).toString(),
      paymentTerms: order.payment_terms,
    });

    return this.mapWholesaleOrderToGraphQL(order);
  }

  async getWholesaleOrders(args: {
    sellerId?: string;
    buyerId?: string;
    status?: string;
  }) {
    const { sellerId, buyerId, status } = args;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (buyerId) where.buyer_id = buyerId;
    if (status) where.status = status.toLowerCase();

    const orders = await this.prisma.wholesale_orders.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return orders.map(order => this.mapWholesaleOrderToGraphQL(order));
  }

  async getWholesaleOrder(orderId: string) {
    const order = await this.prisma.wholesale_orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new GraphQLError('Wholesale order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapWholesaleOrderToGraphQL(order);
  }

  async getWholesaleOrderItems(orderId: string) {
    const items = await this.prisma.wholesale_order_items.findMany({
      where: { wholesale_order_id: orderId },
      orderBy: { created_at: 'asc' },
    });

    return items.map(item => this.mapWholesaleOrderItemToGraphQL(item));
  }

  async getWholesaleOrderEvents(orderId: string) {
    const events = await this.prisma.wholesale_order_events.findMany({
      where: { wholesale_order_id: orderId },
      orderBy: { occurred_at: 'desc' },
    });

    return events.map(event => ({
      id: event.id,
      orderId: event.wholesale_order_id,
      eventType: event.event_type,
      description: event.description,
      metadata: event.payload,
      performedBy: event.performed_by,
      createdAt: event.occurred_at,
    }));
  }

  private mapInvitationToGraphQL(invitation: any) {
    return {
      id: invitation.id,
      sellerId: invitation.seller_id,
      buyerEmail: invitation.buyer_email,
      buyerId: null,
      status: invitation.status.toUpperCase(),
      token: invitation.token,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      rejectedAt: null,
      createdAt: invitation.created_at,
    };
  }

  private mapAccessGrantToGraphQL(grant: any) {
    return {
      id: grant.id,
      sellerId: grant.seller_id,
      buyerId: grant.buyer_id,
      isActive: grant.status === 'active',
      pricingTierId: null,
      grantedAt: grant.created_at,
      revokedAt: grant.revoked_at,
    };
  }

  private mapWholesaleOrderToGraphQL(order: any) {
    return {
      id: order.id,
      orderNumber: order.order_number,
      sellerId: order.seller_id,
      buyerId: order.buyer_id,
      status: order.status.toUpperCase(),
      paymentStatus: 'PENDING',
      subtotal: order.subtotal_cents / 100,
      taxAmount: (order.tax_amount_cents || 0) / 100,
      totalAmount: order.total_cents / 100,
      currency: order.currency || 'USD',
      depositAmount: order.deposit_amount_cents / 100,
      depositPercentage: order.deposit_percentage ? parseFloat(order.deposit_percentage.toString()) : null,
      balanceDue: order.balance_amount_cents / 100,
      paymentTerms: order.payment_terms,
      poNumber: order.po_number,
      vatNumber: order.vat_number,
      incoterms: order.incoterms,
      buyerCompanyName: order.buyer_company_name,
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name,
      expectedShipDate: order.expected_ship_date,
      balancePaymentDueDate: order.balance_payment_due_date,
      trackingNumber: null,
      carrier: null,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }

  private mapWholesaleOrderItemToGraphQL(item: any) {
    return {
      id: item.id,
      orderId: item.wholesale_order_id,
      productId: item.product_id,
      productName: item.product_name,
      productSku: item.product_sku,
      quantity: item.quantity,
      unitPrice: item.unit_price_cents / 100,
      lineTotal: item.subtotal_cents / 100,
      discountPercentage: null,
      createdAt: item.created_at,
    };
  }

  private generateToken(): string {
    return `whs_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
