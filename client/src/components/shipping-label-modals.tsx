import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Package, Download, Printer, ExternalLink, CheckCircle, AlertCircle, XCircle, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

// Interfaces
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

interface LabelPurchaseResult {
  success: true;
  labelId: string;
  labelUrl: string;
  trackingNumber: string;
  carrier: string;
  baseCostUsd: number;
  totalChargedUsd: number;
  shippoTransactionId: string;
}

// Helper functions for label actions
const handleDownloadPDF = (labelUrl: string) => {
  window.open(labelUrl, '_blank');
};

const handlePrintLabel = (labelUrl: string) => {
  const printWindow = window.open(labelUrl, '_blank');
  printWindow?.addEventListener('load', () => {
    printWindow.print();
  });
};

const handleTrackShipment = (trackingNumber: string, carrier: string) => {
  const trackingUrls: Record<string, string> = {
    'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'FedEx': `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
  };
  const url = trackingUrls[carrier] || trackingUrls['UPS'];
  window.open(url, '_blank');
};

// ============================================================================
// 1. PurchaseShippingLabelDialog
// ============================================================================
interface PurchaseShippingLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  order: Order;
  onSuccess: (labelData: LabelPurchaseResult) => void;
}

interface ShippingRateEstimate {
  carrier: string;
  serviceLevelName: string;
  baseCostUsd: number;
  markupPercent: number;
  totalChargedUsd: number;
  estimatedDays: number | null;
}

interface ProductDimensions {
  productId: string;
  productName: string;
  weight: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
}

export function PurchaseShippingLabelDialog({
  open,
  onOpenChange,
  orderId,
  order,
  onSuccess,
}: PurchaseShippingLabelDialogProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [length, setLength] = useState<string>("");
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [dimensionsInitialized, setDimensionsInitialized] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Wallet and shipping labels are ALWAYS in USD (backend Architecture 3)
  const walletCurrency = 'USD';
  const walletCurrencySymbol = '$';

  // Fetch warehouse addresses
  const { data: warehouseAddresses = [], isLoading: warehouseLoading } = useQuery<WarehouseAddress[]>({
    queryKey: ["/api/seller/warehouse-addresses"],
    enabled: open,
  });

  // Fetch wallet balance
  const { data: walletBalance, isLoading: balanceLoading } = useQuery<{ balance: number; currency: string }>({
    queryKey: ["/api/seller/wallet/balance"],
    enabled: open,
  });

  // Fetch product dimensions
  const { data: productDimensions, isLoading: dimensionsLoading } = useQuery<ProductDimensions>({
    queryKey: ["/api/orders", orderId, "shipping-dimensions"],
    enabled: open,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // Build query params for rate estimate including dimensions
  const buildRateQueryParams = () => {
    const params: Record<string, string> = {};
    if (selectedWarehouseId) {
      params.warehouseAddressId = selectedWarehouseId;
    }
    if (weight) params.weight = weight;
    if (length) params.length = length;
    if (width) params.width = width;
    if (height) params.height = height;
    return new URLSearchParams(params).toString();
  };

  // Fetch shipping rate estimate when warehouse and dimensions are available
  const rateQueryParams = buildRateQueryParams();
  const { data: rateEstimate, isLoading: rateLoading, error: rateError } = useQuery<ShippingRateEstimate>({
    queryKey: ["/api/orders", orderId, "shipping-rate", rateQueryParams],
    enabled: open && !!selectedWarehouseId && !!weight && !!length && !!width && !!height,
    retry: false, // Don't retry on address validation errors
  });

  // Set default warehouse when addresses load
  useEffect(() => {
    if (warehouseAddresses.length > 0 && !selectedWarehouseId) {
      const defaultAddress = warehouseAddresses.find(addr => addr.isDefault === 1);
      setSelectedWarehouseId(defaultAddress?.id || warehouseAddresses[0].id);
    }
  }, [warehouseAddresses, selectedWarehouseId]);

  // Populate dimension fields when product dimensions load (only once)
  useEffect(() => {
    if (productDimensions && !dimensionsInitialized) {
      setWeight(productDimensions.weight || "");
      setLength(productDimensions.length || "");
      setWidth(productDimensions.width || "");
      setHeight(productDimensions.height || "");
      setDimensionsInitialized(true);
    }
  }, [productDimensions, dimensionsInitialized]);

  // Reset dimensions when dialog closes
  useEffect(() => {
    if (!open) {
      setDimensionsInitialized(false);
      setWeight("");
      setLength("");
      setWidth("");
      setHeight("");
    }
  }, [open]);

  // Purchase label mutation
  const purchaseLabelMutation = useMutation({
    mutationFn: async (warehouseAddressId: string) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/labels`, { warehouseAddressId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to purchase shipping label");
      }
      return response.json();
    },
    onSuccess: (data: LabelPurchaseResult) => {
      queryClient.invalidateQueries({ queryKey: [`/api/seller/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/labels`] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/wallet/balance"] });
      onOpenChange(false);
      onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to purchase label",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePurchase = () => {
    if (!selectedWarehouseId) {
      toast({
        title: "Warehouse Required",
        description: "Please select a warehouse address",
        variant: "destructive",
      });
      return;
    }
    purchaseLabelMutation.mutate(selectedWarehouseId);
  };

  const insufficientFunds = rateEstimate && walletBalance && walletBalance.balance < rateEstimate.totalChargedUsd;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-purchase-shipping-label">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Purchase Shipping Label
          </DialogTitle>
          <DialogDescription>
            Select a warehouse address to ship from and purchase your shipping label.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ship To Address */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Shipping To:</p>
            <div className="ml-4 text-sm text-muted-foreground">
              <p>{order.shippingStreet}</p>
              <p>{order.shippingCity}, {order.shippingState} {order.shippingPostalCode}</p>
              <p>{order.shippingCountry}</p>
            </div>
          </div>

          {/* Warehouse Selector */}
          {warehouseLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : warehouseAddresses.length === 0 ? (
            <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                You need to add a warehouse address before purchasing a shipping label.
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  // User should navigate to settings to add warehouse
                  toast({
                    title: "Add Warehouse Address",
                    description: "Please add a warehouse address in Settings before purchasing labels.",
                  });
                }}
                variant="outline"
                size="sm"
                data-testid="button-add-warehouse-prompt"
              >
                <Plus className="h-4 w-4 mr-2" />
                Go to Settings
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Ship From Warehouse</label>
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
            </div>
          )}

          {/* Package Dimensions Form */}
          {selectedWarehouseId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Package Dimensions</label>
                {dimensionsLoading && (
                  <span className="text-xs text-muted-foreground">Loading dimensions...</span>
                )}
              </div>
              
              {productDimensions && (
                <p className="text-xs text-muted-foreground">
                  Product: {productDimensions.productName}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="weight" className="text-xs font-medium text-muted-foreground">
                    Weight (lbs) *
                  </label>
                  <input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.00"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="input-weight"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="length" className="text-xs font-medium text-muted-foreground">
                    Length (in) *
                  </label>
                  <input
                    id="length"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="0.00"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="input-length"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="width" className="text-xs font-medium text-muted-foreground">
                    Width (in) *
                  </label>
                  <input
                    id="width"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="0.00"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="input-width"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="height" className="text-xs font-medium text-muted-foreground">
                    Height (in) *
                  </label>
                  <input
                    id="height"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="0.00"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="input-height"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                * All dimensions are required. Edit these values to calculate shipping cost for different package sizes.
              </p>
            </div>
          )}

          {/* Shipping Cost Estimate */}
          {selectedWarehouseId && weight && length && width && height && (
            <div className="p-4 border rounded-lg space-y-3">
              {rateLoading ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Calculating shipping cost...</p>
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : rateError ? (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Unable to calculate shipping cost</p>
                    <p className="text-xs mt-1" data-testid="text-rate-error">
                      {(() => {
                        const errorMessage = (rateError as any)?.message || "Please check the shipping address";
                        
                        // Parse error message: "500: {\"error\":\"message\"}" -> "message"
                        try {
                          const match = errorMessage.match(/^\d+:\s*(.+)$/);
                          if (match) {
                            const responseBody = match[1];
                            
                            // Check if it's HTML (starts with < or DOCTYPE)
                            if (responseBody.trim().startsWith('<') || responseBody.includes('DOCTYPE')) {
                              return "Unable to calculate shipping cost. Please ensure your product has shipping dimensions configured and the order has a valid shipping address.";
                            }
                            
                            // Try to parse as JSON
                            const parsed = JSON.parse(responseBody);
                            return parsed.error || errorMessage;
                          }
                        } catch {
                          // If parsing fails and contains HTML-like content, show generic message
                          if (errorMessage.includes('DOCTYPE') || errorMessage.includes('<!')) {
                            return "Unable to calculate shipping cost. Please ensure your product has shipping dimensions configured and the order has a valid shipping address.";
                          }
                        }
                        
                        return errorMessage;
                      })()}
                    </p>
                  </div>
                </div>
              ) : rateEstimate ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Label Cost:</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-label-cost">
                      ${rateEstimate.totalChargedUsd.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Carrier:</span>
                      <span data-testid="text-carrier">{rateEstimate.carrier} - {rateEstimate.serviceLevelName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base Cost:</span>
                      <span>${rateEstimate.baseCostUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Fee ({rateEstimate.markupPercent}%):</span>
                      <span>${(rateEstimate.totalChargedUsd - rateEstimate.baseCostUsd).toFixed(2)}</span>
                    </div>
                    {rateEstimate.estimatedDays && (
                      <div className="flex justify-between">
                        <span>Estimated Delivery:</span>
                        <span>{rateEstimate.estimatedDays} {rateEstimate.estimatedDays === 1 ? 'day' : 'days'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Wallet Balance Display */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wallet Balance (USD):</span>
              {balanceLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <span className="font-semibold text-base" data-testid="text-wallet-balance">
                  {walletCurrencySymbol}{walletBalance?.balance?.toFixed(2) || '0.00'}
                </span>
              )}
            </div>
            {rateEstimate && walletBalance && walletBalance.balance < rateEstimate.totalChargedUsd && (
              <div className="flex items-start gap-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Insufficient funds</p>
                  <p>
                    You need {walletCurrencySymbol}{(rateEstimate.totalChargedUsd - walletBalance.balance).toFixed(2)} more.{' '}
                    <a 
                      href="/seller/wallet" 
                      className="underline font-medium hover:text-destructive/80"
                      data-testid="link-add-funds"
                    >
                      Add funds to wallet
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={purchaseLabelMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-cancel-purchase"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={
              purchaseLabelMutation.isPending || 
              !selectedWarehouseId || 
              insufficientFunds || 
              warehouseAddresses.length === 0 ||
              rateLoading ||
              !!rateError ||
              !rateEstimate
            }
            className="w-full sm:w-auto"
            data-testid="button-purchase-label"
          >
            {purchaseLabelMutation.isPending ? "Purchasing..." : 
             rateLoading ? "Calculating..." :
             "Purchase Shipping Label"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. ShippingLabelSuccessDialog
// ============================================================================
interface ShippingLabelSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelData: LabelPurchaseResult | null;
}

export function ShippingLabelSuccessDialog({
  open,
  onOpenChange,
  labelData,
}: ShippingLabelSuccessDialogProps) {
  if (!labelData) return null;

  const cost = typeof labelData.totalChargedUsd === 'number' 
    ? labelData.totalChargedUsd 
    : parseFloat(labelData.totalChargedUsd as any);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-shipping-label-success">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            Shipping Label Purchased Successfully
          </DialogTitle>
          <DialogDescription>
            Your shipping label has been purchased and is ready to use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Label Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cost</p>
              <p className="font-semibold text-lg" data-testid="text-label-cost">
                ${cost.toFixed(2)} USD
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Carrier</p>
              <p className="font-medium" data-testid="text-label-carrier">
                {labelData.carrier}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Tracking Number</p>
              <p className="font-medium font-mono text-sm" data-testid="text-label-tracking">
                {labelData.trackingNumber}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={() => handleDownloadPDF(labelData.labelUrl)}
              className="w-full"
              variant="default"
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={() => handlePrintLabel(labelData.labelUrl)}
              className="w-full"
              variant="outline"
              data-testid="button-print-label"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </Button>
            <Button
              onClick={() => handleTrackShipment(labelData.trackingNumber, labelData.carrier)}
              className="w-full"
              variant="outline"
              data-testid="button-track-shipment"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Track Shipment
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full sm:w-auto"
            data-testid="button-close-success"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 3. ShippingLabelDetailsDialog
// ============================================================================
interface ShippingLabelDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

export function ShippingLabelDetailsDialog({
  open,
  onOpenChange,
  orderId,
}: ShippingLabelDetailsDialogProps) {
  const [cancelingLabelId, setCancelingLabelId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch label data
  const { data: labelsData, isLoading: labelsLoading } = useQuery<{ labels: ShippingLabel[]; refunds: LabelRefund[] }>({
    queryKey: [`/api/orders/${orderId}/labels`],
    enabled: open,
  });

  // Cancel label mutation
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
      queryClient.invalidateQueries({ queryKey: ["/api/seller/wallet/balance"] });
      toast({
        title: "Label cancelled",
        description: "Refund request has been submitted. It may take several days to process.",
      });
      setCancelingLabelId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel label",
        description: error.message,
        variant: "destructive",
      });
      setCancelingLabelId(null);
    },
  });

  const label = labelsData?.labels?.[0];
  const refund = labelsData?.refunds?.find(r => r.labelId === label?.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-shipping-label-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shipping Label Details
            </DialogTitle>
          </DialogHeader>

          {labelsLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : label ? (
            <div className="space-y-4 py-4">
              {/* Label Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Carrier</p>
                  <p className="font-medium" data-testid="text-details-carrier">{label.carrier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service Level</p>
                  <p className="font-medium" data-testid="text-details-service">{label.serviceLevelName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tracking Number</p>
                  <p className="font-medium font-mono text-sm" data-testid="text-details-tracking">
                    {label.trackingNumber}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" data-testid="badge-label-status">
                    {label.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Cost:</span>
                  <span data-testid="text-details-base-cost">
                    ${parseFloat(label.baseCostUsd).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Markup ({parseFloat(label.markupPercent || "20")}%):</span>
                  <span>
                    ${(parseFloat(label.baseCostUsd) * (parseFloat(label.markupPercent || "20") / 100)).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Charged:</span>
                  <span data-testid="text-details-total-cost">
                    ${parseFloat(label.totalChargedUsd).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-sm text-muted-foreground border-t pt-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownloadPDF(label.labelUrl)}
                  className="w-full"
                  data-testid="button-details-download-label"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintLabel(label.labelUrl)}
                  className="w-full"
                  data-testid="button-details-print-label"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Label
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTrackShipment(label.trackingNumber, label.carrier)}
                  className="w-full"
                  data-testid="button-details-track-shipment"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Track Shipment
                </Button>
                {label.status === "purchased" && !refund && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCancelingLabelId(label.id)}
                    disabled={cancelLabelMutation.isPending}
                    className="w-full sm:col-span-2"
                    data-testid="button-details-cancel-label"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Label
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No shipping label found</p>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full sm:w-auto"
              data-testid="button-close-details"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Label Confirmation Dialog */}
      <AlertDialog open={!!cancelingLabelId} onOpenChange={(open) => !open && setCancelingLabelId(null)}>
        <AlertDialogContent className="w-[95vw] max-w-md" data-testid="dialog-cancel-label-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Shipping Label?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this shipping label? This action will request a refund from the carrier.
              The refund may take several days to process and may be rejected if the label has already been scanned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto" data-testid="button-cancel-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelingLabelId) {
                  cancelLabelMutation.mutate(cancelingLabelId);
                }
              }}
              className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto"
              data-testid="button-confirm-cancel"
            >
              Yes, Cancel Label
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
