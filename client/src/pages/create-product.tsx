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
import { BulkImageInput } from "@/components/bulk-image-input";
import { cn } from "@/lib/utils";
import { ProductFormFields } from "@/components/product-form-fields";

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
  const [discountPercentage, setDiscountPercentage] = useState<string>("");
  const [promotionEndDate, setPromotionEndDate] = useState<string>("");
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
            <ProductFormFields
              form={form}
              variants={variants}
              setVariants={setVariants}
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

