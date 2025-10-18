import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2, DollarSign, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency-utils";

interface RequestBalanceDialogProps {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  remainingBalance: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestBalanceDialog({
  orderId,
  orderNumber,
  customerEmail,
  customerName,
  remainingBalance,
  currency,
  open,
  onOpenChange,
}: RequestBalanceDialogProps) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const requestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/orders/${orderId}/request-balance`);
    },
    onSuccess: () => {
      setSuccess(true);
      // Invalidate order queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${orderId}`] });
      
      // Auto-close after showing success message
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    },
  });

  const handleClose = () => {
    if (!requestMutation.isPending) {
      onOpenChange(false);
      setSuccess(false);
    }
  };

  // Guard against null/empty remainingBalance
  const balanceAmount = parseFloat(remainingBalance || "0");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-md" data-testid="dialog-request-balance">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Request Balance Payment
          </DialogTitle>
          <DialogDescription>
            Send a payment request to the customer for the remaining balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">Order #{orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {customerName}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                Balance Due
              </Badge>
            </div>

            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Remaining Balance</span>
                <span className="text-lg font-semibold">
                  {formatPrice(balanceAmount, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Email Preview */}
          <div className="rounded-md bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4" />
              Email will be sent to:
            </div>
            <p className="text-sm text-muted-foreground pl-6">{customerEmail}</p>
            <p className="text-xs text-muted-foreground pl-6 pt-2">
              The customer will receive a payment link to complete their order
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <Alert className="border-green-500/20 bg-green-500/10" data-testid="alert-request-success">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Balance payment request sent successfully!
              </AlertDescription>
            </Alert>
          )}

          {requestMutation.isError && (
            <Alert variant="destructive" data-testid="alert-request-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(requestMutation.error as any)?.message || "Failed to send payment request"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={requestMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-cancel-request"
          >
            Cancel
          </Button>
          <Button
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending || success}
            className="w-full sm:w-auto"
            data-testid="button-confirm-request"
          >
            {requestMutation.isPending ? "Sending..." : "Send Payment Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
