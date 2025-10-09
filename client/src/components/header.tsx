import { useState } from "react";
import { ShoppingCart, LogOut, User, Menu, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { CurrencySelector } from "./currency-selector";
import { NotificationBell } from "./notification-bell";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  
  // Determine if we should show the burger menu
  const shouldShowBurgerMenu = isSellerDomain || isAuthenticated;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          {shouldShowBurgerMenu && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                {/* Only show Products on seller domains or for authenticated buyers */}
                {(isSellerDomain || (isAuthenticated && user?.role === "buyer")) && (
                  <Link
                    href="/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
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
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-buyer-dashboard"
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/wholesale/catalog"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-buyer-wholesale"
                    >
                      Wholesale Catalog
                    </Link>
                  </>
                )}
                {isAuthenticated && (user?.role === "admin" || user?.role === "editor" || user?.role === "viewer") && (
                  <>
                    <Link
                      href="/seller-dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-seller-dashboard"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-preview-store"
                    >
                      Preview Store
                    </Link>
                    <Link
                      href="/seller/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-seller-products"
                    >
                      My Products
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-orders"
                    >
                      Orders
                    </Link>
                    <Link
                      href="/seller/wholesale/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-wholesale"
                    >
                      Wholesale
                    </Link>
                    <Link
                      href="/social-ads-setup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-social-ads"
                    >
                      Social Ads
                    </Link>
                    <Link
                      href="/newsletter"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-newsletter"
                    >
                      Newsletter
                    </Link>
                    <Link
                      href="/order-management"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
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
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-team"
                    >
                      Team
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-settings"
                    >
                      Settings
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
            </Sheet>
          )}
          {sellerInfo?.instagramUsername ? (
            <Link href={isSeller ? "/seller-dashboard" : "/"} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
              <div className="text-lg font-semibold">@{sellerInfo.instagramUsername}</div>
            </Link>
          ) : sellerInfo?.storeLogo ? (
            <Link href={isSeller ? "/seller-dashboard" : "/"} className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
              <img src={sellerInfo.storeLogo} alt="Store Logo" className="h-8 max-w-[200px] object-contain" />
            </Link>
          ) : isSeller ? (
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" data-testid="button-add-logo">
                Add Logo
              </Button>
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
              <img src={logoImage} alt="Uppfirst" className="h-8" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <CurrencySelector />
          {isAuthenticated && <NotificationBell />}
          <ThemeToggle />
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
                  <DropdownMenuItem asChild>
                    <Link href="/settings" data-testid="link-settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/api/logout" data-testid="button-logout">
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
