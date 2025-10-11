interface StorefrontHeaderProps {
  cartItemsCount?: number;
  onCartClick?: () => void;
}

export function StorefrontHeader({ cartItemsCount = 0, onCartClick }: StorefrontHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
        <div>Storefront Header (Guest/Buyer)</div>
        <div>Placeholder</div>
      </div>
    </header>
  );
}
