import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  currency?: string | null;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currency, className, value, ...props }, ref) => {
    const symbol = getCurrencySymbol(currency);
    
    // Ensure value is handled correctly - convert empty string to undefined for number inputs
    const inputValue = value === "" ? undefined : value;
    
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
          {symbol}
        </span>
        <Input
          ref={ref}
          type="number"
          step="0.01"
          placeholder="0.00"
          className={cn("pl-8", className)}
          value={inputValue}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
