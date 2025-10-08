import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { ShoppingBag, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import StripeCheckoutForm from "@/components/stripe-checkout-form";
import type { InsertOrder } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerAddress: z.string().min(10, "Address must be at least 10 characters"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<InsertOrder | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerAddress: "",
    },
  });

  // Fetch shipping settings
  const { data: shippingData } = useQuery<{ shippingPrice: number }>({
    queryKey: ["/api/shipping-settings"],
  });

  const shippingPrice = shippingData?.shippingPrice ?? 0;

  // Calculate deposit vs full payment
  const paymentInfo = useMemo(() => {
    let depositTotal = 0;
    let fullTotal = 0;
    let hasPreOrders = false;

    items.forEach((item) => {
      const itemTotal = parseFloat(item.price) * item.quantity;
      
      if (item.productType === "pre-order" && item.requiresDeposit && item.depositAmount) {
        hasPreOrders = true;
        const depositPerItem = parseFloat(item.depositAmount);
        depositTotal += depositPerItem * item.quantity;
      }
      fullTotal += itemTotal;
    });

    // Add shipping to full total
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
    };
  }, [items, shippingPrice]);

  const amountToPay = paymentInfo.payingDepositOnly ? paymentInfo.depositTotal : paymentInfo.fullTotal;

  const onShippingSubmit = async (data: CheckoutForm) => {
    try {
      const { payingDepositOnly, depositTotal, remainingBalance, fullTotal } = paymentInfo;

      // Create order data
      const newOrderData: InsertOrder = {
        ...data,
        items: JSON.stringify(items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          productType: item.productType,
          depositAmount: item.depositAmount,
          requiresDeposit: item.requiresDeposit,
        }))),
        total: fullTotal.toString(),
        amountPaid: "0", // Will be updated after payment
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
      });

      const paymentData = await response.json();

      if (!paymentData.clientSecret) {
        throw new Error("Failed to create payment intent");
      }

      setClientSecret(paymentData.clientSecret);
      setPaymentIntentId(paymentData.paymentIntentId);
      setStep("payment");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      if (!orderData || !paymentIntentId) {
        throw new Error("Missing order data or payment ID");
      }

      // Update order data with payment info
      const updatedOrderData = {
        ...orderData,
        amountPaid: amountToPay.toString(),
        paymentStatus: paymentInfo.payingDepositOnly ? "deposit_paid" : "fully_paid",
        stripePaymentIntentId: paymentIntentId,
      };

      // Create order in database
      await apiRequest("POST", "/api/orders", updatedOrderData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      clearCart();
      setOrderComplete(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Payment successful but failed to save order. Please contact support.",
        variant: "destructive",
      });
    }
  };

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Add some products to your cart before checking out
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
            Order Placed Successfully!
          </h1>
          <p className="text-muted-foreground mb-2">
            Thank you for your order. You will receive a confirmation email shortly.
          </p>
          {paymentInfo.payingDepositOnly && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8 max-w-md mx-auto">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Deposit Paid:</strong> ${paymentInfo.depositTotal.toFixed(2)}<br />
                <strong>Remaining Balance:</strong> ${paymentInfo.remainingBalance.toFixed(2)}<br />
                <span className="text-xs">You'll be contacted to pay the balance before shipment.</span>
              </p>
            </div>
          )}
          <div className="flex gap-4 justify-center">
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
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8" data-testid="text-page-title">
          Checkout
        </h1>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "shipping" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "shipping" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              1
            </div>
            <span>Shipping</span>
          </div>
          <div className="h-px w-12 bg-border" />
          <div className={`flex items-center gap-2 ${step === "payment" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              2
            </div>
            <span>Payment</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === "shipping" ? (
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Shipping Information</h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onShippingSubmit)} className="space-y-6">
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

                    <FormField
                      control={form.control}
                      name="customerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="123 Main St, City, State, ZIP"
                              {...field}
                              data-testid="input-address"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      data-testid="button-continue-payment"
                    >
                      Continue to Payment
                    </Button>
                  </form>
                </Form>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("shipping")}
                    data-testid="button-back-shipping"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Shipping
                  </Button>
                </div>
                
                <h2 className="text-2xl font-semibold mb-6">Payment Information</h2>
                
                {!clientSecret && (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading payment form...
                  </div>
                )}
                
                {clientSecret && (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "stripe",
                      },
                    }}
                  >
                    <StripeCheckoutForm
                      onSuccess={handlePaymentSuccess}
                      amount={amountToPay}
                      buttonText={paymentInfo.payingDepositOnly ? "Pay Deposit" : "Pay Now"}
                    />
                  </Elements>
                )}
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm">
                  <p className="font-semibold mb-2">Test Card Information:</p>
                  <p className="text-muted-foreground">Card: 4242 4242 4242 4242</p>
                  <p className="text-muted-foreground">Expiry: Any future date</p>
                  <p className="text-muted-foreground">CVC: Any 3 digits</p>
                  <p className="text-muted-foreground">ZIP: Any 5 digits</p>
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card className="p-6 sticky top-20">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3" data-testid={`order-item-${item.id}`}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                        {item.productType === "pre-order" && item.requiresDeposit && (
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                            Pre-Order
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × ${parseFloat(item.price).toFixed(2)}
                      </p>
                      {item.productType === "pre-order" && item.requiresDeposit && item.depositAmount && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Deposit: ${parseFloat(item.depositAmount).toFixed(2)} each
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {paymentInfo.hasPreOrders && paymentInfo.payingDepositOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      This order contains pre-order items. Pay deposit now, balance due later.
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">${paymentInfo.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span data-testid="text-shipping">${paymentInfo.shipping.toFixed(2)}</span>
                </div>

                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span data-testid="text-total">${paymentInfo.fullTotal.toFixed(2)}</span>
                </div>

                {paymentInfo.payingDepositOnly && (
                  <>
                    <div className="flex justify-between text-sm font-medium text-blue-600 dark:text-blue-400">
                      <span>Deposit Due Now</span>
                      <span data-testid="text-deposit">${paymentInfo.depositTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Balance Due Later</span>
                      <span data-testid="text-balance">${paymentInfo.remainingBalance.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Pay Now</span>
                  <span data-testid="text-total">
                    ${amountToPay.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
