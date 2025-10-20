import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from './logger';
import type WebSocket from 'ws';
import type { RequestHandler } from 'express';
import passport from 'passport';

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
 * - Socket.IO for settings updates (/socket.io/) - new functionality with session authentication
 */
export function configureWebSocket(httpServer: HTTPServer, sessionMiddleware: RequestHandler) {
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

  // Create Socket.IO server for settings with SESSION AUTHENTICATION
  const io = new SocketIOServer(httpServer, {
    path: '/socket.io/',
    cors: {
      origin: true,
      credentials: true, // IMPORTANT: Allow credentials for session cookies
    },
  });

  // Apply session middleware to Socket.IO engine for authentication
  // This allows access to req.session and req.user in Socket.IO handlers
  io.engine.use(sessionMiddleware);
  
  // Apply passport middleware to Socket.IO for user deserialization
  io.engine.use(passport.initialize());
  io.engine.use(passport.session());

  // AUTHENTICATION MIDDLEWARE - Verify session before connection
  io.use((socket, next) => {
    const req = socket.request as any;
    
    // Check if user is authenticated via passport session
    if (req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      socket.data.userId = userId;
      socket.data.authenticated = true;
      logger.info(`[Socket.IO] Authenticated connection for user: ${userId}`);
      next();
    } else {
      logger.warn('[Socket.IO] Unauthenticated connection rejected');
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info(`[Socket.IO] Client connected (authenticated): ${userId}`);
    
    // AUTO-JOIN: User's own room (server-controlled)
    socket.join(`user:${userId}`);
    logger.info(`[Socket.IO] User ${userId} auto-joined room: user:${userId}`);
    
    // VALIDATED JOIN: Allow authenticated users to join public rooms
    socket.on('join', (room: string) => {
      // SECURITY: Only allow storefront:{sellerId} and product:{productId} format
      if (typeof room === 'string' && room.startsWith('storefront:')) {
        const sellerId = room.split(':')[1];
        
        // Basic validation: sellerId should not be empty
        if (sellerId && sellerId.length > 0) {
          socket.join(room);
          logger.info(`[Socket.IO] User ${userId} joined validated room: ${room}`);
        } else {
          logger.warn(`[Socket.IO] Invalid storefront room format rejected: ${room}`);
        }
      } else if (typeof room === 'string' && room.startsWith('product:')) {
        // Future: Allow product rooms for real-time product updates
        const productId = room.split(':')[1];
        if (productId && productId.length > 0) {
          socket.join(room);
          logger.info(`[Socket.IO] User ${userId} joined validated room: ${room}`);
        } else {
          logger.warn(`[Socket.IO] Invalid product room format rejected: ${room}`);
        }
      } else {
        logger.warn(`[Socket.IO] Unauthorized room join attempt rejected: ${room} by user: ${userId}`);
      }
    });
    
    socket.on('disconnect', () => {
      logger.info(`[Socket.IO] Client disconnected: ${userId}`);
    });

    socket.on('error', (error) => {
      logger.error('[Socket.IO] Client error:', error, { userId });
    });
  });

  settingsSocketService.setIO(io);

  logger.info('[WebSocket] Dual websocket system configured: Native WS for orders + Socket.IO for settings (authenticated)');
}
