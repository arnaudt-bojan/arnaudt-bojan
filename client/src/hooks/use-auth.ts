import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

/**
 * Extended User type with capabilities from backend
 */
export interface UserWithCapabilities extends User {
  capabilities?: Record<string, boolean>;
}

/**
 * Hook to access current user, userType, and capabilities
 * Provides helper functions to check permissions
 */
export function useAuth() {
  const { data: user, isLoading } = useQuery<UserWithCapabilities | null>({
    queryKey: ["/api/auth/user"],
  });

  /**
   * Check if user has a specific capability
   * @param capability - The capability to check (e.g., "manageProducts", "viewOrders")
   * @returns true if user has the capability, false otherwise
   */
  const hasCapability = (capability: string): boolean => {
    if (!user || !user.capabilities) return false;
    return user.capabilities[capability] === true;
  };

  /**
   * Check if user has all of the specified capabilities
   * @param capabilities - Array of capabilities to check
   * @returns true if user has all capabilities, false otherwise
   */
  const hasAllCapabilities = (capabilities: string[]): boolean => {
    return capabilities.every(cap => hasCapability(cap));
  };

  /**
   * Check if user has any of the specified capabilities
   * @param capabilities - Array of capabilities to check
   * @returns true if user has at least one capability, false otherwise
   */
  const hasAnyCapability = (capabilities: string[]): boolean => {
    return capabilities.some(cap => hasCapability(cap));
  };

  /**
   * Check if user is a seller (owner of a store)
   * Matches AuthStoreContext logic exactly for consistency
   */
  const isSeller = 
    user?.userType === "seller" || 
    user?.role === "seller" || 
    user?.role === "admin" || 
    user?.role === "owner";

  /**
   * Check if user is a buyer
   * Matches AuthStoreContext logic exactly for consistency
   */
  const isBuyer = user?.userType === "buyer" || user?.role === "buyer";

  /**
   * Check if user is a collaborator (team member)
   * Matches AuthStoreContext logic exactly for consistency
   */
  const isCollaborator = 
    user?.userType === "collaborator" || 
    user?.role === "editor" || 
    user?.role === "viewer";

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
    isSeller,
    isBuyer,
    isCollaborator,
    hasCapability,
    hasAllCapabilities,
    hasAnyCapability,
    capabilities: user?.capabilities || {},
  };
}
