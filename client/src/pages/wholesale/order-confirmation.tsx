import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Package } from "lucide-react";
import { formatCurrencyFromCents, getCurrentCurrency } from "@/lib/currency";
import { format } from "date-fns";

interface WholesaleOrder {
  id: string;
  orderNumber: string;
  sellerId: string;
  buyerId: string;
  totalAmountCents: number;
  depositAmountCents: number;
  balanceAmountCents: number;
  status: string;
  shippingType: string;
  carrierName?: string;
  orderDeadline?: string;
  expectedShipDate?: string;
  balancePaymentDate?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    variant?: {
      size?: string;
      color?: string;
    };
  }>;
}

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, setLocation] = useLocation();
  const currency = getCurrentCurrency();

  const { data: order, isLoading } = useQuery<WholesaleOrder>({
    queryKey: ["/api/wholesale/orders", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/wholesale/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center gap-4">
              <Package className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Order Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  The requested order could not be found
                </p>
                <Button onClick={() => setLocation("/wholesale/catalog")}>
                  Back to Catalog
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-success-title">
            Order Placed Successfully!
          </h1>
          <p className="text-muted-foreground">
            Your wholesale order has been confirmed
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>
                  Order #{order.orderNumber}
                </CardDescription>
              </div>
              <Badge variant="secondary" data-testid="badge-order-status">
                {order.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Items</h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div>
                      <div className="font-medium" data-testid={`text-item-name-${index}`}>
                        {item.productName}
                      </div>
                      {item.variant && (
                        <div className="text-sm text-muted-foreground">
                          {item.variant.size && `Size: ${item.variant.size}`}
                          {item.variant.size && item.variant.color && " | "}
                          {item.variant.color && `Color: ${item.variant.color}`}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatCurrencyFromCents(item.unitPriceCents, currency)}
                      </div>
                    </div>
                    <div className="font-semibold" data-testid={`text-item-total-${index}`}>
                      {formatCurrencyFromCents(item.subtotalCents, currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Shipping Method:</span>
                <span className="font-medium" data-testid="text-shipping-method">
                  {order.shippingType === "freight_collect" ? "Freight Collect" : "Buyer Pickup"}
                  {order.carrierName && ` (${order.carrierName})`}
                </span>
              </div>

              {order.depositAmountCents > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Deposit Paid:</span>
                    <span className="font-semibold text-green-600" data-testid="text-deposit-paid">
                      {formatCurrencyFromCents(order.depositAmountCents, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="font-semibold" data-testid="text-balance-due">
                      {formatCurrencyFromCents(order.balanceAmountCents, currency)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold" data-testid="text-order-total">
                {formatCurrencyFromCents(order.totalAmountCents, currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.balancePaymentDate && (
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <div>
                  <div className="font-medium">Balance Payment Due</div>
                  <div className="text-sm text-muted-foreground" data-testid="text-balance-due-date">
                    Payment due by {format(new Date(order.balancePaymentDate), "MMMM d, yyyy")}
                  </div>
                </div>
              </div>
            )}

            {order.expectedShipDate && (
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">
                    {order.balancePaymentDate ? "2" : "1"}
                  </span>
                </div>
                <div>
                  <div className="font-medium">Expected Ship Date</div>
                  <div className="text-sm text-muted-foreground" data-testid="text-expected-ship-date">
                    Your order is expected to ship on{" "}
                    {format(new Date(order.expectedShipDate), "MMMM d, yyyy")}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">
                  {order.balancePaymentDate && order.expectedShipDate
                    ? "3"
                    : order.balancePaymentDate || order.expectedShipDate
                    ? "2"
                    : "1"}
                </span>
              </div>
              <div>
                <div className="font-medium">Order Confirmation</div>
                <div className="text-sm text-muted-foreground">
                  You will receive an email confirmation with your order details
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={() => setLocation("/wholesale/catalog")}
            variant="outline"
            className="flex-1"
            data-testid="button-continue-shopping"
          >
            Continue Shopping
          </Button>
          <Button
            onClick={() => setLocation(`/seller/wholesale/orders/${order.id}`)}
            className="flex-1"
            data-testid="button-view-order-details"
          >
            View Order Details
          </Button>
        </div>
      </div>
    </div>
  );
}
