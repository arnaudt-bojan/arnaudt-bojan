import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package2, ArrowRight, Layers } from "lucide-react";
import { useLocation } from "wouter";
import { useCurrency } from "@/contexts/CurrencyContext";

interface WholesaleProduct {
  id: string;
  sellerId: string;
  productId?: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rrp: string;
  wholesalePrice: string;
  moq: number;
  depositAmount?: string;
  requiresDeposit: number;
  stock: number;
  readinessDays?: number;
  variants?: Array<{
    size: string;
    color: string;
    stock: number;
    image?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function BuyerWholesaleCatalog() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();

  const { data: products, isLoading } = useQuery<WholesaleProduct[]>({
    queryKey: ["/api/wholesale/buyer/catalog"],
  });

  if (isLoading) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Wholesale Catalog
          </h1>
          <p className="text-muted-foreground">
            Browse professional B2B products with exclusive wholesale pricing
          </p>
        </div>

        {!products || products.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="flex flex-col items-center gap-4">
              <Package2 className="h-20 w-20 text-muted-foreground" />
              <div>
                <h3 className="text-2xl font-semibold mb-2">No Products Available</h3>
                <p className="text-muted-foreground">
                  Check back soon for new wholesale offerings
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const margin = ((parseFloat(product.rrp) - parseFloat(product.wholesalePrice)) / parseFloat(product.rrp)) * 100;
              const hasVariants = product.variants && product.variants.length > 0;
              
              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden hover-elevate cursor-pointer transition-all"
                  onClick={() => setLocation(`/wholesale/product/${product.id}`)}
                  data-testid={`card-product-${product.id}`}
                >
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      data-testid={`img-product-${product.id}`}
                    />
                    {/* Category Badge - Top Left */}
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                        {product.category}
                      </Badge>
                    </div>
                    {/* Margin Badge - Top Right */}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-green-600 text-white backdrop-blur-sm">
                        {margin.toFixed(0)}% margin
                      </Badge>
                    </div>
                    {/* Variants Indicator - Bottom Left */}
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2 leading-snug" data-testid={`text-name-${product.id}`}>
                      {product.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2">
                      {/* Wholesale Price - Prominent */}
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">Your Price</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary" data-testid={`text-wholesale-price-${product.id}`}>
                            {formatPrice(parseFloat(product.wholesalePrice))}
                          </div>
                          <div className="text-xs text-muted-foreground line-through">
                            RRP {formatPrice(parseFloat(product.rrp))}
                          </div>
                        </div>
                      </div>

                      {/* MOQ - Small Badge */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Min Order</span>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-moq-${product.id}`}>
                          {product.moq} units
                        </Badge>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <Button 
                      variant="ghost"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/wholesale/product/${product.id}`);
                      }}
                      data-testid={`button-view-${product.id}`}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
