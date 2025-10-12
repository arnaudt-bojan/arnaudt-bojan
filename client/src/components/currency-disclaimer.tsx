import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CurrencyDisclaimerProps {
  sellerCurrency: string;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export function CurrencyDisclaimer({ 
  sellerCurrency, 
  variant = "default",
  className = "" 
}: CurrencyDisclaimerProps) {
  const { currency: buyerCurrency } = useCurrency();
  
  // Don't show disclaimer if buyer's currency matches seller's currency
  if (buyerCurrency === sellerCurrency) {
    return null;
  }

  if (variant === "inline") {
    return (
      <span className={`text-xs text-muted-foreground ${className}`} data-testid="text-currency-disclaimer-inline">
        Estimate - actual charge in {sellerCurrency}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`} data-testid="text-currency-disclaimer-compact">
        <Info className="h-3 w-3 shrink-0" />
        <span>Prices shown in {buyerCurrency} are estimates. You'll be charged in {sellerCurrency}.</span>
      </div>
    );
  }

  return (
    <Alert className={className} data-testid="alert-currency-disclaimer">
      <Info className="h-4 w-4" />
      <AlertDescription className="text-sm">
        <strong>Currency Notice:</strong> Prices displayed in {buyerCurrency} are estimates based on current exchange rates. 
        Your card will be charged in <strong>{sellerCurrency}</strong> (seller's local currency). 
        Final amount may vary slightly based on your bank's exchange rate.
      </AlertDescription>
    </Alert>
  );
}
