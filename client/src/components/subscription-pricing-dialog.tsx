import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface SubscriptionPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionPricingDialog({ open, onOpenChange }: SubscriptionPricingDialogProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");

  const createSubscriptionMutation = useMutation({
    mutationFn: async (plan: "monthly" | "annual") => {
      const response = await apiRequest("POST", "/api/subscription/create", { plan });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create subscription");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Error",
          description: "Failed to create checkout session. Please contact support.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = () => {
    createSubscriptionMutation.mutate(selectedPlan);
  };

  const features = [
    "Unlimited product listings",
    "Multi-currency support with auto-conversion",
    "Stripe Connect payments with 1.5% platform fee",
    "Wholesale B2B functionality",
    "Advanced social media advertising tools",
    "Email notifications and customer communication",
    "Custom domain support",
    "Mobile-optimized storefront",
    "Real-time analytics dashboard",
    "NFT minting for customer rewards",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-subscription-pricing">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Activate Your Store with Uppfirst Pro
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose a plan to activate your store and start selling to customers worldwide
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${
                selectedPlan === "monthly" 
                  ? "ring-2 ring-primary shadow-lg" 
                  : "hover-elevate"
              }`}
              onClick={() => setSelectedPlan("monthly")}
              data-testid="card-plan-monthly"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Monthly</CardTitle>
                  {selectedPlan === "monthly" && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <CardDescription>Pay month-to-month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">$9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Cancel anytime, no commitment
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${
                selectedPlan === "annual" 
                  ? "ring-2 ring-primary shadow-lg" 
                  : "hover-elevate"
              }`}
              onClick={() => setSelectedPlan("annual")}
              data-testid="card-plan-annual"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Annual
                    <Badge variant="default" className="bg-green-500">
                      <Zap className="h-3 w-3 mr-1" />
                      Save 17%
                    </Badge>
                  </CardTitle>
                  {selectedPlan === "annual" && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <CardDescription>Best value - pay yearly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                  Save $20.88 compared to monthly
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trial Information */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">30-Day Free Trial</h4>
                  <p className="text-sm text-muted-foreground">
                    Start your free trial today. Your card won't be charged until the trial period ends. Cancel anytime during the trial with no charges.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features List */}
          <div>
            <h4 className="font-semibold mb-3">Everything included:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2" data-testid={`feature-${index}`}>
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2">Platform Fee</h4>
              <p className="text-sm text-muted-foreground">
                We charge a minimal <span className="font-medium text-foreground">1.5% platform fee</span> on all transactions, in addition to standard Stripe processing fees. This keeps our subscription prices low while ensuring sustainable platform operations.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubscribe}
            disabled={createSubscriptionMutation.isPending}
            className="flex-1"
            data-testid="button-start-trial"
          >
            {createSubscriptionMutation.isPending ? (
              "Processing..."
            ) : (
              `Start Free Trial - ${selectedPlan === "monthly" ? "$9.99/mo" : "$99/year"}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
