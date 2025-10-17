import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package2, ArrowRight, Layers, ExternalLink, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { User } from "@shared/schema";

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
  variants?: any[];
}

export default function WholesalePreview() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch current user for preview
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch seller's wholesale products
  const { data: products, isLoading } = useQuery<WholesaleProduct[]>({
    queryKey: ["/api/wholesale/products"],
  });

  const handleOpenLivePreview = () => {
    if (!currentUser) return;
    
    // Get current origin (e.g., https://domain.replit.dev)
    const origin = window.location.origin;
    
    // Build preview URL with query params for banner/logo
    const previewParams = new URLSearchParams();
    previewParams.set('preview', 'true');
    if (currentUser.storeLogo) previewParams.set('previewLogo', currentUser.storeLogo);
    if (currentUser.storeBanner) previewParams.set('previewBanner', currentUser.storeBanner);
    
    // Use wholesale catalog route with preview params
    const url = `${origin}/wholesale/catalog?${previewParams.toString()}`;
    
    // Open in new window
    window.open(url, '_blank', 'width=1400,height=900');
    setPreviewUrl(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-wholesale-preview">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Preview Wholesale Storefront</h1>
              <p className="text-muted-foreground mt-1">
                See your wholesale catalog as buyers would see it
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
    );
  }

  return (
    <div className="space-y-6" data-testid="page-wholesale-preview">
      {/* Header with Live Preview Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Wholesale Storefront Preview</h1>
            <p className="text-muted-foreground mt-1">
              Preview your branded wholesale storefront before sharing with buyers
            </p>
          </div>
        </div>
        
        <Button 
          size="lg" 
          onClick={handleOpenLivePreview}
          className="gap-2"
          data-testid="button-open-live-preview"
        >
          <ExternalLink className="h-5 w-5" />
          Open Live Preview
        </Button>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Live Preview</h3>
              <p className="text-sm text-muted-foreground">
                See exactly what buyers see - including your banner, logo, and all products
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Package2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Interactive Catalog</h3>
              <p className="text-sm text-muted-foreground">
                Click products, view PDPs, and navigate just like a real buyer
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Full Branding</h3>
              <p className="text-sm text-muted-foreground">
                Your custom banner, logo, and brand colors displayed perfectly
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Info */}
      <div className="bg-muted/50 rounded-lg p-6 border">
        <h3 className="font-semibold mb-3">About Live Preview</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Opens in a new window with your actual wholesale storefront</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Shows your banner image, logo, and all wholesale products</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Fully interactive - click products to see PDPs with pricing, MOQ, and all details</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Cart and checkout are simulated for preview only</span>
          </li>
        </ul>
      </div>

      {/* Quick Product Overview */}
      {!products || products.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-4">
            <Package2 className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">No Products in Catalog</h3>
              <p className="text-muted-foreground mb-4">
                Create wholesale products to preview your storefront
              </p>
              <Button onClick={() => setLocation("/wholesale/products/create")}>
                Create First Product
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Your Wholesale Products</h2>
              <p className="text-muted-foreground">
                {products.length} product{products.length !== 1 ? 's' : ''} in your catalog
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product) => {
              const margin = ((parseFloat(product.rrp) - parseFloat(product.wholesalePrice)) / parseFloat(product.rrp)) * 100;
              const hasVariants = product.variants && product.variants.length > 0;
              
              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden hover-elevate transition-all"
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
                    {/* Category Badge - Top Left */}
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                        {product.category}
                      </Badge>
                    </div>
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2 leading-snug" data-testid={`text-name-${product.id}`}>
                      {product.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2">
                      {/* Wholesale Price */}
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

          {products.length > 8 && (
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                + {products.length - 8} more products in your catalog
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
