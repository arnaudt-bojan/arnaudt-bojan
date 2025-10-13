import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { detectDomain } from "@/lib/domain-utils";
import { useSellerContext } from "@/contexts/seller-context";
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
  
  // Use SellerContext as fallback when domainInfo doesn't have seller username
  const sellerContext = useSellerContext();
  
  // Determine effective seller username (domain takes priority, then SellerContext)
  const effectiveSellerUsername = domainInfo.sellerUsername || sellerContext.sellerUsername;
  
  // Fetch current logged-in user
  const { data: currentUser, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });
  
  // Fetch active seller if we have a seller username (from domain or context)
  const { data: activeSeller, isLoading: sellerLoading, error: sellerError } = useQuery<any>({
    queryKey: ["/api/sellers", effectiveSellerUsername],
    queryFn: async () => {
      if (!effectiveSellerUsername) return null;
      const response = await fetch(`/api/sellers/${effectiveSellerUsername}`);
      if (!response.ok) {
        // Seller not found - this is okay, return null
        return null;
      }
      return response.json();
    },
    enabled: !!effectiveSellerUsername,
    retry: false, // Don't retry on 404
  });
  
  // Determine view mode
  let viewMode: ViewMode = "guest";
  
  if (!currentUser) {
    // Not logged in
    viewMode = "guest";
  } else {
    // User is logged in
    // Check user type with role fallback - matches useAuth hook exactly
    const isOwner = 
      currentUser.userType === "seller" || 
      currentUser.role === "seller" || 
      currentUser.role === "admin" || 
      currentUser.role === "owner";
    const isBuyer = currentUser.userType === "buyer" || currentUser.role === "buyer";
    const isCollaborator = 
      currentUser.userType === "collaborator" || 
      currentUser.role === "editor" || 
      currentUser.role === "viewer";
    
    // Check if on seller/owner dashboard routes (NOT buyer dashboard)
    const pathname = window.location.pathname;
    const isOwnerDashboardRoute = pathname.startsWith("/seller-dashboard") || 
                                   pathname.startsWith("/seller/") ||
                                   (pathname === "/admin") ||
                                   pathname.startsWith("/team") ||
                                   pathname.startsWith("/settings") ||
                                   pathname.startsWith("/social-ads-setup") ||
                                   pathname.startsWith("/newsletter");
    
    // Collaborators and sellers can access dashboard routes
    const canAccessDashboard = isOwner || isCollaborator;
    
    if (canAccessDashboard && isOwnerDashboardRoute) {
      viewMode = "owner-in-dashboard";
    } else if (isOwner && domainInfo.isSellerDomain && activeSeller && currentUser.id === activeSeller.id) {
      // Owner viewing their own storefront (compare user IDs)
      viewMode = "owner-viewing-own";
    } else if (isBuyer) {
      viewMode = "buyer";
    } else if (canAccessDashboard) {
      // Owner/collaborator on main domain or viewing someone else's store - treat as owner-in-dashboard for navigation purposes
      viewMode = "owner-in-dashboard";
    }
  }
  
  const value: AuthStoreContextValue = {
    currentUser: currentUser || null,
    activeSeller: activeSeller || null,
    isMainDomain: domainInfo.isMainDomain,
    isSellerDomain: domainInfo.isSellerDomain,
    sellerUsername: effectiveSellerUsername,
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
