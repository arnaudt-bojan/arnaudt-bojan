import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function CheckoutComplete() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    const handlePaymentReturn = async () => {
      // Get payment_intent from URL
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentId = urlParams.get('payment_intent');
      const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

      if (!paymentIntentId || !paymentIntentClientSecret) {
        setStatus("error");
        setErrorMessage("No payment information found");
        return;
      }

      try {
        // Poll for payment status with retry logic (handle race conditions)
        let attempts = 0;
        const maxAttempts = 10;
        const retryDelay = 1000; // 1 second

        while (attempts < maxAttempts) {
          attempts++;

          // Retrieve payment intent from server with client_secret for security
          const response = await apiRequest(
            "GET", 
            `/api/payment-intent/${paymentIntentId}?client_secret=${encodeURIComponent(paymentIntentClientSecret)}`, 
            null
          );
          
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Unauthorized - invalid payment session");
            }
            throw new Error("Failed to retrieve payment status");
          }

          const paymentIntent = await response.json();

          if (paymentIntent.status === 'succeeded') {
            const orderIdFromMetadata = paymentIntent.metadata?.orderId;
            const emailFromMetadata = paymentIntent.metadata?.customerEmail;
            
            // If orderId exists, we're done
            if (orderIdFromMetadata) {
              setOrderId(orderIdFromMetadata);
              setCustomerEmail(emailFromMetadata);
              setStatus("success");
              
              // Redirect to order success after 1 second
              setTimeout(() => {
                const emailParam = emailFromMetadata ? `?email=${encodeURIComponent(emailFromMetadata)}` : '';
                setLocation(`/order-success/${orderIdFromMetadata}${emailParam}`);
              }, 1000);
              return;
            }
            
            // Order not ready yet (webhook still processing), retry
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
            
            // Timeout waiting for order
            setStatus("error");
            setErrorMessage("Payment successful but order is still processing. Please check your email for confirmation.");
            return;

          } else if (paymentIntent.status === 'processing') {
            // Payment is processing, keep polling
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
            
            // Timeout - still processing
            setStatus("success");
            setErrorMessage("Payment is being processed. You'll receive a confirmation email shortly.");
            return;

          } else if (paymentIntent.status === 'requires_action') {
            // Still requires action (shouldn't happen on return URL, but handle it)
            setStatus("error");
            setErrorMessage("Payment requires additional authentication. Please try again.");
            return;

          } else {
            // Failed, canceled, or other terminal state
            setStatus("error");
            setErrorMessage(`Payment ${paymentIntent.status}. ${paymentIntent.status === 'canceled' ? 'Please try again.' : 'Please contact support if you were charged.'}`);
            return;
          }
        }

        // Max attempts reached
        setStatus("error");
        setErrorMessage("Unable to confirm payment status. Please check your email for confirmation.");

      } catch (error) {
        console.error("Error handling payment return:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Failed to verify payment status. Please check your email for confirmation.");
      }
    };

    handlePaymentReturn();
  }, [setLocation]);

  if (status === "loading") {
    return (
      <div className="min-h-screen py-12" data-testid="page-checkout-complete">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardContent className="pt-6 pb-8 text-center space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" data-testid="icon-loading" />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Processing Payment...</h1>
                <p className="text-muted-foreground">
                  Please wait while we confirm your payment
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen py-12" data-testid="page-checkout-complete">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardContent className="pt-6 pb-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" data-testid="icon-success" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold" data-testid="text-payment-success">Payment Successful!</h1>
                <p className="text-muted-foreground">
                  {errorMessage || "Redirecting to your order confirmation..."}
                </p>
              </div>
              {orderId && (
                <Button 
                  onClick={() => {
                    const emailParam = customerEmail ? `?email=${encodeURIComponent(customerEmail)}` : '';
                    setLocation(`/order-success/${orderId}${emailParam}`);
                  }}
                  data-testid="button-view-order"
                >
                  View Order
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" data-testid="page-checkout-complete">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardContent className="pt-6 pb-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" data-testid="icon-error" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold" data-testid="text-payment-error">Payment Issue</h1>
              <p className="text-muted-foreground">
                {errorMessage}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => setLocation("/checkout")}
                data-testid="button-try-again"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
