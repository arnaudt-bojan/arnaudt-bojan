import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { Prisma } from '../../../../../generated/prisma';
import { WholesaleRulesService } from '../wholesale-rules/wholesale-rules.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class WholesaleService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private pricingService: PricingService,
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

    // Pre-transaction validation
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

    // Transaction: Update invitation and create access grant atomically
    const grant = await this.prisma.runTransaction(async (tx) => {
      // Step 1: Update invitation status
      await tx.wholesale_invitations.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          accepted_at: new Date(),
        },
      });

      // Step 2: Create access grant
      return await tx.wholesale_access_grants.create({
        data: {
          buyer_id: buyerId,
          seller_id: invitation.seller_id,
          status: 'active',
          wholesale_terms: invitation.wholesale_terms,
        },
      });
    });

    // Cache invalidation: Clear wholesale invitation/grant caches
    await this.cacheService.delPattern(`wholesale:invitations:seller:${invitation.seller_id}`);
    await this.cacheService.delPattern(`wholesale:grants:buyer:${buyerId}`);
    await this.cacheService.delPattern(`wholesale:grants:seller:${invitation.seller_id}`);

    // External API calls (Socket.IO) - OUTSIDE transaction
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

  async cancelInvitation(invitationId: string, sellerId: string) {
    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new GraphQLError('Invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Only the seller who created the invitation can cancel it
    if (invitation.seller_id !== sellerId) {
      throw new GraphQLError('Access denied', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (invitation.status !== 'pending') {
      throw new GraphQLError('Only pending invitations can be cancelled', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const updatedInvitation = await this.prisma.wholesale_invitations.update({
      where: { id: invitationId },
      data: {
        status: 'cancelled',
      },
    });

    // Cache invalidation
    await this.cacheService.delPattern(`wholesale:invitations:seller:${sellerId}`);

    // Emit socket event (notification)
    this.websocketGateway.emitNotification(sellerId, {
      type: 'wholesale_invitation_cancelled',
      invitationId: updatedInvitation.id,
      buyerEmail: updatedInvitation.buyer_email,
    });

    return this.mapInvitationToGraphQL(updatedInvitation);
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

  async listWholesaleBuyers(sellerId: string) {
    const grants = await this.prisma.wholesale_access_grants.findMany({
      where: {
        seller_id: sellerId,
        status: 'active',
      },
      orderBy: { created_at: 'desc' },
    });

    const mappedGrants = grants.map(grant => this.mapAccessGrantToGraphQL(grant));

    return {
      edges: mappedGrants.map(node => ({
        cursor: Buffer.from(JSON.stringify({ id: node.id })).toString('base64'),
        node,
      })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: mappedGrants.length,
    };
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

    // Access already verified via wholesale_access_grants above
    // wholesale_invitations uses buyer_email not buyer_id, so we skip this check
    // since the access grant check is sufficient

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
      hasAccess.id,  // Use access grant ID instead of invitation ID
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

    // Transaction: Create wholesale order, order items, and event atomically
    const order = await this.prisma.runTransaction(async (tx) => {
      // Step 1: Create wholesale order
      const created = await tx.wholesale_orders.create({
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

      // Step 2: Create wholesale order items
      for (const itemData of orderItems) {
        await tx.wholesale_order_items.create({
          data: {
            wholesale_order_id: created.id,
            ...itemData,
          },
        });
      }

      // Step 3: Create wholesale order event
      await tx.wholesale_order_events.create({
        data: {
          wholesale_order_id: created.id,
          event_type: 'order_created',
          description: 'Wholesale order placed',
          performed_by: buyerId,
        },
      });

      return created;
    });

    // Cache invalidation: Clear wholesale order caches
    await this.cacheService.delPattern(`wholesale:orders:buyer:${buyerId}`);
    await this.cacheService.delPattern(`wholesale:orders:seller:${sellerId}`);

    // External API calls (Socket.IO) - OUTSIDE transaction
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
    first?: number;
    after?: string;
  }) {
    const { sellerId, buyerId, status, first = 20, after } = args;

    // Enforce max 100 limit (Relay pagination best practice)
    const take = Math.min(first, 100);

    // Decode cursor
    let cursor;
    if (after) {
      try {
        const decoded = JSON.parse(Buffer.from(after, 'base64').toString('utf-8'));
        cursor = { id: decoded.id };
      } catch (e) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
    }

    // Build where clause
    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (buyerId) where.buyer_id = buyerId;
    if (status) where.status = status.toLowerCase();

    // Fetch orders with cursor pagination
    const orders = await this.prisma.wholesale_orders.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: take + 1,
      ...(cursor && { skip: 1, cursor }),
    });

    // Calculate hasNextPage
    const hasNextPage = orders.length > take;
    const nodes = hasNextPage ? orders.slice(0, take) : orders;

    // Get total count
    const totalCount = await this.prisma.wholesale_orders.count({ where });

    // Map to GraphQL format
    const mappedOrders = nodes.map(order => this.mapWholesaleOrderToGraphQL(order));

    // Build edges
    const edges = mappedOrders.map((node, index) => ({
      cursor: Buffer.from(JSON.stringify({ id: nodes[index].id })).toString('base64'),
      node,
    }));

    // Return connection-shaped response
    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!after,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
      totalCount,
    };
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

  // ============================================================================
  // Wholesale Cart Methods - All pricing calculated server-side
  // ============================================================================

  /**
   * Get wholesale cart with server-calculated totals
   */
  async getWholesaleCart(buyerId: string, sellerId?: string) {
    const where: any = { buyer_id: buyerId };
    if (sellerId) {
      where.seller_id = sellerId;
    }

    let cart = await this.prisma.wholesale_carts.findFirst({ where });

    if (!cart) {
      cart = await this.prisma.wholesale_carts.create({
        data: {
          buyer_id: buyerId,
          seller_id: sellerId || '',
          items: [],
          currency: 'USD',
        },
      });
    }

    return this.mapWholesaleCartToGraphQL(cart);
  }

  /**
   * Add item to wholesale cart with server-side calculations
   */
  async addToWholesaleCart(input: {
    buyerId: string;
    sellerId: string;
    productId: string;
    quantity: number;
  }) {
    const { buyerId, sellerId, productId, quantity } = input;

    const product = await this.prisma.wholesale_products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new GraphQLError('Product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    let cart = await this.prisma.wholesale_carts.findFirst({
      where: { buyer_id: buyerId, seller_id: sellerId },
    });

    const items = cart ? (cart.items as any[]) : [];
    const existingItemIndex = items.findIndex((item: any) => item.productId === productId);

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity += quantity;
    } else {
      items.push({
        productId,
        productName: product.name,
        productSku: product.sku,
        productImage: product.image,
        quantity,
        unitPriceCents: Math.round(parseFloat(product.wholesale_price.toString()) * 100),
        moq: product.moq || 1,
      });
    }

    if (!cart) {
      cart = await this.prisma.wholesale_carts.create({
        data: {
          buyer_id: buyerId,
          seller_id: sellerId,
          items,
          currency: 'USD',
        },
      });
    } else {
      cart = await this.prisma.wholesale_carts.update({
        where: { id: cart.id },
        data: {
          items,
          updated_at: new Date(),
        },
      });
    }

    return this.mapWholesaleCartToGraphQL(cart);
  }

  /**
   * Update wholesale cart item quantity with server-side recalculation
   */
  async updateWholesaleCartItem(itemId: string, quantity: number, buyerId: string) {
    const cart = await this.prisma.wholesale_carts.findFirst({
      where: { buyer_id: buyerId },
    });

    if (!cart) {
      throw new GraphQLError('Cart not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const items = (cart.items as any[]) || [];
    const itemIndex = items.findIndex((item: any) => item.productId === itemId);

    if (itemIndex === -1) {
      throw new GraphQLError('Item not found in cart', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    items[itemIndex].quantity = quantity;

    const updatedCart = await this.prisma.wholesale_carts.update({
      where: { id: cart.id },
      data: {
        items,
        updated_at: new Date(),
      },
    });

    return this.mapWholesaleCartToGraphQL(updatedCart);
  }

  /**
   * Remove item from wholesale cart
   */
  async removeFromWholesaleCart(itemId: string, buyerId: string) {
    const cart = await this.prisma.wholesale_carts.findFirst({
      where: { buyer_id: buyerId },
    });

    if (!cart) {
      throw new GraphQLError('Cart not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const items = (cart.items as any[]) || [];
    const filteredItems = items.filter((item: any) => item.productId !== itemId);

    const updatedCart = await this.prisma.wholesale_carts.update({
      where: { id: cart.id },
      data: {
        items: filteredItems,
        updated_at: new Date(),
      },
    });

    return this.mapWholesaleCartToGraphQL(updatedCart);
  }

  /**
   * Map wholesale cart to GraphQL with SERVER-CALCULATED totals
   */
  private mapWholesaleCartToGraphQL(cart: any) {
    const items = (cart.items as any[]) || [];

    const calculated = this.pricingService.calculateWholesaleCartTotals({
      items: items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        moq: item.moq,
      })),
      depositPercentage: 30,
    });

    return {
      id: cart.id,
      buyerId: cart.buyer_id,
      sellerId: cart.seller_id,
      subtotalCents: calculated.subtotalCents,
      depositCents: calculated.depositCents,
      balanceDueCents: calculated.balanceDueCents,
      depositPercentage: calculated.depositPercentage,
      currency: cart.currency || 'USD',
      updatedAt: cart.updated_at,
      items: items.map((item: any, index: number) => {
        const calculatedItem = calculated.items[index];
        return {
          id: item.productId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          productImage: item.productImage,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: calculatedItem.lineTotalCents,
          moq: item.moq,
          moqCompliant: calculatedItem.moqCompliant,
        };
      }),
    };
  }
}
