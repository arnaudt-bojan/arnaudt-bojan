import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Users, ShoppingCart, DollarSign, PlusCircle } from "lucide-react";
import { Link } from "wouter";
import { formatCurrencyFromCents, getCurrentCurrency } from "@/lib/currency";

export default function WholesaleDashboard() {
  const currency = getCurrentCurrency();
  
  const { data: stats, isLoading } = useQuery<{
    totalProducts: number;
    totalBuyers: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
  }>({
    queryKey: ['/api/wholesale/dashboard/stats'],
  });

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['/api/wholesale/orders', { limit: 5 }],
  });

  const quickActions = [
    {
      title: "Create Product",
      description: "Add a new wholesale product",
      href: "/wholesale/products/create",
      icon: Package,
      testId: "button-create-wholesale-product",
    },
    {
      title: "View Products",
      description: "Manage your wholesale catalog",
      href: "/wholesale/products",
      icon: Package,
      testId: "button-view-wholesale-products",
    },
    {
      title: "View Orders",
      description: "Manage wholesale orders",
      href: "/wholesale/orders",
      icon: ShoppingCart,
      testId: "button-view-wholesale-orders",
    },
    {
      title: "Manage Buyers",
      description: "Invite and manage buyers",
      href: "/wholesale/buyers",
      icon: Users,
      testId: "button-manage-buyers",
    },
  ];

  return (
    <div className="space-y-6" data-testid="page-wholesale-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Wholesale Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your B2B wholesale operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-products">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-products">
                {stats?.totalProducts || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-buyers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Buyers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-buyers">
                {stats?.totalBuyers || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-orders">
                {stats?.totalOrders || 0}
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
                {formatCurrencyFromCents((stats?.totalRevenue || 0) * 100, currency)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <Link href="/wholesale/orders">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              {ordersLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {recentOrders.map((order: any) => (
                    <div key={order.id} className="p-4 flex items-center justify-between hover-elevate">
                      <div>
                        <div className="font-medium">Order #{order.orderNumber || order.id.slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">{order.buyerEmail}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrencyFromCents((order.totalAmount || 0) * 100, currency)}</div>
                        <div className="text-sm text-muted-foreground capitalize">{order.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
