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
import { 
  ArrowLeft, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  Warehouse, 
  Calendar,
  DollarSign,
  Box,
  Clock,
  CheckCircle,
  TrendingDown
} from "lucide-react";
import { formatCurrency, getCurrentCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context";
import { apiRequest } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

interface WholesaleProduct {
  id: string;
  sellerId: string;
  productId?: string;
  name: string;
  description: string;
  image: string;
  images?: string[];
  category: string;
  sku?: string;
  rrp: string;
  wholesalePrice: string;
  moq: number;
  depositAmount?: string;
  depositPercentage?: string;
  requiresDeposit: number;
  stock: number;
  readinessDays?: number;
  readinessType?: string;
  readinessValue?: string;
  balancePaymentTerms?: string;
  balancePaymentDate?: string;
  shipFromAddress?: any;
  termsAndConditionsUrl?: string;
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
  const currency = getCurrentCurrency();
  const { toast } = useToast();
  const { addItem, updateQuantity, isLoading: isCartLoading } = useCart();

  // Image gallery state
  const [selectedImage, setSelectedImage] = useState<string>("");

  // Quantity selections for variants
  const [variantQuantities, setVariantQuantities] = useState<Map<string, number>>(new Map());
  const [totalQuantity, setTotalQuantity] = useState(0);

  const { data: product, isLoading } = useQuery<WholesaleProduct>({
    queryKey: ["/api/wholesale/buyer/products", id],
  });

  // Set initial selected image when product loads
  useEffect(() => {
    if (product) {
      setSelectedImage(product.images?.[0] || product.image);
    }
  }, [product]);

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

  const handleAddToCart = async () => {
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

      const selectedVariants = Array.from(variantQuantities.entries()).map(([key, quantity]) => {
        const [size, color] = key.split("-");
        return { size, color, quantity };
      });

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
        depositPercentage: product.depositPercentage,
        requiresDeposit: product.requiresDeposit,
        variants: product.variants,
        sellerId: product.sellerId,
      } as any;

      const result = await addItem(cartItem);
      if (result.success) {
        updateQuantity(cartItem.id, totalQuantity);
        toast({
          title: "Added to Cart",
          description: `Added ${totalQuantity} units to cart`,
        });
      } else {
        toast({
          title: "Cannot add to cart",
          description: result.error,
          variant: "destructive",
        });
      }
    } else {
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
        depositPercentage: product.depositPercentage,
        requiresDeposit: product.requiresDeposit,
        sellerId: product.sellerId,
      } as any;

      const result = await addItem(cartItem);
      if (result.success) {
        updateQuantity(cartItem.id, product.moq);
        toast({
          title: "Added to Cart",
          description: `Added ${product.moq} units to cart (MOQ)`,
        });
      } else {
        toast({
          title: "Cannot add to cart",
          description: result.error,
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-7xl">
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
        <div className="container mx-auto px-4 max-w-7xl">
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

  // Architecture 3: Backend should provide margin, depositAmount, balanceAmount pre-calculated

  // Get all product images
  const productImages = product.images && product.images.length > 0 ? product.images : [product.image];

  // Stock availability display
  const stockDisplay = product.stock === 0 ? "Made-to-Order" : `${product.stock} units in stock`;
  const isUnlimitedStock = product.stock === 0;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
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

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Product Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="img-product-main"
              />
            </div>
            {productImages.length > 1 && (
              <div className="grid grid-cols-6 gap-2">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`aspect-square overflow-hidden rounded-md border-2 transition-all hover-elevate ${
                      selectedImage === img ? 'border-primary' : 'border-transparent'
                    }`}
                    data-testid={`button-image-${idx}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-3" data-testid="text-product-name">
                    {product.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <Badge variant="secondary" className="text-sm">{product.category}</Badge>
                    {product.sku && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span data-testid="text-sku">SKU: {product.sku}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed" data-testid="text-description">
                {product.description}
              </p>
            </div>

            {/* Key Features - B2B Style */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Box className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Min Order</p>
                    <p className="text-lg font-bold" data-testid="text-moq">{product.moq} units</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Your Margin</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{margin.toFixed(0)}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className="text-sm font-semibold" data-testid="text-stock">
                      {isUnlimitedStock ? (
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30">
                          Made-to-Order
                        </Badge>
                      ) : (
                        `${product.stock} units`
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              {(product.readinessType || product.readinessDays) && (
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Readiness</p>
                      <p className="text-sm font-semibold" data-testid="text-readiness">
                        {product.readinessType === 'date' && product.readinessValue
                          ? format(new Date(product.readinessValue), 'MMM d, yyyy')
                          : product.readinessType === 'days' && product.readinessValue
                          ? `${product.readinessValue} days`
                          : product.readinessDays
                          ? `${product.readinessDays} days`
                          : 'Standard'
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Pricing Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Wholesale Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Your Price (Per Unit)</span>
                  <span className="text-3xl font-bold text-primary" data-testid="text-wholesale-price">
                    {formatCurrency(parseFloat(product.wholesalePrice), currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-muted-foreground">RRP / Retail Price</span>
                  <span className="text-lg line-through text-muted-foreground" data-testid="text-rrp">
                    {formatCurrency(parseFloat(product.rrp), currency)}
                  </span>
                </div>
                
                {/* Deposit Information - Architecture 3: Backend should provide deposit amounts */}
                {product.requiresDeposit === 1 && product.depositAmount && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Deposit</span>
                      <span className="font-semibold" data-testid="text-deposit">
                        {formatCurrency(parseFloat(product.depositAmount), currency)} per unit
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Balance Payment</p>
                        {product.balancePaymentTerms && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {product.balancePaymentTerms}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warehouse & Legal */}
            <div className="grid gap-3">
              {product.shipFromAddress && (
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Warehouse className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-1">Ships From</p>
                      <div className="text-sm text-muted-foreground" data-testid="text-warehouse">
                        {typeof product.shipFromAddress === 'object' ? (
                          <>
                            <div>{product.shipFromAddress.street}</div>
                            <div>{product.shipFromAddress.city}, {product.shipFromAddress.country}</div>
                          </>
                        ) : (
                          <div>{product.shipFromAddress}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {product.termsAndConditionsUrl && (
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold">Terms & Conditions</p>
                        <p className="text-xs text-muted-foreground">Product-specific T&C</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      data-testid="button-download-tc"
                    >
                      <a
                        href={product.termsAndConditionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        Download PDF
                      </a>
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Variant Selector */}
        {product.variants && product.variants.length > 0 ? (
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Select Variants & Quantities</h2>
              <p className="text-muted-foreground">
                Choose quantities for each size and color combination. Total must meet MOQ of <strong>{product.moq} units</strong>.
              </p>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Stock = 0 means unlimited availability</strong> (Made-to-Order). We'll produce your order specifically for you.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32 font-semibold">Size</TableHead>
                    {colors.map(color => (
                      <TableHead key={color} className="text-center min-w-[140px]">
                        <div className="space-y-1">
                          <div className="font-semibold">{color}</div>
                          <div className="text-xs text-muted-foreground">Stock / Quantity</div>
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
                        const isAvailable = stock >= 0;
                        const isMTO = stock === 0;
                        
                        return (
                          <TableCell key={color} className="text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Badge 
                                variant={isMTO ? "default" : "outline"} 
                                className={isMTO ? "bg-blue-500 text-white" : ""}
                              >
                                {isMTO ? "MTO" : `${stock} in stock`}
                              </Badge>
                              <Input
                                type="number"
                                min="0"
                                max={stock > 0 ? stock : undefined}
                                value={quantity || ""}
                                placeholder="0"
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
                                className="w-24 text-center"
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

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-muted rounded-lg">
              <div className="space-y-1 text-center md:text-left">
                <div className="text-sm text-muted-foreground">Total Selected Quantity</div>
                <div className="text-4xl font-bold" data-testid="text-total-quantity">
                  {totalQuantity} units
                </div>
                {totalQuantity < product.moq && totalQuantity > 0 && (
                  <div className="text-sm text-destructive font-medium">
                    Need {product.moq - totalQuantity} more to meet MOQ
                  </div>
                )}
              </div>
              <div className="text-center md:text-right space-y-1">
                <div className="text-sm text-muted-foreground">Total Order Cost</div>
                <div className="text-4xl font-bold text-primary" data-testid="text-total-cost">
                  {formatCurrency(totalQuantity * parseFloat(product.wholesalePrice), currency)}
                </div>
                {product.requiresDeposit === 1 && totalQuantity > 0 && product.depositAmount && (
                  <div className="text-sm text-muted-foreground">
                    Deposit: {formatCurrency(totalQuantity * parseFloat(product.depositAmount), currency)}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleAddToCart}
                    disabled={totalQuantity < product.moq || totalQuantity === 0 || isCartLoading}
                    className="w-full"
                    size="lg"
                    data-testid="button-add-to-cart"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {totalQuantity < product.moq 
                      ? `Select ${product.moq - totalQuantity} More Units to Meet MOQ`
                      : totalQuantity === 0
                      ? "Select Quantities Above"
                      : `Add ${totalQuantity} Units to Cart`
                    }
                  </Button>
                </TooltipTrigger>
                {isCartLoading && (
                  <TooltipContent>
                    <p>Loading cart...</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </Card>
        ) : (
          // No variants - simple quantity input
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Order Quantity</h2>
              <p className="text-muted-foreground">
                Minimum order quantity is <strong>{product.moq} units</strong>.
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-muted rounded-lg mb-6">
              <div className="flex-1 text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-2">Order Quantity</div>
                <div className="text-4xl font-bold">{product.moq} units</div>
                <div className="text-sm text-muted-foreground mt-1">(MOQ)</div>
              </div>
              <div className="text-center md:text-right space-y-1">
                <div className="text-sm text-muted-foreground">Total Order Cost</div>
                <div className="text-4xl font-bold text-primary" data-testid="text-simple-total-cost">
                  {formatCurrency(product.moq * parseFloat(product.wholesalePrice), currency)}
                </div>
                {product.requiresDeposit === 1 && product.depositAmount && (
                  <div className="text-sm text-muted-foreground">
                    Deposit: {formatCurrency(product.moq * parseFloat(product.depositAmount), currency)}
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={isCartLoading}
              className="w-full"
              size="lg"
              data-testid="button-add-to-cart-simple"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add {product.moq} Units to Cart
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
