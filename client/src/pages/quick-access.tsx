import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package, 
  ShoppingBag, 
  PlusCircle, 
  LayoutDashboard, 
  ListOrdered,
  Store,
  ArrowRight
} from "lucide-react";

const quickActions = [
  {
    icon: PlusCircle,
    title: "Create Product",
    description: "Add a new product to your store",
    href: "/seller/create-product",
    color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
    authRequired: true,
  },
  {
    icon: Package,
    title: "My Products",
    description: "Manage your product catalog",
    href: "/seller/products",
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    authRequired: true,
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "View sales and analytics",
    href: "/seller-dashboard",
    color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
    authRequired: true,
  },
  {
    icon: ListOrdered,
    title: "My Orders",
    description: "Track your order history",
    href: "/orders",
    color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
    authRequired: true,
  },
  {
    icon: ShoppingBag,
    title: "Browse Products",
    description: "Shop from all products",
    href: "/products",
    color: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20",
    authRequired: false,
  },
  {
    icon: Store,
    title: "Home",
    description: "Return to homepage",
    href: "/",
    color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20",
    authRequired: false,
  },
];

export default function QuickAccess() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">
            Quick Access
          </h1>
          <p className="text-muted-foreground text-lg">
            Jump to any section of your Uppshop experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isDisabled = action.authRequired && !isAuthenticated;

            return (
              <Card 
                key={action.href}
                className={`hover-elevate active-elevate-2 transition-all ${
                  isDisabled ? "opacity-50" : "cursor-pointer"
                }`}
                onClick={() => !isDisabled && navigate(action.href)}
                data-testid={`card-quick-${action.href.replace(/\//g, "-")}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${action.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xl mt-4">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isDisabled && (
                    <p className="text-xs text-muted-foreground">
                      Login required
                    </p>
                  )}
                  {!isDisabled && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(action.href);
                      }}
                    >
                      Go to {action.title}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isAuthenticated && (
          <div className="mt-12 text-center">
            <Card className="p-6 bg-primary/5 border-primary/20">
              <p className="text-sm text-muted-foreground mb-4">
                Login to access all features including product management and order tracking
              </p>
              <Button onClick={() => navigate("/api/login")} data-testid="button-login">
                Log in to Continue
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
