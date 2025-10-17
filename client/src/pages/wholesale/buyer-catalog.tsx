import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package2, Search, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useCurrency } from "@/contexts/CurrencyContext";
import { WholesaleStorefrontHeader } from "@/components/headers/wholesale-storefront-header";
import { useCart } from "@/lib/cart-context";
import { CartSheet } from "@/components/cart-sheet";

interface WholesaleProduct {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rrp: string;
  srp?: string;
  wholesalePrice: string;
  moq: number;
  depositAmount?: string;
  depositPercentage?: number;
  requiresDeposit: number;
  stock: number;
}

export default function BuyerCatalog() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { itemsCount } = useCart();

  // Check for preview mode
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewMode = searchParams.get('preview') === 'true';

  const { data: products, isLoading } = useQuery<WholesaleProduct[]>({
    queryKey: ["/api/wholesale/catalog"],
  });

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products?.map(p => p.category) || []));

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
                <p className="font-semibold text-blue-900 dark:text-blue-100">Preview Mode</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This is how buyers will see your wholesale storefront. Close this window to return to your dashboard.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Wholesale Catalog
          </h1>
          <p className="text-muted-foreground">
            Browse professional B2B products with exclusive wholesale pricing
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              data-testid="button-category-all"
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                data-testid={`button-category-${category}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {!filteredProducts || filteredProducts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center gap-4">
              <Package2 className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No Products Available</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory
                    ? "Try adjusting your search or filters"
                    : "Check back later for B2B offerings"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover-elevate"
                data-testid={`card-product-${product.id}`}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    data-testid={`img-product-${product.id}`}
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <CardTitle className="text-lg line-clamp-1" data-testid={`text-name-${product.id}`}>
                      {product.name}
                    </CardTitle>
                    <Badge variant="secondary">{product.category}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Wholesale Price</span>
                      <span className="text-xl font-bold text-primary" data-testid={`text-wholesale-price-${product.id}`}>
                        {formatPrice(parseFloat(product.wholesalePrice))}
                      </span>
                    </div>
                    {product.rrp && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">RRP</span>
                        <span className="text-sm" data-testid={`text-rrp-${product.id}`}>
                          {formatPrice(parseFloat(product.rrp))}
                        </span>
                      </div>
                    )}
                    {product.srp && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">SRP</span>
                        <span className="text-sm" data-testid={`text-srp-${product.id}`}>
                          {formatPrice(parseFloat(product.srp))}
                        </span>
                      </div>
                    )}
                    <div className="pt-2">
                      <Badge variant="outline" data-testid={`badge-moq-${product.id}`}>
                        Min Order: {product.moq} units
                      </Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => setLocation(`/wholesale/catalog/${product.id}`)}
                    data-testid={`button-view-details-${product.id}`}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
