import { useSocketEvent } from '@/hooks/use-socket-event';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ProductEventData {
  productId: string;
  productName?: string;
  variantId?: string;
  newStock?: number;
  oldPrice?: string;
  newPrice?: string;
  isAvailable?: boolean;
  message?: string;
}

export function useProductEvents(productId?: string) {
  const { toast } = useToast();

  useSocketEvent<ProductEventData>('product:inventory_updated', (data) => {
    console.log('[Socket.IO] Product inventory updated:', data);
    
    // Only invalidate if watching this specific product
    if (!productId || data.productId === productId) {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${data.productId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Show low stock warning if viewing this product
      if (productId === data.productId && data.newStock !== undefined && data.newStock < 5) {
        toast({
          title: "Low Stock",
          description: data.message || `Only ${data.newStock} left in stock. Order soon!`,
          duration: 4000,
        });
      }
    }
  });

  useSocketEvent<ProductEventData>('product:price_updated', (data) => {
    console.log('[Socket.IO] Product price updated:', data);
    
    if (!productId || data.productId === productId) {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${data.productId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Show price change notification if viewing this product
      if (productId === data.productId && data.oldPrice && data.newPrice) {
        toast({
          title: "Price Changed",
          description: `Price updated from $${data.oldPrice} to $${data.newPrice}`,
          duration: 4000,
        });
      }
    }
  });

  useSocketEvent<ProductEventData>('product:availability_changed', (data) => {
    console.log('[Socket.IO] Product availability changed:', data);
    
    if (!productId || data.productId === productId) {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${data.productId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Show availability change if viewing this product
      if (productId === data.productId) {
        toast({
          title: data.isAvailable ? "Now Available" : "No Longer Available",
          description: data.message || `This product is ${data.isAvailable ? 'back in stock' : 'currently unavailable'}.`,
          variant: data.isAvailable ? "default" : "destructive",
          duration: 5000,
        });
      }
    }
  });
}
