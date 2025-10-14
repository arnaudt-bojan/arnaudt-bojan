import { createContext, useContext } from "react";
import type { Product } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

interface CartItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  productType: string;
  depositAmount?: string;
  requiresDeposit?: number;
  sellerId: string;
  images?: string[];
  discountPercentage?: string;
  promotionActive?: number;
  variantId?: string;
  variant?: {
    size?: string;
    color?: string;
  };
  currency?: string;
  image?: string;
}

interface Cart {
  items: CartItem[];
  sellerId: string | null;
  total: number;
  itemsCount: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant?: { size?: string; color?: string }) => Promise<{ success: boolean; error?: string }>;
  removeItem: (productId: string, variant?: { size?: string; color?: string }) => void;
  updateQuantity: (productId: string, quantity: number, variant?: { size?: string; color?: string }) => void;
  clearCart: () => void;
  total: number;
  itemsCount: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_QUERY_KEY = ['/api/cart'];

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Fetch cart from backend using session-based storage
  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: CART_QUERY_KEY,
    staleTime: 1000 * 60 * 5, // 5 minutes - cart data is relatively stable
  });

  // Add to cart mutation
  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1, variantId }: { productId: string; quantity?: number; variantId?: string }) => {
      const response = await apiRequest('POST', '/api/cart/add', { productId, quantity, variantId });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add to cart');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update cart cache with server response
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
  });

  // Remove from cart mutation
  const removeMutation = useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const response = await apiRequest('POST', '/api/cart/remove', { itemId });
      if (!response.ok) {
        throw new Error('Failed to remove from cart');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
  });

  // Update quantity mutation
  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const response = await apiRequest('POST', '/api/cart/update', { itemId, quantity });
      if (!response.ok) {
        throw new Error('Failed to update cart');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
  });

  // Clear cart mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/cart', null);
      if (!response.ok) {
        throw new Error('Failed to clear cart');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
  });

  // Helper to find cart item by productId and variant
  const findCartItem = (productId: string, variant?: { size?: string; color?: string }) => {
    if (!cart?.items) return null;
    
    const variantKey = variant ? `${variant.size || ''}-${variant.color || ''}`.trim().replace(/^-|-$/g, '') : null;
    
    return cart.items.find((item) => {
      if (item.id !== productId) return false;
      
      if (variantKey) {
        return item.variantId === variantKey;
      }
      
      // No variant specified - match item without variant
      return !item.variantId;
    });
  };

  const addItem = async (product: Product, variant?: { size?: string; color?: string }) => {
    // Construct variantId if variant provided (format: "size-color")
    const variantId = variant 
      ? `${variant.size || ''}-${variant.color || ''}`.trim().replace(/^-|-$/g, '')
      : undefined;

    // Prevent mixing products from different sellers (client-side validation)
    // CRITICAL FIX: Defensive null check for cart.items
    if (cart && cart.items && cart.items.length > 0 && cart.sellerId !== product.sellerId) {
      return { 
        success: false, 
        error: "Cannot add products from different sellers to the same cart. Please checkout your current items first." 
      };
    }

    // Prevent mixing different product types in the same cart
    if (cart && cart.items && cart.items.length > 0) {
      const existingProductType = cart.items[0].productType;
      const newProductType = product.productType;

      if (existingProductType !== newProductType) {
        const productTypeLabels: Record<string, string> = {
          'in-stock': 'In Stock',
          'pre-order': 'Pre-Order',
          'made-to-order': 'Made to Order',
          'wholesale': 'Wholesale'
        };

        const existingLabel = productTypeLabels[existingProductType] || existingProductType;
        const newLabel = productTypeLabels[newProductType] || newProductType;

        return { 
          success: false, 
          error: `Cannot mix ${newLabel} products with ${existingLabel} products in the same cart. Please checkout your current items first or remove them before adding this product.` 
        };
      }
    }

    // Call backend mutation and wait for result
    try {
      await addMutation.mutateAsync({ productId: product.id, quantity: 1, variantId });
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || "Failed to add to cart" 
      };
    }
  };

  const removeItem = (productId: string, variant?: { size?: string; color?: string }) => {
    const cartItem = findCartItem(productId, variant);
    if (!cartItem) return;

    // Construct itemId: "productId-variantId" for variants, "productId" for non-variants
    const itemId = cartItem.variantId ? `${cartItem.id}-${cartItem.variantId}` : cartItem.id;
    removeMutation.mutate({ itemId });
  };

  const updateQuantity = (productId: string, quantity: number, variant?: { size?: string; color?: string }) => {
    if (quantity <= 0) {
      removeItem(productId, variant);
      return;
    }

    const cartItem = findCartItem(productId, variant);
    if (!cartItem) return;

    // Construct itemId: "productId-variantId" for variants, "productId" for non-variants
    const itemId = cartItem.variantId ? `${cartItem.id}-${cartItem.variantId}` : cartItem.id;
    updateMutation.mutate({ itemId, quantity });
  };

  const clearCart = () => {
    clearMutation.mutate();
  };

  // Map cart items to include backward-compatible 'image' field
  const items = (cart?.items || []).map(item => ({
    ...item,
    image: item.images?.[0] || item.image || "",
  }));

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total: cart?.total || 0,
        itemsCount: cart?.itemsCount || 0,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
