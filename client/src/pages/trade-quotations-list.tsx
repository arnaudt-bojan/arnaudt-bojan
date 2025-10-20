import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TradeQuotation } from "@shared/schema";
import { 
  Plus, 
  Trash2, 
  Send, 
  Ban, 
  DollarSign, 
  Eye, 
  Search,
  MoreVertical,
  Pencil,
  Calendar
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency-utils";
import { format } from "date-fns";
import { useQuotationEvents } from "@/hooks/use-quotation-events";

export default function TradeQuotationsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const { data: quotations, isLoading } = useQuery<TradeQuotation[]>({
    queryKey: ["/api/trade/quotations", { status: statusFilter !== "all" ? statusFilter : undefined }],
  });

  const { data: user } = useQuery<any>({ 
    queryKey: ["/api/auth/user"] 
  });
  
  // Real-time quotation updates via Socket.IO
  useQuotationEvents(user?.id);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/trade/quotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade/quotations"] });
      toast({
        title: "Quotation deleted",
        description: "The quotation has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quotation",
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/trade/quotations/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade/quotations"] });
      toast({
        title: "Quotation sent",
        description: "The quotation has been sent to the buyer.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send quotation",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/trade/quotations/${id}/cancel`, { reason: "Cancelled by seller" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade/quotations"] });
      toast({
        title: "Quotation cancelled",
        description: "The quotation has been cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel quotation",
        variant: "destructive",
      });
    },
  });

  const requestBalanceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/trade/quotations/${id}/request-balance`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade/quotations"] });
      toast({
        title: "Balance payment requested",
        description: "The buyer has been notified to pay the balance.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to request balance payment",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit" data-testid={`badge-status-draft`}>
            Draft
          </Badge>
        );
      case "sent":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1 w-fit border-blue-200 dark:border-blue-800" data-testid={`badge-status-sent`}>
            <Send className="h-3 w-3" />
            Sent
          </Badge>
        );
      case "viewed":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1 w-fit border-purple-200 dark:border-purple-800" data-testid={`badge-status-viewed`}>
            <Eye className="h-3 w-3" />
            Viewed
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 w-fit border-green-200 dark:border-green-800" data-testid={`badge-status-accepted`}>
            Accepted
          </Badge>
        );
      case "deposit_paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 w-fit border-emerald-200 dark:border-emerald-800" data-testid={`badge-status-deposit-paid`}>
            <DollarSign className="h-3 w-3" />
            Deposit Paid
          </Badge>
        );
      case "balance_due":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1 w-fit border-yellow-200 dark:border-yellow-800" data-testid={`badge-status-balance-due`}>
            Balance Due
          </Badge>
        );
      case "fully_paid":
        return (
          <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 flex items-center gap-1 w-fit border-teal-200 dark:border-teal-800" data-testid={`badge-status-fully-paid`}>
            Fully Paid
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 w-fit border-green-200 dark:border-green-800" data-testid={`badge-status-completed`}>
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="flex items-center gap-1 w-fit text-muted-foreground" data-testid={`badge-status-cancelled`}>
            <Ban className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="flex items-center gap-1 w-fit text-muted-foreground" data-testid={`badge-status-expired`}>
            Expired
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const canEdit = (quotation: TradeQuotation) => quotation.status === "draft";
  const canDelete = (quotation: TradeQuotation) => quotation.status === "draft";
  const canSend = (quotation: TradeQuotation) => quotation.status === "draft";
  const canCancel = (quotation: TradeQuotation) => 
    !["completed", "cancelled", "expired"].includes(quotation.status);
  const canRequestBalance = (quotation: TradeQuotation) => quotation.status === "deposit_paid";

  // Filter and sort quotations
  let filteredQuotations = quotations?.filter((q) => {
    // Filter by status
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    
    // Search by buyer email
    if (searchTerm && !q.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  }) || [];

  // Sort quotations
  filteredQuotations = [...filteredQuotations].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "total_high":
        return parseFloat(b.total) - parseFloat(a.total);
      case "total_low":
        return parseFloat(a.total) - parseFloat(b.total);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Trade Quotations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your trade quotations and proposals
          </p>
        </div>
        <Button
          onClick={() => setLocation("/seller/trade/quotations/new")}
          data-testid="button-create-quotation"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Quotation
        </Button>
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by buyer email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-buyer"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
              <SelectItem value="balance_due">Balance Due</SelectItem>
              <SelectItem value="fully_paid">Fully Paid</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="total_high">Highest Amount</SelectItem>
              <SelectItem value="total_low">Lowest Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(statusFilter !== "all" || searchTerm) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {filteredQuotations.length} of {quotations?.length || 0} quotations
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

      {/* Quotations List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-32 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredQuotations.length > 0 ? (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="px-6 py-4 font-medium text-sm">Quotation #</th>
                      <th className="px-6 py-4 font-medium text-sm">Buyer Email</th>
                      <th className="px-6 py-4 font-medium text-sm">Total</th>
                      <th className="px-6 py-4 font-medium text-sm">Deposit</th>
                      <th className="px-6 py-4 font-medium text-sm">Status</th>
                      <th className="px-6 py-4 font-medium text-sm">Valid Until</th>
                      <th className="px-6 py-4 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotations.map((quotation) => (
                      <tr 
                        key={quotation.id} 
                        className="border-b last:border-b-0 hover-elevate transition-colors"
                        data-testid={`quotation-row-${quotation.id}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium" data-testid={`text-quotation-number-${quotation.id}`}>
                            {quotation.quotationNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(quotation.createdAt), "MMM d, yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4" data-testid={`text-buyer-email-${quotation.id}`}>
                          {quotation.buyerEmail}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold" data-testid={`text-total-${quotation.id}`}>
                            {formatPrice(parseFloat(quotation.total), quotation.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4" data-testid={`text-deposit-${quotation.id}`}>
                          {formatPrice(parseFloat(quotation.depositAmount), quotation.currency)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(quotation.status)}
                        </td>
                        <td className="px-6 py-4">
                          {quotation.validUntil ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(quotation.validUntil), "MMM d, yyyy")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-actions-${quotation.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLocation(`/seller/trade/quotations/${quotation.id}`)}
                                data-testid={`button-view-${quotation.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {canEdit(quotation) && (
                                <DropdownMenuItem
                                  onClick={() => setLocation(`/seller/trade/quotations/${quotation.id}/edit`)}
                                  data-testid={`button-edit-${quotation.id}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canSend(quotation) && (
                                <DropdownMenuItem
                                  onClick={() => sendMutation.mutate(quotation.id)}
                                  data-testid={`button-send-${quotation.id}`}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Send to Buyer
                                </DropdownMenuItem>
                              )}
                              {canRequestBalance(quotation) && (
                                <DropdownMenuItem
                                  onClick={() => requestBalanceMutation.mutate(quotation.id)}
                                  data-testid={`button-request-balance-${quotation.id}`}
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Request Balance
                                </DropdownMenuItem>
                              )}
                              {canCancel(quotation) && (
                                <DropdownMenuItem
                                  onClick={() => cancelMutation.mutate(quotation.id)}
                                  data-testid={`button-cancel-${quotation.id}`}
                                  className="text-orange-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              {canDelete(quotation) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      data-testid={`button-delete-${quotation.id}`}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete quotation {quotation.quotationNumber}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMutation.mutate(quotation.id)}
                                        data-testid={`button-confirm-delete-${quotation.id}`}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredQuotations.map((quotation) => (
              <Card key={quotation.id} className="p-4" data-testid={`quotation-card-${quotation.id}`}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold" data-testid={`text-quotation-number-${quotation.id}`}>
                        {quotation.quotationNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(quotation.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    {getStatusBadge(quotation.status)}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Buyer:</span>{" "}
                      <span data-testid={`text-buyer-email-${quotation.id}`}>{quotation.buyerEmail}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>{" "}
                      <span className="font-semibold" data-testid={`text-total-${quotation.id}`}>
                        {formatPrice(parseFloat(quotation.total), quotation.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deposit:</span>{" "}
                      <span data-testid={`text-deposit-${quotation.id}`}>
                        {formatPrice(parseFloat(quotation.depositAmount), quotation.currency)}
                      </span>
                    </div>
                    {quotation.validUntil && (
                      <div>
                        <span className="text-muted-foreground">Valid Until:</span>{" "}
                        {format(new Date(quotation.validUntil), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/seller/trade/quotations/${quotation.id}`)}
                      data-testid={`button-view-${quotation.id}`}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-actions-menu-${quotation.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit(quotation) && (
                          <DropdownMenuItem
                            onClick={() => setLocation(`/seller/trade/quotations/${quotation.id}/edit`)}
                            data-testid={`button-edit-${quotation.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canSend(quotation) && (
                          <DropdownMenuItem
                            onClick={() => sendMutation.mutate(quotation.id)}
                            data-testid={`button-send-${quotation.id}`}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send to Buyer
                          </DropdownMenuItem>
                        )}
                        {canRequestBalance(quotation) && (
                          <DropdownMenuItem
                            onClick={() => requestBalanceMutation.mutate(quotation.id)}
                            data-testid={`button-request-balance-${quotation.id}`}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Request Balance
                          </DropdownMenuItem>
                        )}
                        {canCancel(quotation) && (
                          <DropdownMenuItem
                            onClick={() => cancelMutation.mutate(quotation.id)}
                            data-testid={`button-cancel-${quotation.id}`}
                            className="text-orange-600"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                        {canDelete(quotation) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                data-testid={`button-delete-${quotation.id}`}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete quotation {quotation.quotationNumber}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(quotation.id)}
                                  data-testid={`button-confirm-delete-${quotation.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4" data-testid="text-no-quotations">
              {statusFilter !== "all" || searchTerm
                ? "No quotations match your filters"
                : "No quotations yet"}
            </p>
            {(statusFilter !== "all" || searchTerm) ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchTerm("");
                }}
                data-testid="button-clear-filters-empty"
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                onClick={() => setLocation("/seller/trade/quotations/new")}
                data-testid="button-create-first-quotation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Quotation
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
