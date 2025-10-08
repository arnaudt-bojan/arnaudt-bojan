import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Order } from "@shared/schema";
import { Package, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";

export default function SellerDashboard() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

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

  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Seller Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your orders and track your sales
          </p>
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
                    <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
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
    </div>
  );
}
