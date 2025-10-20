import { useSocketEvent } from '@/hooks/use-socket-event';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface QuotationEventData {
  quotationId: string;
  quotationNumber?: string;
  sellerId?: string;
  status?: string;
  message?: string;
  buyerEmail?: string;
}

export function useQuotationEvents(userId?: string) {
  const { toast } = useToast();

  useSocketEvent<QuotationEventData>('quotation:created', (data) => {
    console.log('[Socket.IO] Quotation created:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Quotation Created",
        description: `Quotation ${data.quotationNumber || '#' + data.quotationId.slice(0, 8)} has been created.`,
        duration: 4000,
      });
    }
  });

  useSocketEvent<QuotationEventData>('quotation:updated', (data) => {
    console.log('[Socket.IO] Quotation updated:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/quotations/${data.quotationId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
    
    if (userId === data.sellerId && data.status) {
      toast({
        title: "Quotation Updated",
        description: `Quotation ${data.quotationNumber || '#' + data.quotationId.slice(0, 8)} is now ${data.status}.`,
        duration: 4000,
      });
    }
  });

  useSocketEvent<QuotationEventData>('quotation:sent', (data) => {
    console.log('[Socket.IO] Quotation sent:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/quotations/${data.quotationId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Quotation Sent",
        description: `Quotation ${data.quotationNumber || '#' + data.quotationId.slice(0, 8)} has been sent to ${data.buyerEmail || 'buyer'}.`,
        duration: 5000,
      });
    }
  });

  useSocketEvent<QuotationEventData>('quotation:accepted', (data) => {
    console.log('[Socket.IO] Quotation accepted:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/quotations/${data.quotationId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Quotation Accepted!",
        description: `Quotation ${data.quotationNumber || '#' + data.quotationId.slice(0, 8)} has been accepted by the buyer.`,
        duration: 6000,
      });
    }
  });

  useSocketEvent<QuotationEventData>('quotation:rejected', (data) => {
    console.log('[Socket.IO] Quotation rejected:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/quotations/${data.quotationId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Quotation Declined",
        description: `Quotation ${data.quotationNumber || '#' + data.quotationId.slice(0, 8)} was declined.`,
        duration: 5000,
      });
    }
  });

  useSocketEvent<QuotationEventData>('quotation:converted_to_order', (data) => {
    console.log('[Socket.IO] Quotation converted to order:', data);
    
    queryClient.invalidateQueries({ queryKey: [`/api/quotations/${data.quotationId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/seller/orders'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Quotation Converted to Order",
        description: `Quotation ${data.quotationNumber || '#' + data.quotationId.slice(0, 8)} has been converted to an order.`,
        duration: 5000,
      });
    }
  });
}
