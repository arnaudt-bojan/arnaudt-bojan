import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SellerStorefront() {
  const { username } = useParams();
  const [, setLocation] = useLocation();

  // Fetch seller by username
  const { data: seller, isLoading: sellerLoading } = useQuery<any>({
    queryKey: ["/api/sellers", username],
    queryFn: async () => {
      const response = await fetch(`/api/sellers/${username}`);
      if (!response.ok) throw new Error("Seller not found");
      return response.json();
    },
    enabled: !!username,
  });

  // Fetch seller's products
  const { data: products, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products/seller", seller?.id],
    queryFn: async () => {
      const response = await fetch(`/api/products/seller/${seller.id}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    enabled: !!seller?.id,
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

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Seller not found. Please check the username and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Store Header */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <div className="flex items-center gap-4">
            {seller.logoUrl && (
              <img 
                src={seller.logoUrl} 
                alt={seller.storeName} 
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-store-name">{seller.storeName}</h1>
              {seller.storeDescription && (
                <p className="text-muted-foreground mt-1" data-testid="text-store-description">
                  {seller.storeDescription}
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
