import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { frontendProductSchema, type FrontendProduct, type Product } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package } from "lucide-react";
import { ProductFormFields, type ProductVariant } from "@/components/product-form-fields";

export default function EditProduct() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [madeToOrderDays, setMadeToOrderDays] = useState<number>(7);
  const [preOrderDate, setPreOrderDate] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState<string>("");
  const [promotionEndDate, setPromotionEndDate] = useState<string>("");

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });

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


  // Update form when product data loads
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        category: product.category,
        productType: product.productType,
        stock: product.stock || 0,
        depositAmount: product.depositAmount || undefined,
        requiresDeposit: product.requiresDeposit || 0,
      });
      
      // Load variants if they exist
      if (product.variants && Array.isArray(product.variants)) {
        setVariants(product.variants as ProductVariant[]);
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
    }
  }, [product, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: FrontendProduct) => {
      // Add variants if any
      if (variants.length > 0) {
        (data as any).variants = variants;
      } else {
        (data as any).variants = null;
      }
      
      // Add readiness dates based on product type
      if (data.productType === "made-to-order") {
        (data as any).madeToOrderDays = madeToOrderDays;
      } else {
        (data as any).madeToOrderDays = null;
      }
      
      if (data.productType === "pre-order" && preOrderDate) {
        (data as any).preOrderDate = new Date(preOrderDate).toISOString();
      } else {
        (data as any).preOrderDate = null;
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
      
      return await apiRequest("PUT", `/api/products/${id}`, data);
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
    updateMutation.mutate(data);
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
