import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WholesaleLayout } from "@/layouts/WholesaleLayout";
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WalletBalance {
  balance: number;
  currency: string;
}

interface LedgerEntry {
  id: string;
  type: 'debit' | 'credit' | 'adjustment';
  amountUsd: string;
  balanceAfter: string;
  source: string;
  metadata: any;
  createdAt: string;
  orderId?: string;
  labelId?: string;
}

interface LedgerResponse {
  success: boolean;
  currentBalanceUsd: number;
  ledgerEntries: LedgerEntry[];
}

const PRESET_AMOUNTS = [25, 50, 100, 250];

export default function SellerWallet() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Note: Success/cancel handling is done via postMessage from popup pages

  // Fetch wallet balance
  const { data: balanceData, isLoading: isLoadingBalance, error: balanceError } = useQuery<WalletBalance>({
    queryKey: ['/api/seller/wallet/balance'],
  });

  // Fetch transaction history
  const { data: ledgerData, isLoading: isLoadingLedger, error: ledgerError } = useQuery<LedgerResponse>({
    queryKey: ['/api/seller/credit-ledger'],
  });

  // Handle popup checkout flow (same pattern as Meta Ads OAuth)
  const handleCheckoutPopup = async (amount: number) => {
    setIsProcessingCheckout(true);
    
    try {
      // Create checkout session
      const res = await apiRequest('POST', '/api/seller/wallet/checkout', { amount });
      const data = await res.json();
      
      // Open Stripe Checkout in centered popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.checkoutUrl,
        "Stripe Checkout",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );
      
      // Listen for message from popup (success/cancel pages will post message)
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === "STRIPE_CHECKOUT_SUCCESS") {
          setIsProcessingCheckout(false);
          toast({
            title: "Top-up successful!",
            description: "Your wallet has been credited. It may take a few moments to reflect.",
            variant: "default",
          });
          // Refresh balance and ledger
          queryClient.invalidateQueries({ queryKey: ['/api/seller/wallet/balance'] });
          queryClient.invalidateQueries({ queryKey: ['/api/seller/credit-ledger'] });
          popup?.close();
          window.removeEventListener("message", handleMessage);
        } else if (event.data.type === "STRIPE_CHECKOUT_CANCELLED") {
          setIsProcessingCheckout(false);
          toast({
            title: "Top-up cancelled",
            description: "You cancelled the payment. No charges were made.",
            variant: "destructive",
          });
          popup?.close();
          window.removeEventListener("message", handleMessage);
        }
      };
      
      window.addEventListener("message", handleMessage);
      
      // Check if popup was closed without completing
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsProcessingCheckout(false);
          window.removeEventListener("message", handleMessage);
        }
      }, 1000);
      
    } catch (error: any) {
      setIsProcessingCheckout(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    }
  };

  const handleAddFunds = () => {
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than $0",
        variant: "destructive",
      });
      return;
    }

    if (amount < 5) {
      toast({
        title: "Amount too low",
        description: "Minimum top-up amount is $5",
        variant: "destructive",
      });
      return;
    }

    if (amount > 10000) {
      toast({
        title: "Amount too high",
        description: "Maximum top-up amount is $10,000",
        variant: "destructive",
      });
      return;
    }

    handleCheckoutPopup(amount);
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'label_purchase':
        return 'Shipping Label';
      case 'label_refund':
        return 'Label Refund';
      case 'manual':
        return 'Wallet Top-Up';
      case 'settlement_fix':
        return 'Adjustment';
      default:
        return source;
    }
  };

  return (
    <WholesaleLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Wallet</h1>
          <p className="text-muted-foreground mt-1">
            Manage your balance for Meta Ads and shipping labels
          </p>
        </div>

        {/* Balance Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Current Balance</CardTitle>
                  <CardDescription>Available for Meta Ads and shipping labels</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <Skeleton className="h-12 w-32" />
            ) : balanceError ? (
              <div className="text-destructive text-sm" data-testid="text-balance-error">
                Failed to load balance. Please refresh the page.
              </div>
            ) : (
              <div className="text-4xl font-bold" data-testid="text-wallet-balance">
                {formatAmount(balanceData?.balance.toString() || '0')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Funds Card */}
        <Card>
          <CardHeader>
            <CardTitle>Add Funds</CardTitle>
            <CardDescription>
              Choose an amount or enter a custom amount to add to your wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Preset amounts */}
              <div>
                <Label>Quick amounts</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {PRESET_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? "default" : "outline"}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount("");
                      }}
                      data-testid={`button-preset-${amount}`}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <Label htmlFor="custom-amount">Or enter custom amount</Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="custom-amount"
                      type="number"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                      className="pl-7"
                      min="5"
                      max="10000"
                      step="0.01"
                      data-testid="input-custom-amount"
                    />
                  </div>
                  <Button
                    onClick={handleAddFunds}
                    disabled={isProcessingCheckout || (!selectedAmount && !customAmount)}
                    data-testid="button-add-funds"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isProcessingCheckout ? "Opening checkout..." : "Add Funds"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Minimum: $5 • Maximum: $10,000
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All wallet activity including top-ups, purchases, and refunds</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLedger ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : ledgerError ? (
              <div className="text-center py-8" data-testid="text-ledger-error">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
                <p className="text-destructive font-medium">Failed to load transaction history</p>
                <p className="text-sm text-muted-foreground mt-1">Please refresh the page to try again</p>
              </div>
            ) : !ledgerData?.ledgerEntries || ledgerData.ledgerEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-transactions">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Add funds to get started</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerData.ledgerEntries.map((entry) => {
                      const metadata = typeof entry.metadata === 'string' 
                        ? JSON.parse(entry.metadata) 
                        : entry.metadata;
                      
                      return (
                        <TableRow key={entry.id} data-testid={`row-transaction-${entry.id}`}>
                          <TableCell className="text-sm">
                            {format(new Date(entry.createdAt), 'MMM dd, yyyy h:mm a')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={entry.type === 'credit' ? 'default' : 'secondary'}
                              className="gap-1"
                            >
                              {entry.type === 'credit' ? (
                                <ArrowUpCircle className="h-3 w-3" />
                              ) : (
                                <ArrowDownCircle className="h-3 w-3" />
                              )}
                              {entry.type === 'credit' ? 'Credit' : 'Debit'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {getSourceLabel(entry.source)}
                              {metadata?.note && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {metadata.note}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={entry.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                              {entry.type === 'credit' ? '+' : '-'}{formatAmount(entry.amountUsd)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatAmount(entry.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WholesaleLayout>
  );
}
