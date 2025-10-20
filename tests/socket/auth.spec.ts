/**
 * Socket.IO Authentication Tests
 * Tests for socket connection authentication and authorization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer, createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { connectionMetrics } from '../../server/websocket';

describe('Socket.IO Authentication', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let client: ClientSocket;
  const PORT = 5557;

  beforeEach(async () => {
    connectionMetrics.authenticationFailures = 0;

    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' }
    });

    // Add authentication middleware
    ioServer.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        connectionMetrics.authenticationFailures++;
        return next(new Error('Authentication required'));
      }

      if (token === 'invalid-token') {
        connectionMetrics.authenticationFailures++;
        return next(new Error('Invalid token'));
      }

      // Attach user info
      (socket as any).userId = 'user123';
      next();
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, resolve);
    });
  });

  afterEach(async () => {
    client?.disconnect();
    ioServer?.close();
    await new Promise<void>((resolve) => {
      httpServer?.close(() => resolve());
    });
  });

  it('should reject connection without auth token', async () => {
    const errorPromise = new Promise<string>((resolve) => {
      client = ioClient(`http://localhost:${PORT}`, {
        auth: {}
      });
      
      client.on('connect_error', (error) => {
        resolve(error.message);
      });
    });

    const error = await errorPromise;
    expect(error).toContain('Authentication required');
    expect(connectionMetrics.authenticationFailures).toBeGreaterThan(0);
  });

  it('should reject connection with invalid token', async () => {
    const errorPromise = new Promise<string>((resolve) => {
      client = ioClient(`http://localhost:${PORT}`, {
        auth: { token: 'invalid-token' }
      });
      
      client.on('connect_error', (error) => {
        resolve(error.message);
      });
    });

    const error = await errorPromise;
    expect(error).toContain('Invalid token');
  });

  it('should accept connection with valid token', async () => {
    const connectPromise = new Promise<void>((resolve) => {
      client = ioClient(`http://localhost:${PORT}`, {
        auth: { token: 'valid-token' }
      });
      
      client.on('connect', () => resolve());
    });

    await expect(connectPromise).resolves.toBeUndefined();
  });

  it('should attach user context to authenticated socket', async () => {
    client = ioClient(`http://localhost:${PORT}`, {
      auth: { token: 'valid-token' }
    });

    await new Promise<void>((resolve) => {
      client.on('connect', resolve);
    });

    const socket = Array.from(ioServer.sockets.sockets.values())[0];
    expect((socket as any).userId).toBe('user123');
  });
});
