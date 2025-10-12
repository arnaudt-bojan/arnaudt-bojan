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
import { AlertCircle, CheckCircle2, Mail, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency-utils";
import { format } from "date-fns";

interface ResendBalanceDialogProps {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  remainingBalance: string;
  currency: string;
  balancePaymentStatus?: string;
  lastRequestedAt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResendBalanceDialog({
  orderId,
  orderNumber,
  customerEmail,
  remainingBalance,
  currency,
  balancePaymentStatus = "pending",
  lastRequestedAt,
  open,
  onOpenChange,
}: ResendBalanceDialogProps) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const resendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/orders/${orderId}/balance/resend`);
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
    if (!resendMutation.isPending) {
      onOpenChange(false);
      setSuccess(false);
    }
  };

  const getStatusBadge = () => {
    const variants = {
      pending: { variant: "outline" as const, text: "Pending", color: "text-orange-600 dark:text-orange-400" },
      requested: { variant: "outline" as const, text: "Requested", color: "text-blue-600 dark:text-blue-400" },
      paid: { variant: "default" as const, text: "Paid", color: "text-green-600 dark:text-green-400" },
      failed: { variant: "destructive" as const, text: "Failed", color: "text-red-600 dark:text-red-400" },
      cancelled: { variant: "secondary" as const, text: "Cancelled", color: "text-gray-600 dark:text-gray-400" },
    };

    const status = variants[balancePaymentStatus as keyof typeof variants] || variants.pending;
    
    return (
      <Badge variant={status.variant} className="text-xs">
        <span className={status.color}>{status.text}</span>
      </Badge>
    );
  };

  // Guard against null/empty remainingBalance
  const balanceAmount = parseFloat(remainingBalance || "0");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-resend-balance">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Resend Balance Payment Request
          </DialogTitle>
          <DialogDescription>
            Send another payment reminder to the customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">Order #{orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  To: {customerEmail}
                </p>
              </div>
              {getStatusBadge()}
            </div>

            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Balance Amount</span>
                <span className="text-lg font-semibold">
                  {formatPrice(balanceAmount, currency)}
                </span>
              </div>

              {lastRequestedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <Clock className="w-3 h-3" />
                  Last sent: {format(new Date(lastRequestedAt), "PPp")}
                </div>
              )}
            </div>
          </div>

          {/* Info Message */}
          <Alert className="border-blue-500/20 bg-blue-500/10">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              This will send another payment request email to {customerEmail}
            </AlertDescription>
          </Alert>

          {/* Success/Error Messages */}
          {success && (
            <Alert className="border-green-500/20 bg-green-500/10" data-testid="alert-resend-success">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Payment request resent successfully!
              </AlertDescription>
            </Alert>
          )}

          {resendMutation.isError && (
            <Alert variant="destructive" data-testid="alert-resend-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(resendMutation.error as any)?.message || "Failed to resend payment request"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={resendMutation.isPending}
            data-testid="button-cancel-resend"
          >
            Cancel
          </Button>
          <Button
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending || success}
            data-testid="button-confirm-resend"
          >
            {resendMutation.isPending ? "Sending..." : "Resend Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
