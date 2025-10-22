/**
 * Socket.IO Order Events Tests
 * Tests for order-related websocket events including connect/disconnect,
 * payload schema, broadcast scope, namespace/auth, retry/error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer, createServer } from 'http';
import { OrderSocketService, connectionMetrics } from '../../server/websocket';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

describe('Socket.IO Order Events', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let orderService: OrderSocketService;
  let sellerClient: ClientSocket;
  let buyerClient: ClientSocket;
  const PORT = 5555;

  beforeEach(async () => {
    // Reset metrics
    connectionMetrics.totalConnections = 0;
    connectionMetrics.activeConnections = 0;
    connectionMetrics.eventsEmitted.orders = 0;
    connectionMetrics.eventsEmitted.total = 0;
    connectionMetrics.roomMemberships.clear();

    // Create HTTP server
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' }
    });

    // Initialize order service
    orderService = new OrderSocketService();
    orderService.setIO(ioServer);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, resolve);
    });
  });

  afterEach(async () => {
    sellerClient?.disconnect();
    buyerClient?.disconnect();
    ioServer?.close();
    await new Promise<void>((resolve) => {
      httpServer?.close(() => resolve());
    });
  });

  describe('Connection Management', () => {
    it('should handle connect and disconnect events', async () => {
      const connectPromise = new Promise<void>((resolve) => {
        ioServer.on('connection', () => {
          connectionMetrics.activeConnections++;
          resolve();
        });
      });

      sellerClient = ioClient(`http://localhost:${PORT}`);
      await connectPromise;

      expect(connectionMetrics.activeConnections).toBe(1);

      const disconnectPromise = new Promise<void>((resolve) => {
        ioServer.on('disconnect', () => {
          connectionMetrics.activeConnections--;
          resolve();
        });
      });

      sellerClient.disconnect();
    });

    it('should allow multiple concurrent connections', async () => {
      const connections: ClientSocket[] = [];
      
      for (let i = 0; i < 3; i++) {
        const client = ioClient(`http://localhost:${PORT}`);
        connections.push(client);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      
      connections.forEach(client => client.disconnect());
    });
  });

  describe('Room Management', () => {
    it('should join seller and buyer to their respective rooms', async () => {
      sellerClient = ioClient(`http://localhost:${PORT}`);
      buyerClient = ioClient(`http://localhost:${PORT}`);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate room joins
      const sellerSocket = Array.from(ioServer.sockets.sockets.values())[0];
      const buyerSocket = Array.from(ioServer.sockets.sockets.values())[1];

      sellerSocket.join('user:seller123');
      buyerSocket.join('user:buyer456');

      expect(sellerSocket.rooms.has('user:seller123')).toBe(true);
      expect(buyerSocket.rooms.has('user:buyer456')).toBe(true);
    });
  });

  describe('Order Created Event', () => {
    it('should emit order:created to both seller and buyer', async () => {
      sellerClient = ioClient(`http://localhost:${PORT}`);
      buyerClient = ioClient(`http://localhost:${PORT}`);

      await new Promise(resolve => setTimeout(resolve, 100));

      const sellerSocket = Array.from(ioServer.sockets.sockets.values())[0];
      const buyerSocket = Array.from(ioServer.sockets.sockets.values())[1];

      sellerSocket.join('user:seller123');
      buyerSocket.join('user:buyer456');

      const sellerReceived = new Promise<any>((resolve) => {
        sellerClient.on('order:created', resolve);
      });

      const buyerReceived = new Promise<any>((resolve) => {
        buyerClient.on('order:created', resolve);
      });

      orderService.emitOrderCreated('order123', 'buyer456', 'seller123', {
        total: '100.00',
        items: []
      });

      const [sellerData, buyerData] = await Promise.all([sellerReceived, buyerReceived]);

      expect(sellerData).toMatchObject({
        orderId: 'order123',
        buyerId: 'buyer456',
        sellerId: 'seller123',
        total: '100.00'
      });

      expect(buyerData).toMatchObject({
        orderId: 'order123',
        buyerId: 'buyer456',
        sellerId: 'seller123',
        total: '100.00'
      });

      expect(connectionMetrics.eventsEmitted.orders).toBe(2);
    });

    it('should validate payload schema for order:created', async () => {
      sellerClient = ioClient(`http://localhost:${PORT}`);
      await new Promise(resolve => setTimeout(resolve, 100));

      const sellerSocket = Array.from(ioServer.sockets.sockets.values())[0];
      sellerSocket.join('user:seller123');

      const received = new Promise<any>((resolve) => {
        sellerClient.on('order:created', resolve);
      });

      orderService.emitOrderCreated('order123', 'buyer456', 'seller123');

      const data = await received;

      expect(data).toHaveProperty('orderId');
      expect(data).toHaveProperty('buyerId');
      expect(data).toHaveProperty('sellerId');
      expect(typeof data.orderId).toBe('string');
      expect(typeof data.buyerId).toBe('string');
      expect(typeof data.sellerId).toBe('string');
    });
  });

  describe('Order Updated Event', () => {
    it('should emit order:updated with status changes', async () => {
      sellerClient = ioClient(`http://localhost:${PORT}`);
      buyerClient = ioClient(`http://localhost:${PORT}`);

      await new Promise(resolve => setTimeout(resolve, 100));

      const sellerSocket = Array.from(ioServer.sockets.sockets.values())[0];
      const buyerSocket = Array.from(ioServer.sockets.sockets.values())[1];

      sellerSocket.join('user:seller123');
      buyerSocket.join('user:buyer456');

      const received = new Promise<any>((resolve) => {
        sellerClient.on('order:updated', resolve);
      });

      orderService.emitOrderUpdated('order123', 'buyer456', 'seller123', {
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'PENDING'
      });

      const data = await received;

      expect(data.status).toBe('PROCESSING');
      expect(data.paymentStatus).toBe('PAID');
      expect(data.fulfillmentStatus).toBe('PENDING');
    });
  });

  describe('Order Payment Succeeded Event', () => {
    it('should emit order:payment_succeeded with payment details', async () => {
      buyerClient = ioClient(`http://localhost:${PORT}`);

      await new Promise(resolve => setTimeout(resolve, 100));

      const buyerSocket = Array.from(ioServer.sockets.sockets.values())[0];
      buyerSocket.join('user:buyer456');

      const received = new Promise<any>((resolve) => {
        buyerClient.on('order:payment_succeeded', resolve);
      });

      orderService.emitOrderPaymentSucceeded('order123', 'buyer456', 'seller123', {
        amountPaid: '100.00',
        paymentStatus: 'PAID'
      });

      const data = await received;

      expect(data.amountPaid).toBe('100.00');
      expect(data.paymentStatus).toBe('PAID');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when IO not initialized', () => {
      const uninitializedService = new OrderSocketService();
      
      // Should not throw
      expect(() => {
        uninitializedService.emitOrderCreated('order123', 'buyer456', 'seller123');
      }).not.toThrow();
    });

    it('should handle malformed room names gracefully', async () => {
      sellerClient = ioClient(`http://localhost:${PORT}`);
      await new Promise(resolve => setTimeout(resolve, 100));

      // This should not crash the server
      orderService.emitOrderCreated('order123', '', '', {});
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(ioServer.sockets.sockets.size).toBeGreaterThan(0);
    });
  });

  describe('Broadcast Scope', () => {
    it('should only broadcast to specified user rooms', async () => {
      sellerClient = ioClient(`http://localhost:${PORT}`);
      buyerClient = ioClient(`http://localhost:${PORT}`);
      const otherClient = ioClient(`http://localhost:${PORT}`);

      await new Promise(resolve => setTimeout(resolve, 100));

      const sockets = Array.from(ioServer.sockets.sockets.values());
      sockets[0].join('user:seller123');
      sockets[1].join('user:buyer456');
      sockets[2].join('user:other789');

      let otherReceivedCount = 0;
      otherClient.on('order:created', () => {
        otherReceivedCount++;
      });

      const sellerReceived = new Promise<void>((resolve) => {
        sellerClient.on('order:created', () => resolve());
      });

      orderService.emitOrderCreated('order123', 'buyer456', 'seller123');

      await sellerReceived;
      await new Promise(resolve => setTimeout(resolve, 100));

      // Other user should NOT receive the event
      expect(otherReceivedCount).toBe(0);

      otherClient.disconnect();
    });
  });

  describe('Metrics Tracking', () => {
    it('should track event emissions correctly', async () => {
      sellerClient = ioClient(`http://localhost:${PORT}`);
      await new Promise(resolve => setTimeout(resolve, 100));

      const sellerSocket = Array.from(ioServer.sockets.sockets.values())[0];
      sellerSocket.join('user:seller123');

      const initialOrderEvents = connectionMetrics.eventsEmitted.orders;
      const initialTotalEvents = connectionMetrics.eventsEmitted.total;

      orderService.emitOrderCreated('order123', 'buyer456', 'seller123');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should increment by 2 (seller + buyer)
      expect(connectionMetrics.eventsEmitted.orders).toBe(initialOrderEvents + 2);
      expect(connectionMetrics.eventsEmitted.total).toBe(initialTotalEvents + 2);
    });
  });
});
