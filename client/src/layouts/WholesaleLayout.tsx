import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Store,
  Package,
  Users,
  Eye,
  ShoppingCart,
  LayoutDashboard,
  FileText,
  Send,
  Settings,
  BarChart3
} from "lucide-react";
import { useBusinessMode } from "@/contexts/business-mode-context";

interface WholesaleLayoutProps {
  children: React.ReactNode;
}

export function WholesaleLayout({ children }: WholesaleLayoutProps) {
  const [location] = useLocation();
  const { mode } = useBusinessMode();

  // B2C Navigation Items
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
      name: "Settings",
      href: "/settings",
      icon: Settings,
      testId: "link-seller-settings",
    },
  ];

  // B2B Navigation Items
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
  ];

  // Trade Navigation Items
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
  ];

  // Select navigation based on current mode
  const navigation = mode === 'b2c' ? b2cNavigation : mode === 'b2b' ? b2bNavigation : tradeNavigation;

  // Get mode label for sidebar header
  const getModeLabel = () => {
    switch (mode) {
      case 'b2c':
        return 'Retail (B2C)';
      case 'b2b':
        return 'Wholesale (B2B)';
      case 'trade':
        return 'Trade (Professional)';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card/50">
          <div className="flex-1 flex flex-col gap-1 p-4">
            <div className="mb-2 px-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {getModeLabel()}
              </h2>
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
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto max-w-7xl p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
