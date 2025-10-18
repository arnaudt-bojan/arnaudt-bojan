import { useEffect } from "react";
import { XCircle } from "lucide-react";

export default function StripeCheckoutCancelled() {
  useEffect(() => {
    // Post message to parent window (wallet page)
    if (window.opener) {
      window.opener.postMessage({ type: "STRIPE_CHECKOUT_CANCELLED" }, window.location.origin);
      
      // Auto-close after brief delay
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <XCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Payment Cancelled</h1>
        <p className="text-muted-foreground">
          No charges were made. This window will close automatically.
        </p>
      </div>
    </div>
  );
}
