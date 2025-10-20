import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // CRITICAL FIX: Use WebSocket-only transport to avoid Vite middleware interception
    // Vite's catch-all route intercepts Engine.IO polling requests
    // WebSocket connections work because they use HTTP upgrade mechanism
    const socketInstance = io({
      path: '/socket.io/',
      withCredentials: true,
      transports: ['websocket'], // WebSocket-only, skip polling
      upgrade: false, // Don't try to upgrade from polling to websocket
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('join', room);
      console.log(`[Socket.IO] Joining room: ${room}`);
    }
  };

  const leaveRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('leave', room);
      console.log(`[Socket.IO] Leaving room: ${room}`);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
