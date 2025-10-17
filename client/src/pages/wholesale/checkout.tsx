import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, getCurrentCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const checkoutSchema = z.object({
  shippingType: z.enum(["freight_collect", "buyer_pickup"]),
  carrierName: z.string().optional(),
  freightAccountNumber: z.string().optional(),
  pickupInstructions: z.string().optional(),
  contactName: z.string().min(1, "Name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().min(1, "Phone number is required"),
  company: z.string().min(1, "Company name is required"),
  acceptsTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CartItem {
  productId: string;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
  };
}

interface WholesaleCart {
  buyerId: string;
  items: CartItem[];
}

interface ProductWithDetails extends CartItem {
  name: string;
  image: string;
  wholesalePrice: string;
  sellerId: string;
  requiresDeposit: number;
  depositAmount?: string;
  depositPercentage?: number;
  balancePaymentDate?: string;
  expectedShipDate?: string;
  orderDeadline?: string;
  moq: number;
}

export default function WholesaleCheckout() {
  const [, setLocation] = useLocation();
  const currency = getCurrentCurrency();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingType: "freight_collect",
      carrierName: "",
      freightAccountNumber: "",
      pickupInstructions: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      company: "",
      acceptsTerms: false,
    },
  });

  const { data: cart } = useQuery<WholesaleCart>({
    queryKey: ["/api/wholesale/cart"],
  });

  const { data: itemsWithDetails, isLoading } = useQuery<ProductWithDetails[]>({
    queryKey: ["/api/wholesale/cart/details"],
    queryFn: async () => {
      if (!cart?.items || cart.items.length === 0) return [];
      
      const details = await Promise.all(
        cart.items.map(async (item) => {
          const res = await fetch(`/api/wholesale/products/${item.productId}`);
          if (!res.ok) throw new Error("Failed to fetch product");
          const product = await res.json();
          return { ...item, ...product };
        })
      );
      return details;
    },
    enabled: !!cart?.items && cart.items.length > 0,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: CheckoutFormData) => {
      if (!itemsWithDetails || itemsWithDetails.length === 0) {
        throw new Error("Cart is empty");
      }

      const sellerId = itemsWithDetails[0].sellerId;
      
      const response = await apiRequest("POST", "/api/wholesale/checkout", {
        sellerId,
        shippingData: {
          shippingType: data.shippingType,
          carrierName: data.carrierName,
          freightAccountNumber: data.freightAccountNumber,
          pickupInstructions: data.pickupInstructions,
        },
        buyerContact: {
          name: data.contactName,
          email: data.contactEmail,
          phone: data.contactPhone,
          company: data.company,
        },
        depositTerms: {
          requiresDeposit: itemsWithDetails[0].requiresDeposit === 1,
          depositAmount: itemsWithDetails[0].depositAmount ? parseFloat(itemsWithDetails[0].depositAmount) : undefined,
          depositPercentage: itemsWithDetails[0].depositPercentage,
        },
        acceptsTerms: data.acceptsTerms,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Order placed successfully",
        description: "Your wholesale order has been placed",
      });
      setLocation(`/wholesale/orders/${data.orderId}/confirmation`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    },
  });

  // Architecture 3: Backend should provide subtotal, depositAmount, balanceAmount pre-calculated
  // For display purposes, calculate from backend prices (already in correct currency)
  const subtotal = (itemsWithDetails || []).reduce((sum, item) => {
    return sum + parseFloat(item.wholesalePrice) * item.quantity;
  }, 0);

  const requiresDeposit = (itemsWithDetails || []).some((item) => item.requiresDeposit === 1);
  const depositAmount = (itemsWithDetails || []).reduce((sum, item) => {
    if (item.requiresDeposit !== 1) return sum;
    const itemSubtotal = parseFloat(item.wholesalePrice) * item.quantity;
    if (item.depositAmount) {
      return sum + parseFloat(item.depositAmount);
    } else if (item.depositPercentage) {
      return sum + (itemSubtotal * item.depositPercentage) / 100;
    }
    return sum;
  }, 0);
  const balanceAmount = subtotal - depositAmount;

  const shippingType = form.watch("shippingType");

  const onSubmit = (data: CheckoutFormData) => {
    if (step === 1) {
      setStep(2);
    } else {
      checkoutMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    setLocation("/wholesale/cart");
    return null;
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
          Checkout
        </h1>
        <p className="text-muted-foreground mb-8">
          Step {step} of 2: {step === 1 ? "Shipping & Payment Information" : "Review Order"}
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {step === 1 ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Shipping Method</CardTitle>
                        <CardDescription>Select how you want to receive your order</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="shippingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RadioGroup
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  className="space-y-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="freight_collect"
                                      id="freight"
                                      data-testid="radio-freight-collect"
                                    />
                                    <label htmlFor="freight" className="cursor-pointer">
                                      <div className="font-medium">Freight Collect</div>
                                      <div className="text-sm text-muted-foreground">
                                        Use your own freight account
                                      </div>
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="buyer_pickup"
                                      id="pickup"
                                      data-testid="radio-buyer-pickup"
                                    />
                                    <label htmlFor="pickup" className="cursor-pointer">
                                      <div className="font-medium">Buyer Pickup</div>
                                      <div className="text-sm text-muted-foreground">
                                        Pick up from seller's warehouse
                                      </div>
                                    </label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {shippingType === "freight_collect" && (
                          <div className="mt-4 space-y-4">
                            <FormField
                              control={form.control}
                              name="carrierName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Carrier</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-carrier">
                                        <SelectValue placeholder="Select carrier" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="UPS">UPS</SelectItem>
                                      <SelectItem value="FedEx">FedEx</SelectItem>
                                      <SelectItem value="DHL">DHL</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="freightAccountNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Freight Account Number</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Enter your freight account number" 
                                      data-testid="input-freight-account"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    We'll ship using your freight account. You'll receive tracking info when shipped.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {shippingType === "buyer_pickup" && (
                          <div className="mt-4 space-y-4">
                            <div className="p-4 bg-muted rounded-md">
                              <h4 className="font-medium mb-2">Pickup Address</h4>
                              <div className="text-sm text-muted-foreground" data-testid="text-pickup-address">
                                {itemsWithDetails[0]?.sellerWarehouseAddress ? (
                                  <>
                                    {itemsWithDetails[0].sellerWarehouseAddress.street}<br />
                                    {itemsWithDetails[0].sellerWarehouseAddress.city}, {itemsWithDetails[0].sellerWarehouseAddress.state} {itemsWithDetails[0].sellerWarehouseAddress.zip}
                                  </>
                                ) : (
                                  "Address will be provided by seller"
                                )}
                              </div>
                            </div>

                            <FormField
                              control={form.control}
                              name="pickupInstructions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pickup Instructions (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Any special instructions for pickup?" 
                                      data-testid="textarea-pickup-instructions"
                                      rows={3}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    You can pick up your order from the address above after production is complete.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                        <CardDescription>Provide your contact details for this order</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="contactName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="John Doe" 
                                    data-testid="input-contact-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="contactEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="email"
                                    placeholder="john@company.com" 
                                    data-testid="input-contact-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="contactPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="+1 (555) 123-4567" 
                                    data-testid="input-contact-phone"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="company"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="ACME Inc." 
                                    data-testid="input-company"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {requiresDeposit && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Payment Information</CardTitle>
                          <CardDescription>Deposit payment required</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Deposit Due Now:</span>
                              <span className="text-xl font-bold text-primary" data-testid="text-deposit-amount">
                                {formatCurrency(depositAmount, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Balance Due:</span>
                              <span className="font-semibold" data-testid="text-balance-amount">
                                {formatCurrency(balanceAmount, currency)}
                              </span>
                            </div>
                            {itemsWithDetails[0]?.balancePaymentDate && (
                              <p className="text-sm text-muted-foreground">
                                Balance payment due by:{" "}
                                {format(new Date(itemsWithDetails[0].balancePaymentDate), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                        <CardDescription>Review your order details</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {itemsWithDetails.map((item, index) => (
                          <div key={index} className="flex justify-between items-start">
                            <div>
                              <div className="font-medium" data-testid={`text-review-item-name-${index}`}>
                                {item.name}
                              </div>
                              {item.variant && (
                                <div className="text-sm text-muted-foreground">
                                  {item.variant.size && `Size: ${item.variant.size}`}
                                  {item.variant.size && item.variant.color && " | "}
                                  {item.variant.color && `Color: ${item.variant.color}`}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground">
                                Qty: {item.quantity}
                              </div>
                            </div>
                            <div className="font-semibold">
                              {formatCurrency(parseFloat(item.wholesalePrice) * item.quantity, currency)}
                            </div>
                          </div>
                        ))}

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Contact:</span>
                            <span className="font-medium" data-testid="text-review-contact">
                              {form.getValues("contactName")} ({form.getValues("company")})
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium" data-testid="text-review-email">
                              {form.getValues("contactEmail")}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-medium" data-testid="text-review-phone">
                              {form.getValues("contactPhone")}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Shipping Method:</span>
                            <span className="font-medium" data-testid="text-review-shipping">
                              {shippingType === "freight_collect" ? "Freight Collect" : "Buyer Pickup"}
                              {shippingType === "freight_collect" &&
                                form.getValues("carrierName") &&
                                ` (${form.getValues("carrierName")})`}
                            </span>
                          </div>

                          {requiresDeposit && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Deposit:</span>
                                <span className="font-semibold">{formatCurrency(depositAmount, currency)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Balance:</span>
                                <span className="font-semibold">{formatCurrency(balanceAmount, currency)}</span>
                              </div>
                            </>
                          )}
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total:</span>
                          <span className="text-2xl font-bold" data-testid="text-review-total">
                            {formatCurrency(subtotal, currency)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <FormField
                          control={form.control}
                          name="acceptsTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-terms"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  I accept the terms and conditions for this wholesale order
                                </FormLabel>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle>Order Total</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">{formatCurrency(subtotal, currency)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold">{formatCurrency(subtotal, currency)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  data-testid="button-back"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                className="ml-auto"
                disabled={checkoutMutation.isPending}
                data-testid={step === 1 ? "button-review-order" : "button-place-order"}
              >
                {step === 1
                  ? "Review Order"
                  : checkoutMutation.isPending
                  ? "Placing Order..."
                  : "Place Order"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
