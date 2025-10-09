import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductType } from "@shared/schema";
import { Package, Grid3x3, LayoutGrid, Grip } from "lucide-react";

type CardSize = "compact" | "medium" | "large";

export default function Products() {
  const [selectedType, setSelectedType] = useState<ProductType | "all">("all");
  const [cardSize, setCardSize] = useState<CardSize>("medium");
  const { addItem } = useCart();
  const { toast } = useToast();
  
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

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: sellers } = useQuery<any[]>({
    queryKey: ["/api/sellers"],
  });

  const productTypes: Array<{ value: ProductType | "all"; label: string }> = [
    { value: "all", label: "All Products" },
    { value: "in-stock", label: "In Stock" },
    { value: "pre-order", label: "Pre-Order" },
    { value: "made-to-order", label: "Made to Order" },
    { value: "wholesale", label: "Wholesale" },
  ];

  const filteredProducts =
    selectedType === "all"
      ? products
      : products?.filter((p) => p.productType === selectedType);

  const handleAddToCart = (product: Product) => {
    addItem(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };
  
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

  return (
    <div className="min-h-screen">
      {sellerWithBanner?.storeBanner && (
        <div className="relative h-[300px] w-full overflow-hidden mb-8">
          <img 
            src={sellerWithBanner.storeBanner} 
            alt="Store Banner" 
            className="w-full h-full object-cover"
            data-testid="img-store-banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="container mx-auto px-4 py-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {sellerWithBanner.firstName ? `${sellerWithBanner.firstName}'s Store` : "Featured Store"}
              </h2>
              <p className="text-white/90 text-lg">
                Discover amazing products from our sellers
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-page-title">
            All Products
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover our collection of high-quality products
          </p>
        </div>

        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
            {productTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? "default" : "outline"}
                onClick={() => setSelectedType(type.value)}
                data-testid={`button-filter-${type.value}`}
                className="flex-shrink-0"
              >
                {type.label}
              </Button>
            ))}
          </div>
          
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
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className={getGridClasses()}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {selectedType === "all"
                ? "No products available at the moment"
                : `No ${selectedType} products available`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
