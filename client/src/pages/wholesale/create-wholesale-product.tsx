import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import { ProductFormFields } from "@/components/product-form-fields";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
}

// Generate SKU in format: XYZ-A3X9K2
function generateSKU(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  let sku = '';
  for (let i = 0; i < 3; i++) {
    sku += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  sku += '-';
  for (let i = 0; i < 6; i++) {
    sku += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
  }
  return sku;
}

export default function CreateWholesaleProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State for ProductFormFields (variant management)
  const [hasColors, setHasColors] = useState(false);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  
  // Category hierarchy state
  const [selectedLevel1, setSelectedLevel1] = useState("");
  const [selectedLevel2, setSelectedLevel2] = useState("");
  const [selectedLevel3, setSelectedLevel3] = useState("");
  
  // Dummy retail-only state (required by ProductFormFields but not used in wholesale mode)
  const [madeToOrderDays, setMadeToOrderDays] = useState(7);
  const [preOrderDate, setPreOrderDate] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [promotionEndDate, setPromotionEndDate] = useState("");
  
  // Form initialization
  const form = useForm({
    defaultValues: {
      useExistingProduct: false,
      productId: "",
      name: "",
      description: "",
      images: [],
      category: "",
      sku: "",
      rrp: "",
      wholesalePrice: "",
      moq: "",
      stock: "",
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
  
  // Fetch categories for ProductFormFields
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2 && c.parentId === selectedLevel1);
  const level3Categories = categories.filter(c => c.level === 3 && c.parentId === selectedLevel2);
  
  // SKU generation handler
  const handleGenerateSKU = () => {
    const sku = generateSKU();
    form.setValue("sku", sku);
    toast({
      title: "SKU Generated",
      description: sku,
    });
  };
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
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
      
      // Transform data for backend
      const payload: any = {
        name: data.name,
        description: data.description,
        image: data.images[0],
        images: data.images,
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
      
      if (data.useExistingProduct && data.productId) {
        payload.productId = data.productId;
      }
      
      if (data.enableVariants) {
        if (data.sizes) payload.sizes = data.sizes;
        if (data.colors) payload.colors = data.colors;
      }

      return await apiRequest('POST', '/api/wholesale/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/products"] });
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
  
  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };
  
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/wholesale/products")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <h1 className="text-4xl font-bold mb-2">Create Wholesale Product</h1>
          <p className="text-muted-foreground">
            Add a new B2B wholesale product
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <ProductFormFields
              form={form}
              mode="wholesale"
              onGenerateSKU={handleGenerateSKU}
              hasColors={hasColors}
              setHasColors={setHasColors}
              sizes={sizes}
              setSizes={setSizes}
              colors={colors}
              setColors={setColors}
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
            
            <div className="flex justify-end gap-4">
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
                {createMutation.isPending ? "Creating..." : "Create Product"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
