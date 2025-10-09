import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { frontendProductSchema, type FrontendProduct, type Product } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, X, Package } from "lucide-react";

type ProductVariant = {
  size: string;
  color: string;
  stock: number;
  image: string;
};

export default function EditProduct() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [madeToOrderDays, setMadeToOrderDays] = useState<number>(7);
  const [preOrderDate, setPreOrderDate] = useState<string>("");

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });

  const form = useForm<FrontendProduct>({
    resolver: zodResolver(frontendProductSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      image: "",
      category: "",
      productType: "in-stock",
      stock: 0,
      depositAmount: undefined,
      requiresDeposit: 0,
    },
  });

  const selectedType = form.watch("productType");

  const addVariant = () => {
    setVariants([...variants, { size: "", color: "", stock: 0, image: "" }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  // Update form when product data loads
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        category: product.category,
        productType: product.productType,
        stock: product.stock || 0,
        depositAmount: product.depositAmount || undefined,
        requiresDeposit: product.requiresDeposit || 0,
      });
      
      // Load variants if they exist
      if (product.variants && Array.isArray(product.variants)) {
        setVariants(product.variants as ProductVariant[]);
      }
      
      // Load readiness dates
      if (product.madeToOrderDays) {
        setMadeToOrderDays(product.madeToOrderDays);
      }
      if (product.preOrderDate) {
        const date = new Date(product.preOrderDate);
        setPreOrderDate(date.toISOString().split('T')[0]);
      }
    }
  }, [product, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: FrontendProduct) => {
      // Add variants if any
      if (variants.length > 0) {
        (data as any).variants = variants;
      } else {
        (data as any).variants = null;
      }
      
      // Add readiness dates based on product type
      if (data.productType === "made-to-order") {
        (data as any).madeToOrderDays = madeToOrderDays;
      } else {
        (data as any).madeToOrderDays = null;
      }
      
      if (data.productType === "pre-order" && preOrderDate) {
        (data as any).preOrderDate = new Date(preOrderDate).toISOString();
      } else {
        (data as any).preOrderDate = null;
      }
      
      return await apiRequest("PUT", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", id] });
      toast({
        title: "Product updated",
        description: "Your product has been updated successfully.",
      });
      setLocation("/seller/products");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FrontendProduct) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Skeleton className="h-8 w-48 mb-8" />
          <Card className="p-8">
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product not found</h1>
            <Button onClick={() => setLocation("/seller/products")}>
              Back to Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/seller/products")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Edit Product
          </h1>
          <p className="text-muted-foreground">
            Update your product information
          </p>
        </div>

        <Card className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter product name"
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your product"
                        className="min-h-32"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormDescription>Enter price in USD</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Clothing, Accessories"
                          {...field}
                          data-testid="input-category"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      data-testid="select-product-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in-stock">In Stock</SelectItem>
                        <SelectItem value="pre-order">Pre-Order</SelectItem>
                        <SelectItem value="made-to-order">Made to Order</SelectItem>
                        <SelectItem value="wholesale">Wholesale/Trade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose how you want to sell this product
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType === "in-stock" && (
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-stock"
                        />
                      </FormControl>
                      <FormDescription>
                        Number of items available for immediate shipping
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedType === "pre-order" && (
                <FormField
                  control={form.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-deposit"
                        />
                      </FormControl>
                      <FormDescription>
                        Amount customer pays upfront to secure pre-order. Balance will be charged later.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        {...field}
                        data-testid="input-image"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the URL of your product image
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Readiness Date for Made-to-Order */}
              {selectedType === "made-to-order" && (
                <div>
                  <FormLabel>Production Time</FormLabel>
                  <div className="flex items-center gap-3 mt-2">
                    <Input
                      type="number"
                      min="1"
                      value={madeToOrderDays}
                      onChange={(e) => setMadeToOrderDays(parseInt(e.target.value) || 1)}
                      className="w-24"
                      data-testid="input-made-to-order-days"
                    />
                    <span className="text-sm text-muted-foreground">days after purchase</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Estimated time to create and ship this product after receiving an order
                  </p>
                </div>
              )}

              {/* Readiness Date for Pre-Order */}
              {selectedType === "pre-order" && (
                <div>
                  <FormLabel>Expected Availability Date</FormLabel>
                  <Input
                    type="date"
                    value={preOrderDate}
                    onChange={(e) => setPreOrderDate(e.target.value)}
                    className="mt-2"
                    data-testid="input-pre-order-date"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    When will this product be available to ship to customers?
                  </p>
                </div>
              )}

              {/* Product Variants Section */}
              <div className="border-t pt-6 mt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-1">Product Variants (Optional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Add size and color options for this product
                  </p>
                </div>
                {variants.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No variants added yet. Add size and color options to offer multiple versions of this product.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addVariant}
                      data-testid="button-add-first-variant"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Variant
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variants.map((variant, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-semibold">Variant #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariant(index)}
                            data-testid={`button-remove-variant-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <FormLabel>Size</FormLabel>
                            <Input
                              placeholder="e.g., Small, Medium, Large, XL"
                              value={variant.size}
                              onChange={(e) => updateVariant(index, "size", e.target.value)}
                              data-testid={`input-variant-size-${index}`}
                            />
                          </div>
                          <div>
                            <FormLabel>Color</FormLabel>
                            <Input
                              placeholder="e.g., Red, Blue, Black"
                              value={variant.color}
                              onChange={(e) => updateVariant(index, "color", e.target.value)}
                              data-testid={`input-variant-color-${index}`}
                            />
                          </div>
                          <div>
                            <FormLabel>Stock</FormLabel>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={variant.stock}
                              onChange={(e) => updateVariant(index, "stock", parseInt(e.target.value) || 0)}
                              data-testid={`input-variant-stock-${index}`}
                            />
                          </div>
                          <div>
                            <FormLabel>Image URL</FormLabel>
                            <Input
                              type="url"
                              placeholder="https://example.com/variant.jpg"
                              value={variant.image}
                              onChange={(e) => updateVariant(index, "image", e.target.value)}
                              data-testid={`input-variant-image-${index}`}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addVariant}
                      className="w-full"
                      data-testid="button-add-another-variant"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Variant
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-product"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Product"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/seller/products")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
