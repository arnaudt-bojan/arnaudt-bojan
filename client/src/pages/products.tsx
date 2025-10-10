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
import { Package, Grid3x3, LayoutGrid, Grip, ImagePlus, Plus, Store, Search } from "lucide-react";
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
  
  // Check for preview mode (from settings page)
  const urlParams = new URLSearchParams(window.location.search);
  const previewUsername = urlParams.get('preview');
  const isPreviewMode = !!previewUsername;
  
  // Get seller info if on seller domain OR in preview mode
  useEffect(() => {
    if (previewUsername) {
      // Preview mode: fetch seller by username (secure endpoint)
      fetch(`/api/sellers/${previewUsername}`)
        .then(res => res.json())
        .then(data => setSellerInfo(data))
        .catch(console.error);
    } else if (domainInfo.isSellerDomain && domainInfo.sellerUsername) {
      fetch(`/api/sellers/${domainInfo.sellerUsername}`)
        .then(res => res.json())
        .then(data => setSellerInfo(data))
        .catch(console.error);
    }
  }, [domainInfo.sellerUsername, previewUsername]);
  
  // Fetch products - filter by seller if on seller subdomain OR if logged in as seller OR in preview mode
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: (domainInfo.isSellerDomain || isPreviewMode) && sellerInfo?.id 
      ? ["/api/products/seller", sellerInfo.id]
      : isSeller && user?.id && !isPreviewMode
      ? ["/api/products/seller", user.id]
      : ["/api/products"],
    enabled: (!domainInfo.isSellerDomain && !isPreviewMode) || !!sellerInfo,
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
        return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4";
      case "medium":
        return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";
      case "large":
        return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8";
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6";
    }
  };

  const sellerWithBanner = sellers?.find(s => s.storeBanner);
  const currentSellerHasBanner = user?.storeBanner || sellerInfo?.storeBanner;
  const currentSellerLogo = user?.storeLogo || sellerInfo?.storeLogo;

  // Check if viewing a seller domain with inactive store
  const isViewingInactiveStore = domainInfo.isSellerDomain && sellerInfo && sellerInfo.storeActive === 0;

  // Show store unavailable page for buyers viewing inactive seller stores
  if (isViewingInactiveStore && !isSeller) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 max-w-7xl">
          <StoreUnavailable 
            sellerName={sellerInfo.firstName || sellerInfo.username}
            sellerEmail={sellerInfo.email}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Banner Section */}
      {currentSellerHasBanner ? (
        <div className="relative h-[300px] w-full overflow-hidden mb-8">
          <img 
            src={currentSellerHasBanner} 
            alt="Store Banner" 
            className="w-full h-full object-cover"
            data-testid="img-store-banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="container mx-auto px-4 py-8 flex items-end gap-6">
              {currentSellerLogo && (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 bg-white flex-shrink-0">
                  <img 
                    src={currentSellerLogo} 
                    alt="Store Logo" 
                    className="w-full h-full object-cover"
                    data-testid="img-store-logo"
                  />
                </div>
              )}
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {user?.firstName || sellerInfo?.firstName ? `${user?.firstName || sellerInfo?.firstName}'s Store` : "Featured Store"}
                </h2>
                <p className="text-white/90 text-lg">
                  Discover amazing products
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : isSeller && !isPreviewMode ? (
        <div className="relative h-[200px] w-full overflow-hidden mb-8 bg-muted/30 border-2 border-dashed border-muted-foreground/20">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ImagePlus className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">Add a banner to showcase your brand</p>
            <p className="text-sm text-muted-foreground/70 mb-4">Recommended size: 1920x300px</p>
            <Link href="/settings?tab=branding">
              <Button variant="outline" data-testid="button-add-banner">
                Add Banner
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="mb-12 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">
              {user?.firstName || sellerInfo?.firstName ? `${user?.firstName || sellerInfo?.firstName}'s Store` : "All Products"}
            </h1>
          </div>
          
          {isSeller && !isPreviewMode && (
            <div className="flex items-center gap-3 bg-card border rounded-lg px-4 py-3">
              <Store className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <Label htmlFor="store-active" className="text-sm font-medium cursor-pointer">
                  Store Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  {user?.storeActive === 1 ? "Active & Visible" : "Inactive & Hidden"}
                </p>
              </div>
              <Switch
                id="store-active"
                checked={user?.storeActive === 1}
                onCheckedChange={handleStoreToggle}
                disabled={toggleStoreMutation.isPending || !user}
                data-testid="switch-store-active"
              />
            </div>
          )}
        </div>

        <div className="mb-8 flex items-center justify-end gap-4 flex-wrap">
          <div className="flex gap-2 items-center">
            <ProductFiltersSheet 
              onFilterChange={setFilters} 
              maxPrice={maxPrice}
            />
            
            <div className="flex gap-1 items-center ml-2">
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
    </div>
  );
}
