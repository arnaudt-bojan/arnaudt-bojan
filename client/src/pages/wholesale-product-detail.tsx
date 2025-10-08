import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ShoppingCart, Package, TrendingUp, AlertCircle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context";
import { apiRequest } from "@/lib/queryClient";

interface WholesaleProduct {
  id: string;
  sellerId: string;
  productId?: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rrp: string;
  wholesalePrice: string;
  moq: number;
  depositAmount?: string;
  requiresDeposit: number;
  stock: number;
  readinessDays?: number;
  variants?: Array<{
    size: string;
    color: string;
    stock: number;
    image?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function WholesaleProductDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { addItem, updateQuantity } = useCart();

  // Quantity selections for variants
  const [variantQuantities, setVariantQuantities] = useState<Map<string, number>>(new Map());
  const [totalQuantity, setTotalQuantity] = useState(0);

  const { data: product, isLoading } = useQuery<WholesaleProduct>({
    queryKey: ["/api/wholesale/buyer/products", id],
  });

  // Calculate total quantity whenever variant quantities change
  useEffect(() => {
    const total = Array.from(variantQuantities.values()).reduce((sum, qty) => sum + qty, 0);
    setTotalQuantity(total);
  }, [variantQuantities]);

  const updateVariantQuantity = (size: string, color: string, quantity: number) => {
    const key = `${size}-${color}`;
    const newQuantities = new Map(variantQuantities);
    
    if (quantity <= 0) {
      newQuantities.delete(key);
    } else {
      newQuantities.set(key, quantity);
    }
    
    setVariantQuantities(newQuantities);
  };

  const getVariantQuantity = (size: string, color: string): number => {
    const key = `${size}-${color}`;
    return variantQuantities.get(key) || 0;
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (product.variants && product.variants.length > 0) {
      if (totalQuantity < product.moq) {
        toast({
          title: "MOQ Not Met",
          description: `You must order at least ${product.moq} units total across all variants.`,
          variant: "destructive",
        });
        return;
      }

      if (totalQuantity === 0) {
        toast({
          title: "Select Quantities",
          description: "Please select quantities for at least one variant.",
          variant: "destructive",
        });
        return;
      }

      // Build selected variants array
      const selectedVariants = Array.from(variantQuantities.entries()).map(([key, quantity]) => {
        const [size, color] = key.split("-");
        return { size, color, quantity };
      });

      // Convert wholesale product to cart-compatible format
      const cartItem = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.wholesalePrice,
        image: product.image,
        category: product.category,
        productType: "wholesale" as const,
        stock: product.stock,
        depositAmount: product.depositAmount,
        requiresDeposit: product.requiresDeposit,
        variants: product.variants,
      };

      // Add to cart with total quantity
      addItem(cartItem);
      updateQuantity(cartItem.id, totalQuantity);

      toast({
        title: "Added to Cart",
        description: `Added ${totalQuantity} units to cart`,
      });
    } else {
      // Simple product without variants - add with MOQ
      const cartItem = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.wholesalePrice,
        image: product.image,
        category: product.category,
        productType: "wholesale" as const,
        stock: product.stock,
        depositAmount: product.depositAmount,
        requiresDeposit: product.requiresDeposit,
      };

      addItem(cartItem);
      updateQuantity(cartItem.id, product.moq);

      toast({
        title: "Added to Cart",
        description: `Added ${product.moq} units to cart (MOQ)`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/wholesale/catalog")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="animate-pulse">
              <div className="aspect-square bg-muted rounded-lg" />
            </div>
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Product Not Found</h3>
              <Button onClick={() => setLocation("/wholesale/catalog")}>
                Back to Catalog
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get unique sizes and colors from variants
  const sizes = product.variants 
    ? Array.from(new Set(product.variants.map(v => v.size)))
    : [];
  const colors = product.variants
    ? Array.from(new Set(product.variants.map(v => v.color)))
    : [];

  const getVariantStock = (size: string, color: string): number => {
    const variant = product.variants?.find(v => v.size === size && v.color === color);
    return variant?.stock || 0;
  };

  const margin = ((parseFloat(product.rrp) - parseFloat(product.wholesalePrice)) / parseFloat(product.rrp)) * 100;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/wholesale/catalog")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Product Image */}
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              data-testid="img-product"
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-4xl font-bold" data-testid="text-product-name">
                  {product.name}
                </h1>
                <Badge variant="secondary">{product.category}</Badge>
              </div>
              <p className="text-muted-foreground" data-testid="text-description">
                {product.description}
              </p>
            </div>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wholesale Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Your Price</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-wholesale-price">
                    {formatPrice(parseFloat(product.wholesalePrice))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Retail Price (RRP)</span>
                  <span className="text-lg line-through" data-testid="text-rrp">
                    {formatPrice(parseFloat(product.rrp))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-muted-foreground">Your Margin</span>
                  <Badge variant="default" className="text-lg">
                    {margin.toFixed(0)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Minimum Order Qty</span>
                  <Badge variant="outline" data-testid="badge-moq">
                    {product.moq} units
                  </Badge>
                </div>
                {product.readinessDays && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Lead Time</span>
                    <span className="font-medium">{product.readinessDays} days</span>
                  </div>
                )}
                {product.requiresDeposit === 1 && product.depositAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Deposit Required</span>
                    <span className="font-medium">
                      {formatPrice(parseFloat(product.depositAmount))} per unit
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Variant Selector */}
        {product.variants && product.variants.length > 0 ? (
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Select Variants & Quantities</h2>
              <p className="text-muted-foreground">
                Choose quantities for each size and color combination. Total must meet MOQ of {product.moq} units.
              </p>
            </div>

            <div className="overflow-x-auto mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Size</TableHead>
                    {colors.map(color => (
                      <TableHead key={color} className="text-center">
                        <div className="space-y-1">
                          <div className="font-semibold">{color}</div>
                          <div className="text-xs text-muted-foreground">Stock</div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sizes.map(size => (
                    <TableRow key={size}>
                      <TableCell className="font-medium">{size}</TableCell>
                      {colors.map(color => {
                        const stock = getVariantStock(size, color);
                        const quantity = getVariantQuantity(size, color);
                        const isAvailable = stock > 0 || stock === 0; // 0 = made to order
                        
                        return (
                          <TableCell key={color} className="text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {stock === 0 ? "MTO" : `${stock}`}
                              </Badge>
                              <Input
                                type="number"
                                min="0"
                                max={stock > 0 ? stock : undefined}
                                value={quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  if (stock > 0 && val > stock) {
                                    toast({
                                      title: "Stock Limit",
                                      description: `Only ${stock} units available for ${size} ${color}`,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  updateVariantQuantity(size, color, val);
                                }}
                                className="w-20 text-center"
                                disabled={!isAvailable}
                                data-testid={`input-quantity-${size}-${color}`}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Selected Quantity</div>
                <div className="text-3xl font-bold" data-testid="text-total-quantity">
                  {totalQuantity} units
                </div>
                {totalQuantity < product.moq && (
                  <div className="text-sm text-destructive">
                    Need {product.moq - totalQuantity} more to meet MOQ
                  </div>
                )}
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-3xl font-bold" data-testid="text-total-cost">
                  {formatPrice(totalQuantity * parseFloat(product.wholesalePrice))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={totalQuantity < product.moq || totalQuantity === 0}
                className="flex-1"
                size="lg"
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {totalQuantity < product.moq 
                  ? `Need ${product.moq - totalQuantity} More Units`
                  : "Add to Cart"
                }
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Order This Product</h3>
                <p className="text-muted-foreground">
                  Minimum order: {product.moq} units
                </p>
              </div>
              <Button size="lg" onClick={handleAddToCart} data-testid="button-add-to-cart">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
