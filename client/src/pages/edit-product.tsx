import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { frontendProductSchema, type FrontendProduct } from "@shared/validation-schemas";
import type { Product } from "@shared/prisma-types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package } from "lucide-react";
import { ProductFormFields } from "@/components/product-form-fields";
import { type SizeVariant, type ColorVariant } from "@/components/simple-variant-manager";

export default function EditProduct() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // New variant system
  const [hasColors, setHasColors] = useState(false);
  const [sizes, setSizes] = useState<SizeVariant[]>([]);
  const [colors, setColors] = useState<ColorVariant[]>([]);
  const [madeToOrderDays, setMadeToOrderDays] = useState<number>(0);
  const [preOrderDate, setPreOrderDate] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState<string>("");
  const [promotionEndDate, setPromotionEndDate] = useState<string>("");
  
  // Category hierarchy state (FIX: These were missing!)
  const [selectedLevel1, setSelectedLevel1] = useState<string>("");
  const [selectedLevel2, setSelectedLevel2] = useState<string>("");
  const [selectedLevel3, setSelectedLevel3] = useState<string>("");

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });
  
  // Fetch categories (FIX: This was missing!)
  interface Category {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    level: number;
  }
  const { data: categories = [], refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Filter categories by level (FIX: This was missing!)
  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2 && c.parentId === selectedLevel1);
  const level3Categories = categories.filter(c => c.level === 3 && c.parentId === selectedLevel2);

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


  // Update form when product data loads (run when product.id changes, which means new product loaded)
  useEffect(() => {
    if (product) {
      form.reset({
        // Basic info
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        category: product.category,
        sku: product.sku || undefined,
        
        // Product type and stock
        productType: product.productType,
        stock: product.stock || 0,
        status: product.status || "draft",
        
        // Deposit
        depositAmount: product.depositAmount || undefined,
        requiresDeposit: product.requiresDeposit || 0,
        
        // Images
        images: product.images || [],
        
        // Shipping fields (FIX: These were missing!)
        shippingType: product.shippingType || "flat",
        flatShippingRate: product.flatShippingRate || undefined,
        shippingMatrixId: product.shippingMatrixId || undefined,
        shippoWeight: product.shippoWeight || undefined,
        shippoLength: product.shippoLength || undefined,
        shippoWidth: product.shippoWidth || undefined,
        shippoHeight: product.shippoHeight || undefined,
        shippoTemplate: product.shippoTemplate || undefined,
        
        // Category hierarchy (FIX: These were missing!)
        categoryLevel1Id: product.categoryLevel1Id || undefined,
        categoryLevel2Id: product.categoryLevel2Id || undefined,
        categoryLevel3Id: product.categoryLevel3Id || undefined,
        
        // Promotion fields (FIX: promotionActive was missing!)
        promotionActive: product.promotionActive || 0,
      } as any);
      
      // Load variants if they exist
      if (product.variants && Array.isArray(product.variants)) {
        const hasColorsFlag = (product as any).hasColors;
        const firstVariant = product.variants[0];
        
        // Handle new color-based variants
        if (hasColorsFlag && firstVariant?.colorName) {
          setHasColors(true);
          setColors(product.variants as ColorVariant[]);
        }
        // Handle new size-only variants
        else if (!hasColorsFlag && firstVariant?.size && !firstVariant.color) {
          setHasColors(false);
          setSizes(product.variants as SizeVariant[]);
        }
        // Handle LEGACY variants (old structure with {size, color, stock, image})
        else if (firstVariant?.color || firstVariant?.image) {
          // Legacy variants have color - convert to new color-based structure
          const legacyVariants = product.variants as any[];
          
          // Group by color
          const colorMap = new Map<string, { sizes: SizeVariant[], images: string[] }>();
          
          for (const v of legacyVariants) {
            const colorKey = v.color || 'default';
            if (!colorMap.has(colorKey)) {
              colorMap.set(colorKey, { sizes: [], images: [] });
            }
            const colorData = colorMap.get(colorKey)!;
            
            // Add size
            if (v.size) {
              colorData.sizes.push({ size: v.size, stock: v.stock || 0 });
            }
            
            // Add image if present
            if (v.image && !colorData.images.includes(v.image)) {
              colorData.images.push(v.image);
            }
          }
          
          // Convert to new color variant structure
          if (colorMap.size > 1 || (colorMap.size === 1 && Array.from(colorMap.keys())[0] !== 'default')) {
            // Has multiple colors or explicit color - use color mode
            const convertedColors: ColorVariant[] = [];
            Array.from(colorMap.entries()).forEach(([colorName, colorData]) => {
              convertedColors.push({
                colorName,
                colorHex: '#000000', // Default color, user can change
                images: colorData.images,
                sizes: colorData.sizes,
              });
            });
            setHasColors(true);
            setColors(convertedColors);
          } else {
            // Only one color or no color - convert to size-only mode
            const allSizes: SizeVariant[] = [];
            Array.from(colorMap.values()).forEach(colorData => {
              allSizes.push(...colorData.sizes);
            });
            setHasColors(false);
            setSizes(allSizes);
          }
        }
      }
      
      // Load readiness dates
      if (product.madeToOrderDays) {
        setMadeToOrderDays(product.madeToOrderDays);
      }
      if (product.preOrderDate) {
        const date = new Date(product.preOrderDate);
        setPreOrderDate(date.toISOString().split('T')[0]);
      }
      
      // Load discount/promotion data
      if (product.discountPercentage) {
        setDiscountPercentage(product.discountPercentage);
      }
      if (product.promotionEndDate) {
        const date = new Date(product.promotionEndDate);
        setPromotionEndDate(date.toISOString().split('T')[0]);
      }
      
      // Load category hierarchy (FIX: This was missing!)
      if (product.categoryLevel1Id) {
        setSelectedLevel1(product.categoryLevel1Id);
      }
      if (product.categoryLevel2Id) {
        setSelectedLevel2(product.categoryLevel2Id);
      }
      if (product.categoryLevel3Id) {
        setSelectedLevel3(product.categoryLevel3Id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]); // Run when product.id changes (new product loaded), not when product object reference changes
  
  // Update form category field when category selections change (FIX: This was missing!)
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
      form.setValue("category", categoryValue);
    }
  }, [selectedLevel1, selectedLevel2, selectedLevel3, categories, form]);

  const updateMutation = useMutation({
    mutationFn: async (dataWithVariants: any) => {
      // Data already has variants, hasColors, dates, and promotions added in onSubmit
      return await apiRequest("PUT", `/api/products/${id}`, dataWithVariants);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", id] });
      toast({
        title: "Product updated",
        description: "Your product has been updated successfully.",
      });
      setLocation("/seller/products");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FrontendProduct) => {
    // Add pre-order date BEFORE validation
    if (data.productType === "pre-order") {
      if (!preOrderDate) {
        toast({
          title: "Validation Error",
          description: "Expected Delivery Date is required for pre-order products",
          variant: "destructive",
        });
        return;
      }
      (data as any).preOrderDate = new Date(preOrderDate).toISOString();
    }
    
    // Add made-to-order days BEFORE validation
    if (data.productType === "made-to-order") {
      if (!madeToOrderDays || madeToOrderDays <= 0) {
        toast({
          title: "Validation Error",
          description: "Estimated Production Time is required for made-to-order products",
          variant: "destructive",
        });
        return;
      }
      (data as any).madeToOrderDays = madeToOrderDays;
    }
    
    // Create full data object with FRESH state (avoiding closure staleness)
    const fullData = { ...data } as any;
    
    // Add variants based on mode (using FRESH state from component scope)
    if (hasColors) {
      if (colors.length > 0) {
        fullData.variants = colors;
        fullData.hasColors = 1;
      } else {
        fullData.variants = null;
        fullData.hasColors = 0;
      }
    } else {
      if (sizes.length > 0) {
        fullData.variants = sizes;
        fullData.hasColors = 0;
      } else {
        fullData.variants = null;
        fullData.hasColors = 0;
      }
    }
    
    // Note: preOrderDate and madeToOrderDays are now added earlier in onSubmit before validation
    // Just need to clear them if product type changed
    if (data.productType !== "made-to-order") {
      fullData.madeToOrderDays = null;
    }
    
    if (data.productType !== "pre-order") {
      fullData.preOrderDate = null;
    }
    
    // Handle deposit for pre-order and made-to-order
    if ((data.productType === "pre-order" || data.productType === "made-to-order") && data.depositAmount && parseFloat(data.depositAmount as string) > 0) {
      fullData.requiresDeposit = 1;
    } else {
      fullData.requiresDeposit = 0;
      fullData.depositAmount = undefined;
    }
    
    // Add category IDs (FIX: This was missing!)
    fullData.categoryLevel1Id = selectedLevel1 || null;
    fullData.categoryLevel2Id = selectedLevel2 || null;
    fullData.categoryLevel3Id = selectedLevel3 || null;
    
    // Handle discount/promotion
    if (discountPercentage && parseFloat(discountPercentage) > 0) {
      fullData.promotionActive = 1;
      fullData.discountPercentage = discountPercentage;
      if (promotionEndDate) {
        fullData.promotionEndDate = new Date(promotionEndDate).toISOString();
      } else {
        fullData.promotionEndDate = null;
      }
    } else {
      fullData.promotionActive = 0;
      fullData.discountPercentage = null;
      fullData.promotionEndDate = null;
    }
    
    updateMutation.mutate(fullData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Skeleton className="h-8 w-48 mb-8" />
          <Card className="p-8">
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product not found</h1>
            <Button onClick={() => setLocation("/seller/products")}>
              Back to Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/seller/products")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Edit Product
          </h1>
          <p className="text-muted-foreground">
            Update your product information
          </p>
        </div>

        <Card className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <ProductFormFields
                form={form}
                hasColors={hasColors}
                setHasColors={setHasColors}
                sizes={sizes}
                setSizes={setSizes}
                colors={colors}
                setColors={setColors}
                mainProductImages={product?.images || []}
                madeToOrderDays={madeToOrderDays}
                setMadeToOrderDays={setMadeToOrderDays}
                preOrderDate={preOrderDate}
                setPreOrderDate={setPreOrderDate}
                discountPercentage={discountPercentage}
                setDiscountPercentage={setDiscountPercentage}
                promotionEndDate={promotionEndDate}
                setPromotionEndDate={setPromotionEndDate}
                selectedLevel1={selectedLevel1}
                setSelectedLevel1={setSelectedLevel1}
                selectedLevel2={selectedLevel2}
                setSelectedLevel2={setSelectedLevel2}
                selectedLevel3={selectedLevel3}
                setSelectedLevel3={setSelectedLevel3}
                level1Categories={level1Categories}
                level2Categories={level2Categories}
                level3Categories={level3Categories}
                categories={categories}
                refetchCategories={refetchCategories}
              />

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-product"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Product"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/seller/products")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
