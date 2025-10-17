import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, RefreshCw, FileText } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { UniversalImageUpload } from "@/components/universal-image-upload";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
}

// Generate SKU in format: XYZ-A3X9K2 (3 random letters + hyphen + 6 alphanumeric)
function generateSKU(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  let sku = '';
  
  // Add 3 random letters for prefix
  for (let i = 0; i < 3; i++) {
    sku += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  sku += '-';
  
  // Add 6 random alphanumeric characters
  for (let i = 0; i < 6; i++) {
    sku += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
  }
  
  return sku;
}

// Wholesale product schema
const wholesaleProductSchema = z.object({
  useExistingProduct: z.boolean().default(false),
  productId: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  images: z.array(z.string().min(1, "Image URL/path is required")).min(1, "At least one image is required"),
  category: z.string().min(1, "Category is required"),
  sku: z.string().min(1, "SKU is required"),
  rrp: z.coerce.number().positive("RRP must be positive"),
  wholesalePrice: z.coerce.number().positive("Wholesale price must be positive"),
  moq: z.coerce.number().int().positive("MOQ must be a positive integer"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative"),
  enableVariants: z.boolean().default(false),
  sizes: z.string().optional(),
  colors: z.string().optional(),
  readinessType: z.enum(["days", "date"]).default("days"),
  readinessValue: z.string().min(1, "Readiness value is required"),
  requiresDeposit: z.boolean().default(false),
  depositPercentage: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  shipFromStreet: z.string().optional(),
  shipFromCity: z.string().optional(),
  shipFromCountry: z.string().default("US"),
  termsAndConditionsUrl: z.string().optional(),
}).refine((data) => {
  if (data.useExistingProduct && !data.productId) {
    return false;
  }
  return true;
}, {
  message: "Please select a product when using existing product",
  path: ["productId"]
}).refine((data) => {
  if (data.requiresDeposit && (data.depositPercentage === "" || data.depositPercentage === undefined)) {
    return false;
  }
  return true;
}, {
  message: "Deposit percentage is required when deposit is enabled",
  path: ["depositPercentage"]
}).refine((data) => {
  if (data.readinessType === "days") {
    const num = Number(data.readinessValue);
    return !isNaN(num) && num > 0;
  }
  return true;
}, {
  message: "Number of days must be a positive number",
  path: ["readinessValue"]
}).refine((data) => {
  if (data.readinessType === "date") {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.readinessValue)) {
      return false;
    }
    const date = new Date(data.readinessValue);
    return !isNaN(date.getTime());
  }
  return true;
}, {
  message: "Please enter a valid date",
  path: ["readinessValue"]
});

type WholesaleProductForm = z.infer<typeof wholesaleProductSchema>;

export default function CreateWholesaleProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Category hierarchy state
  const [selectedLevel1, setSelectedLevel1] = useState<string>("");
  const [selectedLevel2, setSelectedLevel2] = useState<string>("");
  const [selectedLevel3, setSelectedLevel3] = useState<string>("");
  
  // T&C file upload state
  const [uploadingTC, setUploadingTC] = useState(false);
  const [tcFileName, setTcFileName] = useState<string>("");
  
  // Initialize form
  const form = useForm<WholesaleProductForm>({
    resolver: zodResolver(wholesaleProductSchema),
    defaultValues: {
      useExistingProduct: false,
      productId: "",
      name: "",
      description: "",
      images: [],
      category: "",
      sku: "",
      rrp: "" as any,
      wholesalePrice: "" as any,
      moq: "" as any,
      stock: "" as any,
      enableVariants: false,
      sizes: "",
      colors: "",
      readinessType: "days",
      readinessValue: "",
      requiresDeposit: false,
      depositPercentage: "",
      shipFromStreet: "",
      shipFromCity: "",
      shipFromCountry: "US",
      termsAndConditionsUrl: "",
    },
  });
  
  // Watch specific fields without causing full re-renders
  const useExistingProduct = useWatch({
    control: form.control,
    name: 'useExistingProduct',
    defaultValue: false,
  });
  
  const category = useWatch({
    control: form.control,
    name: 'category',
    defaultValue: '',
  });
  
  const enableVariants = useWatch({
    control: form.control,
    name: 'enableVariants',
    defaultValue: false,
  });
  
  const readinessType = useWatch({
    control: form.control,
    name: 'readinessType',
    defaultValue: 'days',
  });
  
  const requiresDeposit = useWatch({
    control: form.control,
    name: 'requiresDeposit',
    defaultValue: false,
  });
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Fetch existing products for dropdown
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: useExistingProduct,
  });
  
  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2 && c.parentId === selectedLevel1);
  const level3Categories = categories.filter(c => c.level === 3 && c.parentId === selectedLevel2);
  
  // Update form category field when category selections change
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

  // Handle T&C file upload
  const onDropTC = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setUploadingTC(true);
    setTcFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/objects/upload-file', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json() as { objectPath: string };
      const fileUrl = `/objects/${uploadData.objectPath.replace(/^\/+/, '')}`;
      
      form.setValue("termsAndConditionsUrl", fileUrl, { shouldValidate: true });
      
      toast({
        title: "Upload Successful",
        description: "Terms & Conditions file uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      setTcFileName("");
    } finally {
      setUploadingTC(false);
    }
  };

  const { getRootProps: getTCRootProps, getInputProps: getTCInputProps, isDragActive: isTCDragActive } = useDropzone({
    onDrop: onDropTC,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: uploadingTC,
  });

  const createMutation = useMutation({
    mutationFn: async (data: WholesaleProductForm) => {
      // Build category value
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
      
      // Transform form data to API format
      const payload: any = {
        name: data.name,
        description: data.description,
        image: data.images[0], // First image as hero/primary
        images: data.images, // All images array
        category: categoryValue,
        categoryLevel1Id: selectedLevel1 || null,
        categoryLevel2Id: selectedLevel2 || null,
        categoryLevel3Id: selectedLevel3 || null,
        sku: data.sku,
        rrp: Number(data.rrp),
        wholesalePrice: Number(data.wholesalePrice),
        moq: Number(data.moq),
        stock: Number(data.stock),
        requiresDeposit: data.requiresDeposit ? 1 : 0,
        depositPercentage: data.depositPercentage !== "" && data.depositPercentage !== undefined ? Number(data.depositPercentage) : null,
        readinessType: data.readinessType,
        readinessValue: data.readinessType === "days" ? Number(data.readinessValue) : data.readinessValue,
        shipFromAddress: (data.shipFromStreet || data.shipFromCity) ? {
          street: data.shipFromStreet,
          city: data.shipFromCity,
          country: data.shipFromCountry,
        } : undefined,
        termsAndConditionsUrl: data.termsAndConditionsUrl || undefined,
      };
      
      // Add useExistingProduct and productId if applicable
      if (data.useExistingProduct && data.productId) {
        payload.productId = data.productId;
      }
      
      // Add variant data if enabled
      if (data.enableVariants) {
        if (data.sizes) {
          payload.sizes = data.sizes;
        }
        if (data.colors) {
          payload.colors = data.colors;
        }
      }

      return await apiRequest('POST', '/api/wholesale/products', payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wholesale product created successfully",
      });
      setLocation('/wholesale/products');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WholesaleProductForm) => {
    createMutation.mutate(data);
  };

  const handleGenerateSKU = () => {
    const newSKU = generateSKU();
    form.setValue("sku", newSKU, { shouldValidate: true });
  };

  return (
    <div className="space-y-6" data-testid="page-create-wholesale-product">
      <div className="flex items-center gap-4">
        <Link href="/wholesale/products">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Wholesale Product</h1>
          <p className="text-muted-foreground mt-1">
            Add a new product to your wholesale B2B catalog
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Use Existing Product */}
          <Card>
            <CardHeader>
              <CardTitle>Use Existing Product</CardTitle>
              <CardDescription>Link to an existing product or create a new one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="useExistingProduct"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        data-testid="switch-use-existing-product"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Use an existing product as template</FormLabel>
                  </FormItem>
                )}
              />
              
              {useExistingProduct && (
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Product</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-existing-product">
                            <SelectValue placeholder="Choose a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
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
            </CardContent>
          </Card>

          {/* Section 2: Product Name & Description */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>Basic product details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
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
                      <Textarea {...field} rows={4} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 3: Product Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>Upload product photos</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <UniversalImageUpload
                        value={field.value || []}
                        onChange={field.onChange}
                        maxImages={10}
                        mode="multiple"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 4: Category */}
          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
              <CardDescription>Product classification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Master Category</Label>
                    <Select
                      value={selectedLevel1}
                      onValueChange={(value) => {
                        setSelectedLevel1(value);
                        setSelectedLevel2("");
                        setSelectedLevel3("");
                      }}
                    >
                      <SelectTrigger data-testid="select-category-level1">
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
                  <div>
                    <Label className="text-sm text-muted-foreground">Sub-category</Label>
                    <Select
                      value={selectedLevel2}
                      onValueChange={(value) => {
                        setSelectedLevel2(value);
                        setSelectedLevel3("");
                      }}
                      disabled={!selectedLevel1}
                    >
                      <SelectTrigger data-testid="select-category-level2">
                        <SelectValue placeholder="Select sub-category" />
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
                  <div>
                    <Label className="text-sm text-muted-foreground">Detail Category</Label>
                    <Select
                      value={selectedLevel3}
                      onValueChange={setSelectedLevel3}
                      disabled={!selectedLevel2}
                    >
                      <SelectTrigger data-testid="select-category-level3">
                        <SelectValue placeholder="Select detail" />
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
                </div>
                {category && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {category}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 5: SKU */}
          <Card>
            <CardHeader>
              <CardTitle>SKU</CardTitle>
              <CardDescription>Stock keeping unit identifier</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} placeholder="APP-A3X9K2" data-testid="input-sku" />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleGenerateSKU}
                        data-testid="button-generate-sku"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 6: RRP & Wholesale Price */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Retail and wholesale pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rrp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RRP (Recommended Retail Price)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-rrp" />
                      </FormControl>
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
                        <Input {...field} type="number" step="0.01" data-testid="input-wholesale-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 7: MOQ */}
          <Card>
            <CardHeader>
              <CardTitle>Minimum Order Quantity</CardTitle>
              <CardDescription>Applies across all variants</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="moq"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MOQ</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-moq" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 8: Enable Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Product Variants</CardTitle>
              <CardDescription>Enable size and color options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enableVariants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        data-testid="switch-enable-variants"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Enable Size & Color Variants</FormLabel>
                  </FormItem>
                )}
              />

              {/* Section 9: Sizes & Colors (conditional) */}
              {enableVariants && (
                <div className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="sizes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sizes (comma-separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="S, M, L, XL" data-testid="input-sizes" />
                        </FormControl>
                        <FormDescription>Enter sizes separated by commas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="colors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Colors (comma-separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Red, Blue, Green, Black" data-testid="input-colors" />
                        </FormControl>
                        <FormDescription>Enter colors separated by commas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 10: Stock Available */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Available</CardTitle>
              <CardDescription>Current inventory level</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Level</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-stock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 11: Product Readiness */}
          <Card>
            <CardHeader>
              <CardTitle>Product Readiness</CardTitle>
              <CardDescription>When will the product be ready?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="readinessType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="days" id="readiness-days" data-testid="radio-readiness-days" />
                          <Label htmlFor="readiness-days" className="cursor-pointer">
                            Days after purchase
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="date" id="readiness-date" data-testid="radio-readiness-date" />
                          <Label htmlFor="readiness-date" className="cursor-pointer">
                            Fixed delivery date
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="readinessValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {readinessType === "days" ? "Number of Days" : "Delivery Date"}
                    </FormLabel>
                    <FormControl>
                      {readinessType === "days" ? (
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="e.g., 7" 
                          data-testid="input-readiness-days-value" 
                        />
                      ) : (
                        <Input 
                          {...field} 
                          type="date" 
                          data-testid="input-readiness-date-value" 
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 12: Deposit */}
          <Card>
            <CardHeader>
              <CardTitle>Deposit Requirements</CardTitle>
              <CardDescription>Require upfront deposit payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="requiresDeposit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        data-testid="switch-requires-deposit"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Requires Deposit Payment</FormLabel>
                  </FormItem>
                )}
              />

              {requiresDeposit && (
                <FormField
                  control={form.control}
                  name="depositPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Percentage</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max="100" 
                          placeholder="e.g., 30"
                          data-testid="input-deposit-percentage" 
                        />
                      </FormControl>
                      <FormDescription>Percentage of total order value (0-100)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Section 13: Warehouse Address */}
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Address</CardTitle>
              <CardDescription>Ship from location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="shipFromStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-ship-from-street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shipFromCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-ship-from-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipFromCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ship-from-country">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="IT">Italy</SelectItem>
                          <SelectItem value="ES">Spain</SelectItem>
                          <SelectItem value="CN">China</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 14: Terms & Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>Upload your terms and conditions document</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="termsAndConditionsUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="space-y-4">
                        {!field.value && (
                          <div
                            {...getTCRootProps()}
                            className={cn(
                              'border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
                              isTCDragActive
                                ? 'border-primary bg-primary/5'
                                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                              uploadingTC && 'opacity-50 cursor-not-allowed'
                            )}
                            data-testid="dropzone-terms"
                          >
                            <input {...getTCInputProps()} data-testid="input-terms-file" />
                            <div className="flex flex-col items-center justify-center gap-2 text-center">
                              {uploadingTC ? (
                                <>
                                  <FileText className="w-10 h-10 text-muted-foreground animate-pulse" />
                                  <p className="text-sm text-muted-foreground">Uploading {tcFileName}...</p>
                                </>
                              ) : isTCDragActive ? (
                                <>
                                  <FileText className="w-10 h-10 text-primary" />
                                  <p className="text-sm text-primary font-medium">Drop file here</p>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-10 h-10 text-muted-foreground" />
                                  <p className="text-sm font-medium">Drag & drop T&C file here</p>
                                  <p className="text-xs text-muted-foreground">
                                    or click to browse
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    PDF, DOC, DOCX
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {field.value && (
                          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{tcFileName || "Terms & Conditions"}</p>
                              <p className="text-xs text-muted-foreground">{field.value}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                field.onChange("");
                                setTcFileName("");
                              }}
                              data-testid="button-remove-terms"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/wholesale/products">
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
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
    </div>
  );
}
