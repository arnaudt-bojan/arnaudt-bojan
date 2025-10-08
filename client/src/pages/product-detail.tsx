import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductTypeBadge } from "@/components/product-type-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Product } from "@shared/schema";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
}

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const productId = params?.id;
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

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

  const handleAddToCart = () => {
    if (product) {
      addItem(product);
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    }
  };

  const handleBuyNow = () => {
    if (product) {
      addItem(product);
      setLocation("/checkout");
    }
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
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link href="/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <Link href="/products">
          <Button variant="ghost" className="mb-4 gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
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

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <img
                src={product.images && product.images.length > 0 ? product.images[selectedImageIndex] : product.image}
                alt={product.name}
                className="w-full aspect-square object-cover"
                data-testid="img-product-detail"
              />
            </Card>
            
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {product.images.map((img, index) => (
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
              <h1 className="text-4xl font-bold" data-testid="text-product-name">
                {product.name}
              </h1>
              <p className="text-lg text-muted-foreground">{product.category}</p>
            </div>

            {product.productType === "pre-order" && product.depositAmount ? (
              <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Deposit Required</span>
                  </div>
                  <div className="text-3xl font-bold" data-testid="text-product-price">
                    {formatPrice(parseFloat(product.depositAmount))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Price: <span className="font-semibold">{formatPrice(parseFloat(product.price))}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Pay deposit now, balance due when product ships
                  </div>
                </div>
              </Card>
            ) : (
              <div className="text-3xl font-bold" data-testid="text-product-price">
                {formatPrice(parseFloat(product.price))}
              </div>
            )}

            <div className="prose prose-sm dark:prose-invert">
              <p className="text-muted-foreground" data-testid="text-product-description">
                {product.description}
              </p>
            </div>

            {product.productType === "in-stock" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Stock:</span>
                <span className="font-medium" data-testid="text-stock">
                  {product.stock || 0} available
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={handleAddToCart}
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                size="lg"
                className="gap-2"
                onClick={handleBuyNow}
                data-testid="button-buy-now"
              >
                Buy Now
              </Button>
            </div>

            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-3">Product Details</h3>
              <dl className="space-y-2 text-sm">
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
                      <dd className="font-medium">{formatPrice(parseFloat(product.depositAmount))}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Balance Due</dt>
                      <dd className="font-medium">
                        {formatPrice(parseFloat(product.price) - parseFloat(product.depositAmount))}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
