import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
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
              <CardTitle className="text-3xl">Terms of Service</CardTitle>
              <CardDescription>Last updated: October 2025</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing and using Upfirst, you accept and agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, please do not use our platform.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">2. User Accounts</h2>
                <p className="text-muted-foreground mb-3">
                  To use certain features of our platform, you must create an account. You agree to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">3. Seller Responsibilities</h2>
                <p className="text-muted-foreground mb-3">
                  As a seller on Upfirst, you agree to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Accurately represent your products</li>
                  <li>Fulfill orders in a timely manner</li>
                  <li>Provide customer service to your buyers</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Pay applicable fees and commissions</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">4. Buyer Responsibilities</h2>
                <p className="text-muted-foreground mb-3">
                  As a buyer on Upfirst, you agree to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Provide accurate shipping and payment information</li>
                  <li>Pay for items you purchase</li>
                  <li>Review seller policies before purchasing</li>
                  <li>Communicate respectfully with sellers</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">5. Payments and Fees</h2>
                <p className="text-muted-foreground">
                  All payments are processed through Stripe. Sellers are responsible for payment 
                  processing fees. Buyers may be charged in the seller's currency, with exchange 
                  rates applied at the time of transaction.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">6. Prohibited Activities</h2>
                <p className="text-muted-foreground mb-3">
                  You may not:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Sell counterfeit or illegal items</li>
                  <li>Engage in fraudulent activities</li>
                  <li>Violate intellectual property rights</li>
                  <li>Harass or abuse other users</li>
                  <li>Attempt to circumvent platform fees</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">7. Dispute Resolution</h2>
                <p className="text-muted-foreground">
                  Buyers and sellers should attempt to resolve disputes directly. Upfirst may 
                  provide mediation services but is not responsible for resolving disputes 
                  between users.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  Upfirst is not responsible for the quality, safety, or legality of items 
                  listed, the accuracy of listings, or the ability of sellers to complete sales. 
                  We provide the platform only.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
                <p className="text-muted-foreground">
                  We reserve the right to suspend or terminate accounts that violate these terms 
                  or engage in harmful activities.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We may update these terms from time to time. Continued use of the platform 
                  constitutes acceptance of updated terms.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms of Service, contact us at{" "}
                  <a href="mailto:legal@upfirst.com" className="text-primary hover:underline" data-testid="link-legal-email">
                    legal@upfirst.com
                  </a>
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
