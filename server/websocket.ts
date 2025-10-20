import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from './logger';
import type { RequestHandler } from 'express';
import passport from 'passport';

// ========================================
// CONNECTION METRICS TRACKING
// ========================================

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  connectionErrors: number;
  authenticationFailures: number;
  roomJoinSuccesses: number;
  roomJoinFailures: number;
  eventsEmitted: {
    orders: number;
    settings: number;
    total: number;
  };
  roomMemberships: Map<string, Set<string>>; // room -> Set of userIds
  lastConnectionError: string | null;
  lastErrorTimestamp: number | null;
}

export const connectionMetrics: ConnectionMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  connectionErrors: 0,
  authenticationFailures: 0,
  roomJoinSuccesses: 0,
  roomJoinFailures: 0,
  eventsEmitted: {
    orders: 0,
    settings: 0,
    total: 0
  },
  roomMemberships: new Map(),
  lastConnectionError: null,
  lastErrorTimestamp: null
};

// Helper to track room membership
function trackRoomMembership(room: string, userId: string, action: 'join' | 'leave') {
  if (action === 'join') {
    if (!connectionMetrics.roomMemberships.has(room)) {
      connectionMetrics.roomMemberships.set(room, new Set());
    }
    connectionMetrics.roomMemberships.get(room)!.add(userId);
  } else {
    const members = connectionMetrics.roomMemberships.get(room);
    if (members) {
      members.delete(userId);
      if (members.size === 0) {
        connectionMetrics.roomMemberships.delete(room);
      }
    }
  }
}

// ========================================
// ORDER SOCKET SERVICE
// ========================================

export class OrderSocketService {
  private io: SocketIOServer | null = null;

  setIO(socketIO: SocketIOServer) {
    this.io = socketIO;
  }

  /**
   * Emit order created event
   * Targets: Seller + Buyer
   */
  emitOrderCreated(orderId: string, buyerId: string, sellerId: string, data?: any) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting order:created', { orderId, buyerId, sellerId });
    this.io.to(`user:${sellerId}`).emit('order:created', { orderId, buyerId, sellerId, ...data });
    this.io.to(`user:${buyerId}`).emit('order:created', { orderId, buyerId, sellerId, ...data });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit order updated event
   * Targets: Seller + Buyer
   */
  emitOrderUpdated(orderId: string, buyerId: string, sellerId: string, data: {
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    amountPaid?: string;
    events?: any[];
  }) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting order:updated', { orderId, buyerId, sellerId, status: data.status });
    this.io.to(`user:${sellerId}`).emit('order:updated', { orderId, buyerId, sellerId, ...data });
    this.io.to(`user:${buyerId}`).emit('order:updated', { orderId, buyerId, sellerId, ...data });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit order payment succeeded event
   * Targets: Seller + Buyer
   */
  emitOrderPaymentSucceeded(orderId: string, buyerId: string, sellerId: string, data: {
    amountPaid?: string;
    paymentStatus?: string;
  }) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting order:payment_succeeded', { orderId, buyerId, sellerId });
    this.io.to(`user:${sellerId}`).emit('order:payment_succeeded', { orderId, buyerId, sellerId, ...data });
    this.io.to(`user:${buyerId}`).emit('order:payment_succeeded', { orderId, buyerId, sellerId, ...data });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit order fulfilled event
   * Targets: Seller + Buyer
   */
  emitOrderFulfilled(orderId: string, buyerId: string, sellerId: string, data: {
    trackingNumber?: string;
    carrier?: string;
    fulfillmentStatus?: string;
  }) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting order:fulfilled', { orderId, trackingNumber: data.trackingNumber });
    this.io.to(`user:${sellerId}`).emit('order:fulfilled', { orderId, buyerId, sellerId, ...data });
    this.io.to(`user:${buyerId}`).emit('order:fulfilled', { orderId, buyerId, sellerId, ...data });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit payment failed event
   * Targets: Seller + Buyer
   */
  emitPaymentFailed(orderId: string, buyerId: string, sellerId: string, message?: string) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting payment:failed', { orderId });
    this.io.to(`user:${sellerId}`).emit('payment:failed', { orderId, buyerId, sellerId, message });
    this.io.to(`user:${buyerId}`).emit('payment:failed', { orderId, buyerId, sellerId, message });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit payment canceled event
   * Targets: Seller + Buyer
   */
  emitPaymentCanceled(orderId: string, buyerId: string, sellerId: string, message?: string) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting payment:canceled', { orderId });
    this.io.to(`user:${sellerId}`).emit('payment:canceled', { orderId, buyerId, sellerId, message });
    this.io.to(`user:${buyerId}`).emit('payment:canceled', { orderId, buyerId, sellerId, message });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit payment refunded event
   * Targets: Seller + Buyer
   */
  emitPaymentRefunded(orderId: string, buyerId: string, sellerId: string, message?: string) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting payment:refunded', { orderId });
    this.io.to(`user:${sellerId}`).emit('payment:refunded', { orderId, buyerId, sellerId, message });
    this.io.to(`user:${buyerId}`).emit('payment:refunded', { orderId, buyerId, sellerId, message });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit refund processed event
   * Targets: Seller + Buyer
   */
  emitRefundProcessed(orderId: string, buyerId: string, sellerId: string, data: {
    refundAmount?: string;
    reason?: string;
  }) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting order:refund_processed', { orderId });
    this.io.to(`user:${sellerId}`).emit('order:refund_processed', { orderId, buyerId, sellerId, ...data });
    this.io.to(`user:${buyerId}`).emit('order:refund_processed', { orderId, buyerId, sellerId, ...data });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit order cancelled event
   * Targets: Seller + Buyer
   */
  emitOrderCancelled(orderId: string, buyerId: string, sellerId: string, reason?: string) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting order:cancelled', { orderId });
    this.io.to(`user:${sellerId}`).emit('order:cancelled', { orderId, buyerId, sellerId, reason });
    this.io.to(`user:${buyerId}`).emit('order:cancelled', { orderId, buyerId, sellerId, reason });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit fulfillment updated event
   * Targets: Seller + Buyer
   */
  emitFulfillmentUpdated(orderId: string, buyerId: string, sellerId: string, data: {
    fulfillmentStatus?: string;
    trackingNumber?: string;
    carrier?: string;
  }) {
    if (!this.io) return;
    logger.info('[Socket.IO] Emitting order:fulfillment_updated', { orderId });
    this.io.to(`user:${sellerId}`).emit('order:fulfillment_updated', { orderId, buyerId, sellerId, ...data });
    this.io.to(`user:${buyerId}`).emit('order:fulfillment_updated', { orderId, buyerId, sellerId, ...data });
    connectionMetrics.eventsEmitted.orders += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }
}

// ========================================
// SETTINGS SOCKET SERVICE
// ========================================

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
    connectionMetrics.eventsEmitted.settings += 2;
    connectionMetrics.eventsEmitted.total += 2;
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
    connectionMetrics.eventsEmitted.settings += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit store status changes (active/inactive)
   * Targets: Seller dashboard + Storefront viewers
   */
  emitStoreStatusUpdated(sellerId: string, data: { storeActive: number }) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit('storefront:status_updated', data);
    this.io.to(`storefront:${sellerId}`).emit('storefront:status_updated', data);
    connectionMetrics.eventsEmitted.settings += 2;
    connectionMetrics.eventsEmitted.total += 2;
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
    connectionMetrics.eventsEmitted.settings += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit username changes
   * Targets: Seller dashboard + Storefront viewers
   */
  emitUsernameUpdated(sellerId: string, data: { username: string }) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit('storefront:username_updated', data);
    this.io.to(`storefront:${sellerId}`).emit('storefront:username_updated', data);
    connectionMetrics.eventsEmitted.settings += 2;
    connectionMetrics.eventsEmitted.total += 2;
  }

  /**
   * Emit internal settings (warehouse, payment provider, tax, shipping, domain)
   * Targets: Seller dashboard only
   */
  emitInternalSettingsUpdated(sellerId: string, settingType: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${sellerId}`).emit(`settings:${settingType}_updated`, data);
    connectionMetrics.eventsEmitted.settings += 1;
    connectionMetrics.eventsEmitted.total += 1;
  }
}

export const orderSocketService = new OrderSocketService();
export const settingsSocketService = new SettingsSocketService();

/**
 * Configure Socket.IO WebSocket service with comprehensive monitoring
 * CONSOLIDATED: Uses Socket.IO only (Native WebSocket removed for simplicity)
 */
export function configureWebSocket(httpServer: HTTPServer, sessionMiddleware: RequestHandler) {
  // Create Socket.IO server with WebSocket-only transport
  // This prevents Vite middleware from interfering with Engine.IO polling
  const io = new SocketIOServer(httpServer, {
    path: '/socket.io/',
    transports: ['websocket'], // WebSocket-only, skip polling
    cors: {
      origin: true,
      credentials: true, // IMPORTANT: Allow credentials for session cookies
    },
  });

  logger.info('[Socket.IO] Server initialized', {
    path: '/socket.io/',
    transports: ['websocket'],
    cors: { origin: true, credentials: true }
  });

  // Apply session middleware to Socket.IO engine for authentication
  logger.info('[Socket.IO] Applying session middleware');
  io.engine.use(sessionMiddleware);
  
  // Apply passport middleware for user deserialization
  logger.info('[Socket.IO] Applying passport middleware');
  io.engine.use(passport.initialize());
  io.engine.use(passport.session());
  
  logger.info('[Socket.IO] Session authentication enabled');

  // Track connection errors
  io.engine.on('connection_error', (err: any) => {
    connectionMetrics.connectionErrors++;
    connectionMetrics.lastConnectionError = err.message;
    connectionMetrics.lastErrorTimestamp = Date.now();
    
    logger.error('[Socket.IO Engine] Connection error:', {
      message: err.message,
      code: err.code,
      errorCount: connectionMetrics.connectionErrors,
      req: {
        method: err.req?.method,
        url: err.req?.url,
        headers: err.req?.headers ? {
          origin: err.req.headers.origin,
          cookie: err.req.headers.cookie ? `present (${err.req.headers.cookie.substring(0, 30)}...)` : 'MISSING',
          'sec-websocket-key': err.req.headers['sec-websocket-key'] ? 'present' : 'missing',
        } : 'no headers'
      }
    });
  });

  // AUTHENTICATION MIDDLEWARE - STRICT MODE
  io.use((socket, next) => {
    const req = socket.request as any;
    
    logger.debug('[Socket.IO] Auth check', {
      hasSession: !!req.session,
      hasUser: !!req.user,
      userClaims: req.user?.claims?.sub,
      sessionID: req.session?.id,
    });
    
    // STRICT AUTH: Only allow authenticated users
    if (req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      socket.data.userId = userId;
      socket.data.authenticated = true;
      logger.info(`[Socket.IO] ✅ Authentication successful for user: ${userId}`);
      next();
    } else {
      connectionMetrics.authenticationFailures++;
      logger.warn('[Socket.IO] ❌ Authentication failed - Connection rejected', {
        hasSession: !!req.session,
        hasUser: !!req.user,
        failureCount: connectionMetrics.authenticationFailures
      });
      next(new Error('Authentication required'));
    }
  });

  // CONNECTION HANDLER with enhanced logging and metrics
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    connectionMetrics.totalConnections++;
    connectionMetrics.activeConnections++;
    
    logger.info(`[Socket.IO] 🔗 Client connected`, {
      userId,
      socketId: socket.id,
      totalConnections: connectionMetrics.totalConnections,
      activeConnections: connectionMetrics.activeConnections
    });
    
    // CRITICAL: AUTO-JOIN USER'S PRIVATE ROOM
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    
    // VERIFY room join succeeded
    const rooms = Array.from(socket.rooms);
    const joinSucceeded = rooms.includes(userRoom);
    
    if (joinSucceeded) {
      connectionMetrics.roomJoinSuccesses++;
      trackRoomMembership(userRoom, userId, 'join');
      logger.info(`[Socket.IO] ✅ Room auto-join SUCCESS`, {
        userId,
        room: userRoom,
        allRooms: rooms,
        successCount: connectionMetrics.roomJoinSuccesses
      });
    } else {
      connectionMetrics.roomJoinFailures++;
      logger.error(`[Socket.IO] ❌ Room auto-join FAILED`, {
        userId,
        room: userRoom,
        attemptedRooms: rooms,
        failureCount: connectionMetrics.roomJoinFailures
      });
    }
    
    // VALIDATED JOIN: Allow authenticated users to join public rooms
    socket.on('join', (room: string) => {
      // SECURITY: Only allow storefront:{sellerId} and product:{productId} format
      if (typeof room === 'string' && room.startsWith('storefront:')) {
        const sellerId = room.split(':')[1];
        
        if (sellerId && sellerId.length > 0) {
          socket.join(room);
          trackRoomMembership(room, userId, 'join');
          connectionMetrics.roomJoinSuccesses++;
          logger.info(`[Socket.IO] ✅ Validated room join`, {
            userId,
            room,
            roomMembers: connectionMetrics.roomMemberships.get(room)?.size || 0
          });
        } else {
          connectionMetrics.roomJoinFailures++;
          logger.warn(`[Socket.IO] ❌ Invalid storefront room format rejected`, { room });
        }
      } else if (typeof room === 'string' && room.startsWith('product:')) {
        const productId = room.split(':')[1];
        if (productId && productId.length > 0) {
          socket.join(room);
          trackRoomMembership(room, userId, 'join');
          connectionMetrics.roomJoinSuccesses++;
          logger.info(`[Socket.IO] ✅ Validated room join`, {
            userId,
            room,
            roomMembers: connectionMetrics.roomMemberships.get(room)?.size || 0
          });
        } else {
          connectionMetrics.roomJoinFailures++;
          logger.warn(`[Socket.IO] ❌ Invalid product room format rejected`, { room });
        }
      } else {
        connectionMetrics.roomJoinFailures++;
        logger.warn(`[Socket.IO] ❌ Unauthorized room join attempt rejected`, { userId, room });
      }
    });
    
    // DISCONNECT HANDLER
    socket.on('disconnect', (reason) => {
      connectionMetrics.activeConnections--;
      
      // Clean up room memberships
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room !== socket.id) { // Skip the socket's own room
          trackRoomMembership(room, userId, 'leave');
        }
      });
      
      logger.info(`[Socket.IO] 🔌 Client disconnected`, {
        userId,
        reason,
        activeConnections: connectionMetrics.activeConnections
      });
    });

    // ERROR HANDLER
    socket.on('error', (error) => {
      connectionMetrics.connectionErrors++;
      logger.error('[Socket.IO] Client error', {
        userId,
        error: error.message,
        stack: error.stack,
        errorCount: connectionMetrics.connectionErrors
      });
    });
  });

  // Set IO instances
  settingsSocketService.setIO(io);
  orderSocketService.setIO(io);

  logger.info('[Socket.IO] WebSocket system configured successfully - Socket.IO only (Native WS removed)');
}

/**
 * Get connection metrics for monitoring
 */
export function getConnectionMetrics() {
  return {
    ...connectionMetrics,
    roomMemberships: Array.from(connectionMetrics.roomMemberships.entries()).map(([room, members]) => ({
      room,
      memberCount: members.size,
      members: Array.from(members)
    }))
  };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics() {
  connectionMetrics.totalConnections = 0;
  connectionMetrics.activeConnections = 0;
  connectionMetrics.connectionErrors = 0;
  connectionMetrics.authenticationFailures = 0;
  connectionMetrics.roomJoinSuccesses = 0;
  connectionMetrics.roomJoinFailures = 0;
  connectionMetrics.eventsEmitted = { orders: 0, settings: 0, total: 0 };
  connectionMetrics.roomMemberships.clear();
  connectionMetrics.lastConnectionError = null;
  connectionMetrics.lastErrorTimestamp = null;
}
