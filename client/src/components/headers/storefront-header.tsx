import { useState } from "react";
import { ShoppingCart, LogOut, User, Menu, Sun, Moon, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../theme-toggle";
import { CurrencySelector } from "../currency-selector";
import { NotificationBell } from "../notification-bell";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { useAuthStore } from "@/contexts/auth-store-context";
import { useQuery } from "@tanstack/react-query";
import { getStoreUrl } from "@/lib/store-url";

interface StorefrontHeaderProps {
  cartItemsCount?: number;
  onCartClick?: () => void;
}

export function StorefrontHeader({ cartItemsCount = 0, onCartClick }: StorefrontHeaderProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { currentUser, activeSeller, isSellerDomain, viewMode } = useAuthStore();
  
  const isAuthenticated = !!currentUser;
  const isBuyer = currentUser?.role === "buyer";
  
  // Get store URL and determine if it's same-origin
  const storeUrl = getStoreUrl(activeSeller?.username) || '/';
  const isAbsoluteUrl = storeUrl.startsWith('http');

  // Check if user has wholesale access (accepted invitations)
  const { data: wholesaleAccess } = useQuery<{ hasAccess: boolean }>({
    queryKey: ["/api/wholesale/buyer/access"],
    enabled: isAuthenticated && isBuyer,
  });
  const hasWholesaleAccess = wholesaleAccess?.hasAccess ?? false;

  // Show mobile menu on seller domains or if authenticated
  const shouldShowMobileMenu = isSellerDomain || isAuthenticated;

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
                    {/* Buyer-specific links */}
                    {isBuyer && (
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
          
          {/* Logo/Branding */}
          {isSellerDomain ? (
            // On seller storefront: show store logo, Instagram username, or store name - always link to seller's storefront
            activeSeller?.storeLogo ? (
              isAbsoluteUrl ? (
                <a href={storeUrl} className="flex items-center gap-2 hover-elevate active-elevate-2 px-3 py-2 rounded-lg border border-border/40" data-testid="link-home">
                  <img src={activeSeller.storeLogo} alt="Store Logo" className="h-10 max-w-[220px] object-contain" />
                </a>
              ) : (
                <Link href={storeUrl} className="flex items-center gap-2 hover-elevate active-elevate-2 px-3 py-2 rounded-lg border border-border/40" data-testid="link-home">
                  <img src={activeSeller.storeLogo} alt="Store Logo" className="h-10 max-w-[220px] object-contain" />
                </Link>
              )
            ) : activeSeller?.instagramUsername ? (
              isAbsoluteUrl ? (
                <a href={storeUrl} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
                  <div className="text-lg font-semibold">@{activeSeller.instagramUsername}</div>
                </a>
              ) : (
                <Link href={storeUrl} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
                  <div className="text-lg font-semibold">@{activeSeller.instagramUsername}</div>
                </Link>
              )
            ) : activeSeller ? (
              isAbsoluteUrl ? (
                <a href={storeUrl} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
                  <div className="text-lg font-semibold">
                    {activeSeller.firstName && activeSeller.lastName 
                      ? `${activeSeller.firstName} ${activeSeller.lastName}`
                      : activeSeller.username || 'Store'}
                  </div>
                </a>
              ) : (
                <Link href={storeUrl} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
                  <div className="text-lg font-semibold">
                    {activeSeller.firstName && activeSeller.lastName 
                      ? `${activeSeller.firstName} ${activeSeller.lastName}`
                      : activeSeller.username || 'Store'}
                  </div>
                </Link>
              )
            ) : (
              <Link href="/" className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
                <div className="text-lg font-semibold">Store</div>
              </Link>
            )
          ) : (
            // On main domain: show Upfirst logo
            <Link href={isAuthenticated ? (isBuyer ? "/buyer-dashboard" : "/") : "/"} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
              <img src={logoImage} alt="Upfirst" className="h-8 dark:invert" />
            </Link>
          )}
        </div>

        {/* Desktop controls - right side */}
        <div className="flex items-center gap-2">
          {/* Desktop navigation - buyer only */}
          {isBuyer && (
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild data-testid="desktop-link-buyer-dashboard">
                <Link href="/buyer-dashboard">My Orders</Link>
              </Button>
              {hasWholesaleAccess && (
                <Button variant="ghost" size="sm" asChild data-testid="desktop-link-buyer-wholesale">
                  <Link href="/wholesale/catalog">Wholesale</Link>
                </Button>
              )}
            </div>
          )}
          
          {/* Desktop-only: Currency, Notifications, Theme */}
          <div className="hidden md:flex items-center gap-2">
            <CurrencySelector />
            {isAuthenticated && <NotificationBell />}
            <ThemeToggle />
          </div>
          
          {/* Cart button - show on seller storefronts and checkout */}
          {(isSellerDomain || location.includes('/checkout')) && (
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

          {/* Auth controls */}
          {isAuthenticated ? (
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
                  <a href={`/api/logout?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" asChild data-testid="button-login">
              <Link href={`/email-login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`}>Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
