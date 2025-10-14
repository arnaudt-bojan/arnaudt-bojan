import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Package,
  MapPin,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Clock,
  DollarSign,
  RefreshCw,
} from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const addressSchema = z.object({
  street: z.string().min(5, "Street address required"),
  city: z.string().min(2, "City required"),
  state: z.string().optional(),
  postalCode: z.string().min(3, "ZIP/Postal code required"),
  country: z.string().min(2, "Country required"),
});

type AddressForm = z.infer<typeof addressSchema>;

interface BalanceSession {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  balanceDueCents: number;
  currency: string;
  balanceRequestId: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  canChangeAddress: boolean;
  pricingSnapshot?: {
    depositCents?: number;
    productBalanceCents?: number;
    shippingCents?: number;
    taxCents?: number;
  };
  expiresAt?: string | null;
}

// Payment Form Component
function PaymentForm({
  onSuccess,
  balanceDueCents,
  currency,
  balanceRequestId,
  orderId,
  token,
  customerEmail,
}: {
  onSuccess: () => void;
  balanceDueCents: number;
  currency: string;
  balanceRequestId: string;
  orderId: string;
  token: string;
  customerEmail: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (elements) {
      setIsReady(true);
    }
  }, [elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}/pay-balance?token=${token}`,
          payment_method_data: {
            billing_details: {
              email: customerEmail,
            },
          },
        },
      });

      if (error) {
        console.error("[BalancePayment] Stripe payment error:", error);
        const errorMessage = error.message || "Payment could not be processed";
        setPaymentError(errorMessage);
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        toast({
          title: "Payment Successful",
          description: "Your balance payment has been confirmed",
        });
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      setPaymentError(errorMessage);
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {paymentError && (
        <Alert variant="destructive" data-testid="alert-payment-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">{paymentError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaymentError(null)}
              data-testid="button-retry-payment"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="min-h-[240px]">
        <PaymentElement 
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
            fields: {
              billingDetails: {
                email: 'never',
              }
            },
          }}
        />
      </div>
      
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !isReady || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Pay Balance {formatAmount(balanceDueCents)}
          </>
        )}
      </Button>
      
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secured by Stripe • Your payment information is encrypted</span>
      </div>
    </form>
  );
}

export default function BalancePayment() {
  const [, params] = useRoute("/orders/:orderId/pay-balance");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const orderId = params?.orderId || "";
  
  // Extract token from query string
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [balanceRequestId, setBalanceRequestId] = useState<string>("");
  
  // Fetch balance session (supports both token-based magic link AND authenticated user access)
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useQuery<BalanceSession>({
    queryKey: ['/api/orders', orderId, 'balance-session', token],
    queryFn: async () => {
      const url = token 
        ? `/api/orders/${orderId}/balance-session?token=${encodeURIComponent(token)}`
        : `/api/orders/${orderId}/balance-session`;
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load balance session');
      }
      return response.json();
    },
    enabled: !!orderId, // Enable for both token (magic link) and authenticated user access
  });
  
  // Store balanceRequestId from session (we'll need it for API calls)
  useEffect(() => {
    if (session?.balanceRequestId) {
      setBalanceRequestId(session.balanceRequestId);
    }
  }, [session]);

  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: session?.shippingAddress?.street || "",
      city: session?.shippingAddress?.city || "",
      state: session?.shippingAddress?.state || "",
      postalCode: session?.shippingAddress?.postalCode || "",
      country: session?.shippingAddress?.country || "US",
    },
  });

  // Update form when session loads
  useEffect(() => {
    if (session?.shippingAddress) {
      addressForm.reset({
        street: session.shippingAddress.street,
        city: session.shippingAddress.city,
        state: session.shippingAddress.state || "",
        postalCode: session.shippingAddress.postalCode,
        country: session.shippingAddress.country,
      });
    }
  }, [session, addressForm]);

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async (newAddress: AddressForm) => {
      const response = await apiRequest(
        "PATCH",
        `/api/orders/${orderId}/balance-session/address?token=${encodeURIComponent(token)}`,
        {
          balanceRequestId: balanceRequestId,
          newAddress,
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update address');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Address Updated",
        description: "Shipping cost has been recalculated",
      });
      setIsAddressDialogOpen(false);
      // Refetch session to get updated pricing
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update address",
        variant: "destructive",
      });
    },
  });

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/orders/${orderId}/pay-balance?token=${encodeURIComponent(token)}`,
        {
          balanceRequestId: balanceRequestId,
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment intent');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
      });
    },
  });

  const handlePaymentSuccess = () => {
    toast({
      title: "Payment Successful!",
      description: "Your balance has been paid in full",
    });
    // Redirect to order confirmation or success page with balancePayment flag
    setTimeout(() => {
      setLocation(`/order-success/${orderId}?balancePayment=true`);
    }, 1500);
  };

  const onAddressSubmit = (data: AddressForm) => {
    updateAddressMutation.mutate(data);
  };

  const formatAmount = (cents: number) => {
    if (!session) return '$0.00';
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: session.currency || 'USD',
    }).format(amount);
  };

  // Loading state
  if (isLoadingSession) {
    return (
      <div className="min-h-screen py-12" data-testid="page-balance-payment">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state - Session expired or invalid
  if (sessionError || !session) {
    return (
      <div className="min-h-screen py-12" data-testid="page-balance-payment">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardContent className="pt-6 pb-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" data-testid="icon-error" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold" data-testid="text-error-title">Session Expired</h1>
                <p className="text-muted-foreground" data-testid="text-error-description">
                  {sessionError instanceof Error ? sessionError.message : "This payment link has expired or is invalid. Please contact the seller for a new payment link."}
                </p>
              </div>
              <Button 
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if session is expired
  const isExpired = session.expiresAt && new Date(session.expiresAt) < new Date();
  if (isExpired) {
    return (
      <div className="min-h-screen py-12" data-testid="page-balance-payment">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardContent className="pt-6 pb-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Clock className="h-12 w-12 text-orange-600 dark:text-orange-400" data-testid="icon-expired" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold" data-testid="text-expired-title">Payment Link Expired</h1>
                <p className="text-muted-foreground" data-testid="text-expired-description">
                  This payment link has expired. Please contact the seller to request a new payment link.
                </p>
              </div>
              <Button 
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pricingSnapshot = session.pricingSnapshot || {};
  const depositCents = pricingSnapshot.depositCents || 0;
  const productBalanceCents = pricingSnapshot.productBalanceCents || 0;
  const shippingCents = pricingSnapshot.shippingCents || 0;

  return (
    <div className="min-h-screen py-12" data-testid="page-balance-payment">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Balance Payment
            </h1>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Complete your payment for order #{session.orderNumber.substring(0, 8)}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Order Summary */}
            <div className="space-y-6">
              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Order Number</span>
                      <span className="font-medium" data-testid="text-order-number">
                        #{session.orderNumber.substring(0, 8)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium" data-testid="text-customer-name">
                        {session.customerName}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold">Payment Breakdown</h4>
                    
                    {depositCents > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Deposit Paid
                        </span>
                        <span className="font-medium text-green-600" data-testid="text-deposit-paid">
                          {formatAmount(depositCents)}
                        </span>
                      </div>
                    )}

                    {productBalanceCents > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Product Balance</span>
                        <span data-testid="text-product-balance">
                          {formatAmount(productBalanceCents)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span data-testid="text-shipping-cost">
                        {formatAmount(shippingCents)}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <span className="font-bold text-lg">Total Balance Due</span>
                      <span className="font-bold text-lg text-primary" data-testid="text-balance-due">
                        {formatAmount(session.balanceDueCents)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm" data-testid="text-shipping-address">
                    <p>{session.shippingAddress.street}</p>
                    <p>
                      {session.shippingAddress.city}
                      {session.shippingAddress.state && `, ${session.shippingAddress.state}`} {session.shippingAddress.postalCode}
                    </p>
                    <p>{session.shippingAddress.country}</p>
                  </div>

                  {session.canChangeAddress && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddressDialogOpen(true)}
                      data-testid="button-change-address"
                    >
                      Change Shipping Address
                    </Button>
                  )}

                  {!session.canChangeAddress && (
                    <p className="text-xs text-muted-foreground">
                      Shipping address cannot be changed at this time
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Payment */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!clientSecret ? (
                    <div className="space-y-6">
                      <Alert>
                        <DollarSign className="h-4 w-4" />
                        <AlertTitle>Ready to Pay</AlertTitle>
                        <AlertDescription>
                          Click below to proceed with your balance payment of {formatAmount(session.balanceDueCents)}
                        </AlertDescription>
                      </Alert>

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => createPaymentIntentMutation.mutate()}
                        disabled={createPaymentIntentMutation.isPending}
                        data-testid="button-pay-now"
                      >
                        {createPaymentIntentMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Setting up payment...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Pay Balance Now
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                        appearance: {
                          theme: 'stripe',
                          variables: {
                            colorPrimary: '#000000',
                          },
                        },
                      }}
                    >
                      <PaymentForm
                        onSuccess={handlePaymentSuccess}
                        balanceDueCents={session.balanceDueCents}
                        currency={session.currency}
                        balanceRequestId={balanceRequestId}
                        orderId={orderId}
                        token={token}
                        customerEmail={session.customerEmail}
                      />
                    </Elements>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Address Change Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-change-address">
          <DialogHeader>
            <DialogTitle>Change Shipping Address</DialogTitle>
            <DialogDescription>
              Update your shipping address. The balance amount may change based on the new shipping cost.
            </DialogDescription>
          </DialogHeader>
          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
              <FormField
                control={addressForm.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main St" data-testid="input-street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="New York" data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addressForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="NY" data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP/Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="10001" data-testid="input-postal-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addressForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="US" data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddressDialogOpen(false)}
                  data-testid="button-cancel-address"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateAddressMutation.isPending}
                  data-testid="button-save-address"
                >
                  {updateAddressMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Address'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
