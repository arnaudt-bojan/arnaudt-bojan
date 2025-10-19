import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, DollarSign, Send, CheckCircle, Eye, Calendar, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatPrice } from "@/lib/currency-utils";
import { format } from "date-fns";
import type { TradeQuotation } from "@shared/schema";

export default function TradeDashboard() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ quotations: TradeQuotation[]; total: number }>({
    queryKey: ["/api/trade/quotations"],
  });
  
  const quotations = data?.quotations || [];

  const { data: user } = useQuery<any>({ 
    queryKey: ["/api/auth/user"] 
  });

  // Calculate metrics from quotations
  const totalQuotations = quotations.length;
  const pendingQuotations = quotations.filter(q => 
    ["draft", "sent", "viewed"].includes(q.status)
  ).length;
  const acceptedQuotations = quotations.filter(q => 
    ["accepted", "deposit_paid", "balance_due", "fully_paid", "completed"].includes(q.status)
  ).length;
  const totalRevenue = quotations
    .filter(q => ["deposit_paid", "balance_due", "fully_paid", "completed"].includes(q.status))
    .reduce((sum, q) => sum + parseFloat(q.total), 0);

  // Get recent quotations (last 5)
  const recentQuotations = [...quotations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" data-testid={`badge-status-draft`}>Draft</Badge>;
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
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const sellerCurrency = user?.listingCurrency || 'USD';

  const quickActions = [
    {
      title: "Send New Quotation",
      description: "Create and send a quotation",
      href: "/seller/trade/quotations/new",
      icon: Send,
      testId: "button-send-quotation",
    },
    {
      title: "View All Quotations",
      description: "Manage all quotations",
      href: "/seller/trade/quotations",
      icon: FileText,
      testId: "button-view-quotations",
    },
    {
      title: "View Trade Orders",
      description: "Track accepted quotations",
      href: "/seller/trade/orders",
      icon: CheckCircle,
      testId: "button-view-trade-orders",
    },
  ];

  return (
    <div className="space-y-6" data-testid="page-trade-dashboard">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Trade Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your professional trade quotations
        </p>
      </div>

      {/* Stripe Connection Alert */}
      {user && (!user.stripeConnectedAccountId || !user.stripeChargesEnabled) && (
        <Alert variant="destructive" data-testid="alert-stripe-not-connected-trade">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Setup Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              You must connect a payment provider before accepting trade orders. 
              Without this, customers won't be able to complete payment for quotations.
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/settings?tab=payment")}
              data-testid="button-setup-payments"
            >
              Setup Payments
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-total-quotations">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-quotations">
                {totalQuotations}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-pending">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-pending-quotations">
                {pendingQuotations}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-accepted">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-accepted-quotations">
                {acceptedQuotations}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-revenue">
                {formatPrice(totalRevenue, sellerCurrency)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card className="hover-elevate active-elevate-2 cursor-pointer h-full" data-testid={action.testId}>
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {recentQuotations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Quotations</h2>
            <Link href="/seller/trade/quotations">
              <Button variant="outline" size="sm" data-testid="button-view-all-quotations">View All</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {recentQuotations.map((quotation) => (
                    <div 
                      key={quotation.id} 
                      className="p-4 hover-elevate cursor-pointer"
                      onClick={() => setLocation(`/seller/trade/quotations/${quotation.id}`)}
                      data-testid={`quotation-row-${quotation.id}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium" data-testid={`text-quotation-number-${quotation.id}`}>
                              {quotation.quotationNumber}
                            </div>
                            {getStatusBadge(quotation.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span data-testid={`text-buyer-email-${quotation.id}`}>{quotation.buyerEmail}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(quotation.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold" data-testid={`text-total-${quotation.id}`}>
                            {formatPrice(parseFloat(quotation.total), quotation.currency)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Deposit: {formatPrice(parseFloat(quotation.depositAmount), quotation.currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && quotations.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No quotations yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by creating your first trade quotation
          </p>
          <Button onClick={() => setLocation("/seller/trade/quotations/new")} data-testid="button-create-first-quotation">
            <Send className="h-4 w-4 mr-2" />
            Create Quotation
          </Button>
        </Card>
      )}
    </div>
  );
}
