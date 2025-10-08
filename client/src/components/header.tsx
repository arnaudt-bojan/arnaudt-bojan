import { useState } from "react";
import { ShoppingCart, Store, LogOut, User, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
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

interface HeaderProps {
  cartItemsCount?: number;
  onCartClick?: () => void;
}

export function Header({ cartItemsCount = 0, onCartClick }: HeaderProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                <Link
                  href="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                  data-testid="mobile-link-products"
                >
                  Products
                </Link>
                {isAuthenticated && (
                  <>
                    <Link
                      href="/seller-dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                      data-testid="mobile-link-seller-dashboard"
                    >
                      Seller Dashboard
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
                      My Orders
                    </Link>
                    {user && (user.role === "owner" || user.role === "admin") && (
                      <>
                        <Link
                          href="/order-management"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                          data-testid="mobile-link-order-management"
                        >
                          Order Management
                        </Link>
                        <Link
                          href="/team"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-lg font-medium hover-elevate px-3 py-2 rounded-lg"
                          data-testid="mobile-link-team"
                        >
                          Team
                        </Link>
                      </>
                    )}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
            <Store className="h-6 w-6" />
            <span className="text-xl font-bold">Uppshop</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/products"
            className={`text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors ${
              location === "/products" ? "text-foreground" : "text-muted-foreground"
            }`}
            data-testid="link-products"
          >
            Products
          </Link>
          {isAuthenticated && (
            <>
              <Link
                href="/seller-dashboard"
                className={`text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors ${
                  location === "/seller-dashboard" || location === "/seller/dashboard" ? "text-foreground" : "text-muted-foreground"
                }`}
                data-testid="link-seller-dashboard"
              >
                Dashboard
              </Link>
              <Link
                href="/seller/products"
                className={`text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors ${
                  location === "/seller/products" ? "text-foreground" : "text-muted-foreground"
                }`}
                data-testid="link-seller-products"
              >
                My Products
              </Link>
              <Link
                href="/orders"
                className={`text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors ${
                  location === "/orders" ? "text-foreground" : "text-muted-foreground"
                }`}
                data-testid="link-orders"
              >
                Orders
              </Link>
              {user && (user.role === "owner" || user.role === "admin") && (
                <>
                  <Link
                    href="/order-management"
                    className={`text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors ${
                      location === "/order-management" ? "text-foreground" : "text-muted-foreground"
                    }`}
                    data-testid="link-order-management"
                  >
                    Order Mgmt
                  </Link>
                  <Link
                    href="/team"
                    className={`text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors ${
                      location === "/team" ? "text-foreground" : "text-muted-foreground"
                    }`}
                    data-testid="link-team"
                  >
                    Team
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
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
                    <a href="/api/logout" data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" asChild data-testid="button-login">
                <a href="/api/login">Log in</a>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
