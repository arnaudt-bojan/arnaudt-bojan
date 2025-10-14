import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  currency?: string | null;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currency, className, ...props }, ref) => {
    const symbol = getCurrencySymbol(currency);
    
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {symbol}
        </span>
        <Input
          ref={ref}
          type="number"
          step="0.01"
          placeholder="0.00"
          className={cn("pl-8", className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
