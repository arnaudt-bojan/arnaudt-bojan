import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Package, User, MapPin, CreditCard, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderActionBar } from "@/components/order-action-bar";
import { OrderTimeline } from "@/components/order-timeline";
import type { Order, OrderItem } from "@shared/schema";
import { getPaymentStatusLabel } from "@/lib/format-status";

interface OrderRowExpandedProps {
  orderId: string;
}

interface OrderDetailsResponse {
  order: Order;
  items: OrderItem[];
  events: any[];
  balancePayments: any[];
  refunds: any[];
}

export function OrderRowExpanded({ orderId }: OrderRowExpandedProps) {
  const { data, isLoading } = useQuery<OrderDetailsResponse>({
    queryKey: [`/api/seller/orders/${orderId}`],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-sm text-muted-foreground">
        Failed to load order details
      </div>
    );
  }

  const { order, items, events = [], balancePayments = [] } = data;

  // Calculate subtotal from items (sum of all item subtotals)
  const calculatedSubtotal = items.reduce((sum, item) => {
    return sum + parseFloat(item.subtotal || "0");
  }, 0);

  // Get the most recent balance payment for status tracking
  const latestBalancePayment = balancePayments.length > 0 
    ? balancePayments.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : null;

  const getItemStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      ready_to_ship: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const formatVariant = (variant: any): string => {
    if (!variant) return "";
    if (typeof variant === "string") {
      try {
        variant = JSON.parse(variant);
      } catch {
        return variant;
      }
    }
    const parts = [];
    if (variant.size) parts.push(variant.size);
    if (variant.color) parts.push(variant.color);
    return parts.join(" / ");
  };

  return (
    <div className="space-y-6" data-testid={`order-expanded-${orderId}`}>
      {/* Action Bar */}
      <div className="flex justify-end">
        <OrderActionBar 
          order={order}
          balancePaymentStatus={latestBalancePayment?.status}
          balancePaymentRequestedAt={latestBalancePayment?.requestedAt}
        />
      </div>

      {/* Order Summary & Customer Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4" />
            <span>Order Summary</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Date:</span>
              <span>{format(new Date(order.createdAt), "PPP")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{order.currency} {calculatedSubtotal.toFixed(2)}</span>
            </div>
            {order.shippingCost && parseFloat(order.shippingCost) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping:</span>
                <span>{order.currency} {parseFloat(order.shippingCost).toFixed(2)}</span>
              </div>
            )}
            {order.taxAmount && parseFloat(order.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>{order.currency} {parseFloat(order.taxAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total:</span>
              <span>{order.currency} {parseFloat(order.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="text-green-600 dark:text-green-400">
                {order.currency} {parseFloat(order.amountPaid || "0").toFixed(2)}
              </span>
            </div>
            {order.remainingBalance && parseFloat(order.remainingBalance) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <span className="text-orange-600 dark:text-orange-400">
                  {order.currency} {parseFloat(order.remainingBalance).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4" />
            <span>Customer Information</span>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <div className="font-medium">{order.customerName}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <div className="font-medium">{order.customerEmail}</div>
            </div>
            <div>
              <span className="text-muted-foreground flex items-start gap-1">
                <MapPin className="h-4 w-4 mt-0.5" />
                Shipping Address:
              </span>
              <div className="font-medium whitespace-pre-line ml-5">
                {order.customerAddress}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="h-4 w-4" />
          <span>Payment Status</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Payment Type:</span>
          <Badge variant="outline">
            {order.paymentType === "full" ? "Full Payment" : 
             order.paymentType === "deposit" ? "Deposit Payment" : 
             order.paymentType === "balance" ? "Balance Payment" : 
             order.paymentType}
          </Badge>
          <span className="text-muted-foreground">Status:</span>
          <Badge variant="outline">
            {getPaymentStatusLabel(order.paymentStatus || "pending")}
          </Badge>
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Package className="h-4 w-4" />
          <span>Order Items ({items.length})</span>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 border rounded-lg"
              data-testid={`order-item-${item.id}`}
            >
              {item.productImage && (
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{item.productName}</h4>
                    {formatVariant(item.variant) && (
                      <p className="text-sm text-muted-foreground">
                        {formatVariant(item.variant)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {order.currency} {parseFloat(item.price).toFixed(2)}
                      </p>
                      {(item as any).originalPrice && (item as any).discountAmount && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground line-through">
                            {order.currency} {parseFloat((item as any).originalPrice).toFixed(2)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Save {order.currency} {parseFloat((item as any).discountAmount).toFixed(2)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {order.currency} {parseFloat(item.subtotal).toFixed(2)}
                    </div>
                    <Badge className={getItemStatusColor(item.itemStatus)}>
                      {item.itemStatus.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                </div>
                
                {/* Tracking Information */}
                {item.trackingNumber && (
                  <div className="mt-3 p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4" />
                      <span className="text-muted-foreground">Tracking:</span>
                      <span className="font-medium">{item.trackingNumber}</span>
                      {item.trackingCarrier && (
                        <span className="text-muted-foreground">({item.trackingCarrier})</span>
                      )}
                    </div>
                    {item.trackingUrl && (
                      <a
                        href={item.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-1 inline-block"
                        data-testid={`link-tracking-${item.id}`}
                      >
                        Track Package →
                      </a>
                    )}
                    {item.shippedAt && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Shipped: {format(new Date(item.shippedAt), "PPP")}
                      </p>
                    )}
                    {item.deliveredAt && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Delivered: {format(new Date(item.deliveredAt), "PPP")}
                      </p>
                    )}
                  </div>
                )}

                {/* Refund Information */}
                {item.refundedQuantity && item.refundedQuantity > 0 && (
                  <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                    Refunded: {item.refundedQuantity} × {order.currency} {parseFloat(item.refundedAmount || "0").toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Timeline */}
      <div className="border-t pt-6">
        <OrderTimeline events={events} />
      </div>
    </div>
  );
}
