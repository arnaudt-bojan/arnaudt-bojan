import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Package, User, MapPin, CreditCard, Truck, CalendarClock, Edit2, Check, X, FileText, Download, XCircle, AlertCircle, Plus, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OrderActionBar } from "@/components/order-action-bar";
import { OrderTimeline } from "@/components/order-timeline";
import type { Order, OrderItem, UpdateCustomerDetails } from "@shared/schema";
import { updateCustomerDetailsSchema } from "@shared/schema";
import { getPaymentStatusLabel } from "@/lib/format-status";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { CountrySelect } from "@/components/CountrySelect";
import { getCountryName } from "@shared/countries";
import { z } from "zod";

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

interface ShippingLabel {
  id: string;
  orderId: string;
  sellerId: string;
  shippoTransactionId: string;
  baseCostUsd: string;
  markupPercent: string;
  totalChargedUsd: string;
  labelUrl: string;
  trackingNumber: string;
  carrier: string;
  serviceLevelName: string;
  status: string;
  purchasedAt: string;
  voidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface LabelRefund {
  id: string;
  labelId: string;
  shippoRefundId: string;
  status: string;
  requestedAt: string;
  resolvedAt?: string;
  rejectionReason?: string;
}

interface WarehouseAddress {
  id: string;
  sellerId: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
  isDefault: number;
  shippoAddressObjectId: string | null;
}

const warehouseAddressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  addressLine1: z.string().min(1, "Street address is required"),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  countryCode: z.string().length(2, "Country code is required"),
  phone: z.string().optional().or(z.literal("")),
});

type WarehouseAddressFormData = z.infer<typeof warehouseAddressSchema>;

export function OrderRowExpanded({ orderId }: OrderRowExpandedProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState<Date | undefined>(undefined);
  const [isEditingCustomerDetails, setIsEditingCustomerDetails] = useState(false);
  const [cancelingLabelId, setCancelingLabelId] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [showAddWarehouseDialog, setShowAddWarehouseDialog] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<OrderDetailsResponse>({
    queryKey: [`/api/seller/orders/${orderId}`],
  });

  // Fetch shipping labels if order has a label
  const { data: labelsData, isLoading: labelsLoading } = useQuery<{ labels: ShippingLabel[]; refunds: LabelRefund[] }>({
    queryKey: [`/api/orders/${orderId}/labels`],
    enabled: !!data?.order?.shippingLabelId,
  });

  // Fetch seller wallet balance
  const { data: walletBalance, isLoading: balanceLoading } = useQuery<{ balance: number; currency: string }>({
    queryKey: ["/api/seller/wallet/balance"],
  });

  // Fetch warehouse addresses for label purchase
  const { data: warehouseAddresses = [], isLoading: warehouseLoading } = useQuery<WarehouseAddress[]>({
    queryKey: ["/api/seller/warehouse-addresses"],
  });

  // Set default warehouse when addresses load
  useEffect(() => {
    if (warehouseAddresses.length > 0 && !selectedWarehouseId) {
      const defaultAddress = warehouseAddresses.find(addr => addr.isDefault === 1);
      setSelectedWarehouseId(defaultAddress?.id || warehouseAddresses[0].id);
    }
  }, [warehouseAddresses, selectedWarehouseId]);

  // Mutation to update delivery date
  const updateDeliveryDateMutation = useMutation({
    mutationFn: async ({ itemId, deliveryDate, notify }: { itemId: string; deliveryDate: string; notify: boolean }) => {
      const response = await apiRequest(
        "PUT",
        `/api/seller/orders/${orderId}/items/${itemId}/delivery-date`,
        { deliveryDate, notify }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update delivery date");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${orderId}`] });
      toast({
        title: variables.notify ? "Delivery date updated & buyer notified" : "Delivery date updated",
        description: variables.notify ? "The buyer has been notified of the new delivery date" : "Delivery date saved successfully",
      });
      setEditingItemId(null);
      setNewDeliveryDate(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update delivery date",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize customer details form (will be properly set when data is loaded)
  const customerDetailsForm = useForm<UpdateCustomerDetails>({
    resolver: zodResolver(updateCustomerDetailsSchema),
    defaultValues: {
      customerName: "",
      shippingStreet: "",
      shippingCity: "",
      shippingState: "",
      shippingPostalCode: "",
      shippingCountry: "",
      billingStreet: "",
      billingCity: "",
      billingState: "",
      billingPostalCode: "",
      billingCountry: "",
    },
  });

  // Populate form with order data when it loads
  useEffect(() => {
    if (data?.order) {
      customerDetailsForm.reset({
        customerName: data.order.customerName,
        shippingStreet: data.order.shippingStreet || "",
        shippingCity: data.order.shippingCity || "",
        shippingState: data.order.shippingState || "",
        shippingPostalCode: data.order.shippingPostalCode || "",
        shippingCountry: data.order.shippingCountry || "",
        billingStreet: data.order.billingStreet || "",
        billingCity: data.order.billingCity || "",
        billingState: data.order.billingState || "",
        billingPostalCode: data.order.billingPostalCode || "",
        billingCountry: data.order.billingCountry || "",
      });
    }
  }, [data?.order, customerDetailsForm]);

  // Mutation to update customer details
  const updateCustomerDetailsMutation = useMutation({
    mutationFn: async (data: UpdateCustomerDetails) => {
      const response = await apiRequest(
        "PUT",
        `/api/seller/orders/${orderId}/customer-details`,
        data
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update customer details");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${orderId}`] });
      toast({
        title: variables.notify ? "Customer details updated & buyer notified" : "Customer details updated",
        description: variables.notify ? "The buyer has been notified of the updated details" : "Customer details saved successfully",
      });
      setIsEditingCustomerDetails(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update customer details",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Warehouse address form
  const warehouseForm = useForm<WarehouseAddressFormData>({
    resolver: zodResolver(warehouseAddressSchema),
    defaultValues: {
      name: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      countryCode: "US",
      phone: "",
    },
  });

  // Mutation to create warehouse address
  const createWarehouseMutation = useMutation({
    mutationFn: async (data: WarehouseAddressFormData) => {
      const response = await apiRequest("POST", "/api/seller/warehouse-addresses", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add warehouse address");
      }
      return response.json();
    },
    onSuccess: (newAddress: WarehouseAddress) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/warehouse-addresses"] });
      setSelectedWarehouseId(newAddress.id);
      setShowAddWarehouseDialog(false);
      warehouseForm.reset();
      toast({ 
        title: "Warehouse address added", 
        description: "You can now use this address for shipping labels" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add warehouse address", 
        variant: "destructive" 
      });
    },
  });

  // Mutation to purchase shipping label (with warehouse address ID)
  const purchaseLabelMutation = useMutation({
    mutationFn: async (warehouseAddressId: string) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/labels`, { warehouseAddressId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to purchase shipping label");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/labels`] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/wallet/balance"] });
      toast({
        title: "Shipping label purchased",
        description: "Label has been purchased successfully and is ready to download",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to purchase label",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to cancel shipping label
  const cancelLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/labels/${labelId}/cancel`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel shipping label");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/labels`] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/credit-ledger"] });
      setCancelingLabelId(null);
      toast({
        title: "Label cancelled",
        description: "Shipping label has been cancelled. Refund is being processed.",
      });
    },
    onError: (error: Error) => {
      setCancelingLabelId(null);
      toast({
        title: "Failed to cancel label",
        description: error.message,
        variant: "destructive",
      });
    },
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
          orderItems={items}
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
                    {((item as any).variantSku || (item as any).productSku) && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-order-item-sku-${order.id}-${item.id}`}>
                        SKU: {(item as any).variantSku || (item as any).productSku}
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
                    
                    {/* Delivery Date with Edit Capability */}
                    {(item.productType === "pre-order" || item.productType === "made-to-order") && (
                      <div className="mt-2">
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-[200px] justify-start text-left font-normal"
                                  data-testid={`button-select-date-${item.id}`}
                                >
                                  <CalendarClock className="mr-2 h-4 w-4" />
                                  {newDeliveryDate ? format(newDeliveryDate, 'PPP') : 'Select date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={newDeliveryDate}
                                  onSelect={setNewDeliveryDate}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (newDeliveryDate) {
                                  updateDeliveryDateMutation.mutate({
                                    itemId: item.id,
                                    deliveryDate: newDeliveryDate.toISOString(),
                                    notify: true
                                  });
                                }
                              }}
                              disabled={!newDeliveryDate || updateDeliveryDateMutation.isPending}
                              data-testid={`button-save-notify-${item.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save & Notify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (newDeliveryDate) {
                                  updateDeliveryDateMutation.mutate({
                                    itemId: item.id,
                                    deliveryDate: newDeliveryDate.toISOString(),
                                    notify: false
                                  });
                                }
                              }}
                              disabled={!newDeliveryDate || updateDeliveryDateMutation.isPending}
                              data-testid={`button-save-${item.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingItemId(null);
                                setNewDeliveryDate(undefined);
                              }}
                              data-testid={`button-cancel-${item.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground" data-testid={`text-delivery-date-${item.id}`}>
                              <CalendarClock className="inline h-4 w-4 mr-1" />
                              {(item as any).deliveryDate 
                                ? `Estimated Delivery: ${format(new Date((item as any).deliveryDate), 'PPP')}`
                                : item.productType === "pre-order"
                                  ? "Pre-order (delivery date not set)"
                                  : `Made-to-order (${(item as any).madeToOrderLeadTime || 0} days lead time)`
                              }
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setNewDeliveryDate((item as any).deliveryDate ? new Date((item as any).deliveryDate) : undefined);
                              }}
                              data-testid={`button-edit-delivery-${item.id}`}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
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

      {/* Shipping Label Section */}
      {data?.order && (
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold mb-4">
            <FileText className="h-4 w-4" />
            <span>Shipping Label</span>
          </div>

          {/* Label Purchase Section - Show when ready to ship and no label exists */}
          {!order.shippingLabelId && 
           order.shippingStreet && 
           order.shippingCity && 
           order.shippingPostalCode && 
           order.shippingCountry && 
           order.paymentStatus !== "pending" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Warehouse className="h-4 w-4" />
                  Purchase Shipping Label
                </CardTitle>
                <CardDescription>
                  Select a warehouse address to ship from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Shipping To:</p>
                  <div className="ml-4 text-sm">
                    <p>{order.shippingCity}, {order.shippingState}</p>
                    <p>{order.shippingPostalCode}, {order.shippingCountry}</p>
                  </div>
                </div>

                {warehouseAddresses.length === 0 ? (
                  <div className="p-4 border rounded-lg space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You need to add a warehouse address before purchasing a shipping label.
                    </p>
                    <Button
                      onClick={() => setShowAddWarehouseDialog(true)}
                      variant="outline"
                      size="sm"
                      data-testid="button-add-first-warehouse-inline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Warehouse Address
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ship From Warehouse</label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedWarehouseId}
                          onValueChange={setSelectedWarehouseId}
                        >
                          <SelectTrigger data-testid="select-warehouse">
                            <SelectValue placeholder="Select warehouse..." />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouseAddresses.map((addr) => (
                              <SelectItem key={addr.id} value={addr.id} data-testid={`option-warehouse-${addr.id}`}>
                                {addr.name} - {addr.city}, {addr.state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => setShowAddWarehouseDialog(true)}
                          variant="outline"
                          size="icon"
                          data-testid="button-add-warehouse-inline"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Wallet Balance Display */}
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Wallet Balance:</span>
                        {balanceLoading ? (
                          <Skeleton className="h-5 w-16" />
                        ) : (
                          <span className="font-semibold" data-testid="text-wallet-balance">
                            ${walletBalance?.balance?.toFixed(2) || '0.00'}
                          </span>
                        )}
                      </div>
                      {walletBalance && walletBalance.balance < 10 && (
                        <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <p>Low balance. Shipping labels typically cost $10-$25.</p>
                            <a 
                              href="/seller/wallet" 
                              className="underline font-medium hover:text-orange-700 dark:hover:text-orange-300"
                              data-testid="link-add-funds"
                            >
                              Add funds to wallet
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={() => purchaseLabelMutation.mutate(selectedWarehouseId)}
                      disabled={purchaseLabelMutation.isPending || !selectedWarehouseId || (walletBalance && walletBalance.balance < 1)}
                      data-testid="button-purchase-label"
                      className="w-full"
                    >
                      {purchaseLabelMutation.isPending ? "Purchasing..." : "Purchase Shipping Label"}
                    </Button>
                    
                    {walletBalance && walletBalance.balance < 1 && (
                      <p className="text-xs text-center text-destructive" data-testid="text-insufficient-funds">
                        Insufficient wallet balance. Please add funds to continue.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Label Details Section - Show when label exists */}
          {order.shippingLabelId && (
            <div className="space-y-4">
              {labelsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : labelsData && labelsData.labels.length > 0 ? (
                labelsData.labels.map((label) => {
                  const refund = labelsData.refunds.find(r => r.labelId === label.id);
                  const markupPercent = parseFloat(label.markupPercent || "20");
                  
                  return (
                    <Card key={label.id}>
                      <CardContent className="pt-6 space-y-4">
                        {/* Label Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Carrier</p>
                            <p className="font-medium">{label.carrier}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Service Level</p>
                            <p className="font-medium">{label.serviceLevelName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tracking Number</p>
                            <p className="font-medium" data-testid="text-tracking-number">
                              {label.trackingNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <Badge variant="outline">
                              {label.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Badge>
                          </div>
                        </div>

                        {/* Pricing Breakdown */}
                        <div className="border-t pt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base Cost:</span>
                            <span data-testid="text-base-cost">
                              ${parseFloat(label.baseCostUsd).toFixed(2)} USD
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform Markup ({markupPercent}%):</span>
                            <span>
                              ${(parseFloat(label.baseCostUsd) * (markupPercent / 100)).toFixed(2)} USD
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-2">
                            <span>Total Charged:</span>
                            <span data-testid="text-total-cost">
                              ${parseFloat(label.totalChargedUsd).toFixed(2)} USD
                            </span>
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div className="text-sm text-muted-foreground">
                          <p>Created: {format(new Date(label.createdAt), "PPP p")}</p>
                          {label.purchasedAt && (
                            <p>Purchased: {format(new Date(label.purchasedAt), "PPP p")}</p>
                          )}
                          {label.voidedAt && (
                            <p>Voided: {format(new Date(label.voidedAt), "PPP p")}</p>
                          )}
                        </div>

                        {/* Refund Status */}
                        {refund && (
                          <div className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-3 rounded-md">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                              <div className="flex-1 text-sm">
                                <p className="font-medium text-orange-900 dark:text-orange-100">
                                  Refund Status: {refund.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </p>
                                {refund.rejectionReason && (
                                  <p className="text-orange-700 dark:text-orange-300 mt-1">
                                    Reason: {refund.rejectionReason}
                                  </p>
                                )}
                                <p className="text-orange-600 dark:text-orange-400 mt-1">
                                  Requested: {format(new Date(refund.requestedAt), "PPP p")}
                                </p>
                                {refund.resolvedAt && (
                                  <p className="text-orange-600 dark:text-orange-400">
                                    Resolved: {format(new Date(refund.resolvedAt), "PPP p")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(label.labelUrl, "_blank")}
                            data-testid="button-download-label"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Label PDF
                          </Button>
                          {label.status === "purchased" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setCancelingLabelId(label.id)}
                              disabled={cancelLabelMutation.isPending}
                              data-testid="button-cancel-label"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Label
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No labels found</p>
              )}
            </div>
          )}

          {/* No Label Section - when not ready */}
          {!order.shippingLabelId && 
           (!order.shippingStreet || !order.shippingCity || !order.shippingPostalCode || !order.shippingCountry) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p>Complete shipping address required before purchasing a label</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!order.shippingLabelId && order.paymentStatus === "pending" && order.shippingStreet && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p>Payment required before purchasing a shipping label</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Cancel Label Confirmation Dialog */}
      <AlertDialog open={!!cancelingLabelId} onOpenChange={(open) => !open && setCancelingLabelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Shipping Label?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this shipping label? This action will request a refund from the carrier.
              The refund may take several days to process and may be rejected if the label has already been scanned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelingLabelId) {
                  cancelLabelMutation.mutate(cancelingLabelId);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, Cancel Label
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer Details with Edit Capability */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Customer Details</h3>
          {!isEditingCustomerDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditingCustomerDetails(true);
                // Reset form with current order values
                customerDetailsForm.reset({
                  customerName: order.customerName,
                  shippingStreet: order.shippingStreet ?? "",
                  shippingCity: order.shippingCity ?? "",
                  shippingState: order.shippingState ?? "",
                  shippingPostalCode: order.shippingPostalCode ?? "",
                  shippingCountry: order.shippingCountry ?? "",
                  billingStreet: order.billingStreet ?? "",
                  billingCity: order.billingCity ?? "",
                  billingState: order.billingState ?? "",
                  billingPostalCode: order.billingPostalCode ?? "",
                  billingCountry: order.billingCountry ?? "",
                });
              }}
              data-testid="button-edit-customer-details"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {isEditingCustomerDetails ? (
          <Form {...customerDetailsForm}>
            <form className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={customerDetailsForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <FormLabel>Customer Email</FormLabel>
                    <Input value={order.customerEmail} disabled data-testid="input-customer-email-readonly" />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Shipping Address</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={customerDetailsForm.control}
                    name="shippingStreet"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-shipping-street" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={customerDetailsForm.control}
                    name="shippingCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-shipping-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={customerDetailsForm.control}
                    name="shippingState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-shipping-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={customerDetailsForm.control}
                    name="shippingPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-shipping-postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={customerDetailsForm.control}
                    name="shippingCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-shipping-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Billing Address</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={customerDetailsForm.control}
                    name="billingStreet"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-billing-street" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={customerDetailsForm.control}
                    name="billingCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-billing-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={customerDetailsForm.control}
                    name="billingState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-billing-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={customerDetailsForm.control}
                    name="billingPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-billing-postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={customerDetailsForm.control}
                    name="billingCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-billing-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  onClick={customerDetailsForm.handleSubmit((data) => {
                    updateCustomerDetailsMutation.mutate({ ...data, notify: true });
                  })}
                  disabled={updateCustomerDetailsMutation.isPending}
                  data-testid="button-save-notify-customer-details"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save & Notify
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={customerDetailsForm.handleSubmit((data) => {
                    updateCustomerDetailsMutation.mutate({ ...data, notify: false });
                  })}
                  disabled={updateCustomerDetailsMutation.isPending}
                  data-testid="button-save-customer-details"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingCustomerDetails(false)}
                  data-testid="button-cancel-customer-details"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Customer Name</p>
                <p className="font-medium" data-testid="text-customer-name">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer Email</p>
                <p className="font-medium" data-testid="text-customer-email">{order.customerEmail}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" />
                <p className="text-sm font-medium">Shipping Address</p>
              </div>
              <div className="ml-6" data-testid="text-shipping-address">
                <p>{order.shippingStreet}</p>
                <p>{order.shippingCity}, {order.shippingState} {order.shippingPostalCode}</p>
                <p>{order.shippingCountry}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4" />
                <p className="text-sm font-medium">Billing Address</p>
              </div>
              <div className="ml-6 text-muted-foreground" data-testid="text-billing-address">
                {order.billingStreet ? (
                  <>
                    <p>{order.billingStreet}</p>
                    <p>{order.billingCity}, {order.billingState} {order.billingPostalCode}</p>
                    <p>{order.billingCountry}</p>
                  </>
                ) : (
                  <p className="italic">Same as shipping address</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Timeline */}
      <div className="border-t pt-6">
        <OrderTimeline events={events} />
      </div>

      {/* Add Warehouse Dialog */}
      <Dialog open={showAddWarehouseDialog} onOpenChange={setShowAddWarehouseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Warehouse Address</DialogTitle>
            <DialogDescription>
              Add a new warehouse address for shipping
            </DialogDescription>
          </DialogHeader>
          <Form {...warehouseForm}>
            <form onSubmit={warehouseForm.handleSubmit((data) => createWarehouseMutation.mutate(data))} className="space-y-4">
              <FormField
                control={warehouseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Main Warehouse, NYC Location" data-testid="input-warehouse-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={warehouseForm.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <CountrySelect
                      value={field.value}
                      onValueChange={(code: string) => field.onChange(code)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Search Address</FormLabel>
                <AddressAutocompleteInput
                  value={warehouseForm.watch("addressLine1") || ""}
                  onChange={(value: any) => warehouseForm.setValue("addressLine1", value)}
                  onSelectAddress={(address: any) => {
                    if (address.line1) warehouseForm.setValue("addressLine1", address.line1);
                    if (address.line2) warehouseForm.setValue("addressLine2", address.line2 || "");
                    if (address.city) warehouseForm.setValue("city", address.city);
                    if (address.state) warehouseForm.setValue("state", address.state);
                    if (address.postalCode) warehouseForm.setValue("postalCode", address.postalCode);
                  }}
                  countryCode={warehouseForm.watch("countryCode")}
                />
              </FormItem>

              <FormField
                control={warehouseForm.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main Street" data-testid="input-address-line1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={warehouseForm.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apartment/Suite (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Suite 4B" data-testid="input-address-line2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={warehouseForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="San Francisco" data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={warehouseForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CA" data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={warehouseForm.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="94117" data-testid="input-postal-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={warehouseForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1 (555) 123-4567" data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddWarehouseDialog(false);
                    warehouseForm.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createWarehouseMutation.isPending}
                  data-testid="button-save"
                >
                  {createWarehouseMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
