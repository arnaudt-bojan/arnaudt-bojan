import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/lib/cart-context";
import { Header } from "@/components/header";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/lib/cart-context";
import Home from "@/pages/home";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Checkout from "@/pages/checkout";
import SellerDashboard from "@/pages/seller-dashboard";
import SellerProducts from "@/pages/seller-products";
import CreateProduct from "@/pages/create-product";
import EditProduct from "@/pages/edit-product";
import Orders from "@/pages/orders";
import QuickAccess from "@/pages/quick-access";
import Team from "@/pages/team";
import AcceptInvitation from "@/pages/accept-invitation";
import NotFound from "@/pages/not-found";

function AppContent() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { itemsCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col">
      <Header cartItemsCount={itemsCount} onCartClick={() => setIsCartOpen(true)} />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductDetail} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/seller-dashboard" component={SellerDashboard} />
          <Route path="/seller/dashboard" component={SellerDashboard} />
          <Route path="/seller/products" component={SellerProducts} />
          <Route path="/seller/create-product" component={CreateProduct} />
          <Route path="/seller/products/:id/edit" component={EditProduct} />
          <Route path="/orders" component={Orders} />
          <Route path="/quick-access" component={QuickAccess} />
          <Route path="/team" component={Team} />
          <Route path="/accept-invitation" component={AcceptInvitation} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <CartSheet open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <CartProvider>
            <AppContent />
            <Toaster />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
