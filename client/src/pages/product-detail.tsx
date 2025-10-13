import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductTypeBadge } from "@/components/product-type-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, ChevronRight, Package, Truck, RotateCcw, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VariantColorSelector } from "@/components/variant-color-selector";
import { VariantSizeSelector } from "@/components/variant-size-selector";
import type { ColorVariant } from "@/components/product-variant-manager";
import { StoreUnavailable } from "@/components/store-unavailable";
import { useAuth } from "@/hooks/use-auth";
import { detectDomain } from "@/lib/domain-utils";
import { Footer } from "@/components/footer";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyDisclaimer } from "@/components/currency-disclaimer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSellerContext, getSellerAwarePath, extractSellerFromCurrentPath } from "@/contexts/seller-context";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
}

export default function ProductDetail() {
  // CRITICAL FIX: Try both route patterns to extract product ID
  // Pattern 1: Nested route /s/:username/products/:id
  const [matchNested, paramsNested] = useRoute("/s/:username/products/:id");
  // Pattern 2: Fallback route /products/:id
  const [matchFallback, paramsFallback] = useRoute("/products/:id");
  // Extract product ID from whichever route matched
  const productId = paramsNested?.id || paramsFallback?.id;
  const [, setLocation] = useLocation();
  const { addItem, isLoading: isCartLoading } = useCart();
  const { toast } = useToast();
  const { user, isSeller, isCollaborator } = useAuth();
  const { formatPrice } = useCurrency();
  const { sellerUsername } = useSellerContext();
  
  // CRITICAL FIX: Use fallback to extract seller from current path if context is null
  const effectiveSellerUsername = sellerUsername || extractSellerFromCurrentPath();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sellerInfo, setSellerInfo] = useState<any>(null);

  const domainInfo = detectDomain();
  // Sellers and collaborators cannot buy from stores (prevent cart access)
  const canAddToCart = !isSeller && !isCollaborator;

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Construct variant ID for stock checking (size-color format)
  const variantId = selectedColor && selectedSize 
    ? `${selectedSize}-${selectedColor}`.toLowerCase()
    : null;

  // Build stock availability query URL
  const stockQueryUrl = productId 
    ? `/api/products/${productId}/stock-availability${variantId ? `?variantId=${encodeURIComponent(variantId)}` : ''}`
    : null;

  // Fetch stock availability for product or selected variant
  const { data: stockData, isLoading: isLoadingStock } = useQuery<{
    productId: string;
    variantId?: string;
    totalStock: number;
    reservedStock: number;
    availableStock: number;
    isAvailable: boolean;
    isVariant: boolean;
  }>({
    queryKey: [stockQueryUrl],
    enabled: !!stockQueryUrl,
  });

  // Fetch seller info when product loads
  useEffect(() => {
    if (product?.sellerId) {
      fetch(`/api/users/${product.sellerId}`)
        .then(res => res.json())
        .then(data => setSellerInfo(data))
        .catch(console.error);
    }
  }, [product?.sellerId]);

  const getCategoryPath = () => {
    const path: Category[] = [];
    if (!product) return path;

    const level1 = categories.find(c => c.id === (product as any).categoryLevel1Id);
    if (level1) path.push(level1);

    const level2 = categories.find(c => c.id === (product as any).categoryLevel2Id);
    if (level2) path.push(level2);

    const level3 = categories.find(c => c.id === (product as any).categoryLevel3Id);
    if (level3) path.push(level3);

    return path;
  };

  const categoryPath = getCategoryPath();

  // Detect variant format - new format has colorName and images array
  const isNewVariantFormat = product?.variants && 
    Array.isArray(product.variants) && 
    product.variants.length > 0 &&
    'colorName' in product.variants[0] && 
    Array.isArray((product.variants[0] as any).images);

  // Extract variant data (only for new format)
  const colorVariants = isNewVariantFormat ? (product?.variants as ColorVariant[]) : [];
  const hasNewVariants = colorVariants.length > 0;
  
  // Get color options for selector
  const colorOptions = hasNewVariants ? colorVariants.map(cv => ({
    name: cv.colorName,
    hex: cv.colorHex
  })) : [];
  
  // Get current color variant
  const currentColorVariant = selectedColor 
    ? colorVariants.find(cv => cv.colorName === selectedColor)
    : null;
  
  // Get size options for selected color
  const sizeOptions = currentColorVariant 
    ? currentColorVariant.sizes.map(s => s.size)
    : [];
  
  // Get images to display (selected color's images or product images)
  const displayImages = currentColorVariant && currentColorVariant.images && currentColorVariant.images.length > 0
    ? currentColorVariant.images
    : (product?.images && product.images.length > 0 ? product.images : [product?.image || ""]);

  // Auto-select first color when product loads (only for new format)
  useEffect(() => {
    if (hasNewVariants && !selectedColor && colorVariants.length > 0) {
      setSelectedColor(colorVariants[0].colorName);
    }
  }, [hasNewVariants, colorVariants, selectedColor]);

  // Reset image index when color changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColor]);

  // CRITICAL UX FIX: Reset size when color changes to prevent invalid variant combinations
  // When user selects Blue/S then switches to Red, clear size to avoid "S-Red" error
  useEffect(() => {
    setSelectedSize(null);
  }, [selectedColor]);

  // Determine if product/variant is available
  const isProductAvailable = () => {
    // For products with variants, require variant selection and check variant stock
    if (hasNewVariants) {
      if (!selectedColor || !selectedSize) {
        return false; // Variant selection required
      }
      return stockData?.isAvailable ?? false;
    }
    
    // For simple products, check product-level stock
    if (product?.productType === "in-stock") {
      return stockData?.isAvailable ?? false;
    }
    
    // Pre-order, made-to-order, wholesale are always available
    return true;
  };

  const getUnavailableReason = () => {
    if (hasNewVariants && (!selectedColor || !selectedSize)) {
      return "Please select a color and size";
    }
    if (!stockData?.isAvailable) {
      if (hasNewVariants && variantId) {
        return `This variant (${selectedSize} - ${selectedColor}) is sold out. Please choose another option.`;
      }
      return "This product is currently sold out";
    }
    return null;
  };

  const handleAddToCart = async () => {
    if (!product) return;

    const unavailableReason = getUnavailableReason();
    if (unavailableReason) {
      toast({
        title: "Cannot add to cart",
        description: unavailableReason,
        variant: "destructive",
      });
      return;
    }

    // CRITICAL FIX: Include variant information when adding to cart
    // This enables proper stock validation at checkout
    const variant = hasNewVariants && selectedColor && selectedSize
      ? { size: selectedSize, color: selectedColor }
      : undefined;

    const result = await addItem(product, variant);
    if (result.success) {
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    } else {
      toast({
        title: "Cannot add to cart",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;

    const unavailableReason = getUnavailableReason();
    if (unavailableReason) {
      toast({
        title: "Cannot proceed",
        description: unavailableReason,
        variant: "destructive",
      });
      return;
    }

    // CRITICAL FIX: Include variant information when buying now
    // This enables proper stock validation at checkout
    const variant = hasNewVariants && selectedColor && selectedSize
      ? { size: selectedSize, color: selectedColor }
      : undefined;

    const result = await addItem(product, variant);
    
    // HALT if validation fails - don't navigate to checkout
    if (!result.success) {
      toast({
        title: "Cannot proceed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    
    // Only navigate if successful
    const checkoutPath = getSellerAwarePath("/checkout", effectiveSellerUsername);
    setLocation(checkoutPath);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    const storefrontPath = getSellerAwarePath("/", effectiveSellerUsername);
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link href={storefrontPath}>
            <Button>Back to Storefront</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if viewing a seller's product from an inactive store
  const isViewingInactiveStore = sellerInfo && sellerInfo.storeActive === 0;
  
  // Show store unavailable page for buyers viewing inactive seller stores
  if (isViewingInactiveStore && !isSeller) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <StoreUnavailable 
            sellerName={sellerInfo.firstName || sellerInfo.username}
            sellerEmail={sellerInfo.email}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <Link href={getSellerAwarePath("/", effectiveSellerUsername)}>
          <Button variant="ghost" className="mb-4 gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Storefront
          </Button>
        </Link>

        {categoryPath.length > 0 && (
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" data-testid="breadcrumb-navigation">
            <Link href="/">
              <span className="hover:text-foreground transition-colors">Home</span>
            </Link>
            {categoryPath.map((category, index) => (
              <div key={category.id} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                <span className="hover:text-foreground transition-colors" data-testid={`breadcrumb-${category.slug}`}>
                  {category.name}
                </span>
              </div>
            ))}
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium" data-testid="breadcrumb-product-name">{product.name}</span>
          </nav>
        )}

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <img
                src={displayImages[selectedImageIndex] || product.image}
                alt={product.name}
                className="w-full aspect-square object-cover hover:scale-105 transition-transform duration-500"
                data-testid="img-product-detail"
              />
            </Card>
            
            {displayImages.length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
                {displayImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate",
                      selectedImageIndex === index
                        ? "border-primary"
                        : "border-transparent"
                    )}
                    data-testid={`button-thumbnail-${index}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <ProductTypeBadge type={product.productType as any} />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-product-name">
                {product.name}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">{product.category}</p>
            </div>

            {product.productType === "pre-order" && product.depositAmount ? (
              <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Deposit Required</span>
                  </div>
                  <div className="text-3xl font-bold" data-testid="text-product-price">
                    {formatPrice(parseFloat(product.depositAmount), (product as any).currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Price: <span className="font-semibold">{formatPrice(parseFloat(product.price), (product as any).currency)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Pay deposit now, balance due when product ships
                  </div>
                </div>
              </Card>
            ) : product.promotionActive && product.discountPercentage && parseFloat(product.discountPercentage) > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400" data-testid="text-product-price">
                    {formatPrice(parseFloat(product.price) * (1 - parseFloat(product.discountPercentage) / 100), (product as any).currency)}
                  </div>
                  <span className="text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                    -{product.discountPercentage}% OFF
                  </span>
                </div>
                <div className="text-xl text-muted-foreground line-through">
                  {formatPrice(parseFloat(product.price), (product as any).currency)}
                </div>
              </div>
            ) : (
              <div className="text-3xl font-bold" data-testid="text-product-price">
                {formatPrice(parseFloat(product.price), (product as any).currency)}
              </div>
            )}

            {/* Currency Disclaimer - show when seller currency differs from buyer currency */}
            {sellerInfo?.listingCurrency && (
              <CurrencyDisclaimer 
                sellerCurrency={sellerInfo.listingCurrency} 
                variant="compact"
              />
            )}

            {/* Stock Availability Indicator */}
            {product.productType === "in-stock" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isLoadingStock ? (
                    <Skeleton className="h-6 w-32" />
                  ) : stockData?.isAvailable ? (
                    <>
                      {stockData.availableStock <= 5 && stockData.availableStock > 0 && (
                        <Badge variant="secondary" className="gap-1" data-testid="badge-low-stock">
                          <AlertCircle className="h-3 w-3" />
                          Only {stockData.availableStock} left!
                        </Badge>
                      )}
                      {stockData.availableStock > 5 && (
                        <Badge variant="outline" data-testid="badge-in-stock">
                          {stockData.availableStock} in stock
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="destructive" data-testid="badge-sold-out">
                      Sold Out
                    </Badge>
                  )}
                </div>
                
                {/* Show variant-specific out-of-stock alert */}
                {hasNewVariants && variantId && !stockData?.isAvailable && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This variant ({selectedSize} - {selectedColor}) is sold out. Please select another option.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Variant Selectors - Only for new variant format */}
            {hasNewVariants && (
              <div className="space-y-4 py-4 border-y">
                {colorOptions.length > 0 && (
                  <VariantColorSelector
                    colors={colorOptions}
                    selectedColor={selectedColor}
                    onSelectColor={setSelectedColor}
                  />
                )}
                {sizeOptions.length > 0 && (
                  <VariantSizeSelector
                    sizes={sizeOptions}
                    selectedSize={selectedSize}
                    onSelectSize={setSelectedSize}
                  />
                )}
              </div>
            )}

            {/* Only show Add to Cart / Buy Now for buyers (not sellers/collaborators) */}
            {canAddToCart && (
              <div className="grid grid-cols-2 gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2"
                      onClick={handleAddToCart}
                      disabled={!isProductAvailable() || isLoadingStock || isCartLoading}
                      data-testid="button-add-to-cart"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {!isProductAvailable() && product?.productType === "in-stock" ? "Sold Out" : "Add to Cart"}
                    </Button>
                  </TooltipTrigger>
                  {isCartLoading && (
                    <TooltipContent>
                      <p>Loading cart...</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      className="gap-2"
                      onClick={handleBuyNow}
                      disabled={!isProductAvailable() || isLoadingStock || isCartLoading}
                      data-testid="button-buy-now"
                    >
                      {!isProductAvailable() && product?.productType === "in-stock" ? "Unavailable" : "Buy Now"}
                    </Button>
                  </TooltipTrigger>
                  {isCartLoading && (
                    <TooltipContent>
                      <p>Loading cart...</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            )}

            <Accordion type="multiple" defaultValue={["description", "details"]} className="w-full">
              <AccordionItem value="description" data-testid="accordion-description">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Description
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm dark:prose-invert pt-2">
                    <p className="text-muted-foreground" data-testid="text-product-description">
                      {product.description}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details" data-testid="accordion-details">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Details
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="space-y-3 text-sm pt-2">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="font-medium">{product.category}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Product Type</dt>
                      <dd className="font-medium capitalize">{product.productType.replace("-", " ")}</dd>
                    </div>
                    {product.productType === "in-stock" && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Availability</dt>
                        <dd className="font-medium">
                          {(product.stock || 0) > 0 ? "In Stock" : "Out of Stock"}
                        </dd>
                      </div>
                    )}
                    {product.productType === "pre-order" && product.depositAmount && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Deposit Amount</dt>
                          <dd className="font-medium">{formatPrice(parseFloat(product.depositAmount), (product as any).currency)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Balance Due</dt>
                          <dd className="font-medium">
                            {formatPrice(parseFloat(product.price) - parseFloat(product.depositAmount), (product as any).currency)}
                          </dd>
                        </div>
                        {(product as any).preOrderDate && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Expected Delivery</dt>
                            <dd className="font-medium">
                              {new Date((product as any).preOrderDate).toLocaleDateString()}
                            </dd>
                          </div>
                        )}
                      </>
                    )}
                    {(product as any).variants && (product as any).variants.length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Available Variants</dt>
                        <dd className="font-medium">{(product as any).variants.length} options</dd>
                      </div>
                    )}
                  </dl>
                </AccordionContent>
              </AccordionItem>

              {(sellerInfo?.shippingPolicy || product.productType === "pre-order" || product.productType === "made-to-order") && (
                <AccordionItem value="shipping" data-testid="accordion-shipping">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping & Delivery
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm pt-2">
                      {sellerInfo?.shippingPolicy && (
                        <p className="text-muted-foreground whitespace-pre-wrap">{sellerInfo.shippingPolicy}</p>
                      )}
                      {product.productType === "pre-order" && (product as any).preOrderDate && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                          <p className="text-sm font-medium">
                            Expected Delivery: {new Date((product as any).preOrderDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Pre-order items will ship when they become available
                          </p>
                        </div>
                      )}
                      {product.productType === "made-to-order" && (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                          <p className="text-sm font-medium">
                            Production Time: 2-4 weeks
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Made-to-order items are crafted specifically for you
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              {(sellerInfo?.returnsPolicy || product.productType === "made-to-order") && (
                <AccordionItem value="returns" data-testid="accordion-returns">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5" />
                      Returns & Exchanges
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm pt-2">
                      {sellerInfo?.returnsPolicy && (
                        <p className="text-muted-foreground whitespace-pre-wrap">{sellerInfo.returnsPolicy}</p>
                      )}
                      {product.productType === "made-to-order" && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3">
                          <p className="text-sm font-medium">
                            Made-to-order items are final sale
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Custom items cannot be returned or exchanged
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </div>
      </div>

      {/* Footer with seller social links */}
      <Footer sellerInfo={sellerInfo} />
    </div>
  );
}
