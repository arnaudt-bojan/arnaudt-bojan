import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MoreVertical, Truck, DollarSign, RotateCcw, FileText, Download, Package2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order } from "@shared/schema";
import { RequestBalanceDialog } from "./request-balance-dialog";
import { ResendBalanceDialog } from "./resend-balance-dialog";

interface OrderActionBarProps {
  order: Order;
  balancePaymentStatus?: string;
  balancePaymentRequestedAt?: string;
}

export function OrderActionBar({ 
  order, 
  balancePaymentStatus,
  balancePaymentRequestedAt 
}: OrderActionBarProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [requestBalanceDialogOpen, setRequestBalanceDialogOpen] = useState(false);
  const [resendBalanceDialogOpen, setResendBalanceDialogOpen] = useState(false);
  
  const [newStatus, setNewStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingLink, setTrackingLink] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [refundReason, setRefundReason] = useState("");

  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${order.id}`] });
      setStatusDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/orders/${order.id}/tracking`, {
        trackingNumber,
        trackingLink,
        notifyCustomer,
      });
    },
    onSuccess: () => {
      toast({
        title: "Tracking Updated",
        description: "Tracking information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${order.id}`] });
      setTrackingDialogOpen(false);
      setTrackingNumber("");
      setTrackingLink("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tracking information",
        variant: "destructive",
      });
    },
  });

  const processRefundMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/orders/${order.id}/refunds`, {
        refundType: "full",
        reason: refundReason || "requested_by_customer",
      });
    },
    onSuccess: () => {
      toast({
        title: "Refund Processed",
        description: "Full refund has been processed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${order.id}`] });
      setRefundDialogOpen(false);
      setRefundReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/documents/invoices/generate", {
        orderId: order.id,
      });
    },
    onSuccess: (data: any) => {
      console.log('Invoice response:', data);
      const downloadUrl = data.downloadUrl || data.invoice?.documentUrl || data.invoice?.document_url;
      console.log('Download URL:', downloadUrl);
      
      if (downloadUrl) {
        // Open in new tab
        window.open(downloadUrl, "_blank");
        
        // Show toast with download link
        toast({
          title: "Invoice Generated",
          description: (
            <div className="flex flex-col gap-2">
              <p>Invoice has been generated successfully.</p>
              <a 
                href={downloadUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline font-semibold"
              >
                Click here to download
              </a>
            </div>
          ),
        });
      } else {
        toast({
          title: "Invoice Generated",
          description: "Invoice generated but download link not available.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    },
  });

  const generatePackingSlipMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/documents/packing-slips/generate", {
        orderId: order.id,
      });
    },
    onSuccess: (data: any) => {
      console.log('Packing slip response:', data);
      const downloadUrl = data.downloadUrl || data.packingSlip?.documentUrl || data.packingSlip?.document_url;
      console.log('Download URL:', downloadUrl);
      
      if (downloadUrl) {
        // Open in new tab
        window.open(downloadUrl, "_blank");
        
        // Show toast with download link
        toast({
          title: "Packing Slip Generated",
          description: (
            <div className="flex flex-col gap-2">
              <p>Packing slip has been generated successfully.</p>
              <a 
                href={downloadUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline font-semibold"
              >
                Click here to download
              </a>
            </div>
          ),
        });
      } else {
        toast({
          title: "Packing Slip Generated",
          description: "Packing slip generated but download link not available.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate packing slip",
        variant: "destructive",
      });
    },
  });

  const hasBalance = parseFloat(order.remainingBalance || "0") > 0;
  const canRefund = order.paymentStatus !== "pending" && order.status !== "cancelled";
  
  // Determine if balance payment has been requested
  // Only show "Resend" if there's an actual balance payment with status "requested" or later
  // This prevents showing "Resend" for orders that have a PaymentIntent but haven't been requested yet
  const balanceAlreadyRequested = balancePaymentStatus && 
    ['requested', 'paid', 'failed'].includes(balancePaymentStatus);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            data-testid={`button-order-actions-${order.id}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setStatusDialogOpen(true)}
            data-testid={`menu-update-status-${order.id}`}
          >
            <FileText className="mr-2 h-4 w-4" />
            Update Status
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTrackingDialogOpen(true)}
            data-testid={`menu-add-tracking-${order.id}`}
          >
            <Truck className="mr-2 h-4 w-4" />
            Add/Update Tracking
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => generateInvoiceMutation.mutate()}
            disabled={generateInvoiceMutation.isPending}
            data-testid={`menu-generate-invoice-${order.id}`}
          >
            <FileText className="mr-2 h-4 w-4" />
            {generateInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => generatePackingSlipMutation.mutate()}
            disabled={generatePackingSlipMutation.isPending}
            data-testid={`menu-generate-packing-slip-${order.id}`}
          >
            <Package2 className="mr-2 h-4 w-4" />
            {generatePackingSlipMutation.isPending ? "Generating..." : "Generate Packing Slip"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {hasBalance && !balanceAlreadyRequested && (
            <DropdownMenuItem
              onClick={() => setRequestBalanceDialogOpen(true)}
              data-testid={`menu-request-balance-${order.id}`}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Request Balance Payment
            </DropdownMenuItem>
          )}
          {hasBalance && balanceAlreadyRequested && (
            <DropdownMenuItem
              onClick={() => setResendBalanceDialogOpen(true)}
              data-testid={`menu-resend-balance-${order.id}`}
            >
              <Mail className="mr-2 h-4 w-4" />
              Resend Balance Request
            </DropdownMenuItem>
          )}
          {canRefund && (
            <DropdownMenuItem
              onClick={() => setRefundDialogOpen(true)}
              data-testid={`menu-process-refund-${order.id}`}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Process Refund
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent data-testid={`dialog-update-status-${order.id}`}>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of this order. Documents will be auto-generated based on the status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="status" data-testid="select-order-status">
                  <SelectValue placeholder="Select status" />
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
            {newStatus === "shipped" && (
              <p className="text-sm text-muted-foreground">
                💡 Packing slip will be auto-generated when status is set to "shipped"
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              data-testid="button-cancel-status-update"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateStatusMutation.mutate(newStatus)}
              disabled={updateStatusMutation.isPending || newStatus === order.status}
              data-testid="button-confirm-status-update"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Update Tracking Dialog */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent data-testid={`dialog-add-tracking-${order.id}`}>
          <DialogHeader>
            <DialogTitle>Add/Update Tracking Information</DialogTitle>
            <DialogDescription>
              Add tracking details for this shipment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number *</Label>
              <Input
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                data-testid="input-tracking-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingLink">Tracking URL (optional)</Label>
              <Input
                id="trackingLink"
                type="url"
                value={trackingLink}
                onChange={(e) => setTrackingLink(e.target.value)}
                placeholder="https://example.com/track/..."
                data-testid="input-tracking-url"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyCustomer"
                checked={notifyCustomer}
                onCheckedChange={(checked) => setNotifyCustomer(checked as boolean)}
                data-testid="checkbox-notify-customer"
              />
              <Label htmlFor="notifyCustomer" className="text-sm font-normal">
                Send shipping notification to customer
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTrackingDialogOpen(false);
                setTrackingNumber("");
                setTrackingLink("");
              }}
              data-testid="button-cancel-tracking"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateTrackingMutation.mutate()}
              disabled={updateTrackingMutation.isPending || !trackingNumber}
              data-testid="button-confirm-tracking"
            >
              {updateTrackingMutation.isPending ? "Updating..." : "Update Tracking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Balance Payment Dialog */}
      <RequestBalanceDialog
        orderId={order.id}
        orderNumber={order.id.slice(-8).toUpperCase()}
        customerEmail={order.customerEmail}
        customerName={order.customerName}
        remainingBalance={order.remainingBalance || "0"}
        currency={order.currency || "USD"}
        open={requestBalanceDialogOpen}
        onOpenChange={setRequestBalanceDialogOpen}
      />

      {/* Resend Balance Payment Dialog */}
      <ResendBalanceDialog
        orderId={order.id}
        orderNumber={order.id.slice(-8).toUpperCase()}
        customerEmail={order.customerEmail}
        remainingBalance={order.remainingBalance || "0"}
        currency={order.currency || "USD"}
        balancePaymentStatus={balancePaymentStatus}
        lastRequestedAt={balancePaymentRequestedAt}
        open={resendBalanceDialogOpen}
        onOpenChange={setResendBalanceDialogOpen}
      />

      {/* Process Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent data-testid={`dialog-process-refund-${order.id}`}>
          <DialogHeader>
            <DialogTitle>Process Full Refund</DialogTitle>
            <DialogDescription>
              Process a full refund for this order. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refundReason">Reason (optional)</Label>
              <Input
                id="refundReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Customer request, damaged item, etc."
                data-testid="input-refund-reason"
              />
            </div>
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm font-medium">Refund Amount</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {order.currency} {parseFloat(order.amountPaid || "0").toFixed(2)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              This will refund the full amount paid by the customer.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRefundDialogOpen(false);
                setRefundReason("");
              }}
              data-testid="button-cancel-refund"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => processRefundMutation.mutate()}
              disabled={processRefundMutation.isPending}
              data-testid="button-confirm-refund"
            >
              {processRefundMutation.isPending ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
