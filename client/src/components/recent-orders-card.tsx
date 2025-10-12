import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Package, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import type { Order } from "@shared/schema";
import { formatPrice } from "@/lib/currency-utils";

interface RecentOrdersCardProps {
  orders?: Order[];
  isLoading: boolean;
  sellerCurrency: string;
}

export function RecentOrdersCard({ orders, isLoading, sellerCurrency }: RecentOrdersCardProps) {
  const [, setLocation] = useLocation();

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

  // Show only last 7 orders
  const recentOrders = orders?.slice(0, 7) || [];

  return (
    <Card data-testid="card-recent-orders">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-2xl font-semibold">Recent Orders</CardTitle>
        {orders && orders.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setLocation("/seller/orders")}
            data-testid="button-view-all-orders"
            className="text-sm"
          >
            View all orders
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : recentOrders.length > 0 ? (
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
                {recentOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    data-testid={`order-row-${order.id}`}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setLocation(`/seller/orders`)}
                  >
                    <TableCell className="font-medium">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{order.customerEmail}</TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(parseFloat(order.total), sellerCurrency)}
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
      </CardContent>
    </Card>
  );
}
