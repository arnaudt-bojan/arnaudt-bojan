import { createContext, useContext, ReactNode, useMemo, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { detectDomain } from "@/lib/domain-utils";
import type { User } from "@shared/schema";

interface Cart {
  items: Array<{ sellerId: string }>;
  sellerId: string | null;
}

interface SellerContextValue {
  sellerUsername: string | null;
  sellerId: string | null;
  isLoading: boolean;
}

const SellerContext = createContext<SellerContextValue | undefined>(undefined);

export function SellerProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  
  // CRITICAL FIX: Extract seller username synchronously from pathname (no API wait)
  // This ensures sellerUsername is available IMMEDIATELY on mount
  const sellerFromPath = useMemo(() => {
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/s\/([^\/]+)/);
    return match?.[1] || null;
  }, [location]);
  
  // Initialize with path-extracted seller (synchronous, available on first render)
  const [sellerUsername, setSellerUsername] = useState<string | null>(sellerFromPath);
  const [sellerId, setSellerId] = useState<string | null>(null);

  // Get domain info (checks for /s/:username pattern)
  const domainInfo = useMemo(() => detectDomain(), [location]);

  // Sync state when path changes
  useEffect(() => {
    if (sellerFromPath) {
      setSellerUsername(sellerFromPath);
    }
  }, [sellerFromPath]);

  // Fetch cart to get sellerId as backup
  const { data: cart } = useQuery<Cart>({
    queryKey: ['/api/cart'],
  });

  // Fetch seller by username to get ID (validates path-extracted username)
  const { data: seller, isLoading: sellerLoading } = useQuery<User>({
    queryKey: ["/api/sellers", sellerUsername],
    queryFn: async () => {
      if (!sellerUsername) return null;
      const response = await fetch(`/api/sellers/${sellerUsername}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!sellerUsername,
    retry: false,
  });

  // Fetch seller by ID if we have sellerId from cart but no username from path
  const { data: sellerById, isLoading: sellerByIdLoading } = useQuery<User>({
    queryKey: ["/api/sellers/id", cart?.sellerId],
    queryFn: async () => {
      if (!cart?.sellerId) return null;
      const response = await fetch(`/api/sellers/id/${cart.sellerId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !sellerFromPath && !!cart?.sellerId,
    retry: false,
  });

  // Update sellerId when seller API responds
  useEffect(() => {
    if (sellerUsername && seller) {
      setSellerId(seller.id);
    } else if (!sellerFromPath && cart?.sellerId) {
      // Fallback: use cart seller when not on seller path
      setSellerId(cart.sellerId);
      if (sellerById) {
        setSellerUsername(sellerById.username || null);
      }
    } else if (!sellerUsername && !cart?.sellerId) {
      // Clear context if no seller info available
      setSellerId(null);
    }
  }, [sellerUsername, seller, sellerFromPath, cart?.sellerId, sellerById]);

  const value: SellerContextValue = {
    sellerUsername,
    sellerId,
    isLoading: sellerLoading || sellerByIdLoading,
  };

  return (
    <SellerContext.Provider value={value}>
      {children}
    </SellerContext.Provider>
  );
}

export function useSellerContext() {
  const context = useContext(SellerContext);
  if (context === undefined) {
    // During HMR or before provider mounts, return default values instead of throwing
    // This prevents errors during hot reload while maintaining type safety
    return {
      sellerUsername: null,
      sellerId: null,
      isLoading: false,
    };
  }
  return context;
}

/**
 * Helper to create seller-aware paths
 * Prepends /s/:username if seller context exists
 */
export function getSellerAwarePath(path: string, sellerUsername?: string | null): string {
  if (sellerUsername) {
    // Remove leading slash from path if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/s/${sellerUsername}/${cleanPath}`;
  }
  return path;
}

/**
 * CRITICAL FALLBACK: Extract seller from current pathname
 * Use this when sellerUsername from context might be null but we're on a seller path
 */
export function extractSellerFromCurrentPath(): string | null {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/s\/([^\/]+)/);
  return match?.[1] || null;
}
