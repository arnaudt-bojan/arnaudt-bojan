import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RefundDialog } from "@/components/refund-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Package, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  DollarSign,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { Order } from "@shared/schema";

export default function OrderManagement() {
  const { toast } = useToast();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/seller/orders"],
  });

  // Fetch order items when refund dialog is opened
  const { data: orderItems } = useQuery<any[]>({
    queryKey: ["/api/orders", selectedOrderForRefund?.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${selectedOrderForRefund?.id}/items`);
      if (!res.ok) throw new Error("Failed to fetch order items");
      return res.json();
    },
    enabled: !!selectedOrderForRefund && refundDialogOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      toast({ title: "Status updated", description: "Order status has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" });
    },
  });

  const triggerBalancePaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/trigger-balance-payment/${orderId}`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Balance payment link created",
        description: "Customer will receive payment link to complete the balance",
      });
      // In a real app, you'd send this link to the customer via email
      console.log("Payment link:", data.paymentLink);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create balance payment",
        variant: "destructive",
      });
    },
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
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      deposit_paid: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      fully_paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      refunded: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels = {
      pending: "Pending Payment",
      deposit_paid: "Deposit Paid",
      fully_paid: "Fully Paid",
      refunded: "Refunded",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-orders-title">
            Order Management
          </h1>
          <p className="text-muted-foreground">
            View, manage, and process all customer orders
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))}
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const parsedItems = JSON.parse(order.items);
              const isExpanded = expandedOrders.has(order.id);
              const needsBalancePayment = order.paymentStatus === "deposit_paid" && parseFloat(order.remainingBalance || "0") > 0;

              return (
                <Card key={order.id} className="overflow-hidden" data-testid={`card-order-${order.id}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleOrder(order.id)}>
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Package className="h-5 w-5 flex-shrink-0" />
                            <h3 className="text-lg font-semibold">
                              Order #{order.id.slice(0, 8).toUpperCase()}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(new Date(order.createdAt), "PPp")}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {order.userId ? order.customerName : `${order.customerEmail} (Guest)`}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getStatusColor(order.status)} data-testid={`badge-status-${order.id}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                          <Badge className={getPaymentStatusColor(order.paymentStatus || "pending")} data-testid={`badge-payment-${order.id}`}>
                            {getPaymentStatusLabel(order.paymentStatus || "pending")}
                          </Badge>
                        </div>
                      </div>

                      {/* Quick Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold">${parseFloat(order.total).toFixed(2)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Amount Paid</p>
                            <p className="font-semibold">${parseFloat(order.amountPaid || "0").toFixed(2)}</p>
                          </div>
                        </div>

                        {parseFloat(order.remainingBalance || "0") > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="text-muted-foreground">Balance Due</p>
                              <p className="font-semibold text-orange-600 dark:text-orange-400">
                                ${parseFloat(order.remainingBalance || "0").toFixed(2)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expand/Collapse Button */}
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          data-testid={`button-toggle-${order.id}`}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show Details
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    {/* Expanded Content */}
                    <CollapsibleContent>
                      <Separator />
                      <div className="p-6 bg-muted/30">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-6">
                            {/* Order Items */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Order Items
                              </h4>
                              <div className="space-y-3">
                                {parsedItems.map((item: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-start p-3 rounded-lg bg-background"
                                    data-testid={`item-${order.id}-${index}`}
                                  >
                                    <div>
                                      <p className="font-medium">{item.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Quantity: {item.quantity} × ${parseFloat(item.price).toFixed(2)}
                                      </p>
                                    </div>
                                    <p className="font-semibold">
                                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Payment Details */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Payment Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Payment Type:</span>
                                  <Badge variant="outline">{order.paymentType}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Total Amount:</span>
                                  <span className="font-medium">${parseFloat(order.total).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Amount Paid:</span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    ${parseFloat(order.amountPaid || "0").toFixed(2)}
                                  </span>
                                </div>
                                {parseFloat(order.remainingBalance || "0") > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Remaining Balance:</span>
                                    <span className="font-medium text-orange-600 dark:text-orange-400">
                                      ${parseFloat(order.remainingBalance || "0").toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-6">
                            {/* Customer Information */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Customer Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">{order.userId ? 'Name' : 'Customer'}</p>
                                  <p className="font-medium">
                                    {order.userId ? order.customerName : `${order.customerEmail} (Guest)`}
                                  </p>
                                </div>
                                {order.userId && (
                                  <div>
                                    <p className="text-muted-foreground">Email</p>
                                    <p className="font-medium">{order.customerEmail}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    Shipping Address
                                  </p>
                                  <p className="font-medium">{order.customerAddress}</p>
                                </div>
                              </div>
                            </div>

                            {/* Order Management */}
                            <div>
                              <h4 className="font-semibold mb-3">Order Management</h4>
                              
                              <div className="space-y-3">
                                {/* Update Status */}
                                <div>
                                  <label className="text-sm text-muted-foreground mb-2 block">
                                    Update Status
                                  </label>
                                  <Select
                                    value={order.status}
                                    onValueChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                                  >
                                    <SelectTrigger data-testid={`select-status-${order.id}`}>
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

                                {/* Trigger Balance Payment */}
                                {needsBalancePayment && (
                                  <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-start gap-2 mb-3">
                                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-medium text-orange-900 dark:text-orange-100">
                                          Balance Payment Required
                                        </p>
                                        <p className="text-sm text-orange-700 dark:text-orange-300">
                                          Customer paid ${parseFloat(order.amountPaid || "0").toFixed(2)} deposit.
                                          Remaining balance: ${parseFloat(order.remainingBalance || "0").toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => triggerBalancePaymentMutation.mutate(order.id)}
                                      disabled={triggerBalancePaymentMutation.isPending}
                                      className="w-full gap-2"
                                      data-testid={`button-trigger-balance-${order.id}`}
                                    >
                                      <CreditCard className="h-4 w-4" />
                                      {triggerBalancePaymentMutation.isPending 
                                        ? "Creating Payment Link..." 
                                        : "Request Balance Payment"}
                                    </Button>
                                  </div>
                                )}

                                {order.paymentStatus === "fully_paid" && (
                                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 text-green-900 dark:text-green-100">
                                      <CheckCircle2 className="h-5 w-5" />
                                      <span className="font-medium">Payment Complete</span>
                                    </div>
                                  </div>
                                )}

                                {/* Refund Button */}
                                {parseFloat(order.amountPaid || "0") > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedOrderForRefund(order);
                                      setRefundDialogOpen(true);
                                    }}
                                    data-testid={`button-process-refund-${order.id}`}
                                    className="w-full"
                                  >
                                    Process Refund
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground">
                Orders will appear here once customers start purchasing
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Refund Dialog */}
      {selectedOrderForRefund && orderItems && (
        <RefundDialog
          key={selectedOrderForRefund.id}
          open={refundDialogOpen}
          onOpenChange={(open) => {
            setRefundDialogOpen(open);
            if (!open) setSelectedOrderForRefund(null);
          }}
          orderId={selectedOrderForRefund.id}
          orderItems={orderItems}
          orderTotal={selectedOrderForRefund.total}
          amountPaid={selectedOrderForRefund.amountPaid || "0"}
        />
      )}
    </div>
  );
}
