/**
 * Socket.IO Settings Events Tests
 * Tests for settings-related websocket events
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer, createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

describe('Socket.IO Settings Events', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let client: ClientSocket;
  const PORT = 5556;

  beforeEach(async () => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' }
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

  it('should emit settings:updated event', async () => {
    client = ioClient(`http://localhost:${PORT}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    const socket = Array.from(ioServer.sockets.sockets.values())[0];
    socket.join('user:user123');

    const received = new Promise<any>((resolve) => {
      client.on('settings:updated', resolve);
    });

    ioServer.to('user:user123').emit('settings:updated', {
      userId: 'user123',
      settings: { theme: 'dark', language: 'en' }
    });

    const data = await received;

    expect(data).toMatchObject({
      userId: 'user123',
      settings: expect.any(Object)
    });
  });

  it('should validate settings payload structure', async () => {
    client = ioClient(`http://localhost:${PORT}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    const socket = Array.from(ioServer.sockets.sockets.values())[0];
    socket.join('user:user123');

    const received = new Promise<any>((resolve) => {
      client.on('settings:updated', resolve);
    });

    ioServer.to('user:user123').emit('settings:updated', {
      userId: 'user123',
      settings: {
        storeName: 'Test Store',
        currency: 'USD',
        timezone: 'UTC'
      }
    });

    const data = await received;

    expect(data).toHaveProperty('userId');
    expect(data).toHaveProperty('settings');
    expect(typeof data.settings).toBe('object');
  });
});
