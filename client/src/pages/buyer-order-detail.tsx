import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Mail, MapPin, DollarSign, Truck, ExternalLink } from "lucide-react";
import type { Order, User, Product } from "@shared/schema";

type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productType: string;
  quantity: number;
  price: string;
  subtotal: string;
  depositAmount: string | null;
  requiresDeposit: number;
  variant: string | null;
  itemStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

export default function BuyerOrderDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // Fetch order
  const { data: order, isLoading: orderLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${id}`],
  });

  // Get seller ID from order
  const orderItems = order?.items ? JSON.parse(order.items) : [];
  const firstProductId = orderItems[0]?.productId;
  
  // Fetch first product to get seller ID
  const { data: firstProduct } = useQuery<Product>({
    queryKey: [`/api/products/${firstProductId}`],
    enabled: !!firstProductId,
  });
  
  const sellerId = firstProduct?.sellerId;
  
  // Fetch seller info
  const { data: seller } = useQuery<User>({
    queryKey: [`/api/sellers/id/${sellerId}`],
    enabled: !!sellerId,
  });

  // Fetch order items for item-level tracking
  const { data: itemLevelTracking } = useQuery<OrderItem[]>({
    queryKey: [`/api/orders/${id}/items`],
    enabled: !!id,
  });

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

  const getFulfillmentSummary = () => {
    if (!itemLevelTracking || itemLevelTracking.length === 0) {
      return { status: "unfulfilled", shipped: 0, total: orderItems.length };
    }
    
    const shippedCount = itemLevelTracking.filter(item => 
      item.itemStatus === 'shipped' || item.itemStatus === 'delivered'
    ).length;
    const total = itemLevelTracking.length;
    
    if (shippedCount === 0) return { status: "unfulfilled", shipped: 0, total };
    if (shippedCount === total) return { status: "fulfilled", shipped: shippedCount, total };
    return { status: "partially_fulfilled", shipped: shippedCount, total };
  };

  const fulfillment = getFulfillmentSummary();

  if (orderLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-8">
            We couldn't find the order you're looking for.
          </p>
          <Button onClick={() => setLocation("/orders")} data-testid="button-back-orders">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const isDepositPayment = order.paymentStatus === "deposit_paid";

  return (
    <div className="min-h-screen py-6 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/orders")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>

        {/* Order Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-6 w-6" />
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-order-title">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge 
              variant={isDepositPayment ? "secondary" : "default"}
              className="font-medium"
              data-testid="badge-payment-status"
            >
              {isDepositPayment ? "Deposit Paid" : "Fully Paid"}
            </Badge>
            <Badge variant="outline" data-testid="badge-order-status">
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
            {fulfillment && (
              <Badge variant="outline" data-testid="badge-fulfillment">
                {fulfillment.status === "unfulfilled" && "Unfulfilled"}
                {fulfillment.status === "partially_fulfilled" && `${fulfillment.shipped} of ${fulfillment.total} shipped`}
                {fulfillment.status === "fulfilled" && "Fulfilled"}
              </Badge>
            )}
          </div>
        </div>

        {/* Order Items */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items {itemLevelTracking && `(${fulfillment.shipped} of ${fulfillment.total} shipped)`}
            </h2>
            
            <div className="space-y-4">
              {orderItems.map((item: any, index: number) => {
                const trackingInfo = itemLevelTracking?.find(t => t.productId === item.productId);
                return (
                  <div 
                    key={index} 
                    className="border rounded-lg p-4"
                    data-testid={`item-${index}`}
                  >
                    <div className="flex gap-4">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-md flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-base">{item.name}</p>
                            {item.variant && (
                              <p className="text-sm text-muted-foreground">Variant: {item.variant}</p>
                            )}
                            <div className="flex gap-4 mt-1">
                              <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                              <p className="text-sm text-muted-foreground">
                                Price: ${parseFloat(item.price).toFixed(2)} each
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-lg">
                              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </p>
                            {trackingInfo && (
                              <Badge
                                variant="outline"
                                className={`${getStatusColor(trackingInfo.itemStatus)} mt-1`}
                              >
                                {trackingInfo.itemStatus.charAt(0).toUpperCase() + trackingInfo.itemStatus.slice(1)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Show tracking info if available */}
                        {trackingInfo?.trackingNumber && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-1">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm font-medium">Tracking Information</p>
                            </div>
                            <p className="text-sm">Tracking: {trackingInfo.trackingNumber}</p>
                            {trackingInfo.trackingCarrier && (
                              <p className="text-sm text-muted-foreground">
                                Carrier: {trackingInfo.trackingCarrier}
                              </p>
                            )}
                            {trackingInfo.trackingUrl && (
                              <a 
                                href={trackingInfo.trackingUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                data-testid={`link-tracking-${index}`}
                              >
                                Track Package
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Customer & Shipping Info */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Customer Information
                </h3>
                <div className="space-y-1 text-sm">
                  <p>Name: {order.customerName}</p>
                  <p>Email: {order.customerEmail}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {order.customerAddress}
                </p>
              </div>

              {seller && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Seller Information</h3>
                    <div className="space-y-2 text-sm mb-3">
                      <p>
                        <span className="text-muted-foreground">Store:</span>{" "}
                        <span className="font-medium">{seller.firstName || seller.username || 'Seller'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Contact:</span>{" "}
                        <span className="font-medium">{seller.contactEmail || seller.email}</span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const contactEmail = seller.contactEmail || seller.email;
                        window.location.href = `mailto:${contactEmail}?subject=Order ${order.id.slice(0, 8).toUpperCase()}`;
                      }}
                      data-testid="button-contact-seller"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Seller
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payment Details
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">${parseFloat(order.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ${parseFloat(order.amountPaid || "0").toFixed(2)}
                  </span>
                </div>
                {isDepositPayment && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining Balance:</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      ${parseFloat(order.remainingBalance || "0").toFixed(2)}
                    </span>
                  </div>
                )}

                {isDepositPayment && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Deposit Payment:</strong> The seller will contact you to collect the remaining balance before shipping your order.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
