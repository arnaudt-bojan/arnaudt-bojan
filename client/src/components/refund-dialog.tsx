import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, AlertTriangle, Minus, Plus, Package, Truck, Receipt, History } from "lucide-react";
import type { OrderItem } from "@shared/schema";

interface RefundLineItem {
  type: 'product' | 'shipping' | 'tax' | 'adjustment';
  orderItemId?: string;
  quantity?: number;
  amount: string;
  description?: string;
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderItems?: OrderItem[]; // Made optional, will fetch if not provided
  shippingCost: string;
  taxAmount: string;
  currency?: string;
}

interface RefundableData {
  totalRefundable: string;
  refundedSoFar: string;
  itemRefundables: Record<string, { maxRefundable: string; refundedAlready: string }>;
}

interface RefundHistoryItem {
  id: string;
  totalAmount: string;
  reason: string | null;
  status: string;
  createdAt: string;
  lineItems: Array<{
    type: string;
    amount: string;
    quantity: number | null;
    description: string | null;
  }>;
}

export function RefundDialog({
  open,
  onOpenChange,
  orderId,
  orderItems: providedOrderItems,
  shippingCost,
  taxAmount,
  currency = "USD",
}: RefundDialogProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; amount: number }>>(new Map());
  const [refundShipping, setRefundShipping] = useState(false);
  const [refundTax, setRefundTax] = useState(false);
  const [reason, setReason] = useState("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [customRefundAmount, setCustomRefundAmount] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);

  // Fetch order items if not provided
  const { data: fetchedOrderData, isLoading: isLoadingOrder, error: orderError } = useQuery<{ items: OrderItem[] }>({
    queryKey: ["/api/seller/orders", orderId],
    enabled: open && !providedOrderItems,
  });

  // Use provided orderItems or fetch them
  const orderItems = providedOrderItems || fetchedOrderData?.items || [];

  // Fetch refundable amounts
  const { data: refundableData, isLoading: isLoadingRefundable } = useQuery<RefundableData>({
    queryKey: ["/api/seller/orders", orderId, "refundable"],
    enabled: open,
  });

  // Fetch refund history
  const { data: refundHistory, isLoading: isLoadingHistory } = useQuery<RefundHistoryItem[]>({
    queryKey: ["/api/seller/orders", orderId, "refunds"],
    enabled: open && showHistory,
  });

  const processRefundMutation = useMutation({
    mutationFn: async () => {
      const lineItems: RefundLineItem[] = [];

      // Add selected product items
      for (const [itemId, data] of Array.from(selectedItems.entries())) {
        const orderItem = orderItems.find(i => i.id === itemId);
        if (orderItem) {
          lineItems.push({
            type: 'product',
            orderItemId: itemId,
            quantity: data.quantity,
            amount: data.amount.toFixed(2),
            description: orderItem.productName,
          });
        }
      }

      // Add shipping if selected
      if (refundShipping) {
        lineItems.push({
          type: 'shipping',
          amount: parseFloat(shippingCost).toFixed(2),
          description: 'Shipping refund',
        });
      }

      // Add tax if selected
      if (refundTax) {
        lineItems.push({
          type: 'tax',
          amount: parseFloat(taxAmount).toFixed(2),
          description: 'Tax refund',
        });
      }

      const payload: any = {
        lineItems,
        reason: reason || undefined,
      };

      // Add manual override if used
      if (useCustomAmount) {
        payload.manualOverride = {
          totalAmount: customRefundAmount,
          reason: reason || "Manual refund amount adjustment",
        };
      }

      const response = await apiRequest("POST", `/api/seller/orders/${orderId}/refunds`, payload);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process refund");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Refund processed",
        description: `Successfully refunded ${getCurrencySymbol(currency)}${data.totalAmount}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders", orderId, "refundable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders", orderId, "refunds"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Refund failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedItems(new Map());
    setRefundShipping(false);
    setRefundTax(false);
    setReason("");
    setUseCustomAmount(false);
    setCustomRefundAmount("");
    setShowHistory(false);
  };

  const handleItemToggle = (item: OrderItem) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      const refundableQty = item.quantity - (item.refundedQuantity || 0);
      const pricePerUnit = parseFloat(item.price);
      newSelected.set(item.id, {
        quantity: refundableQty,
        amount: pricePerUnit * refundableQty,
      });
    }
    setSelectedItems(newSelected);
  };

  const updateQuantity = (itemId: string, newQty: number, item: OrderItem) => {
    const newSelected = new Map(selectedItems);
    const pricePerUnit = parseFloat(item.price);
    const refundableQty = item.quantity - (item.refundedQuantity || 0);
    
    // CRITICAL: Validate against API refundable data if available
    let maxAllowedQty = refundableQty;
    if (refundableData?.itemRefundables?.[itemId]) {
      const apiMaxRefundable = parseFloat(refundableData.itemRefundables[itemId].maxRefundable || "0");
      const apiMaxQty = Math.floor(apiMaxRefundable / pricePerUnit);
      maxAllowedQty = Math.min(refundableQty, apiMaxQty);
    }
    
    const clampedQty = Math.max(1, Math.min(newQty, maxAllowedQty));
    
    newSelected.set(itemId, {
      quantity: clampedQty,
      amount: pricePerUnit * clampedQty,
    });
    setSelectedItems(newSelected);
  };

  const calculateRefundAmount = () => {
    let total = 0;
    
    // Add product items
    for (const data of Array.from(selectedItems.values())) {
      total += data.amount;
    }
    
    // CRITICAL: Safe parsing with null/undefined checks
    if (refundShipping && shippingCost) {
      const shipping = parseFloat(shippingCost);
      if (!isNaN(shipping)) {
        total += shipping;
      }
    }
    
    if (refundTax && taxAmount) {
      const tax = parseFloat(taxAmount);
      if (!isNaN(tax)) {
        total += tax;
      }
    }
    
    return total;
  };

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[curr] || curr;
  };

  // Calculate refund amount
  const rawCalculatedAmount = calculateRefundAmount();
  
  // CRITICAL: Safe parsing with fallback - use Infinity if data not loaded yet
  const maxRefundable = refundableData?.totalRefundable 
    ? parseFloat(refundableData.totalRefundable) 
    : Infinity; // Don't cap if we don't have refundable data yet
  
  // Cap calculated refund at maxRefundable (important for deposit orders)
  const calculatedRefundAmount = Math.min(rawCalculatedAmount, maxRefundable);
  const refundAmount = useCustomAmount ? parseFloat(customRefundAmount || "0") : calculatedRefundAmount;
  const canRefund = selectedItems.size > 0 || refundShipping || refundTax;
  const isCustomAmountValid = !useCustomAmount || (refundAmount > 0 && refundAmount <= maxRefundable);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-refund">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Select items, shipping, or tax to refund
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* History Toggle */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-history"
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? "Hide History" : "Show Refund History"}
            </Button>
          </div>

          {/* Refund History */}
          {showHistory && (
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Refund History
              </h3>
              {isLoadingHistory ? (
                <Skeleton className="h-20 w-full" />
              ) : refundHistory && refundHistory.length > 0 ? (
                <div className="space-y-2">
                  {refundHistory.map((refund) => (
                    <div key={refund.id} className="p-3 bg-background rounded border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {refund.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(refund.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="font-semibold">{getCurrencySymbol(currency)}{refund.totalAmount}</p>
                      </div>
                      {refund.reason && (
                        <p className="text-sm text-muted-foreground">{refund.reason}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        {refund.lineItems.map((item, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                            {item.type === 'product' && <Package className="h-3 w-3" />}
                            {item.type === 'shipping' && <Truck className="h-3 w-3" />}
                            {item.type === 'tax' && <Receipt className="h-3 w-3" />}
                            {item.description || item.type}: {getCurrencySymbol(currency)}{item.amount}
                            {item.quantity && ` (qty: ${item.quantity})`}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No refunds yet</p>
              )}
            </div>
          )}

          <Separator />

          {/* Order Items Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product Items
            </Label>
            {isLoadingOrder ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : orderError ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">Failed to load order items</p>
                <p className="text-xs text-destructive/80 mt-1">
                  {orderError instanceof Error ? orderError.message : 'Please make sure you are logged in as a seller'}
                </p>
              </div>
            ) : orderItems.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                No items found for this order
              </p>
            ) : (
              orderItems.map((item) => {
              const refundedQty = item.refundedQuantity || 0;
              const refundableQty = item.quantity - refundedQty;
              const isSelected = selectedItems.has(item.id);
              const selectedData = selectedItems.get(item.id);
              const pricePerUnit = parseFloat(item.price);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid={`refund-item-${item.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleItemToggle(item)}
                      disabled={refundableQty <= 0 || processRefundMutation.isPending}
                      data-testid={`checkbox-item-${item.id}`}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {getCurrencySymbol(currency)}{pricePerUnit.toFixed(2)} per unit • {item.quantity} total
                            {refundedQty > 0 && ` • ${refundedQty} refunded`}
                          </p>
                        </div>
                        <p className="font-semibold">{getCurrencySymbol(currency)}{parseFloat(item.subtotal).toFixed(2)}</p>
                      </div>

                      {/* Quantity Selector */}
                      {isSelected && refundableQty > 1 && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Label className="text-sm">Refund Quantity:</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, (selectedData?.quantity || 1) - 1, item)}
                              disabled={!selectedData || selectedData.quantity <= 1}
                              data-testid={`button-decrease-qty-${item.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={refundableQty}
                              value={selectedData?.quantity || 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                updateQuantity(item.id, val, item);
                              }}
                              className="w-16 h-7 text-center"
                              data-testid={`input-qty-${item.id}`}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, (selectedData?.quantity || 1) + 1, item)}
                              disabled={!selectedData || selectedData.quantity >= refundableQty}
                              data-testid={`button-increase-qty-${item.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm text-muted-foreground ml-2">
                              of {refundableQty} available
                            </span>
                          </div>
                        </div>
                      )}

                      {isSelected && selectedData && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Refunding {getCurrencySymbol(currency)}{selectedData.amount.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>

          <Separator />

          {/* Shipping & Tax Toggles */}
          <div className="space-y-3">
            <Label>Additional Refunds</Label>
            
            {shippingCost && parseFloat(shippingCost) > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Checkbox
                  id="refund-shipping"
                  checked={refundShipping}
                  onCheckedChange={(checked) => setRefundShipping(checked as boolean)}
                  disabled={processRefundMutation.isPending || useCustomAmount}
                  data-testid="checkbox-refund-shipping"
                />
                <Label htmlFor="refund-shipping" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Refund Shipping
                  {useCustomAmount && <span className="text-xs text-muted-foreground">(disabled during manual override)</span>}
                </Label>
                <span className="font-medium">{getCurrencySymbol(currency)}{parseFloat(shippingCost).toFixed(2)}</span>
              </div>
            )}

            {taxAmount && parseFloat(taxAmount) > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Checkbox
                  id="refund-tax"
                  checked={refundTax}
                  onCheckedChange={(checked) => setRefundTax(checked as boolean)}
                  disabled={processRefundMutation.isPending || useCustomAmount}
                  data-testid="checkbox-refund-tax"
                />
                <Label htmlFor="refund-tax" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Refund Tax
                  {useCustomAmount && <span className="text-xs text-muted-foreground">(disabled during manual override)</span>}
                </Label>
                <span className="font-medium">{getCurrencySymbol(currency)}{parseFloat(taxAmount).toFixed(2)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Refund Reason */}
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Refund Reason (Optional)</Label>
            <Textarea
              id="refund-reason"
              placeholder="Enter reason for refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              data-testid="textarea-refund-reason"
            />
          </div>

          {/* Refund Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            {isLoadingRefundable ? (
              <Skeleton className="h-20 w-full" />
            ) : refundableData && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Refundable:</span>
                  <span className="font-medium">{getCurrencySymbol(currency)}{parseFloat(refundableData.totalRefundable).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Refunded:</span>
                  <span className="font-medium">{getCurrencySymbol(currency)}{parseFloat(refundableData.refundedSoFar).toFixed(2)}</span>
                </div>
                <Separator />
              </>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Calculated Refund:</span>
                <span className="font-medium">
                  {getCurrencySymbol(currency)}{calculatedRefundAmount.toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="custom-amount"
                  checked={useCustomAmount}
                  onCheckedChange={(checked) => {
                    setUseCustomAmount(checked as boolean);
                    if (checked) {
                      setCustomRefundAmount(calculatedRefundAmount.toFixed(2));
                    }
                  }}
                  data-testid="checkbox-custom-amount"
                />
                <Label htmlFor="custom-amount" className="text-sm cursor-pointer">
                  Use custom refund amount
                </Label>
              </div>

              {useCustomAmount && (
                <div className="space-y-1">
                  <Label htmlFor="custom-refund-input" className="text-xs text-muted-foreground">
                    Custom Refund Amount (max: {getCurrencySymbol(currency)}{maxRefundable.toFixed(2)})
                  </Label>
                  <Input
                    id="custom-refund-input"
                    type="number"
                    min="0"
                    max={maxRefundable}
                    step="0.01"
                    value={customRefundAmount}
                    onChange={(e) => setCustomRefundAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="text-lg font-bold"
                    data-testid="input-custom-refund-amount"
                  />
                  {!isCustomAmountValid && (
                    <p className="text-xs text-destructive">
                      Amount must be between {getCurrencySymbol(currency)}0.01 and {getCurrencySymbol(currency)}{maxRefundable.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <Separator />
              
              <div className="flex justify-between">
                <span className="font-semibold">Final Refund Amount:</span>
                <span className="font-bold text-lg text-primary">
                  {getCurrencySymbol(currency)}{refundAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {refundAmount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-orange-800 dark:text-orange-300">
                This action will process a refund through Stripe and cannot be undone. The customer will receive the refund in 5-10 business days.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            disabled={processRefundMutation.isPending}
            data-testid="button-cancel-refund"
          >
            Cancel
          </Button>
          <Button
            onClick={() => processRefundMutation.mutate()}
            disabled={!canRefund || refundAmount <= 0 || !isCustomAmountValid || processRefundMutation.isPending}
            data-testid="button-confirm-refund"
          >
            {processRefundMutation.isPending ? "Processing..." : `Refund ${getCurrencySymbol(currency)}${refundAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
