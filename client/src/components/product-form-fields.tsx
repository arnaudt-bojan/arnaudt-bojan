import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { FrontendProduct } from "@shared/schema";
import {
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
import { Button } from "@/components/ui/button";
import { Plus, X, Upload } from "lucide-react";
import { BulkImageInput } from "@/components/bulk-image-input";

export type ProductVariant = {
  size: string;
  color: string;
  stock: number;
  image: string;
};

interface ProductFormFieldsProps {
  form: UseFormReturn<FrontendProduct>;
  variants: ProductVariant[];
  setVariants: (variants: ProductVariant[]) => void;
  madeToOrderDays: number;
  setMadeToOrderDays: (days: number) => void;
  preOrderDate: string;
  setPreOrderDate: (date: string) => void;
  discountPercentage: string;
  setDiscountPercentage: (value: string) => void;
  promotionEndDate: string;
  setPromotionEndDate: (date: string) => void;
  selectedLevel1?: string;
  setSelectedLevel1?: (value: string) => void;
  selectedLevel2?: string;
  setSelectedLevel2?: (value: string) => void;
  selectedLevel3?: string;
  setSelectedLevel3?: (value: string) => void;
  level1Categories?: any[];
  level2Categories?: any[];
  level3Categories?: any[];
}

export function ProductFormFields({
  form,
  variants,
  setVariants,
  madeToOrderDays,
  setMadeToOrderDays,
  preOrderDate,
  setPreOrderDate,
  discountPercentage,
  setDiscountPercentage,
  promotionEndDate,
  setPromotionEndDate,
  selectedLevel1,
  setSelectedLevel1,
  selectedLevel2,
  setSelectedLevel2,
  selectedLevel3,
  setSelectedLevel3,
  level1Categories = [],
  level2Categories = [],
  level3Categories = [],
}: ProductFormFieldsProps) {
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

  return (
    <div className="space-y-8">
      {/* Step 1: Basic Information */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Step 1: Basic Information</h3>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" {...field} data-testid="input-name" />
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
                    {...field}
                    rows={4}
                    data-testid="input-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      data-testid="input-price"
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
                  <FormLabel>Main Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} data-testid="input-image" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormLabel>Additional Images (Optional)</FormLabel>
            <BulkImageInput
              images={form.getValues("additionalImages" as any) || []}
              onChange={(images: string[]) => {
                form.setValue("additionalImages" as any, images);
              }}
            />
          </div>
        </div>
      </Card>

      {/* Step 2: Category & Type */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Step 2: Category & Product Type</h3>
        <div className="space-y-4">
          {/* Category Selection */}
          {setSelectedLevel1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <FormLabel>Level 1 Category</FormLabel>
                <Select value={selectedLevel1} onValueChange={setSelectedLevel1}>
                  <SelectTrigger data-testid="select-level1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {level1Categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLevel1 && setSelectedLevel2 && (
                <div className="space-y-2">
                  <FormLabel>Level 2 Category</FormLabel>
                  <Select value={selectedLevel2} onValueChange={setSelectedLevel2}>
                    <SelectTrigger data-testid="select-level2">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {level2Categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedLevel2 && setSelectedLevel3 && (
                <div className="space-y-2">
                  <FormLabel>Level 3 Category</FormLabel>
                  <Select value={selectedLevel3} onValueChange={setSelectedLevel3}>
                    <SelectTrigger data-testid="select-level3">
                      <SelectValue placeholder="Select sub-subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {level3Categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <FormField
            control={form.control}
            name="productType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-product-type">
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="pre-order">Pre-Order</SelectItem>
                    <SelectItem value="made-to-order">Made to Order</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose how this product will be fulfilled
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Card>

      {/* Step 3: Stock & Pricing Details */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Step 3: Stock & Pricing Details</h3>
        <div className="space-y-4">
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
                      {...field}
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel>Expected Delivery Date</FormLabel>
                  <Input
                    type="date"
                    value={preOrderDate}
                    onChange={(e) => setPreOrderDate(e.target.value)}
                    data-testid="input-preorder-date"
                  />
                  <p className="text-sm text-muted-foreground">
                    When will this product be available?
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-deposit"
                        />
                      </FormControl>
                      <FormDescription>
                        Require a deposit for pre-orders
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}

          {selectedType === "made-to-order" && (
            <div className="space-y-2">
              <FormLabel>Production Time (Days)</FormLabel>
              <Input
                type="number"
                value={madeToOrderDays}
                onChange={(e) => setMadeToOrderDays(parseInt(e.target.value) || 7)}
                placeholder="7"
                data-testid="input-made-to-order-days"
              />
              <p className="text-sm text-muted-foreground">
                How many days after purchase will this item be ready?
              </p>
            </div>
          )}

          {/* Discount & Promotion Section */}
          <div className="border-t pt-4 mt-6">
            <h4 className="font-semibold mb-4">Discount & Promotion (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Discount % (Optional)</FormLabel>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="0"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  data-testid="input-discount"
                />
                <p className="text-sm text-muted-foreground">
                  Discount percentage (0-100%)
                </p>
              </div>

              <div className="space-y-2">
                <FormLabel>Promotion End Date (Optional)</FormLabel>
                <Input
                  type="date"
                  value={promotionEndDate}
                  onChange={(e) => setPromotionEndDate(e.target.value)}
                  disabled={!discountPercentage || parseFloat(discountPercentage) === 0}
                  data-testid="input-promotion-end"
                />
                <p className="text-sm text-muted-foreground">
                  When the promotion ends
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Step 4: Product Variants */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Step 4: Product Variants (Optional)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add size and color options for this product
        </p>

        {variants.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No variants added yet. Add size and color options to offer multiple versions of this product.
            </p>
            <Button type="button" variant="outline" onClick={addVariant} data-testid="button-add-variant">
              <Plus className="h-4 w-4 mr-2" />
              Add First Variant
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Variant {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(index)}
                    data-testid={`button-remove-variant-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Size (e.g., S, M, L)"
                    value={variant.size}
                    onChange={(e) => updateVariant(index, "size", e.target.value)}
                    data-testid={`input-variant-size-${index}`}
                  />
                  <Input
                    placeholder="Color"
                    value={variant.color}
                    onChange={(e) => updateVariant(index, "color", e.target.value)}
                    data-testid={`input-variant-color-${index}`}
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, "stock", parseInt(e.target.value) || 0)}
                    data-testid={`input-variant-stock-${index}`}
                  />
                  <Input
                    placeholder="Image URL"
                    value={variant.image}
                    onChange={(e) => updateVariant(index, "image", e.target.value)}
                    data-testid={`input-variant-image-${index}`}
                  />
                </div>
              </div>
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
      </Card>
    </div>
  );
}
