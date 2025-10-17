import { useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { SiFacebook } from "react-icons/si";

export default function MetaOAuthSuccess() {
  useEffect(() => {
    // If this page is opened in a popup window (has window.opener)
    if (window.opener && !window.opener.closed) {
      try {
        // Post message to parent window
        window.opener.postMessage(
          { 
            type: 'meta_oauth_success',
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
        // Still try to close after delay
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    } else {
      // If not in popup, redirect to Meta Ads dashboard after showing success
      setTimeout(() => {
        window.location.href = '/meta-ads/dashboard';
      }, 2000);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-lg">
          <CheckCircle className="h-10 w-10 text-green-600 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Meta Account Connected!</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <SiFacebook className="h-5 w-5 text-[#1877F2]" />
            Your Meta ad account has been successfully linked
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Closing window...</span>
        </div>
      </div>
    </div>
  );
}
