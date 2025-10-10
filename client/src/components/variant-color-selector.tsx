import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ColorOption {
  name: string;
  hex: string;
}

interface VariantColorSelectorProps {
  colors: ColorOption[];
  selectedColor: string | null;
  onSelectColor: (colorName: string) => void;
  className?: string;
}

export function VariantColorSelector({
  colors,
  selectedColor,
  onSelectColor,
  className,
}: VariantColorSelectorProps) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Color</h4>
        {selectedColor && (
          <span className="text-sm text-muted-foreground">
            ({selectedColor})
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor === color.name;
          return (
            <button
              key={color.name}
              type="button"
              onClick={() => onSelectColor(color.name)}
              className={cn(
                "relative rounded-full transition-all hover-elevate active-elevate-2",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected ? "ring-2 ring-primary ring-offset-2" : ""
              )}
              data-testid={`button-color-${color.name.toLowerCase().replace(/\s+/g, "-")}`}
              aria-label={`Select ${color.name}`}
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-full border-2 flex items-center justify-center",
                  isSelected ? "border-primary" : "border-border"
                )}
                style={{ backgroundColor: color.hex }}
              >
                {isSelected && (
                  <div className="bg-white/90 dark:bg-black/90 rounded-full p-0.5">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
