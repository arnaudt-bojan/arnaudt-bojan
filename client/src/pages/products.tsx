import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductType } from "@shared/schema";
import { Package } from "lucide-react";

export default function Products() {
  const [selectedType, setSelectedType] = useState<ProductType | "all">("all");
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
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

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-page-title">
            All Products
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover our collection of high-quality products
          </p>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
