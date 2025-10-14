import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Package, Truck, CreditCard, AlertCircle, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface OrderDetails {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    subtotalCents: number;
    totalCents: number;
    depositAmountCents: number;
    balanceAmountCents: number;
    currency: string;
    balancePaymentDueDate?: string;
    buyerCompanyName?: string;
    buyerEmail: string;
    buyerName?: string;
    createdAt: string;
    sellerId: string;
    buyerId: string;
  };
  items: Array<{
    id: string;
    productName: string;
    productImage?: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    variant?: { size?: string; color?: string };
  }>;
  paymentIntents: Array<{
    type: string;
    status: string;
    amountCents: number;
  }>;
  shippingMetadata?: {
    shippingType: string;
    carrier?: string;
    trackingNumber?: string;
    freightAccount?: string;
    pickupAddress?: any;
    pickupInstructions?: string;
  };
  buyer?: {
    id: string;
    name?: string;
    email: string;
    companyName?: string;
    phone?: string;
  };
  seller?: {
    id: string;
    name?: string;
    email: string;
  };
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  // Fetch order details
  const { data: orderDetails, isLoading } = useQuery<OrderDetails>({
    queryKey: ["/api/wholesale/orders", orderId, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/wholesale/orders/${orderId}/details`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch order details");
      return response.json();
    },
    enabled: !!orderId,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest("POST", `/api/wholesale/orders/${orderId}/update-status`, {
        newStatus,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/orders", orderId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/orders"] });
      toast({
        title: "Status updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Update tracking mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/wholesale/orders/${orderId}/tracking`, {
        carrier: trackingCarrier,
        trackingNumber,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/orders", orderId, "details"] });
      toast({
        title: "Tracking updated",
        description: "Tracking information has been saved successfully",
      });
      setTrackingCarrier("");
      setTrackingNumber("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tracking",
        variant: "destructive",
      });
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (reason?: string) => {
      const response = await apiRequest("POST", `/api/wholesale/orders/${orderId}/cancel`, {
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/orders", orderId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/orders"] });
      toast({
        title: "Order cancelled",
        description: "Order has been cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    },
  });

  // Format price from cents to dollars
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
      deposit_paid: { label: "Deposit Paid", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
      awaiting_balance: { label: "Awaiting Balance", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
      balance_overdue: { label: "Balance Overdue", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
      ready_to_release: { label: "Ready to Release", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
      in_production: { label: "In Production", className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400" },
      fulfilled: { label: "Fulfilled", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
      cancelled: { label: "Cancelled", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
    };

    const config = statusConfig[status] || { label: status, className: "" };
    return (
      <Badge className={config.className} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  // Get action buttons based on current status (seller only)
  const getActionButtons = (status: string, isSeller: boolean) => {
    if (!isSeller) return null;

    const buttons: JSX.Element[] = [];

    switch (status) {
      case "pending":
        buttons.push(
          <Button
            key="mark-deposit-paid"
            onClick={() => updateStatusMutation.mutate("deposit_paid")}
            disabled={updateStatusMutation.isPending}
            data-testid="button-mark-deposit-paid"
          >
            Mark Deposit Paid
          </Button>
        );
        break;
      case "deposit_paid":
        buttons.push(
          <Button
            key="mark-balance-paid"
            onClick={() => updateStatusMutation.mutate("ready_to_release")}
            disabled={updateStatusMutation.isPending}
            data-testid="button-mark-balance-paid"
          >
            Mark Balance Paid
          </Button>
        );
        break;
      case "awaiting_balance":
      case "balance_overdue":
        buttons.push(
          <Button
            key="mark-balance-paid"
            onClick={() => updateStatusMutation.mutate("ready_to_release")}
            disabled={updateStatusMutation.isPending}
            data-testid="button-mark-balance-paid"
          >
            Mark Balance Paid
          </Button>
        );
        if (status === "balance_overdue") {
          buttons.push(
            <Button
              key="send-reminder"
              variant="outline"
              disabled
              data-testid="button-send-reminder"
            >
              Send Payment Reminder
            </Button>
          );
        }
        break;
      case "ready_to_release":
        buttons.push(
          <Button
            key="start-production"
            onClick={() => updateStatusMutation.mutate("in_production")}
            disabled={updateStatusMutation.isPending}
            data-testid="button-start-production"
          >
            Start Production
          </Button>
        );
        break;
      case "in_production":
        buttons.push(
          <Button
            key="mark-fulfilled"
            onClick={() => updateStatusMutation.mutate("fulfilled")}
            disabled={updateStatusMutation.isPending}
            data-testid="button-mark-fulfilled"
          >
            Mark as Fulfilled
          </Button>
        );
        break;
    }

    // Always show cancel button (except if already cancelled/fulfilled)
    if (!["cancelled", "fulfilled"].includes(status)) {
      buttons.push(
        <AlertDialog key="cancel-dialog">
          <AlertDialogTrigger asChild>
            <Button variant="destructive" data-testid="button-cancel-order">
              Cancel Order
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this order? This action cannot be undone.
                Any payments made will be refunded.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, keep order</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelOrderMutation.mutate()}
                data-testid="button-confirm-cancel"
              >
                Yes, cancel order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    return buttons;
  };

  // Check if deposit is paid
  const isDepositPaid = (paymentIntents: any[]) => {
    return paymentIntents.some(pi => pi.type === "deposit" && pi.status === "succeeded");
  };

  // Check if balance is paid
  const isBalancePaid = (paymentIntents: any[]) => {
    return paymentIntents.some(pi => pi.type === "balance" && pi.status === "succeeded");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Order not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { order, items, paymentIntents, shippingMetadata, buyer, seller } = orderDetails;
  const isSeller = user?.id === order.sellerId;
  const depositPaid = isDepositPaid(paymentIntents);
  const balancePaid = isBalancePaid(paymentIntents);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-order-detail">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setLocation("/wholesale/orders")}
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Button>

      {/* Order Header */}
      <Card data-testid="card-order-header">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl" data-testid="text-order-number">
                {order.orderNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-order-date">
                {format(new Date(order.createdAt), "PPP")}
              </p>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Buyer Information</h3>
              <div className="space-y-1 text-sm">
                <p data-testid="text-buyer-company">{order.buyerCompanyName || "N/A"}</p>
                <p data-testid="text-buyer-name">{order.buyerName || buyer?.name || "N/A"}</p>
                <p data-testid="text-buyer-email">{order.buyerEmail}</p>
                {buyer?.phone && <p data-testid="text-buyer-phone">{buyer.phone}</p>}
              </div>
            </div>
            {seller && (
              <div>
                <h3 className="font-semibold mb-2">Seller Information</h3>
                <div className="space-y-1 text-sm">
                  <p data-testid="text-seller-name">{seller.name || "N/A"}</p>
                  <p data-testid="text-seller-email">{seller.email}</p>
                </div>
              </div>
            )}
          </div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.productImage && (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="h-12 w-12 rounded object-cover"
                          data-testid={`img-product-${item.id}`}
                        />
                      )}
                      <span data-testid={`text-product-name-${item.id}`}>{item.productName}</span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-variant-${item.id}`}>
                    {item.variant?.size && <span>Size: {item.variant.size}</span>}
                    {item.variant?.size && item.variant?.color && <span className="mx-1">•</span>}
                    {item.variant?.color && <span>Color: {item.variant.color}</span>}
                    {!item.variant?.size && !item.variant?.color && "—"}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-quantity-${item.id}`}>
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-unit-price-${item.id}`}>
                    {formatPrice(item.unitPriceCents)}
                  </TableCell>
                  <TableCell className="text-right font-medium" data-testid={`text-subtotal-${item.id}`}>
                    {formatPrice(item.subtotalCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card data-testid="card-payment-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span data-testid="text-subtotal">{formatPrice(order.subtotalCents)}</span>
          </div>

          <Separator />

          {/* Deposit Status */}
          <div className="flex justify-between items-center">
            <span>Deposit</span>
            <div className="flex items-center gap-2">
              {depositPaid ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600" data-testid="text-deposit-paid">
                    Paid: {formatPrice(order.depositAmountCents)}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-600" data-testid="text-deposit-pending">
                    Pending: {formatPrice(order.depositAmountCents)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Balance Status */}
          <div className="flex justify-between items-center">
            <span>Balance</span>
            <div className="flex items-center gap-2">
              {balancePaid ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600" data-testid="text-balance-paid">
                    Paid: {formatPrice(order.balanceAmountCents)}
                  </span>
                </>
              ) : order.status === "balance_overdue" ? (
                <>
                  <X className="h-4 w-4 text-red-600" />
                  <span className="text-red-600" data-testid="text-balance-overdue">
                    Overdue: {formatPrice(order.balanceAmountCents)}
                    {order.balancePaymentDueDate && ` (due ${format(new Date(order.balancePaymentDueDate), "PP")})`}
                  </span>
                </>
              ) : (
                <span data-testid="text-balance-due">
                  Due: {formatPrice(order.balanceAmountCents)}
                  {order.balancePaymentDueDate && ` (by ${format(new Date(order.balancePaymentDueDate), "PP")})`}
                </span>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span data-testid="text-total">{formatPrice(order.totalCents)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Information */}
      <Card data-testid="card-shipping-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {shippingMetadata ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-medium">Shipping Type:</span>
                <Badge data-testid="badge-shipping-type">
                  {shippingMetadata.shippingType === "freight_collect" ? "Freight Collect" : "Buyer Pickup"}
                </Badge>
              </div>

              {shippingMetadata.shippingType === "freight_collect" && (
                <div className="space-y-2">
                  {shippingMetadata.carrier && (
                    <div className="flex justify-between">
                      <span>Carrier</span>
                      <span data-testid="text-carrier">{shippingMetadata.carrier}</span>
                    </div>
                  )}
                  {shippingMetadata.freightAccount && (
                    <div className="flex justify-between">
                      <span>Freight Account</span>
                      <span data-testid="text-freight-account">{shippingMetadata.freightAccount}</span>
                    </div>
                  )}
                  {shippingMetadata.trackingNumber && (
                    <div className="flex justify-between">
                      <span>Tracking Number</span>
                      <span className="font-mono" data-testid="text-tracking-number">
                        {shippingMetadata.trackingNumber}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {shippingMetadata.shippingType === "buyer_pickup" && (
                <div className="space-y-2">
                  {shippingMetadata.pickupAddress && (
                    <div>
                      <span className="font-medium">Pickup Address:</span>
                      <div className="mt-1 text-sm" data-testid="text-pickup-address">
                        {shippingMetadata.pickupAddress.street}<br />
                        {shippingMetadata.pickupAddress.city}, {shippingMetadata.pickupAddress.state} {shippingMetadata.pickupAddress.zip}
                      </div>
                    </div>
                  )}
                  {shippingMetadata.pickupInstructions && (
                    <div>
                      <span className="font-medium">Pickup Instructions:</span>
                      <p className="mt-1 text-sm" data-testid="text-pickup-instructions">
                        {shippingMetadata.pickupInstructions}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No shipping information available</p>
          )}

          {/* Tracking Input (Seller Only, In Production, Freight Collect) */}
          {isSeller && order.status === "in_production" && shippingMetadata?.shippingType === "freight_collect" && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <h4 className="font-medium">Add Tracking Information</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Select value={trackingCarrier} onValueChange={setTrackingCarrier}>
                    <SelectTrigger data-testid="select-carrier">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    placeholder="Tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    data-testid="input-tracking-number"
                  />
                </div>
              </div>
              <Button
                onClick={() => updateTrackingMutation.mutate()}
                disabled={!trackingCarrier || !trackingNumber || updateTrackingMutation.isPending}
                data-testid="button-save-tracking"
              >
                Save Tracking Info
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Actions (Seller Only) */}
      {isSeller && (
        <Card data-testid="card-order-actions">
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {getActionButtons(order.status, isSeller)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
