import { useAuthStore } from "@/contexts/auth-store-context";
import { StorefrontHeader } from "./headers/storefront-header";
import { OwnerStorefrontHeader } from "./headers/owner-storefront-header";
import { DashboardHeader } from "./headers/dashboard-header";

interface MainHeaderProps {
  cartItemsCount?: number;
  onCartClick?: () => void;
}

export function MainHeader({ cartItemsCount = 0, onCartClick }: MainHeaderProps) {
  const { viewMode, isLoading } = useAuthStore();

  // Show loading state during initial load
  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
          </div>
        </div>
      </header>
    );
  }

  // Render appropriate header based on viewMode
  switch (viewMode) {
    case "guest":
    case "buyer":
      return <StorefrontHeader cartItemsCount={cartItemsCount} onCartClick={onCartClick} />;
    
    case "owner-viewing-own":
      return <OwnerStorefrontHeader cartItemsCount={cartItemsCount} onCartClick={onCartClick} />;
    
    case "owner-in-dashboard":
      return <DashboardHeader />;
    
    default:
      // Fallback to storefront header
      return <StorefrontHeader cartItemsCount={cartItemsCount} onCartClick={onCartClick} />;
  }
}
