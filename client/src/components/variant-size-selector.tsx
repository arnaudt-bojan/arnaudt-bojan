import { cn } from "@/lib/utils";

interface VariantSizeSelectorProps {
  sizes: string[];
  selectedSize: string | null;
  onSelectSize: (size: string) => void;
  className?: string;
  stockInfo?: Record<string, number>; // Map of size -> stock count
}

export function VariantSizeSelector({
  sizes,
  selectedSize,
  onSelectSize,
  className,
  stockInfo,
}: VariantSizeSelectorProps) {
  if (!sizes || sizes.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-sm font-medium">Size</h4>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isSelected = selectedSize === size;
          const stock = stockInfo?.[size] ?? null;
          const isOutOfStock = stock !== null && stock <= 0;
          
          return (
            <button
              key={size}
              type="button"
              onClick={() => !isOutOfStock && onSelectSize(size)}
              disabled={isOutOfStock}
              className={cn(
                "min-w-[3rem] px-4 py-2 rounded-md border-2 transition-all",
                "font-medium text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isOutOfStock
                  ? "opacity-40 cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                  : isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover-elevate active-elevate-2"
              )}
              data-testid={`button-size-${size.toLowerCase().replace(/\s+/g, "-")}`}
              aria-label={`Select size ${size}${isOutOfStock ? ' (Out of Stock)' : ''}`}
              title={isOutOfStock ? 'Out of Stock' : ''}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
