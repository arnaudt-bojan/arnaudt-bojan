import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, X } from "lucide-react";
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
  hasVariants: z.boolean().default(false),
});

type WholesaleProductFormData = z.infer<typeof wholesaleProductSchema>;

interface Variant {
  size: string;
  color: string;
  stock: number;
  image?: string;
}

export default function CreateWholesaleProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Variant management state
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [variantMatrix, setVariantMatrix] = useState<Map<string, Variant>>(new Map());

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
      hasVariants: false,
    },
  });

  const useExisting = form.watch("useExisting");
  const requiresDeposit = form.watch("requiresDeposit");
  const hasVariants = form.watch("hasVariants");

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

  const addSize = () => {
    if (newSize && !sizes.includes(newSize.trim())) {
      const updatedSizes = [...sizes, newSize.trim()];
      setSizes(updatedSizes);
      setNewSize("");
      
      // Initialize variants for new size with existing colors
      const newMatrix = new Map(variantMatrix);
      colors.forEach(color => {
        const key = `${newSize.trim()}-${color}`;
        if (!newMatrix.has(key)) {
          newMatrix.set(key, {
            size: newSize.trim(),
            color,
            stock: 0,
          });
        }
      });
      setVariantMatrix(newMatrix);
    }
  };

  const addColor = () => {
    if (newColor && !colors.includes(newColor.trim())) {
      const updatedColors = [...colors, newColor.trim()];
      setColors(updatedColors);
      setNewColor("");
      
      // Initialize variants for new color with existing sizes
      const newMatrix = new Map(variantMatrix);
      sizes.forEach(size => {
        const key = `${size}-${newColor.trim()}`;
        if (!newMatrix.has(key)) {
          newMatrix.set(key, {
            size,
            color: newColor.trim(),
            stock: 0,
          });
        }
      });
      setVariantMatrix(newMatrix);
    }
  };

  const removeSize = (size: string) => {
    setSizes(sizes.filter(s => s !== size));
    // Remove variants with this size
    const newMatrix = new Map(variantMatrix);
    colors.forEach(color => {
      newMatrix.delete(`${size}-${color}`);
    });
    setVariantMatrix(newMatrix);
  };

  const removeColor = (color: string) => {
    setColors(colors.filter(c => c !== color));
    // Remove variants with this color
    const newMatrix = new Map(variantMatrix);
    sizes.forEach(size => {
      newMatrix.delete(`${size}-${color}`);
    });
    setVariantMatrix(newMatrix);
  };

  const updateVariantStock = (size: string, color: string, stock: number) => {
    const key = `${size}-${color}`;
    const newMatrix = new Map(variantMatrix);
    const variant = newMatrix.get(key) || { size, color, stock: 0 };
    newMatrix.set(key, { ...variant, stock });
    setVariantMatrix(newMatrix);
  };

  const createMutation = useMutation({
    mutationFn: async (data: WholesaleProductFormData) => {
      // Build variants array from matrix
      let variants = null;
      if (data.hasVariants && sizes.length > 0 && colors.length > 0) {
        variants = Array.from(variantMatrix.values());
      }

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
        variants,
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
    if (data.hasVariants) {
      if (sizes.length === 0 || colors.length === 0) {
        toast({
          title: "Variants Required",
          description: "Please add at least one size and one color for variants.",
          variant: "destructive",
        });
        return;
      }
    }
    createMutation.mutate(data);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
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
                    <FormDescription>Minimum total units per order (applies across all variants)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hasVariants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Size & Color Variants</FormLabel>
                      <FormDescription>
                        Allow buyers to choose from different size and color combinations
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-has-variants"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {hasVariants ? (
                <Card className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Variant Configuration</h3>
                    
                    {/* Sizes Section */}
                    <div className="mb-6">
                      <Label className="mb-2 block">Sizes</Label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={newSize}
                          onChange={(e) => setNewSize(e.target.value)}
                          placeholder="e.g., S, M, L, XL"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
                          data-testid="input-new-size"
                        />
                        <Button
                          type="button"
                          onClick={addSize}
                          size="icon"
                          data-testid="button-add-size"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map(size => (
                          <Badge key={size} variant="secondary" className="gap-2">
                            {size}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeSize(size)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Colors Section */}
                    <div className="mb-6">
                      <Label className="mb-2 block">Colors</Label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={newColor}
                          onChange={(e) => setNewColor(e.target.value)}
                          placeholder="e.g., Red, Blue, Black"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                          data-testid="input-new-color"
                        />
                        <Button
                          type="button"
                          onClick={addColor}
                          size="icon"
                          data-testid="button-add-color"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {colors.map(color => (
                          <Badge key={color} variant="secondary" className="gap-2">
                            {color}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeColor(color)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Variant Matrix */}
                    {sizes.length > 0 && colors.length > 0 && (
                      <div>
                        <Label className="mb-2 block">Stock for Each Variant</Label>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Size</TableHead>
                                {colors.map(color => (
                                  <TableHead key={color}>{color}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sizes.map(size => (
                                <TableRow key={size}>
                                  <TableCell className="font-medium">{size}</TableCell>
                                  {colors.map(color => {
                                    const key = `${size}-${color}`;
                                    const variant = variantMatrix.get(key);
                                    return (
                                      <TableCell key={color}>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={variant?.stock || 0}
                                          onChange={(e) => updateVariantStock(size, color, parseInt(e.target.value) || 0)}
                                          className="w-20"
                                          data-testid={`input-stock-${size}-${color}`}
                                        />
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Set stock to 0 for made-to-order variants
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
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
              )}

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
