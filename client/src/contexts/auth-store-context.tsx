import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { detectDomain } from "@/lib/domain-utils";
import type { User } from "@shared/schema";

export type ViewMode = 
  | "guest"                    // Not logged in
  | "buyer"                    // Logged in as buyer viewing a store
  | "owner-viewing-own"        // Owner viewing their own storefront
  | "owner-in-dashboard";      // Owner in their dashboard

interface AuthStoreContextValue {
  // Current logged-in user (null if not logged in)
  currentUser: User | null;
  
  // Seller whose store is being viewed (null if on main domain or not found)
  activeSeller: any | null;
  
  // Domain detection info
  isMainDomain: boolean;
  isSellerDomain: boolean;
  sellerUsername?: string;
  
  // View mode detection
  viewMode: ViewMode;
  
  // Loading states
  isLoading: boolean;
}

const AuthStoreContext = createContext<AuthStoreContextValue | undefined>(undefined);

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  // Track location to recompute domain info on client-side navigation
  const [location] = useLocation();
  
  // Get domain info - recomputes when location changes
  const domainInfo = useMemo(() => detectDomain(), [location]);
  
  // Fetch current logged-in user
  const { data: currentUser, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });
  
  // Fetch active seller if on seller domain
  const { data: activeSeller, isLoading: sellerLoading, error: sellerError } = useQuery<any>({
    queryKey: ["/api/sellers", domainInfo.sellerUsername],
    queryFn: async () => {
      if (!domainInfo.sellerUsername) return null;
      const response = await fetch(`/api/sellers/${domainInfo.sellerUsername}`);
      if (!response.ok) {
        // Seller not found - this is okay, return null
        return null;
      }
      return response.json();
    },
    enabled: domainInfo.isSellerDomain && !!domainInfo.sellerUsername,
    retry: false, // Don't retry on 404
  });
  
  // Determine view mode
  let viewMode: ViewMode = "guest";
  
  if (!currentUser) {
    // Not logged in
    viewMode = "guest";
  } else {
    // User is logged in
    const isOwner = currentUser.role === "admin" || currentUser.role === "seller" || currentUser.role === "owner";
    const isBuyer = currentUser.role === "buyer";
    
    // Check if on seller/owner dashboard routes (NOT buyer dashboard)
    const pathname = window.location.pathname;
    const isOwnerDashboardRoute = pathname.startsWith("/seller-dashboard") || 
                                   pathname.startsWith("/seller/") ||
                                   (pathname === "/admin") ||
                                   pathname.startsWith("/team") ||
                                   pathname.startsWith("/settings") ||
                                   pathname.startsWith("/order-management") ||
                                   pathname.startsWith("/social-ads-setup") ||
                                   pathname.startsWith("/newsletter");
    
    if (isOwner && isOwnerDashboardRoute) {
      viewMode = "owner-in-dashboard";
    } else if (isOwner && domainInfo.isSellerDomain && activeSeller && currentUser.id === activeSeller.id) {
      // Owner viewing their own storefront (compare user IDs)
      viewMode = "owner-viewing-own";
    } else if (isBuyer) {
      viewMode = "buyer";
    } else if (isOwner) {
      // Owner on main domain or viewing someone else's store - treat as owner-in-dashboard for navigation purposes
      viewMode = "owner-in-dashboard";
    }
  }
  
  const value: AuthStoreContextValue = {
    currentUser: currentUser || null,
    activeSeller: activeSeller || null,
    isMainDomain: domainInfo.isMainDomain,
    isSellerDomain: domainInfo.isSellerDomain,
    sellerUsername: domainInfo.sellerUsername,
    viewMode,
    isLoading: userLoading || sellerLoading,
  };
  
  return (
    <AuthStoreContext.Provider value={value}>
      {children}
    </AuthStoreContext.Provider>
  );
}

export function useAuthStore() {
  const context = useContext(AuthStoreContext);
  if (context === undefined) {
    throw new Error("useAuthStore must be used within AuthStoreProvider");
  }
  return context;
}
