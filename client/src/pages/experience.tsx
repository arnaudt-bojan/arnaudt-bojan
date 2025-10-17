import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/use-seo";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Menu,
  X,
  ShoppingBag,
  Users,
  Globe2,
  ArrowRight,
  Check,
  Zap,
  Shield,
  TrendingUp,
  Palette,
  Package,
  CreditCard,
  BarChart3,
  Mail,
  Megaphone,
  FileText,
  DollarSign,
  Clock,
  Lock,
  Star,
  ChevronDown,
} from "lucide-react";

export default function ExperiencePage() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  // Intersection observers for scroll animations
  const heroSection = useIntersectionObserver({ threshold: 0.2 });
  const retailSection = useIntersectionObserver({ threshold: 0.2 });
  const wholesaleSection = useIntersectionObserver({ threshold: 0.2 });
  const tradeSection = useIntersectionObserver({ threshold: 0.2 });
  const pricingSection = useIntersectionObserver({ threshold: 0.2 });
  const faqSection = useIntersectionObserver({ threshold: 0.2 });

  // SEO Optimization with Structured Data
  useSEO({
    title: "Upfirst - Complete E-Commerce Platform | Retail, Wholesale & Trade",
    description: "The only e-commerce platform with Retail B2C, B2B Wholesale, and Trade quotations in one ecosystem. Launch your store, scale with wholesale buyers, and expand globally with professional trade tools. AI-powered marketing, MOQ management, and international trade compliance built-in.",
    keywords: "e-commerce platform, multi-channel commerce, B2B wholesale software, trade quotation system, retail storefront, D2C platform, wholesale management, international trade, Incoterms, MOQ, Net payment terms, Meta Ads, AI marketing, Shopify alternative, B2B marketplace",
    ogTitle: "Upfirst - The Complete Commerce Platform for Modern Brands",
    ogDescription: "Three platforms in one: Retail B2C with AI marketing, B2B Wholesale like Joor, and professional Trade quotations. Start your free trial today.",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "name": "Upfirst",
          "url": "https://upfirst.io",
          "description": "Complete e-commerce platform for modern brands",
          "sameAs": [
            "https://twitter.com/upfirst",
            "https://linkedin.com/company/upfirst"
          ]
        },
        {
          "@type": "SoftwareApplication",
          "name": "Upfirst Commerce Platform",
          "applicationCategory": "BusinessApplication",
          "offers": {
            "@type": "Offer",
            "price": "49",
            "priceCurrency": "USD",
            "priceValidUntil": "2025-12-31"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "250"
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Do I get access to all three platforms?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes! Professional and Enterprise plans include access to all three platforms: Retail B2C, B2B Wholesale, and Trade Quotations. You can use them independently or together as your business grows."
              }
            },
            {
              "@type": "Question",
              "name": "Is there a free trial?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Absolutely! We offer a 30-day free trial on all plans. No credit card required to start. You can explore all features and see if Upfirst is right for your business."
              }
            },
            {
              "@type": "Question",
              "name": "How do payments work?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "We use Stripe Connect for secure, multi-seller payment processing. You get paid directly to your bank account, and we handle all PCI compliance. Stripe fees are separate from Upfirst subscription costs."
              }
            },
            {
              "@type": "Question",
              "name": "How long does setup take?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Most sellers are up and running within 24 hours. The Retail B2C platform can be launched in minutes. B2B Wholesale and Trade platforms may take a bit longer depending on your catalog size and requirements."
              }
            }
          ]
        }
      ]
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["overview", "retail", "wholesale", "trade", "pricing", "faq"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsMobileMenuOpen(false);
    }
  };

  const navigationItems = [
    { id: "overview", label: "Overview", icon: Star },
    { id: "retail", label: "Retail", icon: ShoppingBag },
    { id: "wholesale", label: "Wholesale", icon: Users },
    { id: "trade", label: "Trade", icon: Globe2 },
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "faq", label: "FAQ", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl" data-testid="link-home">
              <Zap className="h-6 w-6" />
              Upfirst
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollToSection(item.id)}
                  className={activeSection === item.id ? "bg-accent" : ""}
                  data-testid={`button-nav-${item.id}`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/email-login" className="inline-flex items-center justify-center min-h-8 px-4 py-2 text-sm font-medium rounded-lg hover-elevate active-elevate-2" data-testid="button-sign-in">
              Sign In
            </Link>
            <Link href="/email-login" className="inline-flex items-center justify-center min-h-8 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover-elevate active-elevate-2" data-testid="button-get-started">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="container py-4 space-y-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => scrollToSection(item.id)}
                  data-testid={`button-mobile-nav-${item.id}`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
              <div className="pt-4 space-y-2">
                <Link href="/email-login" className="inline-flex items-center justify-center w-full min-h-10 px-6 py-3 text-sm font-medium rounded-lg border border-input bg-background hover-elevate active-elevate-2" data-testid="button-mobile-sign-in">
                  Sign In
                </Link>
                <Link href="/email-login" className="inline-flex items-center justify-center w-full min-h-10 px-6 py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover-elevate active-elevate-2" data-testid="button-mobile-get-started">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section 
        id="overview" 
        ref={heroSection.ref}
        className={`py-20 md:py-32 bg-gradient-to-b from-background to-accent/5 transition-all duration-1000 ${
          heroSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="mx-auto" data-testid="badge-platform">
              Three Platforms. One Ecosystem.
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight" data-testid="heading-hero">
              The Complete Commerce Platform for Modern Brands
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-hero-subtitle">
              Launch your retail store, scale with B2B wholesale, and expand globally with professional trade quotations—all from one powerful platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/email-login" className="inline-flex items-center justify-center min-h-10 px-6 py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover-elevate active-elevate-2 min-w-[200px]" data-testid="button-start-free-trial">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px]"
                onClick={() => scrollToSection("retail")}
                data-testid="button-explore-platforms"
              >
                Explore Platforms
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Platform Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-6xl mx-auto">
            <Card className="hover-elevate cursor-pointer" onClick={() => scrollToSection("retail")} data-testid="card-platform-retail">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Retail B2C</h3>
                <p className="text-muted-foreground">
                  Launch your direct-to-consumer brand with pre-orders, made-to-order, and in-stock products.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Multiple product types
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Newsletter campaigns
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    AI-powered Meta Ads
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => scrollToSection("wholesale")} data-testid="card-platform-wholesale">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold">B2B Wholesale</h3>
                <p className="text-muted-foreground">
                  Professional wholesale platform with MOQ, deposits, and Net payment terms—just like Joor.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Variant-level MOQ
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Deposit & Net 30/60/90
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Invitation-based buyers
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer" onClick={() => scrollToSection("trade")} data-testid="card-platform-trade">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Globe2 className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold">Trade Quotations</h3>
                <p className="text-muted-foreground">
                  Professional B2B quotation system with 8 Incoterms and secure international trade.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    8 standard Incoterms
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Token-based access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Deposit/balance payments
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Retail B2C Section */}
      <section 
        id="retail" 
        ref={retailSection.ref}
        className={`py-20 bg-background transition-all duration-1000 ${
          retailSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <Badge variant="outline" data-testid="badge-retail">
                <ShoppingBag className="h-3 w-3 mr-1" />
                Retail B2C Platform
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold" data-testid="heading-retail">
                Launch & Scale Your D2C Brand
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-retail-subtitle">
                Everything you need to sell directly to consumers—from product launches to AI-powered marketing.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card data-testid="card-feature-product-types">
                <CardContent className="p-6 space-y-3">
                  <Package className="h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">Flexible Product Types</h3>
                  <p className="text-sm text-muted-foreground">
                    Launch with pre-orders, manage made-to-order production, or sell in-stock inventory—all in one platform.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-newsletter">
                <CardContent className="p-6 space-y-3">
                  <Mail className="h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">Newsletter Campaigns</h3>
                  <p className="text-sm text-muted-foreground">
                    Build your audience with powerful email campaigns, segmentation, and automated delivery.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-meta-ads">
                <CardContent className="p-6 space-y-3">
                  <Megaphone className="h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">AI-Powered Meta Ads</h3>
                  <p className="text-sm text-muted-foreground">
                    Launch Facebook & Instagram ads with AI-generated copy, Advantage+ optimization, and real-time analytics.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-storefront">
                <CardContent className="p-6 space-y-3">
                  <Palette className="h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">Custom Storefronts</h3>
                  <p className="text-sm text-muted-foreground">
                    Get your own subdomain (yourname.upfirst.io) with customizable branding and design.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-checkout">
                <CardContent className="p-6 space-y-3">
                  <CreditCard className="h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">Seamless Checkout</h3>
                  <p className="text-sm text-muted-foreground">
                    Guest checkout, Stripe payments, multi-currency support, and real-time shipping calculation.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-analytics">
                <CardContent className="p-6 space-y-3">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">Analytics & Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Track sales, monitor ad performance, and understand your customers with real-time dashboards.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Wholesale Section */}
      <section 
        id="wholesale" 
        ref={wholesaleSection.ref}
        className={`py-20 bg-accent/5 transition-all duration-1000 ${
          wholesaleSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <Badge variant="outline" data-testid="badge-wholesale">
                <Users className="h-3 w-3 mr-1" />
                B2B Wholesale Platform
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold" data-testid="heading-wholesale">
                Professional Wholesale OS
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-wholesale-subtitle">
                Industry-leading B2B wholesale platform with features from Joor and Zedonk—built for modern brands.
              </p>
            </div>

            {/* Feature List */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Variant-Level MOQ</h3>
                    <p className="text-sm text-muted-foreground">
                      Set minimum order quantities per size, color, or any variant—just like the pros.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Deposit System (0-100%)</h3>
                    <p className="text-sm text-muted-foreground">
                      Configurable deposit percentage with automatic balance payment tracking.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Net Payment Terms</h3>
                    <p className="text-sm text-muted-foreground">
                      Offer Net 30, Net 60, or Net 90 payment terms to trusted buyers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Invitation-Based Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Control who sees your wholesale catalog with email invitations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">3-Level Categories</h3>
                    <p className="text-sm text-muted-foreground">
                      Organize products with professional category hierarchy and auto-generated SKUs.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Delivery Date System</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose days after order or fixed delivery dates with automatic reminders.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Multi-Image Galleries</h3>
                    <p className="text-sm text-muted-foreground">
                      Showcase products with professional photo galleries and zoom.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">T&C Document Uploads</h3>
                    <p className="text-sm text-muted-foreground">
                      Attach product-specific terms and conditions for transparency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trade Quotation Section */}
      <section 
        id="trade" 
        ref={tradeSection.ref}
        className={`py-20 bg-background transition-all duration-1000 ${
          tradeSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <Badge variant="outline" data-testid="badge-trade">
                <Globe2 className="h-3 w-3 mr-1" />
                Trade Quotation Platform
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold" data-testid="heading-trade">
                Global Trade Cockpit
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-trade-subtitle">
                Professional quotation system following international trade standards—built for B2B excellence.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card data-testid="card-trade-incoterms">
                <CardContent className="p-6 space-y-3">
                  <Globe2 className="h-8 w-8 text-green-500" />
                  <h3 className="text-lg font-semibold">8 Standard Incoterms</h3>
                  <p className="text-sm text-muted-foreground">
                    FOB, CIF, DDP, EXW, DAP, FCA, CPT, CIP—all major international shipping terms.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-trade-invoice">
                <CardContent className="p-6 space-y-3">
                  <FileText className="h-8 w-8 text-green-500" />
                  <h3 className="text-lg font-semibold">Professional Invoicing</h3>
                  <p className="text-sm text-muted-foreground">
                    Excel-like quotation builder with tax & shipping at bottom—not per line item.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-trade-security">
                <CardContent className="p-6 space-y-3">
                  <Lock className="h-8 w-8 text-green-500" />
                  <h3 className="text-lg font-semibold">Secure Token Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Share quotations via secure tokens—no buyer account needed.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-trade-payments">
                <CardContent className="p-6 space-y-3">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <h3 className="text-lg font-semibold">Deposit/Balance Flow</h3>
                  <p className="text-sm text-muted-foreground">
                    Split payments with configurable deposits and balance tracking.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-trade-documents">
                <CardContent className="p-6 space-y-3">
                  <FileText className="h-8 w-8 text-green-500" />
                  <h3 className="text-lg font-semibold">Document Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload data sheets (specs) and T&C documents with secure storage.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-trade-tracking">
                <CardContent className="p-6 space-y-3">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <h3 className="text-lg font-semibold">Status Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Track quotations from draft to accepted with full lifecycle management.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Overview */}
      <section 
        id="pricing" 
        ref={pricingSection.ref}
        className={`py-20 bg-accent/5 transition-all duration-1000 ${
          pricingSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <Badge variant="outline" data-testid="badge-pricing">
                <DollarSign className="h-3 w-3 mr-1" />
                Simple, Transparent Pricing
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold" data-testid="heading-pricing">
                All Platforms. One Subscription.
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-pricing-subtitle">
                Access all three platforms with flexible pricing that grows with your business.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card data-testid="card-pricing-starter">
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Starter</h3>
                    <p className="text-muted-foreground text-sm">Perfect for new brands</p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold">$49</div>
                    <div className="text-muted-foreground text-sm">per month</div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Retail B2C storefront
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Newsletter campaigns
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Basic analytics
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      30-day free trial
                    </li>
                  </ul>
                  <Link href="/email-login" className="inline-flex items-center justify-center w-full min-h-10 px-6 py-3 text-sm font-medium rounded-lg border border-input bg-background hover-elevate active-elevate-2" data-testid="button-pricing-starter">
                    Get Started
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-primary" data-testid="card-pricing-professional">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Professional</h3>
                      <p className="text-muted-foreground text-sm">For growing businesses</p>
                    </div>
                    <Badge>Popular</Badge>
                  </div>
                  <div>
                    <div className="text-4xl font-bold">$149</div>
                    <div className="text-muted-foreground text-sm">per month</div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      All Starter features
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      B2B Wholesale platform
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Trade quotation system
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Meta Ads integration
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Advanced analytics
                    </li>
                  </ul>
                  <Link href="/email-login" className="inline-flex items-center justify-center w-full min-h-10 px-6 py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover-elevate active-elevate-2" data-testid="button-pricing-professional">
                    Get Started
                  </Link>
                </CardContent>
              </Card>

              <Card data-testid="card-pricing-enterprise">
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                    <p className="text-muted-foreground text-sm">Custom solutions</p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold">Custom</div>
                    <div className="text-muted-foreground text-sm">contact us</div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      All Professional features
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Dedicated support
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Custom integrations
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      White-label options
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline" data-testid="button-pricing-enterprise">
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section 
        id="faq" 
        ref={faqSection.ref}
        className={`py-20 bg-background transition-all duration-1000 ${
          faqSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <Badge variant="outline" data-testid="badge-faq">
                <FileText className="h-3 w-3 mr-1" />
                Frequently Asked Questions
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold" data-testid="heading-faq">
                Got Questions?
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full" data-testid="accordion-faq">
              <AccordionItem value="item-1">
                <AccordionTrigger data-testid="faq-trigger-platforms">
                  Do I get access to all three platforms?
                </AccordionTrigger>
                <AccordionContent data-testid="faq-content-platforms">
                  Yes! Professional and Enterprise plans include access to all three platforms: Retail B2C, B2B Wholesale, and Trade Quotations. You can use them independently or together as your business grows.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger data-testid="faq-trigger-trial">
                  Is there a free trial?
                </AccordionTrigger>
                <AccordionContent data-testid="faq-content-trial">
                  Absolutely! We offer a 30-day free trial on all plans. No credit card required to start. You can explore all features and see if Upfirst is right for your business.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger data-testid="faq-trigger-stripe">
                  How do payments work?
                </AccordionTrigger>
                <AccordionContent data-testid="faq-content-stripe">
                  We use Stripe Connect for secure, multi-seller payment processing. You get paid directly to your bank account, and we handle all PCI compliance. Stripe fees are separate from Upfirst subscription costs.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger data-testid="faq-trigger-setup">
                  How long does setup take?
                </AccordionTrigger>
                <AccordionContent data-testid="faq-content-setup">
                  Most sellers are up and running within 24 hours. The Retail B2C platform can be launched in minutes. B2B Wholesale and Trade platforms may take a bit longer depending on your catalog size and requirements.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger data-testid="faq-trigger-migration">
                  Can I migrate from Shopify or other platforms?
                </AccordionTrigger>
                <AccordionContent data-testid="faq-content-migration">
                  Yes! We support CSV import for bulk product uploads. You can export your products from Shopify, WooCommerce, or any platform and import them into Upfirst. Our AI-powered field mapping makes the process seamless.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger data-testid="faq-trigger-support">
                  What kind of support do you offer?
                </AccordionTrigger>
                <AccordionContent data-testid="faq-content-support">
                  Professional plans include email support with 24-hour response time. Enterprise plans get dedicated support with priority response. We also have comprehensive documentation and video tutorials.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-b from-accent/5 to-background">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold" data-testid="heading-final-cta">
              Ready to Transform Your Commerce?
            </h2>
            <p className="text-xl text-muted-foreground" data-testid="text-final-cta">
              Join thousands of brands selling with Upfirst. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/email-login" className="inline-flex items-center justify-center min-h-10 px-6 py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover-elevate active-elevate-2 min-w-[200px]" data-testid="button-final-start">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Button size="lg" variant="outline" className="min-w-[200px]" data-testid="button-final-contact">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-xl">
                <Zap className="h-6 w-6" />
                Upfirst
              </div>
              <p className="text-sm text-muted-foreground">
                The complete commerce platform for modern brands.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToSection("retail")} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-retail">
                    Retail B2C
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("wholesale")} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-wholesale">
                    B2B Wholesale
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("trade")} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-trade">
                    Trade Quotations
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/help">
                    <a className="text-muted-foreground hover:text-foreground" data-testid="link-footer-help">
                      Help Center
                    </a>
                  </Link>
                </li>
                <li>
                  <button onClick={() => scrollToSection("faq")} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-faq">
                    FAQ
                  </button>
                </li>
                <li>
                  <Link href="/terms">
                    <a className="text-muted-foreground hover:text-foreground" data-testid="link-footer-terms">
                      Terms of Service
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/privacy">
                    <a className="text-muted-foreground hover:text-foreground" data-testid="link-footer-privacy">
                      Privacy Policy
                    </a>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/">
                    <a className="text-muted-foreground hover:text-foreground" data-testid="link-footer-home">
                      About
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/email-login">
                    <a className="text-muted-foreground hover:text-foreground" data-testid="link-footer-contact">
                      Contact
                    </a>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2024 Upfirst. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
