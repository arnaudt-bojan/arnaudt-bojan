import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Package, ShoppingBag, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: string;
  total: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  userId?: string;
};

export default function Orders() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  // For sellers, show only their product orders; for buyers, show only their orders
  const isSeller = user?.role === "seller" || user?.role === "owner" || user?.role === "admin";
  
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: isSeller ? ["/api/seller/orders"] : ["/api/orders/my"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
            <CardDescription>Please log in to view your orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need to be logged in to view your order history.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      shipped: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      delivered: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-orders-title">
          {isSeller ? "All Orders" : "My Orders"}
        </h1>
        <p className="text-muted-foreground">
          {isSeller ? "View and manage all customer orders" : "View and track all your orders"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const parsedItems = JSON.parse(order.items);
            return (
              <Card 
                key={order.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => navigate(`/orders/${order.id}`)}
                data-testid={`card-order-${order.id}`}
              >
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        Placed on {format(new Date(order.createdAt), "PPP")}
                      </CardDescription>
                      {isSeller && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <p><span className="font-medium">Customer:</span> {order.customerName}</p>
                          <p><span className="font-medium">Email:</span> {order.customerEmail}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={getStatusColor(order.status)}
                        data-testid={`status-${order.id}`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Items</h4>
                      <div className="space-y-2">
                        {parsedItems.map((item: any, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between items-center text-sm"
                            data-testid={`item-${order.id}-${index}`}
                          >
                            <span>
                              {item.name} x {item.quantity}
                            </span>
                            <span className="font-medium">
                              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4 flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold" data-testid={`total-${order.id}`}>
                        ${parseFloat(order.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-orders">
                  No orders yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  {isSeller 
                    ? "Orders will appear here once customers start purchasing" 
                    : "You haven't placed any orders yet. Start shopping to see your orders here!"}
                </p>
                {!isSeller && (
                  <button
                    onClick={() => navigate("/products")}
                    className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover-elevate active-elevate-2 px-6 py-2 font-medium"
                    data-testid="button-browse-products"
                  >
                    Browse Products
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
