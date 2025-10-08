import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, Clock, Hammer, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const productTypes = [
  {
    value: "in-stock",
    label: "In Stock",
    description: "Items available for immediate shipping",
    icon: Package,
    color: "text-green-600 dark:text-green-400",
  },
  {
    value: "pre-order",
    label: "Pre-Order",
    description: "Accept orders before product is available (deposit + balance)",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "made-to-order",
    label: "Made to Order",
    description: "Create products upon receiving orders",
    icon: Hammer,
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    value: "wholesale",
    label: "Wholesale",
    description: "Bulk orders for businesses",
    icon: Building2,
    color: "text-orange-600 dark:text-orange-400",
  },
];

export default function CreateProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      // For pre-orders with deposit, set requiresDeposit flag
      if (data.productType === "pre-order" && data.depositAmount && parseFloat(data.depositAmount as string) > 0) {
        data.requiresDeposit = 1;
      } else {
        data.requiresDeposit = 0;
        data.depositAmount = undefined;
      }
      return await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product created",
        description: "Your product has been created successfully.",
      });
      setLocation("/seller/products");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProduct) => {
    createMutation.mutate(data);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/seller-dashboard")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Create Product
          </h1>
          <p className="text-muted-foreground">
            Choose your product type and add details
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Product Type Selection - Prominent at Top */}
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Choose Product Type</CardTitle>
                <CardDescription>
                  Select how you want to sell this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="productType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {productTypes.map((type) => {
                            const Icon = type.icon;
                            const isSelected = field.value === type.value;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => field.onChange(type.value)}
                                className={cn(
                                  "relative flex flex-col items-start p-6 rounded-lg border-2 transition-all hover-elevate active-elevate-2",
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border"
                                )}
                                data-testid={`button-type-${type.value}`}
                              >
                                {isSelected && (
                                  <div className="absolute top-4 right-4">
                                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                                      <Check className="h-4 w-4" />
                                    </div>
                                  </div>
                                )}
                                <Icon className={cn("h-8 w-8 mb-3", type.color)} />
                                <h3 className="font-semibold text-lg mb-1">{type.label}</h3>
                                <p className="text-sm text-muted-foreground text-left">
                                  {type.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Product Details</CardTitle>
                <CardDescription>
                  Add information about your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Pricing & Inventory</CardTitle>
                <CardDescription>
                  Set your pricing and manage stock
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Price</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormDescription>
                        {selectedType === "pre-order"
                          ? "Total price (customer will pay deposit first, then balance)"
                          : "Enter price in USD"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType === "pre-order" && (
                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Amount (Required)</FormLabel>
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
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit-product"
              >
                {createMutation.isPending ? "Creating..." : "Create Product"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/seller-dashboard")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
