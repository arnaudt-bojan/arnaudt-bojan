import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Order } from "@shared/schema";
import { Package, DollarSign, ShoppingBag, TrendingUp, Plus, LayoutGrid, Mail, Store, Share2, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { ShareStoreModal } from "@/components/share-store-modal";
import { OnboardingModal } from "@/components/onboarding-modal";
import { SubscriptionPricingDialog } from "@/components/subscription-pricing-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SellerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/seller/orders"],
  });
  
  const { data: user } = useQuery<any>({ 
    queryKey: ["/api/auth/user"] 
  });

  // Show onboarding modal for new sellers without Instagram or custom domain
  useEffect(() => {
    if (user && !user.instagramUsername && !user.customDomain) {
      // Check if this specific user has seen onboarding before (scoped by user ID)
      const hasSeenOnboarding = localStorage.getItem(`hasSeenOnboarding:${user.id}`);
      if (!hasSeenOnboarding) {
        setOnboardingModalOpen(true);
      }
    }
  }, [user]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "shipped":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Store toggle functionality
  const handleStoreToggle = (checked: boolean) => {
    if (checked) {
      // Activating store - check subscription
      const hasActiveSubscription = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trial';
      
      if (!hasActiveSubscription) {
        // No active subscription - show pricing dialog
        setShowSubscriptionDialog(true);
        return;
      }
    }
    
    // Either deactivating or has active subscription - proceed with toggle
    toggleStoreMutation.mutate(checked ? 1 : 0);
  };

  const toggleStoreMutation = useMutation({
    mutationFn: async (storeActive: number) => {
      const response = await apiRequest("PATCH", "/api/user/store-status", { storeActive });
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json();
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      const previousUser = queryClient.getQueryData(["/api/auth/user"]);
      // Toggle is disabled when !user, so old should always exist
      queryClient.setQueryData(["/api/auth/user"], (old: any) => ({
        ...old,
        storeActive: newStatus,
      }));
      return { previousUser };
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables === 1 ? "Store activated" : "Store deactivated",
        description: variables === 1
          ? "Your store is now visible to customers" 
          : "Your store is now hidden from customers",
      });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/auth/user"], context.previousUser);
      }
      
      // If backend says subscription required, show the pricing dialog
      if (error.requiresSubscription) {
        toast({
          title: "Subscription Required",
          description: error.message || "You need an active subscription to activate your store",
          variant: "destructive",
        });
        setShowSubscriptionDialog(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update store status",
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
                Seller Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage your orders and track your sales
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShareModalOpen(true)}
                data-testid="button-share-store"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Store
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/seller/products")}
                data-testid="button-manage-products"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Products
              </Button>
              <Button
                onClick={() => setLocation("/seller/create-product")}
                data-testid="button-create-product"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Product
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/seller/wholesale/products")}
                data-testid="button-wholesale"
              >
                <Store className="h-4 w-4 mr-2" />
                Wholesale
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/newsletter")}
                data-testid="button-newsletter"
              >
                <Mail className="h-4 w-4 mr-2" />
                Newsletters
              </Button>
            </div>
          </div>
          
          {/* Store Status Toggle */}
          <div className="flex items-center justify-between gap-4 mb-6 bg-card border rounded-lg px-6 py-4">
            <div className="flex items-center gap-4">
              <Store className="h-6 w-6 text-muted-foreground" />
              <div>
                <Label htmlFor="dashboard-store-active" className="text-base font-semibold cursor-pointer">
                  Store Status
                </Label>
                <p className="text-sm text-muted-foreground">
                  {user?.storeActive === 1 ? "Your store is live and visible to customers" : "Your store is inactive and hidden from customers"}
                </p>
              </div>
            </div>
            <Switch
              id="dashboard-store-active"
              checked={user?.storeActive === 1}
              onCheckedChange={handleStoreToggle}
              disabled={toggleStoreMutation.isPending || !user}
              data-testid="switch-dashboard-store-active"
            />
          </div>

          {user?.subscriptionStatus === 'trial' && user.trialEndsAt && (
            <Alert className="mb-6 border-blue-500/50 bg-blue-500/10" data-testid="alert-trial-active">
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>Free Trial Active</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>
                  Your free trial ends on {new Date(user.trialEndsAt).toLocaleDateString()}. 
                  Choose your subscription plan in settings to continue after trial.
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation("/settings?tab=subscription")}
                  data-testid="button-choose-plan"
                >
                  Choose Plan
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {user && !user.stripeConnectedAccountId && (
            <Alert variant="destructive" className="mb-6" data-testid="alert-stripe-not-connected">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Payment Setup Required</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>
                  You must connect a payment provider before customers can purchase your products. 
                  Without this, customers won't be able to complete checkout.
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation("/settings?tab=payment")}
                  data-testid="button-setup-payments"
                >
                  Setup Payments
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${totalRevenue.toFixed(2)}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Orders</span>
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-orders">
              {totalOrders}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Pending Orders</span>
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="text-pending-orders">
              {pendingOrders}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Avg Order Value</span>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold" data-testid="text-avg-order">
              ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00"}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Recent Orders</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      data-testid={`order-row-${order.id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setLocation(`/seller/order/${order.id}`)}
                    >
                      <TableCell className="font-medium">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.customerEmail}</TableCell>
                      <TableCell className="font-semibold">
                        ${parseFloat(order.total).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusVariant(order.status)} border no-default-hover-elevate no-default-active-elevate`}
                          data-testid={`badge-status-${order.id}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground">
                Orders will appear here once customers start purchasing
              </p>
            </div>
          )}
        </Card>
      </div>
      <ShareStoreModal open={shareModalOpen} onOpenChange={setShareModalOpen} />
      <OnboardingModal 
        open={onboardingModalOpen} 
        onClose={() => {
          setOnboardingModalOpen(false);
          if (user?.id) {
            localStorage.setItem(`hasSeenOnboarding:${user.id}`, 'true');
          }
        }} 
      />
      <SubscriptionPricingDialog 
        open={showSubscriptionDialog} 
        onOpenChange={setShowSubscriptionDialog} 
      />
    </div>
  );
}
