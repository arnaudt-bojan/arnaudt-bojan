import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Server,
  Mail,
  Webhook,
  CreditCard,
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface PlatformMetrics {
  totalSellers: number;
  activeSellers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  platformFees: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
}

interface RecentTransaction {
  id: string;
  sellerName: string;
  amount: number;
  platformFee: number;
  status: string;
  createdAt: string;
}

interface SystemHealth {
  database: "healthy" | "degraded" | "down";
  email: "healthy" | "degraded" | "down";
  stripe: "healthy" | "degraded" | "down";
  webhooks: "healthy" | "degraded" | "down";
  lastChecked: string;
}

interface CriticalError {
  id: string;
  type: string;
  message: string;
  count: number;
  lastOccurred: string;
}

export default function AdminDashboard() {
  const { data: user, isLoading: userLoading } = useQuery<User>({ 
    queryKey: ["/api/auth/user"] 
  });
  const [, setLocation] = useLocation();

  // Check if user is platform admin
  if (!userLoading && (!user || user.isPlatformAdmin !== 1)) {
    setLocation("/");
    return null;
  }

  const { data: metrics, isLoading: metricsLoading } = useQuery<PlatformMetrics>({
    queryKey: ["/api/admin/metrics"],
    enabled: user?.isPlatformAdmin === 1,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<RecentTransaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: user?.isPlatformAdmin === 1,
  });

  const { data: health, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["/api/admin/health"],
    enabled: user?.isPlatformAdmin === 1,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: errors, isLoading: errorsLoading } = useQuery<CriticalError[]>({
    queryKey: ["/api/admin/errors"],
    enabled: user?.isPlatformAdmin === 1,
  });

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getHealthIcon = (status: string) => {
    if (status === "healthy") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "degraded") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getHealthBadge = (status: string) => {
    if (status === "healthy") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">Healthy</Badge>;
    if (status === "degraded") return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">Degraded</Badge>;
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">Down</Badge>;
  };

  return (
    <div className="min-h-screen py-6 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-admin-title">
            Platform Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Upfirst.io Platform Monitoring & Analytics
          </p>
        </div>

        {/* System Health Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Last checked: {health?.lastChecked ? new Date(health.lastChecked).toLocaleString() : "Never"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <p className="text-sm text-muted-foreground">Loading health status...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(health?.database || "down")}
                    <span className="font-medium">Database</span>
                  </div>
                  {getHealthBadge(health?.database || "down")}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(health?.email || "down")}
                    <span className="font-medium">Email</span>
                  </div>
                  {getHealthBadge(health?.email || "down")}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(health?.stripe || "down")}
                    <span className="font-medium">Stripe</span>
                  </div>
                  {getHealthBadge(health?.stripe || "down")}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(health?.webhooks || "down")}
                    <span className="font-medium">Webhooks</span>
                  </div>
                  {getHealthBadge(health?.webhooks || "down")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Errors */}
        {errors && errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Errors Detected ({errors.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {errors.map((error) => (
                  <div key={error.id} className="text-sm">
                    <strong>{error.type}:</strong> {error.message} 
                    <span className="ml-2 text-xs">({error.count} occurrences, last: {new Date(error.lastOccurred).toLocaleString()})</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Platform Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Total Sellers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricsLoading ? "..." : metrics?.totalSellers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.activeSellers || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-500" />
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricsLoading ? "..." : metrics?.totalProducts || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Listed products
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricsLoading ? "..." : metrics?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Platform Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metricsLoading ? "..." : (metrics?.platformFees || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                1.5% collected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue & Subscriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Subscriptions</span>
                  <span className="font-bold">{metrics?.activeSubscriptions || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Trial Subscriptions</span>
                  <span className="font-bold">{metrics?.trialSubscriptions || 0}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Total MRR (est.)</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    ${((metrics?.activeSubscriptions || 0) * 20).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                ${metricsLoading ? "..." : ((metrics?.totalRevenue || 0) / 100).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                Processed through platform
              </p>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Platform Fees (1.5%)</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    ${((metrics?.platformFees || 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Last 20 platform transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{tx.sellerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${(tx.amount / 100).toFixed(2)}</div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Fee: ${(tx.platformFee / 100).toFixed(2)}
                      </div>
                    </div>
                    <Badge 
                      className={`ml-4 ${
                        tx.status === 'succeeded' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}
                    >
                      {tx.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
