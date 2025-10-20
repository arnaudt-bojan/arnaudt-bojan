import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import type {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
  ProductStockChangedEvent,
  ProductPriceChangedEvent,
  ProductLowStockEvent,
} from './events/product.events';
import type {
  WholesaleInvitationSentEvent,
  WholesaleInvitationAcceptedEvent,
  WholesaleInvitationRejectedEvent,
  WholesaleOrderPlacedEvent,
  WholesaleOrderUpdatedEvent,
  WholesaleDepositPaidEvent,
  WholesaleBalancePaidEvent,
  WholesaleOrderShippedEvent,
} from './events/wholesale.events';
import type {
  QuotationCreatedEvent,
  QuotationUpdatedEvent,
  QuotationSentEvent,
  QuotationViewedEvent,
  QuotationAcceptedEvent,
  QuotationRejectedEvent,
  QuotationExpiredEvent,
} from './events/quotation.events';
import type {
  AnalyticsSaleCompletedEvent,
  AnalyticsProductViewedEvent,
  AnalyticsRevenueUpdatedEvent,
  AnalyticsInventoryAlertEvent,
  AnalyticsMetricsUpdatedEvent,
} from './events/analytics.events';
import type {
  StockLowEvent,
  StockOutEvent,
  StockRestockedEvent,
} from './events/stock.events';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true,
  },
})
@Injectable()
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);
  private connectedUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.connectedUsers.set(client.id, userId);
      client.join(`user:${userId}`);
      this.logger.log(`User ${userId} joined room user:${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    this.logger.log(`Client disconnected: ${client.id}${userId ? ` (user: ${userId})` : ''}`);
    this.connectedUsers.delete(client.id);
  }

  emitOrderUpdate(userId: string, order: any) {
    this.logger.debug(`Emitting order update to user:${userId}`);
    this.server.to(`user:${userId}`).emit('order:updated', {
      ...order,
      timestamp: new Date(),
    });
  }

  emitCartUpdate(userId: string, cart: any) {
    this.logger.debug(`Emitting cart update to user:${userId}`);
    this.server.to(`user:${userId}`).emit('cart:updated', {
      ...cart,
      timestamp: new Date(),
    });
  }

  emitNotification(userId: string, notification: any) {
    this.logger.debug(`Emitting notification to user:${userId}`);
    this.server.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  broadcastToSellers(event: string, data: any) {
    this.logger.debug(`Broadcasting ${event} to all sellers`);
    this.server.to('sellers').emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  emitProductCreated(sellerId: string, event: Omit<ProductCreatedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting product created to seller:${sellerId}`);
    const payload: ProductCreatedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('product:created', payload);
    this.server.to(`storefront:${sellerId}`).emit('product:created', payload);
  }

  emitProductUpdated(sellerId: string, event: Omit<ProductUpdatedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting product updated: ${event.productId}`);
    const payload: ProductUpdatedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('product:updated', payload);
    this.server.to(`product:${event.productId}`).emit('product:updated', payload);
    this.server.to(`storefront:${sellerId}`).emit('product:updated', payload);
  }

  emitProductDeleted(sellerId: string, event: Omit<ProductDeletedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting product deleted: ${event.productId}`);
    const payload: ProductDeletedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('product:deleted', payload);
    this.server.to(`product:${event.productId}`).emit('product:deleted', payload);
  }

  emitProductStockChanged(sellerId: string, event: Omit<ProductStockChangedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting stock changed for product: ${event.productId}`);
    const payload: ProductStockChangedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('product:stock_changed', payload);
    this.server.to(`product:${event.productId}`).emit('product:stock_changed', payload);
  }

  emitProductPriceChanged(sellerId: string, event: Omit<ProductPriceChangedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting price changed for product: ${event.productId}`);
    const payload: ProductPriceChangedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('product:price_changed', payload);
    this.server.to(`product:${event.productId}`).emit('product:price_changed', payload);
  }

  emitProductLowStock(sellerId: string, event: Omit<ProductLowStockEvent, 'timestamp'>) {
    this.logger.debug(`Emitting low stock alert for product: ${event.productId}`);
    const payload: ProductLowStockEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('product:low_stock', payload);
  }

  emitWholesaleInvitationSent(sellerId: string, event: Omit<WholesaleInvitationSentEvent, 'timestamp'>) {
    this.logger.debug(`Emitting wholesale invitation sent: ${event.invitationId}`);
    const payload: WholesaleInvitationSentEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('wholesale:invitation_sent', payload);
  }

  emitWholesaleInvitationAccepted(sellerId: string, buyerId: string, event: Omit<WholesaleInvitationAcceptedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting wholesale invitation accepted: ${event.invitationId}`);
    const payload: WholesaleInvitationAcceptedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('wholesale:invitation_accepted', payload);
    this.server.to(`user:${buyerId}`).emit('wholesale:invitation_accepted', payload);
  }

  emitWholesaleInvitationRejected(sellerId: string, event: Omit<WholesaleInvitationRejectedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting wholesale invitation rejected: ${event.invitationId}`);
    const payload: WholesaleInvitationRejectedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('wholesale:invitation_rejected', payload);
  }

  emitWholesaleOrderPlaced(sellerId: string, buyerId: string, event: Omit<WholesaleOrderPlacedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting wholesale order placed: ${event.orderId}`);
    const payload: WholesaleOrderPlacedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('wholesale:order_placed', payload);
    this.server.to(`user:${buyerId}`).emit('wholesale:order_placed', payload);
  }

  emitWholesaleOrderUpdated(sellerId: string, buyerId: string, event: Omit<WholesaleOrderUpdatedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting wholesale order updated: ${event.orderId}`);
    const payload: WholesaleOrderUpdatedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('wholesale:order_updated', payload);
    this.server.to(`user:${buyerId}`).emit('wholesale:order_updated', payload);
  }

  emitWholesaleDepositPaid(sellerId: string, buyerId: string, event: Omit<WholesaleDepositPaidEvent, 'timestamp'>) {
    this.logger.debug(`Emitting wholesale deposit paid: ${event.orderId}`);
    const payload: WholesaleDepositPaidEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('wholesale:deposit_paid', payload);
    this.server.to(`user:${buyerId}`).emit('wholesale:deposit_paid', payload);
  }

  emitWholesaleBalancePaid(sellerId: string, buyerId: string, event: Omit<WholesaleBalancePaidEvent, 'timestamp'>) {
    this.logger.debug(`Emitting wholesale balance paid: ${event.orderId}`);
    const payload: WholesaleBalancePaidEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('wholesale:balance_paid', payload);
    this.server.to(`user:${buyerId}`).emit('wholesale:balance_paid', payload);
  }

  emitWholesaleOrderShipped(buyerId: string, event: Omit<WholesaleOrderShippedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting wholesale order shipped: ${event.orderId}`);
    const payload: WholesaleOrderShippedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${buyerId}`).emit('wholesale:order_shipped', payload);
  }

  emitQuotationCreated(sellerId: string, event: Omit<QuotationCreatedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting quotation created: ${event.quotationId}`);
    const payload: QuotationCreatedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('quotation:created', payload);
  }

  emitQuotationUpdated(sellerId: string, buyerId: string | null, event: Omit<QuotationUpdatedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting quotation updated: ${event.quotationId}`);
    const payload: QuotationUpdatedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('quotation:updated', payload);
    if (buyerId) {
      this.server.to(`user:${buyerId}`).emit('quotation:updated', payload);
    }
  }

  emitQuotationSent(sellerId: string, buyerId: string | null, event: Omit<QuotationSentEvent, 'timestamp'>) {
    this.logger.debug(`Emitting quotation sent: ${event.quotationId}`);
    const payload: QuotationSentEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('quotation:sent', payload);
    if (buyerId) {
      this.server.to(`user:${buyerId}`).emit('quotation:sent', payload);
    }
  }

  emitQuotationViewed(sellerId: string, event: Omit<QuotationViewedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting quotation viewed: ${event.quotationId}`);
    const payload: QuotationViewedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('quotation:viewed', payload);
  }

  emitQuotationAccepted(sellerId: string, buyerId: string, event: Omit<QuotationAcceptedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting quotation accepted: ${event.quotationId}`);
    const payload: QuotationAcceptedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('quotation:accepted', payload);
    this.server.to(`user:${buyerId}`).emit('quotation:accepted', payload);
  }

  emitQuotationRejected(sellerId: string, buyerId: string, event: Omit<QuotationRejectedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting quotation rejected: ${event.quotationId}`);
    const payload: QuotationRejectedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('quotation:rejected', payload);
    this.server.to(`user:${buyerId}`).emit('quotation:rejected', payload);
  }

  emitQuotationExpired(sellerId: string, buyerId: string | null, event: Omit<QuotationExpiredEvent, 'timestamp'>) {
    this.logger.debug(`Emitting quotation expired: ${event.quotationId}`);
    const payload: QuotationExpiredEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('quotation:expired', payload);
    if (buyerId) {
      this.server.to(`user:${buyerId}`).emit('quotation:expired', payload);
    }
  }

  emitAnalyticsSaleCompleted(sellerId: string, event: Omit<AnalyticsSaleCompletedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting analytics sale completed to seller:${sellerId}`);
    const payload: AnalyticsSaleCompletedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('analytics:sale_completed', payload);
  }

  emitAnalyticsProductViewed(sellerId: string, event: Omit<AnalyticsProductViewedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting analytics product viewed to seller:${sellerId}`);
    const payload: AnalyticsProductViewedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('analytics:product_viewed', payload);
  }

  emitAnalyticsRevenueUpdated(sellerId: string, event: Omit<AnalyticsRevenueUpdatedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting analytics revenue updated to seller:${sellerId}`);
    const payload: AnalyticsRevenueUpdatedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('analytics:revenue_updated', payload);
  }

  emitAnalyticsInventoryAlert(sellerId: string, event: Omit<AnalyticsInventoryAlertEvent, 'timestamp'>) {
    this.logger.debug(`Emitting analytics inventory alert to seller:${sellerId}`);
    const payload: AnalyticsInventoryAlertEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('analytics:inventory_alert', payload);
  }

  emitAnalyticsMetricsUpdated(sellerId: string, event: Omit<AnalyticsMetricsUpdatedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting analytics metrics updated to seller:${sellerId}`);
    const payload: AnalyticsMetricsUpdatedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('analytics:metrics_updated', payload);
  }

  emitStockLow(sellerId: string, event: Omit<StockLowEvent, 'timestamp'>) {
    this.logger.debug(`Emitting stock low alert for product: ${event.productId}`);
    const payload: StockLowEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('stock:low', payload);
  }

  emitStockOut(sellerId: string, event: Omit<StockOutEvent, 'timestamp'>) {
    this.logger.debug(`Emitting stock out alert for product: ${event.productId}`);
    const payload: StockOutEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('stock:out', payload);
    this.server.to(`product:${event.productId}`).emit('stock:out', payload);
  }

  emitStockRestocked(sellerId: string, event: Omit<StockRestockedEvent, 'timestamp'>) {
    this.logger.debug(`Emitting stock restocked for product: ${event.productId}`);
    const payload: StockRestockedEvent = { ...event, timestamp: new Date() };
    this.server.to(`user:${sellerId}`).emit('stock:restocked', payload);
    this.server.to(`product:${event.productId}`).emit('stock:restocked', payload);
  }

  @SubscribeMessage('join:seller')
  handleJoinSeller(@ConnectedSocket() client: Socket) {
    client.join('sellers');
    this.logger.log(`Client ${client.id} joined sellers room`);
    return { success: true };
  }

  @SubscribeMessage('leave:seller')
  handleLeaveSeller(@ConnectedSocket() client: Socket) {
    client.leave('sellers');
    this.logger.log(`Client ${client.id} left sellers room`);
    return { success: true };
  }

  @SubscribeMessage('join:storefront')
  handleJoinStorefront(@ConnectedSocket() client: Socket, payload: { sellerId: string }) {
    const { sellerId } = payload;
    client.join(`storefront:${sellerId}`);
    this.logger.log(`Client ${client.id} joined storefront:${sellerId}`);
    return { success: true };
  }

  @SubscribeMessage('leave:storefront')
  handleLeaveStorefront(@ConnectedSocket() client: Socket, payload: { sellerId: string }) {
    const { sellerId } = payload;
    client.leave(`storefront:${sellerId}`);
    this.logger.log(`Client ${client.id} left storefront:${sellerId}`);
    return { success: true };
  }

  @SubscribeMessage('join:product')
  handleJoinProduct(@ConnectedSocket() client: Socket, payload: { productId: string }) {
    const { productId } = payload;
    client.join(`product:${productId}`);
    this.logger.log(`Client ${client.id} joined product:${productId}`);
    return { success: true };
  }

  @SubscribeMessage('leave:product')
  handleLeaveProduct(@ConnectedSocket() client: Socket, payload: { productId: string }) {
    const { productId } = payload;
    client.leave(`product:${productId}`);
    this.logger.log(`Client ${client.id} left product:${productId}`);
    return { success: true };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { pong: true, timestamp: new Date() };
  }
}
