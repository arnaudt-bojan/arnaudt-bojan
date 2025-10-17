import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package2, AlertCircle } from "lucide-react";
import { formatCurrency, getCurrentCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Variant {
  size?: string;
  color?: string;
  stock: number;
  moq?: number;
  wholesalePrice?: string;
}

interface WholesaleProduct {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rrp: string;
  srp?: string;
  wholesalePrice: string;
  moq: number;
  depositAmount?: string;
  depositPercentage?: number;
  requiresDeposit: number;
  stock: number;
  variants?: Variant[];
  orderDeadline?: string;
  expectedShipDate?: string;
  balancePaymentDate?: string;
  paymentTerms?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const [, setLocation] = useLocation();
  const currency = getCurrentCurrency();
  const { toast } = useToast();

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: product, isLoading } = useQuery<WholesaleProduct>({
    queryKey: ["/api/wholesale/products", productId],
    queryFn: async () => {
      const res = await fetch(`/api/wholesale/products/${productId}`);
      if (!res.ok) throw new Error("Failed to fetch product");
      return res.json();
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async (items: Array<{ productId: string; quantity: number; variant?: any }>) => {
      for (const item of items) {
        await apiRequest("POST", "/api/wholesale/cart", item);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/cart"] });
      toast({
        title: "Added to cart",
        description: "Items have been added to your wholesale cart",
      });
      setLocation("/wholesale/cart");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add items to cart",
        variant: "destructive",
      });
    },
  });

  const sizes = useMemo(() => {
    if (!product?.variants) return [];
    return Array.from(new Set(product.variants.map(v => v.size).filter(Boolean)));
  }, [product]);

  const colors = useMemo(() => {
    if (!product?.variants) return [];
    return Array.from(new Set(product.variants.map(v => v.color).filter(Boolean)));
  }, [product]);

  const totalQuantity = useMemo(() => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  }, [quantities]);

  const moqMet = useMemo(() => {
    if (!product) return false;
    return totalQuantity >= product.moq;
  }, [totalQuantity, product]);

  const handleQuantityChange = (key: string, value: string) => {
    const qty = parseInt(value) || 0;
    setQuantities(prev => ({ ...prev, [key]: qty }));
  };

  const handleAddToCart = () => {
    if (!product) return;

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => {
        if (product.variants && product.variants.length > 0) {
          const [size, color] = key.split("|");
          return {
            productId: product.id,
            quantity: qty,
            variant: { size: size || undefined, color: color || undefined },
          };
        }
        return {
          productId: product.id,
          quantity: qty,
        };
      });

    if (items.length === 0) {
      toast({
        title: "No items selected",
        description: "Please enter quantities for at least one item",
        variant: "destructive",
      });
      return;
    }

    addToCartMutation.mutate(items);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-square bg-muted rounded" />
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center gap-4">
              <Package2 className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Product Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  The requested product could not be found
                </p>
                <Button onClick={() => setLocation("/wholesale/catalog")}>
                  Back to Catalog
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Architecture 3: Backend should provide deposit amount pre-calculated

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/wholesale/catalog")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Catalog
        </Button>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              data-testid="img-product"
            />
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-3xl font-bold" data-testid="text-product-name">
                  {product.name}
                </h1>
                <Badge variant="secondary">{product.category}</Badge>
              </div>
              <p className="text-muted-foreground" data-testid="text-product-description">
                {product.description}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Wholesale Price</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-wholesale-price">
                    {formatCurrency(parseFloat(product.wholesalePrice), currency)}
                  </span>
                </div>
                {product.rrp && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">RRP</span>
                    <span className="text-lg" data-testid="text-rrp">
                      {formatCurrency(parseFloat(product.rrp), currency)}
                    </span>
                  </div>
                )}
                {product.srp && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">SRP</span>
                    <span className="text-lg" data-testid="text-srp">
                      {formatCurrency(parseFloat(product.srp), currency)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Minimum Order Quantity</span>
                  <Badge variant="outline" data-testid="badge-moq">
                    {product.moq} units
                  </Badge>
                </div>
                {product.requiresDeposit === 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Deposit Required</span>
                    <span className="font-semibold" data-testid="text-deposit">
                      {product.depositAmount
                        ? formatCurrency(parseFloat(product.depositAmount), currency)
                        : `${product.depositPercentage}%`}
                    </span>
                  </div>
                )}
                {product.paymentTerms && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payment Terms</span>
                    <span className="font-semibold" data-testid="text-payment-terms">
                      {product.paymentTerms}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {(product.orderDeadline || product.expectedShipDate || product.balancePaymentDate) && (
              <Card>
                <CardHeader>
                  <CardTitle>Important Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {product.orderDeadline && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Order Deadline</span>
                      <span data-testid="text-order-deadline">
                        {format(new Date(product.orderDeadline), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  {product.expectedShipDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expected Ship Date</span>
                      <span data-testid="text-ship-date">
                        {format(new Date(product.expectedShipDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  {product.balancePaymentDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Balance Payment Date</span>
                      <span data-testid="text-balance-date">
                        {format(new Date(product.balancePaymentDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(product.contactEmail || product.contactPhone) && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {product.contactEmail && (
                    <p className="text-sm" data-testid="text-contact-email">
                      Email: {product.contactEmail}
                    </p>
                  )}
                  {product.contactPhone && (
                    <p className="text-sm" data-testid="text-contact-phone">
                      Phone: {product.contactPhone}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Quantity</CardTitle>
            <CardDescription>
              Select quantities for each variant. Minimum order: {product.moq} units
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const hasSizes = sizes.length > 0;
              const hasColors = colors.length > 0;

              // Case 1: No variants - single quantity input
              if (!hasSizes && !hasColors) {
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label htmlFor="no-variant-qty">Quantity</Label>
                      <Input
                        id="no-variant-qty"
                        type="number"
                        min="0"
                        step="1"
                        value={quantities["no-variant"] || ""}
                        onChange={(e) => handleQuantityChange("no-variant", e.target.value)}
                        className="w-32"
                        data-testid="input-quantity-no-variant"
                      />
                      <span className="text-sm text-muted-foreground">
                        MOQ: {product.moq}
                      </span>
                    </div>
                  </div>
                );
              }

              // Case 2: Size only - table with size rows
              if (hasSizes && !hasColors) {
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Size</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sizes.map((size) => {
                          const key = size || "";
                          return (
                            <TableRow key={size}>
                              <TableCell className="font-medium">{size}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={quantities[key] || ""}
                                  onChange={(e) => handleQuantityChange(key, e.target.value)}
                                  className="w-24"
                                  data-testid={`input-quantity-${size}`}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              }

              // Case 3: Color only - table with color rows
              if (hasColors && !hasSizes) {
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Color</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {colors.map((color) => {
                          const key = color || "";
                          return (
                            <TableRow key={color}>
                              <TableCell className="font-medium">{color}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={quantities[key] || ""}
                                  onChange={(e) => handleQuantityChange(key, e.target.value)}
                                  className="w-24"
                                  data-testid={`input-quantity-${color}`}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              }

              // Case 4: Both size and color - matrix table
              return (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        {colors.map((color) => (
                          <TableHead key={color} className="text-center">
                            {color}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sizes.map((size) => (
                        <TableRow key={size}>
                          <TableCell className="font-medium">{size}</TableCell>
                          {colors.map((color) => {
                            const variant = product.variants?.find(
                              (v) => v.size === size && v.color === color
                            );
                            const key = `${size}|${color}`;
                            return (
                              <TableCell key={color}>
                                {variant ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={quantities[key] || ""}
                                    onChange={(e) => handleQuantityChange(key, e.target.value)}
                                    className="w-20"
                                    data-testid={`input-quantity-${size}-${color}`}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}

            <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Quantity:</span>
                <span className="text-lg font-bold" data-testid="text-total-quantity">
                  {totalQuantity} units
                </span>
              </div>
              {!moqMet && totalQuantity > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm" data-testid="text-moq-error">
                    Minimum order quantity of {product.moq} units not met
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={!moqMet || addToCartMutation.isPending}
                className="flex-1"
                data-testid="button-add-to-cart"
              >
                {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
