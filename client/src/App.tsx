import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/lib/cart-context";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { SellerProvider } from "@/contexts/seller-context";
import { AuthStoreProvider } from "@/contexts/auth-store-context";
import { BusinessModeProvider } from "@/contexts/business-mode-context";
import { MainHeader } from "@/components/main-header";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/lib/cart-context";
import { ProtectedRoute } from "@/components/protected-route";
import { useOrderWebSocket } from "@/hooks/use-order-websocket";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Checkout from "@/pages/checkout";
import EmailLogin from "@/pages/email-login";
import Login from "@/pages/login";
import BuyerDashboard from "@/pages/buyer-dashboard";
import BuyerOrderDetails from "@/pages/buyer-order-details";
import SellerDashboard from "@/pages/seller-dashboard";
import SellerProducts from "@/pages/seller-products";
import CreateProduct from "@/pages/create-product";
import EditProduct from "@/pages/edit-product";
import Settings from "@/pages/settings";
import QuickAccess from "@/pages/quick-access";
import Team from "@/pages/team";
import AcceptInvitation from "@/pages/accept-invitation";
import MetaAdsDashboard from "@/pages/meta-ads/dashboard";
import CreateAdWizard from "@/pages/meta-ads/create";
import MetaAdsAnalytics from "@/pages/meta-ads/analytics";
import SellerOrdersPage from "@/pages/seller-orders";
import SellerAnalytics from "@/pages/seller-analytics";
import SellerWallet from "@/pages/seller-wallet";
import Newsletter from "@/pages/newsletter";
import Campaigns from "@/pages/campaigns";
import SellerNewsletterPage from "@/pages/seller-newsletter";
import WholesaleProducts from "@/pages/wholesale-products";
import CreateWholesaleProduct from "@/pages/create-wholesale-product";
import WholesaleInvitations from "@/pages/wholesale-invitations";
import BuyerWholesaleCatalog from "@/pages/buyer-wholesale-catalog";
import WholesaleProductDetail from "@/pages/wholesale-product-detail";
import WholesaleAcceptInvitation from "@/pages/wholesale-accept-invitation";
import BulkProductUpload from "@/pages/bulk-product-upload";
import OrderSuccess from "@/pages/order-success";
import CheckoutComplete from "@/pages/checkout-complete";
import BalancePayment from "@/pages/BalancePayment";
import SellerStorefront from "@/pages/seller-storefront";
import AdminDashboard from "@/pages/admin-dashboard";
import SubscriptionSuccess from "@/pages/subscription-success";
import MetaOAuthSuccess from "@/pages/meta-oauth-success";
import Help from "@/pages/help";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";
import MagicLinkVerify from "@/pages/auth/magic-verify";
import BuyerCatalog from "@/pages/wholesale/buyer-catalog";
import WholesaleProductDetailPage from "@/pages/wholesale/product-detail";
import WholesaleCartPage from "@/pages/wholesale/cart";
import WholesaleCheckoutPage from "@/pages/wholesale/checkout";
import OrderConfirmationPage from "@/pages/wholesale/order-confirmation";
import WholesaleDashboard from "@/pages/wholesale/wholesale-dashboard";
import WholesaleOrdersPage from "@/pages/wholesale/wholesale-orders";
import WholesaleBuyersPage from "@/pages/wholesale/wholesale-buyers";
import WholesalePreviewPage from "@/pages/wholesale/wholesale-preview";
import { WholesaleLayout } from "@/layouts/WholesaleLayout";
import DashboardRedirect from "@/components/DashboardRedirect";
import TradeQuotationsList from "@/pages/trade-quotations-list";
import TradeQuotationBuilder from "@/pages/trade-quotation-builder";
import TradeQuotationView from "@/pages/trade-quotation-view";
import TradeDashboard from "@/pages/trade-dashboard";
import TradeOrders from "@/pages/trade-orders";
import ExperiencePage from "@/pages/experience";

function AppContent() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { itemsCount } = useCart();
  const [location] = useLocation();
  
  // Connect to WebSocket for real-time order updates
  useOrderWebSocket();
  
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

  // Hide header on experience page (has its own navigation)
  const isExperiencePage = location === '/experience';
  
  return (
    <div className="min-h-screen flex flex-col">
      {!isPreviewMode && !isExperiencePage && (
        <MainHeader cartItemsCount={itemsCount} onCartClick={() => setIsCartOpen(true)} />
      )}
      <main className="flex-1">
        {/* On seller subdomain, root path shows storefront */}
        {isSellerSubdomain ? (
          <Switch>
              <Route path="/" component={SellerStorefront} />
              <Route path="/products/:id" component={ProductDetail} />
              <Route path="/checkout" component={Checkout} />
              <Route path="/checkout/complete" component={CheckoutComplete} />
              <Route path="/email-login" component={EmailLogin} />
              <Route path="/auth/magic" component={MagicLinkVerify} />
              <Route path="/login" component={Login} />
              <Route path="/dashboard" component={DashboardRedirect} />
              <Route path="/order-success/:orderId" component={OrderSuccess} />
              <Route path="/orders/:orderId/pay-balance" component={BalancePayment} />
              <Route path="/accept-invitation" component={AcceptInvitation} />
              
              {/* Public platform pages on seller subdomain */}
              <Route path="/help" component={Help} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
              
              {/* Public trade quotation view (token-based auth) */}
              <Route path="/trade/view/:token" component={TradeQuotationView} />
              
              {/* Protected wholesale routes on seller subdomain */}
              <Route path="/wholesale/accept/:token" component={WholesaleAcceptInvitation} />
              <Route path="/wholesale/catalog">
                {() => (
                  <ProtectedRoute>
                    <BuyerCatalog />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/catalog/:productId">
                {() => (
                  <ProtectedRoute>
                    <WholesaleProductDetailPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/cart">
                {() => (
                  <ProtectedRoute>
                    <WholesaleCartPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/checkout">
                {() => (
                  <ProtectedRoute>
                    <WholesaleCheckoutPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/orders/:orderId/confirmation">
                {() => (
                  <ProtectedRoute>
                    <OrderConfirmationPage />
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
              <Route path="/experience" component={ExperiencePage} />
              <Route path="/email-login" component={EmailLogin} />
              <Route path="/auth/magic" component={MagicLinkVerify} />
              <Route path="/login" component={Login} />
              <Route path="/dashboard" component={DashboardRedirect} />
              <Route path="/s/:username" component={SellerStorefront} />
              
              {/* Nested seller routes - maintain seller context through navigation */}
              <Route path="/s/:username/products/:id" component={ProductDetail} />
              <Route path="/s/:username/checkout" component={Checkout} />
              <Route path="/s/:username/checkout/complete" component={CheckoutComplete} />
              <Route path="/s/:username/order-success/:orderId" component={OrderSuccess} />
              
              {/* Fallback routes - work without seller context */}
              <Route path="/products/:id" component={ProductDetail} />
              <Route path="/checkout" component={Checkout} />
              <Route path="/checkout/complete" component={CheckoutComplete} />
              <Route path="/order-success/:orderId" component={OrderSuccess} />
              <Route path="/orders/:orderId/pay-balance" component={BalancePayment} />
              
              {/* Public platform pages */}
              <Route path="/help" component={Help} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
              
              {/* Public trade quotation view (token-based auth) */}
              <Route path="/trade/view/:token" component={TradeQuotationView} />
              
              {/* Protected buyer routes */}
              <Route path="/buyer-dashboard">
                {() => (
                  <ProtectedRoute>
                    <BuyerDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/orders/:orderId">
                {() => (
                  <ProtectedRoute>
                    <BuyerOrderDetails />
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Protected seller routes - Retail B2C with unified layout */}
              <Route path="/seller-dashboard">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SellerDashboard />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/dashboard">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SellerDashboard />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/products">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SellerProducts />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/dashboard/products">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SellerProducts />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/dashboard/orders">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SellerOrdersPage />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/create-product">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <CreateProduct />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/bulk-upload">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <BulkProductUpload />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/products/:id/edit">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <EditProduct />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/orders">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SellerOrdersPage />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/wallet">
                {() => (
                  <ProtectedRoute requireSeller>
                    <SellerWallet />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/analytics">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SellerAnalytics />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Protected authenticated routes */}
              <Route path="/settings">
                {() => (
                  <ProtectedRoute>
                    <WholesaleLayout>
                      <Settings />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/quick-access">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <QuickAccess />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/team">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <Team />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/accept-invitation" component={AcceptInvitation} />
              
              {/* Meta Ads routes */}
              <Route path="/meta-ads/dashboard">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <MetaAdsDashboard />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/meta-ads/create">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <CreateAdWizard />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/meta-ads/analytics">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <MetaAdsAnalytics />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Seller-only management routes */}
              <Route path="/seller/newsletter">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SellerNewsletterPage />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/newsletter">
                {() => <Redirect to="/seller/newsletter" />}
              </Route>
              <Route path="/seller/campaigns">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <Campaigns />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/subscription-success">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <SubscriptionSuccess />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/meta-oauth-success">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <MetaOAuthSuccess />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Wholesale dashboard and management routes with WholesaleLayout */}
              <Route path="/wholesale/dashboard">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <WholesaleDashboard />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/products">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <WholesaleProducts />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/products/create">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <CreateWholesaleProduct />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/orders">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <WholesaleOrdersPage />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/buyers">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <WholesaleBuyersPage />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/preview">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <WholesalePreviewPage />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/invitations">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <WholesaleInvitations />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Trade Quotation Routes */}
              <Route path="/seller/trade/quotations">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <TradeQuotationsList />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/trade/quotations/new">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <TradeQuotationBuilder />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/trade/quotations/:id/edit">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <TradeQuotationBuilder />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Trade Dashboard */}
              <Route path="/seller/trade/dashboard">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <TradeDashboard />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Send Quotation (redirect to builder) */}
              <Route path="/seller/trade/send-quotation">
                {() => <Redirect to="/seller/trade/quotations/new" />}
              </Route>
              
              {/* Trade Orders */}
              <Route path="/seller/trade/orders">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <TradeOrders />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Seller-only wholesale routes (legacy, redirects) */}
              <Route path="/seller/wholesale/products">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <WholesaleProducts />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/wholesale/create-product">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <CreateWholesaleProduct />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/seller/wholesale/invitations">
                {() => (
                  <ProtectedRoute requireSeller>
                    <WholesaleLayout>
                      <WholesaleInvitations />
                    </WholesaleLayout>
                  </ProtectedRoute>
                )}
              </Route>
              
              {/* Buyer wholesale routes */}
              <Route path="/wholesale/accept/:token" component={WholesaleAcceptInvitation} />
              <Route path="/wholesale/catalog">
                {() => (
                  <ProtectedRoute>
                    <BuyerCatalog />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/catalog/:productId">
                {() => (
                  <ProtectedRoute>
                    <WholesaleProductDetailPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/cart">
                {() => (
                  <ProtectedRoute>
                    <WholesaleCartPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/checkout">
                {() => (
                  <ProtectedRoute>
                    <WholesaleCheckoutPage />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/wholesale/orders/:orderId/confirmation">
                {() => (
                  <ProtectedRoute>
                    <OrderConfirmationPage />
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
          <SellerProvider>
            <AuthStoreProvider>
              <BusinessModeProvider>
                <CurrencyProvider>
                  <CartProvider>
                    <AppContent />
                    <Toaster />
                  </CartProvider>
                </CurrencyProvider>
              </BusinessModeProvider>
            </AuthStoreProvider>
          </SellerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
