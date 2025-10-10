import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, X, Upload, Package, Clock, Hammer, Building2, Check, Star, Image as ImageIcon, MoveUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

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

const productTypes = [
  {
    value: "in-stock",
    label: "In Stock",
    description: "Items available for immediate shipping",
    icon: Package,
    gradient: "from-green-500/10 to-emerald-500/10",
    iconColor: "text-green-600 dark:text-green-400",
    borderColor: "border-green-500/20",
    activeBg: "bg-green-500/10",
    ringColor: "ring-green-500/40",
  },
  {
    value: "pre-order",
    label: "Pre-Order",
    description: "Accept orders before product is available",
    icon: Clock,
    gradient: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/20",
    activeBg: "bg-blue-500/10",
    ringColor: "ring-blue-500/40",
  },
  {
    value: "made-to-order",
    label: "Made to Order",
    description: "Create products upon receiving orders",
    icon: Hammer,
    gradient: "from-purple-500/10 to-pink-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/20",
    activeBg: "bg-purple-500/10",
    ringColor: "ring-purple-500/40",
  },
  {
    value: "wholesale",
    label: "Wholesale",
    description: "Bulk orders for businesses",
    icon: Building2,
    gradient: "from-orange-500/10 to-amber-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-500/20",
    activeBg: "bg-orange-500/10",
    ringColor: "ring-orange-500/40",
  },
];

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
  const [images, setImages] = useState<string[]>([]);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  // Sync images state with form values on mount and when form resets (important for edit mode)
  useEffect(() => {
    const formImages = form.getValues("additionalImages" as any) || [];
    setImages(formImages);
    if (formImages.length > 0 && heroImageIndex >= formImages.length) {
      setHeroImageIndex(0);
    }
  }, []);

  // Watch for external form updates (like from form.reset in edit mode)
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "additionalImages") {
        const newImages = value.additionalImages || [];
        setImages(newImages);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

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

  const handleAddImage = (url: string) => {
    if (url.trim() && !images.includes(url)) {
      const newImages = [...images, url];
      setImages(newImages);
      form.setValue("additionalImages" as any, newImages);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    form.setValue("additionalImages" as any, newImages);
    if (heroImageIndex === index) {
      setHeroImageIndex(0);
    } else if (heroImageIndex > index) {
      setHeroImageIndex(heroImageIndex - 1);
    }
  };

  const handleSetHero = (index: number) => {
    setHeroImageIndex(index);
    // Reorder images to put hero first
    const newImages = [images[index], ...images.filter((_, i) => i !== index)];
    setImages(newImages);
    form.setValue("additionalImages" as any, newImages);
    form.setValue("image", newImages[0]);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setImages(newImages);
    form.setValue("additionalImages" as any, newImages);
  };

  return (
    <div className="space-y-8">
      {/* Product Type Selection - Beautiful Cards at Top */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Choose Product Type</h2>
          <p className="text-muted-foreground">Select how this product will be fulfilled</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {productTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.value;
            
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => form.setValue("productType", type.value as any)}
                className={cn(
                  "relative group p-6 rounded-xl border-2 transition-all text-left hover-elevate active-elevate-2",
                  isSelected 
                    ? `${type.activeBg} ${type.borderColor} ring-2 ${type.ringColor}` 
                    : "border-border bg-card",
                )}
                data-testid={`button-product-type-${type.value}`}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className={cn(
                  "rounded-lg p-3 w-fit mb-4 transition-colors bg-gradient-to-br",
                  type.gradient
                )}>
                  <Icon className={cn("h-6 w-6", type.iconColor)} />
                </div>
                
                <h3 className="font-semibold text-lg mb-1">{type.label}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Basic Information */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <Package className="h-5 w-5 text-primary" />
            </div>
            Basic Information
          </h3>
          <p className="text-sm text-muted-foreground">Essential product details</p>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" {...field} data-testid="input-name" className="text-base" />
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
                    placeholder="Describe your product in detail"
                    {...field}
                    rows={5}
                    data-testid="input-description"
                    className="text-base resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-price"
                        className="pl-8 text-base"
                      />
                    </div>
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
                  <FormLabel>Main Image URL (Fallback)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} data-testid="input-image" className="text-base" />
                  </FormControl>
                  <FormDescription className="text-xs">Or upload images below</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Card>

      {/* Advanced Image Uploader with Carousel Preview */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            Product Images
          </h3>
          <p className="text-sm text-muted-foreground">Add up to 10 images. First image is the hero image shown on cards.</p>
        </div>

        {/* Image Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Paste image URL and press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddImage(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              disabled={images.length >= 10}
              className="text-base"
            />
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                if (input.value) {
                  handleAddImage(input.value);
                  input.value = '';
                }
              }}
              disabled={images.length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {images.length < 10 && (
            <p className="text-xs text-muted-foreground">
              {10 - images.length} {images.length === 9 ? 'image' : 'images'} remaining
            </p>
          )}
        </div>

        {/* Carousel Preview Cards */}
        {images.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Image Gallery Preview</p>
              <Badge variant="outline">{images.length} {images.length === 1 ? 'image' : 'images'}</Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {images.map((img, index) => (
                <div
                  key={index}
                  className={cn(
                    "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate",
                    index === 0 ? "ring-2 ring-primary/40 border-primary/40" : "border-border"
                  )}
                >
                  {/* Hero Badge */}
                  {index === 0 && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-primary text-primary-foreground text-xs gap-1 shadow-lg">
                        <Star className="h-3 w-3 fill-current" />
                        Hero
                      </Badge>
                    </div>
                  )}
                  
                  {/* Image */}
                  <img
                    src={img}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    {index !== 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetHero(index)}
                        className="w-full text-xs h-7"
                        data-testid={`button-set-hero-${index}`}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Set Hero
                      </Button>
                    )}
                    
                    <div className="flex gap-1 w-full">
                      {index > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => moveImage(index, index - 1)}
                          className="flex-1 h-7 px-2"
                        >
                          <MoveUp className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveImage(index)}
                        className="flex-1 h-7 px-2"
                        data-testid={`button-remove-image-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Image Number */}
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-muted/50 border border-dashed rounded-lg p-4">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Preview:</strong> This is how images will appear in the product carousel. Drag to reorder or set any image as hero.
              </p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No images added yet
            </p>
            <p className="text-xs text-muted-foreground">
              Add image URLs to see carousel preview
            </p>
          </div>
        )}
      </Card>

      {/* Category & Type Specific Settings */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Category & Settings</h3>
          <p className="text-sm text-muted-foreground">Organize and configure product details</p>
        </div>

        <div className="space-y-4">
          {/* Category Selection */}
          {setSelectedLevel1 && (
            <div className="space-y-3">
              <FormLabel>Product Category</FormLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={selectedLevel1} onValueChange={setSelectedLevel1}>
                  <SelectTrigger data-testid="select-level1" className="text-base">
                    <SelectValue placeholder="Main Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {level1Categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedLevel1 && setSelectedLevel2 && level2Categories.length > 0 && (
                  <Select value={selectedLevel2} onValueChange={setSelectedLevel2}>
                    <SelectTrigger data-testid="select-level2" className="text-base">
                      <SelectValue placeholder="Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {level2Categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedLevel2 && setSelectedLevel3 && level3Categories.length > 0 && (
                  <Select value={selectedLevel3} onValueChange={setSelectedLevel3}>
                    <SelectTrigger data-testid="select-level3" className="text-base">
                      <SelectValue placeholder="Sub-category" />
                    </SelectTrigger>
                    <SelectContent>
                      {level3Categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* Type-Specific Fields */}
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
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : parseInt(value) || 0);
                      }}
                      placeholder="Enter stock quantity"
                      data-testid="input-stock"
                      className="text-base"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Expected Delivery Date</FormLabel>
                <Input
                  type="date"
                  value={preOrderDate}
                  onChange={(e) => setPreOrderDate(e.target.value)}
                  data-testid="input-preorder-date"
                  className="text-base"
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
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-deposit"
                          className="pl-8 text-base"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Require a deposit for pre-orders
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                How many days after purchase will this item be ready?
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Discount & Promotion */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Pricing & Promotions</h3>
          <p className="text-sm text-muted-foreground">Optional discount and promotional settings</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel>Discount % (Optional)</FormLabel>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="0"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                data-testid="input-discount"
                className="pr-8 text-base"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
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
              className="text-base"
            />
            <p className="text-sm text-muted-foreground">
              When the promotion ends
            </p>
          </div>
        </div>
      </Card>

      {/* Product Variants */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Product Variants (Optional)</h3>
          <p className="text-sm text-muted-foreground">
            Add size and color options for this product
          </p>
        </div>

        {variants.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <div className="bg-muted/30 rounded-full p-4 w-fit mx-auto mb-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
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
              <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    Variant {index + 1}
                  </h4>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Size (e.g., S, M, L)"
                    value={variant.size}
                    onChange={(e) => updateVariant(index, "size", e.target.value)}
                    data-testid={`input-variant-size-${index}`}
                    className="text-base"
                  />
                  <Input
                    placeholder="Color"
                    value={variant.color}
                    onChange={(e) => updateVariant(index, "color", e.target.value)}
                    data-testid={`input-variant-color-${index}`}
                    className="text-base"
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, "stock", parseInt(e.target.value) || 0)}
                    data-testid={`input-variant-stock-${index}`}
                    className="text-base"
                  />
                  <Input
                    placeholder="Image URL"
                    value={variant.image}
                    onChange={(e) => updateVariant(index, "image", e.target.value)}
                    data-testid={`input-variant-image-${index}`}
                    className="text-base"
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
