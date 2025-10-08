import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Package, Truck, CreditCard, Shield, ShoppingBag, Store } from "lucide-react";
import heroImage from "@assets/generated_images/E-commerce_hero_lifestyle_image_eb2634ff.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"] });

  const features = [
    {
      icon: Package,
      title: "Multiple Selling Options",
      description: "Sell pre-order, made-to-order, in-stock, or wholesale products",
    },
    {
      icon: CreditCard,
      title: "Guest Checkout",
      description: "Customers can checkout quickly without creating an account",
    },
    {
      icon: Truck,
      title: "Order Management",
      description: "Track and manage all your orders from one dashboard",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Built with security and reliability in mind",
    },
  ];

  const productTypes = [
    { name: "In-Stock", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    { name: "Pre-Order", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    { name: "Made-to-Order", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
    { name: "Wholesale", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  ];

  const handleBuyerLogin = () => {
    sessionStorage.setItem("intended_role", "buyer");
    window.location.href = "/api/login";
  };

  const handleSellerLogin = () => {
    sessionStorage.setItem("intended_role", "seller");
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen">
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" data-testid="text-hero-title">
            Sell Any Way, Instantly
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Launch your online store in minutes. No code required.
          </p>
          
          {!user ? (
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                variant="default" 
                className="gap-2 min-w-[180px]" 
                onClick={handleBuyerLogin}
                data-testid="button-login-buyer"
              >
                <ShoppingBag className="h-5 w-5" />
                Login as Buyer
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2 min-w-[180px]"
                onClick={handleSellerLogin}
                data-testid="button-login-seller"
              >
                <Store className="h-5 w-5" />
                Login as Seller
              </Button>
            </div>
          ) : (
            <div className="flex gap-4 justify-center flex-wrap">
              {user.role === "buyer" || user.role === "customer" ? (
                <>
                  <Link href="/products">
                    <Button size="lg" variant="default" className="gap-2" data-testid="button-shop-now">
                      Shop Now
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/buyer-dashboard">
                    <Button
                      size="lg"
                      variant="outline"
                      className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
                      data-testid="button-buyer-dashboard"
                    >
                      My Orders
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/products">
                    <Button size="lg" variant="default" className="gap-2" data-testid="button-shop-now">
                      Shop Now
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/seller-dashboard">
                    <Button
                      size="lg"
                      variant="outline"
                      className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
                      data-testid="button-seller-dashboard"
                    >
                      Seller Dashboard
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Flexible Selling Options</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose how you want to sell your products
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {productTypes.map((type) => (
              <Card key={type.name} className="p-6 text-center hover-elevate transition-all">
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${type.color}`}>
                  {type.name}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Sell Smarter</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for creators, brands, and businesses of all sizes
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="p-6 hover-elevate transition-all">
                <feature.icon className="h-10 w-10 mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Selling?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Browse our products or start managing your store today
          </p>
          <Link href="/products">
            <Button size="lg" className="gap-2" data-testid="button-browse-products">
              Browse Products
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
