import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package2, TrendingUp, ShoppingCart } from "lucide-react";
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
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Wholesale Catalog</h1>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted" />
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
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
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Wholesale Catalog
          </h1>
          <p className="text-muted-foreground">
            Browse B2B products with exclusive wholesale pricing
          </p>
        </div>

        {!products || products.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center gap-4">
              <Package2 className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No Wholesale Products Available</h3>
                <p className="text-muted-foreground">
                  Check back later for B2B offerings
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover-elevate cursor-pointer"
                onClick={() => setLocation(`/wholesale/product/${product.id}`)}
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
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">RRP</span>
                      <span className="text-sm line-through" data-testid={`text-rrp-${product.id}`}>
                        {formatPrice(parseFloat(product.rrp))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">MOQ</span>
                      <Badge variant="outline" data-testid={`badge-moq-${product.id}`}>
                        {product.moq} units
                      </Badge>
                    </div>
                    {product.variants && product.variants.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShoppingCart className="h-4 w-4" />
                          <span>Multiple variants available</span>
                        </div>
                      </div>
                    )}
                    {product.requiresDeposit === 1 && (
                      <Badge variant="secondary" className="w-full justify-center">
                        Deposit Required
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/wholesale/product/${product.id}`);
                    }}
                    data-testid={`button-view-${product.id}`}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
