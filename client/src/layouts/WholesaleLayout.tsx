import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Package,
  Users,
  Eye,
  ShoppingCart,
  LayoutDashboard,
  FileText,
  Send,
  Settings,
  BarChart3,
  Mail,
  Megaphone,
  Wallet,
  LogOut
} from "lucide-react";
import { useBusinessMode } from "@/contexts/business-mode-context";
import { NotificationBell } from "@/components/notification-bell";
import { PlatformSwitcher } from "@/components/platform-switcher";
import { CreditBalanceDisplay } from "@/components/credit-balance-display";

interface WholesaleLayoutProps {
  children: React.ReactNode;
}

// B2C Navigation Items - MOVED OUTSIDE to prevent re-creation
const b2cNavigation = [
    {
      name: "Dashboard",
      href: "/seller-dashboard",
      icon: LayoutDashboard,
      testId: "link-seller-dashboard",
    },
    {
      name: "Products",
      href: "/seller/products",
      icon: Package,
      testId: "link-seller-products",
    },
    {
      name: "Orders",
      href: "/seller/orders",
      icon: ShoppingCart,
      testId: "link-seller-orders",
    },
    {
      name: "Analytics",
      href: "/seller/analytics",
      icon: BarChart3,
      testId: "link-seller-analytics",
    },
    {
      name: "Newsletter",
      href: "/seller/newsletter",
      icon: Mail,
      testId: "link-seller-newsletter",
    },
    {
      name: "Meta Ads",
      href: "/meta-ads/dashboard",
      icon: Megaphone,
      testId: "link-meta-ads",
    },
    {
      name: "Wallet",
      href: "/seller/wallet",
      icon: Wallet,
      testId: "link-seller-wallet",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      testId: "link-seller-settings",
    },
  ];

// B2B Navigation Items - MOVED OUTSIDE to prevent re-creation
const b2bNavigation = [
    {
      name: "Dashboard",
      href: "/wholesale/dashboard",
      icon: LayoutDashboard,
      testId: "link-wholesale-dashboard",
    },
    {
      name: "Products",
      href: "/wholesale/products",
      icon: Package,
      testId: "link-wholesale-products",
    },
    {
      name: "Orders",
      href: "/wholesale/orders",
      icon: ShoppingCart,
      testId: "link-wholesale-orders",
    },
    {
      name: "Buyers",
      href: "/wholesale/buyers",
      icon: Users,
      testId: "link-wholesale-buyers",
    },
    {
      name: "Preview Catalog",
      href: "/wholesale/preview",
      icon: Eye,
      testId: "link-wholesale-preview",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      testId: "link-wholesale-settings",
    },
  ];

// Trade Navigation Items - MOVED OUTSIDE to prevent re-creation
const tradeNavigation = [
    {
      name: "Dashboard",
      href: "/seller/trade/dashboard",
      icon: LayoutDashboard,
      testId: "link-trade-dashboard",
    },
    {
      name: "Quotations",
      href: "/seller/trade/quotations",
      icon: FileText,
      testId: "link-trade-quotations",
    },
    {
      name: "Send Quotation",
      href: "/seller/trade/send-quotation",
      icon: Send,
      testId: "link-trade-send-quotation",
    },
    {
      name: "Trade Orders",
      href: "/seller/trade/orders",
      icon: ShoppingCart,
      testId: "link-trade-orders",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      testId: "link-trade-settings",
    },
  ];

export function WholesaleLayout({ children }: WholesaleLayoutProps) {
  const [location] = useLocation();
  const { mode, setMode } = useBusinessMode();

  // Auto-detect mode based on current route
  useEffect(() => {
    if (location.startsWith('/wholesale/') || location.startsWith('/seller/wholesale/')) {
      setMode('b2b');
    } else if (location.startsWith('/seller/trade/')) {
      setMode('trade');
    } else if (
      location.startsWith('/seller') || 
      location.startsWith('/meta-ads') ||
      location === '/settings' ||
      location === '/quick-access' ||
      location === '/team'
    ) {
      setMode('b2c');
    }
  }, [location, setMode]);

  // Select navigation based on current mode
  const navigation = mode === 'b2c' ? b2cNavigation : mode === 'b2b' ? b2bNavigation : tradeNavigation;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card/50">
        <div className="flex-1 flex flex-col gap-1 p-4">
          {/* Platform Mode Selector */}
          <div className="mb-4">
            <PlatformSwitcher />
          </div>
          
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 hover-elevate",
                      isActive && "bg-accent"
                    )}
                    data-testid={item.testId}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="space-y-2 pt-4 mt-4 border-t">
            {/* Credit Balance Display - Only show in B2C mode */}
            {mode === 'b2c' && (
              <div className="mb-3">
                <CreditBalanceDisplay />
              </div>
            )}
            
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-sm font-medium">Notifications</span>
              <NotificationBell />
            </div>
            <a href="/api/logout" className="block">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover-elevate"
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-7xl p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
