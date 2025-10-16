import { useState } from "react";
import { LogOut, User, Menu, Settings, Sun, Moon, Store, Building2, ClipboardList } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "../theme-toggle";
import { NotificationBell } from "../notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useBusinessMode } from "@/contexts/business-mode-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import logoImage from "@assets/image_1759956321866.png";
import { useAuthStore } from "@/contexts/auth-store-context";

export function DashboardHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { currentUser } = useAuthStore();
  const { mode, setMode } = useBusinessMode();
  const [, setLocation] = useLocation();

  const isSeller = currentUser?.role === 'seller' || currentUser?.role === 'admin' || currentUser?.role === 'owner';

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'b2c':
        return '🏪 Retail (B2C)';
      case 'b2b':
        return '🏢 Wholesale (B2B)';
      case 'trade':
        return '📋 Trade (Professional)';
      default:
        return mode;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 mt-6">
                {/* Navigation Links */}
                <nav className="flex flex-col gap-2">
                  <Link
                    href="/seller-dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                    data-testid="mobile-link-seller-dashboard"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      if (!currentUser?.username) {
                        toast({
                          title: "Username Required",
                          description: "Please set your store username in Settings > Store URL first.",
                          variant: "destructive",
                        });
                        setMobileMenuOpen(false);
                        return;
                      }
                      const storeUrl = `/s/${currentUser.username}`;
                      window.location.href = storeUrl;
                      setMobileMenuOpen(false);
                    }}
                    className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="mobile-link-preview-store"
                    disabled={!currentUser?.username}
                  >
                    Preview Store
                  </button>
                  <Link
                    href="/seller/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                    data-testid="mobile-link-seller-products"
                  >
                    My Products
                  </Link>
                  <Link
                    href="/social-ads-setup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                    data-testid="mobile-link-social-ads"
                  >
                    Social Ads
                  </Link>
                  <Link
                    href="/seller/newsletter"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                    data-testid="mobile-link-newsletter"
                  >
                    Email Marketing
                  </Link>
                  <Link
                    href="/seller/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                    data-testid="mobile-link-order-management"
                  >
                    Order Management
                  </Link>
                  {currentUser?.role === "admin" && (
                    <>
                      <Link
                        href="/team"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                        data-testid="mobile-link-team"
                      >
                        Team
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                        data-testid="mobile-link-settings"
                      >
                        Settings
                      </Link>
                    </>
                  )}
                </nav>

                <Separator />

                {/* Mobile-only controls */}
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-semibold text-muted-foreground px-3">Preferences</div>
                  
                  {/* Notifications */}
                  <div className="px-3 py-2">
                    <NotificationBell />
                  </div>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center gap-2 px-3 py-2 hover-elevate rounded-lg text-sm"
                    data-testid="mobile-button-theme-toggle"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-4 w-4 text-muted-foreground" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4 text-muted-foreground" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Upfirst Logo - always show on dashboard */}
          <button
            onClick={() => {
              setMode('b2c');
              setLocation('/seller-dashboard');
            }}
            className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg"
            data-testid="link-home"
          >
            <img src={logoImage} alt="Upfirst" className="h-8 dark:invert" />
          </button>
        </div>

        {/* Desktop controls - right side */}
        <div className="flex items-center gap-2">
          {/* Desktop-only: Business Mode Selector, Notifications, Theme */}
          <div className="hidden md:flex items-center gap-2">
            {isSeller && (
              <Select value={mode} onValueChange={(value: any) => setMode(value)} data-testid="select-business-mode">
                <SelectTrigger className="w-[180px]">
                  <SelectValue>{getModeLabel(mode)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2c">🏪 Retail (B2C)</SelectItem>
                  <SelectItem value="b2b">🏢 Wholesale (B2B)</SelectItem>
                  <SelectItem value="trade">📋 Trade (Professional)</SelectItem>
                </SelectContent>
              </Select>
            )}
            <NotificationBell />
            <ThemeToggle />
          </div>
          
          {/* No cart on dashboard */}
          
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser?.profileImageUrl || undefined} alt={currentUser?.email || "User"} style={{ objectFit: "cover" }} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{currentUser?.firstName || currentUser?.email}</span>
                  <span className="text-xs text-muted-foreground">{currentUser?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" data-testid="link-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/api/logout?returnUrl=%2F" data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
