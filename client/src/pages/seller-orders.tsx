import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Package, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Order } from "@shared/schema";
import { getPaymentStatusLabel, getOrderStatusLabel, getProductTypeLabel } from "@/lib/format-status";

export default function SellerOrdersPage() {
  const [, setLocation] = useLocation();
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
      partially_refunded: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      refunded: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };


  const getProductTypeColor = (productType: string) => {
    const colors = {
      'in-stock': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'pre-order': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'made-to-order': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'wholesale': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    };
    return colors[productType as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const getOrderProductType = (order: Order): string | null => {
    try {
      // Handle both JSON string and already-parsed array
      let items;
      if (typeof order.items === 'string') {
        items = JSON.parse(order.items);
      } else {
        items = order.items;
      }
      
      if (Array.isArray(items) && items.length > 0 && items[0].productType) {
        return items[0].productType;
      }
    } catch (error) {
      // If parsing fails, return null to hide badge
      console.error('Failed to parse order items:', error);
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4" data-testid="page-seller-orders">
        <Button
          variant="ghost"
          onClick={() => setLocation("/seller-dashboard")}
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
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
        <Button
          variant="ghost"
          onClick={() => setLocation("/seller-dashboard")}
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
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
      <Button
        variant="ghost"
        onClick={() => setLocation("/seller-dashboard")}
        className="mb-4"
        data-testid="button-back-to-dashboard"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          Manage all your customer orders ({orders.length} total)
        </p>
      </div>

      {/* Desktop: Table View */}
      <div className="hidden md:block border rounded-lg">
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
                      <div className="flex flex-col gap-1">
                        <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                        {(() => {
                          const productType = getOrderProductType(order);
                          return productType && productType !== 'wholesale' ? (
                            <Badge 
                              variant="outline" 
                              className={getProductTypeColor(productType)}
                              data-testid={`badge-product-type-${order.id}`}
                            >
                              {getProductTypeLabel(productType)}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
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
                        {getOrderStatusLabel(order.status)}
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

      {/* Mobile: Card View */}
      <div className="block md:hidden space-y-3">
        {sortedOrders.map((order) => {
          const isExpanded = expandedOrders.has(order.id);
          const productType = getOrderProductType(order);

          return (
            <Card key={order.id} className="overflow-hidden" data-testid={`card-order-${order.id}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate" data-testid={`text-order-id-mobile-${order.id}`}>
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <CardDescription className="text-xs" data-testid={`text-date-mobile-${order.id}`}>
                      {format(new Date(order.createdAt), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <Badge 
                    className={`${getStatusColor(order.status)} shrink-0`}
                    data-testid={`badge-status-mobile-${order.id}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                </div>
                {productType && productType !== 'wholesale' && (
                  <Badge 
                    variant="outline" 
                    className={`${getProductTypeColor(productType)} w-fit mt-2`}
                    data-testid={`badge-product-type-mobile-${order.id}`}
                  >
                    {getProductTypeLabel(productType)}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pb-3 pt-0 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium truncate ml-2" data-testid={`text-customer-mobile-${order.id}`}>
                    {order.customerName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-xs truncate ml-2">
                    {order.userId ? order.customerEmail : `${order.customerEmail} (Guest)`}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold" data-testid={`text-total-mobile-${order.id}`}>
                    {order.currency} {parseFloat(order.total).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-muted-foreground">Payment:</span>
                  <Badge 
                    variant="outline" 
                    className={`${getPaymentStatusColor(order.paymentStatus || "pending")} text-xs`}
                    data-testid={`badge-payment-mobile-${order.id}`}
                  >
                    {getPaymentStatusLabel(order.paymentStatus || "pending")}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-3 pb-3 border-t flex-col gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full min-h-11"
                  onClick={() => toggleOrder(order.id)}
                  data-testid={`button-expand-mobile-${order.id}`}
                >
                  {isExpanded ? (
                    <>
                      Hide Details
                      <ChevronDown className="ml-2 h-4 w-4 rotate-180" />
                    </>
                  ) : (
                    <>
                      View Details
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                {isExpanded && (
                  <div className="w-full pt-3 border-t">
                    <OrderRowExpanded orderId={order.id} />
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
