import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/lib/cart-context";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AuthStoreProvider } from "@/contexts/auth-store-context";
import { MainHeader } from "@/components/main-header";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/lib/cart-context";
import { ProtectedRoute } from "@/components/protected-route";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Checkout from "@/pages/checkout";
import EmailLogin from "@/pages/email-login";
import BuyerDashboard from "@/pages/buyer-dashboard";
import SellerDashboard from "@/pages/seller-dashboard";
import SellerProducts from "@/pages/seller-products";
import CreateProduct from "@/pages/create-product";
import EditProduct from "@/pages/edit-product";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import BuyerOrderDetail from "@/pages/buyer-order-detail";
import Settings from "@/pages/settings";
import QuickAccess from "@/pages/quick-access";
import Team from "@/pages/team";
import AcceptInvitation from "@/pages/accept-invitation";
import SocialAdsSetup from "@/pages/social-ads-setup";
import CreateAdCampaign from "@/pages/create-ad-campaign";
import PromoteProduct from "@/pages/promote-product";
import CreateMetaCampaign from "@/pages/create-meta-campaign";
import SellerOrdersPage from "@/pages/seller-orders";
import Newsletter from "@/pages/newsletter";
import WholesaleProducts from "@/pages/wholesale-products";
import CreateWholesaleProduct from "@/pages/create-wholesale-product";
import WholesaleInvitations from "@/pages/wholesale-invitations";
import BuyerWholesaleCatalog from "@/pages/buyer-wholesale-catalog";
import WholesaleProductDetail from "@/pages/wholesale-product-detail";
import WholesaleAcceptInvitation from "@/pages/wholesale-accept-invitation";
import BulkProductUpload from "@/pages/bulk-product-upload";
import OrderSuccess from "@/pages/order-success";
import SellerStorefront from "@/pages/seller-storefront";
import AdminDashboard from "@/pages/admin-dashboard";
import SubscriptionSuccess from "@/pages/subscription-success";
import Help from "@/pages/help";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";

function AppContent() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { itemsCount } = useCart();
  const [location] = useLocation();
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  // Detect preview mode (hide header when in preview)
  const isPreviewMode = new URLSearchParams(window.location.search).get('preview');
  
  // Detect if on seller subdomain (username.upfirst.io)
  const hostname = window.location.hostname;
  const isSellerSubdomain = hostname.split('.').length === 3 && 
                           hostname.includes('upfirst.io') && 
                           hostname !== 'www.upfirst.io';

  return (
    <div className="min-h-screen flex flex-col">
      {!isPreviewMode && (
        <MainHeader cartItemsCount={itemsCount} onCartClick={() => setIsCartOpen(true)} />
      )}
      <main className="flex-1">
        {/* On seller subdomain, root path shows storefront */}
        {isSellerSubdomain ? (
          <Switch>
              <Route path="/" component={SellerStorefront} />
              <Route path="/products/:id" component={ProductDetail} />
              <Route path="/checkout" component={Checkout} />
              <Route path="/email-login" component={EmailLogin} />
              <Route path="/order-success/:orderId" component={OrderSuccess} />
              <Route path="/accept-invitation" component={AcceptInvitation} />
              
              {/* Public platform pages on seller subdomain */}
              <Route path="/help" component={Help} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
              
              {/* Protected buyer routes on seller subdomain */}
              <Route path="/orders">
                {() => (
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/orders/:id">
                {() => (
                  <ProtectedRoute>
                    <BuyerOrderDetail />
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Protected wholesale routes on seller subdomain */}
              <Route path="/wholesale/accept/:token" component={WholesaleAcceptInvitation} />
              <Route path="/wholesale/catalog">
                {() => (
                  <ProtectedRoute>
                    <BuyerWholesaleCatalog />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/product/:id">
                {() => (
                  <ProtectedRoute>
                    <WholesaleProductDetail />
                  </ProtectedRoute>
                )}
              </Route>
              
              <Route>{() => <NotFound />}</Route>
          </Switch>
        ) : (
          <Switch>
              {/* Main domain or dev routes */}
              <Route path="/" component={Home} />
              <Route path="/email-login" component={EmailLogin} />
              <Route path="/s/:username" component={SellerStorefront} />
              <Route path="/products/:id" component={ProductDetail} />
              <Route path="/checkout" component={Checkout} />
              <Route path="/order-success/:orderId" component={OrderSuccess} />
              
              {/* Public platform pages */}
              <Route path="/help" component={Help} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
              
              {/* Protected buyer routes */}
              <Route path="/buyer-dashboard">
                {() => (
                  <ProtectedRoute>
                    <BuyerDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Protected seller routes */}
              <Route path="/seller-dashboard">
                {() => (
                  <ProtectedRoute requireSeller>
                    <SellerDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/dashboard">
                {() => (
                  <ProtectedRoute requireSeller>
                    <SellerDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/products">
                {() => (
                  <ProtectedRoute requireSeller>
                    <SellerProducts />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/create-product">
                {() => (
                  <ProtectedRoute requireSeller>
                    <CreateProduct />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/bulk-upload">
                {() => (
                  <ProtectedRoute requireSeller>
                    <BulkProductUpload />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/products/:id/edit">
                {() => (
                  <ProtectedRoute requireSeller>
                    <EditProduct />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/order/:id">
                {() => (
                  <ProtectedRoute requireSeller>
                    <OrderDetail />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/orders">
                {() => (
                  <ProtectedRoute requireSeller>
                    <SellerOrdersPage />
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Protected authenticated routes */}
              <Route path="/orders">
                {() => (
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/orders/:id">
                {() => (
                  <ProtectedRoute>
                    <BuyerOrderDetail />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/settings">
                {() => (
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/quick-access">
                {() => (
                  <ProtectedRoute requireSeller>
                    <QuickAccess />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/team">
                {() => (
                  <ProtectedRoute requireSeller>
                    <Team />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/accept-invitation" component={AcceptInvitation} />
              
              {/* Seller-only ad routes */}
              <Route path="/social-ads-setup">
                {() => (
                  <ProtectedRoute requireSeller>
                    <SocialAdsSetup />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/promote-product/:id">
                {() => (
                  <ProtectedRoute requireSeller>
                    <PromoteProduct />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/create-meta-campaign/:id">
                {() => (
                  <ProtectedRoute requireSeller>
                    <CreateMetaCampaign />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/create-ad-campaign">
                {() => (
                  <ProtectedRoute requireSeller>
                    <CreateAdCampaign />
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Seller-only management routes */}
              <Route path="/newsletter">
                {() => (
                  <ProtectedRoute requireSeller>
                    <Newsletter />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/subscription-success">
                {() => (
                  <ProtectedRoute requireSeller>
                    <SubscriptionSuccess />
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Seller-only wholesale routes */}
              <Route path="/seller/wholesale/products">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleProducts />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/wholesale/create-product">
                {() => (
                  <ProtectedRoute requireSeller>
                    <CreateWholesaleProduct />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/wholesale/invitations">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleInvitations />
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Buyer wholesale routes */}
              <Route path="/wholesale/accept/:token" component={WholesaleAcceptInvitation} />
              <Route path="/wholesale/catalog">
                {() => (
                  <ProtectedRoute>
                    <BuyerWholesaleCatalog />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/product/:id">
                {() => (
                  <ProtectedRoute>
                    <WholesaleProductDetail />
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Platform admin routes */}
              <Route path="/admin">
                {() => (
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              
              <Route>{() => <NotFound />}</Route>
          </Switch>
        )}
      </main>
      {!isPreviewMode && (
        <CartSheet open={isCartOpen} onClose={() => setIsCartOpen(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthStoreProvider>
            <CurrencyProvider>
              <CartProvider>
                <AppContent />
                <Toaster />
              </CartProvider>
            </CurrencyProvider>
          </AuthStoreProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
