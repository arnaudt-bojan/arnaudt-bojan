import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface CreditLedgerEntry {
  id: string;
  sellerId: string;
  labelId?: string;
  orderId?: string;
  type: "debit" | "credit" | "adjustment";
  amountUsd: string;
  balanceAfter: string;
  source: "label_refund" | "manual" | "settlement_fix";
  metadata?: any;
  createdAt: string;
}

export function CreditBalanceDisplay() {
  const [showLedger, setShowLedger] = useState(false);

  const { data, isLoading } = useQuery<{ entries: CreditLedgerEntry[]; currentBalance: string }>({
    queryKey: ["/api/seller/credit-ledger"],
  });

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const balance = parseFloat(data.currentBalance || "0");

  const getSourceDescription = (entry: CreditLedgerEntry) => {
    if (entry.source === "label_refund") {
      return entry.labelId ? `Refund for label #${entry.labelId.substring(0, 8)}` : "Label refund";
    } else if (entry.source === "manual") {
      return entry.metadata?.description || "Manual adjustment";
    } else if (entry.source === "settlement_fix") {
      return "Settlement adjustment";
    }
    return entry.source;
  };

  return (
    <>
      <button
        onClick={() => setShowLedger(true)}
        className="w-full px-3 py-2 rounded-md hover-elevate active-elevate-2 text-left"
        data-testid="button-credit-balance"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Label Credit</span>
          </div>
          <span className="text-sm font-semibold" data-testid="text-credit-balance">
            ${balance.toFixed(2)}
          </span>
        </div>
      </button>

      <Dialog open={showLedger} onOpenChange={setShowLedger}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Label Credit Ledger</DialogTitle>
            <DialogDescription>
              Track your shipping label credit balance and transaction history
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Balance */}
            <div className="border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Balance</span>
                <span className="text-2xl font-bold" data-testid="text-credit-balance-modal">
                  ${balance.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Transaction History */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Transaction History</h3>
              {data.entries.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="border rounded-lg p-3"
                      data-testid={`ledger-entry-${entry.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                entry.type === "credit"
                                  ? "default"
                                  : entry.type === "debit"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {entry.type.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">
                              {getSourceDescription(entry)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "PPP p")}
                          </p>
                          {entry.orderId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Order: #{entry.orderId.substring(0, 8)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-semibold ${
                              entry.type === "credit"
                                ? "text-green-600 dark:text-green-400"
                                : entry.type === "debit"
                                ? "text-red-600 dark:text-red-400"
                                : ""
                            }`}
                          >
                            {entry.type === "credit" ? "+" : entry.type === "debit" ? "-" : ""}$
                            {parseFloat(entry.amountUsd).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Balance: ${parseFloat(entry.balanceAfter).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
