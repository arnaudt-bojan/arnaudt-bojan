import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  currency?: string | null;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currency, className, value, onChange, ...props }, ref) => {
    const symbol = getCurrencySymbol(currency);
    
    // Calculate dynamic padding based on symbol length
    const symbolLength = symbol.length;
    const paddingClass = symbolLength > 1 ? "pl-12" : "pl-8";
    
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none select-none z-10 font-medium">
          {symbol}
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={value || ""}
          onChange={onChange}
          placeholder=""
          className={cn(paddingClass, className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
