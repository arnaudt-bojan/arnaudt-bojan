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
    // DEBUG: Explicitly specify full WebSocket URL for Replit environment
    // Build WebSocket URL from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;
    
    console.log('[Socket.IO] Attempting connection:', {
      wsUrl,
      path: '/socket.io/',
      transports: ['websocket'],
      withCredentials: true
    });
    
    const socketInstance = io(wsUrl, {
      path: '/socket.io/',
      withCredentials: true,
      transports: ['websocket'], // WebSocket-only
      upgrade: false,
      // Production-ready: Infinite retries with exponential backoff
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000, // Start with 1s
      reconnectionDelayMax: 5000, // Max 5s between retries
      timeout: 10000, // 10s connection timeout
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] ✅ CONNECTED!', {
        id: socketInstance.id,
        transport: socketInstance.io.engine.transport.name
      });
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', {
        message: error.message,
        description: error.description,
        type: error.type,
        stack: error.stack,
      });
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
