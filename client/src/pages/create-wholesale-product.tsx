import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowLeft, Plus, X, Sparkles, CalendarIcon, Upload, FileText, Warehouse, Image as ImageIcon } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UniversalImageUpload } from "@/components/universal-image-upload";
import { DocumentUploader } from "@/components/DocumentUploader";
import type { UploadResult } from "@uppy/core";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Product } from "@shared/schema";
import { SimpleVariantManager, type SizeVariant, type ColorVariant } from "@/components/simple-variant-manager";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
}

const wholesaleProductSchema = z.object({
  useExisting: z.boolean().default(false),
  existingProductId: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  category: z.string().min(1, "Category is required"),
  sku: z.string().optional(),
  rrp: z.string().min(1, "RRP is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "RRP must be a positive number",
  }),
  wholesalePrice: z.string().min(1, "Wholesale price is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Wholesale price must be a positive number",
  }),
  moq: z.string().min(1, "MOQ is required").refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "MOQ must be a positive integer",
  }),
  depositPercentage: z.string().optional(),
  balancePaymentTerms: z.string().optional(),
  balancePaymentDate: z.date().optional(),
  stock: z.string().default("0"),
  readinessType: z.enum(["days", "date"]).default("days"),
  readinessDays: z.string().optional(),
  readinessDate: z.date().optional(),
  shipFromAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  termsAndConditionsUrl: z.string().optional(),
});

type WholesaleProductFormData = z.infer<typeof wholesaleProductSchema>;

interface Variant {
  size: string;
  color: string;
  stock: number;
  image?: string;
}

// Auto-generate SKU helper
const generateSKU = (categoryName: string): string => {
  const categoryAbbr = categoryName.split(/[\s>]+/).map(word => word.substring(0, 3).toUpperCase()).join('-');
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${categoryAbbr}-${randomChars}`;
};

export default function CreateWholesaleProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Category selection state
  const [selectedLevel1, setSelectedLevel1] = useState<string>("");
  const [selectedLevel2, setSelectedLevel2] = useState<string>("");
  const [selectedLevel3, setSelectedLevel3] = useState<string>("");

  // Warehouse dialog state
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    street: "",
    city: "",
    country: "",
  });

  // Variant management state - using SimpleVariantManager (same as B2C)
  const [hasColors, setHasColors] = useState(false);
  const [sizes, setSizes] = useState<SizeVariant[]>([]);
  const [colors, setColors] = useState<ColorVariant[]>([]);

  // Category dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryLevel, setCategoryLevel] = useState<1 | 2 | 3>(1);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: existingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch user's warehouse info from auth
  const { data: authUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2 && c.parentId === selectedLevel1);
  const level3Categories = categories.filter(c => c.level === 3 && c.parentId === selectedLevel2);

  const form = useForm<WholesaleProductFormData>({
    resolver: zodResolver(wholesaleProductSchema),
    defaultValues: {
      useExisting: false,
      name: "",
      description: "",
      images: [],
      category: "",
      sku: "",
      rrp: "",
      wholesalePrice: "",
      moq: "10",
      depositPercentage: "",
      balancePaymentTerms: "",
      stock: "0",
      readinessType: "days",
      readinessDays: "30",
      shipFromAddress: {
        street: "",
        city: "",
        country: "",
      },
    },
  });

  // Update warehouse address when authUser data loads
  useEffect(() => {
    if (authUser && (authUser as any).warehouseStreet) {
      form.setValue("shipFromAddress", {
        street: (authUser as any).warehouseStreet || "",
        city: (authUser as any).warehouseCity || "",
        country: (authUser as any).warehouseCountry || "",
      });
    }
  }, [authUser]);

  const useExisting = form.watch("useExisting");
  const depositPercentage = form.watch("depositPercentage");
  const wholesalePrice = form.watch("wholesalePrice");
  const readinessType = form.watch("readinessType");
  const balancePaymentTerms = form.watch("balancePaymentTerms");
  const currentCategory = form.watch("category");

  // Reset child selections when parent changes
  useEffect(() => {
    setSelectedLevel2("");
    setSelectedLevel3("");
  }, [selectedLevel1]);

  useEffect(() => {
    setSelectedLevel3("");
  }, [selectedLevel2]);

  // Update form category when selections change
  useEffect(() => {
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
      const categoryValue = categoryNames.join(" > ") || "General";
      form.setValue("category", categoryValue, { shouldValidate: true });
    }
  }, [selectedLevel1, selectedLevel2, selectedLevel3, categories]);

  const handleProductSelect = (productId: string) => {
    const product = existingProducts?.find(p => p.id === productId);
    if (product) {
      form.setValue("name", product.name);
      form.setValue("description", product.description);
      form.setValue("images", [product.image]);
      form.setValue("category", product.category);
      form.setValue("rrp", product.price);
      form.setValue("stock", product.stock?.toString() || "0");
    }
  };

  const handleGenerateSKU = () => {
    const sku = generateSKU(currentCategory || "PROD");
    form.setValue("sku", sku);
    toast({
      title: "SKU Generated",
      description: `Generated SKU: ${sku}`,
    });
  };

  // Document upload handlers
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    return {
      method: "PUT" as const,
      url: (response as any).uploadURL,
    };
  };

  const handleTermsUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      try {
        const uploadedFile = result.successful[0];
        const uploadURL = uploadedFile.uploadURL;
        
        console.log("[T&C Upload] Upload URL:", uploadURL);
        
        const response = await apiRequest("PUT", "/api/wholesale/documents", {
          documentURL: uploadURL,
        }) as { objectPath: string };
        
        console.log("[T&C Upload] Normalized path:", response.objectPath);
        
        form.setValue("termsAndConditionsUrl", response.objectPath);
        toast({
          title: "Success",
          description: "Terms & Conditions uploaded successfully",
        });
      } catch (error) {
        console.error("[T&C Upload] Error:", error);
        toast({
          title: "Error",
          description: "Failed to upload Terms & Conditions",
          variant: "destructive",
        });
      }
    }
  };


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

  const createMutation = useMutation({
    mutationFn: async (data: WholesaleProductFormData) => {
      let variants = null;
      if (hasColors && colors.length > 0) {
        // Use color variants with sizes
        variants = colors.flatMap(color => 
          color.sizes.map(size => ({
            colorName: color.colorName,
            colorHex: color.colorHex,
            size: size.size,
            stock: size.stock,
            sku: size.sku,
            images: color.images,
          }))
        );
      } else if (sizes.length > 0) {
        // Use size-only variants
        variants = sizes.map(size => ({
          size: size.size,
          stock: size.stock,
          sku: size.sku,
        }));
      }

      const payload = {
        productId: data.useExisting ? data.existingProductId : undefined,
        name: data.name,
        description: data.description,
        image: data.images[0], // First image for backward compatibility
        images: data.images, // All images array
        category: data.category,
        sku: data.sku || null,
        rrp: data.rrp,
        wholesalePrice: data.wholesalePrice,
        moq: parseInt(data.moq),
        depositPercentage: data.depositPercentage ? parseFloat(data.depositPercentage) : null,
        balancePaymentTerms: data.balancePaymentTerms || null,
        balancePaymentDate: data.balancePaymentDate || null,
        stock: parseInt(data.stock),
        readinessType: data.readinessType,
        readinessValue: data.readinessType === 'days' ? data.readinessDays : data.readinessDate?.toISOString(),
        shipFromAddress: {
          street: data.shipFromAddress?.street,
          city: data.shipFromAddress?.city,
          country: data.shipFromAddress?.country,
        },
        termsAndConditionsUrl: data.termsAndConditionsUrl || null,
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
      setLocation("/wholesale/products");
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
    // Validate variants if enabled
    if (hasColors && colors.length === 0) {
      toast({
        title: "Variants Required",
        description: "Please add at least one color variant",
        variant: "destructive",
      });
      return;
    }
    if (hasColors && colors.some(c => c.sizes.length === 0)) {
      toast({
        title: "Sizes Required",
        description: "Each color variant must have at least one size",
        variant: "destructive",
      });
      return;
    }
    if (!hasColors && sizes.length > 0 && sizes.some(s => !s.size)) {
      toast({
        title: "Invalid Sizes",
        description: "Please fill in all size names",
        variant: "destructive",
      });
      return;
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
              onClick={() => setLocation("/wholesale/products")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
                Create Wholesale Product
              </h1>
              <p className="text-muted-foreground">
                Industry-standard B2B product setup with advanced wholesale features
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

              {/* Basic Information Card */}
              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Basic Information</h3>
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
                          <Input
                            placeholder="Premium Cotton T-Shirt"
                            {...field}
                            data-testid="input-name"
                            className="text-base"
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
                            placeholder="Detailed product description..."
                            {...field}
                            rows={4}
                            data-testid="input-description"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>

              {/* Product Images - Using UniversalImageUpload (same as B2C) */}
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
                          onChange={field.onChange}
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

              {/* Category & SKU */}
              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Category & SKU</h3>
                  <p className="text-sm text-muted-foreground">Product classification and tracking</p>
                </div>

                <div className="space-y-4">
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

                      {selectedLevel1 && (
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

                      {selectedLevel2 && (
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

                  {/* SKU Field with Auto-Generate */}
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., APP-A3X9K2"
                              data-testid="input-sku"
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleGenerateSKU}
                            className="gap-2"
                            data-testid="button-generate-sku"
                          >
                            <Sparkles className="h-4 w-4" />
                            Generate
                          </Button>
                        </div>
                        <FormDescription>
                          Optional product tracking code. Click Generate for auto-generated SKU.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>

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

              {/* Pricing & Payment Terms */}
              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Pricing & Payment Terms</h3>
                  <p className="text-sm text-muted-foreground">B2B pricing structure and deposit settings</p>
                </div>

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

                {/* Deposit Percentage - Simple Text Input */}
                <FormField
                  control={form.control}
                  name="depositPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Percentage</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="100"
                            placeholder="30"
                            className="max-w-[200px]"
                            data-testid="input-deposit-percentage"
                          />
                          <span className="text-sm font-medium">%</span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Percentage of wholesale price required as upfront deposit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Balance Payment Terms */}
                <FormField
                  control={form.control}
                  name="balancePaymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Balance Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-balance-payment-terms">
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Net 90">Net 90</SelectItem>
                          <SelectItem value="Custom Date">Custom Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        When balance payment is due (industry standard)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {balancePaymentTerms === "Custom Date" && (
                  <FormField
                    control={form.control}
                    name="balancePaymentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Custom Balance Payment Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-balance-payment-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date()
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Specific date when balance payment is due
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </Card>

              {/* Quantities & Availability */}
              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Quantities & Availability</h3>
                  <p className="text-sm text-muted-foreground">MOQ, stock levels, and production readiness</p>
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


              {/* Readiness Configuration - Days OR Fixed Date */}
              <FormField
                control={form.control}
                name="readinessType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Product Readiness</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="days" data-testid="radio-readiness-days" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Days after purchase
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="date" data-testid="radio-readiness-date" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Fixed delivery date
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {readinessType === "days" ? (
                <FormField
                  control={form.control}
                  name="readinessDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days After Order</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="30"
                          data-testid="input-readiness-days"
                        />
                      </FormControl>
                      <FormDescription>
                        Number of days required for production/delivery after order
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="readinessDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fixed Delivery Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-readiness-date"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Specific date when product will be delivered
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0"
                        data-testid="input-stock"
                      />
                    </FormControl>
                    <FormDescription>
                      Stock = 0 means unlimited availability (Made-to-Order)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </Card>

              {/* Warehouse & Shipping */}
              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5" />
                    <h3 className="text-xl font-semibold">Warehouse & Shipping</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {authUser?.warehouseStreet ? 
                      "Default values loaded from your settings. You can edit them here for this product." :
                      "Enter the warehouse address where this product will ship from."
                    }
                  </p>
                </div>

                
                <FormField
                  control={form.control}
                  name="shipFromAddress.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123 Warehouse St"
                          data-testid="input-warehouse-street"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="shipFromAddress.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="City name"
                            data-testid="input-warehouse-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipFromAddress.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Country name"
                            data-testid="input-warehouse-country"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>

              {/* Legal Documents */}
              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Legal Documents</h3>
                  <p className="text-sm text-muted-foreground">Product-specific terms and conditions</p>
                </div>

                {/* T&C File Upload */}
              <FormField
                control={form.control}
                name="termsAndConditionsUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions (Optional)</FormLabel>
                    <DocumentUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10 * 1024 * 1024}
                      allowedFileTypes={['.pdf', '.docx', '.txt']}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleTermsUpload}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {field.value ? "Change T&C" : "Upload T&C"}
                    </DocumentUploader>
                    {field.value && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md mt-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm flex-1 truncate">{field.value.split('/').pop()}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange("")}
                          data-testid="button-remove-tc"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <FormDescription>
                      Upload custom terms and conditions for this product (.pdf, .docx, or .txt)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </Card>

              {/* Variant Manager - Same as B2C with B2B Stock Logic */}
              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Product Variants (Optional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Most products just need sizes. Enable colors if your product comes in multiple colors.
                  </p>
                </div>
                <SimpleVariantManager
                  sizes={sizes}
                  onSizesChange={setSizes}
                  hasColors={hasColors}
                  onHasColorsChange={setHasColors}
                  colors={colors}
                  onColorsChange={setColors}
                  mainProductImages={form.watch("images") || []}
                />
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Stock = 0 means unlimited availability</strong> (Made-to-Order). Enter actual quantities only for in-stock items with limited inventory.
                  </p>
                </div>
              </Card>

              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/wholesale/products")}
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

      {/* Warehouse Dialog (Placeholder - redirects to settings) */}
      <Dialog open={showWarehouseDialog} onOpenChange={setShowWarehouseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Warehouse Address</DialogTitle>
            <DialogDescription>
              Please add your warehouse address in your seller settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWarehouseDialog(false)}
              data-testid="button-warehouse-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowWarehouseDialog(false);
                setLocation("/seller/settings");
              }}
              data-testid="button-warehouse-settings"
            >
              Go to Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
