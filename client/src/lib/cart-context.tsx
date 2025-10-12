import { createContext, useContext, useState, useEffect } from "react";
import type { Product } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface CartItem extends Product {
  quantity: number;
  currency?: string; // Explicitly include currency from product API response
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => { success: boolean; error?: string };
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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

  const addItem = (product: Product) => {
    // SYNCHRONOUS validation only - async checks done at PDP level
    let error: string | undefined;
    
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
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
      
      return [...prev, { ...product, price: actualPrice, quantity: 1 }];
    });
    
    if (error) {
      return { success: false, error };
    }
    return { success: true };
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
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
