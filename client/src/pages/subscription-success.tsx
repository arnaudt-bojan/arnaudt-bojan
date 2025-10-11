import { useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react";

/**
 * Subscription Success Page
 * This page is shown after successful Stripe checkout in a popup window.
 * It closes the popup and notifies the parent window of success.
 */
export default function SubscriptionSuccess() {
  useEffect(() => {
    // If this page is opened in a popup window (has window.opener)
    if (window.opener && !window.opener.closed) {
      try {
        // Post message to parent window
        window.opener.postMessage(
          { 
            type: 'subscription_success',
            timestamp: Date.now() 
          }, 
          window.location.origin
        );
        
        // Close this popup after a short delay to show success message
        setTimeout(() => {
          window.close();
        }, 1500);
      } catch (error) {
        console.error('Failed to communicate with parent window:', error);
        // Still try to close even if postMessage fails
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    } else {
      // If not in popup, redirect to dashboard after showing success
      setTimeout(() => {
        window.location.href = '/seller-dashboard';
      }, 2000);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 p-8">
        <div className="flex justify-center">
          <div className="relative">
            <CheckCircle className="h-16 w-16 text-green-500 animate-in zoom-in-50 duration-300" />
            <div className="absolute inset-0 animate-ping opacity-25">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold">Subscription Successful!</h1>
        <p className="text-muted-foreground">
          Your store has been activated. This window will close automatically...
        </p>
        
        <div className="flex justify-center pt-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
