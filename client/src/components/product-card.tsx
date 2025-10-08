import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductTypeBadge } from "./product-type-badge";
import type { Product } from "@shared/schema";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate transition-all duration-300 group">
      <Link href={`/products/${product.id}`} data-testid={`link-product-${product.id}`}>
        <div className="aspect-square relative overflow-hidden bg-muted">
          <img
            src={product.image}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            data-testid={`img-product-${product.id}`}
          />
          <div className="absolute top-3 right-3">
            <ProductTypeBadge type={product.productType as any} />
          </div>
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
                  ${parseFloat(product.depositAmount).toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Total: ${parseFloat(product.price).toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold" data-testid={`text-product-price-${product.id}`}>
                ${parseFloat(product.price).toFixed(2)}
              </span>
            )}
          </div>
          <Button
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(product);
            }}
            data-testid={`button-add-to-cart-${product.id}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
