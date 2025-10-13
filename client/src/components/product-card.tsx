import { Link } from "wouter";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductTypeBadge } from "./product-type-badge";
import type { Product } from "@shared/schema";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSellerContext, getSellerAwarePath, extractSellerFromCurrentPath } from "@/contexts/seller-context";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  disabled?: boolean;
}

export function ProductCard({ product, onAddToCart, disabled }: ProductCardProps) {
  const { formatPrice } = useCurrency();
  const { sellerUsername } = useSellerContext();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Use images array if available, otherwise fall back to single image
  const productImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image];
  
  const hasMultipleImages = productImages.length > 1;
  
  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  };
  
  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  // CRITICAL FIX: Use fallback to extract seller from current path if context is null
  // This prevents losing seller context on first click
  const effectiveSellerUsername = sellerUsername || extractSellerFromCurrentPath();
  
  // Create seller-aware product link
  const productPath = getSellerAwarePath(`/products/${product.id}`, effectiveSellerUsername);

  return (
    <Card className="overflow-hidden hover-elevate transition-all duration-300 group">
      <Link href={productPath} data-testid={`link-product-${product.id}`}>
        <div className="aspect-square relative overflow-hidden bg-muted">
          <img
            src={productImages[currentImageIndex]}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            data-testid={`img-product-${product.id}`}
          />
          <div className="absolute top-3 right-3">
            <ProductTypeBadge type={product.productType as any} />
          </div>
          
          {hasMultipleImages && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={prevImage}
                data-testid={`button-prev-image-${product.id}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={nextImage}
                data-testid={`button-next-image-${product.id}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {productImages.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      index === currentImageIndex
                        ? "bg-white w-4"
                        : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Link>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg line-clamp-1" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1">{product.category}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {product.productType === "pre-order" && product.depositAmount ? (
              <>
                <span className="text-sm text-muted-foreground">Deposit</span>
                <span className="text-xl font-bold" data-testid={`text-product-price-${product.id}`}>
                  {formatPrice(parseFloat(product.depositAmount))}
                </span>
                <span className="text-xs text-muted-foreground">
                  Total: {formatPrice(parseFloat(product.price))}
                </span>
              </>
            ) : (
              <div className="flex flex-col">
                {product.promotionActive && product.discountPercentage && parseFloat(product.discountPercentage) > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-red-600 dark:text-red-400" data-testid={`text-product-price-${product.id}`}>
                        {formatPrice(parseFloat(product.price) * (1 - parseFloat(product.discountPercentage) / 100))}
                      </span>
                      <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                        -{product.discountPercentage}%
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(parseFloat(product.price))}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-bold" data-testid={`text-product-price-${product.id}`}>
                    {formatPrice(parseFloat(product.price))}
                  </span>
                )}
              </div>
            )}
          </div>
          <Button
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(product);
            }}
            disabled={disabled}
            data-testid={`button-add-to-cart-${product.id}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
