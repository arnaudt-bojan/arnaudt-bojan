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
import { PurchaseShippingLabelDialog, ShippingLabelSuccessDialog, ShippingLabelDetailsDialog } from "@/components/shipping-label-modals";
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
  const [showAddWarehouseDialog, setShowAddWarehouseDialog] = useState(false);
  
  // Shipping label modal states
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);
  
  const { toast } = useToast();

  const { data, isLoading } = useQuery<OrderDetailsResponse>({
    queryKey: [`/api/seller/orders/${orderId}`],
  });

  // Note: Warehouse addresses and wallet balance queries are now handled in the modals

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

  // Note: Shipping label mutations are now handled in the modal components

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
          onPurchaseLabel={() => setShowPurchaseDialog(true)}
          onViewLabel={() => setShowDetailsDialog(true)}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" />
              <span>Customer Information</span>
            </div>
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
                  <h4 className="font-medium mb-3 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </h4>
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
                  <h4 className="font-medium mb-3 flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Billing Address
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={customerDetailsForm.control}
                      name="billingStreet"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Same as shipping" data-testid="input-billing-street" />
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

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingCustomerDetails(false)}
                    data-testid="button-cancel-customer-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={customerDetailsForm.handleSubmit((data) => {
                      updateCustomerDetailsMutation.mutate({ ...data, notify: false });
                    })}
                    disabled={updateCustomerDetailsMutation.isPending}
                    data-testid="button-save-customer-details"
                  >
                    {updateCustomerDetailsMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
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
                  Billing Address:
                </span>
                <div className="font-medium whitespace-pre-line ml-5 text-muted-foreground" data-testid="text-billing-address">
                  {order.billingStreet 
                    ? `${order.billingName}\n${order.billingStreet}\n${order.billingCity}, ${order.billingState} ${order.billingPostalCode}\n${order.billingCountry}`
                    : order.customerAddress}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground flex items-start gap-1">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  Shipping Address:
                </span>
                <div className="font-medium whitespace-pre-line ml-5 text-muted-foreground" data-testid="text-shipping-address">
                  {order.shippingStreet
                    ? `${order.shippingStreet}\n${order.shippingCity}, ${order.shippingState} ${order.shippingPostalCode}\n${order.shippingCountry}`
                    : order.customerAddress}
                </div>
              </div>
            </div>
          )}
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
                                  : (item as any).madeToOrderLeadTime && (item as any).madeToOrderLeadTime > 0
                                    ? `Made-to-order (${(item as any).madeToOrderLeadTime} days lead time)`
                                    : "Made-to-order (lead time not set)"
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
                    <div className="font-medium" data-testid={`text-item-subtotal-${item.id}`}>
                      {order.currency} {parseFloat(item.subtotal).toFixed(2)}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <Badge className={getItemStatusColor(item.itemStatus)} data-testid={`badge-item-status-${item.id}`}>
                        {item.itemStatus.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </div>
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

      {/* Shipping Label Modals */}
      {data?.order && (
        <>
          <PurchaseShippingLabelDialog
            open={showPurchaseDialog}
            onOpenChange={setShowPurchaseDialog}
            orderId={orderId}
            order={order}
            onSuccess={(labelData) => {
              setLabelData(labelData);
              setShowSuccessDialog(true);
            }}
          />

          <ShippingLabelSuccessDialog
            open={showSuccessDialog}
            onOpenChange={setShowSuccessDialog}
            labelData={labelData}
          />

          <ShippingLabelDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            orderId={orderId}
          />
        </>
      )}
    </div>
  );
}
