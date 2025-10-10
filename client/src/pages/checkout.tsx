import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
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
  Lock
} from "lucide-react";
import type { InsertOrder } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email required"),
  addressLine1: z.string().min(5, "Street address required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City required"),
  state: z.string().min(2, "State/Province required"),
  postalCode: z.string().min(3, "ZIP/Postal code required"),
  country: z.string().min(2, "Country required"),
  phone: z.string().min(10, "Phone number required"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

// Payment Form Component
function PaymentForm({ 
  onSuccess, 
  amount, 
  orderData,
  paymentType
}: { 
  onSuccess: (orderId: string) => void; 
  amount: number; 
  orderData: InsertOrder;
  paymentType: 'deposit' | 'full';
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

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

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "Payment could not be processed",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Create order in database with payment info
        const updatedOrderData = {
          ...orderData,
          amountPaid: amount.toString(),
          paymentStatus: paymentType === 'deposit' ? "deposit_paid" : "fully_paid",
          stripePaymentIntentId: paymentIntent.id,
        };

        const response = await apiRequest("POST", "/api/orders", updatedOrderData);
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
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            {paymentType === 'deposit' ? `Pay Deposit $${amount.toFixed(2)}` : `Pay $${amount.toFixed(2)}`}
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

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<InsertOrder | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(true);

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

  // Fetch shipping settings
  const { data: shippingData } = useQuery<{ shippingPrice: number }>({
    queryKey: ["/api/shipping-settings"],
  });

  const shippingPrice = shippingData?.shippingPrice ?? 0;

  // Calculate payment info with delivery estimates
  const paymentInfo = useMemo(() => {
    let depositTotal = 0;
    let fullTotal = 0;
    let hasPreOrders = false;
    let earliestDeliveryDate: Date | undefined = undefined;
    let latestDeliveryDate: Date | undefined = undefined;

    items.forEach((item) => {
      const itemTotal = parseFloat(item.price) * item.quantity;
      
      if (item.productType === "pre-order" && item.requiresDeposit && item.depositAmount) {
        hasPreOrders = true;
        const depositPerItem = parseFloat(item.depositAmount);
        depositTotal += depositPerItem * item.quantity;
        
        // Track pre-order dates
        if ((item as any).preOrderDate) {
          const preOrderDate = new Date((item as any).preOrderDate);
          if (!earliestDeliveryDate || preOrderDate < earliestDeliveryDate) {
            earliestDeliveryDate = preOrderDate;
          }
          if (!latestDeliveryDate || preOrderDate > latestDeliveryDate) {
            latestDeliveryDate = preOrderDate;
          }
        }
      } else if (item.productType === "in-stock") {
        // In-stock items: 3-7 business days
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 3);
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        
        if (!earliestDeliveryDate || minDate < earliestDeliveryDate) {
          earliestDeliveryDate = minDate;
        }
        if (!latestDeliveryDate || maxDate > latestDeliveryDate) {
          latestDeliveryDate = maxDate;
        }
      }
      
      fullTotal += itemTotal;
    });

    const fullTotalWithShipping = fullTotal + shippingPrice;
    const remainingBalance = fullTotalWithShipping - depositTotal;

    return {
      hasPreOrders,
      depositTotal,
      remainingBalance,
      fullTotal: fullTotalWithShipping,
      subtotal: fullTotal,
      shipping: shippingPrice,
      payingDepositOnly: hasPreOrders && depositTotal > 0,
      earliestDeliveryDate,
      latestDeliveryDate,
    };
  }, [items, shippingPrice]);

  const amountToPay = paymentInfo.payingDepositOnly ? paymentInfo.depositTotal : paymentInfo.fullTotal;

  // Create payment intent when form is valid
  const onSubmit = async (data: CheckoutForm) => {
    if (clientSecret) {
      // Payment intent already created, form is just for validation
      return;
    }

    try {
      setIsCreatingIntent(true);
      const { payingDepositOnly, depositTotal, remainingBalance, fullTotal } = paymentInfo;

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

      // Create payment intent
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount: amountToPay,
        paymentType: payingDepositOnly ? "deposit" : "full",
        items: items,
      });

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
      
      if (errorMsg.includes("hasn't set up payments") || errorMsg.includes("connect a payment provider")) {
        setStripeError("This store hasn't set up payments yet. Please contact the seller.");
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
    setLocation(`/order-success/${orderId}`);
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
          <Button onClick={() => setLocation("/products")} data-testid="button-browse-products">
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
                      ${paymentInfo.depositTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="font-semibold">${paymentInfo.remainingBalance.toFixed(2)}</span>
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
            <Button onClick={() => setLocation("/products")} data-testid="button-continue-shopping">
              Continue Shopping
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-home">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8" data-testid="text-page-title">
          Secure Checkout
        </h1>

        <div className="grid lg:grid-cols-5 gap-8">
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
                        disabled={isCreatingIntent}
                        data-testid="button-continue-payment"
                      >
                        {isCreatingIntent ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing Payment...
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
            {clientSecret && orderData && (
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
                    }}
                  >
                    <PaymentForm
                      onSuccess={handlePaymentSuccess}
                      amount={amountToPay}
                      orderData={orderData}
                      paymentType={paymentInfo.payingDepositOnly ? 'deposit' : 'full'}
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
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  ${parseFloat(item.price).toFixed(2)} × {item.quantity}
                                </p>
                              </div>
                              <p className="font-semibold text-sm whitespace-nowrap">
                                ${(parseFloat(item.price) * item.quantity).toFixed(2)}
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
                                Deposit: ${parseFloat(item.depositAmount).toFixed(2)} each
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
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span data-testid="text-subtotal">${paymentInfo.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span data-testid="text-shipping">
                      {paymentInfo.shipping === 0 ? "FREE" : `$${paymentInfo.shipping.toFixed(2)}`}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span data-testid="text-total">${paymentInfo.fullTotal.toFixed(2)}</span>
                  </div>

                  {paymentInfo.payingDepositOnly && (
                    <>
                      <Separator />
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-sm font-medium text-blue-600 dark:text-blue-400">
                          <span>Deposit Due Now</span>
                          <span data-testid="text-deposit">${paymentInfo.depositTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Balance Due Later</span>
                          <span data-testid="text-balance">${paymentInfo.remainingBalance.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator className="my-4" />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Pay Now</span>
                    <span data-testid="text-amount-to-pay">
                      ${amountToPay.toFixed(2)}
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
