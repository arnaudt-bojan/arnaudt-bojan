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

export default function OrderSuccess() {
  const [, params] = useRoute("/order-success/:orderId");
  const [, setLocation] = useLocation();
  const orderId = params?.orderId;
  
  // Get email from URL query parameter for public order lookup
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  
  // Check if user is authenticated
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });
  
  const isAuthenticated = !!currentUser;

  // Fetch order details - use authenticated endpoint if logged in, public lookup if guest
  const { data: order, isLoading: orderLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`, isAuthenticated, email], // Stable key that includes auth state
    queryFn: async () => {
      const endpoint = isAuthenticated 
        ? `/api/orders/${orderId}`
        : `/api/orders/lookup/${orderId}?email=${encodeURIComponent(email || '')}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      return response.json();
    },
    // Always enabled if we have an orderId - auth state and email are in queryKey so it refetches appropriately
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
                          ${parseFloat(item.price).toFixed(2)} each
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-6" />

            {/* Payment Summary */}
            <div className="space-y-3">
              {isDepositPayment ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400 font-medium">Deposit Paid</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      ${amountPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="font-semibold">${remainingBalance.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> You'll be contacted to pay the remaining balance of ${remainingBalance.toFixed(2)} before shipment.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-foreground">
                  <span>Total Paid</span>
                  <span data-testid="text-total">${total.toFixed(2)}</span>
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
