import { useState } from "react";
import { ShoppingCart, LogOut, User, Menu, Settings, Sun, Moon, Bell, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { CurrencySelector } from "./currency-selector";
import { NotificationBell } from "./notification-bell";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
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
import { detectDomain } from "@/lib/domain-utils";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  cartItemsCount?: number;
  onCartClick?: () => void;
}

export function Header({ cartItemsCount = 0, onCartClick }: HeaderProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const domainInfo = detectDomain();
  const isSellerDomain = domainInfo.isSellerDomain;

  // Fetch seller info if on seller domain
  const { data: sellerData } = useQuery({
    queryKey: ['/api/seller', domainInfo.sellerUsername],
    enabled: !!domainInfo.sellerUsername && isSellerDomain,
  });

  // Determine which seller info to use
  const sellerInfo = (isSellerDomain ? sellerData : user) as any;
  const isSeller = user?.role === 'admin' || user?.role === 'editor' || user?.role === 'viewer';
  
  // Show burger menu on mobile for both sellers and buyers, or on seller domains
  const shouldShowMobileMenu = isSellerDomain || isAuthenticated;

  // Notification count
  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
  });
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  // Check if user has wholesale access (accepted invitations)
  const { data: wholesaleAccess } = useQuery<{ hasAccess: boolean }>({
    queryKey: ["/api/wholesale/buyer/access"],
    enabled: isAuthenticated && user?.role === "buyer",
  });
  const hasWholesaleAccess = wholesaleAccess?.hasAccess ?? false;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          {shouldShowMobileMenu && (
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
                  {/* Only show Products on seller domains or for authenticated buyers */}
                  {(isSellerDomain || (isAuthenticated && user?.role === "buyer")) && (
                    <Link
                      href="/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                      data-testid="mobile-link-products"
                    >
                      Products
                    </Link>
                  )}
                  {isAuthenticated && user?.role === "buyer" && (
                    <>
                      <Link
                        href="/buyer-dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                        data-testid="mobile-link-buyer-dashboard"
                      >
                        My Orders
                      </Link>
                      {hasWholesaleAccess && (
                        <Link
                          href="/wholesale/catalog"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                          data-testid="mobile-link-buyer-wholesale"
                        >
                          Wholesale Catalog
                        </Link>
                      )}
                    </>
                  )}
                  {isAuthenticated && (user?.role === "admin" || user?.role === "editor" || user?.role === "viewer") && (
                    <>
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
                          if (!user?.username) {
                            toast({
                              title: "Username Required",
                              description: "Please set your store username in Settings > Store URL first.",
                              variant: "destructive",
                            });
                            setMobileMenuOpen(false);
                            return;
                          }
                          const storeUrl = `/s/${user.username}`;
                          window.location.href = storeUrl;
                          setMobileMenuOpen(false);
                        }}
                        className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="mobile-link-preview-store"
                        disabled={!user?.username}
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
                        href="/orders"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                        data-testid="mobile-link-orders"
                      >
                        Orders
                      </Link>
                      <Link
                        href="/seller/wholesale/products"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                        data-testid="mobile-link-wholesale"
                      >
                        Wholesale
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
                        href="/newsletter"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                        data-testid="mobile-link-newsletter"
                      >
                        Newsletter
                      </Link>
                      <Link
                        href="/order-management"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                        data-testid="mobile-link-order-management"
                      >
                        Order Management
                      </Link>
                    </>
                  )}
                  {isAuthenticated && user?.role === "admin" && (
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
                  
                  {/* Currency Selector */}
                  <div className="px-3 py-2 hover-elevate rounded-lg cursor-pointer">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <CurrencySelector />
                    </div>
                  </div>

                  {/* Notifications */}
                  {isAuthenticated && (
                    <div className="px-3 py-2">
                      <NotificationBell />
                    </div>
                  )}

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
          )}
          {sellerInfo?.instagramUsername ? (
            <Link href={isAuthenticated ? (isSeller ? "/seller-dashboard" : "/buyer-dashboard") : "/"} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
              <div className="text-lg font-semibold">@{sellerInfo.instagramUsername}</div>
            </Link>
          ) : sellerInfo?.storeLogo ? (
            <Link href={isAuthenticated ? (isSeller ? "/seller-dashboard" : "/buyer-dashboard") : "/"} className="flex items-center gap-2 hover-elevate active-elevate-2 px-3 py-2 rounded-lg border border-border/40" data-testid="link-home">
              <img src={sellerInfo.storeLogo} alt="Store Logo" className="h-10 max-w-[220px] object-contain" />
            </Link>
          ) : isSeller ? (
            <Link href="/settings?tab=branding">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" data-testid="button-add-logo">
                Add Logo
              </Button>
            </Link>
          ) : (
            <Link href={isAuthenticated ? (isSeller ? "/seller-dashboard" : "/buyer-dashboard") : "/"} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
              <img src={logoImage} alt="Upfirst" className="h-8" />
            </Link>
          )}
        </div>

        {/* Desktop controls - right side */}
        <div className="flex items-center gap-2">
          {/* Desktop-only: Currency, Notifications, Theme */}
          <div className="hidden md:flex items-center gap-2">
            <CurrencySelector />
            {isAuthenticated && <NotificationBell />}
            <ThemeToggle />
          </div>
          
          {/* Only show cart for buyers and guests */}
          {!isSeller && (
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={onCartClick}
              data-testid="button-cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  data-testid="badge-cart-count"
                >
                  {cartItemsCount}
                </Badge>
              )}
            </Button>
          )}

          {!isLoading && (
            isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.email || "User"} style={{ objectFit: "cover" }} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user?.firstName || user?.email}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isSeller && (
                    <DropdownMenuItem asChild>
                      <Link href="/settings" data-testid="link-settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <a href={`/api/logout?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`} data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" asChild data-testid="button-login">
                <Link href="/email-login">Log in</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
