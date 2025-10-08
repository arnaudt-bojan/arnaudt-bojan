import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowLeft, Package, Mail, MapPin, DollarSign, Truck, CreditCard } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Order = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: string;
  total: string;
  amountPaid: string;
  remainingBalance: string;
  paymentType: string;
  paymentStatus: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  trackingNumber?: string;
  trackingLink?: string;
  createdAt: string;
};

export default function OrderDetail() {
  const { id } = useParams() as { id: string };
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingLink, setTrackingLink] = useState("");

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["/api/orders", id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      return res.json();
    },
    onSuccess: (data) => {
      setTrackingNumber(data.trackingNumber || "");
      setTrackingLink(data.trackingLink || "");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Status updated", description: "Order status has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" });
    },
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async ({ notifyCustomer }: { notifyCustomer: boolean }) => {
      return await apiRequest("PATCH", `/api/orders/${id}/tracking`, {
        trackingNumber,
        trackingLink,
        notifyCustomer,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ 
        title: "Tracking updated", 
        description: "Tracking information has been saved and customer notified" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update tracking information", 
        variant: "destructive" 
      });
    },
  });

  const requestBalanceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/orders/${id}/request-balance`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      toast({ 
        title: "Balance requested", 
        description: "Payment request has been sent to the customer" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to request balance payment", 
        variant: "destructive" 
      });
    },
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

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      deposit_paid: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      fully_paid: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      refunded: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Skeleton className="h-10 w-48 mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/orders")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground">Order not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsedItems = JSON.parse(order.items);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/orders")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </Button>

      <div className="space-y-6">
        <Card data-testid="card-order-detail">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order #{order.id.slice(0, 8)}
                </CardTitle>
                <CardDescription>
                  Placed on {format(new Date(order.createdAt), "PPP")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={getPaymentStatusColor(order.paymentStatus)}
                  data-testid="badge-payment-status"
                >
                  {order.paymentStatus.replace("_", " ").charAt(0).toUpperCase() + order.paymentStatus.slice(1).replace("_", " ")}
                </Badge>
                <Badge
                  variant="outline"
                  className={getStatusColor(order.status)}
                  data-testid="badge-order-status"
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items
              </h4>
              <div className="space-y-3">
                {parsedItems.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                    data-testid={`item-${index}`}
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <span className="font-semibold">
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Customer Information
                </h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {order.customerName}</p>
                  <p><span className="text-muted-foreground">Email:</span> {order.customerEmail}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </h4>
                <p className="text-sm">{order.customerAddress}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payment Details
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium" data-testid="text-total">
                    ${parseFloat(order.total).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-medium text-green-600 dark:text-green-400" data-testid="text-amount-paid">
                    ${parseFloat(order.amountPaid).toFixed(2)}
                  </span>
                </div>
                {parseFloat(order.remainingBalance) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining Balance:</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400" data-testid="text-remaining-balance">
                      ${parseFloat(order.remainingBalance).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Update Order Status</h4>
              <Select
                value={order.status}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Tracking Information
              </h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tracking-number">Tracking Number</Label>
                  <Input
                    id="tracking-number"
                    placeholder="Enter tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    data-testid="input-tracking-number"
                  />
                </div>
                <div>
                  <Label htmlFor="tracking-link">Tracking Link</Label>
                  <Input
                    id="tracking-link"
                    placeholder="https://tracking.example.com/..."
                    value={trackingLink}
                    onChange={(e) => setTrackingLink(e.target.value)}
                    data-testid="input-tracking-link"
                  />
                </div>
                <Button
                  onClick={() => updateTrackingMutation.mutate({ notifyCustomer: true })}
                  disabled={!trackingNumber || updateTrackingMutation.isPending}
                  data-testid="button-save-notify"
                >
                  {updateTrackingMutation.isPending ? "Saving..." : "Save & Notify Customer"}
                </Button>
              </div>
            </div>

            {parseFloat(order.remainingBalance) > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Request Balance Payment
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Send a payment request to the customer for the remaining balance of ${parseFloat(order.remainingBalance).toFixed(2)}
                </p>
                <Button
                  variant="outline"
                  onClick={() => requestBalanceMutation.mutate()}
                  disabled={requestBalanceMutation.isPending}
                  data-testid="button-request-balance"
                >
                  {requestBalanceMutation.isPending ? "Sending..." : "Request Balance Payment"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
