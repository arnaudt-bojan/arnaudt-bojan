import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, differenceInDays } from "date-fns";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  Building2,
  Mail,
  Calendar,
  CreditCard,
  Loader2,
  Ship,
  Download
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuotationEvents } from "@/hooks/use-quotation-events";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface QuotationItem {
  id: string;
  lineNumber: number;
  description: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  sellerId: string;
  buyerEmail: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  shippingAmount: string;
  total: string;
  depositAmount: string;
  depositPercentage: number;
  balanceAmount: string;
  status: string;
  validUntil: string | null;
  deliveryTerms?: string | null;
  dataSheetUrl?: string | null;
  termsAndConditionsUrl?: string | null;
  createdAt: string;
  items: QuotationItem[];
  seller?: {
    username: string;
    email: string;
    logo?: string;
  };
}

// Payment Form Component
function PaymentForm({ 
  clientSecret, 
  onSuccess, 
  onCancel,
  paymentType 
}: { 
  clientSecret: string; 
  onSuccess: () => void; 
  onCancel: () => void;
  paymentType: 'deposit' | 'balance';
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: `${paymentType === 'deposit' ? 'Deposit' : 'Balance'} payment has been processed successfully`,
        });
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="payment-form">
      <div className="mb-6">
        <PaymentElement options={{ layout: { type: 'tabs' } }} />
      </div>
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
          data-testid="button-submit-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${paymentType === 'deposit' ? 'Deposit' : 'Balance'}`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          data-testid="button-cancel-payment"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function TradeQuotationView() {
  const [, params] = useRoute("/trade/view/:token");
  const { toast } = useToast();
  const { user } = useAuth();
  const token = params?.token;
  
  // Real-time quotation updates via Socket.IO (for authenticated buyers)
  useQuotationEvents(user?.id);
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<'deposit' | 'balance'>('deposit');
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Fetch quotation
  const { data: quotation, isLoading, error, refetch } = useQuery<Quotation>({
    queryKey: ["/api/trade/quotations/view", token],
    queryFn: async () => {
      const response = await fetch(`/api/trade/quotations/view/${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load quotation");
      }
      return response.json();
    },
    enabled: !!token,
  });

  // Accept quotation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/trade/quotations/view/${token}/accept`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quotation Accepted",
        description: "You have successfully accepted this quotation",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept quotation",
        variant: "destructive",
      });
    },
  });

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (type: 'deposit' | 'balance') => {
      const response = await apiRequest("POST", `/api/trade/quotations/view/${token}/payment-intent`, {
        paymentType: type,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setShowPaymentForm(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment intent",
        variant: "destructive",
      });
    },
  });

  // Handle payment type selection
  const handlePayment = (type: 'deposit' | 'balance') => {
    setPaymentType(type);
    createPaymentIntentMutation.mutate(type);
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
    refetch();
  };

  // Handle payment cancel
  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
  };

  // Format currency
  const formatCurrency = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(num);
  };

  // Check if quotation is expiring soon
  const isExpiringSoon = (validUntil: string | null) => {
    if (!validUntil) return false;
    const days = differenceInDays(new Date(validUntil), new Date());
    return days >= 0 && days <= 3;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string; icon: any }> = {
      draft: { variant: "secondary", label: "Draft", icon: FileText },
      sent: { variant: "default", label: "Sent", icon: Mail },
      viewed: { variant: "default", label: "Viewed", icon: Clock },
      accepted: { variant: "default", label: "Accepted", icon: CheckCircle2 },
      deposit_paid: { variant: "default", label: "Deposit Paid", icon: CheckCircle2 },
      balance_due: { variant: "default", label: "Balance Due", icon: Clock },
      fully_paid: { variant: "default", label: "Fully Paid", icon: CheckCircle2 },
      completed: { variant: "default", label: "Completed", icon: CheckCircle2 },
      cancelled: { variant: "destructive", label: "Cancelled", icon: XCircle },
      expired: { variant: "destructive", label: "Expired", icon: XCircle },
    };

    const config = statusMap[status] || statusMap.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1" data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-12" data-testid="loading-state">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quotation) {
    return (
      <div className="container max-w-5xl mx-auto py-12" data-testid="error-state">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Quotation Not Found</h2>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : "The quotation link may be invalid or expired."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8" data-testid="quotation-view-page">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Trade Quotation</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Review and accept your quotation
          </p>
        </div>

        {/* Expiry Warning */}
        {quotation.validUntil && isExpiringSoon(quotation.validUntil) && (
          <Alert className="mb-6" data-testid="alert-expiry-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This quotation will expire on {format(new Date(quotation.validUntil), 'PPP')}
              {' '}({differenceInDays(new Date(quotation.validUntil), new Date())} days remaining)
            </AlertDescription>
          </Alert>
        )}

        {/* Main Quotation Card */}
        <Card className="mb-6" data-testid="card-quotation">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl" data-testid="text-quotation-number">
                    {quotation.quotationNumber}
                  </CardTitle>
                  {getStatusBadge(quotation.status)}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2" data-testid="text-issue-date">
                    <Calendar className="h-4 w-4" />
                    Issue Date: {format(new Date(quotation.createdAt), 'PPP')}
                  </div>
                  {quotation.validUntil && (
                    <div className="flex items-center gap-2" data-testid="text-valid-until">
                      <Clock className="h-4 w-4" />
                      Valid Until: {format(new Date(quotation.validUntil), 'PPP')}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-left md:text-right">
                <div className="flex items-center gap-2 mb-2" data-testid="text-seller-info">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {quotation.seller?.username || 'Seller'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-seller-email">
                  <Mail className="h-4 w-4" />
                  {quotation.seller?.email || quotation.sellerId}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="text-sm font-medium mb-1">Buyer</div>
              <div className="text-sm text-muted-foreground" data-testid="text-buyer-email">
                {quotation.buyerEmail}
              </div>
            </div>

            {/* B2B Professional Fields */}
            {(quotation.deliveryTerms || quotation.dataSheetUrl || quotation.termsAndConditionsUrl) && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  {quotation.deliveryTerms && (
                    <div className="flex items-center gap-2 text-sm" data-testid="text-delivery-terms">
                      <Ship className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Delivery Terms:</span>
                      <Badge variant="outline" className="font-mono">{quotation.deliveryTerms}</Badge>
                    </div>
                  )}
                  
                  {quotation.dataSheetUrl && (
                    <div className="flex items-center gap-2 text-sm" data-testid="link-data-sheet">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Data Sheet:</span>
                      <a 
                        href={quotation.dataSheetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download Specification
                      </a>
                    </div>
                  )}
                  
                  {quotation.termsAndConditionsUrl && (
                    <div className="flex items-center gap-2 text-sm" data-testid="link-terms">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Terms & Conditions:</span>
                      <a 
                        href={quotation.termsAndConditionsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download Document
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator className="my-6" />

            {/* Line Items Table - B2B Best Practice: No per-item tax/shipping */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Line Items</h3>
              
              {/* Desktop Table View */}
              <div className="hidden md:block border rounded-md overflow-auto">
                <Table data-testid="table-line-items">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Line</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotation.items.map((item) => (
                      <TableRow key={item.id} data-testid={`row-line-item-${item.lineNumber}`}>
                        <TableCell>{item.lineNumber}</TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice, quotation.currency)}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.lineTotal, quotation.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {quotation.items.map((item) => (
                  <Card key={item.id} data-testid={`card-line-item-${item.lineNumber}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Line #{item.lineNumber}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Description</span>
                        <p className="font-medium">{item.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Unit Price</span>
                          <p className="font-medium">
                            {formatCurrency(item.unitPrice, quotation.currency)}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Quantity</span>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Line Total:</span>
                          <span className="text-lg font-semibold">
                            {formatCurrency(item.lineTotal, quotation.currency)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-full md:w-96 space-y-3">
                <div className="flex justify-between text-sm" data-testid="text-subtotal">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(quotation.subtotal, quotation.currency)}</span>
                </div>
                <div className="flex justify-between text-sm" data-testid="text-tax">
                  <span className="text-muted-foreground">Total Tax:</span>
                  <span className="font-medium">{formatCurrency(quotation.taxAmount, quotation.currency)}</span>
                </div>
                <div className="flex justify-between text-sm" data-testid="text-shipping">
                  <span className="text-muted-foreground">Total Shipping:</span>
                  <span className="font-medium">{formatCurrency(quotation.shippingAmount, quotation.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold" data-testid="text-grand-total">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(quotation.total, quotation.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center" data-testid="text-deposit-amount">
                  <span className="text-sm text-muted-foreground">
                    Deposit Amount ({quotation.depositPercentage}%):
                  </span>
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    {formatCurrency(quotation.depositAmount, quotation.currency)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center" data-testid="text-balance-amount">
                  <span className="text-sm text-muted-foreground">Balance Amount:</span>
                  <Badge variant="default" className="bg-orange-600 hover:bg-orange-700">
                    {formatCurrency(quotation.balanceAmount, quotation.currency)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        {showPaymentForm && clientSecret && (
          <Card className="mb-6" data-testid="card-payment-form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {paymentType === 'deposit' ? 'Pay Deposit' : 'Pay Balance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                  paymentType={paymentType}
                />
              </Elements>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!showPaymentForm && (
          <Card data-testid="card-actions">
            <CardContent className="py-6">
              {/* Sent/Viewed Status - Accept Button */}
              {(quotation.status === 'sent' || quotation.status === 'viewed') && (
                <Button
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-accept-quotation"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept Quotation'
                  )}
                </Button>
              )}

              {/* Accepted Status - Pay Deposit Button */}
              {quotation.status === 'accepted' && (
                <Button
                  onClick={() => handlePayment('deposit')}
                  disabled={createPaymentIntentMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-pay-deposit"
                >
                  {createPaymentIntentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay Deposit - ${formatCurrency(quotation.depositAmount, quotation.currency)}`
                  )}
                </Button>
              )}

              {/* Deposit Paid Status - Waiting Message */}
              {quotation.status === 'deposit_paid' && (
                <Alert data-testid="alert-deposit-paid">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Deposit Paid ✓</div>
                    <div className="text-sm text-muted-foreground">
                      Awaiting balance payment request from seller
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Balance Due Status - Pay Balance Button */}
              {quotation.status === 'balance_due' && (
                <Button
                  onClick={() => handlePayment('balance')}
                  disabled={createPaymentIntentMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-pay-balance"
                >
                  {createPaymentIntentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay Balance - ${formatCurrency(quotation.balanceAmount, quotation.currency)}`
                  )}
                </Button>
              )}

              {/* Fully Paid/Completed Status - Success Message */}
              {(quotation.status === 'fully_paid' || quotation.status === 'completed') && (
                <Alert data-testid="alert-completed">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="font-medium mb-1">All Payments Completed ✓</div>
                    <div className="text-sm text-muted-foreground">
                      This quotation has been fully paid
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Cancelled/Expired Status - Info Message */}
              {(quotation.status === 'cancelled' || quotation.status === 'expired') && (
                <Alert variant="destructive" data-testid="alert-cancelled">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    This quotation is no longer available ({quotation.status})
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
