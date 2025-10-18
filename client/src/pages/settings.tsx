import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Settings as SettingsIcon, CreditCard, Image, Globe, Copy, CheckCircle, Tag, Plus, Edit, Trash2, DollarSign, Clock, Package, MapPin, Wallet, Receipt, X, Users, Shield, Mail, UserPlus, Rocket, FileText, Loader2 } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { getStoreUrl } from "@/lib/store-url";
import { ShippingMatrixManager } from "@/components/shipping-matrix-manager";
import { WarehouseAddressesManager } from "@/components/warehouse-addresses-manager";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { StripeOnboardingModal } from "@/components/stripe-onboarding-modal";
import { StripeCountrySelector } from "@/components/stripe-country-selector";
import { UniversalImageUpload } from "@/components/universal-image-upload";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { SubscriptionPricingDialog } from "@/components/subscription-pricing-dialog";
import { SavedPaymentMethodsManager } from "@/components/saved-payment-methods-manager";
import { CountrySelect } from "@/components/CountrySelect";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { getCountryName, getCountryCode } from "../../../shared/countries";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const profileSchema = z.object({
  contactEmail: z.string().email().optional().or(z.literal("")),
});

const brandingSchema = z.object({
  storeBanner: z.string()
    .refine(
      (val) => val === "" || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"),
      "Must be a valid URL or path"
    ),
  storeLogo: z.string()
    .refine(
      (val) => val === "" || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"),
      "Must be a valid URL or path"
    ),
  shippingPolicy: z.string().optional(),
  returnsPolicy: z.string().optional(),
});

const aboutContactSchema = z.object({
  aboutStory: z.string().max(1000, "Story must be 1000 characters or less").optional().or(z.literal("")),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  socialInstagram: z.string().optional().or(z.literal("")),
  socialTwitter: z.string().optional().or(z.literal("")),
  socialTiktok: z.string().optional().or(z.literal("")),
  socialSnapchat: z.string().optional().or(z.literal("")),
  socialWebsite: z.string().optional().or(z.literal("")).refine((val) => {
    // Empty string is valid
    if (!val) return true;
    // If it already has protocol, validate as URL
    if (val.startsWith('http://') || val.startsWith('https://')) {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }
    // If it's a bare domain, prepend https:// and validate
    try {
      new URL(`https://${val}`);
      return true;
    } catch {
      return false;
    }
  }, { message: "Invalid URL or domain" }),
});

const usernameSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

const quickSetupSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  storeLogo: z.string()
    .refine(
      (val) => val === "" || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"),
      "Must be a valid URL or path"
    ),
  storeBanner: z.string()
    .refine(
      (val) => val === "" || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/"),
      "Must be a valid URL or path"
    ),
});

const customDomainSchema = z.object({
  customDomain: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, "Invalid domain format")
    .or(z.literal("")),
});

const shippingSchema = z.object({
  shippingPrice: z.string().min(0, "Shipping price must be 0 or greater"),
});

const warehouseSchema = z.object({
  warehouseAddressLine1: z.string().min(1, "Street address is required"),
  warehouseAddressLine2: z.string().optional().or(z.literal("")),
  warehouseAddressCity: z.string().min(1, "City is required"),
  warehouseAddressState: z.string().min(1, "State/Province is required"),
  warehouseAddressPostalCode: z.string().min(1, "Postal code is required"),
  warehouseAddressCountryCode: z.string().length(2, "Country code is required"),
  warehouseAddressCountryName: z.string().min(1, "Country name is required"),
});

type ProfileForm = z.infer<typeof profileSchema>;
type BrandingForm = z.infer<typeof brandingSchema>;
type AboutContactForm = z.infer<typeof aboutContactSchema>;
type UsernameForm = z.infer<typeof usernameSchema>;
type QuickSetupForm = z.infer<typeof quickSetupSchema>;
type CustomDomainForm = z.infer<typeof customDomainSchema>;
type ShippingForm = z.infer<typeof shippingSchema>;

// Payment Setup Form Component
function PaymentSetupForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Payment method added successfully!",
        });
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add payment method",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full" data-testid="button-save-payment">
        {isProcessing ? "Processing..." : "Save Payment Method"}
      </Button>
    </form>
  );
}

// Subscription Management Tab
function SubscriptionTab({ user }: { user: any }) {
  const { toast } = useToast();
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const { data: subscriptionStatus, isLoading: isLoadingSubscription, refetch: refetchSubscription } = useQuery<{
    status: string | null;
    plan: string | null;
    trialEndsAt: string | null;
    hasPaymentMethod: boolean;
    subscription: any | null;
    paymentMethod: any | null;
    nextBillingDate: string | null;
    cancelAtPeriodEnd: boolean;
    billingHistory: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      date: string;
      invoiceUrl: string;
      invoicePdf: string;
      number: string;
    }>;
    upcomingInvoice: {
      amount: number;
      currency: string;
      date: string;
    } | null;
  }>({
    queryKey: ["/api/subscription/status"],
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/subscription/cancel", {});
    },
    onSuccess: () => {
      refetchSubscription();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled. You'll have access until the end of your billing period.",
      });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/subscription/reactivate", {});
    },
    onSuccess: () => {
      refetchSubscription();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription has been reactivated and will continue as normal.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
    },
  });

  const daysRemaining = subscriptionStatus?.trialEndsAt 
    ? Math.ceil((new Date(subscriptionStatus.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionStatus?.status === "trial" && !subscriptionStatus.cancelAtPeriodEnd && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Free Trial Active</h3>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  {daysRemaining !== null && daysRemaining > 0
                    ? `${daysRemaining} days remaining in your trial`
                    : "Your trial has ended"}
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your {subscriptionStatus.plan === "monthly" ? "Monthly" : "Annual"} plan will start after trial ends
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowCancelDialog(true)}
                      variant="outline"
                      size="sm"
                      data-testid="button-cancel-subscription-trial"
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {subscriptionStatus?.status === "active" && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">Active Subscription</h3>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your {subscriptionStatus.plan === "monthly" ? "Monthly" : "Annual"} plan is active
                </p>
              </div>
            )}

            {subscriptionStatus?.cancelAtPeriodEnd && (
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                    {subscriptionStatus.status === "trial" ? "Trial Ending - No Charges" : "Subscription Ending"}
                  </h3>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                  {subscriptionStatus.status === "trial" 
                    ? `Your trial will end on ${subscriptionStatus.nextBillingDate ? formatDate(subscriptionStatus.nextBillingDate) : "the trial end date"}. You will not be charged.`
                    : `Your subscription will end on ${subscriptionStatus.nextBillingDate ? formatDate(subscriptionStatus.nextBillingDate) : "the billing date"}.`
                  }
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Your store will become inactive after {subscriptionStatus.status === "trial" ? "trial" : "subscription"} ends.
                </p>
              </div>
            )}

            {isLoadingSubscription && (
              <div className="bg-muted border rounded-lg p-4 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading subscription status...</p>
                </div>
              </div>
            )}

            {!isLoadingSubscription && !subscriptionStatus?.status && (
              <div className="bg-muted border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Subscribe to activate your store and start selling.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowSubscriptionDialog(true)}
                    data-testid="button-subscribe"
                  >
                    Subscribe Now
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      try {
                        const result = await apiRequest("POST", "/api/subscription/fix", {});
                        if (result.success) {
                          refetchSubscription();
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          toast({
                            title: "Subscription Synced!",
                            description: "Your subscription status has been updated successfully.",
                          });
                        } else {
                          toast({
                            title: "No Subscription Found",
                            description: result.message || "Please complete the subscription checkout first.",
                            variant: "destructive",
                          });
                        }
                      } catch (error: any) {
                        toast({
                          title: "Sync Failed",
                          description: error.message || "Failed to sync subscription",
                          variant: "destructive",
                        });
                      }
                    }}
                    data-testid="button-fix-subscription"
                  >
                    Sync Subscription
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Details - Show for trial and active subscriptions */}
        {(subscriptionStatus?.status === "active" || subscriptionStatus?.status === "trial") && (
          <Card>
            <CardHeader>
              <CardTitle>Billing Details</CardTitle>
              <CardDescription>
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Current Plan</p>
                  <p className="text-lg font-semibold">
                    {subscriptionStatus.plan === "monthly" ? "Monthly ($9.99/mo)" : "Annual ($99/year)"}
                  </p>
                </div>
                {subscriptionStatus.nextBillingDate && !subscriptionStatus.cancelAtPeriodEnd && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {subscriptionStatus.status === "trial" ? "First Billing Date (Trial Ends)" : "Next Billing Date"}
                    </p>
                    <p className="text-lg font-semibold">
                      {formatDate(subscriptionStatus.nextBillingDate)}
                    </p>
                  </div>
                )}
              </div>

              {subscriptionStatus.upcomingInvoice && !subscriptionStatus.cancelAtPeriodEnd && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Next Payment</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(subscriptionStatus.upcomingInvoice.amount, subscriptionStatus.upcomingInvoice.currency)}
                  </p>
                </div>
              )}

              {subscriptionStatus.paymentMethod && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Switch to Saved Cards tab
                        const addressesTab = document.querySelector('[value="addresses-payments"]');
                        if (addressesTab instanceof HTMLElement) {
                          addressesTab.click();
                        }
                      }}
                      data-testid="button-update-payment-method"
                    >
                      Update Card
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {subscriptionStatus.paymentMethod.card?.brand?.toUpperCase()} •••• {subscriptionStatus.paymentMethod.card?.last4}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Update your payment method in the Saved Cards tab. Your subscription will use the default card.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {!subscriptionStatus.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(true)}
                    data-testid="button-cancel-subscription"
                  >
                    Cancel Subscription
                  </Button>
                )}
                {subscriptionStatus.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    onClick={() => reactivateSubscriptionMutation.mutate()}
                    disabled={reactivateSubscriptionMutation.isPending}
                    data-testid="button-reactivate-subscription"
                  >
                    {reactivateSubscriptionMutation.isPending ? "Reactivating..." : "Reactivate Subscription"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing History - Only show for active subscriptions with history */}
        {subscriptionStatus?.status === "active" && subscriptionStatus.billingHistory && subscriptionStatus.billingHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your past invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptionStatus.billingHistory.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{formatCurrency(invoice.amount, invoice.currency)}</p>
                        <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(invoice.date)} • {invoice.number || invoice.id}
                      </p>
                    </div>
                    {invoice.invoiceUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(invoice.invoiceUrl, '_blank')}
                        data-testid={`button-view-invoice-${invoice.id}`}
                      >
                        View Invoice
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subscription Pricing Dialog */}
      <SubscriptionPricingDialog 
        open={showSubscriptionDialog} 
        onOpenChange={setShowSubscriptionDialog}
        activateStoreAfter={true}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent data-testid="dialog-cancel-subscription">
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="flex-1"
              data-testid="button-keep-subscription"
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              className="flex-1"
              data-testid="button-confirm-cancel"
            >
              {cancelSubscriptionMutation.isPending ? "Canceling..." : "Yes, Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
}

function CategoryManagement() {
  const { toast } = useToast();
  const [selectedLevel1, setSelectedLevel1] = useState<string | null>(null);
  const [selectedLevel2, setSelectedLevel2] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories = [], refetch } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2 && c.parentId === selectedLevel1);
  const level3Categories = categories.filter(c => c.level === 3 && c.parentId === selectedLevel2);

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; level: number; parentId: string | null }) => {
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return await apiRequest("POST", "/api/categories", { ...data, slug });
    },
    onSuccess: () => {
      refetch();
      setNewCategoryName("");
      toast({ title: "Category created", description: "The category has been added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return await apiRequest("PUT", `/api/categories/${id}`, { name, slug });
    },
    onSuccess: () => {
      refetch();
      setEditingCategory(null);
      toast({ title: "Category updated", description: "The category has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/categories/${id}`, {});
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Category deleted", description: "The category has been removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    },
  });

  const handleCreateCategory = () => {
    let parentId = null;
    if (selectedLevel === 2 && selectedLevel1) {
      parentId = selectedLevel1;
    } else if (selectedLevel === 3 && selectedLevel2) {
      parentId = selectedLevel2;
    }

    createCategoryMutation.mutate({
      name: newCategoryName,
      level: selectedLevel,
      parentId,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Management</CardTitle>
        <CardDescription>Organize your products with hierarchical categories (up to 3 levels)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select value={selectedLevel.toString()} onValueChange={(v) => setSelectedLevel(parseInt(v) as 1 | 2 | 3)}>
              <SelectTrigger className="w-32" data-testid="select-category-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1</SelectItem>
                <SelectItem value="2">Level 2</SelectItem>
                <SelectItem value="3">Level 3</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              data-testid="input-new-category"
            />
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategoryName || (selectedLevel === 2 && !selectedLevel1) || (selectedLevel === 3 && !selectedLevel2)}
              data-testid="button-add-category"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          
          {selectedLevel === 2 && !selectedLevel1 && (
            <p className="text-sm text-muted-foreground">Select a Level 1 category first</p>
          )}
          {selectedLevel === 3 && !selectedLevel2 && (
            <p className="text-sm text-muted-foreground">Select a Level 2 category first</p>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-semibold">Level 1 Categories</h4>
          <div className="space-y-2">
            {level1Categories.map((cat) => (
              <div key={cat.id} className={`p-3 rounded-md border ${selectedLevel1 === cat.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  {editingCategory?.id === cat.id ? (
                    <Input
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      className="flex-1 mr-2"
                      data-testid={`input-edit-category-${cat.id}`}
                    />
                  ) : (
                    <button
                      className="flex-1 text-left"
                      onClick={() => setSelectedLevel1(cat.id)}
                      data-testid={`button-select-category-${cat.id}`}
                    >
                      {cat.name}
                    </button>
                  )}
                  <div className="flex gap-2">
                    {editingCategory?.id === cat.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateCategoryMutation.mutate({ id: cat.id, name: editingCategory.name })}
                          data-testid={`button-save-category-${cat.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCategory(null)}
                          data-testid={`button-cancel-edit-${cat.id}`}
                        >
                          ×
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCategory(cat)}
                          data-testid={`button-edit-category-${cat.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCategoryMutation.mutate(cat.id)}
                          data-testid={`button-delete-category-${cat.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {level1Categories.length === 0 && (
              <p className="text-sm text-muted-foreground">No Level 1 categories yet</p>
            )}
          </div>
        </div>

        {selectedLevel1 && (
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold">Level 2 Categories</h4>
            <div className="space-y-2">
              {level2Categories.map((cat) => (
                <div key={cat.id} className={`p-3 rounded-md border ${selectedLevel2 === cat.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    {editingCategory?.id === cat.id ? (
                      <Input
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="flex-1 mr-2"
                        data-testid={`input-edit-category-${cat.id}`}
                      />
                    ) : (
                      <button
                        className="flex-1 text-left"
                        onClick={() => setSelectedLevel2(cat.id)}
                        data-testid={`button-select-category-${cat.id}`}
                      >
                        {cat.name}
                      </button>
                    )}
                    <div className="flex gap-2">
                      {editingCategory?.id === cat.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateCategoryMutation.mutate({ id: cat.id, name: editingCategory.name })}
                            data-testid={`button-save-category-${cat.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategory(null)}
                            data-testid={`button-cancel-edit-${cat.id}`}
                          >
                            ×
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategory(cat)}
                            data-testid={`button-edit-category-${cat.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCategoryMutation.mutate(cat.id)}
                            data-testid={`button-delete-category-${cat.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {level2Categories.length === 0 && (
                <p className="text-sm text-muted-foreground">No Level 2 categories yet</p>
              )}
            </div>
          </div>
        )}

        {selectedLevel2 && (
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold">Level 3 Categories</h4>
            <div className="space-y-2">
              {level3Categories.map((cat) => (
                <div key={cat.id} className="p-3 rounded-md border">
                  <div className="flex items-center justify-between">
                    {editingCategory?.id === cat.id ? (
                      <Input
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="flex-1 mr-2"
                        data-testid={`input-edit-category-${cat.id}`}
                      />
                    ) : (
                      <span>{cat.name}</span>
                    )}
                    <div className="flex gap-2">
                      {editingCategory?.id === cat.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateCategoryMutation.mutate({ id: cat.id, name: editingCategory.name })}
                            data-testid={`button-save-category-${cat.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategory(null)}
                            data-testid={`button-cancel-edit-${cat.id}`}
                          >
                            ×
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategory(cat)}
                            data-testid={`button-edit-category-${cat.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCategoryMutation.mutate(cat.id)}
                            data-testid={`button-delete-category-${cat.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {level3Categories.length === 0 && (
                <p className="text-sm text-muted-foreground">No Level 3 categories yet</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Team Management Tab Component
function TeamTab() {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const { data: teamData, isLoading: collaboratorsLoading } = useQuery<{
    collaborators: any[];
    pendingInvitations: any[];
  }>({
    queryKey: ["/api/team/collaborators"],
  });

  const collaborators = teamData?.collaborators || [];
  const pendingInvitations = teamData?.pendingInvitations || [];

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/team/invite", { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/collaborators"] });
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail("");
      setIsInviteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const revokeCollaboratorMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      return await apiRequest("DELETE", `/api/team/members/${membershipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/collaborators"] });
      toast({
        title: "Collaborator removed",
        description: "Team member has been successfully removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove collaborator",
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest("DELETE", `/api/team/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/collaborators"] });
      toast({
        title: "Invitation cancelled",
        description: "Invitation has been successfully cancelled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    inviteMutation.mutate(inviteEmail);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Invite team members and manage access levels
              </CardDescription>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-invite-user">
                  <UserPlus className="h-4 w-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your team as a collaborator
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      data-testid="input-invite-email"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={inviteMutation.isPending}
                      data-testid="button-send-invitation"
                    >
                      {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Pending Invitations Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-4 w-4" />
                <h3 className="font-semibold">Pending Invitations</h3>
              </div>
              {collaboratorsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pendingInvitations && pendingInvitations.length > 0 ? (
                <div className="space-y-3">
                  {pendingInvitations.map((invitation: any) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{invitation.inviteeEmail}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited {new Date(invitation.createdAt).toLocaleDateString()}
                          {invitation.expiresAt && ` • Expires ${new Date(invitation.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          Pending
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                          disabled={cancelInvitationMutation.isPending}
                          data-testid={`button-cancel-invitation-${invitation.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                  No pending invitations
                </p>
              )}
            </div>

            {/* Collaborators Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4" />
                <h3 className="font-semibold">Team Members</h3>
              </div>
              {collaboratorsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : collaborators && collaborators.length > 0 ? (
                <div className="space-y-3">
                  {collaborators.map((collaborator: any) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`collaborator-${collaborator.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {collaborator.user?.firstName && collaborator.user?.lastName
                            ? `${collaborator.user.firstName} ${collaborator.user.lastName}`
                            : collaborator.user?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {collaborator.user?.email}
                          {collaborator.createdAt && ` • Joined ${new Date(collaborator.createdAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {collaborator.accessLevel === 'owner' ? 'Owner' : 'Collaborator'}
                        </Badge>
                        {collaborator.accessLevel !== 'owner' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => revokeCollaboratorMutation.mutate(collaborator.id)}
                            disabled={revokeCollaboratorMutation.isPending}
                            data-testid={`button-revoke-member-${collaborator.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                  No team members yet
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Tax Settings Tab Component
function TaxSettingsTab({ user }: { user: any }) {
  const { toast } = useToast();
  const [taxEnabled, setTaxEnabled] = useState(user?.taxEnabled === 1);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(user?.taxNexusCountries || []);
  const [selectedStates, setSelectedStates] = useState<string[]>(user?.taxNexusStates || []);
  const [taxProductCode, setTaxProductCode] = useState(user?.taxProductCode || "");
  const [newCountry, setNewCountry] = useState("");
  const [newState, setNewState] = useState("");

  const updateTaxSettingsMutation = useMutation({
    mutationFn: async (data: { 
      taxEnabled?: number; 
      taxNexusCountries?: string[]; 
      taxNexusStates?: string[]; 
      taxProductCode?: string;
    }) => {
      return await apiRequest("PATCH", "/api/user/tax-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Tax settings updated",
        description: "Your tax configuration has been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tax settings",
        variant: "destructive",
      });
    },
  });

  const handleToggleTax = (enabled: boolean) => {
    setTaxEnabled(enabled);
    updateTaxSettingsMutation.mutate({ taxEnabled: enabled ? 1 : 0 });
  };

  const handleAddCountry = () => {
    if (newCountry && !selectedCountries.includes(newCountry)) {
      const updatedCountries = [...selectedCountries, newCountry];
      setSelectedCountries(updatedCountries);
      updateTaxSettingsMutation.mutate({ taxNexusCountries: updatedCountries });
      setNewCountry("");
    }
  };

  const handleRemoveCountry = (country: string) => {
    const updatedCountries = selectedCountries.filter(c => c !== country);
    setSelectedCountries(updatedCountries);
    updateTaxSettingsMutation.mutate({ taxNexusCountries: updatedCountries });
  };

  const handleAddState = () => {
    if (newState && !selectedStates.includes(newState)) {
      const updatedStates = [...selectedStates, newState];
      setSelectedStates(updatedStates);
      updateTaxSettingsMutation.mutate({ taxNexusStates: updatedStates });
      setNewState("");
    }
  };

  const handleRemoveState = (state: string) => {
    const updatedStates = selectedStates.filter(s => s !== state);
    setSelectedStates(updatedStates);
    updateTaxSettingsMutation.mutate({ taxNexusStates: updatedStates });
  };

  const handleSaveProductCode = () => {
    updateTaxSettingsMutation.mutate({ taxProductCode });
  };

  const countries = [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "GB", name: "United Kingdom" },
    { code: "AU", name: "Australia" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "ES", name: "Spain" },
    { code: "IT", name: "Italy" },
    { code: "NL", name: "Netherlands" },
    { code: "SE", name: "Sweden" },
  ];

  const usStates = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Tax Collection Settings
          </CardTitle>
          <CardDescription>
            Configure automatic sales tax calculation using Stripe Tax for B2C transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tax Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="tax-enabled" className="text-base font-semibold cursor-pointer">
                Automatic Tax Collection
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically calculate and collect sales tax at checkout using Stripe Tax
              </p>
            </div>
            <Switch
              id="tax-enabled"
              checked={taxEnabled}
              onCheckedChange={handleToggleTax}
              disabled={updateTaxSettingsMutation.isPending}
              data-testid="switch-tax-enabled"
            />
          </div>

          {taxEnabled && (
            <>
              {/* Tax Nexus Countries */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Tax Nexus Countries</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select countries where you have tax obligations (nexus)
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Select value={newCountry} onValueChange={setNewCountry}>
                    <SelectTrigger className="flex-1" data-testid="select-country">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem 
                          key={country.code} 
                          value={country.code}
                          disabled={selectedCountries.includes(country.code)}
                        >
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddCountry}
                    disabled={!newCountry || updateTaxSettingsMutation.isPending}
                    data-testid="button-add-country"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedCountries.map(country => (
                    <Badge key={country} variant="secondary" className="gap-1" data-testid={`badge-country-${country}`}>
                      {countries.find(c => c.code === country)?.name || country}
                      <button
                        onClick={() => handleRemoveCountry(country)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-country-${country}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {selectedCountries.length === 0 && (
                    <p className="text-sm text-muted-foreground">No countries selected</p>
                  )}
                </div>
              </div>

              {/* US States (show only if US is selected) */}
              {selectedCountries.includes("US") && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">US State Tax Nexus</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select US states where you have tax obligations
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={newState} onValueChange={setNewState}>
                      <SelectTrigger className="flex-1" data-testid="select-state">
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                      <SelectContent>
                        {usStates.map(state => (
                          <SelectItem 
                            key={state} 
                            value={state}
                            disabled={selectedStates.includes(state)}
                          >
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAddState}
                      disabled={!newState || updateTaxSettingsMutation.isPending}
                      data-testid="button-add-state"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedStates.map(state => (
                      <Badge key={state} variant="secondary" className="gap-1" data-testid={`badge-state-${state}`}>
                        {state}
                        <button
                          onClick={() => handleRemoveState(state)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-remove-state-${state}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {selectedStates.length === 0 && (
                      <p className="text-sm text-muted-foreground">No states selected</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tax Product Code */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Tax Product Code (Optional)</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Default Stripe Tax product code for your products (e.g., txcd_99999999 for general tangible goods)
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={taxProductCode}
                    onChange={(e) => setTaxProductCode(e.target.value)}
                    placeholder="txcd_99999999"
                    data-testid="input-tax-product-code"
                  />
                  <Button
                    onClick={handleSaveProductCode}
                    disabled={updateTaxSettingsMutation.isPending}
                    data-testid="button-save-product-code"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>How Stripe Tax Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold">1</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Configure Tax Nexus</h4>
              <p className="text-sm text-muted-foreground">
                Select the countries and states where you have tax obligations
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold">2</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Automatic Calculation</h4>
              <p className="text-sm text-muted-foreground">
                Stripe Tax automatically calculates the correct tax rate based on customer location
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold">3</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">B2C Only</h4>
              <p className="text-sm text-muted-foreground">
                Tax is automatically collected for regular customers. Wholesale orders are exempt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [copiedUsername, setCopiedUsername] = useState(false);

  // Force refetch user data when component mounts to ensure fresh auth state
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, []);

  // Handle Instagram OAuth callback messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const instagramStatus = urlParams.get('instagram');
    
    if (instagramStatus) {
      switch (instagramStatus) {
        case 'success':
          toast({ 
            title: "Instagram Connected!", 
            description: "Your Instagram account has been successfully connected" 
          });
          break;
        case 'error':
          toast({ 
            title: "Connection Failed", 
            description: "Failed to connect your Instagram account", 
            variant: "destructive" 
          });
          break;
        case 'config_error':
          toast({ 
            title: "Configuration Error", 
            description: "Instagram App ID or Secret not configured. Please contact support.", 
            variant: "destructive" 
          });
          break;
        case 'auth_error':
          toast({ 
            title: "Authentication Error", 
            description: "Instagram authentication failed. Please try again.", 
            variant: "destructive" 
          });
          break;
      }
      
      // Remove query parameter from URL
      window.history.replaceState({}, '', '/settings');
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, [toast]);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      contactEmail: user?.contactEmail || "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        contactEmail: user.contactEmail || "",
      });
    }
  }, [user, profileForm]);

  const brandingForm = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      storeBanner: user?.storeBanner || "",
      storeLogo: user?.storeLogo || "",
      shippingPolicy: user?.shippingPolicy || "",
      returnsPolicy: user?.returnsPolicy || "",
    },
  });

  // Reset branding form when user data changes
  useEffect(() => {
    if (user) {
      brandingForm.reset({
        storeBanner: user.storeBanner || "",
        storeLogo: user.storeLogo || "",
        shippingPolicy: user.shippingPolicy || "",
        returnsPolicy: user.returnsPolicy || "",
      });
    }
  }, [user?.storeBanner, user?.storeLogo]);

  const aboutContactForm = useForm<AboutContactForm>({
    resolver: zodResolver(aboutContactSchema),
    defaultValues: {
      aboutStory: user?.aboutStory || "",
      contactEmail: user?.contactEmail || "",
      socialInstagram: user?.socialInstagram || "",
      socialTwitter: user?.socialTwitter || "",
      socialTiktok: user?.socialTiktok || "",
      socialSnapchat: user?.socialSnapchat || "",
      socialWebsite: user?.socialWebsite || "",
    },
  });

  // Reset about & contact form when user data changes
  useEffect(() => {
    if (user) {
      aboutContactForm.reset({
        aboutStory: user.aboutStory || "",
        contactEmail: user.contactEmail || "",
        socialInstagram: user.socialInstagram || "",
        socialTwitter: user.socialTwitter || "",
        socialTiktok: user.socialTiktok || "",
        socialSnapchat: user.socialSnapchat || "",
        socialWebsite: user.socialWebsite || "",
      });
    }
  }, [user?.aboutStory, user?.contactEmail, user?.socialInstagram, user?.socialTwitter, user?.socialTiktok, user?.socialSnapchat, user?.socialWebsite]);

  const usernameForm = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: user?.username || "",
    },
  });

  const quickSetupForm = useForm<QuickSetupForm>({
    resolver: zodResolver(quickSetupSchema),
    defaultValues: {
      username: user?.username || "",
      storeLogo: user?.storeLogo || "",
      storeBanner: user?.storeBanner || "",
    },
  });

  // Reset quick setup form when user data changes
  useEffect(() => {
    if (user) {
      quickSetupForm.reset({
        username: user.username || "",
        storeLogo: user.storeLogo || "",
        storeBanner: user.storeBanner || "",
      });
    }
  }, [user?.username, user?.storeLogo, user?.storeBanner]);

  const customDomainForm = useForm<CustomDomainForm>({
    resolver: zodResolver(customDomainSchema),
    defaultValues: {
      customDomain: user?.customDomain || "",
    },
  });

  const shippingForm = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      shippingPrice: user?.shippingPrice || "0",
    },
  });

  const warehouseForm = useForm<z.infer<typeof warehouseSchema>>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      // Try new fields first, fallback to old fields (backward compatibility)
      warehouseAddressLine1: user?.warehouseAddressLine1 || user?.warehouseStreet || "",
      warehouseAddressLine2: user?.warehouseAddressLine2 || "",
      warehouseAddressCity: user?.warehouseAddressCity || user?.warehouseCity || "",
      warehouseAddressState: user?.warehouseAddressState || user?.warehouseState || "",
      warehouseAddressPostalCode: user?.warehouseAddressPostalCode || user?.warehousePostalCode || "",
      warehouseAddressCountryCode: user?.warehouseAddressCountryCode || (user?.warehouseCountry && getCountryCode(user.warehouseCountry)) || "US",
      warehouseAddressCountryName: user?.warehouseAddressCountryName || user?.warehouseCountry || "United States",
    },
  });

  // Reset warehouse form when user data changes
  useEffect(() => {
    if (user) {
      warehouseForm.reset({
        // Try new fields first, fallback to old fields (backward compatibility)
        warehouseAddressLine1: user.warehouseAddressLine1 || user.warehouseStreet || "",
        warehouseAddressLine2: user.warehouseAddressLine2 || "",
        warehouseAddressCity: user.warehouseAddressCity || user.warehouseCity || "",
        warehouseAddressState: user.warehouseAddressState || user.warehouseState || "",
        warehouseAddressPostalCode: user.warehouseAddressPostalCode || user.warehousePostalCode || "",
        warehouseAddressCountryCode: user.warehouseAddressCountryCode || (user.warehouseCountry && getCountryCode(user.warehouseCountry)) || "US",
        warehouseAddressCountryName: user.warehouseAddressCountryName || user.warehouseCountry || "United States",
      });
    }
  }, [user?.warehouseAddressLine1, user?.warehouseAddressLine2, user?.warehouseAddressCity, user?.warehouseAddressState, user?.warehouseAddressPostalCode, user?.warehouseAddressCountryCode, user?.warehouseAddressCountryName, user?.warehouseStreet, user?.warehouseCity, user?.warehouseState, user?.warehousePostalCode, user?.warehouseCountry]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      return await apiRequest("PATCH", "/api/user/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated", description: "Your profile has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: BrandingForm) => {
      return await apiRequest("PATCH", "/api/user/branding", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Branding updated", description: "Your store branding has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update branding", variant: "destructive" });
    },
  });

  const updateAboutContactMutation = useMutation({
    mutationFn: async (data: AboutContactForm) => {
      return await apiRequest("PATCH", "/api/user/about-contact", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "About & Contact updated", description: "Your store information has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update about & contact information", variant: "destructive" });
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof warehouseSchema>) => {
      return await apiRequest("PATCH", "/api/user/warehouse", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Warehouse address updated", description: "Your warehouse address has been updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update warehouse address", variant: "destructive" });
    },
  });

  const updatePaymentProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      return await apiRequest("PATCH", "/api/user/payment-provider", { paymentProvider: provider });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Payment provider updated", description: "Your payment provider has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update payment provider", variant: "destructive" });
    },
  });

  const disconnectStripeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/stripe/disconnect", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Disconnected", description: "Your Stripe account has been disconnected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect Stripe account", variant: "destructive" });
    },
  });

  const updateUsernameMutation = useMutation({
    mutationFn: async (data: UsernameForm) => {
      return await apiRequest("PATCH", "/api/user/username", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Username updated", description: "Your store username has been updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update username", 
        variant: "destructive" 
      });
    },
  });

  const updateQuickSetupMutation = useMutation({
    mutationFn: async (data: QuickSetupForm) => {
      // Update username
      await apiRequest("PATCH", "/api/user/username", { username: data.username });
      // Update branding
      await apiRequest("PATCH", "/api/user/branding", { 
        storeLogo: data.storeLogo,
        storeBanner: data.storeBanner 
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Store setup saved", description: "Your store setup has been saved successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save store setup", 
        variant: "destructive" 
      });
    },
  });

  const updateCustomDomainMutation = useMutation({
    mutationFn: async (data: CustomDomainForm) => {
      return await apiRequest("PATCH", "/api/user/custom-domain", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Custom domain updated", description: "Your custom domain has been updated. Please configure DNS settings." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update custom domain", 
        variant: "destructive" 
      });
    },
  });

  const updateShippingMutation = useMutation({
    mutationFn: async (data: ShippingForm) => {
      return await apiRequest("PATCH", "/api/user/shipping", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Shipping updated", description: "Your shipping price has been updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update shipping price", 
        variant: "destructive" 
      });
    },
  });

  const disconnectInstagramMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/instagram/disconnect", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Disconnected", description: "Your Instagram account has been disconnected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect Instagram account", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  const handleConnectStripe = async (reset = false) => {
    // If creating new account or resetting, show country selector first
    if (!user?.stripeConnectedAccountId || reset) {
      setPendingStripeAction({ reset });
      setIsCountrySelectorOpen(true);
      return;
    }

    // If account already exists and not resetting, proceed directly
    try {
      const createResponse = await apiRequest("POST", "/api/stripe/create-express-account", { 
        reset
      });
      const accountData = await createResponse.json();
      
      if (!createResponse.ok) {
        if (accountData.error === "Stripe Connect Not Enabled") {
          toast({
            title: "Stripe Connect Not Enabled",
            description: accountData.message || "Please enable Stripe Connect in your Stripe dashboard first.",
            variant: "destructive",
            duration: 10000,
          });
          window.open("https://dashboard.stripe.com/connect/accounts/overview", "_blank");
          return;
        }
        throw new Error(accountData.message || accountData.error || "Failed to create Stripe account");
      }

      setIsStripeModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to connect Stripe account",
        variant: "destructive",
      });
    }
  };

  const handleCountrySelected = async (country: string) => {
    if (!pendingStripeAction) return;

    try {
      const createResponse = await apiRequest("POST", "/api/stripe/create-express-account", { 
        reset: pendingStripeAction.reset,
        country
      });
      const accountData = await createResponse.json();
      
      if (!createResponse.ok) {
        if (accountData.error === "Stripe Connect Not Enabled") {
          toast({
            title: "Stripe Connect Not Enabled",
            description: accountData.message || "Please enable Stripe Connect in your Stripe dashboard first.",
            variant: "destructive",
            duration: 10000,
          });
          window.open("https://dashboard.stripe.com/connect/accounts/overview", "_blank");
          return;
        }
        throw new Error(accountData.message || accountData.error || "Failed to create Stripe account");
      }

      setIsStripeModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (pendingStripeAction.reset) {
        toast({
          title: "Starting Fresh",
          description: "Stripe onboarding has been reset. You can now start from the beginning.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to connect Stripe account",
        variant: "destructive",
      });
    } finally {
      setPendingStripeAction(null);
    }
  };

  const handleConnectInstagram = async () => {
    try {
      const response = await apiRequest("GET", "/api/instagram/connect");
      const data = await response.json();
      
      if (response.ok && data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=700');
      } else if (data.errorCode === "INSTAGRAM_NOT_CONFIGURED") {
        toast({
          title: "Instagram Not Available",
          description: "Instagram connection is not configured yet. This feature will be available soon.",
          variant: "default",
        });
      } else {
        throw new Error(data.error || "Failed to connect");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate Instagram connection",
        variant: "destructive",
      });
    }
  };

  const isSeller = user?.role === "seller" || user?.role === "owner" || user?.role === "admin";
  const isStripeConnected = user?.stripeConnectedAccountId && user?.stripeDetailsSubmitted === 1;
  const isInstagramConnected = user?.instagramUsername;
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [isPayoutsModalOpen, setIsPayoutsModalOpen] = useState(false);
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false);
  const [pendingStripeAction, setPendingStripeAction] = useState<{ reset: boolean } | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'ipad' | 'iphone'>('iphone');
  
  // Check if charges are enabled but payouts are not (progressive onboarding state)
  const canAcceptPayments = user?.stripeChargesEnabled === 1;
  const canReceivePayouts = user?.stripePayoutsEnabled === 1;

  // Fetch Stripe account status including capabilities
  const { data: stripeAccountStatus, isLoading: isStripeStatusLoading } = useQuery<any>({
    queryKey: ["/api/stripe/account-status"],
    enabled: !!user?.stripeConnectedAccountId,
  });

  // Get tab from URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');
  const stripeParam = searchParams.get('stripe');
  // Sellers default to Quick Setup, buyers to Profile
  const [defaultTab, setDefaultTab] = useState(tabParam || (isSeller ? "quick-setup" : "profile"));

  // Sync tab state with URL changes
  useEffect(() => {
    const newTab = new URLSearchParams(window.location.search).get('tab');
    if (newTab && newTab !== defaultTab) {
      setDefaultTab(newTab);
    }
  }, [window.location.search]);

  // Check Stripe status when returning from Stripe Connect
  useEffect(() => {
    const checkStripeStatus = async () => {
      if (stripeParam === 'connected' && user?.stripeConnectedAccountId) {
        try {
          const response = await apiRequest("GET", "/api/stripe/account-status");
          const data = await response.json();
          
          if (data.detailsSubmitted) {
            toast({
              title: "Stripe Connected!",
              description: "Your payment account is now set up and ready to accept payments.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          } else {
            toast({
              title: "Setup Incomplete",
              description: "Please complete the Stripe onboarding to start accepting payments.",
              variant: "destructive",
            });
          }
          
          // Clean up URL
          window.history.replaceState({}, '', '/settings?tab=payment');
        } catch (error) {
          console.error("Failed to check Stripe status:", error);
        }
      } else if (stripeParam === 'refresh') {
        toast({
          title: "Session Expired",
          description: "Your Stripe setup session expired. Please try connecting again.",
          variant: "destructive",
        });
        window.history.replaceState({}, '', '/settings?tab=payment');
      }
    };

    checkStripeStatus();
  }, [stripeParam, user?.stripeConnectedAccountId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-lg text-muted-foreground">Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {isSeller && <DashboardBreadcrumb currentPage="Settings" />}
      {!isSeller && (
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      )}

      <Tabs defaultValue={defaultTab} className="space-y-6" onValueChange={(value) => setDefaultTab(value)}>
        {/* Mobile: Dropdown Select */}
        <div className="md:hidden">
          <Select value={defaultTab} onValueChange={setDefaultTab}>
            <SelectTrigger className="w-full" data-testid="select-settings-mobile">
              <SelectValue placeholder="Select a tab" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {isSeller && (
                <>
                  <SelectItem value="quick-setup">
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      <span>Quick Setup</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="about-contact">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>About & Contact</span>
                    </div>
                  </SelectItem>
                </>
              )}
              <SelectItem value="profile">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </div>
              </SelectItem>
              {isSeller && (
                <>
                  <SelectItem value="shipping-matrix">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Shipping</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="warehouse">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Warehouse</span>
                    </div>
                  </SelectItem>
                </>
              )}
              <SelectItem value="addresses-payments">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Saved Cards</span>
                </div>
              </SelectItem>
              {isSeller && (
                <>
                  <SelectItem value="tax">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      <span>Tax</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="branding-policies">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Terms & Policies</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="categories">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>Categories</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="team">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Team</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="payment">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Payment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="subscription">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Subscription</span>
                    </div>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop/Tablet: Wrapping Tabs Grid */}
        <TabsList className="hidden md:flex w-full flex-wrap gap-2 h-auto p-2" data-testid="tabs-settings">
          {isSeller && (
            <>
              <TabsTrigger value="quick-setup" data-testid="tab-quick-setup" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                <span>Quick Setup</span>
              </TabsTrigger>
              <TabsTrigger value="about-contact" data-testid="tab-about-contact" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>About & Contact</span>
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="profile" data-testid="tab-profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          {isSeller && (
            <>
              <TabsTrigger value="shipping-matrix" data-testid="tab-shipping-matrix" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Shipping</span>
              </TabsTrigger>
              <TabsTrigger value="warehouse" data-testid="tab-warehouse" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Warehouse</span>
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="addresses-payments" data-testid="tab-addresses-payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Saved Cards</span>
          </TabsTrigger>
          {isSeller && (
            <>
              <TabsTrigger value="tax" data-testid="tab-tax" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span>Tax</span>
              </TabsTrigger>
              <TabsTrigger value="branding-policies" data-testid="tab-branding-policies" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Terms & Policies</span>
              </TabsTrigger>
              <TabsTrigger value="categories" data-testid="tab-categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>Categories</span>
              </TabsTrigger>
              <TabsTrigger value="team" data-testid="tab-team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Team</span>
              </TabsTrigger>
              <TabsTrigger value="payment" data-testid="tab-payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Payment</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" data-testid="tab-subscription" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Subscription</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Business information from your Stripe Connect account</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  {isSeller && (
                    <FormField
                      control={profileForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="support@yourdomain.com" data-testid="input-contactEmail" />
                          </FormControl>
                          <FormDescription>
                            Custom email for customer inquiries (defaults to {user?.email} if not set)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {isSeller && isStripeConnected && stripeAccountStatus && (
                    <>
                      <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold mb-1">Business Information</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          This information is populated from your Stripe Connect account. To update, please modify in your Stripe Dashboard.
                        </p>
                      </div>

                      {/* Personal/Business Details from Stripe */}
                      {stripeAccountStatus.individual && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <FormLabel className="text-muted-foreground">First Name</FormLabel>
                              <Input 
                                value={stripeAccountStatus.individual.firstName || 'N/A'} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-first-name" 
                              />
                            </div>
                            <div>
                              <FormLabel className="text-muted-foreground">Last Name</FormLabel>
                              <Input 
                                value={stripeAccountStatus.individual.lastName || 'N/A'} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-last-name" 
                              />
                            </div>
                          </div>
                          {stripeAccountStatus.individual.email && (
                            <div>
                              <FormLabel className="text-muted-foreground">Email</FormLabel>
                              <Input 
                                value={stripeAccountStatus.individual.email} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-email" 
                              />
                            </div>
                          )}
                          {stripeAccountStatus.individual.phone && (
                            <div>
                              <FormLabel className="text-muted-foreground">Phone</FormLabel>
                              <Input 
                                value={stripeAccountStatus.individual.phone} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-phone" 
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Company Name and Business Type */}
                      {user?.companyName && (
                        <div>
                          <FormLabel className="text-muted-foreground">Company Name</FormLabel>
                          <Input 
                            value={user.companyName} 
                            disabled 
                            className="bg-muted"
                            data-testid="input-stripe-company-name" 
                          />
                        </div>
                      )}
                      {user?.businessType && (
                        <div>
                          <FormLabel className="text-muted-foreground">Business Type</FormLabel>
                          <Input 
                            value={user.businessType} 
                            disabled 
                            className="bg-muted capitalize"
                            data-testid="input-stripe-business-type" 
                          />
                        </div>
                      )}

                      {/* Business Address */}
                      {(stripeAccountStatus.individual?.address || stripeAccountStatus.company?.address) && (
                        <>
                          <div className="pt-4 border-t">
                            <FormLabel className="text-sm font-semibold">Business Address</FormLabel>
                          </div>
                          <div>
                            <FormLabel className="text-muted-foreground">Address Line 1</FormLabel>
                            <Input 
                              value={stripeAccountStatus.individual?.address?.line1 || stripeAccountStatus.company?.address?.line1 || 'N/A'} 
                              disabled 
                              className="bg-muted"
                              data-testid="input-stripe-address-line1" 
                            />
                          </div>
                          {(stripeAccountStatus.individual?.address?.line2 || stripeAccountStatus.company?.address?.line2) && (
                            <div>
                              <FormLabel className="text-muted-foreground">Address Line 2</FormLabel>
                              <Input 
                                value={stripeAccountStatus.individual?.address?.line2 || stripeAccountStatus.company?.address?.line2} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-address-line2" 
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <FormLabel className="text-muted-foreground">City</FormLabel>
                              <Input 
                                value={stripeAccountStatus.individual?.address?.city || stripeAccountStatus.company?.address?.city || 'N/A'} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-city" 
                              />
                            </div>
                            <div>
                              <FormLabel className="text-muted-foreground">State/Province</FormLabel>
                              <Input 
                                value={stripeAccountStatus.individual?.address?.state || stripeAccountStatus.company?.address?.state || 'N/A'} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-state" 
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <FormLabel className="text-muted-foreground">Postal Code</FormLabel>
                              <Input 
                                value={stripeAccountStatus.individual?.address?.postalCode || stripeAccountStatus.company?.address?.postalCode || 'N/A'} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-postal" 
                              />
                            </div>
                            <div>
                              <FormLabel className="text-muted-foreground">Country</FormLabel>
                              <Input 
                                value={(stripeAccountStatus.individual?.address?.country || stripeAccountStatus.company?.address?.country)?.toUpperCase() || 'N/A'} 
                                disabled 
                                className="bg-muted"
                                data-testid="input-stripe-country" 
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <p className="text-xs text-muted-foreground pt-2">
                        To update this information, please visit your{' '}
                        <button 
                          onClick={() => window.open(`https://dashboard.stripe.com/${stripeAccountStatus.accountId}`, '_blank')}
                          className="text-primary underline"
                        >
                          Stripe Dashboard
                        </button>
                      </p>
                    </>
                  )}

                  {isSeller && !isStripeConnected && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Connect your Stripe account to view and manage your business information.
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {isSeller && isStripeConnected && stripeAccountStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Stripe Account Information</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`https://dashboard.stripe.com/${stripeAccountStatus.accountId}`, '_blank')}
                    data-testid="button-stripe-dashboard"
                  >
                    Open Stripe Dashboard
                  </Button>
                </CardTitle>
                <CardDescription>
                  View your connected Stripe account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account ID</p>
                    <p className="text-sm font-mono" data-testid="text-stripe-account-id">{stripeAccountStatus.accountId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p className="text-sm" data-testid="text-stripe-country">{stripeAccountStatus.country?.toUpperCase() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Default Currency</p>
                    <p className="text-sm" data-testid="text-stripe-currency">{stripeAccountStatus.currency?.toUpperCase() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payout Schedule</p>
                    <p className="text-sm capitalize" data-testid="text-stripe-payout-schedule">
                      {stripeAccountStatus.payoutSchedule?.interval === 'manual' 
                        ? 'Manual' 
                        : `${stripeAccountStatus.payoutSchedule?.interval} (${stripeAccountStatus.payoutSchedule?.delayDays || 0} day delay)`}
                    </p>
                  </div>
                </div>
                
                {(stripeAccountStatus.businessProfile?.name || stripeAccountStatus.businessProfile?.supportEmail || stripeAccountStatus.businessProfile?.supportPhone || stripeAccountStatus.businessProfile?.url) && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Business Profile</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {stripeAccountStatus.businessProfile.name && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                          <p className="text-sm" data-testid="text-stripe-business-name">{stripeAccountStatus.businessProfile.name}</p>
                        </div>
                      )}
                      {stripeAccountStatus.businessProfile.supportEmail && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Support Email</p>
                          <p className="text-sm" data-testid="text-stripe-support-email">{stripeAccountStatus.businessProfile.supportEmail}</p>
                        </div>
                      )}
                      {stripeAccountStatus.businessProfile.supportPhone && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Support Phone</p>
                          <p className="text-sm" data-testid="text-stripe-support-phone">{stripeAccountStatus.businessProfile.supportPhone}</p>
                        </div>
                      )}
                      {stripeAccountStatus.businessProfile.url && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Website</p>
                          <p className="text-sm truncate" data-testid="text-stripe-business-url">{stripeAccountStatus.businessProfile.url}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Capabilities</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant={canAcceptPayments ? "default" : "secondary"} data-testid="badge-charges">
                      {canAcceptPayments ? "✓" : "✗"} Charges Enabled
                    </Badge>
                    <Badge variant={canReceivePayouts ? "default" : "secondary"} data-testid="badge-payouts">
                      {canReceivePayouts ? "✓" : "✗"} Payouts Enabled
                    </Badge>
                    <Badge variant={stripeAccountStatus.detailsSubmitted ? "default" : "secondary"} data-testid="badge-details">
                      {stripeAccountStatus.detailsSubmitted ? "✓" : "✗"} Details Submitted
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="addresses-payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Saved Cards
              </CardTitle>
              <CardDescription>
                Manage your saved payment methods for faster checkout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SavedPaymentMethodsManager />
            </CardContent>
          </Card>
        </TabsContent>

        {isSeller && (
          <TabsContent value="subscription">
            <SubscriptionTab user={user} />
          </TabsContent>
        )}

        {isSeller && (
          <TabsContent value="quick-setup">
            <div className="space-y-6">
              {/* Progress Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5" />
                    Quick Setup Checklist
                  </CardTitle>
                  <CardDescription>Complete these steps to activate your store</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    {quickSetupForm.watch('username') ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">Set up your store username</p>
                      <p className="text-xs text-muted-foreground">Choose a unique username for your store URL</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {quickSetupForm.watch('storeLogo') ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload your store logo</p>
                      <p className="text-xs text-muted-foreground">Appears in navigation header (200×200px recommended)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {quickSetupForm.watch('storeBanner') ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload a store banner (optional)</p>
                      <p className="text-xs text-muted-foreground">Hero image at the top of your storefront (1200×400px recommended)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Storefront Branding Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Storefront Branding</CardTitle>
                  <CardDescription>Set up your username, logo, and banner</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...quickSetupForm}>
                    <form onSubmit={quickSetupForm.handleSubmit((data) => updateQuickSetupMutation.mutate(data))} className="space-y-6">
                      {/* Username Field */}
                      <FormField
                        control={quickSetupForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="yourusername" 
                                data-testid="input-username-quick-setup" 
                              />
                            </FormControl>
                            <FormDescription>
                              3-20 characters, letters, numbers, and underscores only
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Store URL Display */}
                      <div className="space-y-3 pt-2">
                        <p className="text-sm font-medium">Your Store URL</p>
                        <div className="flex gap-2">
                          <Input
                            value={quickSetupForm.watch('username') ? getStoreUrl(quickSetupForm.watch('username')) : 'Set username above'}
                            readOnly
                            className="flex-1"
                            data-testid="input-store-url-display"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const username = quickSetupForm.watch('username');
                              if (!username) return;
                              const url = getStoreUrl(username);
                              if (!url) return;
                              navigator.clipboard.writeText(url);
                              setCopiedUsername(true);
                              setTimeout(() => setCopiedUsername(false), 2000);
                              toast({ title: "Copied!", description: "Store link copied to clipboard" });
                            }}
                            disabled={!quickSetupForm.watch('username')}
                            data-testid="button-copy-store-url"
                          >
                            {copiedUsername ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Instagram Connection */}
                      <div className="space-y-3 pt-4 border-t">
                        {isInstagramConnected ? (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="font-medium">Instagram Connected</span>
                              <span className="text-muted-foreground">@{user?.instagramUsername}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Your Instagram handle is connected. You can use @{user?.instagramUsername} as your store identifier.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => disconnectInstagramMutation.mutate()}
                              disabled={disconnectInstagramMutation.isPending}
                              data-testid="button-disconnect-instagram"
                            >
                              <div className="flex items-center gap-2">
                                <SiInstagram className="h-5 w-5" />
                                <span>{disconnectInstagramMutation.isPending ? "Disconnecting..." : "Disconnect Instagram"}</span>
                              </div>
                              <span>×</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">Connect Instagram (Optional)</p>
                            <p className="text-xs text-muted-foreground">
                              Connect your Instagram to use your verified handle as your store URL. This provides instant credibility and makes it easier for your followers to find your store.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              onClick={handleConnectInstagram}
                              data-testid="button-connect-instagram"
                            >
                              <div className="flex items-center gap-2">
                                <SiInstagram className="h-5 w-5" />
                                <span>Connect Instagram</span>
                              </div>
                              <span>→</span>
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Custom Domain (Coming Soon) */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Custom Domain</p>
                            <p className="text-xs text-muted-foreground mt-1">Coming Soon</p>
                          </div>
                        </div>
                        <Input 
                          placeholder="mystore.com" 
                          disabled
                          data-testid="input-custom-domain" 
                        />
                        <p className="text-xs text-muted-foreground">Connect your own domain to your store (feature coming soon)</p>
                      </div>

                      {/* Store Logo */}
                      <div className="pt-4 border-t">
                        <FormField
                          control={quickSetupForm.control}
                          name="storeLogo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Store Logo</FormLabel>
                              <FormControl>
                                <UniversalImageUpload
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  label=""
                                  mode="single"
                                  aspectRatio="square"
                                  heroSelection={false}
                                  allowUrl={true}
                                  allowUpload={true}
                                />
                              </FormControl>
                              <FormDescription>Appears in the navigation header (200×200px square recommended)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Store Banner */}
                      <FormField
                        control={quickSetupForm.control}
                        name="storeBanner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Banner (Optional)</FormLabel>
                            <FormControl>
                              <UniversalImageUpload
                                value={field.value || ""}
                                onChange={field.onChange}
                                label=""
                                mode="single"
                                aspectRatio="banner"
                                heroSelection={false}
                                allowUrl={true}
                                allowUpload={true}
                              />
                            </FormControl>
                            <FormDescription>Hero image at the top of your store (1200×400px recommended)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Preview Store */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Preview Your Store
                      </CardTitle>
                      <CardDescription>See how your store appears on different devices</CardDescription>
                    </div>
                    <div className="flex gap-1 border rounded-lg p-1" data-testid="preview-device-selector">
                      <Button
                        type="button"
                        variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewDevice('desktop')}
                        className="h-8 px-3"
                        data-testid="button-preview-desktop"
                      >
                        Desktop
                      </Button>
                      <Button
                        type="button"
                        variant={previewDevice === 'ipad' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewDevice('ipad')}
                        className="h-8 px-3"
                        data-testid="button-preview-ipad"
                      >
                        iPad
                      </Button>
                      <Button
                        type="button"
                        variant={previewDevice === 'iphone' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewDevice('iphone')}
                        className="h-8 px-3"
                        data-testid="button-preview-iphone"
                      >
                        iPhone
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quickSetupForm.watch('username') ? (
                    <div className="space-y-4">
                      <div className={`mx-auto transition-all ${
                        previewDevice === 'desktop' ? 'w-full' : 
                        previewDevice === 'ipad' ? 'w-3/4' : 
                        'w-[375px]'
                      }`}>
                        <iframe
                          key={`${quickSetupForm.watch('username')}-${quickSetupForm.watch('storeLogo')}-${quickSetupForm.watch('storeBanner')}-${previewDevice}`}
                          src={`/s/${quickSetupForm.watch('username')}?preview=true&previewLogo=${encodeURIComponent(quickSetupForm.watch('storeLogo') || '')}&previewBanner=${encodeURIComponent(quickSetupForm.watch('storeBanner') || '')}`}
                          className={`w-full rounded-lg border ${
                            previewDevice === 'desktop' ? 'aspect-video' :
                            previewDevice === 'ipad' ? 'aspect-[4/3]' :
                            'aspect-[9/16]'
                          }`}
                          title="Store Preview"
                          data-testid="iframe-store-preview"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Enter a username above to preview your storefront
                      </p>
                    </div>
                  )}

                  {/* Save and Discard Buttons */}
                  <div className="flex gap-3 pt-6 border-t">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => quickSetupForm.reset()}
                      data-testid="button-discard-quick-setup"
                    >
                      Discard Changes
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-1"
                      disabled={updateQuickSetupMutation.isPending}
                      onClick={quickSetupForm.handleSubmit((data) => updateQuickSetupMutation.mutate(data))}
                      data-testid="button-save-quick-setup"
                    >
                      {updateQuickSetupMutation.isPending ? "Saving..." : "Save Store Setup"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {isSeller && (
          <TabsContent value="branding-policies">
            <Card>
              <CardHeader>
                <CardTitle>Store Policies</CardTitle>
                <CardDescription>Customize shipping and returns information displayed on product pages</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...brandingForm}>
                  <form onSubmit={brandingForm.handleSubmit((data) => updateBrandingMutation.mutate(data))} className="space-y-6">
                    {/* Shipping Policy */}
                    <FormField
                      control={brandingForm.control}
                      name="shippingPolicy"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="shipping-policy">Shipping & Delivery Policy</Label>
                          <FormControl>
                            <textarea
                              {...field}
                              id="shipping-policy"
                              value={field.value || ""}
                              placeholder="e.g., Free shipping on orders over $50. Standard shipping takes 3-5 business days."
                              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              data-testid="textarea-shipping-policy"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Leave blank to show default policy. This text will replace the default shipping information on product pages.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Returns Policy */}
                    <FormField
                      control={brandingForm.control}
                      name="returnsPolicy"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="returns-policy">Returns & Exchanges Policy</Label>
                          <FormControl>
                            <textarea
                              {...field}
                              id="returns-policy"
                              value={field.value || ""}
                              placeholder="e.g., 30-day returns on all items. Items must be in original condition with tags attached."
                              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              data-testid="textarea-returns-policy"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Leave blank to show default policy. This text will replace the default returns information on product pages.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
                <CardDescription>Upload your custom Terms & Conditions PDF or use the platform default</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Show uploaded PDF first if exists */}
                  {user?.termsPdfUrl && user?.termsSource === 'custom_pdf' ? (
                    <div className="space-y-3">
                      <div>
                        <Label>Custom Terms & Conditions PDF</Label>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">
                          Your uploaded Terms & Conditions PDF
                        </p>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg hover-elevate cursor-pointer" onClick={() => window.open(user.termsPdfUrl!, '_blank')}>
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Terms & Conditions PDF</p>
                          <p className="text-xs text-primary">Click to view PDF</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await apiRequest('POST', '/api/settings/terms', {
                                termsSource: null,
                                termsPdfUrl: null,
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                              toast({
                                title: "PDF removed",
                                description: "Terms & Conditions PDF has been removed",
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to remove PDF",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid="button-remove-tc-pdf"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : user?.termsSource === 'platform_default' ? (
                    <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Using Platform Default Terms & Conditions</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You're using Upfirst's standard Terms & Conditions.{' '}
                          <a 
                            href="#" 
                            className="text-primary underline hover:no-underline"
                            onClick={(e) => {
                              e.preventDefault();
                              toast({
                                title: "Link Coming Soon",
                                description: "Platform default Terms & Conditions link will be provided",
                              });
                            }}
                            data-testid="link-view-platform-tc"
                          >
                            View terms
                          </a>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={async () => {
                            try {
                              await apiRequest('POST', '/api/settings/terms', {
                                termsSource: null,
                                termsPdfUrl: null,
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                              toast({
                                title: "Platform default disabled",
                                description: "You can now upload a custom T&C PDF",
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to update Terms & Conditions",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid="button-disable-platform-tc"
                        >
                          Switch to Custom PDF
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={async () => {
                          try {
                            await apiRequest('POST', '/api/settings/terms', {
                              termsSource: 'platform_default',
                              termsPdfUrl: null,
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                            toast({
                              title: "Platform default enabled",
                              description: "Using Upfirst's standard Terms & Conditions",
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update Terms & Conditions",
                              variant: "destructive",
                            });
                          }
                        }}
                        data-testid="button-use-platform-tc"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Use Platform Default Terms & Conditions
                      </Button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="tc-pdf">Upload Custom Terms & Conditions PDF</Label>
                          <p className="text-xs text-muted-foreground mt-1 mb-3">
                            Upload your own Terms & Conditions as a PDF file
                          </p>
                        </div>
                        <input
                          type="file"
                          id="tc-pdf"
                          accept=".pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (file.type !== 'application/pdf') {
                              toast({
                                title: "Invalid file type",
                                description: "Please upload a PDF file",
                                variant: "destructive",
                              });
                              e.target.value = '';
                              return;
                            }

                            try {
                              const formData = new FormData();
                              formData.append('file', file);

                              const uploadRes = await fetch('/api/objects/upload-file', {
                                method: 'POST',
                                body: formData,
                              });

                              if (!uploadRes.ok) throw new Error('Upload failed');

                              const { objectPath } = await uploadRes.json();
                              const pdfUrl = `/objects/${objectPath}`;

                              await apiRequest('POST', '/api/settings/terms', {
                                termsSource: 'custom_pdf',
                                termsPdfUrl: pdfUrl,
                              });

                              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                              toast({
                                title: "PDF uploaded",
                                description: "Your Terms & Conditions PDF has been uploaded successfully",
                              });
                              e.target.value = '';
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to upload PDF",
                                variant: "destructive",
                              });
                              e.target.value = '';
                            }
                          }}
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                          data-testid="input-tc-pdf"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Save and Discard Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => brandingForm.reset()}
                    data-testid="button-discard-policies"
                  >
                    Discard Changes
                  </Button>
                  <Button 
                    type="button"
                    className="flex-1"
                    disabled={updateBrandingMutation.isPending}
                    onClick={brandingForm.handleSubmit((data) => updateBrandingMutation.mutate(data))}
                    data-testid="button-save-policies"
                  >
                    {updateBrandingMutation.isPending ? "Saving..." : "Save Policies"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isSeller && (
          <TabsContent value="about-contact">
            <Card>
              <CardHeader>
                <CardTitle>About & Contact</CardTitle>
                <CardDescription>This information will appear in your storefront footer</CardDescription>
              </CardHeader>
                <CardContent>
                  <Form {...aboutContactForm}>
                    <form onSubmit={aboutContactForm.handleSubmit((data) => updateAboutContactMutation.mutate(data))} className="space-y-6">
                      {/* About Story Section */}
                      <FormField
                        control={aboutContactForm.control}
                        name="aboutStory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Story</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <textarea
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Enter your story"
                                  maxLength={1000}
                                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  data-testid="textarea-about-story"
                                />
                                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                  {(field.value || "").length} / 1000
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>Share your brand story (max 1000 characters)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Contact Details Section */}
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-semibold">Contact Details</h3>
                        
                        <FormField
                          control={aboutContactForm.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Contact Email</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="email" 
                                  placeholder="customer@example.com"
                                  data-testid="input-contact-email"
                                />
                              </FormControl>
                              <FormDescription>Email for customer inquiries</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Social Connections Section */}
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-semibold">Social Connections</h3>
                        
                        <FormField
                          control={aboutContactForm.control}
                          name="socialInstagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <SiInstagram className="h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    {...field} 
                                    placeholder="username or full URL"
                                    data-testid="input-instagram"
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>Enter your Instagram username or profile URL</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={aboutContactForm.control}
                          name="socialTwitter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twitter</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                  </svg>
                                  <Input 
                                    {...field} 
                                    placeholder="username or full URL"
                                    data-testid="input-twitter"
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>Enter your Twitter username or profile URL</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={aboutContactForm.control}
                          name="socialTiktok"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>TikTok</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                                  </svg>
                                  <Input 
                                    {...field} 
                                    placeholder="username or full URL"
                                    data-testid="input-tiktok"
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>Enter your TikTok username or profile URL</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={aboutContactForm.control}
                          name="socialSnapchat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Snapchat</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.512-.104.42 0 .861.185 1.064.662.115.27.155.519.155.753 0 .424-.26.845-.68 1.066-.625.332-1.357.47-2.065.47-.196 0-.399-.01-.599-.035-.18-.024-.375-.035-.566-.035-.31 0-.62.04-.915.11-.376.094-.735.275-1.039.492-.47.329-.898.707-1.305 1.097-.05.05-.103.096-.157.142-.181.146-.361.29-.532.438-.146.122-.279.245-.408.368-.197.179-.385.369-.564.569-.103.12-.244.327-.38.512-.112.152-.223.301-.343.437-.182.204-.375.4-.586.58-.586.502-1.29.878-2.072 1.102-.432.124-.877.194-1.322.194-.54 0-1.082-.095-1.588-.28-.68-.246-1.29-.632-1.788-1.127-.485-.48-.862-1.066-1.117-1.735-.18-.478-.28-.989-.28-1.513 0-.334.057-.671.17-.993.128-.365.331-.7.604-.997.396-.43.893-.753 1.446-.943.392-.133.809-.198 1.228-.198.135 0 .27.011.405.033.27.042.531.12.781.233.345.154.665.368.951.636.245.232.459.494.64.783.12.192.216.4.285.617.07.215.104.442.104.669 0 .242-.033.484-.1.717-.095.337-.261.648-.488.913-.275.319-.622.579-1.017.76-.117.053-.24.096-.365.127-.118.03-.239.052-.362.065-.036.004-.072.007-.109.007-.211 0-.419-.059-.599-.17-.16-.1-.294-.241-.389-.408-.104-.182-.157-.394-.157-.609 0-.162.033-.322.098-.474.097-.226.262-.415.464-.538.093-.056.198-.095.308-.113.056-.009.113-.014.17-.014.143 0 .283.032.413.093.123.058.234.14.327.24.098.103.174.227.221.368.037.114.055.233.055.353 0 .118-.016.235-.048.347-.067.238-.215.437-.425.567-.105.065-.225.11-.35.127-.036.005-.072.008-.108.008-.172 0-.339-.068-.462-.188-.135-.131-.212-.31-.212-.497 0-.14.039-.275.113-.389.09-.14.222-.246.376-.302.055-.02.112-.03.17-.03.13 0 .255.045.353.127.087.072.155.165.196.27.028.071.042.146.042.222 0 .106-.029.209-.084.298-.071.114-.185.196-.317.228-.022.005-.044.007-.067.007-.092 0-.182-.027-.256-.077a.366.366 0 01-.136-.192z"/>
                                  </svg>
                                  <Input 
                                    {...field} 
                                    placeholder="username or full URL"
                                    data-testid="input-snapchat"
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>Enter your Snapchat username or profile URL</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={aboutContactForm.control}
                          name="socialWebsite"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    {...field} 
                                    placeholder="https://yourwebsite.com"
                                    data-testid="input-website"
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>Enter your website URL</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => aboutContactForm.reset()}
                          data-testid="button-discard-changes"
                        >
                          Discard changes
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateAboutContactMutation.isPending}
                          data-testid="button-save-about-contact"
                        >
                          {updateAboutContactMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
          </TabsContent>
        )}

        {isSeller && (
          <>
            <TabsContent value="categories">
              <CategoryManagement />
            </TabsContent>

            <TabsContent value="shipping-matrix">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Shipping Matrix
                  </CardTitle>
                  <CardDescription>
                    Create zone-based shipping rates for your products
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ShippingMatrixManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warehouse">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Warehouse Addresses
                  </CardTitle>
                  <CardDescription>
                    Manage your warehouse addresses. Required for shipping label generation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WarehouseAddressesManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tax">
              <TaxSettingsTab user={user} />
            </TabsContent>
            <TabsContent value="team">
              <TeamTab />
            </TabsContent>
          </>
        )}

        {isSeller && (
          <TabsContent value="payment">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Providers</CardTitle>
                  <CardDescription>
                    Connect payment providers to receive payments from customers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Stripe Provider */}
                  <div className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Stripe</h3>
                          <p className="text-sm text-muted-foreground">Global payment processing</p>
                        </div>
                      </div>
                      {isStripeStatusLoading ? (
                        <div className="h-6 w-24 bg-muted animate-pulse rounded-full" />
                      ) : isStripeConnected ? (
                        stripeAccountStatus?.capabilities?.card_payments === 'active' && 
                        stripeAccountStatus?.capabilities?.transfers === 'active' ? (
                          <Badge className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800" data-testid="badge-stripe-status">
                            Connected
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800" data-testid="badge-stripe-status">
                            Setup Required
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary" data-testid="badge-stripe-status">
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>135+ currencies</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Apple Pay & Google Pay</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Direct to your account</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>1.5% platform fee</span>
                      </div>
                    </div>

                    {isStripeConnected ? (
                      isStripeStatusLoading ? (
                        <div className="space-y-3">
                          <div className="h-16 bg-muted animate-pulse rounded-lg" />
                          <div className="h-10 bg-muted animate-pulse rounded" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Check for non-active capabilities - critical for payment processing */}
                          {stripeAccountStatus?.capabilities && 
                           (stripeAccountStatus.capabilities.card_payments !== 'active' || 
                            stripeAccountStatus.capabilities.transfers !== 'active') && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                              <p className="text-sm text-red-800 dark:text-red-200">
                                <strong>Setup Required:</strong> Your Stripe account needs to be fully activated. 
                                {stripeAccountStatus.capabilities.card_payments === 'pending' || stripeAccountStatus.capabilities.transfers === 'pending' 
                                  ? ' Your account is pending review by Stripe.' 
                                  : ' Please complete the onboarding process below to accept payments.'}
                              </p>
                            </div>
                          )}
                          
                          {/* Show payout status if charges are enabled */}
                          {canAcceptPayments && !canReceivePayouts && 
                           stripeAccountStatus?.capabilities?.card_payments === 'active' && 
                           stripeAccountStatus?.capabilities?.transfers === 'active' && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                              <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>Payments Enabled:</strong> You can accept payments! Add bank details to receive payouts.
                              </p>
                            </div>
                          )}
                          {canAcceptPayments && canReceivePayouts && 
                           stripeAccountStatus?.capabilities?.card_payments === 'active' && 
                           stripeAccountStatus?.capabilities?.transfers === 'active' && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                              <p className="text-sm text-green-800 dark:text-green-200">
                                <strong>Fully Enabled:</strong> You can accept payments and receive payouts.
                              </p>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            {canAcceptPayments && !canReceivePayouts && (
                              <Button 
                                onClick={() => setIsPayoutsModalOpen(true)}
                                data-testid="button-add-bank-details"
                                className="w-full"
                              >
                                Add Bank Details
                              </Button>
                            )}
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => handleConnectStripe(false)}
                                data-testid="button-update-stripe"
                                className="flex-1"
                              >
                                {stripeAccountStatus?.capabilities?.card_payments !== 'active' || 
                                 stripeAccountStatus?.capabilities?.transfers !== 'active' 
                                  ? 'Complete Onboarding' 
                                  : 'Update Account'}
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => handleConnectStripe(true)}
                                data-testid="button-restart-stripe"
                                className="flex-1"
                              >
                                Start Over
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => disconnectStripeMutation.mutate()}
                                disabled={disconnectStripeMutation.isPending}
                                data-testid="button-disconnect-stripe"
                                className="flex-1"
                              >
                                {disconnectStripeMutation.isPending ? "Disconnecting..." : "Disconnect"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <Button
                        onClick={() => handleConnectStripe(false)}
                        data-testid="button-connect-stripe"
                        className="w-full"
                      >
                        Connect Stripe Account
                      </Button>
                    )}
                  </div>

                  {/* PayPal Provider */}
                  <div className="border rounded-lg p-6 space-y-4 opacity-60">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">PayPal</h3>
                          <p className="text-sm text-muted-foreground">Trusted payment platform</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>200+ countries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Buyer protection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Direct to your account</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>1.5% platform fee</span>
                      </div>
                    </div>

                    <Button variant="outline" disabled data-testid="button-connect-paypal" className="w-full">
                      Connect PayPal Account
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Connect Your Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Link your existing account or create a new one with minimal information
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Receive Payments Directly</h4>
                      <p className="text-sm text-muted-foreground">
                        Funds go straight to your account - Upfirst never holds your money
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Platform Fee & Branding</h4>
                      <p className="text-sm text-muted-foreground">
                        We collect 1.5% platform fee automatically. Buyers see YOUR name on their statement, not Upfirst
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Stripe Country Selector */}
      <StripeCountrySelector
        isOpen={isCountrySelectorOpen}
        onClose={() => {
          setIsCountrySelectorOpen(false);
          setPendingStripeAction(null);
        }}
        onCountrySelected={handleCountrySelected}
      />

      {/* Stripe Embedded Onboarding Modal */}
      {user?.stripeConnectedAccountId && (
        <>
          <StripeOnboardingModal
            isOpen={isStripeModalOpen}
            onClose={() => setIsStripeModalOpen(false)}
            accountId={user.stripeConnectedAccountId}
            purpose="onboarding"
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              setIsStripeModalOpen(false);
            }}
          />
          <StripeOnboardingModal
            isOpen={isPayoutsModalOpen}
            onClose={() => setIsPayoutsModalOpen(false)}
            accountId={user.stripeConnectedAccountId}
            purpose="payouts"
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              setIsPayoutsModalOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
