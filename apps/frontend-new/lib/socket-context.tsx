'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { socket, SocketInstance, ServerToClientEvents } from './socket';
import { useAuth } from './auth-context';

interface SocketContextValue {
  socket: SocketInstance;
  isConnected: boolean;
  joinSeller: (sellerId: string) => void;
  leaveSeller: (sellerId: string) => void;
  joinStorefront: (username: string) => void;
  leaveStorefront: (username: string) => void;
  joinProduct: (productId: string) => void;
  leaveProduct: (productId: string) => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      console.log('[Socket.IO] Connected');
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log('[Socket.IO] Disconnected');
    }

    function onConnectError(error: Error) {
      console.error('[Socket.IO] Connection error:', error);
      setIsConnected(false);
    }

    function onReconnect(attempt: number) {
      console.log(`[Socket.IO] Reconnected after ${attempt} attempts`);
    }

    function onReconnectAttempt(attempt: number) {
      console.log(`[Socket.IO] Reconnection attempt ${attempt}`);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect', onReconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);

    if (user) {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect', onReconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [user]);

  const joinSeller = useCallback((sellerId: string) => {
    if (socket.connected) {
      socket.emit('join:seller', sellerId);
      console.log(`[Socket.IO] Joined seller room: ${sellerId}`);
    }
  }, []);

  const leaveSeller = useCallback((sellerId: string) => {
    if (socket.connected) {
      socket.emit('leave:seller', sellerId);
      console.log(`[Socket.IO] Left seller room: ${sellerId}`);
    }
  }, []);

  const joinStorefront = useCallback((username: string) => {
    if (socket.connected) {
      socket.emit('join:storefront', username);
      console.log(`[Socket.IO] Joined storefront: ${username}`);
    }
  }, []);

  const leaveStorefront = useCallback((username: string) => {
    if (socket.connected) {
      socket.emit('leave:storefront', username);
      console.log(`[Socket.IO] Left storefront: ${username}`);
    }
  }, []);

  const joinProduct = useCallback((productId: string) => {
    if (socket.connected) {
      socket.emit('join:product', productId);
      console.log(`[Socket.IO] Joined product room: ${productId}`);
    }
  }, []);

  const leaveProduct = useCallback((productId: string) => {
    if (socket.connected) {
      socket.emit('leave:product', productId);
      console.log(`[Socket.IO] Left product room: ${productId}`);
    }
  }, []);

  const value: SocketContextValue = {
    socket,
    isConnected,
    joinSeller,
    leaveSeller,
    joinStorefront,
    leaveStorefront,
    joinProduct,
    leaveProduct,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K]
) {
  const { socket } = useSocket();

  useEffect(() => {
    socket.on(event, handler as any);
    return () => {
      socket.off(event, handler as any);
    };
  }, [socket, event, handler]);
}
