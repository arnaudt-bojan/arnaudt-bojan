import { useSocketEvent } from '@/hooks/use-socket-event';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WholesaleEventData {
  invitationId?: string;
  orderId?: string;
  buyerId?: string;
  sellerId?: string;
  status?: string;
  paymentStatus?: string;
  message?: string;
  buyerEmail?: string;
}

export function useWholesaleEvents(userId?: string) {
  const { toast } = useToast();

  useSocketEvent<WholesaleEventData>('wholesale:invitation_sent', (data) => {
    console.log('[Socket.IO] Wholesale invitation sent:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/wholesale/invitations'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Invitation Sent",
        description: `Wholesale invitation sent to ${data.buyerEmail || 'buyer'}.`,
        duration: 4000,
      });
    }
  });

  useSocketEvent<WholesaleEventData>('wholesale:invitation_accepted', (data) => {
    console.log('[Socket.IO] Wholesale invitation accepted:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/wholesale/invitations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/wholesale/buyers'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Invitation Accepted",
        description: `${data.buyerEmail || 'A buyer'} has accepted your wholesale invitation!`,
        duration: 5000,
      });
    } else if (userId === data.buyerId) {
      toast({
        title: "Access Granted",
        description: "You now have access to the wholesale catalog.",
        duration: 4000,
      });
    }
  });

  useSocketEvent<WholesaleEventData>('wholesale:invitation_revoked', (data) => {
    console.log('[Socket.IO] Wholesale invitation revoked:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/wholesale/invitations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/wholesale/buyers'] });
    
    if (userId === data.buyerId) {
      toast({
        title: "Access Revoked",
        description: "Your wholesale access has been revoked.",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  useSocketEvent<WholesaleEventData>('wholesale:order_created', (data) => {
    console.log('[Socket.IO] Wholesale order created:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/wholesale/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "New Wholesale Order",
        description: `Wholesale order #${data.orderId?.slice(0, 8)} received.`,
        duration: 5000,
      });
    }
  });

  useSocketEvent<WholesaleEventData>('wholesale:order_updated', (data) => {
    console.log('[Socket.IO] Wholesale order updated:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/wholesale/orders/${data.orderId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/wholesale/orders'] });
    
    if (data.status) {
      const isSeller = userId === data.sellerId;
      const isBuyer = userId === data.buyerId;
      
      if (isBuyer || isSeller) {
        toast({
          title: "Wholesale Order Updated",
          description: `Order #${data.orderId?.slice(0, 8)} status: ${data.status}`,
          duration: 4000,
        });
      }
    }
  });

  useSocketEvent<WholesaleEventData>('wholesale:deposit_paid', (data) => {
    console.log('[Socket.IO] Wholesale deposit paid:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/wholesale/orders/${data.orderId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/wholesale/orders'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Deposit Received",
        description: `Deposit payment received for order #${data.orderId?.slice(0, 8)}.`,
        duration: 5000,
      });
    } else if (userId === data.buyerId) {
      toast({
        title: "Deposit Confirmed",
        description: `Your deposit payment has been confirmed.`,
        duration: 4000,
      });
    }
  });

  useSocketEvent<WholesaleEventData>('wholesale:balance_reminder', (data) => {
    console.log('[Socket.IO] Wholesale balance reminder:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/wholesale/orders/${data.orderId}`] });
    
    if (userId === data.buyerId) {
      toast({
        title: "Balance Payment Due Soon",
        description: data.message || "Your balance payment is due soon. Please complete payment.",
        duration: 7000,
      });
    }
  });
}
