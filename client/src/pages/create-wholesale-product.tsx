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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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
  requiresDeposit: z.boolean().default(false),
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
  hasVariants: z.boolean().default(false),
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

  // Variant management state
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [variantMatrix, setVariantMatrix] = useState<Map<string, Variant>>(new Map());

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
      requiresDeposit: false,
      depositPercentage: "30",
      balancePaymentTerms: "Net 30",
      stock: "0",
      readinessType: "days",
      readinessDays: "30",
      shipFromAddress: {
        street: "",
        city: "",
        country: "",
      },
      hasVariants: false,
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
  }, [authUser, form]);

  const useExisting = form.watch("useExisting");
  const requiresDeposit = form.watch("requiresDeposit");
  const depositPercentage = form.watch("depositPercentage");
  const wholesalePrice = form.watch("wholesalePrice");
  const readinessType = form.watch("readinessType");
  const balancePaymentTerms = form.watch("balancePaymentTerms");
  const hasVariants = form.watch("hasVariants");
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
  }, [selectedLevel1, selectedLevel2, selectedLevel3, categories, form]);

  // Calculate deposit and balance amounts
  const calculatedDeposit = requiresDeposit && depositPercentage && wholesalePrice
    ? (parseFloat(wholesalePrice) * parseFloat(depositPercentage) / 100).toFixed(2)
    : "0.00";
  const calculatedBalance = requiresDeposit && depositPercentage && wholesalePrice
    ? (parseFloat(wholesalePrice) - parseFloat(calculatedDeposit)).toFixed(2)
    : wholesalePrice || "0.00";

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

  const addSize = () => {
    if (newSize && !sizes.includes(newSize.trim())) {
      const updatedSizes = [...sizes, newSize.trim()];
      setSizes(updatedSizes);
      setNewSize("");
      
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
    const newMatrix = new Map(variantMatrix);
    colors.forEach(color => {
      newMatrix.delete(`${size}-${color}`);
    });
    setVariantMatrix(newMatrix);
  };

  const removeColor = (color: string) => {
    setColors(colors.filter(c => c !== color));
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
      let variants = null;
      if (data.hasVariants && sizes.length > 0 && colors.length > 0) {
        variants = Array.from(variantMatrix.values());
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
        requiresDeposit: data.requiresDeposit ? 1 : 0,
        depositPercentage: data.requiresDeposit && data.depositPercentage ? parseFloat(data.depositPercentage) : null,
        balancePaymentTerms: data.requiresDeposit ? data.balancePaymentTerms : null,
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

              {/* 3-Level Category Selector */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <div className="space-y-3">
                      <Select
                        key="level1"
                        value={selectedLevel1}
                        onValueChange={setSelectedLevel1}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category-level1">
                            <SelectValue placeholder="Select Master Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {level1Categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedLevel1 && level2Categories.length > 0 && (
                        <Select
                          key={`level2-${selectedLevel1}`}
                          value={selectedLevel2}
                          onValueChange={setSelectedLevel2}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-category-level2">
                              <SelectValue placeholder="Select Sub Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {level2Categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {selectedLevel2 && level3Categories.length > 0 && (
                        <Select
                          key={`level3-${selectedLevel2}`}
                          value={selectedLevel3}
                          onValueChange={setSelectedLevel3}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-category-level3">
                              <SelectValue placeholder="Select Sub-Sub Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {level3Categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.value && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {field.value}
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                          Enter 0 for Made-to-Order variants (no stock limit)
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
                      <FormDescription>
                        Enter 0 for Made-to-Order products (no stock limit). Enter actual quantity for in-stock items.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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

              {/* Deposit as Percentage with Real-Time Calculation */}
              <FormField
                control={form.control}
                name="requiresDeposit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Requires Deposit</FormLabel>
                      <FormDescription>
                        Request upfront deposit before production (industry standard)
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
                <>
                  <FormField
                    control={form.control}
                    name="depositPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Percentage</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Slider
                                min={0}
                                max={100}
                                step={5}
                                value={[parseFloat(field.value || "30")]}
                                onValueChange={(values) => field.onChange(values[0].toString())}
                                className="flex-1"
                                data-testid="slider-deposit-percentage"
                              />
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                max="100"
                                step="5"
                                className="w-20"
                                data-testid="input-deposit-percentage"
                              />
                              <span className="text-sm font-medium">%</span>
                            </div>
                            {wholesalePrice && (
                              <div className="p-3 bg-muted rounded-md space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">Deposit:</span> ${calculatedDeposit}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Balance:</span> ${calculatedBalance}
                                </p>
                              </div>
                            )}
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
                </>
              )}

              {/* Ship From Warehouse - Editable Fields */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Warehouse Address</h3>
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
                <p className="text-sm text-muted-foreground">
                  {authUser?.warehouseStreet ? 
                    "Default values loaded from your settings. You can edit them here for this product." :
                    "Enter the warehouse address where this product will ship from."
                  }
                </p>
              </div>

              {/* T&C File Upload */}
              <FormField
                control={form.control}
                name="termsAndConditionsUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions (Optional)</FormLabel>
                    <div className="flex gap-2">
                      <DocumentUploader
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleTermsUpload}
                        buttonLabel={field.value ? "Change T&C" : "Upload T&C"}
                        variant="outline"
                        allowedFileTypes={['.pdf', '.docx', '.txt']}
                        maxFileSize={10 * 1024 * 1024}
                      />
                    </div>
                    {field.value && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm flex-1 truncate">{field.value}</span>
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
