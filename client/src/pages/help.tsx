import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Help Center</CardTitle>
              <CardDescription>
                Find answers to common questions about using Upfirst
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger data-testid="accordion-ordering">How do I place an order?</AccordionTrigger>
                  <AccordionContent>
                    Browse products on a seller's storefront, add items to your cart, and proceed to checkout. 
                    You can checkout as a guest or create an account for faster future purchases.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger data-testid="accordion-payment">What payment methods are accepted?</AccordionTrigger>
                  <AccordionContent>
                    We accept all major credit and debit cards through our secure payment processor Stripe. 
                    Payment methods vary by seller and region.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger data-testid="accordion-shipping">How can I track my order?</AccordionTrigger>
                  <AccordionContent>
                    After placing an order, you'll receive an email with order details. Once shipped, 
                    you'll receive tracking information. You can also view order status in your buyer dashboard.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger data-testid="accordion-returns">What is the return policy?</AccordionTrigger>
                  <AccordionContent>
                    Return policies are set by individual sellers. Please check the seller's storefront 
                    footer or contact them directly for their specific return and refund policies.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger data-testid="accordion-seller">How do I become a seller?</AccordionTrigger>
                  <AccordionContent>
                    Sign up for an Upfirst account and complete the seller onboarding process. 
                    You'll need to set up your payment information and create your storefront.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger data-testid="accordion-currency">Why are prices shown in a different currency?</AccordionTrigger>
                  <AccordionContent>
                    Prices are displayed in your local currency for convenience, but you'll be charged 
                    in the seller's currency. Exchange rates are applied at checkout, and your bank may 
                    apply additional conversion fees.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-3">Still need help?</h3>
                <p className="text-muted-foreground mb-4">
                  If you can't find what you're looking for, please contact the seller directly 
                  through their storefront or reach out to Upfirst support.
                </p>
                <a 
                  href="mailto:support@upfirst.com"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                  data-testid="link-support"
                >
                  <Mail className="h-4 w-4" />
                  support@upfirst.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
