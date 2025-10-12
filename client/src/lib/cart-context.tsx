import { createContext, useContext, useState, useEffect } from "react";
import type { Product } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface CartItem extends Product {
  quantity: number;
  currency?: string; // Explicitly include currency from product API response
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant?: { size?: string; color?: string }) => { success: boolean; error?: string };
  removeItem: (productId: string, variant?: { size?: string; color?: string }) => void;
  updateQuantity: (productId: string, quantity: number, variant?: { size?: string; color?: string }) => void;
  clearCart: () => void;
  total: number;
  itemsCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Clear cart for sellers automatically (once per seller session)
  useEffect(() => {
    const isSeller = user?.role === 'admin' || user?.role === 'editor' || user?.role === 'viewer' || user?.role === 'seller' || user?.role === 'owner';
    const hasCleared = sessionStorage.getItem('cart-cleared-for-seller');
    
    // If user is seller and cart has items and hasn't been cleared yet
    if (isSeller && items.length > 0 && !hasCleared) {
      console.log('[Cart] Clearing cart for seller user (one-time per session)');
      setItems([]);
      localStorage.removeItem("cart");
      sessionStorage.setItem('cart-cleared-for-seller', 'true');
    }
    
    // If user is NOT seller (buyer/guest/null), reset the flag for next seller login
    if (!isSeller && hasCleared) {
      sessionStorage.removeItem('cart-cleared-for-seller');
    }
  }, [user?.role, items.length]);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, variant?: { size?: string; color?: string }) => {
    // SYNCHRONOUS validation only - async checks done at PDP level
    let error: string | undefined;
    
    setItems((prev) => {
      // For products with variants, match by product ID AND variant
      const variantKey = variant ? `${variant.size}-${variant.color}` : null;
      const existing = prev.find((item) => {
        if (item.id !== product.id) return false;
        // Check variant match
        const itemVariantKey = (item as any).variant ? `${(item as any).variant.size}-${(item as any).variant.color}` : null;
        return variantKey === itemVariantKey;
      });
      
      if (existing) {
        return prev.map((item) => {
          if (item.id !== product.id) return item;
          const itemVariantKey = (item as any).variant ? `${(item as any).variant.size}-${(item as any).variant.color}` : null;
          return variantKey === itemVariantKey
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        });
      }
      
      // Prevent mixing products from different sellers
      if (prev.length > 0 && prev[0].sellerId !== product.sellerId) {
        error = "Cannot add products from different sellers to the same cart. Please checkout your current items first.";
        return prev; // Don't modify cart
      }
      
      // Calculate actual price (apply discount if active)
      let actualPrice = product.price;
      if (product.promotionActive && product.discountPercentage && parseFloat(product.discountPercentage) > 0) {
        const discountDecimal = parseFloat(product.discountPercentage) / 100;
        const discountedPrice = parseFloat(product.price) * (1 - discountDecimal);
        actualPrice = discountedPrice.toString();
      }
      
      // Add variant info to cart item
      return [...prev, { ...product, price: actualPrice, quantity: 1, ...(variant && { variant }) }];
    });
    
    if (error) {
      return { success: false, error };
    }
    return { success: true };
  };

  const removeItem = (productId: string, variant?: { size?: string; color?: string }) => {
    setItems((prev) => prev.filter((item) => {
      if (item.id !== productId) return true;
      // If variant specified, only remove items with matching variant
      if (variant) {
        const itemVariantKey = (item as any).variant ? `${(item as any).variant.size}-${(item as any).variant.color}` : null;
        const targetVariantKey = `${variant.size}-${variant.color}`;
        return itemVariantKey !== targetVariantKey;
      }
      // No variant specified - remove all items with this productId (backward compatibility)
      return false;
    }));
  };

  const updateQuantity = (productId: string, quantity: number, variant?: { size?: string; color?: string }) => {
    if (quantity <= 0) {
      removeItem(productId, variant);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;
        // If variant specified, only update items with matching variant
        if (variant) {
          const itemVariantKey = (item as any).variant ? `${(item as any).variant.size}-${(item as any).variant.color}` : null;
          const targetVariantKey = `${variant.size}-${variant.color}`;
          return itemVariantKey === targetVariantKey ? { ...item, quantity } : item;
        }
        // No variant specified - update first matching item (backward compatibility)
        return { ...item, quantity };
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemsCount,
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
