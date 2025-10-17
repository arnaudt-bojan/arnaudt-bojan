import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Store, Grid3x3, LayoutGrid, LayoutList, Eye } from "lucide-react";
import { ProductFiltersSheet } from "@/components/product-filters-sheet";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import type { User, Product } from "@shared/schema";

interface FilterOptions {
  categories: string[];
  productTypes: string[];
  priceRange: [number, number];
  sizes: string[];
  colors: string[];
  sortBy: string;
}

export default function SellerStorefront() {
  const { username } = useParams();
  const [, setLocation] = useLocation();
  const [cardSize, setCardSize] = useState<"compact" | "medium" | "large">("medium");
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    productTypes: [],
    priceRange: [0, 10000],
    sortBy: "newest",
    sizes: [],
    colors: [],
  });

  // Check for preview mode from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewMode = searchParams.get('preview') === 'true';
  const previewLogo = searchParams.get('previewLogo') || '';
  const previewBanner = searchParams.get('previewBanner') || '';

  // Check if current user is authenticated
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch seller by username - DON'T throw on 404, handle gracefully
  const { data: seller, isLoading: sellerLoading } = useQuery<any>({
    queryKey: ["/api/sellers", username],
    queryFn: async () => {
      const response = await fetch(`/api/sellers/${username}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    enabled: !!username && !isPreviewMode, // Don't fetch if in preview mode
    retry: false,
  });

  // Check if logged-in user is viewing their own store (fallback)
  const isOwnStore = currentUser && currentUser.username === username;
  
  // In preview mode, ALWAYS use current user (seller) with preview overrides
  // Preview mode is only accessible when viewing your own store setup
  // Override username, logo, and banner with preview values from URL
  const effectiveSeller = isPreviewMode && currentUser 
    ? { ...currentUser, username: username, storeLogo: previewLogo, storeBanner: previewBanner }
    : (seller || (isOwnStore ? currentUser : null));

  // Fetch seller's products - use effectiveSeller to support fallback
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
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

  // Filter and sort products
  const filteredProducts = products
    ?.filter((p) => {
      // CRITICAL BUG FIX: Only hide sold-out IN-STOCK products
      // Pre-order and made-to-order products should display regardless of stock
      // product.stock is the single source of truth for in-stock products only
      if (p.productType === 'in-stock' && (p.stock ?? 0) <= 0) return false;
      
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(p.category)) {
        return false;
      }
      
      // Product type filter
      if (filters.productTypes.length > 0 && !filters.productTypes.includes(p.productType)) {
        return false;
      }
      
      // Price filter
      const price = parseFloat(p.price);
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "price-low":
          return parseFloat(a.price) - parseFloat(b.price);
        case "price-high":
          return parseFloat(b.price) - parseFloat(a.price);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "newest":
        default:
          return 0;
      }
    });

  // Calculate max price for filter
  const maxPrice = products 
    ? Math.max(...products.map(p => parseFloat(p.price)), 1000)
    : 1000;
  
  // Dynamic grid classes based on card size
  const getGridClasses = () => {
    switch (cardSize) {
      case "compact":
        return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4";
      case "medium":
        return "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6";
      case "large":
        return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8";
      default:
        return "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6";
    }
  };

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
      <div className="min-h-screen flex flex-col">
        {/* Empty State */}
        <div className="container py-12 flex-1">
          <div className="text-center max-w-md mx-auto">
            <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Store Not Available</h2>
            <p className="text-muted-foreground">
              The store "@{username}" could not be found or is not currently active. 
              The store owner may need to activate their store or complete setup.
            </p>
          </div>
        </div>
        
        <Footer sellerInfo={null} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Banner - Only show if uploaded */}
      {effectiveSeller.storeBanner && (
        <div className="relative w-full aspect-[21/9] md:aspect-[21/7] overflow-hidden">
          <img 
            src={effectiveSeller.storeBanner} 
            alt="Store banner" 
            className="w-full h-full object-cover"
            data-testid="img-store-banner"
          />
        </div>
      )}

      {/* Preview Mode Ribbon */}
      {isPreviewMode && (
        <div className="container mx-auto px-4 max-w-7xl pt-8">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Preview Mode - Browse Only</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This is how customers will see your storefront. Purchasing is disabled in preview mode. Close this window to return to your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="container mx-auto px-4 max-w-7xl py-8 flex-1">
        {/* Controls Bar */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          {/* Left: Filter Button */}
          <div className="flex gap-2 items-center">
            <ProductFiltersSheet 
              onFilterChange={setFilters} 
              maxPrice={maxPrice}
            />
          </div>
          
          {/* Right: Card Size Controls */}
          <div className="flex gap-1 items-center">
            <span className="text-sm text-muted-foreground mr-2">View:</span>
            <Button
              variant={cardSize === "compact" ? "default" : "outline"}
              size="sm"
              onClick={() => setCardSize("compact")}
              className="gap-1.5"
              data-testid="button-view-compact"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              Compact
            </Button>
            <Button
              variant={cardSize === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setCardSize("medium")}
              className="gap-1.5"
              data-testid="button-view-medium"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Medium
            </Button>
            <Button
              variant={cardSize === "large" ? "default" : "outline"}
              size="sm"
              onClick={() => setCardSize("large")}
              className="gap-1.5"
              data-testid="button-view-large"
            >
              <LayoutList className="h-3.5 w-3.5" />
              Large
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {productsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading products...</p>
          </div>
        ) : !filteredProducts || filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {products && products.length > 0 ? "No products match your filters" : "No products available"}
            </h2>
            <p className="text-muted-foreground">
              {products && products.length > 0 ? "Try adjusting your filters to see more products." : "This store doesn't have any products yet."}
            </p>
          </div>
        ) : (
          <div className={getGridClasses()}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Footer with seller info */}
      <Footer sellerInfo={effectiveSeller} />
    </div>
  );
}
