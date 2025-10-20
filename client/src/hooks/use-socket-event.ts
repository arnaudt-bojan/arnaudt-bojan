import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketProvider';

export function useSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void,
  deps: any[] = []
) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on(event, callback);
    console.log(`[Socket.IO] Listening to event: ${event}`);

    return () => {
      socket.off(event, callback);
      console.log(`[Socket.IO] Stopped listening to event: ${event}`);
    };
  }, [socket, isConnected, event, ...deps]);
}
