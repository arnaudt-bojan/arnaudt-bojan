import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductType } from "@shared/schema";
import { Package, Grid3x3, LayoutGrid, Grip, ImagePlus, Plus, Store, Search, AlertCircle } from "lucide-react";
import { detectDomain } from "@/lib/domain-utils";
import { ProductFiltersSheet } from "@/components/product-filters-sheet";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SubscriptionPricingDialog } from "@/components/subscription-pricing-dialog";
import { StoreUnavailable } from "@/components/store-unavailable";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";

type CardSize = "compact" | "medium" | "large";

interface FilterOptions {
  categories: string[];
  productTypes: string[];
  priceRange: [number, number];
  sizes: string[];
  colors: string[];
  sortBy: string;
}

export default function Products() {
  const [cardSize, setCardSize] = useState<CardSize>("medium");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    productTypes: [],
    priceRange: [0, 10000],
    sizes: [],
    colors: [],
    sortBy: "newest",
  });
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const isSeller = user?.role === 'admin' || user?.role === 'editor' || user?.role === 'viewer' || user?.role === 'seller' || user?.role === 'owner';
  
  // Load card size preference from localStorage
  useEffect(() => {
    const savedSize = localStorage.getItem("productCardSize") as CardSize;
    if (savedSize) {
      setCardSize(savedSize);
    }
  }, []);
  
  // Save card size preference to localStorage
  const handleCardSizeChange = (size: CardSize) => {
    setCardSize(size);
    localStorage.setItem("productCardSize", size);
  };

  // Detect which seller's store we're viewing
  const domainInfo = detectDomain();
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [sellerNotFound, setSellerNotFound] = useState(false);
  
  // Check for preview mode (from settings page) or seller filter (from share link)
  const urlParams = new URLSearchParams(window.location.search);
  const previewUsername = urlParams.get('preview');
  const sellerUsername = urlParams.get('seller'); // Share link parameter
  const isPreviewMode = !!previewUsername;
  const isSellerFilterMode = !!sellerUsername; // Share link mode
  
  // Get seller info if on seller domain OR in preview mode OR in seller filter mode (share link)
  useEffect(() => {
    const fetchSeller = async (username: string) => {
      try {
        const res = await fetch(`/api/sellers/${username}`);
        if (!res.ok) {
          // Seller not found
          setSellerNotFound(true);
          setSellerInfo(null);
          return;
        }
        const data = await res.json();
        setSellerInfo(data);
        setSellerNotFound(false);
      } catch (error) {
        console.error('Error fetching seller:', error);
        setSellerNotFound(true);
        setSellerInfo(null);
      }
    };

    if (previewUsername) {
      // Preview mode: fetch seller by username (secure endpoint)
      fetchSeller(previewUsername);
    } else if (sellerUsername) {
      // Share link mode: fetch seller by username
      fetchSeller(sellerUsername);
    } else if (domainInfo.isSellerDomain && domainInfo.sellerUsername) {
      // Seller storefront: fetch seller by username from domain
      fetchSeller(domainInfo.sellerUsername);
    }
  }, [domainInfo.sellerUsername, previewUsername, sellerUsername]);

  // Check if logged-in user is viewing their own store (fallback)
  const targetUsername = domainInfo.sellerUsername || previewUsername || sellerUsername;
  const isOwnStore = isSeller && user && user.username === targetUsername;
  
  // Use logged-in seller as fallback if they're viewing their own store
  const effectiveSellerInfo = sellerNotFound && isOwnStore ? user : sellerInfo;
  
  // Fetch products - filter by seller if:
  // 1. On seller subdomain, OR
  // 2. In preview mode, OR
  // 3. In seller filter mode (share link with ?seller=username), OR
  // 4. Logged in as seller viewing their own products
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: (domainInfo.isSellerDomain || isPreviewMode || isSellerFilterMode) && effectiveSellerInfo?.id 
      ? ["/api/products/seller", effectiveSellerInfo.id]
      : isSeller && user?.id && !isPreviewMode && !isSellerFilterMode
      ? ["/api/products/seller", user.id]
      : ["/api/products"],
    // SECURITY: Only enable query if:
    // - Not on seller domain/preview/filter mode (show all products), OR
    // - On seller domain/preview/filter mode AND seller found OR fallback to own store (show seller products)
    // - Never show all products when on seller domain but seller not found AND not own store
    enabled: (!domainInfo.isSellerDomain && !isPreviewMode && !isSellerFilterMode) || (!!effectiveSellerInfo && (!sellerNotFound || isOwnStore)),
  });

  const { data: sellers } = useQuery<any[]>({
    queryKey: ["/api/sellers"],
  });

  // Apply filters and sorting
  const filteredAndSortedProducts = products
    ?.filter((p) => {
      // Product type filter
      if (filters.productTypes.length > 0 && !filters.productTypes.includes(p.productType)) return false;
      
      // Category filter
      if (filters.categories.length > 0) {
        const productCategories = [
          (p as any).categoryLevel1Id,
          (p as any).categoryLevel2Id,
          (p as any).categoryLevel3Id
        ].filter(Boolean);
        
        if (!productCategories.some(catId => filters.categories.includes(catId))) {
          return false;
        }
      }
      
      // Price filter
      const price = parseFloat(p.price);
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      
      // Size filter (check variants)
      if (filters.sizes.length > 0 && (p as any).variants) {
        const variants = (p as any).variants;
        const hasSizeMatch = variants.some((v: any) => filters.sizes.includes(v.size));
        if (!hasSizeMatch) return false;
      }
      
      // Color filter (check variants)
      if (filters.colors.length > 0 && (p as any).variants) {
        const variants = (p as any).variants;
        const hasColorMatch = variants.some((v: any) => filters.colors.includes(v.color));
        if (!hasColorMatch) return false;
      }
      
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
          return 0; // Keep original order (assuming newest first from backend)
      }
    });

  const handleAddToCart = (product: Product) => {
    const result = addItem(product);
    if (result.success) {
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    } else {
      toast({
        title: "Cannot add to cart",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  // Check subscription status and handle store activation
  const handleStoreToggle = (checked: boolean) => {
    if (checked) {
      // Activating store - check subscription
      const hasActiveSubscription = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trial';
      
      if (!hasActiveSubscription) {
        // No active subscription - show pricing dialog
        setShowSubscriptionDialog(true);
        return;
      }
    }
    
    // Either deactivating or has active subscription - proceed with toggle
    toggleStoreMutation.mutate(checked ? 1 : 0);
  };

  // Toggle store active status
  const toggleStoreMutation = useMutation({
    mutationFn: async (storeActive: number) => {
      return await apiRequest("PATCH", "/api/user/store-status", { storeActive });
    },
    onMutate: async (newStatus) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData(["/api/auth/user"]);

      // Optimistically update to the new value
      // Toggle is disabled when !user, so old should always exist
      queryClient.setQueryData(["/api/auth/user"], (old: any) => ({
        ...old,
        storeActive: newStatus,
      }));

      // Return context with previous value
      return { previousUser };
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables === 1 ? "Store activated" : "Store deactivated",
        description: variables === 1
          ? "Your store is now visible to customers" 
          : "Your store is now hidden from customers",
      });
    },
    onError: (error, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/auth/user"], context.previousUser);
      }
      toast({
        title: "Error",
        description: "Failed to update store status",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
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

  const sellerWithBanner = sellers?.find(s => s.storeBanner);
  const currentSellerHasBanner = effectiveSellerInfo?.storeBanner || user?.storeBanner;
  const currentSellerLogo = effectiveSellerInfo?.storeLogo || user?.storeLogo;

  // Check if viewing a seller domain with inactive store
  const isViewingInactiveStore = domainInfo.isSellerDomain && effectiveSellerInfo && effectiveSellerInfo.storeActive === 0;

  // Show store unavailable page for buyers viewing inactive seller stores
  if (isViewingInactiveStore && !isSeller) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 max-w-7xl">
          <StoreUnavailable 
            sellerName={effectiveSellerInfo.firstName || effectiveSellerInfo.username}
            sellerEmail={effectiveSellerInfo.email}
          />
        </div>
      </div>
    );
  }
  
  // If seller not found on seller domain/preview/filter mode, show storefront with message (stay in context)
  if ((domainInfo.isSellerDomain || isPreviewMode || isSellerFilterMode) && sellerNotFound && !isOwnStore) {
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
                <h1 className="text-3xl font-bold">
                  {targetUsername}'s Store
                </h1>
                <p className="text-muted-foreground mt-1">
                  This store is currently unavailable
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State - Stay in storefront context */}
        <div className="container py-12">
          <div className="text-center max-w-md mx-auto">
            <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Store Not Available</h2>
            <p className="text-muted-foreground">
              The store "@{targetUsername}" could not be found or is not currently active. 
              The store owner may need to activate their store or complete setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Banner Section */}
      {currentSellerHasBanner ? (
        <div className="relative w-full aspect-[21/9] md:aspect-[21/7] overflow-hidden">
          <img 
            src={currentSellerHasBanner} 
            alt="Store Banner" 
            className="w-full h-full object-cover"
            data-testid="img-store-banner"
          />
        </div>
      ) : isSeller && !isPreviewMode ? (
        <div className="relative w-full aspect-[21/9] md:aspect-[21/7] overflow-hidden mb-8 bg-muted/30 border-2 border-dashed border-muted-foreground/20">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ImagePlus className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">Add a banner to showcase your brand</p>
            <p className="text-sm text-muted-foreground/70 mb-4">Recommended size: 2000x500px</p>
            <Link href="/settings?tab=branding">
              <Button variant="outline" data-testid="button-add-banner">
                Add Banner
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      {/* Store Offline Message Bar */}
      {isSeller && !isPreviewMode && user?.storeActive !== 1 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your storefront is currently offline and hidden from customers.
                </p>
              </div>
              <Link href="/seller-dashboard">
                <Button size="sm" variant="outline" className="flex-shrink-0">
                  Activate Store
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-7xl py-8">

        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          {/* Left: Filters */}
          <div className="flex gap-2 items-center">
            <ProductFiltersSheet 
              onFilterChange={setFilters} 
              maxPrice={maxPrice}
            />
          </div>
          
          {/* Right: View Controls */}
          <div className="flex gap-1 items-center">
            <span className="text-sm text-muted-foreground mr-2">View:</span>
            <Button
              variant={cardSize === "compact" ? "default" : "outline"}
              size="icon"
              onClick={() => handleCardSizeChange("compact")}
              data-testid="button-view-compact"
              title="Compact view"
            >
              <Grip className="h-4 w-4" />
            </Button>
            <Button
              variant={cardSize === "medium" ? "default" : "outline"}
              size="icon"
              onClick={() => handleCardSizeChange("medium")}
              data-testid="button-view-medium"
              title="Medium view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={cardSize === "large" ? "default" : "outline"}
              size="icon"
              onClick={() => handleCardSizeChange("large")}
              data-testid="button-view-large"
              title="Large view"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className={getGridClasses()}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredAndSortedProducts && filteredAndSortedProducts.length > 0 ? (
          <div className={getGridClasses()}>
            {filteredAndSortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
            
            {/* New Listing Card for Sellers - Last Position */}
            {isSeller && !isPreviewMode && (
              <Link href="/seller/create-product">
                <div 
                  className="group relative aspect-square bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center gap-3 hover-elevate active-elevate-2 cursor-pointer transition-all"
                  data-testid="card-new-listing"
                >
                  <div className="rounded-full bg-primary/10 p-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center px-4">
                    <p className="font-semibold text-foreground">New Listing</p>
                    <p className="text-sm text-muted-foreground mt-1">Create a new product</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        ) : isSeller && !isPreviewMode ? (
          <div className={getGridClasses()}>
            {/* New Listing Card for Sellers when no products */}
            <Link href="/seller/create-product">
              <div 
                className="group relative aspect-square bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center gap-3 hover-elevate active-elevate-2 cursor-pointer transition-all"
                data-testid="card-new-listing"
              >
                <div className="rounded-full bg-primary/10 p-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center px-4">
                  <p className="font-semibold text-foreground">New Listing</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first product</p>
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              No products available at the moment
            </p>
          </div>
        )}
      </div>

      {/* Subscription Pricing Dialog */}
      <SubscriptionPricingDialog 
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
      />

      {/* Footer with seller social links */}
      <Footer sellerInfo={effectiveSellerInfo} />
    </div>
  );
}
