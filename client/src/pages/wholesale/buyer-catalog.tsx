import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package2, Search, Eye, Grid3x3, LayoutGrid, LayoutList, ChevronRight, Home, Layers } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useCurrency } from "@/contexts/CurrencyContext";
import { WholesaleStorefrontHeader } from "@/components/headers/wholesale-storefront-header";
import { useCart } from "@/lib/cart-context";
import { CartSheet } from "@/components/cart-sheet";
import { WholesaleFiltersSheet, type WholesaleFilterOptions } from "@/components/wholesale-filters-sheet";

interface WholesaleProduct {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  image: string;
  images?: string[];
  category: string;
  sku?: string;
  rrp: string;
  wholesalePrice: string;
  moq: number;
  depositAmount?: string;
  depositPercentage?: string;
  requiresDeposit: number;
  stock: number;
  readinessType?: string;
  readinessDays?: number;
  readinessValue?: string;
  balancePaymentTerms?: string;
  variants?: any[];
  createdAt: string;
}

type CardSize = "compact" | "medium" | "large";

const DEFAULT_FILTERS: WholesaleFilterOptions = {
  categoryL1: [],
  categoryL2: [],
  categoryL3: [],
  priceRange: [0, 100000],
  moqRange: [0, 10000],
  requiresDeposit: null,
  inStock: false,
  paymentTerms: [],
  readinessType: [],
  sortBy: "newest",
};

export default function BuyerCatalog() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { itemsCount } = useCart();
  const [cardSize, setCardSize] = useState<CardSize>("medium");
  const [filters, setFilters] = useState<WholesaleFilterOptions>(DEFAULT_FILTERS);
  const [selectedBreadcrumb, setSelectedBreadcrumb] = useState<{ level1?: string; level2?: string; level3?: string }>({});

  // Check for preview mode
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewMode = searchParams.get('preview') === 'true';

  // Build query string for server-side filtering (Architecture 3)
  const buildQueryString = () => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (filters.categoryL1.length > 0) filters.categoryL1.forEach(c => params.append('categoryL1', c));
    if (filters.categoryL2.length > 0) filters.categoryL2.forEach(c => params.append('categoryL2', c));
    if (filters.categoryL3.length > 0) filters.categoryL3.forEach(c => params.append('categoryL3', c));
    if (filters.priceRange[0] > 0) params.set('minPrice', filters.priceRange[0].toString());
    if (filters.priceRange[1] < 100000) params.set('maxPrice', filters.priceRange[1].toString());
    if (filters.moqRange[0] > 0) params.set('minMoq', filters.moqRange[0].toString());
    if (filters.moqRange[1] < 10000) params.set('maxMoq', filters.moqRange[1].toString());
    if (filters.requiresDeposit !== null) params.set('requiresDeposit', filters.requiresDeposit.toString());
    if (filters.inStock) params.set('inStock', 'true');
    if (filters.paymentTerms.length > 0) filters.paymentTerms.forEach(t => params.append('paymentTerms', t));
    if (filters.readinessType.length > 0) filters.readinessType.forEach(t => params.append('readinessType', t));
    if (selectedBreadcrumb.level1) params.set('categoryL1', selectedBreadcrumb.level1);
    if (selectedBreadcrumb.level2) params.set('categoryL2', selectedBreadcrumb.level2);
    if (selectedBreadcrumb.level3) params.set('categoryL3', selectedBreadcrumb.level3);
    params.set('sortBy', filters.sortBy);
    
    return params.toString();
  };

  const queryString = buildQueryString();
  
  const { data: products, isLoading } = useQuery<WholesaleProduct[]>({
    queryKey: ["/api/wholesale/catalog", queryString],
    queryFn: async () => {
      const response = await fetch(`/api/wholesale/catalog?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch catalog");
      return response.json();
    },
  });

  // Extract unique categories by parsing the category field (Level 1 > Level 2 > Level 3)
  const extractCategories = (products: WholesaleProduct[]) => {
    const level1Set = new Set<string>();
    const level2Set = new Set<string>();
    const level3Set = new Set<string>();

    products?.forEach(product => {
      if (product.category) {
        const parts = product.category.split('>').map(p => p.trim());
        if (parts[0]) level1Set.add(parts[0]);
        if (parts[1]) level2Set.add(parts[1]);
        if (parts[2]) level3Set.add(parts[2]);
      }
    });

    return {
      level1: Array.from(level1Set).sort(),
      level2: Array.from(level2Set).sort(),
      level3: Array.from(level3Set).sort(),
    };
  };

  // Extract unique payment terms and readiness types
  const extractFilterOptions = (products: WholesaleProduct[]) => {
    const paymentTermsSet = new Set<string>();
    const readinessTypesSet = new Set<string>();

    products?.forEach(product => {
      if (product.balancePaymentTerms) paymentTermsSet.add(product.balancePaymentTerms);
      if (product.readinessType) readinessTypesSet.add(product.readinessType);
    });

    return {
      paymentTerms: Array.from(paymentTermsSet).sort(),
      readinessTypes: Array.from(readinessTypesSet).sort(),
    };
  };

  const categories = extractCategories(products || []);
  const filterOptions = extractFilterOptions(products || []);

  // Calculate max price and MOQ
  const maxPrice = products ? Math.max(...products.map(p => parseFloat(p.wholesalePrice)), 100000) : 100000;
  const maxMoq = products ? Math.max(...products.map(p => p.moq), 10000) : 10000;

  // Server already filtered/sorted products (Architecture 3)
  const filteredProducts = products;

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

  // Breadcrumb navigation
  const handleBreadcrumbClick = (level: 'level1' | 'level2' | 'level3', value?: string) => {
    if (level === 'level1') {
      setSelectedBreadcrumb({ level1: value });
    } else if (level === 'level2') {
      setSelectedBreadcrumb({ level1: selectedBreadcrumb.level1, level2: value });
    } else if (level === 'level3') {
      setSelectedBreadcrumb({ level1: selectedBreadcrumb.level1, level2: selectedBreadcrumb.level2, level3: value });
    }
  };

  const clearBreadcrumb = () => {
    setSelectedBreadcrumb({});
  };

  if (isLoading) {
    return (
      <>
        <WholesaleStorefrontHeader cartItemsCount={itemsCount} onCartClick={() => setIsCartOpen(true)} />
        <div className="min-h-screen py-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Wholesale Catalog</h1>
              <p className="text-muted-foreground">Loading products...</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="aspect-square bg-muted" />
                  <CardHeader className="pb-3">
                    <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
        <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
      </>
    );
  }

  return (
    <>
      <WholesaleStorefrontHeader cartItemsCount={itemsCount} onCartClick={() => setIsCartOpen(true)} />
      <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {isPreviewMode && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Preview Mode - Browse Only</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This is how buyers will see your wholesale storefront. Purchasing is disabled in preview mode. Close this window to return to your dashboard.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Wholesale Catalog
          </h1>
          <p className="text-muted-foreground">
            Browse professional B2B products with exclusive wholesale pricing
          </p>
        </div>

        {/* Breadcrumb Navigation */}
        {(selectedBreadcrumb.level1 || selectedBreadcrumb.level2 || selectedBreadcrumb.level3) && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearBreadcrumb}
              className="gap-1"
              data-testid="breadcrumb-home"
            >
              <Home className="h-3.5 w-3.5" />
              All Products
            </Button>
            {selectedBreadcrumb.level1 && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBreadcrumbClick('level1', selectedBreadcrumb.level1)}
                  data-testid={`breadcrumb-l1-${selectedBreadcrumb.level1}`}
                >
                  {selectedBreadcrumb.level1}
                </Button>
              </>
            )}
            {selectedBreadcrumb.level2 && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBreadcrumbClick('level2', selectedBreadcrumb.level2)}
                  data-testid={`breadcrumb-l2-${selectedBreadcrumb.level2}`}
                >
                  {selectedBreadcrumb.level2}
                </Button>
              </>
            )}
            {selectedBreadcrumb.level3 && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="default" data-testid={`breadcrumb-l3-${selectedBreadcrumb.level3}`}>
                  {selectedBreadcrumb.level3}
                </Badge>
              </>
            )}
          </div>
        )}

        {/* Controls Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Left: Search and Filters */}
          <div className="flex gap-2 flex-1 w-full md:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, SKU, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <WholesaleFiltersSheet
              onFilterChange={setFilters}
              maxPrice={maxPrice}
              maxMoq={maxMoq}
              availableCategories={categories}
              availablePaymentTerms={filterOptions.paymentTerms}
              availableReadinessTypes={filterOptions.readinessTypes}
            />
          </div>

          {/* Right: View Options */}
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
              <span className="hidden sm:inline">Compact</span>
            </Button>
            <Button
              variant={cardSize === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setCardSize("medium")}
              className="gap-1.5"
              data-testid="button-view-medium"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Medium</span>
            </Button>
            <Button
              variant={cardSize === "large" ? "default" : "outline"}
              size="sm"
              onClick={() => setCardSize("large")}
              className="gap-1.5"
              data-testid="button-view-large"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Large</span>
            </Button>
          </div>
        </div>

        {/* Products Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredProducts?.length || 0} products found
        </div>

        {/* Products Grid */}
        {!filteredProducts || filteredProducts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center gap-4">
              <Package2 className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v)
                    ? "Try adjusting your search or filters"
                    : "No wholesale products available at this time"}
                </p>
                {(searchQuery || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v)) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setFilters(DEFAULT_FILTERS);
                      clearBreadcrumb();
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={getGridClasses()}>
            {filteredProducts.map((product) => {
              const margin = ((parseFloat(product.rrp) - parseFloat(product.wholesalePrice)) / parseFloat(product.rrp)) * 100;
              const hasVariants = product.variants && product.variants.length > 0;
              
              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden hover-elevate transition-all cursor-pointer"
                  onClick={() => setLocation(`/wholesale/products/${product.id}`)}
                  data-testid={`card-product-${product.id}`}
                >
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-product-${product.id}`}
                    />
                    {/* Margin Badge - Top Right */}
                    {margin > 0 && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-green-600 text-white backdrop-blur-sm">
                          {margin.toFixed(0)}% margin
                        </Badge>
                      </div>
                    )}
                    {/* Variants Indicator */}
                    {hasVariants && (
                      <div className="absolute bottom-3 left-3">
                        <Badge variant="outline" className="backdrop-blur-sm bg-background/90 gap-1">
                          <Layers className="h-3 w-3" />
                          Variants
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <CardHeader className={cardSize === "compact" ? "pb-2 pt-3 px-3" : "pb-3"}>
                    <CardTitle className={cardSize === "compact" ? "text-sm line-clamp-1 leading-snug" : "text-lg line-clamp-2 leading-snug"} data-testid={`text-name-${product.id}`}>
                      {product.name}
                    </CardTitle>
                    {cardSize !== "compact" && product.sku && (
                      <CardDescription className="text-xs">SKU: {product.sku}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className={cardSize === "compact" ? "pt-0 pb-3 px-3" : "pt-0 pb-4"}>
                    <div className="space-y-2">
                      {/* Wholesale Price */}
                      <div className="flex items-baseline justify-between">
                        <span className={cardSize === "compact" ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>Your Price</span>
                        <div className="text-right">
                          <div className={cardSize === "compact" ? "text-lg font-bold text-primary" : "text-2xl font-bold text-primary"} data-testid={`text-wholesale-price-${product.id}`}>
                            {formatPrice(parseFloat(product.wholesalePrice))}
                          </div>
                          {cardSize !== "compact" && (
                            <div className="text-xs text-muted-foreground line-through">
                              RRP {formatPrice(parseFloat(product.rrp))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* MOQ */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Min Order</span>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-moq-${product.id}`}>
                          {product.moq} units
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
    <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
