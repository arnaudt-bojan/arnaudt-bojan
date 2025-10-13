import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Package, Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import type { Order, Product, User } from "@shared/schema";

// Simple currency formatter using seller's currency (no conversion)
const formatOrderPrice = (price: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

export default function OrderSuccess() {
  // CRITICAL FIX: Try both route patterns (seller-aware and fallback)
  const [matchSellerAware, paramsSellerAware] = useRoute("/s/:username/order-success/:orderId");
  const [matchFallback, paramsFallback] = useRoute("/order-success/:orderId");
  const [, setLocation] = useLocation();
  
  // Extract orderId from whichever route matched
  const orderId = paramsSellerAware?.orderId || paramsFallback?.orderId;
  
  // Get email from URL query parameter for public order lookup
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  
  // Check if user is authenticated
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });
  
  const isAuthenticated = !!currentUser;

  // Fetch order details - ALWAYS use email lookup if email provided (guest checkout)
  // Only use authenticated endpoint if no email parameter (coming from orders list)
  const { data: order, isLoading: orderLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`, email], // Include email in key
    queryFn: async () => {
      // If email parameter provided, use public lookup (even if authenticated)
      // This handles guest checkout where order may not belong to current session
      const endpoint = email
        ? `/api/orders/lookup/${orderId}?email=${encodeURIComponent(email)}`
        : `/api/orders/${orderId}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      return response.json();
    },
    // Always enabled if we have an orderId
    enabled: !!orderId,
    // Prevent caching of failed requests
    retry: false,
  });

  // Parse order items
  const orderItems = order?.items ? JSON.parse(order.items) : [];
  
  // Get seller ID from first product in order
  const firstProductId = orderItems[0]?.productId;
  
  // Fetch first product to get seller ID
  const { data: firstProduct } = useQuery<Product>({
    queryKey: [`/api/products/${firstProductId}`],
    enabled: !!firstProductId,
  });
  
  const sellerId = firstProduct?.sellerId;
  
  // Fetch seller info using public endpoint
  const { data: sellerUser } = useQuery<User>({
    queryKey: [`/api/sellers/id/${sellerId}`],
    enabled: !!sellerId,
  });
  
  // Fetch all products to get product details from order items
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const seller = sellerUser;
  
  // Get seller's currency from first product (extends Product type with currency field)
  const currency = (firstProduct as any)?.currency || 'USD';

  // Get payment info
  const paymentStatus = order?.paymentStatus;
  const isDepositPayment = paymentStatus === "deposit_paid";
  const amountPaid = parseFloat(order?.amountPaid || "0");
  const remainingBalance = parseFloat(order?.remainingBalance || "0");
  const total = parseFloat(order?.total || "0");

  // Get product details
  const getProductDetails = (productId: string) => {
    return products?.find(p => p.id === productId);
  };

  if (orderLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    // Show helpful message if email parameter is missing for guest users
    if (!email && !isAuthenticated) {
      return (
        <div className="min-h-screen py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <Card>
              <CardContent className="pt-6 pb-8 text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                  <Mail className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">Check Your Email</h1>
                  <p className="text-muted-foreground">
                    Your order confirmation email contains a link to view your order details.
                  </p>
                </div>
                <div className="space-y-3 pt-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-left">
                    <p className="font-medium text-sm mb-2">Can't find the email?</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Check your spam or junk folder</li>
                      <li>Look for an email from noreply@upfirst.io</li>
                      <li>The email may take a few minutes to arrive</li>
                    </ul>
                  </div>
                </div>
                <Button onClick={() => setLocation("/")} data-testid="button-home">
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    // Show generic "Order Not Found" for other cases
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-8">
            We couldn't find the order you're looking for.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Store Banner */}
      {seller?.storeBanner && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img 
            src={seller.storeBanner} 
            alt="Store Banner" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="container mx-auto px-4 max-w-3xl py-8 md:py-12">
        {/* Header with Logo and Success Message */}
        <div className="text-center mb-8">
          {seller?.storeLogo && (
            <img 
              src={seller.storeLogo} 
              alt="Store Logo" 
              className="h-16 md:h-20 mx-auto mb-6 object-contain"
            />
          )}
          
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-order-success">
            Order Confirmed!
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-2">
            Thank you for your order, {order.customerName}!
          </p>
          <p className="text-sm text-muted-foreground">
            A confirmation email has been sent to <span className="font-medium">{order.customerEmail}</span>
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-6">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Order Details</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-mono font-medium" data-testid="text-order-id">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Date</span>
                <span className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Status</span>
                <Badge 
                  variant={isDepositPayment ? "secondary" : "default"}
                  className="font-medium"
                  data-testid="badge-payment-status"
                >
                  {isDepositPayment ? "Deposit Paid" : "Fully Paid"}
                </Badge>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Shipping Address */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Shipping Address</h3>
              </div>
              <div className="pl-6 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{order.customerName}</p>
                <p>{order.customerAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <Card className="mb-6">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-6">Order Items</h2>
            
            <div className="space-y-4">
              {orderItems.map((item: any, index: number) => {
                const product = getProductDetails(item.productId);
                return (
                  <div 
                    key={index} 
                    className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
                    data-testid={`order-item-${index}`}
                  >
                    {product?.image && (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 truncate">{item.name || product?.name}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {item.variant && (
                          <p>Variant: {item.variant}</p>
                        )}
                        <p>Quantity: {item.quantity}</p>
                        <p className="font-semibold text-foreground">
                          {formatOrderPrice(parseFloat(item.price), currency)} each
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatOrderPrice(parseFloat(item.price) * item.quantity, currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-6" />

            {/* Payment Summary */}
            <div className="space-y-3">
              {/* Subtotal */}
              {order.subtotalBeforeTax && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">
                    {formatOrderPrice(parseFloat(order.subtotalBeforeTax), currency)}
                  </span>
                </div>
              )}
              
              {/* Tax (if applicable) */}
              {order.taxAmount && parseFloat(order.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span data-testid="text-tax">{formatOrderPrice(parseFloat(order.taxAmount), currency)}</span>
                </div>
              )}
              
              {order.subtotalBeforeTax && <Separator />}
              
              {isDepositPayment ? (
                <>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Order Total</span>
                    <span data-testid="text-order-total">{formatOrderPrice(total, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400 font-medium">Deposit Paid</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {formatOrderPrice(amountPaid, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="font-semibold">{formatOrderPrice(remainingBalance, currency)}</span>
                  </div>
                  <Separator />
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> You'll be contacted to pay the remaining balance of {formatOrderPrice(remainingBalance, currency)} before shipment.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Paid</span>
                  <span data-testid="text-total">{formatOrderPrice(total, currency)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-8">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <span>
                  You'll receive order updates via email at <span className="font-medium">{order.customerEmail}</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-0.5" />
                <span>
                  Your order will be processed and shipped within 2-3 business days
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <span>
                  If you have any questions, contact us at {seller?.email || order.customerEmail}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            size="lg"
            onClick={() => setLocation("/products")} 
            data-testid="button-continue-shopping"
            className="flex-1 sm:flex-none"
          >
            Continue Shopping
          </Button>
          <Button 
            size="lg"
            variant="outline" 
            onClick={() => setLocation("/")} 
            data-testid="button-home"
            className="flex-1 sm:flex-none"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Store
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {seller?.firstName || 'Upfirst'}. All rights reserved.</p>
          {seller?.username && (
            <p className="mt-1">{seller.username}.upfirst.io</p>
          )}
        </div>
      </div>
    </div>
  );
}
