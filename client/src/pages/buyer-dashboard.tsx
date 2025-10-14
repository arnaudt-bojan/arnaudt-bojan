import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingBag, AlertCircle, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import type { SelectOrder } from "@shared/schema";

export default function BuyerDashboard() {
  const [, navigate] = useLocation();

  const { data: user, isLoading: userLoading } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const { data: orders, isLoading: ordersLoading } = useQuery<SelectOrder[]>({
    queryKey: ["/api/orders/my-orders"],
    enabled: !!user,
  });

  // Check if user has wholesale access (accepted invitations)
  const { data: wholesaleAccess } = useQuery<{ hasAccess: boolean }>({
    queryKey: ["/api/wholesale/buyer/access"],
    enabled: !!user,
  });

  const hasWholesaleAccess = wholesaleAccess?.hasAccess ?? false;

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "deposit_paid":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "shipped":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "processing":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (userLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Login Required</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Please log in to view your orders. If you placed an order as a guest, log in with the email address you used during checkout.
            </p>
            <Button onClick={() => navigate("/email-login")} data-testid="button-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (ordersLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          My Orders
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName || user?.email}! View and track your orders.
        </p>
      </div>

      {hasWholesaleAccess && (
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              <div className="flex-1">
                <CardTitle className="text-xl">Wholesale B2B Catalog</CardTitle>
                <CardDescription>Access exclusive wholesale products with special pricing</CardDescription>
              </div>
              <Button 
                onClick={() => navigate("/wholesale/catalog")}
                data-testid="button-wholesale-catalog"
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                View Catalog
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {!orders || orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              You haven't placed any orders yet. Start shopping to see your orders here!
            </p>
            <Button onClick={() => navigate("/products")} data-testid="button-shop-now">
              Start Shopping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            return (
              <Card 
                key={order.id} 
                className="hover-elevate cursor-pointer" 
                onClick={() => navigate(`/orders/${order.id}`)}
                data-testid={`card-order-${order.id}`}
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={getPaymentStatusColor(order.paymentStatus || "pending")}>
                        {order.paymentStatus?.replace("_", " ")}
                      </Badge>
                      <Badge className={getOrderStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Items:</h4>
                    <div className="space-y-1">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm gap-2">
                          <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">${parseFloat(item.price).toFixed(2)}</span>
                            {item.originalPrice && item.discountAmount && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground line-through">
                                  ${parseFloat(item.originalPrice).toFixed(2)}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  Save ${parseFloat(item.discountAmount).toFixed(2)}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">${parseFloat(order.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount Paid:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ${parseFloat(order.amountPaid || "0").toFixed(2)}
                      </span>
                    </div>
                    {order.remainingBalance && parseFloat(order.remainingBalance) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          ${parseFloat(order.remainingBalance).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order.id}`);
                      }}
                      data-testid={`button-view-order-${order.id}`}
                    >
                      <Package className="h-4 w-4" />
                      View Order Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
