import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

export default function StripeCheckoutSuccess() {
  useEffect(() => {
    // Post message to parent window (wallet page)
    if (window.opener) {
      window.opener.postMessage({ type: "STRIPE_CHECKOUT_SUCCESS" }, window.location.origin);
      
      // Auto-close after brief delay
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Your wallet is being credited. This window will close automatically.
        </p>
      </div>
    </div>
  );
}
