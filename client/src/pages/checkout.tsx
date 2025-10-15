import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ShoppingBag, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Package,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import type { InsertOrder } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { usePricing } from "@/hooks/use-pricing";
import { CurrencyDisclaimer } from "@/components/currency-disclaimer";
import { useCurrency } from "@/contexts/CurrencyContext";
import { requiresState, isValidState } from "@shared/shipping-validation";
import { useSellerContext, getSellerAwarePath, extractSellerFromCurrentPath } from "@/contexts/seller-context";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email required"),
  addressLine1: z.string().min(5, "Street address required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City required"),
  state: z.string().optional(),
  postalCode: z.string().min(3, "ZIP/Postal code required"),
  country: z.string().min(2, "Country required"),
  phone: z.string().min(10, "Phone number required"),
}).superRefine((data, ctx) => {
  // Require state for countries that need it
  if (requiresState(data.country)) {
    if (!isValidState(data.state)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "State/Province is required for this country",
        path: ["state"],
      });
    }
  }
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

// Payment Form Component
function PaymentForm({ 
  onSuccess, 
  amount, 
  orderData,
  paymentType,
  billingDetails,
  items,
  onCancel
}: { 
  onSuccess: (orderId: string) => void; 
  amount: number; 
  orderData: InsertOrder;
  paymentType: 'deposit' | 'full';
  billingDetails: CheckoutForm;
  items: any[];
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { formatPrice, currency: defaultCurrency } = useCurrency();
  
  // Format amount with currency conversion
  const sellerCurrency = items[0]?.currency || defaultCurrency;
  const formattedAmount = formatPrice(amount, sellerCurrency);

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
          return_url: window.location.origin + '/checkout/complete',
          payment_method_data: {
            billing_details: {
              email: billingDetails.customerEmail,
              name: billingDetails.customerName,
              phone: billingDetails.phone,
              address: {
                line1: billingDetails.addressLine1,
                line2: billingDetails.addressLine2 || undefined,
                city: billingDetails.city,
                state: billingDetails.state,
                postal_code: billingDetails.postalCode,
                country: billingDetails.country,
              },
            },
          },
        },
      });

      if (error) {
        console.error("[Checkout] Stripe payment error:", error);
        console.error("[Checkout] Error type:", error.type);
        console.error("[Checkout] Error code:", error.code);
        
        const errorMessage = error.message || "Payment could not be processed";
        setPaymentError(errorMessage);
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Fetch tax data from server (payment intent needs to be retrieved server-side with expanded fields)
        let taxData = {
          taxAmount: "0",
          taxCalculationId: null,
          taxBreakdown: null,
          subtotalBeforeTax: orderData.total,
        };

        try {
          const taxResponse = await apiRequest("GET", `/api/payment-intent/${paymentIntent.id}/tax-data`, null);
          if (taxResponse.ok) {
            taxData = await taxResponse.json();
          }
        } catch (taxError) {
          console.error("[Checkout] Failed to retrieve tax data:", taxError);
          // Continue with order creation even if tax data fetch fails
        }
        
        // Create order in database with payment info and tax data
        // CRITICAL: Server expects items as array, customerAddress object, and destination object
        const updatedOrderData = {
          ...orderData,
          customerAddress: {
            line1: billingDetails.addressLine1,
            line2: billingDetails.addressLine2 || undefined,
            city: billingDetails.city,
            state: billingDetails.state || '',
            postalCode: billingDetails.postalCode,
            country: billingDetails.country,
          },
          items: items.map((item: any) => ({
            productId: item.id,
            price: item.price,
            originalPrice: item.originalPrice || undefined,
            discountPercentage: item.discountPercentage || undefined,
            discountAmount: item.discountAmount || undefined,
            quantity: item.quantity,
            productType: item.productType,
            depositAmount: item.depositAmount || undefined,
            requiresDeposit: item.requiresDeposit,
          })),
          destination: {
            country: billingDetails.country,
            state: billingDetails.state || undefined,
            postalCode: billingDetails.postalCode || undefined,
          },
          amountPaid: amount.toString(),
          paymentStatus: paymentType === 'deposit' ? "deposit_paid" : "fully_paid",
          stripePaymentIntentId: paymentIntent.id,
          ...taxData, // Include tax amount, calculation ID, breakdown, and subtotal
        };

        try {
          const response = await apiRequest("POST", "/api/orders", updatedOrderData);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to create order");
          }
          
          const createdOrder = await response.json();
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          
          toast({
            title: "Payment Successful",
            description: "Your order has been confirmed",
          });
          onSuccess(createdOrder.id);
        } catch (orderError: any) {
          // Payment succeeded but order creation failed - show specific error
          // Don't rethrow - payment already succeeded, this is a post-payment issue
          console.error("[Checkout] Order creation failed after successful payment:", orderError);
          toast({
            title: "Order Creation Failed",
            description: orderError.message || "Payment was processed but order could not be created. Please contact support with payment ID.",
            variant: "destructive",
          });
          // Don't throw - prevents duplicate error toast from outer catch
          return;
        }
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Error Alert with Retry */}
      {paymentError && (
        <Alert variant="destructive" data-testid="alert-payment-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">{paymentError}</p>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                onClick={() => setPaymentError(null)}
                data-testid="button-retry-payment"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Try Again
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  data-testid="button-cancel-payment"
                >
                  Cancel Payment
                </Button>
              )}
            </div>
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
            terms: {
              card: 'never',
              link: 'never',
            } as any,
          }}
        />
      </div>
      
      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
            disabled={isProcessing}
            data-testid="button-back-to-shipping"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
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
              {paymentType === 'deposit' ? `Pay Deposit ${formattedAmount}` : `Pay ${formattedAmount}`}
            </>
          )}
        </Button>
      </div>
      
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secured by Stripe • Your payment information is encrypted</span>
      </div>
    </form>
  );
}

// Express Checkout Component - One-click payment with wallets
function ExpressCheckout({
  amount,
  orderData,
  paymentType,
  onSuccess,
  items,
  clientSecret,
}: {
  amount: number;
  orderData: Partial<InsertOrder>;
  paymentType: 'deposit' | 'full';
  onSuccess: (orderId: string) => void;
  items: any[];
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);

  const handleExpressCheckout = async (event: any) => {
    if (!stripe || !elements) {
      return;
    }

    // CRITICAL: Prevent auto-confirmation to allow async address update
    event.preventDefault();

    try {
      // Step 1: Submit elements for validation
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast({
          title: "Validation Error",
          description: submitError.message,
          variant: "destructive",
        });
        return;
      }

      // Step 2: Extract shipping address from wallet BEFORE confirming payment
      const shippingAddress = event.shippingAddress || event.address || {};
      const walletData = {
        customerName: event.name || event.payerName || "Customer",
        customerEmail: event.email || event.payerEmail || "",
        customerAddress: {
          line1: shippingAddress.line1 || shippingAddress.addressLine?.[0] || "",
          line2: shippingAddress.line2 || shippingAddress.addressLine?.[1] || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
          postalCode: shippingAddress.postalCode || shippingAddress.postal_code || "",
          country: shippingAddress.country || "",
        },
        phone: event.phone || shippingAddress.phone || "",
      };

      // Step 3: Update PaymentIntent with wallet address for accurate tax calculation
      await apiRequest("POST", `/api/payment-intent/${clientSecret.split('_secret_')[0]}/update-address`, {
        address: walletData.customerAddress,
        email: walletData.customerEmail,
        name: walletData.customerName,
        phone: walletData.phone,
      });

      // Step 4: Confirm payment using event.confirm() for proper wallet lifecycle
      const { error: confirmError, paymentIntent } = await event.confirm({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin + '/checkout/complete',
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        toast({
          title: "Payment Failed",
          description: confirmError.message || "Payment could not be processed",
          variant: "destructive",
        });
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Step 5: Fetch tax data (now calculated with correct address)
        let taxData = {
          taxAmount: "0",
          taxCalculationId: null,
          taxBreakdown: null,
          subtotalBeforeTax: orderData.total,
        };

        try {
          const taxResponse = await apiRequest("GET", `/api/payment-intent/${paymentIntent.id}/tax-data`, null);
          if (taxResponse.ok) {
            taxData = await taxResponse.json();
          }
        } catch (taxError) {
          console.error("[Express Checkout] Failed to retrieve tax data:", taxError);
        }

        // Step 6: Create order with wallet data
        // CRITICAL: Server expects items as array and destination object
        const walletOrderData = {
          ...orderData,
          customerName: walletData.customerName,
          customerEmail: walletData.customerEmail,
          customerAddress: [
            walletData.customerAddress.line1,
            walletData.customerAddress.line2,
            `${walletData.customerAddress.city}, ${walletData.customerAddress.state} ${walletData.customerAddress.postalCode}`,
            walletData.customerAddress.country,
          ].filter(Boolean).join('\n'),
          phone: walletData.phone,
          items: items.map((item: any) => ({
            productId: item.id,
            price: item.price,
            originalPrice: item.originalPrice || undefined,
            discountPercentage: item.discountPercentage || undefined,
            discountAmount: item.discountAmount || undefined,
            quantity: item.quantity,
            productType: item.productType,
            depositAmount: item.depositAmount || undefined,
            requiresDeposit: item.requiresDeposit,
          })),
          destination: {
            line1: walletData.customerAddress.line1,
            line2: walletData.customerAddress.line2 || undefined,
            city: walletData.customerAddress.city,
            state: walletData.customerAddress.state,
            postalCode: walletData.customerAddress.postalCode,
            country: walletData.customerAddress.country,
          },
          amountPaid: amount.toString(),
          paymentStatus: paymentType === 'deposit' ? "deposit_paid" : "fully_paid",
          stripePaymentIntentId: paymentIntent.id,
          ...taxData,
        };

        const response = await apiRequest("POST", "/api/orders", walletOrderData);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create order");
        }
        
        const createdOrder = await response.json();
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        
        toast({
          title: "Payment Successful",
          description: "Your order has been confirmed",
        });
        onSuccess(createdOrder.id);
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Express Checkout
          </span>
        </div>
      </div>
      
      <div className="mt-4">
        <ExpressCheckoutElement
          onConfirm={handleExpressCheckout}
          onReady={() => setIsReady(true)}
          options={{
            buttonType: {
              applePay: 'buy',
              googlePay: 'buy',
            },
            buttonTheme: {
              applePay: 'black',
              googlePay: 'black',
            },
            buttonHeight: 48,
          }}
        />
      </div>
      
      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or pay with card
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isSeller, isCollaborator } = useAuth();
  const { sellerUsername } = useSellerContext();
  
  // CRITICAL FIX: Use fallback to extract seller from current path if context is null
  const effectiveSellerUsername = sellerUsername || extractSellerFromCurrentPath();
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<InsertOrder | null>(null);
  const [billingDetails, setBillingDetails] = useState<CheckoutForm | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(true);
  
  // Checkout step state: 'shipping' or 'payment'
  const checkoutStep = clientSecret ? 'payment' : 'shipping';
  
  // Redirect sellers and collaborators away from checkout (they cannot buy)
  useEffect(() => {
    if (isSeller || isCollaborator) {
      toast({
        title: "Access Denied",
        description: "Sellers and team members cannot make purchases.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [isSeller, isCollaborator, setLocation, toast]);
  
  // Get buyer's selected currency and conversion functions
  const { currency: buyerCurrency, convertPrice, formatPrice } = useCurrency();
  
  // Get seller's currency from cart items (all items are from same seller)
  // Use buyer's currency as fallback (should never happen as checkout requires items)
  const sellerCurrency = items.length > 0 ? items[0].currency || buyerCurrency : buyerCurrency;
  
  // Helper function to format prices with conversion from seller to buyer currency
  const formatConvertedPrice = (amount: number) => {
    return formatPrice(amount, sellerCurrency);
  };

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "United States",
      phone: "",
    },
  });

  // Watch shipping address fields for backend pricing API
  const watchedCountry = form.watch("country");
  const watchedCity = form.watch("city");
  const watchedState = form.watch("state");
  const watchedPostalCode = form.watch("postalCode");

  // Get sellerId from cart items (all items are from same seller)
  const sellerId = items.length > 0 ? items[0].sellerId : undefined;

  // CRITICAL FIX: Memoize destination to prevent unnecessary re-renders and pricing calculations
  const destination = useMemo(() => 
    watchedCountry ? {
      country: watchedCountry,
      city: watchedCity,
      state: watchedState,
      postalCode: watchedPostalCode,
    } : undefined,
    [watchedCountry, watchedCity, watchedState, watchedPostalCode]
  );

  // CRITICAL FIX: Memoize pricing items to prevent unnecessary re-renders
  const pricingItems = useMemo(() => 
    items.map(item => ({
      productId: item.id,
      quantity: item.quantity,
    })),
    [items]
  );

  // Use backend pricing API for all calculations (includes shipping, tax, deposit/balance)
  const { data: pricingData, isLoading: isPricingLoading, error: pricingError } = usePricing({
    sellerId,
    items: pricingItems,
    destination,
    enabled: items.length > 0 && !!sellerId,
  });

  // Calculate payment info using backend pricing API
  const paymentInfo = useMemo(() => {
    let earliestDeliveryDate: Date | undefined = undefined;
    let latestDeliveryDate: Date | undefined = undefined;

    // Track pre-order dates for delivery estimates (not pricing-related)
    items.forEach((item) => {
      if (item.productType === "pre-order" && (item as any).preOrderDate) {
        const preOrderDate = new Date((item as any).preOrderDate);
        if (!earliestDeliveryDate || preOrderDate < earliestDeliveryDate) {
          earliestDeliveryDate = preOrderDate;
        }
        if (!latestDeliveryDate || preOrderDate > latestDeliveryDate) {
          latestDeliveryDate = preOrderDate;
        }
      }
    });

    // Use backend pricing API data (includes shipping, tax, deposit/balance calculations)
    if (!pricingData) {
      // Return defaults while pricing is loading or unavailable
      return {
        hasPreOrders: false,
        depositTotal: 0,
        remainingBalance: 0,
        fullTotal: 0,
        subtotal: 0,
        shipping: 0,
        tax: 0,
        payingDepositOnly: false,
        amountToCharge: 0,
        earliestDeliveryDate,
        latestDeliveryDate,
      };
    }

    return {
      hasPreOrders: pricingData.hasPreOrders,
      depositTotal: pricingData.depositTotal,
      remainingBalance: pricingData.remainingBalance,
      fullTotal: pricingData.total,
      subtotal: pricingData.subtotal,
      shipping: pricingData.shippingCost,
      tax: pricingData.taxAmount,
      payingDepositOnly: pricingData.payingDepositOnly,
      amountToCharge: pricingData.amountToCharge,
      earliestDeliveryDate,
      latestDeliveryDate,
    };
  }, [items, pricingData]);

  // Use the pricing service's calculated amount to charge
  const amountToPay = paymentInfo.amountToCharge;

  // Create payment intent when form is valid
  const onSubmit = async (data: CheckoutForm) => {
    if (clientSecret) {
      // Payment intent already created, form is just for validation
      return;
    }

    try {
      setIsCreatingIntent(true);
      const { payingDepositOnly, depositTotal, remainingBalance, fullTotal } = paymentInfo;

      // PRE-FLIGHT STOCK VALIDATION: Check all cart items before payment intent
      // This catches race conditions where stock changed between add-to-cart and checkout
      for (const item of items) {
        if (item.productType === "in-stock") {
          try {
            const stockResponse = await apiRequest("GET", 
              `/api/products/${item.id}/stock-availability${item.variantId ? `?variantId=${item.variantId}` : ''}`,
              null
            );
            
            if (!stockResponse.ok) {
              throw new Error(`Failed to check stock for ${item.name}`);
            }
            
            const stockData = await stockResponse.json();
            
            if (!stockData.isAvailable || stockData.availableStock < item.quantity) {
              throw new Error(
                item.variantId 
                  ? `"${item.name}" variant is no longer available. Please update your cart.`
                  : `"${item.name}" is no longer in stock. Please remove it from your cart.`
              );
            }
          } catch (error: any) {
            throw new Error(error.message || `Unable to verify stock for ${item.name}`);
          }
        }
      }

      // Combine address fields
      const fullAddress = [
        data.addressLine1,
        data.addressLine2,
        `${data.city}, ${data.state} ${data.postalCode}`,
        data.country
      ].filter(Boolean).join('\n');

      // Create order data
      const newOrderData: InsertOrder = {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerAddress: fullAddress,
        items: JSON.stringify(items.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          originalPrice: item.originalPrice || undefined,
          discountPercentage: item.discountPercentage || undefined,
          discountAmount: item.discountAmount || undefined,
          quantity: item.quantity,
          productType: item.productType,
          depositAmount: item.depositAmount,
          requiresDeposit: item.requiresDeposit,
        }))),
        total: fullTotal.toString(),
        amountPaid: "0",
        remainingBalance: payingDepositOnly ? remainingBalance.toString() : "0",
        paymentType: payingDepositOnly ? "deposit" : "full",
        paymentStatus: "pending",
        status: "pending",
      };

      setOrderData(newOrderData);
      setBillingDetails(data); // Store billing details for Stripe

      // Create payment intent with shipping address for tax calculation
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount: amountToPay,
        paymentType: payingDepositOnly ? "deposit" : "full",
        items: items,
        shippingAddress: {
          name: data.customerName,
          line1: data.addressLine1,
          line2: data.addressLine2,
          city: data.city,
          state: data.state,
          postal_code: data.postalCode,
          country: data.country,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment intent");
      }

      const paymentData = await response.json();

      if (!paymentData.clientSecret) {
        throw new Error("Failed to create payment intent");
      }

      setClientSecret(paymentData.clientSecret);
      setPaymentIntentId(paymentData.paymentIntentId);
      setStripeError(null);
      
      toast({
        title: "Ready for Payment",
        description: "Please complete your payment below",
      });
    } catch (error: any) {
      const errorMsg = error.message || "Failed to initialize payment";
      
      // Check for various payment setup errors
      if (errorMsg.includes("hasn't set up payment") || 
          errorMsg.includes("needs to complete payment setup") ||
          errorMsg.includes("complete payment setup") ||
          errorMsg.includes("finish their Stripe onboarding") ||
          errorMsg.includes("connect a payment provider")) {
        setStripeError("This store hasn't completed payment setup yet. Please contact the seller to complete their payment processing setup.");
      } else {
        setStripeError(errorMsg);
      }
      
      toast({
        title: "Payment Setup Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = (orderId: string) => {
    clearCart();
    // Pass email for public order lookup (guest checkout users)
    const email = encodeURIComponent(billingDetails?.customerEmail || '');
    const orderSuccessPath = getSellerAwarePath(`/order-success/${orderId}?email=${email}`, effectiveSellerUsername);
    setLocation(orderSuccessPath);
  };

  const handleCancelPayment = async () => {
    // Cancel payment intent on backend (releases inventory)
    if (paymentIntentId && clientSecret) {
      try {
        const response = await apiRequest("POST", `/api/payment-intent/${paymentIntentId}/cancel`, {
          client_secret: clientSecret,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to cancel payment");
        }

        // Only reset state if cancellation succeeds
        setClientSecret(null);
        setPaymentIntentId(null);
        setOrderData(null);
        setBillingDetails(null);

        toast({
          title: "Payment Cancelled",
          description: "Inventory has been released. You can update your shipping information and try again.",
        });
      } catch (error: any) {
        console.error("[Checkout] Failed to cancel payment:", error);
        toast({
          title: "Cancellation Error",
          description: error.message || "Could not cancel payment. Please contact support or try again.",
          variant: "destructive",
        });
        // CRITICAL: Do NOT reset state on failure - inventory may still be reserved
        // User should contact support or wait for automatic reservation expiration
      }
    } else {
      // No payment intent to cancel, safe to reset state
      setClientSecret(null);
      setPaymentIntentId(null);
      setOrderData(null);
      setBillingDetails(null);
    }
  };

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Add products to your cart to checkout
          </p>
          <Button 
            onClick={() => setLocation(getSellerAwarePath("/", effectiveSellerUsername))} 
            data-testid="button-browse-products"
          >
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2" data-testid="text-order-success">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground mb-2">
            Thank you for your order. You'll receive a confirmation email shortly.
          </p>
          {paymentInfo.payingDepositOnly && (
            <Card className="max-w-md mx-auto my-8">
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit Paid:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatConvertedPrice(paymentInfo.depositTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="font-semibold">{formatConvertedPrice(paymentInfo.remainingBalance)}</span>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-xs text-muted-foreground">
                    You'll be contacted to pay the remaining balance before shipment.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-4 justify-center mt-8">
            <Button 
              onClick={() => setLocation(getSellerAwarePath("/", effectiveSellerUsername))} 
              data-testid="button-continue-shopping"
            >
              Continue Shopping
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setLocation(getSellerAwarePath("/", effectiveSellerUsername))} 
              data-testid="button-home"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-page-title">
          Secure Checkout
        </h1>
        
        {/* Checkout Progress Indicator */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 max-w-md">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                checkoutStep === 'shipping' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
              }`}>
                <Package className="h-4 w-4" />
              </div>
              <span className={`text-sm font-medium ${
                checkoutStep === 'shipping' ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                Shipping
              </span>
            </div>
            
            <div className={`flex-1 h-[2px] mx-2 ${
              checkoutStep === 'payment' ? 'bg-primary' : 'bg-muted'
            }`} />
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                checkoutStep === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <CreditCard className="h-4 w-4" />
              </div>
              <span className={`text-sm font-medium ${
                checkoutStep === 'payment' ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                Payment
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 md:gap-8">
          {/* Main Form - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Shipping Information</h2>
                </div>
              </CardHeader>
              <CardContent>
                {stripeError && (
                  <Alert variant="destructive" className="mb-6" data-testid="alert-stripe-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Payment Not Available</AlertTitle>
                    <AlertDescription>{stripeError}</AlertDescription>
                  </Alert>
                )}
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground">Contact</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="John Doe"
                                  {...field}
                                  data-testid="input-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="customerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="john@example.com"
                                  {...field}
                                  data-testid="input-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="(555) 123-4567"
                                {...field}
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Shipping Address */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground">Shipping Address</h3>
                      
                      <FormField
                        control={form.control}
                        name="addressLine1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123 Main Street"
                                {...field}
                                data-testid="input-address-line1"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="addressLine2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apartment, suite, etc. (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Apt 4B"
                                {...field}
                                data-testid="input-address-line2"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="New York"
                                  {...field}
                                  data-testid="input-city"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="NY"
                                  {...field}
                                  data-testid="input-state"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP / Postal Code</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="10001"
                                  {...field}
                                  data-testid="input-postal-code"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="United States"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Trigger re-validation of state field when country changes
                                  form.trigger('state');
                                }}
                                data-testid="input-country"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {!clientSecret && (
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isCreatingIntent || isPricingLoading || !!pricingError}
                        data-testid="button-continue-payment"
                      >
                        {isCreatingIntent ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing Payment...
                          </>
                        ) : isPricingLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Calculating Pricing...
                          </>
                        ) : (
                          "Continue to Payment"
                        )}
                      </Button>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Payment Section */}
            {clientSecret && orderData && billingDetails && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">Payment</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "stripe",
                        variables: {
                          borderRadius: '8px',
                        },
                      },
                      loader: 'auto',
                    }}
                  >
                    {/* Express Checkout - Apple Pay, Google Pay, Link */}
                    <ExpressCheckout
                      amount={amountToPay}
                      orderData={orderData}
                      paymentType={paymentInfo.payingDepositOnly ? 'deposit' : 'full'}
                      onSuccess={handlePaymentSuccess}
                      items={items}
                      clientSecret={clientSecret}
                    />
                    
                    {/* Regular Payment Form */}
                    <PaymentForm
                      onSuccess={handlePaymentSuccess}
                      amount={amountToPay}
                      orderData={orderData}
                      paymentType={paymentInfo.payingDepositOnly ? 'deposit' : 'full'}
                      billingDetails={billingDetails!}
                      items={items as any}
                      onCancel={handleCancelPayment}
                    />
                  </Elements>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar - 2 columns */}
          <div className="lg:col-span-2">
            <Card className="lg:sticky lg:top-20">
              <CardHeader className="pb-4">
                <Collapsible open={orderSummaryExpanded} onOpenChange={setOrderSummaryExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:no-underline hover-elevate">
                      <h2 className="text-xl font-semibold">Order Summary</h2>
                      {orderSummaryExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-4">
                    <div className="space-y-4 mb-6">
                      {items.map((item) => (
                        <div key={item.id} className="flex gap-3" data-testid={`order-item-${item.id}`}>
                          <div className="relative flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                              {item.quantity}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm leading-tight">{item.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-sm text-muted-foreground">
                                    {formatConvertedPrice(parseFloat(item.price))} × {item.quantity}
                                  </p>
                                  {(item as any).originalPrice && (item as any).discountAmount && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground line-through">
                                        {formatConvertedPrice(parseFloat((item as any).originalPrice))}
                                      </span>
                                      <Badge variant="secondary" className="text-xs">
                                        Save {formatConvertedPrice(parseFloat((item as any).discountAmount))}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="font-semibold text-sm whitespace-nowrap">
                                {formatConvertedPrice(parseFloat(item.price) * item.quantity)}
                              </p>
                            </div>
                            
                            {item.productType === "pre-order" && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                  Pre-Order
                                </Badge>
                                {(item as any).preOrderDate && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date((item as any).preOrderDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {item.productType === "pre-order" && item.requiresDeposit && item.depositAmount && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Deposit: {formatConvertedPrice(parseFloat(item.depositAmount))} each
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Estimate */}
                    {paymentInfo.earliestDeliveryDate && paymentInfo.latestDeliveryDate && (
                      <div className="mb-6 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="text-xs">
                            <p className="font-medium mb-1">Estimated Delivery</p>
                            <p className="text-muted-foreground">
                              {new Date(paymentInfo.earliestDeliveryDate).toLocaleDateString()} - {new Date(paymentInfo.latestDeliveryDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pre-order Notice */}
                    {paymentInfo.hasPreOrders && paymentInfo.payingDepositOnly && (
                      <Alert className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="text-blue-900 dark:text-blue-100 text-sm">Deposit Payment</AlertTitle>
                        <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
                          Pay a deposit now. The remaining balance will be due before shipment.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Pricing Error Alert */}
                {pricingError && (
                  <Alert variant="destructive" className="mb-4" data-testid="alert-pricing-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Pricing Error</AlertTitle>
                    <AlertDescription>
                      Unable to calculate pricing. Please check your shipping address and try again.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span data-testid="text-subtotal">
                      {isPricingLoading ? (
                        <span className="text-muted-foreground">Calculating...</span>
                      ) : (
                        formatConvertedPrice(paymentInfo.subtotal)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span data-testid="text-shipping">
                      {isPricingLoading ? (
                        <span className="text-muted-foreground">Calculating...</span>
                      ) : (
                        paymentInfo.shipping === 0 ? "FREE" : formatConvertedPrice(paymentInfo.shipping)
                      )}
                    </span>
                  </div>

                  {paymentInfo.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span data-testid="text-tax">
                        {isPricingLoading ? (
                          <span className="text-muted-foreground">Calculating...</span>
                        ) : (
                          formatConvertedPrice(paymentInfo.tax)
                        )}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span data-testid="text-total">{formatConvertedPrice(paymentInfo.fullTotal)}</span>
                  </div>

                  {paymentInfo.payingDepositOnly && (
                    <>
                      <Separator />
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-sm font-medium text-blue-600 dark:text-blue-400">
                          <span>Deposit Due Now</span>
                          <span data-testid="text-deposit">{formatConvertedPrice(paymentInfo.depositTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Balance Due Later</span>
                          <span data-testid="text-balance">{formatConvertedPrice(paymentInfo.remainingBalance)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator className="my-4" />

                  {/* Currency Disclaimer */}
                  {sellerCurrency && (
                    <CurrencyDisclaimer 
                      sellerCurrency={sellerCurrency} 
                      variant="default"
                      className="mb-4"
                    />
                  )}

                  <div className="flex justify-between text-lg font-bold">
                    <span>Pay Now</span>
                    <span data-testid="text-amount-to-pay">
                      {formatConvertedPrice(amountToPay)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
