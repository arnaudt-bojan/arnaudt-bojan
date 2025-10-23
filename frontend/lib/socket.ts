import { io, Socket } from 'socket.io-client';

export interface ServerToClientEvents {
  'order:created': (data: { orderId: string; sellerId: string }) => void;
  'order:updated': (data: { orderId: string; status: string }) => void;
  'product:created': (data: { productId: string; sellerId: string }) => void;
  'product:updated': (data: { productId: string }) => void;
  'product:deleted': (data: { productId: string }) => void;
  'cart:updated': (data: { sessionId: string }) => void;
  'stock:low': (data: { productId: string; stock: number }) => void;
  'quotation:created': (data: { quotationId: string }) => void;
  'quotation:updated': (data: { quotationId: string; status: string }) => void;
  'notification': (data: { message: string; type: string }) => void;
  'analytics:update': (data: Record<string, any>) => void;
  'wholesale:order:created': (data: { orderId: string; sellerId: string }) => void;
  pong: () => void;
}

export interface ClientToServerEvents {
  'join:seller': (sellerId: string) => void;
  'leave:seller': (sellerId: string) => void;
  'join:storefront': (username: string) => void;
  'leave:storefront': (username: string) => void;
  'join:product': (productId: string) => void;
  'leave:product': (productId: string) => void;
  ping: () => void;
}

const SOCKET_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000')
  : '';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
});

export type SocketInstance = typeof socket;
