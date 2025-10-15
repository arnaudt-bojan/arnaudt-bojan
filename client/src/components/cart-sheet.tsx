import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart-context";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyDisclaimer } from "./currency-disclaimer";
import { useSellerContext, getSellerAwarePath, extractSellerFromCurrentPath } from "@/contexts/seller-context";
import { formatVariant } from "@shared/variant-formatter";

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CartSheet({ open, onClose }: CartSheetProps) {
  const { items, updateQuantity, removeItem, total, itemsCount, isLoading } = useCart();
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const { sellerUsername } = useSellerContext();
  
  // CRITICAL FIX: Use fallback to extract seller from current path if context is null
  const effectiveSellerUsername = sellerUsername || extractSellerFromCurrentPath();
  
  // Get seller ID and currency from cart items (all items are from same seller)
  const sellerId = items.length > 0 ? items[0].sellerId : null;
  const currency = items.length > 0 ? items[0].currency || 'USD' : 'USD';
  
  // Fetch seller's tax settings
  const { data: seller } = useQuery<any>({
    queryKey: sellerId ? [`/api/sellers/id/${sellerId}`] : [],
    enabled: !!sellerId && open,
  });

  const handleCheckout = () => {
    onClose();
    const checkoutPath = getSellerAwarePath("/checkout", effectiveSellerUsername);
    setLocation(checkoutPath);
  };
  
  // Calculate tax estimate (8% default rate if tax is enabled)
  const taxEstimate = seller?.taxEnabled ? total * 0.08 : 0;
  const estimatedTotal = total + taxEstimate;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart ({itemsCount})
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Loading cart...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-empty-cart">
                Your cart is empty
              </p>
              <Button onClick={onClose} data-testid="button-continue-shopping">
                Continue Shopping
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 rounded-lg border hover-elevate"
                  data-testid={`cart-item-${item.id}`}
                >
                  <Link 
                    href={`/product/${item.id}`}
                    onClick={onClose}
                    className="flex-shrink-0"
                    data-testid={`link-product-${item.id}`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-75 transition-opacity"
                    />
                  </Link>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between gap-2">
                      <Link 
                        href={`/product/${item.id}`}
                        onClick={onClose}
                        className="flex-1"
                        data-testid={`link-product-name-${item.id}`}
                      >
                        <h4 className="font-semibold text-sm line-clamp-2 cursor-pointer hover:underline">
                          {item.name}
                        </h4>
                        {formatVariant((item as any).variant) && (
                          <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-variant-${item.id}`}>
                            {formatVariant((item as any).variant)}
                          </p>
                        )}
                        {((item as any).variantSku || (item as any).productSku) && (
                          <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-cart-item-sku-${item.id}`}>
                            SKU: {(item as any).variantSku || (item as any).productSku}
                          </p>
                        )}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => {
                          // CRITICAL FIX: Pass variantId directly (works for all variants including hyphenated colors)
                          removeItem(item.id, (item as any).variantId || (item as any).variant);
                        }}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 border rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            // CRITICAL FIX: Pass variantId directly (works for all variants including hyphenated colors)
                            updateQuantity(item.id, item.quantity - 1, (item as any).variantId || (item as any).variant);
                          }}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium min-w-[2ch] text-center" data-testid={`text-quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            // CRITICAL FIX: Pass variantId directly (works for all variants including hyphenated colors)
                            updateQuantity(item.id, item.quantity + 1, (item as any).variantId || (item as any).variant);
                          }}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold" data-testid={`text-item-total-${item.id}`}>
                        {formatPrice(parseFloat(item.price) * item.quantity, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-semibold" data-testid="text-cart-subtotal">
                    {formatPrice(total, currency)}
                  </span>
                </div>
                {seller?.taxEnabled ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Estimated Tax</span>
                      <span className="font-semibold" data-testid="text-cart-tax-estimate">
                        {formatPrice(taxEstimate, currency)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid="text-tax-notice">
                      Actual tax calculated at checkout based on shipping address
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground" data-testid="text-tax-notice">
                    Tax calculated at checkout
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-lg font-semibold">Estimated Total</span>
                <span className="text-2xl font-bold" data-testid="text-cart-total">
                  {formatPrice(estimatedTotal, currency)}
                </span>
              </div>
              
              {/* Currency Disclaimer */}
              {currency && (
                <CurrencyDisclaimer 
                  sellerCurrency={currency} 
                  variant="compact"
                />
              )}
              
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                data-testid="button-checkout"
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
