import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/lib/cart-context";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { Header } from "@/components/header";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/lib/cart-context";
import Home from "@/pages/home";
import Products from "@/pages/products";
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
import Settings from "@/pages/settings";
import QuickAccess from "@/pages/quick-access";
import Team from "@/pages/team";
import AcceptInvitation from "@/pages/accept-invitation";
import SocialAdsSetup from "@/pages/social-ads-setup";
import CreateAdCampaign from "@/pages/create-ad-campaign";
import PromoteProduct from "@/pages/promote-product";
import CreateMetaCampaign from "@/pages/create-meta-campaign";
import OrderManagement from "@/pages/order-management";
import Newsletter from "@/pages/newsletter";
import WholesaleProducts from "@/pages/wholesale-products";
import CreateWholesaleProduct from "@/pages/create-wholesale-product";
import WholesaleInvitations from "@/pages/wholesale-invitations";
import BuyerWholesaleCatalog from "@/pages/buyer-wholesale-catalog";
import WholesaleProductDetail from "@/pages/wholesale-product-detail";
import WholesaleAcceptInvitation from "@/pages/wholesale-accept-invitation";
import BulkProductUpload from "@/pages/bulk-product-upload";
import OrderSuccess from "@/pages/order-success";
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

  return (
    <div className="min-h-screen flex flex-col">
      {!isPreviewMode && (
        <Header cartItemsCount={itemsCount} onCartClick={() => setIsCartOpen(true)} />
      )}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/email-login" component={EmailLogin} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductDetail} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/order-success/:orderId" component={OrderSuccess} />
          <Route path="/buyer-dashboard" component={BuyerDashboard} />
          <Route path="/seller-dashboard" component={SellerDashboard} />
          <Route path="/seller/dashboard" component={SellerDashboard} />
          <Route path="/seller/products" component={SellerProducts} />
          <Route path="/seller/create-product" component={CreateProduct} />
          <Route path="/seller/bulk-upload" component={BulkProductUpload} />
          <Route path="/seller/products/:id/edit" component={EditProduct} />
          <Route path="/seller/order/:id" component={OrderDetail} />
          <Route path="/orders" component={Orders} />
          <Route path="/orders/:id" component={OrderDetail} />
          <Route path="/settings" component={Settings} />
          <Route path="/quick-access" component={QuickAccess} />
          <Route path="/team" component={Team} />
          <Route path="/accept-invitation" component={AcceptInvitation} />
          <Route path="/social-ads-setup" component={SocialAdsSetup} />
          <Route path="/promote-product/:id" component={PromoteProduct} />
          <Route path="/create-meta-campaign/:id" component={CreateMetaCampaign} />
          <Route path="/create-ad-campaign" component={CreateAdCampaign} />
          <Route path="/order-management" component={OrderManagement} />
          <Route path="/newsletter" component={Newsletter} />
          <Route path="/seller/wholesale/products" component={WholesaleProducts} />
          <Route path="/seller/wholesale/create-product" component={CreateWholesaleProduct} />
          <Route path="/seller/wholesale/invitations" component={WholesaleInvitations} />
          <Route path="/wholesale/accept/:token" component={WholesaleAcceptInvitation} />
          <Route path="/wholesale/catalog" component={BuyerWholesaleCatalog} />
          <Route path="/wholesale/product/:id" component={WholesaleProductDetail} />
          <Route component={NotFound} />
        </Switch>
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
          <CurrencyProvider>
            <WalletProvider>
              <CartProvider>
                <AppContent />
                <Toaster />
              </CartProvider>
            </WalletProvider>
          </CurrencyProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
