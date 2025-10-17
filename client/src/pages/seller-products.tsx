import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Product } from "@shared/schema";
import { Plus, Pencil, Trash2, Megaphone, Upload, CreditCard, Eye, EyeOff, Archive, AlertCircle, Sparkles, MoreVertical, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { formatPrice } from "@/lib/currency-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function SellerProducts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/seller/products"],
  });
  
  const { data: user } = useQuery<any>({ 
    queryKey: ["/api/auth/user"] 
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      toast({
        title: "Product deleted",
        description: "The product has been removed from your store.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ productId, status }: { productId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/products/${productId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      toast({
        title: "Status updated",
        description: "Product status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product status",
        variant: "destructive",
      });
    },
  });

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case "in-stock":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
      case "pre-order":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Pre-Order</Badge>;
      case "made-to-order":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Made to Order</Badge>;
      case "wholesale":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Wholesale</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string = 'draft') => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 w-fit">
            <Eye className="h-3 w-3" />
            Active
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            Draft
          </Badge>
        );
      case "coming-soon":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1 w-fit">
            <Sparkles className="h-3 w-3" />
            Coming Soon
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1 w-fit">
            <EyeOff className="h-3 w-3" />
            Paused
          </Badge>
        );
      case "out-of-stock":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 flex items-center gap-1 w-fit">
            <AlertCircle className="h-3 w-3" />
            Out of Stock
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="flex items-center gap-1 w-fit text-muted-foreground">
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        );
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const filteredProducts = products?.filter((product) => {
    if (statusFilter === "all") return true;
    return (product.status || 'draft') === statusFilter;
  });

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <BackToDashboard />
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
              Products
            </h1>
            <p className="text-muted-foreground">
              Manage your product catalog
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/seller/bulk-upload")}
              data-testid="button-bulk-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button
              onClick={() => setLocation("/seller/create-product")}
              data-testid="button-create-product"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
          </div>
        </div>
        
        {/* Status Filter */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Filter by Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="coming-soon">Coming Soon</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            {statusFilter !== "all" && (
              <span className="text-sm text-muted-foreground">
                {filteredProducts?.length || 0} of {products?.length || 0} products
              </span>
            )}
          </div>
        </Card>
        
        {user && !user.stripeConnectedAccountId && (
          <Alert variant="destructive" className="mb-6" data-testid="alert-stripe-not-connected">
            <CreditCard className="h-4 w-4" />
            <AlertTitle>Connect Payment Provider</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>
                You must connect a payment provider before customers can purchase your products. 
                Go to Settings to connect Stripe.
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/settings")}
                data-testid="button-setup-payments"
              >
                Setup now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-32 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover-elevate transition-all" data-testid={`product-row-${product.id}`}>
                <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full md:w-24 md:h-24 aspect-square object-cover rounded-md"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>

                    {/* Badges & Price */}
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(product.status || undefined)}
                      {getProductTypeBadge(product.productType)}
                      <span className="font-semibold text-lg">{formatPrice(parseFloat(product.price), user?.listingCurrency)}</span>
                      {product.productType === "in-stock" && (
                        <Badge variant="outline" className="text-xs">
                          Stock: {product.stock}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2 flex-shrink-0">
                    <div className="flex flex-wrap gap-2 flex-1 md:flex-initial">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-status-menu-${product.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ productId: product.id, status: "active" })}
                                data-testid={`menu-item-active-${product.id}`}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4 text-green-600" />
                                <span>Active</span>
                                {product.status === "active" && <Check className="h-4 w-4 ml-auto" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ productId: product.id, status: "draft" })}
                                data-testid={`menu-item-draft-${product.id}`}
                                className="gap-2"
                              >
                                <span className="w-4" />
                                <span>Draft</span>
                                {(!product.status || product.status === "draft") && <Check className="h-4 w-4 ml-auto" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ productId: product.id, status: "coming-soon" })}
                                data-testid={`menu-item-coming-soon-${product.id}`}
                                className="gap-2"
                              >
                                <Sparkles className="h-4 w-4 text-blue-600" />
                                <span>Coming Soon</span>
                                {product.status === "coming-soon" && <Check className="h-4 w-4 ml-auto" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ productId: product.id, status: "paused" })}
                                data-testid={`menu-item-paused-${product.id}`}
                                className="gap-2"
                              >
                                <EyeOff className="h-4 w-4 text-yellow-600" />
                                <span>Paused</span>
                                {product.status === "paused" && <Check className="h-4 w-4 ml-auto" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ productId: product.id, status: "out-of-stock" })}
                                data-testid={`menu-item-out-of-stock-${product.id}`}
                                className="gap-2"
                              >
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <span>Out of Stock</span>
                                {product.status === "out-of-stock" && <Check className="h-4 w-4 ml-auto" />}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ productId: product.id, status: "archived" })}
                                data-testid={`menu-item-archived-${product.id}`}
                                className="gap-2"
                              >
                                <Archive className="h-4 w-4 text-muted-foreground" />
                                <span>Archive</span>
                                {product.status === "archived" && <Check className="h-4 w-4 ml-auto" />}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation('/meta-ads/create')}
                            data-testid={`button-promote-${product.id}`}
                            className="gap-1"
                          >
                            <Megaphone className="h-4 w-4" />
                            Promote
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation(`/seller/products/${product.id}/edit`)}
                            data-testid={`button-edit-${product.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-${product.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(product.id)}
                                  data-testid={`button-confirm-delete-${product.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {statusFilter !== "all" ? `No ${statusFilter} products` : "No products yet"}
              </p>
              {statusFilter !== "all" ? (
                <Button variant="outline" onClick={() => setStatusFilter("all")} data-testid="button-clear-filter">
                  Clear Filter
                </Button>
              ) : (
                <Button onClick={() => setLocation("/seller/create-product")} data-testid="button-create-first-product">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Product
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
