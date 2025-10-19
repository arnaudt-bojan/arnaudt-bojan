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

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { pong: true, timestamp: new Date() };
  }
}
