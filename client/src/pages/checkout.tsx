import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { ShoppingBag, CheckCircle, AlertCircle } from "lucide-react";
import type { InsertOrder } from "@shared/schema";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerAddress: "",
    },
  });

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

    const remainingBalance = fullTotal - depositTotal;

    return {
      hasPreOrders,
      depositTotal,
      remainingBalance,
      fullTotal,
      payingDepositOnly: hasPreOrders && depositTotal > 0,
    };
  }, [items]);

  const onSubmit = async (data: CheckoutForm) => {
    setIsSubmitting(true);
    try {
      const { payingDepositOnly, depositTotal, remainingBalance, fullTotal } = paymentInfo;

      const orderData: InsertOrder = {
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
        amountPaid: payingDepositOnly ? depositTotal.toString() : fullTotal.toString(),
        remainingBalance: payingDepositOnly ? remainingBalance.toString() : "0",
        paymentType: payingDepositOnly ? "deposit" : "full",
        status: "pending",
      };

      await apiRequest("POST", "/api/orders", orderData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      clearCart();
      setOrderComplete(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Shipping Information</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    disabled={isSubmitting}
                    data-testid="button-place-order"
                  >
                    {isSubmitting 
                      ? "Placing Order..." 
                      : paymentInfo.payingDepositOnly 
                        ? `Pay Deposit ($${paymentInfo.depositTotal.toFixed(2)})`
                        : `Place Order ($${total.toFixed(2)})`}
                  </Button>
                </form>
              </Form>
            </Card>
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
                  <span className="text-muted-foreground">Order Total</span>
                  <span data-testid="text-subtotal">${paymentInfo.fullTotal.toFixed(2)}</span>
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

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Pay Now</span>
                  <span data-testid="text-total">
                    ${paymentInfo.payingDepositOnly ? paymentInfo.depositTotal.toFixed(2) : paymentInfo.fullTotal.toFixed(2)}
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
