import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { logger } from './logger';

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
  private clients: Set<WebSocket> = new Set();

  initialize(server: HTTPServer) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/orders'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('[WebSocket] Client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        logger.info('[WebSocket] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('[WebSocket] Client error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
    });

    logger.info('[WebSocket] Order update service initialized');
  }

  /**
   * Broadcast order update to all connected clients
   */
  broadcastOrderUpdate(orderId: string, data: OrderUpdateMessage['data']) {
    if (!this.wss) {
      logger.warn('[WebSocket] Cannot broadcast - server not initialized');
      return;
    }

    const message: OrderUpdateMessage = {
      type: 'order_updated',
      orderId,
      data,
    };

    const messageStr = JSON.stringify(message);
    let successCount = 0;
    let failCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          successCount++;
        } catch (error) {
          logger.error('[WebSocket] Failed to send to client:', error);
          failCount++;
        }
      }
    });

    logger.info(`[WebSocket] Order update broadcasted`, {
      orderId,
      clientsReached: successCount,
      clientsFailed: failCount,
      totalClients: this.clients.size,
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.clients.size,
      activeConnections: Array.from(this.clients).filter(
        (client) => client.readyState === WebSocket.OPEN
      ).length,
    };
  }
}

// Singleton instance
export const orderWebSocketService = new OrderWebSocketService();
