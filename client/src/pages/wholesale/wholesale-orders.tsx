import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Package, CheckCircle, AlertCircle, Truck, MapPin } from "lucide-react";
import type { WholesaleOrder } from "@shared/schema";

export default function WholesaleOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();

  // Fetch wholesale orders
  const { data: orders = [], isLoading } = useQuery<WholesaleOrder[]>({
    queryKey: ['/api/wholesale/orders'],
  });

  // Filter orders by status
  const filteredOrders = orders.filter(order => {
    return statusFilter === "all" || order.status === statusFilter;
  });

  // Format price from cents to dollars
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20" },
      deposit_paid: { label: "Deposit Paid", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20" },
      awaiting_balance: { label: "Awaiting Balance", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20" },
      balance_overdue: { label: "Balance Overdue", className: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20" },
      ready_to_release: { label: "Ready to Release", className: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" },
      in_production: { label: "In Production", className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20" },
      fulfilled: { label: "Fulfilled", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20" },
      cancelled: { label: "Cancelled", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400 hover:bg-gray-500/20" },
    };

    const config = statusConfig[status] || { label: status, className: "" };
    
    return (
      <Badge className={config.className} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="page-wholesale-orders">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Wholesale Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your B2B orders
          </p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-status">
            <SelectValue placeholder="All Orders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
            <SelectItem value="awaiting_balance">Awaiting Balance</SelectItem>
            <SelectItem value="balance_overdue">Balance Overdue</SelectItem>
            <SelectItem value="ready_to_release">Ready to Release</SelectItem>
            <SelectItem value="in_production">In Production</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders found</h3>
          <p className="text-muted-foreground">
            {statusFilter !== "all"
              ? "No orders with this status"
              : "Wholesale orders will appear here when buyers place orders"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Shipping</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                // Determine payment status
                const hasDeposit = order.depositAmountCents > 0;
                const hasBalance = order.balanceAmountCents > 0;
                const isDepositPaid = ["deposit_paid", "awaiting_balance", "ready_to_release", "in_production", "fulfilled"].includes(order.status);
                const isBalancePaid = ["ready_to_release", "in_production", "fulfilled"].includes(order.status);
                const isBalanceOverdue = order.status === "balance_overdue";

                return (
                  <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                    <TableCell className="font-medium" data-testid={`text-order-number-${order.id}`}>
                      {order.orderNumber}
                    </TableCell>
                    <TableCell data-testid={`text-buyer-${order.id}`}>
                      <div>
                        <div className="font-medium">{order.buyerCompanyName || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">{order.buyerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-date-${order.id}`}>
                      {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-total-${order.id}`}>
                      {formatPrice(order.totalCents)}
                    </TableCell>
                    <TableCell data-testid={`payment-status-${order.id}`}>
                      <div className="flex gap-1">
                        {hasDeposit && (
                          isDepositPaid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" aria-label="Deposit Paid" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" aria-label="Deposit Pending" />
                          )
                        )}
                        {hasBalance && (
                          isBalancePaid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" aria-label="Balance Paid" />
                          ) : isBalanceOverdue ? (
                            <AlertCircle className="h-4 w-4 text-red-600" aria-label="Balance Overdue" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-orange-600" aria-label="Balance Due" />
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`shipping-type-${order.id}`}>
                      <span className="text-muted-foreground">View Details</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocation(`/wholesale/orders/${order.id}`)}
                        data-testid={`button-view-${order.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
