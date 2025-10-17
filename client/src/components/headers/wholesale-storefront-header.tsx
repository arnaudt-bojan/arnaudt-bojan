import { useState } from "react";
import { ShoppingCart, LogOut, User, Menu, Sun, Moon, DollarSign, Package } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../theme-toggle";
import { CurrencySelector } from "../currency-selector";
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
import type { User as UserType } from "@shared/schema";

interface WholesaleStorefrontHeaderProps {
  cartItemsCount?: number;
  onCartClick?: () => void;
}

export function WholesaleStorefrontHeader({ cartItemsCount = 0, onCartClick }: WholesaleStorefrontHeaderProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { currentUser } = useAuthStore();
  
  // Check for preview mode parameters
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewMode = searchParams.get('preview') === 'true';
  const previewLogo = searchParams.get('previewLogo');
  const previewBanner = searchParams.get('previewBanner');
  
  // Fetch seller information from the wholesale products to get seller branding
  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/wholesale/catalog"],
    enabled: !!currentUser,
  });
  
  // Get seller info from first product (all products from same seller in wholesale)
  const sellerId = products?.[0]?.sellerId;
  
  const { data: seller } = useQuery<UserType>({
    queryKey: ["/api/users", sellerId],
    enabled: !!sellerId,
  });
  
  // Use preview parameters if in preview mode, otherwise use seller data
  const displayLogo = isPreviewMode ? previewLogo : seller?.storeLogo;
  const displayBanner = isPreviewMode ? previewBanner : seller?.storeBanner;
  // Get seller display name - prioritize Instagram username, then full name, then username
  const sellerName = seller?.instagramUsername 
    ? `@${seller.instagramUsername}` 
    : seller?.firstName && seller?.lastName
    ? `${seller.firstName} ${seller.lastName}`
    : seller?.username || 'Store';
  
  const isAuthenticated = !!currentUser;

  return (
    <>
      {/* Banner Image */}
      {displayBanner && (
        <div className="w-full h-48 md:h-64 lg:h-80 overflow-hidden bg-muted">
          <img
            src={displayBanner}
            alt="Store Banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Header */}
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
                  <SheetTitle>Wholesale Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 mt-6">
                  <nav className="flex flex-col gap-2">
                    <Link
                      href="/wholesale/catalog"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                      data-testid="mobile-link-catalog"
                    >
                      Browse Products
                    </Link>
                    <Link
                      href="/wholesale/cart"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                      data-testid="mobile-link-cart"
                    >
                      Cart
                    </Link>
                    <Link
                      href="/buyer-dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-medium hover-elevate px-3 py-2.5 rounded-lg"
                      data-testid="mobile-link-orders"
                    >
                      My Orders
                    </Link>
                  </nav>

                  <Separator />

                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-semibold text-muted-foreground px-3">Preferences</div>
                    
                    <div className="px-3 py-2 hover-elevate rounded-lg cursor-pointer">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <CurrencySelector />
                      </div>
                    </div>

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
                  
                  <Separator />
                  
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-xs text-muted-foreground">Powered by</span>
                      <img src={logoImage} alt="Upfirst" className="h-4 dark:invert" />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Logo/Branding - Match B2C pattern */}
            <Link href="/wholesale/catalog" className="flex items-center gap-3 hover-elevate px-3 py-2 rounded-lg" data-testid="link-home">
              {displayLogo ? (
                <>
                  <img src={displayLogo} alt="Store Logo" className="h-10 max-w-[220px] object-contain" />
                  <Badge variant="secondary" className="hidden md:flex">
                    Wholesale
                  </Badge>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold">{sellerName}</div>
                  <Badge variant="secondary" className="hidden md:flex">
                    Wholesale
                  </Badge>
                </>
              )}
            </Link>
          </div>

          {/* Desktop controls - right side */}
          <div className="flex items-center gap-2">
            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild data-testid="desktop-link-catalog">
                <Link href="/wholesale/catalog">Products</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild data-testid="desktop-link-orders">
                <Link href="/buyer-dashboard">My Orders</Link>
              </Button>
            </div>
            
            {/* Desktop-only: Currency, Theme */}
            <div className="hidden md:flex items-center gap-2">
              <CurrencySelector />
              <ThemeToggle />
            </div>
            
            {/* Cart button */}
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
                    <a href="/api/logout?returnUrl=%2F" data-testid="button-logout">
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
    </>
  );
}
