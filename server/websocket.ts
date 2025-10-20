import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from './logger';
import type WebSocket from 'ws';

interface OrderUpdateMessage {
  type: 'order_updated';
  orderId: string;
  data: {
    paymentStatus?: string;
    amountPaid?: string;
    status?: string;
    events?: any[];
  };
}

type WebSocketMessage = OrderUpdateMessage;

export class OrderWebSocketService {
  private wss: WebSocketServer | null = null;

  setWSS(websocketServer: WebSocketServer) {
    this.wss = websocketServer;
  }

  /**
   * Broadcast order update to all connected clients
   */
  broadcastOrderUpdate(orderId: string, data: OrderUpdateMessage['data']) {
    if (!this.wss) {
      logger.warn('[WebSocket] Cannot broadcast - server not initialized');
      return;
    }

    const message: WebSocketMessage = {
      type: 'order_updated',
      orderId,
      data,
    };

    const messageStr = JSON.stringify(message);

    logger.info('[WebSocket] Order update broadcasted', {
      orderId,
      updateData: JSON.stringify(data)
    });

    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    if (!this.wss) {
      return {
        totalConnections: 0,
        activeConnections: 0,
      };
    }
    
    return {
      totalConnections: this.wss.clients.size,
      activeConnections: this.wss.clients.size,
    };
  }
}

export class SettingsSocketService {
  private io: SocketIOServer | null = null;

  setIO(socketIO: SocketIOServer) {
    this.io = socketIO;
  }

  /**
   * Emit storefront branding updates (logo, banner, policies)
   * Targets: Seller dashboard + Storefront viewers
   */
  emitBrandingUpdated(sellerId: string, data: {
    storeBanner?: string | null;
    storeLogo?: string | null;
    shippingPolicy?: string | null;
    returnsPolicy?: string | null;
  }) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit('storefront:branding_updated', data);
    this.io.to(`storefront:${sellerId}`).emit('storefront:branding_updated', data);
  }

  /**
   * Emit contact/footer updates (social links, contact email, about story)
   * Targets: Seller dashboard + Storefront viewers
   */
  emitContactUpdated(sellerId: string, data: {
    aboutStory?: string | null;
    contactEmail?: string | null;
    socialInstagram?: string | null;
    socialTwitter?: string | null;
    socialTiktok?: string | null;
    socialSnapchat?: string | null;
    socialWebsite?: string | null;
  }) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit('storefront:contact_updated', data);
    this.io.to(`storefront:${sellerId}`).emit('storefront:contact_updated', data);
  }

  /**
   * Emit store status changes (active/inactive)
   * Targets: Seller dashboard + Storefront viewers
   */
  emitStoreStatusUpdated(sellerId: string, data: { storeActive: number }) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit('storefront:status_updated', data);
    this.io.to(`storefront:${sellerId}`).emit('storefront:status_updated', data);
  }

  /**
   * Emit T&C settings updates
   * Targets: Seller dashboard + Storefront viewers
   */
  emitTermsUpdated(sellerId: string, data: {
    termsSource?: string | null;
    termsPdfUrl?: string | null;
  }) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit('storefront:terms_updated', data);
    this.io.to(`storefront:${sellerId}`).emit('storefront:terms_updated', data);
  }

  /**
   * Emit username changes
   * Targets: Seller dashboard + Storefront viewers
   */
  emitUsernameUpdated(sellerId: string, data: { username: string }) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit('storefront:username_updated', data);
    this.io.to(`storefront:${sellerId}`).emit('storefront:username_updated', data);
  }

  /**
   * Emit internal settings (warehouse, payment provider, tax, shipping, domain)
   * Targets: Seller dashboard only
   */
  emitInternalSettingsUpdated(sellerId: string, settingType: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit(`settings:${settingType}_updated`, data);
  }
}

export const orderWebSocketService = new OrderWebSocketService();
export const settingsSocketService = new SettingsSocketService();

/**
 * Configure WebSocket services - creates BOTH native WebSocket and Socket.IO servers
 * - Native WebSocket for order updates (/ws/orders) - backward compatible with existing frontend
 * - Socket.IO for settings updates (/socket.io/) - new functionality
 */
export function configureWebSocket(httpServer: HTTPServer) {
  // Create NATIVE WebSocket server for orders
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/orders'
  });

  wss.on('connection', (ws: WebSocket) => {
    logger.info('[WebSocket] Native WS client connected for orders');
    
    ws.on('close', () => {
      logger.info('[WebSocket] Native WS client disconnected');
    });

    ws.on('error', (error: Error) => {
      logger.error('[WebSocket] Native WS client error:', error);
    });
  });

  orderWebSocketService.setWSS(wss);

  // Create Socket.IO server for settings (on different path)
  const io = new SocketIOServer(httpServer, {
    path: '/socket.io/',
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info('[WebSocket] Socket.IO client connected for settings', { socketId: socket.id });
    
    socket.on('join', (room: string) => {
      socket.join(room);
      logger.info('[WebSocket] Socket.IO client joined room', { socketId: socket.id, room });
    });

    socket.on('disconnect', () => {
      logger.info('[WebSocket] Socket.IO client disconnected', { socketId: socket.id });
    });

    socket.on('error', (error) => {
      logger.error('[WebSocket] Socket.IO client error:', error);
    });
  });

  settingsSocketService.setIO(io);

  logger.info('[WebSocket] Dual websocket system configured: Native WS for orders + Socket.IO for settings');
}
