import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { detectDomain } from "@/lib/domain-utils";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSeller?: boolean;
  requireBuyer?: boolean;
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute component that redirects unauthenticated users
 * Supports role-based access control
 */
export function ProtectedRoute({
  children,
  requireSeller = false,
  requireBuyer = false,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, isLoading, isSeller, isBuyer } = useAuth();
  const [, setLocation] = useLocation();
  const domainInfo = detectDomain();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (domainInfo.isSellerDomain) {
        setLocation("/");
      } else {
        setLocation("/email-login");
      }
      return;
    }

    if (requireSeller && !isSeller) {
      setLocation("/");
      return;
    }

    if (requireBuyer && !isBuyer) {
      setLocation("/");
      return;
    }

    if (requireAdmin && user.isPlatformAdmin !== 1) {
      setLocation("/");
      return;
    }
  }, [user, isLoading, isSeller, isBuyer, requireSeller, requireBuyer, requireAdmin, setLocation, domainInfo.isSellerDomain]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireSeller && !isSeller) {
    return null;
  }

  if (requireBuyer && !isBuyer) {
    return null;
  }

  if (requireAdmin && user.isPlatformAdmin !== 1) {
    return null;
  }

  return <>{children}</>;
}
