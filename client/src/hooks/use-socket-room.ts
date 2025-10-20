import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketProvider';

export function useSocketRoom(room: string | null) {
  const { joinRoom, leaveRoom, isConnected } = useSocket();

  useEffect(() => {
    if (!room || !isConnected) return;

    joinRoom(room);

    return () => {
      leaveRoom(room);
    };
  }, [room, isConnected, joinRoom, leaveRoom]);
}
