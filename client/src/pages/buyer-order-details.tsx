import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Package, MapPin, CreditCard, Truck, ExternalLink, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Order, OrderItem } from "@shared/schema";
import { getPaymentStatusLabel, getOrderStatusLabel } from "@/lib/format-status";

interface OrderDetailsResponse {
  order: Order;
  items: OrderItem[];
  events: any[];
  balancePayments: any[];
  refunds: any[];
}

export default function BuyerOrderDetails() {
  const { orderId } = useParams();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery<OrderDetailsResponse>({
    queryKey: [`/api/orders/${orderId}/details`],
    enabled: !!orderId,
  });

  // Fetch seller info for contact button
  const sellerId = data?.order?.sellerId;
  const { data: seller } = useQuery<any>({
    queryKey: [`/api/users/${sellerId}`],
    enabled: !!sellerId,
  });

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "deposit_paid":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "partially_refunded":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "refunded":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
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
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/buyer-dashboard")}
          className="mb-6"
          data-testid="button-back-to-orders"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load order details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { order, items, events = [], balancePayments = [], refunds = [] } = data;
  const hasBalanceDue = order.remainingBalance && parseFloat(order.remainingBalance) > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/buyer-dashboard")}
        className="mb-6"
        data-testid="button-back-to-orders"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </Button>

      <div className="space-y-6">
        {/* Order Header */}
        <Card data-testid="card-order-header">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl" data-testid="text-order-number">
                  Order #{order.id.slice(0, 8)}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Placed on {format(new Date(order.createdAt), "PPP")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge className={getPaymentStatusColor(order.paymentStatus || "pending")} data-testid="badge-payment-status">
                  {getPaymentStatusLabel(order.paymentStatus || "pending")}
                </Badge>
                <Badge className={getOrderStatusColor(order.status)} data-testid="badge-order-status">
                  {getOrderStatusLabel(order.status)}
                </Badge>
                {seller?.email && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = `mailto:${seller.email}?subject=Question about Order ${order.id.slice(0, 8)}`}
                    data-testid="button-contact-seller"
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Seller
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium mb-1">Order Total</p>
                <p className="text-2xl font-bold" data-testid="text-order-total">
                  ${parseFloat(order.total).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-amount-paid">
                  ${parseFloat(order.amountPaid || "0").toFixed(2)}
                </p>
              </div>
              {hasBalanceDue && (
                <div>
                  <p className="text-sm font-medium mb-1">Remaining Balance</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-remaining-balance">
                    ${parseFloat(order.remainingBalance || "0").toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {hasBalanceDue && (
              <div className="mt-6">
                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span>You have a balance payment due for this order.</span>
                    <Button 
                      onClick={() => navigate(`/orders/${order.id}/pay-balance`)}
                      data-testid="button-pay-balance"
                    >
                      Pay Balance
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card data-testid="card-order-items">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-4" data-testid={`item-${idx}`}>
                  {item.productImage && (
                    <img 
                      src={item.productImage} 
                      alt={item.productName}
                      className="h-20 w-20 object-cover rounded-md"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{item.productName}</h4>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    {item.trackingNumber && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Truck className="h-3 w-3" />
                          Tracking: {item.trackingNumber}
                        </Badge>
                        {item.trackingLink && (
                          <a 
                            href={item.trackingLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Track Package
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${parseFloat(item.price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        {order.shippingStreet && (
          <Card data-testid="card-shipping-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {order.shippingStreet}
                {order.shippingCity && `, ${order.shippingCity}`}
                {order.shippingState && `, ${order.shippingState}`}
                {order.shippingPostalCode && ` ${order.shippingPostalCode}`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Summary */}
        <Card data-testid="card-payment-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${parseFloat(order.subtotalBeforeTax || "0").toFixed(2)}</span>
              </div>
              {order.shippingCost && parseFloat(order.shippingCost) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${parseFloat(order.shippingCost).toFixed(2)}</span>
                </div>
              )}
              {order.taxAmount && parseFloat(order.taxAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${parseFloat(order.taxAmount).toFixed(2)}</span>
                </div>
              )}
              {refunds && refunds.length > 0 && (
                <>
                  <Separator />
                  {refunds.map((refund: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Refund ({format(new Date(refund.createdAt), "MMM d, yyyy")})</span>
                      <span>-${parseFloat(refund.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span data-testid="text-total">${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
