import { useSocketEvent } from '@/hooks/use-socket-event';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CartEventData {
  productId?: string;
  variantId?: string;
  productName?: string;
  newStock?: number;
  oldPrice?: string;
  newPrice?: string;
  message?: string;
}

export function useCartEvents() {
  const { toast } = useToast();

  useSocketEvent<CartEventData>('cart:item_stock_changed', (data) => {
    console.log('[Socket.IO] Cart item stock changed:', data);
    
    // Invalidate cart to refetch with updated stock
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    
    if (data.newStock !== undefined && data.newStock < 5) {
      toast({
        title: "Stock Alert",
        description: data.message || `${data.productName || 'Item'} stock is low (${data.newStock} left). Complete your purchase soon!`,
        variant: data.newStock === 0 ? "destructive" : "default",
        duration: 6000,
      });
    }
  });

  useSocketEvent<CartEventData>('cart:item_price_changed', (data) => {
    console.log('[Socket.IO] Cart item price changed:', data);
    
    // Invalidate cart to refetch with updated price
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    
    toast({
      title: "Price Updated",
      description: data.message || `${data.productName || 'Item'} price has changed. Your cart has been updated.`,
      duration: 5000,
    });
  });

  useSocketEvent<CartEventData>('cart:item_unavailable', (data) => {
    console.log('[Socket.IO] Cart item unavailable:', data);
    
    // Invalidate cart to refetch and remove unavailable item
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    
    toast({
      title: "Item No Longer Available",
      description: data.message || `${data.productName || 'An item'} is no longer available and has been removed from your cart.`,
      variant: "destructive",
      duration: 6000,
    });
  });
}
