import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

interface OrderUpdateMessage {
  type: 'order_updated';
  orderId: string;
  data: {
    paymentStatus?: string;
    amountPaid?: string;
    status?: string;
    events?: any[];
  };
}

export function useOrderWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connectWebSocket = () => {
      // Construct WebSocket URL based on current page URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/orders`;

      console.log('[WebSocket] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to order updates');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message);

          if (message.type === 'order_updated') {
            const orderMessage = message as OrderUpdateMessage;
            console.log(`[WebSocket] Order ${orderMessage.orderId} updated:`, orderMessage.data);

            // Invalidate all order-related queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['/api/orders', orderMessage.orderId] });
            queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
            queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed, reconnecting in 3s...');
        wsRef.current = null;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    };

    // Initial connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return wsRef.current;
}
