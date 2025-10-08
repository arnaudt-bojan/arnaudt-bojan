import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

const wholesaleProductSchema = z.object({
  useExisting: z.boolean().default(false),
  existingProductId: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().url("Must be a valid URL"),
  category: z.string().min(1, "Category is required"),
  rrp: z.string().min(1, "RRP is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "RRP must be a positive number",
  }),
  wholesalePrice: z.string().min(1, "Wholesale price is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Wholesale price must be a positive number",
  }),
  moq: z.string().min(1, "MOQ is required").refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "MOQ must be a positive integer",
  }),
  requiresDeposit: z.boolean().default(false),
  depositAmount: z.string().optional(),
  stock: z.string().default("0"),
  readinessDays: z.string().optional(),
});

type WholesaleProductFormData = z.infer<typeof wholesaleProductSchema>;

export default function CreateWholesaleProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: existingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<WholesaleProductFormData>({
    resolver: zodResolver(wholesaleProductSchema),
    defaultValues: {
      useExisting: false,
      name: "",
      description: "",
      image: "",
      category: "Apparel",
      rrp: "",
      wholesalePrice: "",
      moq: "10",
      requiresDeposit: false,
      depositAmount: "",
      stock: "0",
      readinessDays: "",
    },
  });

  const useExisting = form.watch("useExisting");
  const requiresDeposit = form.watch("requiresDeposit");
  const selectedProductId = form.watch("existingProductId");

  // Auto-fill form when existing product is selected
  const handleProductSelect = (productId: string) => {
    const product = existingProducts?.find(p => p.id === productId);
    if (product) {
      form.setValue("name", product.name);
      form.setValue("description", product.description);
      form.setValue("image", product.image);
      form.setValue("category", product.category);
      form.setValue("rrp", product.price);
      form.setValue("stock", product.stock?.toString() || "0");
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: WholesaleProductFormData) => {
      const payload = {
        productId: data.useExisting ? data.existingProductId : undefined,
        name: data.name,
        description: data.description,
        image: data.image,
        category: data.category,
        rrp: data.rrp,
        wholesalePrice: data.wholesalePrice,
        moq: parseInt(data.moq),
        requiresDeposit: data.requiresDeposit ? 1 : 0,
        depositAmount: data.requiresDeposit && data.depositAmount ? data.depositAmount : null,
        stock: parseInt(data.stock),
        readinessDays: data.readinessDays ? parseInt(data.readinessDays) : null,
      };

      await apiRequest("POST", "/api/wholesale/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/products"] });
      toast({
        title: "Success",
        description: "Wholesale product created successfully!",
      });
      setLocation("/seller/wholesale/products");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create wholesale product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WholesaleProductFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/seller/wholesale/products")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
                Create Wholesale Product
              </h1>
              <p className="text-muted-foreground">
                Set up B2B pricing with MOQ and special terms
              </p>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="useExisting"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Use Existing Product</FormLabel>
                      <FormDescription>
                        Select from your existing retail products
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-use-existing"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {useExisting && (
                <FormField
                  control={form.control}
                  name="existingProductId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Product</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleProductSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-existing-product">
                            <SelectValue placeholder="Choose a product..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {existingProducts?.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Premium Cotton T-Shirt"
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
                        {...field}
                        placeholder="Detailed product description..."
                        rows={4}
                        data-testid="input-description"
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
                        {...field}
                        placeholder="https://example.com/image.jpg"
                        data-testid="input-image"
                      />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Apparel">Apparel</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                        <SelectItem value="Footwear">Footwear</SelectItem>
                        <SelectItem value="Home & Living">Home & Living</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Beauty">Beauty</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rrp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommended Retail Price (RRP)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="99.99"
                          data-testid="input-rrp"
                        />
                      </FormControl>
                      <FormDescription>Suggested retail price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wholesalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wholesale Price</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="49.99"
                          data-testid="input-wholesale-price"
                        />
                      </FormControl>
                      <FormDescription>Your B2B price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="moq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Quantity (MOQ)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="10"
                          data-testid="input-moq"
                        />
                      </FormControl>
                      <FormDescription>Minimum units per order</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Available</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="0"
                          data-testid="input-stock"
                        />
                      </FormControl>
                      <FormDescription>0 = Made to order</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="readinessDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Readiness Days (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="30"
                        data-testid="input-readiness-days"
                      />
                    </FormControl>
                    <FormDescription>
                      Days required for production/delivery after order
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresDeposit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Requires Deposit</FormLabel>
                      <FormDescription>
                        Request upfront deposit before production
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-requires-deposit"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {requiresDeposit && (
                <FormField
                  control={form.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="25.00"
                          data-testid="input-deposit-amount"
                        />
                      </FormControl>
                      <FormDescription>
                        Fixed deposit amount per unit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/seller/wholesale/products")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? "Creating..." : "Create Wholesale Product"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
