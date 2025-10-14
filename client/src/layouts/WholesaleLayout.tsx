import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/headers/dashboard-header";
import {
  Store,
  Package,
  Users,
  Eye,
  ShoppingCart,
  LayoutDashboard
} from "lucide-react";

interface WholesaleLayoutProps {
  children: React.ReactNode;
}

export function WholesaleLayout({ children }: WholesaleLayoutProps) {
  const [location] = useLocation();

  const navigation = [
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card/50">
          <div className="flex-1 flex flex-col gap-1 p-4">
            <div className="mb-2 px-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Wholesale (B2B)
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
