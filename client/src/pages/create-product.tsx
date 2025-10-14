import { useState, useEffect } from "react";
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
import { BulkImageInput } from "@/components/bulk-image-input";
import { cn } from "@/lib/utils";
import { ProductFormFields } from "@/components/product-form-fields";
import { SimpleVariantManager, type SizeVariant, type ColorVariant } from "@/components/simple-variant-manager";

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
    label: "Trade",
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
  
  // New variant system
  const [hasColors, setHasColors] = useState(false);
  const [sizes, setSizes] = useState<SizeVariant[]>([]);
  const [colors, setColors] = useState<ColorVariant[]>([]);
  
  const [madeToOrderDays, setMadeToOrderDays] = useState<number>(0);
  const [preOrderDate, setPreOrderDate] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState<string>("");
  const [promotionEndDate, setPromotionEndDate] = useState<string>("");
  const [selectedLevel1, setSelectedLevel1] = useState<string>("");
  const [selectedLevel2, setSelectedLevel2] = useState<string>("");
  const [selectedLevel3, setSelectedLevel3] = useState<string>("");

  const { data: categories = [], refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Fetch payment setup status
  const { data: paymentSetup } = useQuery<{
    hasStripeConnected: boolean;
    currency: string;
    stripeChargesEnabled: boolean;
  }>({
    queryKey: ["/api/seller/payment-setup"],
  });
  
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
      stock: undefined,
      depositAmount: undefined,
      requiresDeposit: 0,
      status: "active",
    },
  });

  const selectedType = form.watch("productType");

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
    // Note: We don't set to empty when all levels are cleared to avoid premature validation errors
    // The form schema will catch empty category on submit
  }, [selectedLevel1, selectedLevel2, selectedLevel3, categories, form]);


  const createMutation = useMutation({
    mutationFn: async (data: FrontendProduct) => {
      // For pre-orders and made-to-order with deposit, set requiresDeposit flag
      if ((data.productType === "pre-order" || data.productType === "made-to-order") && data.depositAmount && parseFloat(data.depositAmount as string) > 0) {
        data.requiresDeposit = 1;
      } else {
        data.requiresDeposit = 0;
        data.depositAmount = undefined;
      }
      
      // Handle discount/promotion
      if (discountPercentage && parseFloat(discountPercentage) > 0) {
        (data as any).promotionActive = 1;
        (data as any).discountPercentage = discountPercentage;
        if (promotionEndDate) {
          (data as any).promotionEndDate = new Date(promotionEndDate).toISOString();
        } else {
          (data as any).promotionEndDate = null;
        }
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
      
      // Add multiple images from additionalImages field
      const additionalImages = form.getValues("additionalImages" as any) || [];
      const validImages = additionalImages.filter((img: string) => img.trim() !== "");
      if (validImages.length > 0) {
        (data as any).images = validImages;
        data.image = validImages[0]; // Set first image as primary (hero)
      }
      
      // Add variants based on mode
      if (hasColors) {
        // Color mode: store color variants with their sizes
        if (colors.length > 0) {
          (data as any).variants = colors;
          (data as any).hasColors = 1; // Convert boolean to number
        }
      } else {
        // Size-only mode: store simple size array
        if (sizes.length > 0) {
          (data as any).variants = sizes;
          (data as any).hasColors = 0; // Convert boolean to number
        }
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
    // Validate made-to-order production time
    if (data.productType === "made-to-order" && (!madeToOrderDays || madeToOrderDays <= 0)) {
      toast({
        title: "Validation Error",
        description: "Estimated Production Time is required for made-to-order products",
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate(data);
  };

  const onError = (errors: any) => {
    // Find the first error field and scroll to it
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus the element for better UX
        (element as HTMLElement).focus();
      }
    }
    
    // Show toast with first error message
    const firstErrorMessage = errors[firstError]?.message || "Please fix the errors in the form";
    toast({
      title: "Validation Error",
      description: firstErrorMessage,
      variant: "destructive",
    });
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
          
          {!paymentSetup?.hasStripeConnected && (
            <div className="mt-4 p-4 border border-yellow-600/20 bg-yellow-600/10 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                <strong>Currency Notice:</strong> Your product prices will be charged in the currency configured in your Stripe account. 
                Please complete your Stripe setup in Settings to ensure the correct currency is used.
              </p>
            </div>
          )}
          
          {paymentSetup?.hasStripeConnected && (
            <div className="mt-4 p-4 border border-blue-600/20 bg-blue-600/10 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-500">
                <strong>Currency:</strong> Products will be listed in {paymentSetup.currency} (from your Stripe account settings)
              </p>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
            <ProductFormFields
              form={form}
              hasColors={hasColors}
              setHasColors={setHasColors}
              sizes={sizes}
              setSizes={setSizes}
              colors={colors}
              setColors={setColors}
              mainProductImages={form.watch("additionalImages" as any) || []}
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
              currency={paymentSetup?.currency}
            />

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

