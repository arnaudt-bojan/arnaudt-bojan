import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Package, CreditCard, Store, Palette, Globe, Award, Users, TrendingUp, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { detectDomain } from "@/lib/domain-utils";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef } from "react";

const AnimatedSection = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

const FloatingBadge = ({ text, color, delay }: { text: string; color: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.5,
      delay,
      ease: [0.22, 1, 0.36, 1]
    }}
  >
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay * 0.5
      }}
    >
      <Badge variant="outline" className={`text-sm font-medium ${color} glass`}>
        {text}
      </Badge>
    </motion.div>
  </motion.div>
);

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const domainInfo = detectDomain();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  useEffect(() => {
    if (domainInfo.isSellerDomain) {
      const sellerParam = new URLSearchParams(window.location.search).get('seller');
      const targetUrl = sellerParam ? `/products?seller=${sellerParam}` : '/products';
      setLocation(targetUrl);
    }
  }, [domainInfo.isSellerDomain, setLocation]);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin" || user.role === "editor" || user.role === "viewer") {
        setLocation("/seller-dashboard");
      } else if (user.role === "buyer") {
        setLocation("/buyer-dashboard");
      }
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
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated Gradient Mesh Background */}
        <div className="absolute inset-0 gradient-mesh animate-gradient" />
        
        {/* Floating Geometric Shapes */}
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"
          animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl"
          animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <motion.div 
          className="relative z-10 container mx-auto px-4 text-center max-w-6xl"
          style={{ opacity: heroOpacity }}
        >
          <div className="space-y-8 mb-12">
            {/* Sparkles Icon */}
            <motion.div
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center"
            >
              <div className="p-4 rounded-full glass-strong">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
            </motion.div>

            {/* Hero Title */}
            <motion.h1 
              className="text-6xl md:text-8xl font-bold tracking-tight" 
              data-testid="text-hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Sell Any Way_<br />Instantly_
            </motion.h1>
            
            {/* Floating Product Type Badges */}
            <div className="flex gap-3 justify-center flex-wrap mb-8 py-4">
              {productTypes.map((type, index) => (
                <FloatingBadge
                  key={type.name}
                  text={type.name}
                  color={type.color}
                  delay={0.4 + index * 0.1}
                />
              ))}
            </div>

            {/* Hero Subtitle */}
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              No code. No plugins.<br />
              Whoever you are, whatever you sell - your store can be live in minutes.
            </motion.p>
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex gap-4 justify-center"
          >
            <Link href="/email-login">
              <Button 
                size="lg" 
                className="gap-2 text-lg transition-smooth shadow-lg hover:shadow-xl" 
                data-testid="button-get-started"
              >
                GET STARTED FOR FREE
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Launch Your Store Steps */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold mb-4">
                Launch Your Store <span className="italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">in three easy steps</span>
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: 1,
                title: "Customize",
                description: "Add your logo, imagery, and theme - fully branded and mobile-ready.",
                delay: 0.1
              },
              {
                step: 2,
                title: "List",
                description: "Choose your product type, set pricing, add shipping, and reward options.",
                delay: 0.2
              },
              {
                step: 3,
                title: "Share",
                description: "Post it anywhere. Customers checkout. Orders, payments, and shipping - all handled in one place.",
                delay: 0.3
              }
            ].map(({ step, title, description, delay }) => (
              <AnimatedSection key={step} delay={delay}>
                <div className="text-center space-y-4 hover-elevate transition-smooth">
                  <motion.div 
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-xl"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    {step}
                  </motion.div>
                  <h3 className="text-2xl font-bold">{title}</h3>
                  <p className="text-muted-foreground">{description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={0.4}>
            <div className="text-center mt-16">
              <p className="text-xl text-muted-foreground">
                If you can <span className="italic font-semibold text-primary">post</span> on social media, you can <span className="italic font-semibold text-primary">sell</span> on Upfirst.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-7xl">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold mb-4">
                Everything You Need to <span className="italic bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">Sell Smarter</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Upfirst gives you the tools to build your store, engage your audience, and manage your sales.
              </p>
            </div>
          </AnimatedSection>

          <div className="space-y-20">
            {keyFeatures.map((category, categoryIndex) => (
              <AnimatedSection key={category.category} delay={categoryIndex * 0.1}>
                <div>
                  <h3 className="text-3xl font-bold mb-8 text-center md:text-left">{category.category}</h3>
                  <div className="grid md:grid-cols-3 gap-8">
                    {category.features.map((feature, featureIndex) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: featureIndex * 0.1 }}
                      >
                        <motion.div
                          whileHover={{ y: -5 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card className="p-6 hover-elevate transition-smooth h-full glass">
                            <motion.div
                              whileHover={{ rotate: 5 }}
                              transition={{ duration: 0.3 }}
                            >
                              <feature.icon className="h-10 w-10 mb-4 text-primary" />
                            </motion.div>
                            <h4 className="font-semibold text-xl mb-3">{feature.title}</h4>
                            <p className="text-muted-foreground">{feature.description}</p>
                          </Card>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Sellers */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold mb-4">
                Built for Sellers <span className="italic">Of Every Kind</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                From solo creators to established brands, Upfirst lets you sell your way - whether launching your first product, offering made-to-order, managing wholesale or leaving marketplaces behind.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sellerTypes.map((type, index) => (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 hover-elevate transition-smooth h-full glass">
                    <h3 className="font-semibold text-lg mb-2">{type.title}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold mb-4">
                Pricing That <span className="italic">Works for You</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Subscribe to activate your store and get a 30-day free trial. Continue with full access for a low monthly or annual fee after trial.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <AnimatedSection delay={0.1}>
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 hover-elevate transition-smooth h-full glass">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">30 Day Free Trial</h3>
                    <p className="text-muted-foreground mb-4">Start when you subscribe to activate your store</p>
                    <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">FREE</div>
                  </div>
                  <ul className="space-y-3">
                    {["Full platform access", "No contracts. Cancel anytime", "1.5% transaction fee on sales"].map((item, i) => (
                      <motion.li 
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 border-2 border-primary hover-elevate transition-smooth h-full glass-strong relative overflow-hidden">
                  <motion.div
                    className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <div className="mb-6 relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Monthly or Annual Plan</h3>
                    <p className="text-muted-foreground mb-4">Continue with full access</p>
                    <div className="flex items-baseline gap-3">
                      <div className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">$9.99</div>
                      <span className="text-muted-foreground text-lg">/mo</span>
                      <span className="text-muted-foreground">OR</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">$99</span>
                      <span className="text-muted-foreground text-lg">/year</span>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Save 17.5%</Badge>
                    </div>
                  </div>
                  <ul className="space-y-3 relative z-10">
                    {["Unlimited listings and features", "Continue selling without pause", "1.5% transaction fee on sales"].map((item, i) => (
                      <motion.li 
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
        
        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bold mb-4">FAQs</h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AccordionItem value={`item-${index}`} className="border rounded-lg px-6 bg-card/50 backdrop-blur-sm hover-elevate transition-smooth">
                    <AccordionTrigger className="text-left font-semibold hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pt-2 pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </AnimatedSection>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh animate-gradient" />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        >
          <div className="w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        </motion.div>
        
        <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
          <AnimatedSection>
            <motion.h2 
              className="text-5xl md:text-7xl font-bold mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              Your Store.<br />
              Your Way.<br />
              <span className="italic bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">Ready in Minutes.</span>
            </motion.h2>
            <motion.p 
              className="text-xl text-muted-foreground mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              That idea you have? Run with it.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link href="/email-login">
                <Button 
                  size="lg" 
                  className="gap-2 text-lg transition-smooth shadow-2xl hover:shadow-3xl" 
                  data-testid="button-get-started-footer"
                >
                  Get Started For Free
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                </Button>
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
