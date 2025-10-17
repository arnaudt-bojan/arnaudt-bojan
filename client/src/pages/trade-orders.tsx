import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Package, Search } from "lucide-react";
import { OrderRowExpanded } from "@/components/order-row-expanded";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import type { Order, TradeQuotation } from "@shared/schema";
import { getPaymentStatusLabel, getOrderStatusLabel } from "@/lib/format-status";
import { formatPrice } from "@/lib/currency-utils";

export default function TradeOrdersPage() {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<TradeQuotation[]>({
    queryKey: ["/api/trade/quotations"],
  });

  const { data: allOrders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/seller/orders"],
  });

  const isLoading = quotationsLoading || ordersLoading;

  // Get orders that have corresponding quotations (trade orders)
  const quotationOrderIds = new Set(
    quotations
      .filter(q => q.orderId)
      .map(q => q.orderId as string)
  );

  const tradeOrders = allOrders.filter(order => quotationOrderIds.has(order.id));

  // Create a map of orderId to quotation for easy lookup
  const orderToQuotationMap = new Map(
    quotations
      .filter(q => q.orderId)
      .map(q => [q.orderId as string, q])
  );

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      deposit_paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      fully_paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      partially_refunded: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      refunded: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  // Filter and sort orders
  let filteredOrders = tradeOrders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesEmail = order.customerEmail.toLowerCase().includes(searchLower);
      const matchesName = order.customerName.toLowerCase().includes(searchLower);
      const matchesId = order.id.toLowerCase().includes(searchLower);
      
      const quotation = orderToQuotationMap.get(order.id);
      const matchesQuotationNumber = quotation?.quotationNumber.toLowerCase().includes(searchLower);
      
      if (!matchesEmail && !matchesName && !matchesId && !matchesQuotationNumber) {
        return false;
      }
    }
    
    return true;
  });

  // Sort orders by date (newest first)
  const sortedOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-trade-orders">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <Skeleton className="h-10 w-full" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border-b last:border-0">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tradeOrders.length === 0) {
    return (
      <div className="space-y-6" data-testid="page-trade-orders">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Trade Orders</h1>
          <p className="text-muted-foreground">Track orders from accepted trade quotations</p>
        </div>
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No trade orders yet</h3>
          <p className="text-muted-foreground">
            Orders will appear here when quotations are accepted and paid
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-trade-orders">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Trade Orders</h1>
        <p className="text-muted-foreground">
          Track orders from accepted trade quotations ({tradeOrders.length} total)
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by buyer, quotation, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-orders"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(statusFilter !== "all" || searchTerm) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {sortedOrders.length} of {tradeOrders.length} orders
            </span>
            {(statusFilter !== "all" || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchTerm("");
                }}
                data-testid="button-clear-filters"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </Card>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Quotation</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Order Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const quotation = orderToQuotationMap.get(order.id);
              
              return (
                <Fragment key={order.id}>
                  <TableRow
                    key={`${order.id}-main`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleOrder(order.id)}
                    data-testid={`row-order-${order.id}`}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-expand-${order.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOrder(order.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium" data-testid={`text-order-id-${order.id}`}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {quotation ? (
                        <div className="text-sm" data-testid={`text-quotation-number-${order.id}`}>
                          {quotation.quotationNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm" data-testid={`text-order-date-${order.id}`}>
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm" data-testid={`text-customer-name-${order.id}`}>
                        {order.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid={`text-customer-email-${order.id}`}>
                        {order.customerEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold" data-testid={`text-total-${order.id}`}>
                        {formatPrice(parseFloat(order.total), order.currency || 'USD')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={getPaymentStatusColor(order.paymentStatus || "pending")}
                        data-testid={`badge-payment-status-${order.id}`}
                      >
                        {getPaymentStatusLabel(order.paymentStatus || "pending")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={getStatusColor(order.status)}
                        data-testid={`badge-order-status-${order.id}`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${order.id}-expanded`}>
                      <TableCell colSpan={8} className="p-0">
                        <OrderRowExpanded orderId={order.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
