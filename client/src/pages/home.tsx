import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Package, CreditCard, Store, Palette, Globe, Award, Users, TrendingUp } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { detectDomain } from "@/lib/domain-utils";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const domainInfo = detectDomain();

  // Redirect to products page when viewing a seller storefront
  useEffect(() => {
    if (domainInfo.isSellerDomain) {
      // Preserve the seller query parameter when redirecting
      const sellerParam = new URLSearchParams(window.location.search).get('seller');
      const targetUrl = sellerParam ? `/products?seller=${sellerParam}` : '/products';
      setLocation(targetUrl);
    }
  }, [domainInfo.isSellerDomain, setLocation]);

  // Redirect logged-in sellers to dashboard
  useEffect(() => {
    if (!isLoading && user && (user.role === "admin" || user.role === "editor" || user.role === "viewer")) {
      setLocation("/seller-dashboard");
    }
  }, [user, isLoading, setLocation]);

  const productTypes = [
    { 
      name: "MADE-TO-ORDER", 
      description: "Create on demand",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" 
    },
    { 
      name: "PRE-ORDER", 
      description: "Sell before production",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" 
    },
    { 
      name: "IN-STOCK", 
      description: "Ready to ship",
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
    },
    { 
      name: "WHOLESALE", 
      description: "Bulk orders, B2B",
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" 
    },
  ];

  const keyFeatures = [
    {
      category: "Sell Any Way",
      features: [
        {
          icon: Package,
          title: "Sell Any Way",
          description: "Pre-order, made-to-order, in-stock or wholesale - choose how you sell, no plug-ins required."
        },
        {
          icon: CreditCard,
          title: "Two-Part Payments",
          description: "Let customers pay in two steps - perfect for pre-orders, made-to-order & wholesale"
        },
        {
          icon: ArrowRight,
          title: "One-Step Guest Checkout",
          description: "Customers pay now, add shipping later. Fewer steps - more sales."
        }
      ]
    },
    {
      category: "Design",
      features: [
        {
          icon: Palette,
          title: "Mobile-First Platform",
          description: "From setup to storefront to checkout - everything is designed for mobile."
        },
        {
          icon: Store,
          title: "Branded Storefront & Emails",
          description: "Your domain, your design. Branded emails and invoices sent automatically."
        },
        {
          icon: Globe,
          title: "Custom Domains",
          description: "Connect or register your domain directly from your dashboard - no external setup."
        }
      ]
    },
    {
      category: "Operations",
      features: [
        {
          icon: Award,
          title: "Built-in Rewards",
          description: "Offer store credit toward future orders to build loyalty and drive re-engagement."
        },
        {
          icon: Users,
          title: "Order Management System",
          description: "Manage products, track orders, add shipping, issue refunds - all from one dashboard."
        },
        {
          icon: TrendingUp,
          title: "Social Media Ads",
          description: "Run campaigns on Meta, TikTok, and X with AI optimization and budget management."
        }
      ]
    }
  ];

  const sellerTypes = [
    {
      title: "Creators & Influencers",
      description: "Sell limited drops, exclusive merch, or personal collections."
    },
    {
      title: "Small Businesses & Startups",
      description: "Launch your store in minutes - simple, fast and built to scale."
    },
    {
      title: "Retailers & B2B Sellers",
      description: "Take wholesale or bulk orders with custom pricing and direct payments."
    },
    {
      title: "Fashion & Product Designers",
      description: "Offer pre-order, made-to-order, or wholesale collections with two-part payments."
    },
    {
      title: "Marketplace Switchers",
      description: "Leave platform fees and restrictions behind. Own your brand, data, and customer relationships."
    },
    {
      title: "Hotels, Venues & Collaborators",
      description: "Sell branded merchandise, event exclusives, or collaborative drops"
    },
    {
      title: "Artists & Makers",
      description: "List one-off or handmade pieces - and get paid upfront."
    },
    {
      title: "Resellers & Individuals",
      description: "Sell your closet, archive, or one-off pieces - directly and on your terms."
    }
  ];

  const faqs = [
    {
      question: "Do I need to know how to code?",
      answer: "No - You can launch your store in minutes, no developer needed."
    },
    {
      question: "What if I already have a store?",
      answer: "You can link your Upfirst store to your website or social. Or use it for limited drops and one-off collections."
    },
    {
      question: "What do I need to get started?",
      answer: "Just a product or service to sell. No setup fees, no technical skills."
    },
    {
      question: "Do I own my customer data?",
      answer: "Yes - you retain full access to all customer emails, orders, and insights."
    },
    {
      question: "Do I need to handle shipping myself?",
      answer: "Yes - you manage and track orders in your dashboard, but fulfilment is handled by you (or your shipping partner)."
    },
    {
      question: "Can I sell without stock?",
      answer: "Yes - you can pre-sell or offer made-to-order and collect payment before production."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        
        <div className="relative z-10 container mx-auto px-4 text-center max-w-6xl">
          <div className="space-y-6 mb-12">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight" data-testid="text-hero-title">
              Sell Any Way_<br />Instantly_
            </h1>
            
            <div className="flex gap-4 justify-center flex-wrap mb-8">
              {productTypes.map((type) => (
                <Badge key={type.name} variant="outline" className={`px-4 py-2 text-sm font-medium ${type.color}`}>
                  {type.name}
                </Badge>
              ))}
            </div>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              No code. No plugins.<br />
              Whoever you are, whatever you sell - your store can be live in minutes.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Link href="/email-login">
              <Button size="lg" className="gap-2 text-lg px-8 py-6" data-testid="button-get-started">
                GET STARTED FOR FREE
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Launch Your Store Steps */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Launch Your Store <span className="italic">in three easy steps</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold">Customize</h3>
              <p className="text-muted-foreground">
                Add your logo, imagery, and theme - fully branded and mobile-ready.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold">List</h3>
              <p className="text-muted-foreground">
                Choose your product type, set pricing, add shipping, and reward options.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold">Share</h3>
              <p className="text-muted-foreground">
                Post it anywhere. Customers checkout. Orders, payments, and shipping - all handled in one place.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <p className="text-xl text-muted-foreground">
              If you can <span className="italic font-semibold">post</span> on social media, you can <span className="italic font-semibold">sell</span> on Upfirst.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="italic">Sell Smarter</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Upfirst gives you the tools to build your store, engage your audience, and manage your sales.
            </p>
          </div>

          <div className="space-y-16">
            {keyFeatures.map((category) => (
              <div key={category.category}>
                <h3 className="text-2xl font-bold mb-8">{category.category}</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  {category.features.map((feature) => (
                    <Card key={feature.title} className="p-6 hover-elevate transition-all">
                      <feature.icon className="h-10 w-10 mb-4 text-primary" />
                      <h4 className="font-semibold text-xl mb-3">{feature.title}</h4>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Sellers */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for Sellers <span className="italic">Of Every Kind</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From solo creators to established brands, Upfirst lets you sell your way - whether launching your first product, offering made-to-order, managing wholesale or leaving marketplaces behind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sellerTypes.map((type) => (
              <Card key={type.title} className="p-6 hover-elevate transition-all">
                <h3 className="font-semibold text-lg mb-2">{type.title}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Pricing That <span className="italic">Works for You</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Your 30-day free trial begins when you list your first product. After that, continue with full access for a low monthly or annual fee.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">30 Day Free Trial</h3>
                <p className="text-muted-foreground mb-4">Start when you list your first product</p>
                <div className="text-4xl font-bold">FREE</div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Full platform access</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>No contracts. Cancel anytime</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>1.5% transaction fee on sales</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 border-2 border-primary">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Monthly or Annual Plan</h3>
                <p className="text-muted-foreground mb-4">Continue with full access</p>
                <div className="flex items-baseline gap-3">
                  <div className="text-4xl font-bold">$9.99/Month</div>
                  <span className="text-muted-foreground">OR</span>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$99/Year</span>
                  <Badge variant="outline" className="ml-3 bg-primary/10 text-primary border-primary/20">Save 17.5%</Badge>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Unlimited listings and features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Continue selling without pause</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>1.5% transaction fee on sales</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">FAQs</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Your Store.<br />
            Your Way.<br />
            <span className="italic">Ready in Minutes.</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            That idea you have? Run with it.
          </p>
          <Link href="/email-login">
            <Button size="lg" className="gap-2 text-lg px-8 py-6" data-testid="button-get-started-footer">
              Get Started For Free
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
