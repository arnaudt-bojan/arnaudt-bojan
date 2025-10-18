import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, AlertCircle } from "lucide-react";
import { formatCurrencyFromCents, getCurrentCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

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

interface CartItemWithDetails {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
  };
  unitPriceCents: number;
  subtotalCents: number;
  moq: number;
}

interface CartDetails {
  items: CartItemWithDetails[];
  subtotalCents: number;
  currency: string;
  exchangeRate?: number;
}

export default function WholesaleCartPage() {
  const [, setLocation] = useLocation();
  const currency = getCurrentCurrency();
  const { toast } = useToast();

  const { data: cart, isLoading } = useQuery<WholesaleCart>({
    queryKey: ["/api/wholesale/cart"],
  });

  const { data: cartDetails, isLoading: productsLoading } = useQuery<CartDetails>({
    queryKey: ["/api/wholesale/cart/details"],
    enabled: !!cart?.items && cart.items.length > 0,
  });

  const itemsWithDetails = cartDetails?.items || [];

  const updateItemMutation = useMutation({
    mutationFn: async ({ productId, variant, quantity }: { productId: string; variant: any; quantity: number }) => {
      return apiRequest("PUT", "/api/wholesale/cart/item", { productId, variant, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/cart/details"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ productId, variant }: { productId: string; variant: any }) => {
      const params = new URLSearchParams({ productId });
      if (variant && Object.keys(variant).length > 0) {
        params.append('variant', JSON.stringify(variant));
      }
      const response = await fetch(`/api/wholesale/cart/item?${params.toString()}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/cart/details"] });
      toast({
        title: "Item removed",
        description: "Item has been removed from cart",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  const handleQuantityChange = (item: CartItemWithDetails, newQuantity: number) => {
    if (newQuantity < 0) return;
    updateItemMutation.mutate({
      productId: item.productId,
      variant: item.variant,
      quantity: newQuantity,
    });
  };

  const handleRemoveItem = (item: CartItemWithDetails) => {
    removeItemMutation.mutate({
      productId: item.productId,
      variant: item.variant,
    });
  };

  // Use backend-calculated subtotal (Architecture 3)
  const subtotal = cartDetails?.subtotalCents || 0;

  const validationErrors: string[] = [];
  itemsWithDetails.forEach((item) => {
    if (item.quantity < item.moq) {
      const variantLabel = item.variant
        ? ` (${item.variant.size || ""}${item.variant.size && item.variant.color ? "/" : ""}${item.variant.color || ""})`
        : "";
      validationErrors.push(`${item.productName}${variantLabel}: Quantity ${item.quantity} is below MOQ of ${item.moq}`);
    }
  });

  const hasValidationErrors = validationErrors.length > 0;

  if (isLoading || productsLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center gap-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground mb-4">
                  Add wholesale products to your cart to get started
                </p>
                <Button onClick={() => setLocation("/wholesale/catalog")} data-testid="button-continue-shopping">
                  Browse Catalog
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8" data-testid="text-page-title">
          Wholesale Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {itemsWithDetails.map((item, index) => (
              <Card key={`${item.productId}-${JSON.stringify(item.variant)}`}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Product Image */}
                    <div className="w-full sm:w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                        data-testid={`img-item-${index}`}
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 space-y-3">
                      {/* Title and Remove Button */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base md:text-lg truncate" data-testid={`text-item-name-${index}`}>
                            {item.productName}
                          </h3>
                          {item.variant && (
                            <p className="text-xs md:text-sm text-muted-foreground" data-testid={`text-item-variant-${index}`}>
                              {item.variant.size && `Size: ${item.variant.size}`}
                              {item.variant.size && item.variant.color && " | "}
                              {item.variant.color && `Color: ${item.variant.color}`}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item)}
                          data-testid={`button-remove-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Quantity and MOQ - Mobile Friendly */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 flex-1">
                          <label className="text-sm text-muted-foreground whitespace-nowrap">Quantity:</label>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0)}
                            className="w-20"
                            data-testid={`input-quantity-${index}`}
                          />
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">
                          MOQ: {item.moq} units
                        </div>
                      </div>

                      {/* Price Information - Mobile Stacked */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div className="text-xs md:text-sm text-muted-foreground">
                          Unit Price: {formatCurrencyFromCents(item.unitPriceCents, currency)}
                        </div>
                        <div className="text-base md:text-lg font-semibold" data-testid={`text-item-subtotal-${index}`}>
                          {formatCurrencyFromCents(item.subtotalCents, currency)}
                        </div>
                      </div>

                      {/* MOQ Error Warning */}
                      {item.quantity < item.moq && (
                        <div className="flex items-center gap-2 text-destructive text-xs md:text-sm">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span data-testid={`text-moq-error-${index}`}>
                            Quantity is below MOQ of {item.moq}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary - Sticky on Desktop, Full Width on Mobile */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold" data-testid="text-subtotal">
                    {formatCurrencyFromCents(subtotal, currency)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl md:text-2xl font-bold" data-testid="text-total">
                    {formatCurrencyFromCents(subtotal, currency)}
                  </span>
                </div>

                {hasValidationErrors && (
                  <div className="p-4 bg-destructive/10 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-destructive font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm md:text-base">Validation Errors</span>
                    </div>
                    <ul className="text-xs md:text-sm text-destructive space-y-1">
                      {validationErrors.map((error, i) => (
                        <li key={i} data-testid={`text-validation-error-${i}`}>
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  disabled={hasValidationErrors}
                  onClick={() => setLocation("/wholesale/checkout")}
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/wholesale/catalog")}
                  data-testid="button-continue-shopping-bottom"
                >
                  Continue Shopping
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
