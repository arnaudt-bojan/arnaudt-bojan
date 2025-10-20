import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketProvider';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OrderEventData {
  orderId: string;
  buyerId?: string;
  sellerId?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  trackingNumber?: string;
  carrier?: string;
  message?: string;
}

export function useOrderEvents(userId?: string) {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();

  useSocketEvent<OrderEventData>('order:created', (data) => {
    console.log('[Socket.IO] Order created:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "New Order Received!",
        description: `Order #${data.orderId.slice(0, 8)} has been placed.`,
        duration: 5000,
      });
    }
  });

  useSocketEvent<OrderEventData>('order:updated', (data) => {
    console.log('[Socket.IO] Order updated:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${data.orderId}/details`] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
    
    if (data.status) {
      toast({
        title: "Order Status Updated",
        description: `Order #${data.orderId.slice(0, 8)} is now ${data.status}.`,
        duration: 4000,
      });
    }
  });

  useSocketEvent<OrderEventData>('order:fulfilled', (data) => {
    console.log('[Socket.IO] Order fulfilled:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${data.orderId}/details`] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
    
    const isSeller = userId === data.sellerId;
    const isBuyer = userId === data.buyerId;
    
    if (isBuyer && data.trackingNumber) {
      toast({
        title: "Your Order Has Shipped!",
        description: `Tracking: ${data.trackingNumber} (${data.carrier || 'Carrier'})`,
        duration: 6000,
      });
    } else if (isSeller) {
      toast({
        title: "Order Marked as Fulfilled",
        description: `Order #${data.orderId.slice(0, 8)} has been updated.`,
        duration: 4000,
      });
    }
  });

  useSocketEvent<OrderEventData>('payment:failed', (data) => {
    console.log('[Socket.IO] Payment failed:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${data.orderId}/details`] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
    
    toast({
      title: "Payment Failed",
      description: data.message || `Payment for order #${data.orderId.slice(0, 8)} has failed.`,
      variant: "destructive",
      duration: 7000,
    });
  });

  useSocketEvent<OrderEventData>('payment:canceled', (data) => {
    console.log('[Socket.IO] Payment canceled:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${data.orderId}/details`] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
    
    toast({
      title: "Payment Canceled",
      description: `Order #${data.orderId.slice(0, 8)} payment was canceled.`,
      duration: 5000,
    });
  });

  useSocketEvent<OrderEventData>('payment:refunded', (data) => {
    console.log('[Socket.IO] Payment refunded:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${data.orderId}/details`] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
    
    const isSeller = userId === data.sellerId;
    const isBuyer = userId === data.buyerId;
    
    if (isBuyer) {
      toast({
        title: "Refund Processed",
        description: `Your refund for order #${data.orderId.slice(0, 8)} has been processed.`,
        duration: 6000,
      });
    } else if (isSeller) {
      toast({
        title: "Refund Issued",
        description: `Refund processed for order #${data.orderId.slice(0, 8)}.`,
        duration: 5000,
      });
    }
  });

  return { isConnected };
}
