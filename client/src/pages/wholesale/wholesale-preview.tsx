import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package2, Search, Eye } from "lucide-react";
import { formatPrice } from "@/lib/currency-utils";

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

export default function WholesalePreview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch seller's wholesale products
  const { data: products, isLoading } = useQuery<WholesaleProduct[]>({
    queryKey: ["/api/wholesale/products"],
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
      <div className="space-y-6" data-testid="page-wholesale-preview">
        <div className="flex items-center gap-3">
          <Eye className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Preview Wholesale Catalog</h1>
            <p className="text-muted-foreground mt-1">
              See how your wholesale catalog appears to buyers
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
          <p className="text-sm font-medium">Preview Mode</p>
          <p className="text-sm text-muted-foreground mt-1">
            This is how buyers will see your wholesale catalog when they access it
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted" />
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-wholesale-preview">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Eye className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Preview Wholesale Catalog</h1>
          <p className="text-muted-foreground mt-1">
            See how your wholesale catalog appears to buyers
          </p>
        </div>
      </div>

      {/* Preview Notice */}
      <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
        <p className="text-sm font-medium">Preview Mode</p>
        <p className="text-sm text-muted-foreground mt-1">
          This is how buyers will see your wholesale catalog when they access it
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-preview"
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
            All Categories
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

      {/* Products Grid */}
      {!filteredProducts || filteredProducts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-4">
            <Package2 className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">No Products in Catalog</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory
                  ? "Try adjusting your search or filters"
                  : "Create wholesale products to see them in your catalog preview"}
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
              <div className="aspect-square overflow-hidden bg-muted">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    data-testid={`img-product-${product.id}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package2 className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
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
                      {formatPrice(parseFloat(product.wholesalePrice), 'USD')}
                    </span>
                  </div>
                  {product.rrp && parseFloat(product.rrp) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">RRP</span>
                      <span className="text-sm" data-testid={`text-rrp-${product.id}`}>
                        {formatPrice(parseFloat(product.rrp), 'USD')}
                      </span>
                    </div>
                  )}
                  {product.srp && parseFloat(product.srp) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Suggested Retail</span>
                      <span className="text-sm">
                        {formatPrice(parseFloat(product.srp), 'USD')}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Min. Order Qty</span>
                      <Badge variant="outline" data-testid={`text-moq-${product.id}`}>
                        {product.moq} units
                      </Badge>
                    </div>
                  </div>
                  {product.requiresDeposit === 1 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Deposit Required</span>
                      <span className="font-medium">
                        {product.depositPercentage}% ({formatPrice(parseFloat(product.depositAmount || '0'), 'USD')})
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Stock Available</span>
                    <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
                      {product.stock > 0 ? `${product.stock} units` : "Out of stock"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled data-testid={`button-view-${product.id}`}>
                  Preview Only
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
