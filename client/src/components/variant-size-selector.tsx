import { cn } from "@/lib/utils";

interface VariantSizeSelectorProps {
  sizes: string[];
  selectedSize: string | null;
  onSelectSize: (size: string) => void;
  className?: string;
}

export function VariantSizeSelector({
  sizes,
  selectedSize,
  onSelectSize,
  className,
}: VariantSizeSelectorProps) {
  if (!sizes || sizes.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-sm font-medium">Size</h4>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isSelected = selectedSize === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelectSize(size)}
              className={cn(
                "min-w-[3rem] px-4 py-2 rounded-md border-2 transition-all",
                "font-medium text-sm hover-elevate active-elevate-2",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              )}
              data-testid={`button-size-${size.toLowerCase().replace(/\s+/g, "-")}`}
              aria-label={`Select size ${size}`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
