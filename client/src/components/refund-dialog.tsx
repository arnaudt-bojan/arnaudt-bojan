import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { DollarSign, AlertTriangle, Minus, Plus } from "lucide-react";
import type { OrderItem } from "@shared/schema";

interface RefundItemData {
  itemId: string;
  quantity: number;
  amount: number;
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderItems: OrderItem[];
  orderTotal: string;
  amountPaid: string;
}

export function RefundDialog({
  open,
  onOpenChange,
  orderId,
  orderItems,
  orderTotal,
  amountPaid,
}: RefundDialogProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<Map<string, RefundItemData>>(new Map());
  const [reason, setReason] = useState("");
  const [refundType, setRefundType] = useState<"full" | "item">("item");

  const processRefundMutation = useMutation({
    mutationFn: async () => {
      const refundItems = Array.from(selectedItems.values());
      const response = await apiRequest("POST", `/api/orders/${orderId}/refunds`, {
        refundItems,
        reason: reason || undefined,
        refundType,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process refund");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Refund processed",
        description: `Successfully refunded $${data.refundAmount.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      onOpenChange(false);
      setSelectedItems(new Map());
      setReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Refund failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleItemToggle = (item: OrderItem) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      const refundableQty = item.quantity - (item.refundedQuantity || 0);
      const pricePerUnit = parseFloat(item.price);
      newSelected.set(item.id, {
        itemId: item.id,
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
    
    const clampedQty = Math.max(1, Math.min(newQty, refundableQty));
    
    newSelected.set(itemId, {
      itemId,
      quantity: clampedQty,
      amount: pricePerUnit * clampedQty,
    });
    setSelectedItems(newSelected);
  };

  const calculateRefundAmount = () => {
    if (refundType === "full") {
      return parseFloat(amountPaid);
    }

    let total = 0;
    for (const refundData of Array.from(selectedItems.values())) {
      total += refundData.amount;
    }
    return total;
  };

  const refundAmount = calculateRefundAmount();
  const canRefund = refundType === "full" || selectedItems.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-refund">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Select items and quantities to refund or refund the entire order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Refund Type Selection */}
          <div className="flex gap-2">
            <Button
              variant={refundType === "item" ? "default" : "outline"}
              onClick={() => setRefundType("item")}
              className="flex-1"
              data-testid="button-refund-type-item"
            >
              Refund Selected Items
            </Button>
            <Button
              variant={refundType === "full" ? "default" : "outline"}
              onClick={() => {
                setRefundType("full");
                const fullRefund = new Map<string, RefundItemData>();
                orderItems.forEach(item => {
                  const refundableQty = item.quantity - (item.refundedQuantity || 0);
                  if (refundableQty > 0) {
                    fullRefund.set(item.id, {
                      itemId: item.id,
                      quantity: refundableQty,
                      amount: parseFloat(item.price) * refundableQty,
                    });
                  }
                });
                setSelectedItems(fullRefund);
              }}
              className="flex-1"
              data-testid="button-refund-type-full"
            >
              Refund Full Order
            </Button>
          </div>

          <Separator />

          {/* Order Items Selection */}
          <div className="space-y-3">
            <Label>Select items and quantities to refund</Label>
            {orderItems.map((item) => {
              const alreadyRefunded = parseFloat(item.refundedAmount || "0");
              const refundedQty = item.refundedQuantity || 0;
              const refundableQty = item.quantity - refundedQty;
              const isSelected = selectedItems.has(item.id);
              const selectedData = selectedItems.get(item.id);
              const isRefunded = item.itemStatus === "refunded";
              const isReturned = item.itemStatus === "returned";
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
                            ${pricePerUnit.toFixed(2)} per unit • {item.quantity} total
                            {refundedQty > 0 && ` • ${refundedQty} refunded`}
                          </p>
                          {item.variant && typeof item.variant === 'object' ? (
                            <p className="text-xs text-muted-foreground">
                              {(item.variant as any).size ? `Size: ${(item.variant as any).size}` : null}
                              {(item.variant as any).size && (item.variant as any).color ? " • " : null}
                              {(item.variant as any).color ? `Color: ${(item.variant as any).color}` : null}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${parseFloat(item.subtotal).toFixed(2)}</p>
                          {alreadyRefunded > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ${alreadyRefunded.toFixed(2)} refunded
                            </p>
                          )}
                        </div>
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

                      <div className="flex gap-2">
                        {isRefunded && (
                          <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Refunded
                          </Badge>
                        )}
                        {isReturned && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            Returned
                          </Badge>
                        )}
                        {isSelected && selectedData && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Refunding ${selectedData.amount.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Total:</span>
              <span className="font-medium">${parseFloat(orderTotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium">${parseFloat(amountPaid).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Refund Amount:</span>
              <span className="font-bold text-lg text-primary">
                ${refundAmount.toFixed(2)}
              </span>
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
            onClick={() => onOpenChange(false)}
            disabled={processRefundMutation.isPending}
            data-testid="button-cancel-refund"
          >
            Cancel
          </Button>
          <Button
            onClick={() => processRefundMutation.mutate()}
            disabled={!canRefund || refundAmount <= 0 || processRefundMutation.isPending}
            data-testid="button-confirm-refund"
          >
            {processRefundMutation.isPending ? "Processing..." : `Refund $${refundAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
