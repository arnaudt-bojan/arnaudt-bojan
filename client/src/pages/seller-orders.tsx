import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import { OrderRowExpanded } from "@/components/order-row-expanded";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@shared/schema";

export default function SellerOrdersPage() {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/seller/orders"],
  });

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      deposit_paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      fully_paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels = {
      pending: "Pending",
      deposit_paid: "Deposit Paid",
      fully_paid: "Fully Paid",
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4" data-testid="page-seller-orders">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <Skeleton className="h-10 w-full" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border-b last:border-0">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4" data-testid="page-seller-orders">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage all your customer orders</p>
        </div>
        <div className="border rounded-lg p-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
          <p className="text-muted-foreground">
            When customers place orders, they'll appear here
          </p>
        </div>
      </div>
    );
  }

  // Sort orders by date (newest first)
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="container mx-auto py-8 px-4" data-testid="page-seller-orders">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          Manage all your customer orders ({orders.length} total)
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Order Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              
              return (
                <Fragment key={order.id}>
                  <TableRow
                    key={`${order.id}-main`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleOrder(order.id)}
                    data-testid={`row-order-${order.id}`}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-expand-${order.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOrder(order.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell
                      className="font-medium"
                      data-testid={`text-order-id-${order.id}`}
                    >
                      #{order.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell data-testid={`text-date-${order.id}`}>
                      {format(new Date(order.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell data-testid={`text-customer-${order.id}`}>
                      <div className="max-w-[200px] truncate">
                        {order.customerName}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {order.userId ? order.customerEmail : `${order.customerEmail} (Guest)`}
                      </div>
                    </TableCell>
                    <TableCell
                      className="font-medium"
                      data-testid={`text-total-${order.id}`}
                    >
                      {order.currency} {parseFloat(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getPaymentStatusColor(order.paymentStatus || "pending")}
                        data-testid={`badge-payment-${order.id}`}
                      >
                        {getPaymentStatusLabel(order.paymentStatus || "pending")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getStatusColor(order.status)}
                        data-testid={`badge-status-${order.id}`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${order.id}-expanded`}>
                      <TableCell colSpan={7} className="p-0">
                        <div className="p-6 bg-muted/50 border-t">
                          <OrderRowExpanded orderId={order.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
