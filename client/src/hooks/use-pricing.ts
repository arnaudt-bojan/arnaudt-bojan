/**
 * Pricing Calculation Hook
 * 
 * Provides real-time pricing calculations from backend API
 * Ensures all pricing is server-side calculated (Architecture 3)
 * 
 * SECURITY: Never do pricing calculations on frontend
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface PricingCartItem {
  productId: string;
  quantity: number;
}

export interface PricingDestination {
  country: string;
  city?: string;
  state?: string;
  postalCode?: string;
  line1?: string;
  line2?: string;
}

export interface PricingBreakdown {
  currency: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  taxCalculationId?: string;
  total: number;
  subtotalWithShipping: number;
  
  // Deposit/Balance for pre-orders
  hasPreOrders: boolean;
  depositTotal: number;
  remainingBalance: number;
  payingDepositOnly: boolean;
  amountToCharge: number;
  
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
    productType?: string;
    depositAmount?: number | null;
  }>;
}

interface UsePricingParams {
  sellerId?: string;
  items: PricingCartItem[];
  destination?: PricingDestination;
  enabled?: boolean;
}

/**
 * Hook to calculate pricing using backend API
 * 
 * @param params - Pricing calculation parameters
 * @returns Pricing breakdown from server
 */
export function usePricing({ sellerId, items, destination, enabled = true }: UsePricingParams) {
  return useQuery<PricingBreakdown>({
    queryKey: ['/api/pricing/calculate', sellerId, items, destination],
    queryFn: async () => {
      if (!sellerId || !items || items.length === 0) {
        throw new Error('Seller ID and items are required for pricing calculation');
      }

      const response = await apiRequest('POST', '/api/pricing/calculate', {
        sellerId,
        items,
        shippingAddress: destination,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate pricing');
      }

      return response.json();
    },
    enabled: enabled && !!sellerId && items.length > 0,
    staleTime: 10000, // 10 seconds - pricing changes with cart/shipping updates
    refetchOnWindowFocus: false,
  });
}
