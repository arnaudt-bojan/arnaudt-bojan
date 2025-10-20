import { useSocketEvent } from '@/hooks/use-socket-event';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SettingsEventData {
  sellerId: string;
  setting: string;
  message?: string;
}

export function useSettingsEvents(userId?: string) {
  const { toast } = useToast();

  useSocketEvent<SettingsEventData>('settings:branding', (data) => {
    console.log('[Socket.IO] Branding settings updated:', data);
    
    // Invalidate settings queries to refetch
    queryClient.invalidateQueries({ queryKey: ['/api/settings/branding'] });
    queryClient.invalidateQueries({ queryKey: [`/api/storefront/${data.sellerId}`] });
    
    // Show toast only if this is the seller making changes
    if (userId === data.sellerId) {
      toast({
        title: "Branding Updated",
        description: "Your storefront branding has been updated and is now live.",
        duration: 3000,
      });
    }
  });

  useSocketEvent<SettingsEventData>('settings:contact', (data) => {
    console.log('[Socket.IO] Contact settings updated:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/settings/contact'] });
    queryClient.invalidateQueries({ queryKey: [`/api/storefront/${data.sellerId}`] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Contact Info Updated",
        description: "Your contact information has been updated.",
        duration: 3000,
      });
    }
  });

  useSocketEvent<SettingsEventData>('settings:store_status', (data) => {
    console.log('[Socket.IO] Store status updated:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/settings/store-status'] });
    queryClient.invalidateQueries({ queryKey: [`/api/storefront/${data.sellerId}`] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Store Status Changed",
        description: data.message || "Your store status has been updated.",
        duration: 3000,
      });
    }
  });

  useSocketEvent<SettingsEventData>('settings:warehouse', (data) => {
    console.log('[Socket.IO] Warehouse settings updated:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/settings/warehouse'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Warehouse Updated",
        description: "Your warehouse settings have been saved.",
        duration: 3000,
      });
    }
  });

  useSocketEvent<SettingsEventData>('settings:payment', (data) => {
    console.log('[Socket.IO] Payment settings updated:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/settings/payment'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Payment Settings Updated",
        description: "Your payment configuration has been saved.",
        duration: 3000,
      });
    }
  });

  useSocketEvent<SettingsEventData>('settings:tax', (data) => {
    console.log('[Socket.IO] Tax settings updated:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/settings/tax'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Tax Settings Updated",
        description: "Your tax configuration has been saved.",
        duration: 3000,
      });
    }
  });

  useSocketEvent<SettingsEventData>('settings:shipping', (data) => {
    console.log('[Socket.IO] Shipping settings updated:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/settings/shipping'] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Shipping Settings Updated",
        description: "Your shipping configuration has been saved.",
        duration: 3000,
      });
    }
  });

  useSocketEvent<SettingsEventData>('settings:domain', (data) => {
    console.log('[Socket.IO] Domain settings updated:', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/settings/domain'] });
    queryClient.invalidateQueries({ queryKey: [`/api/storefront/${data.sellerId}`] });
    
    if (userId === data.sellerId) {
      toast({
        title: "Domain Settings Updated",
        description: data.message || "Your domain settings have been saved.",
        duration: 3000,
      });
    }
  });
}
