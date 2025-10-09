import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { frontendProductSchema, type FrontendProduct } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ArrowLeft, Package, Clock, Hammer, Building2, Check, Plus, X, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductVariant = {
  size: string;
  color: string;
  stock: number;
  image: string;
};

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

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
}

export default function CreateProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [madeToOrderDays, setMadeToOrderDays] = useState<number>(7);
  const [preOrderDate, setPreOrderDate] = useState<string>("");
  const [productImages, setProductImages] = useState<string[]>([""]);
  const [selectedLevel1, setSelectedLevel1] = useState<string>("");
  const [selectedLevel2, setSelectedLevel2] = useState<string>("");
  const [selectedLevel3, setSelectedLevel3] = useState<string>("");
  const [newLevel1Name, setNewLevel1Name] = useState("");
  const [newLevel2Name, setNewLevel2Name] = useState("");
  const [newLevel3Name, setNewLevel3Name] = useState("");
  const [showLevel1Input, setShowLevel1Input] = useState(false);
  const [showLevel2Input, setShowLevel2Input] = useState(false);
  const [showLevel3Input, setShowLevel3Input] = useState(false);

  const { data: categories = [], refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2 && c.parentId === selectedLevel1);
  const level3Categories = categories.filter(c => c.level === 3 && c.parentId === selectedLevel2);
  
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; level: number; parentId: string | null }) => {
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return await apiRequest("POST", "/api/categories", { ...data, slug });
    },
    onSuccess: (data: any) => {
      refetchCategories();
      toast({
        title: "Category created",
        description: "Category added successfully",
      });
      return data;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    },
  });
  
  const handleCreateLevel1 = async () => {
    if (!newLevel1Name.trim()) return;
    const result = await createCategoryMutation.mutateAsync({ 
      name: newLevel1Name, 
      level: 1, 
      parentId: null 
    });
    if (result) {
      setSelectedLevel1(result.id);
      setNewLevel1Name("");
      setShowLevel1Input(false);
    }
  };
  
  const handleCreateLevel2 = async () => {
    if (!newLevel2Name.trim() || !selectedLevel1) return;
    const result = await createCategoryMutation.mutateAsync({ 
      name: newLevel2Name, 
      level: 2, 
      parentId: selectedLevel1 
    });
    if (result) {
      setSelectedLevel2(result.id);
      setNewLevel2Name("");
      setShowLevel2Input(false);
    }
  };
  
  const handleCreateLevel3 = async () => {
    if (!newLevel3Name.trim() || !selectedLevel2) return;
    const result = await createCategoryMutation.mutateAsync({ 
      name: newLevel3Name, 
      level: 3, 
      parentId: selectedLevel2 
    });
    if (result) {
      setSelectedLevel3(result.id);
      setNewLevel3Name("");
      setShowLevel3Input(false);
    }
  };
  
  const addImageField = () => {
    if (productImages.length < 10) {
      setProductImages([...productImages, ""]);
    }
  };
  
  const removeImageField = (index: number) => {
    if (productImages.length > 1) {
      setProductImages(productImages.filter((_, i) => i !== index));
    }
  };
  
  const updateImageField = (index: number, value: string) => {
    const updated = [...productImages];
    updated[index] = value;
    setProductImages(updated);
  };

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

  const createMutation = useMutation({
    mutationFn: async (data: FrontendProduct) => {
      // For pre-orders with deposit, set requiresDeposit flag
      if (data.productType === "pre-order" && data.depositAmount && parseFloat(data.depositAmount as string) > 0) {
        data.requiresDeposit = 1;
      } else {
        data.requiresDeposit = 0;
        data.depositAmount = undefined;
      }
      
      // Handle discount/promotion
      if ((data as any).discountPercentage && parseFloat((data as any).discountPercentage) > 0) {
        (data as any).promotionActive = 1;
      } else {
        (data as any).promotionActive = 0;
        (data as any).discountPercentage = null;
        (data as any).promotionEndDate = null;
      }
      
      // Set category based on selections or use default
      if (selectedLevel1 || selectedLevel2 || selectedLevel3) {
        const categoryNames = [];
        if (selectedLevel1) {
          const level1 = categories.find(c => c.id === selectedLevel1);
          if (level1) categoryNames.push(level1.name);
        }
        if (selectedLevel2) {
          const level2 = categories.find(c => c.id === selectedLevel2);
          if (level2) categoryNames.push(level2.name);
        }
        if (selectedLevel3) {
          const level3 = categories.find(c => c.id === selectedLevel3);
          if (level3) categoryNames.push(level3.name);
        }
        data.category = categoryNames.join(" > ") || "General";
      } else {
        data.category = "General"; // Default category if none selected
      }
      
      // Add category IDs
      (data as any).categoryLevel1Id = selectedLevel1 || null;
      (data as any).categoryLevel2Id = selectedLevel2 || null;
      (data as any).categoryLevel3Id = selectedLevel3 || null;
      
      // Add multiple images
      const validImages = productImages.filter(img => img.trim() !== "");
      if (validImages.length > 0) {
        (data as any).images = validImages;
        data.image = validImages[0]; // Set first image as primary
      }
      
      // Add variants if any
      if (variants.length > 0) {
        (data as any).variants = variants;
      }
      
      // Add readiness dates based on product type
      if (data.productType === "made-to-order") {
        (data as any).madeToOrderDays = madeToOrderDays;
      }
      if (data.productType === "pre-order" && preOrderDate) {
        (data as any).preOrderDate = new Date(preOrderDate).toISOString();
      }
      
      return await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
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

  const onSubmit = (data: FrontendProduct) => {
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

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Category Level 1</label>
                    {!showLevel1Input ? (
                      <div className="flex gap-2">
                        <Select value={selectedLevel1} onValueChange={(value) => {
                          setSelectedLevel1(value);
                          setSelectedLevel2("");
                          setSelectedLevel3("");
                        }}>
                          <SelectTrigger data-testid="select-category-level-1" className="flex-1">
                            <SelectValue placeholder="Select main category" />
                          </SelectTrigger>
                          <SelectContent>
                            {level1Categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowLevel1Input(true)}
                          data-testid="button-add-level1"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="New category name"
                          value={newLevel1Name}
                          onChange={(e) => setNewLevel1Name(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateLevel1())}
                          data-testid="input-new-level1"
                        />
                        <Button
                          type="button"
                          onClick={handleCreateLevel1}
                          disabled={!newLevel1Name.trim() || createCategoryMutation.isPending}
                          data-testid="button-save-level1"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowLevel1Input(false);
                            setNewLevel1Name("");
                          }}
                          data-testid="button-cancel-level1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {selectedLevel1 && (
                    <div>
                      <label className="text-sm font-medium">Category Level 2 (Optional)</label>
                      {!showLevel2Input ? (
                        <div className="flex gap-2">
                          <Select value={selectedLevel2} onValueChange={(value) => {
                            setSelectedLevel2(value);
                            setSelectedLevel3("");
                          }}>
                            <SelectTrigger data-testid="select-category-level-2" className="flex-1">
                              <SelectValue placeholder="Select subcategory (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {level2Categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowLevel2Input(true)}
                            data-testid="button-add-level2"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="New subcategory name"
                            value={newLevel2Name}
                            onChange={(e) => setNewLevel2Name(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateLevel2())}
                            data-testid="input-new-level2"
                          />
                          <Button
                            type="button"
                            onClick={handleCreateLevel2}
                            disabled={!newLevel2Name.trim() || createCategoryMutation.isPending}
                            data-testid="button-save-level2"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowLevel2Input(false);
                              setNewLevel2Name("");
                            }}
                            data-testid="button-cancel-level2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLevel2 && (
                    <div>
                      <label className="text-sm font-medium">Category Level 3 (Optional)</label>
                      {!showLevel3Input ? (
                        <div className="flex gap-2">
                          <Select value={selectedLevel3} onValueChange={setSelectedLevel3}>
                            <SelectTrigger data-testid="select-category-level-3" className="flex-1">
                              <SelectValue placeholder="Select category (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {level3Categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowLevel3Input(true)}
                            data-testid="button-add-level3"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="New category name"
                            value={newLevel3Name}
                            onChange={(e) => setNewLevel3Name(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateLevel3())}
                            data-testid="input-new-level3"
                          />
                          <Button
                            type="button"
                            onClick={handleCreateLevel3}
                            disabled={!newLevel3Name.trim() || createCategoryMutation.isPending}
                            data-testid="button-save-level3"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowLevel3Input(false);
                              setNewLevel3Name("");
                            }}
                            data-testid="button-cancel-level3"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <FormLabel>Product Images (up to 10)</FormLabel>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add multiple image URLs. First image will be the primary display image.
                  </p>
                  <div className="space-y-3">
                    {productImages.map((imgUrl, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Input
                            type="url"
                            placeholder={`https://example.com/image-${index + 1}.jpg`}
                            value={imgUrl}
                            onChange={(e) => updateImageField(index, e.target.value)}
                            data-testid={`input-image-${index}`}
                          />
                          {index === 0 && imgUrl && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Primary image (will be shown on product cards)
                            </p>
                          )}
                        </div>
                        {productImages.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeImageField(index)}
                            data-testid={`button-remove-image-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {productImages.length < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addImageField}
                        className="w-full"
                        data-testid="button-add-image"
                      >
                        <ImagePlus className="h-4 w-4 mr-2" />
                        Add Another Image
                      </Button>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="image"
                    render={() => <input type="hidden" />}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount % (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-discount"
                          />
                        </FormControl>
                        <FormDescription>
                          Discount percentage (0-100%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="promotionEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promotion End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                            data-testid="input-promotion-end"
                          />
                        </FormControl>
                        <FormDescription>
                          When the promotion ends
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
              </CardContent>
            </Card>

            {/* Product Variants */}
            <Card>
              <CardHeader>
                <CardTitle>Step 4: Product Variants (Optional)</CardTitle>
                <CardDescription>
                  Add size and color options for this product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
