/**
 * Checkout Quote Hook
 * 
 * Fetches server-calculated pricing quote for checkout flow (Architecture 3)
 * All business logic (tax, shipping, deposits) is calculated server-side
 * 
 * SECURITY: Never do pricing calculations on frontend
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface CheckoutQuoteItem {
  productId: string;
  quantity: number;
}

export interface CheckoutQuoteAddress {
  country: string;
  city?: string;
  state?: string;
  postalCode?: string;
  line1?: string;
  line2?: string;
}

export interface CheckoutQuote {
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  deposit: number;
  grandTotal: number;
  breakdown: {
    items: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      total: number;
      productType?: string;
      depositAmount?: number | null;
    }>;
    subtotalWithShipping: number;
    hasPreOrders: boolean;
    remainingBalance: number;
    payingDepositOnly: boolean;
    amountToCharge: number;
    taxCalculationId?: string;
  };
}

interface UseCheckoutQuoteParams {
  sellerId?: string;
  items: CheckoutQuoteItem[];
  shippingAddress?: CheckoutQuoteAddress;
  enabled?: boolean;
}

/**
 * Hook to fetch checkout pricing quote from server
 * 
 * @param params - Quote calculation parameters
 * @returns Server-calculated checkout quote with tax, shipping, and totals
 */
export function useCheckoutQuote({ 
  sellerId, 
  items, 
  shippingAddress, 
  enabled = true 
}: UseCheckoutQuoteParams) {
  // Serialize items and address to create stable query keys
  const itemsKey = JSON.stringify(items);
  const addressKey = shippingAddress ? JSON.stringify(shippingAddress) : null;
  
  return useQuery<CheckoutQuote>({
    queryKey: ['/api/checkout/quote', sellerId, itemsKey, addressKey],
    queryFn: async () => {
      if (!sellerId || !items || items.length === 0) {
        throw new Error('Seller ID and items are required for checkout quote');
      }

      const response = await apiRequest('POST', '/api/checkout/quote', {
        sellerId,
        items,
        shippingAddress,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate checkout quote');
      }

      return response.json();
    },
    enabled: enabled && !!sellerId && items.length > 0,
    staleTime: 10000, // 10 seconds - pricing changes with cart/shipping updates
    refetchOnWindowFocus: false,
  });
}
