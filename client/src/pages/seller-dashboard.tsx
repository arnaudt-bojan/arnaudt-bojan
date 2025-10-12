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
import { Package, DollarSign, ShoppingBag, TrendingUp, Plus, LayoutGrid, Mail, Store, Share2, AlertTriangle, Users, Megaphone, FileText, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { ShareStoreModal } from "@/components/share-store-modal";
import { OnboardingModal } from "@/components/onboarding-modal";
import { SubscriptionPricingDialog } from "@/components/subscription-pricing-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getStoreUrl } from "@/lib/store-url";
import { getCurrencySymbol, formatPrice } from "@/lib/currency-utils";

// Format price in seller's currency (no conversion, just display)
const formatDashboardPrice = (price: number, currency: string = 'USD') => {
  return formatPrice(price, currency);
};

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

  // Auto-activate store after successful subscription
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldActivateStore = params.get('activateStore') === 'true';
    const subscriptionStatus = params.get('subscription');
    
    if (subscriptionStatus === 'success' && shouldActivateStore && user) {
      const hasActiveSubscription = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trial';
      
      if (hasActiveSubscription && user.storeActive !== 1) {
        // Auto-activate the store
        toggleStoreMutation.mutate(1);
        
        // Clean up URL
        params.delete('activateStore');
        params.delete('subscription');
        const newUrl = params.toString() 
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } else if (subscriptionStatus === 'cancelled') {
      // Subscription was cancelled - store remains off
      toast({
        title: "Subscription Cancelled",
        description: "Your store remains inactive. You can subscribe anytime to activate it.",
        variant: "default",
      });
      
      // Clean up URL
      params.delete('subscription');
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [user, toast]);

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
        // No active subscription - show subscription dialog
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
  
  // Get seller's currency from user profile
  const sellerCurrency = user?.listingCurrency || 'USD';

  return (
    <div className="min-h-screen py-6 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
                Dashboard
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Manage your store, track sales, and grow your business
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!user?.username) {
                    toast({
                      title: "Set Up Your Store First",
                      description: "You need to configure your store username before previewing. Redirecting to Settings...",
                    });
                    setTimeout(() => {
                      setLocation("/settings");
                    }, 1500);
                    return;
                  }
                  // Open actual storefront URL - same as share link
                  // When owner visits, edit buttons will show. When buyers visit, they won't.
                  const storeUrl = getStoreUrl(user?.username);
                  if (storeUrl) {
                    window.open(storeUrl, '_blank');
                  }
                }}
                data-testid="button-preview-store"
                className="flex-1 md:flex-none"
                variant={!user?.username ? "outline" : "default"}
              >
                <Store className="h-4 w-4 mr-2" />
                {!user?.username ? "Set Up Store" : "Preview Store"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!user?.username) {
                    toast({
                      title: "Set Up Your Store First",
                      description: "You need to configure your store username before sharing. Redirecting to Settings...",
                    });
                    setTimeout(() => {
                      setLocation("/settings");
                    }, 1500);
                    return;
                  }
                  setShareModalOpen(true);
                }}
                data-testid="button-share-store"
                className="flex-1 md:flex-none"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/settings")}
                data-testid="button-advanced-settings"
                className="flex-1 md:flex-none"
              >
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Advanced Settings</span>
                <span className="sm:hidden">Settings</span>
              </Button>
            </div>
          </div>
          
          {/* Store Status Toggle */}
          <Card className="mb-6 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${user?.storeActive === 1 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <Store className={`h-6 w-6 ${user?.storeActive === 1 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <Label htmlFor="dashboard-store-active" className="text-base font-semibold cursor-pointer">
                    Store Status
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.storeActive === 1 
                      ? "Your store is live and visible to customers" 
                      : (user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trial')
                        ? "Your store is inactive and hidden from customers"
                        : "Your store is inactive. Subscribe to activate and start selling"}
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
          </Card>

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
          
          {user && (!user.stripeConnectedAccountId || !user.stripeChargesEnabled) && (
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

          {/* Quick Actions */}
          <div className="mb-6 md:mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-4">
              <Card
                className="p-4 md:p-6 cursor-pointer transition-all hover-elevate active-elevate-2"
                onClick={() => setLocation("/seller/create-product")}
                data-testid="button-create-product"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Plus className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold">Create Product</span>
                </div>
              </Card>
              <Card
                className="p-4 md:p-6 cursor-pointer transition-all hover-elevate active-elevate-2"
                onClick={() => setLocation("/seller/products")}
                data-testid="button-manage-products"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <LayoutGrid className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold">My Products</span>
                </div>
              </Card>
              <Card
                className="p-4 md:p-6 cursor-pointer transition-all hover-elevate active-elevate-2"
                onClick={() => setLocation("/orders")}
                data-testid="button-orders"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <Package className="h-5 w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold">Orders</span>
                </div>
              </Card>
              <Card
                className="p-4 md:p-6 cursor-pointer transition-all hover-elevate active-elevate-2"
                onClick={() => setLocation("/seller/wholesale/products")}
                data-testid="button-wholesale"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Store className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold">Wholesale</span>
                </div>
              </Card>
              <Card
                className="p-4 md:p-6 cursor-pointer transition-all hover-elevate active-elevate-2"
                onClick={() => setLocation("/social-ads-setup")}
                data-testid="button-social-ads"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-orange-500/10">
                    <Megaphone className="h-5 w-5 md:h-6 md:w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold">Social Ads</span>
                </div>
              </Card>
              <Card
                className="p-4 md:p-6 cursor-pointer transition-all hover-elevate active-elevate-2"
                onClick={() => setLocation("/newsletter")}
                data-testid="button-newsletter"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-cyan-500/10">
                    <Mail className="h-5 w-5 md:h-6 md:w-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold">Newsletter</span>
                </div>
              </Card>
              <Card
                className="p-4 md:p-6 cursor-pointer transition-all hover-elevate active-elevate-2"
                onClick={() => setLocation("/order-management")}
                data-testid="button-order-management"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-pink-500/10">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold">Order Mgmt</span>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              <span className="text-xl font-bold text-muted-foreground" data-testid="text-currency-symbol">
                {getCurrencySymbol(sellerCurrency)}
              </span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              {formatDashboardPrice(totalRevenue, sellerCurrency)}
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
              <span className="text-xl font-bold text-muted-foreground">
                {getCurrencySymbol(sellerCurrency)}
              </span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-avg-order">
              {formatDashboardPrice(totalOrders > 0 ? (totalRevenue / totalOrders) : 0, sellerCurrency)}
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
                        {formatDashboardPrice(parseFloat(order.total), sellerCurrency)}
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
        activateStoreAfter={true}
      />
    </div>
  );
}
