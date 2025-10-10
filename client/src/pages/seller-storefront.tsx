import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Store } from "lucide-react";
import type { User } from "@shared/schema";

export default function SellerStorefront() {
  const { username } = useParams();
  const [, setLocation] = useLocation();

  // Check if current user is authenticated
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch seller by username - DON'T throw on 404, handle gracefully
  const { data: seller, isLoading: sellerLoading, error: sellerError } = useQuery<any>({
    queryKey: ["/api/sellers", username],
    queryFn: async () => {
      const response = await fetch(`/api/sellers/${username}`);
      if (!response.ok) {
        // Don't throw - return null to handle gracefully
        return null;
      }
      return response.json();
    },
    enabled: !!username,
    retry: false, // Don't retry on 404
  });

  // Check if logged-in user is viewing their own store (fallback)
  const isOwnStore = currentUser && currentUser.username === username;
  
  // Use current user as seller if they're viewing their own store and seller lookup failed
  const effectiveSeller = seller || (isOwnStore ? currentUser : null);

  // Fetch seller's products - use effectiveSeller to support fallback
  const { data: products, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products/seller", effectiveSeller?.id],
    queryFn: async () => {
      if (!effectiveSeller?.id) return [];
      const response = await fetch(`/api/products/seller/${effectiveSeller.id}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    enabled: !!effectiveSeller?.id,
  });
  
  const isLoading = sellerLoading || productsLoading;

  if (sellerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading storefront...</p>
        </div>
      </div>
    );
  }

  // If no seller found and not own store, show storefront with message (stay in context)
  if (!effectiveSeller) {
    return (
      <div className="min-h-screen">
        {/* Store Header - Show username even if seller not found */}
        <div className="border-b bg-card">
          <div className="container py-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-store-name">
                  {username}'s Store
                </h1>
                <p className="text-muted-foreground mt-1">
                  This store is currently unavailable
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="container py-12">
          <div className="text-center max-w-md mx-auto">
            <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Store Not Available</h2>
            <p className="text-muted-foreground">
              The store "@{username}" could not be found or is not currently active. 
              The store owner may need to activate their store or complete setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Store Header */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <div className="flex items-center gap-4">
            {effectiveSeller.logoUrl ? (
              <img 
                src={effectiveSeller.logoUrl} 
                alt={effectiveSeller.storeName || `${effectiveSeller.username}'s Store`} 
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-store-name">
                {effectiveSeller.storeName || `${effectiveSeller.firstName || effectiveSeller.username}'s Store`}
              </h1>
              {effectiveSeller.storeDescription && (
                <p className="text-muted-foreground mt-1" data-testid="text-store-description">
                  {effectiveSeller.storeDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container py-8">
        {productsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading products...</p>
          </div>
        ) : !products || products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
