import { ShoppingCart, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  cartItemsCount?: number;
  onCartClick?: () => void;
}

export function Header({ cartItemsCount = 0, onCartClick }: HeaderProps) {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
        <Link href="/" className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-lg" data-testid="link-home">
          <Store className="h-6 w-6" />
          <span className="text-xl font-bold">Uppshop</span>
        </Link>

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
          <Link
            href="/seller/dashboard"
            className={`text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors ${
              location === "/seller/dashboard" ? "text-foreground" : "text-muted-foreground"
            }`}
            data-testid="link-seller-dashboard"
          >
            Seller Dashboard
          </Link>
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
        </div>
      </div>
    </header>
  );
}
