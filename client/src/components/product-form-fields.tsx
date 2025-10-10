import { useState, useEffect, useRef } from "react";
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
import { Plus, X, Upload, Package, Clock, Hammer, Building2, Check, Star, Image as ImageIcon, MoveUp, GripVertical, Truck, Eye, EyeOff, Archive, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UniversalImageUpload } from "@/components/universal-image-upload";
import { ProductVariantManager, type ColorVariant } from "@/components/product-variant-manager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/lib/currency-utils";

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
  currency?: string;
}

// Standard package size presets with dimensions
const packagePresets = [
  // Small packages
  { value: "envelope", label: "Envelope / Letter", weight_lbs: 0.1, weight_kg: 0.05, length_in: 12, width_in: 9, height_in: 0.25, length_cm: 30, width_cm: 23, height_cm: 0.6 },
  { value: "small_parcel", label: "Small Parcel", weight_lbs: 1, weight_kg: 0.5, length_in: 8, width_in: 6, height_in: 4, length_cm: 20, width_cm: 15, height_cm: 10 },
  { value: "medium_parcel", label: "Medium Parcel", weight_lbs: 5, weight_kg: 2.3, length_in: 12, width_in: 10, height_in: 8, length_cm: 30, width_cm: 25, height_cm: 20 },
  { value: "large_parcel", label: "Large Parcel", weight_lbs: 10, weight_kg: 4.5, length_in: 18, width_in: 14, height_in: 12, length_cm: 46, width_cm: 36, height_cm: 30 },
  { value: "extra_large", label: "Extra Large Box", weight_lbs: 20, weight_kg: 9, length_in: 24, width_in: 18, height_in: 18, length_cm: 61, width_cm: 46, height_cm: 46 },
  // Standard boxes
  { value: "shoe_box", label: "Shoe Box Size", weight_lbs: 2, weight_kg: 0.9, length_in: 14, width_in: 9, height_in: 5, length_cm: 36, width_cm: 23, height_cm: 13 },
  { value: "wine_box", label: "Wine Box (6 bottles)", weight_lbs: 15, weight_kg: 6.8, length_in: 17, width_in: 13, height_in: 8, length_cm: 43, width_cm: 33, height_cm: 20 },
];

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
    label: "Trade",
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
  currency,
}: ProductFormFieldsProps) {
  const { toast } = useToast();
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryLevel, setCategoryLevel] = useState<1 | 2 | 3>(1);
  const [selectedPreset, setSelectedPreset] = useState<string>("none");
  const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">("imperial");
  const previousUnitSystem = useRef<"imperial" | "metric">("imperial");

  // Fetch shipping matrices for dropdown
  const { data: shippingMatrices = [] } = useQuery<any[]>({
    queryKey: ["/api/shipping-matrices"],
  });
  const selectedType = form.watch("productType");
  
  // Handle package preset selection
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value === "none") return;
    
    const preset = packagePresets.find(p => p.value === value);
    if (!preset) return;
    
    // Auto-populate form fields based on unit system
    if (unitSystem === "imperial") {
      form.setValue("shippoWeight", preset.weight_lbs.toString());
      form.setValue("shippoLength", preset.length_in.toString());
      form.setValue("shippoWidth", preset.width_in.toString());
      form.setValue("shippoHeight", preset.height_in.toString());
    } else {
      form.setValue("shippoWeight", preset.weight_kg.toString());
      form.setValue("shippoLength", preset.length_cm.toString());
      form.setValue("shippoWidth", preset.width_cm.toString());
      form.setValue("shippoHeight", preset.height_cm.toString());
    }
  };
  
  // Convert units when toggling between imperial and metric
  useEffect(() => {
    // Only convert if unit system actually changed
    if (previousUnitSystem.current === unitSystem) return;
    
    const weight = parseFloat(form.getValues("shippoWeight") || "0");
    const length = parseFloat(form.getValues("shippoLength") || "0");
    const width = parseFloat(form.getValues("shippoWidth") || "0");
    const height = parseFloat(form.getValues("shippoHeight") || "0");
    
    // Skip if no values to convert
    if (!weight && !length && !width && !height) {
      previousUnitSystem.current = unitSystem;
      return;
    }
    
    if (unitSystem === "imperial" && previousUnitSystem.current === "metric") {
      // Convert from metric to imperial
      form.setValue("shippoWeight", (weight / 0.453592).toFixed(2)); // kg to lbs
      form.setValue("shippoLength", (length / 2.54).toFixed(2)); // cm to in
      form.setValue("shippoWidth", (width / 2.54).toFixed(2)); // cm to in
      form.setValue("shippoHeight", (height / 2.54).toFixed(2)); // cm to in
    } else if (unitSystem === "metric" && previousUnitSystem.current === "imperial") {
      // Convert from imperial to metric
      form.setValue("shippoWeight", (weight * 0.453592).toFixed(2)); // lbs to kg
      form.setValue("shippoLength", (length * 2.54).toFixed(1)); // in to cm
      form.setValue("shippoWidth", (width * 2.54).toFixed(1)); // in to cm
      form.setValue("shippoHeight", (height * 2.54).toFixed(1)); // in to cm
    }
    
    // Reset preset selection when manually converting
    if (selectedPreset !== "none") {
      setSelectedPreset("none");
    }
    
    // Update previous unit system
    previousUnitSystem.current = unitSystem;
  }, [unitSystem]);
  
  // Top-level deposit validation - runs for all product types
  const priceValue = form.watch("price");
  const depositValue = form.watch("depositAmount");
  
  useEffect(() => {
    const price = parseFloat(priceValue as string || "0") || 0; // Handle NaN
    const deposit = parseFloat(depositValue as string || "0") || 0; // Handle NaN
    
    // Only validate deposit for pre-order products
    if (selectedType === "pre-order") {
      if (deposit > 0 && deposit > price) {
        form.setError("depositAmount", {
          type: "manual",
          message: price > 0 
            ? `Deposit cannot exceed price ($${price.toFixed(2)})`
            : "Please set product price before deposit amount"
        });
      } else {
        // Only clear if this specific error exists
        const currentError = form.formState.errors.depositAmount;
        if (currentError?.type === "manual") {
          form.clearErrors("depositAmount");
        }
      }
    } else {
      // Clear deposit errors when not in pre-order mode
      const currentError = form.formState.errors.depositAmount;
      if (currentError?.type === "manual") {
        form.clearErrors("depositAmount");
      }
    }
  }, [priceValue, depositValue, selectedType, form]);

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; level: number; parentId: string | null }) => {
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return await apiRequest("POST", "/api/categories", { ...data, slug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setNewCategoryName("");
      setShowCategoryDialog(false);
      toast({ title: "Category created", description: "The category has been added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    },
  });

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    
    let parentId: string | null = null;
    if (categoryLevel === 2) parentId = selectedLevel1 || null;
    if (categoryLevel === 3) parentId = selectedLevel2 || null;

    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      level: categoryLevel,
      parentId,
    });
  };

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
      {/* Product Status Selection */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Product Visibility</h3>
          <p className="text-sm text-muted-foreground">Control how this product appears in your store</p>
        </div>
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "active"}>
                <FormControl>
                  <SelectTrigger data-testid="select-product-status">
                    <SelectValue placeholder="Select product status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-green-600" />
                      <span>Active - Visible in store</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-600" />
                      <span>Draft - Not published</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="coming-soon">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>Coming Soon - Teaser mode</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="paused">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-yellow-600" />
                      <span>Paused - Temporarily hidden</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="out-of-stock">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <span>Out of Stock - Not available</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="archived">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-gray-400" />
                      <span>Archived - Kept for records</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose when and how this product should be visible to customers
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </Card>

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
        </div>
      </Card>

      {/* Product Images with UniversalImageUpload */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            Product Images
          </h3>
          <p className="text-sm text-muted-foreground">Upload or paste image URLs. First image is the hero image.</p>
        </div>

        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <UniversalImageUpload
                  value={field.value || []}
                  onChange={(newImages) => {
                    field.onChange(newImages);
                    // Set first image as primary
                    if (Array.isArray(newImages) && newImages.length > 0) {
                      form.setValue("image", newImages[0]);
                    } else {
                      form.setValue("image", "");
                    }
                  }}
                  label=""
                  mode="multiple"
                  maxImages={10}
                  aspectRatio="square"
                  heroSelection={true}
                  size="compact"
                  allowUrl={true}
                  allowUpload={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
              <div className="flex items-center justify-between">
                <FormLabel>Product Category</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCategoryDialog(true);
                    setCategoryLevel(selectedLevel2 ? 3 : selectedLevel1 ? 2 : 1);
                  }}
                  data-testid="button-add-category"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Category
                </Button>
              </div>
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

                {selectedLevel1 && setSelectedLevel2 && (
                  <Select 
                    value={selectedLevel2} 
                    onValueChange={setSelectedLevel2}
                    disabled={level2Categories.length === 0}
                  >
                    <SelectTrigger 
                      data-testid="select-level2" 
                      className={cn(
                        "text-base",
                        level2Categories.length === 0 && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <SelectValue placeholder={
                        level2Categories.length === 0 
                          ? "No subcategories - Click Add Category" 
                          : "Subcategory (Optional)"
                      } />
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

                {selectedLevel2 && setSelectedLevel3 && (
                  <Select 
                    value={selectedLevel3} 
                    onValueChange={setSelectedLevel3}
                    disabled={level3Categories.length === 0}
                  >
                    <SelectTrigger 
                      data-testid="select-level3" 
                      className={cn(
                        "text-base",
                        level3Categories.length === 0 && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <SelectValue placeholder={
                        level3Categories.length === 0 
                          ? "No sub-subcategories - Click Add Category" 
                          : "Sub-category (Optional)"
                      } />
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

          {/* Quick Add Category Dialog */}
          <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new category to organize your products
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <FormLabel>Category Name</FormLabel>
                  <Input
                    placeholder="e.g., Electronics, Clothing, Home & Garden"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    data-testid="input-new-category-name"
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel>Category Level</FormLabel>
                  <Select
                    value={categoryLevel.toString()}
                    onValueChange={(val) => setCategoryLevel(parseInt(val) as 1 | 2 | 3)}
                  >
                    <SelectTrigger data-testid="select-category-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 (Main Category)</SelectItem>
                      {selectedLevel1 && <SelectItem value="2">Level 2 (Subcategory)</SelectItem>}
                      {selectedLevel2 && <SelectItem value="3">Level 3 (Sub-subcategory)</SelectItem>}
                    </SelectContent>
                  </Select>
                  {categoryLevel > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Will be added under: {categoryLevel === 2 
                        ? level1Categories.find(c => c.id === selectedLevel1)?.name 
                        : level2Categories.find(c => c.id === selectedLevel2)?.name}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCategoryDialog(false);
                    setNewCategoryName("");
                  }}
                  data-testid="button-cancel-category"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  data-testid="button-create-category"
                >
                  {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Type-Specific Fields */}
          {selectedType === "in-stock" && (
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Stock Quantity <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
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
                <FormLabel>
                  Expected Delivery Date <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
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
                render={({ field }) => {
                  const price = parseFloat(priceValue as string || "0") || 0;
                  const deposit = parseFloat(field.value as string || "0") || 0;
                  const hasError = deposit > 0 && deposit > price;
                  
                  return (
                    <FormItem>
                      <FormLabel>
                        Deposit Amount <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(currency)}</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-deposit"
                            className={cn("pl-8 text-base", hasError && "border-destructive focus-visible:ring-destructive")}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Require a deposit for pre-orders (cannot exceed total price)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          )}

          {selectedType === "made-to-order" && (
            <div className="space-y-2">
              <FormLabel>
                Production Time (Days) <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
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

      {/* Shipping Configuration */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            Shipping Configuration
          </h3>
          <p className="text-sm text-muted-foreground">Configure how this product will be shipped</p>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="shippingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shipping Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-shipping-type">
                      <SelectValue placeholder="Choose shipping method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="flat">Flat Rate</SelectItem>
                    <SelectItem value="matrix">Shipping Matrix</SelectItem>
                    <SelectItem value="shippo">Shippo (Real-time Rates)</SelectItem>
                    <SelectItem value="free">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select how shipping costs will be calculated
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("shippingType") === "flat" && (
            <FormField
              control={form.control}
              name="flatShippingRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flat Shipping Rate</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-flat-shipping-rate"
                        className="pl-8 text-base"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Fixed shipping cost for this product
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {form.watch("shippingType") === "matrix" && (
            <FormField
              control={form.control}
              name="shippingMatrixId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Shipping Matrix</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-shipping-matrix">
                        <SelectValue placeholder="Choose a shipping matrix" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {shippingMatrices.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No shipping matrices available. Create one in Settings.
                        </div>
                      ) : (
                        shippingMatrices.map((matrix) => (
                          <SelectItem key={matrix.id} value={matrix.id}>
                            {matrix.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Use a saved shipping matrix with zone-based rates
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {form.watch("shippingType") === "shippo" && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Package Dimensions</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={unitSystem === "imperial" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUnitSystem("imperial")}
                      data-testid="button-unit-imperial"
                    >
                      Imperial (lb/in)
                    </Button>
                    <Button
                      type="button"
                      variant={unitSystem === "metric" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUnitSystem("metric")}
                      data-testid="button-unit-metric"
                    >
                      Metric (kg/cm)
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Quick Select Package Size</label>
                  <Select onValueChange={handlePresetChange} value={selectedPreset}>
                    <SelectTrigger data-testid="select-package-preset">
                      <SelectValue placeholder="Choose a standard package size..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Custom Dimensions</SelectItem>
                      {packagePresets.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label} ({unitSystem === "imperial" 
                            ? `${preset.weight_lbs} lb, ${preset.length_in}×${preset.width_in}×${preset.height_in} in` 
                            : `${preset.weight_kg} kg, ${preset.length_cm}×${preset.width_cm}×${preset.height_cm} cm`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a standard package size to auto-fill dimensions, or enter custom values below
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="shippoWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight ({unitSystem === "imperial" ? "lb" : "kg"})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.0"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-shippo-weight"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippoLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length ({unitSystem === "imperial" ? "in" : "cm"})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.0"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-shippo-length"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippoWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width ({unitSystem === "imperial" ? "in" : "cm"})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.0"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-shippo-width"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippoHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height ({unitSystem === "imperial" ? "in" : "cm"})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.0"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-shippo-height"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Or use a carrier template:</p>
              </div>

              <FormField
                control={form.control}
                name="shippoTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrier Template (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shippo-template">
                          <SelectValue placeholder="Choose a carrier template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (use dimensions)</SelectItem>
                        <SelectItem value="USPS_FlatRateEnvelope">USPS Flat Rate Envelope</SelectItem>
                        <SelectItem value="USPS_FlatRateCardboardEnvelope">USPS Flat Rate Cardboard Envelope</SelectItem>
                        <SelectItem value="USPS_SmallFlatRateBox">USPS Small Flat Rate Box</SelectItem>
                        <SelectItem value="USPS_MediumFlatRateBox">USPS Medium Flat Rate Box</SelectItem>
                        <SelectItem value="USPS_LargeFlatRateBox">USPS Large Flat Rate Box</SelectItem>
                        <SelectItem value="FedEx_SmallBox">FedEx Small Box</SelectItem>
                        <SelectItem value="FedEx_MediumBox">FedEx Medium Box</SelectItem>
                        <SelectItem value="FedEx_LargeBox">FedEx Large Box</SelectItem>
                        <SelectItem value="UPS_SmallExpressBox">UPS Small Express Box</SelectItem>
                        <SelectItem value="UPS_MediumExpressBox">UPS Medium Express Box</SelectItem>
                        <SelectItem value="UPS_LargeExpressBox">UPS Large Express Box</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Use a standard carrier box size or custom dimensions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {form.watch("shippingType") === "free" && (
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                This product will ship for free. No additional shipping charges will be applied at checkout.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Pricing & Promotions */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <Star className="h-5 w-5 text-primary" />
            </div>
            Pricing & Promotions
          </h3>
          <p className="text-sm text-muted-foreground">Set your product price and optional discounts</p>
        </div>

        <div className="space-y-4">
          {/* Base Price - NOW FIRST */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Product Price</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">{getCurrencySymbol(currency)}</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      data-testid="input-price"
                      className="pl-8 text-base font-medium h-12"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  The base price for this product
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Discount & Promotion */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>
                  Discount % <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
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
                <FormLabel>
                  Promotion End Date <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
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
          </div>
        </div>
      </Card>

      {/* Product Variants - New System */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Product Variants (Optional)</h3>
          <p className="text-sm text-muted-foreground">
            Add color variants with images, then specify sizes for each color
          </p>
        </div>

        <ProductVariantManager
          colorVariants={variants as any}
          onChange={(newVariants) => setVariants(newVariants as any)}
        />
      </Card>
    </div>
  );
}
