import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
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
import { User, Settings as SettingsIcon, CreditCard, Image, Globe, Copy, CheckCircle, Tag, Plus, Edit, Trash2, DollarSign, Clock, Package, MapPin, Wallet, Receipt, X, Users, Shield, Mail, UserPlus, Rocket, FileText } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { getStoreUrl } from "@/lib/store-url";
import { ShippingMatrixManager } from "@/components/shipping-matrix-manager";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { StripeOnboardingModal } from "@/components/stripe-onboarding-modal";
import { StripeCountrySelector } from "@/components/stripe-country-selector";
import { UniversalImageUpload } from "@/components/universal-image-upload";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { SubscriptionPricingDialog } from "@/components/subscription-pricing-dialog";
import { SavedAddressesManager } from "@/components/saved-addresses-manager";
import { SavedPaymentMethodsManager } from "@/components/saved-payment-methods-manager";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
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

const customDomainSchema = z.object({
  customDomain: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, "Invalid domain format")
    .or(z.literal("")),
});

const shippingSchema = z.object({
  shippingPrice: z.string().min(0, "Shipping price must be 0 or greater"),
});

type ProfileForm = z.infer<typeof profileSchema>;
type BrandingForm = z.infer<typeof brandingSchema>;
type AboutContactForm = z.infer<typeof aboutContactSchema>;
type UsernameForm = z.infer<typeof usernameSchema>;
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
  
  const { data: subscriptionStatus, refetch: refetchSubscription } = useQuery<{
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

            {!subscriptionStatus?.status && (
              <div className="bg-muted border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Subscribe to activate your store and start selling.
                </p>
                <Button 
                  onClick={() => setShowSubscriptionDialog(true)}
                  data-testid="button-subscribe"
                >
                  Subscribe Now
                </Button>
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
                        // Switch to Addresses & Payments tab
                        const addressesTab = document.querySelector('[value="addresses"]');
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
                    Update your payment method in the Addresses & Payments tab. Your subscription will use the default card.
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
  const [inviteRole, setInviteRole] = useState<string>("editor");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const roleColors = {
    owner: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    admin: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
    editor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    viewer: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  };

  const roleDescriptions = {
    admin: "Can manage products, orders, and invite team members",
    editor: "Can manage products and orders",
    viewer: "Read-only access to store dashboard",
  };

  const { data: team, isLoading: teamLoading } = useQuery<any[]>({
    queryKey: ["/api/team"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<any[]>({
    queryKey: ["/api/invitations"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return await apiRequest("POST", "/api/invitations", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail("");
      setInviteRole("editor");
      
      if (data.invitationLink) {
        navigator.clipboard.writeText(data.invitationLink);
        setCopiedLink(data.invitationLink);
        toast({
          title: "Link copied",
          description: "Invitation link copied to clipboard",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/team/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/team/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({
        title: "Team member removed",
        description: "Team member has been successfully removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team member",
        variant: "destructive",
      });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest("DELETE", `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
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
    if (!inviteEmail || !inviteRole) return;
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
    setIsInviteDialogOpen(false);
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const copyInvitationLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
    toast({
      title: "Link copied",
      description: "Invitation link copied to clipboard",
    });
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
                    Send an invitation to join your team with a specific role
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
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger data-testid="select-invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {roleDescriptions[inviteRole as keyof typeof roleDescriptions]}
                    </p>
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
            {/* Team Members Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4" />
                <h3 className="font-semibold">Team Members</h3>
              </div>
              {teamLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : team && team.length > 0 ? (
                <div className="space-y-3">
                  {team.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={roleColors[member.role as keyof typeof roleColors]}
                        >
                          {member.role}
                        </Badge>
                        {member.role !== "owner" && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => handleRoleChange(member.id, newRole)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTeamMemberMutation.mutate(member.id)}
                              disabled={deleteTeamMemberMutation.isPending}
                              data-testid={`button-delete-member-${member.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

            {/* Pending Invitations Section */}
            {invitations && invitations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-4 w-4" />
                  <h3 className="font-semibold">Pending Invitations</h3>
                </div>
                <div className="space-y-3">
                  {invitations.map((invitation: any) => {
                    const invitationLink = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
                    return (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {invitation.role}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyInvitationLink(invitationLink)}
                            data-testid={`button-copy-invitation-${invitation.id}`}
                          >
                            {copiedLink === invitationLink ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                            disabled={deleteInvitationMutation.isPending}
                            data-testid={`button-delete-invitation-${invitation.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      contactEmail: user?.contactEmail || "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
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
  
  // Check if charges are enabled but payouts are not (progressive onboarding state)
  const canAcceptPayments = user?.stripeChargesEnabled === 1;
  const canReceivePayouts = user?.stripePayoutsEnabled === 1;

  // Fetch Stripe account status including capabilities
  const { data: stripeStatus } = useQuery<any>({
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
              <SelectItem value="profile">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </div>
              </SelectItem>
              <SelectItem value="addresses-payments">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span>Addresses & Payments</span>
                </div>
              </SelectItem>
              {isSeller && (
                <>
                  <SelectItem value="quick-setup">
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      <span>Quick Setup</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="subscription">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Subscription</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="branding-policies">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Branding & Policies</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="about-contact">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>About & Contact</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="payment">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Payment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="categories">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>Categories</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="shipping-matrix">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Shipping Matrix</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tax">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      <span>Tax Settings</span>
                    </div>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop/Tablet: Wrapping Tabs Grid */}
        <TabsList className="hidden md:flex w-full flex-wrap gap-2 h-auto p-2" data-testid="tabs-settings">
          <TabsTrigger value="profile" data-testid="tab-profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="addresses-payments" data-testid="tab-addresses-payments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden md:inline xl:hidden">Addresses</span>
            <span className="hidden xl:inline">Addresses & Payments</span>
          </TabsTrigger>
          {isSeller && (
            <>
              <TabsTrigger value="quick-setup" data-testid="tab-quick-setup" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                <span>Quick Setup</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" data-testid="tab-subscription" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Subscription</span>
              </TabsTrigger>
              <TabsTrigger value="branding-policies" data-testid="tab-branding-policies" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Branding & Policies</span>
              </TabsTrigger>
              <TabsTrigger value="about-contact" data-testid="tab-about-contact" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>About & Contact</span>
              </TabsTrigger>
              <TabsTrigger value="payment" data-testid="tab-payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Payment</span>
              </TabsTrigger>
              <TabsTrigger value="categories" data-testid="tab-categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>Categories</span>
              </TabsTrigger>
              <TabsTrigger value="shipping-matrix" data-testid="tab-shipping-matrix" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden md:inline xl:hidden">Shipping</span>
                <span className="hidden xl:inline">Shipping Matrix</span>
              </TabsTrigger>
              <TabsTrigger value="tax" data-testid="tab-tax" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span>Tax Settings</span>
              </TabsTrigger>
              <TabsTrigger value="team" data-testid="tab-team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Team</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} disabled data-testid="input-email" />
                        </FormControl>
                        <FormDescription>Email cannot be changed</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            Custom email for customer inquiries (defaults to login email if not set)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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

          {isSeller && (
            <Card>
              <CardHeader>
                <CardTitle>Store Username</CardTitle>
                <CardDescription>
                  Your unique store username determines your storefront URL
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...usernameForm}>
                  <form onSubmit={usernameForm.handleSubmit((data) => updateUsernameMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={usernameForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="yourstorename"
                              data-testid="input-username" 
                            />
                          </FormControl>
                          <FormDescription>
                            3-20 characters, letters, numbers, and underscores only. Your store will be at: {field.value || 'username'}.upfirst.io
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={updateUsernameMutation.isPending}
                      data-testid="button-save-username"
                    >
                      {updateUsernameMutation.isPending ? "Saving..." : "Update Username"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="addresses-payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Addresses & Payments
              </CardTitle>
              <CardDescription>
                Manage your saved addresses and payment methods for faster checkout
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <SavedAddressesManager />
              <div className="border-t pt-8">
                <SavedPaymentMethodsManager />
              </div>
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
                    {user?.username ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">Set up your store URL</p>
                      <p className="text-xs text-muted-foreground">Choose a username or connect Instagram</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {user?.storeLogo ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload your store logo</p>
                      <p className="text-xs text-muted-foreground">Appears in navigation header</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {user?.storeBanner ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload a store banner (optional)</p>
                      <p className="text-xs text-muted-foreground">Hero image at the top of your storefront</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Store URL Setup */}
              <Card>
                <CardHeader>
                  <CardTitle>Store URL</CardTitle>
                  <CardDescription>Your unique store link that customers will visit</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Store URL */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Your Store URL</p>
                    <div className="flex gap-2">
                      <Input
                        value={user?.username ? getStoreUrl(user.username) : 'Set username below'}
                        readOnly
                        className="flex-1"
                        data-testid="input-store-url-quick-setup"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (!user?.username) return;
                          const url = getStoreUrl(user.username);
                          if (!url) return;
                          navigator.clipboard.writeText(url);
                          setCopiedUsername(true);
                          setTimeout(() => setCopiedUsername(false), 2000);
                          toast({ title: "Copied!", description: "Store link copied to clipboard" });
                        }}
                        disabled={!user?.username}
                        data-testid="button-copy-store-url-quick-setup"
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
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => disconnectInstagramMutation.mutate()}
                          disabled={disconnectInstagramMutation.isPending}
                          data-testid="button-disconnect-instagram-quick-setup"
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
                        <p className="text-sm text-muted-foreground">
                          Connect your Instagram to use your verified handle as your store URL
                        </p>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                          onClick={handleConnectInstagram}
                          data-testid="button-connect-instagram-quick-setup"
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

                  {/* Custom Username */}
                  {!isInstagramConnected && (
                    <div className="space-y-3 pt-4 border-t">
                      <p className="text-sm font-medium">Or use a custom username</p>
                      <Form {...usernameForm}>
                        <form onSubmit={usernameForm.handleSubmit((data) => updateUsernameMutation.mutate(data))} className="space-y-3">
                          <FormField
                            control={usernameForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="yourusername" 
                                    data-testid="input-username-quick-setup" 
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  3-20 characters, letters, numbers, and underscores only
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={updateUsernameMutation.isPending}
                            data-testid="button-save-username-quick-setup"
                          >
                            {updateUsernameMutation.isPending ? "Saving..." : "Save Username"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                  )}

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
                      data-testid="input-custom-domain-quick-setup" 
                    />
                    <p className="text-xs text-muted-foreground">Connect your own domain to your store (coming soon)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Branding Setup */}
              <Card>
                <CardHeader>
                  <CardTitle>Store Branding</CardTitle>
                  <CardDescription>Customize your storefront appearance with logo and banner</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...brandingForm}>
                    <form onSubmit={brandingForm.handleSubmit((data) => updateBrandingMutation.mutate(data))} className="space-y-8">
                      {/* Logo Section */}
                      <div className="space-y-4">
                        <div className="border-b pb-3">
                          <h3 className="text-lg font-semibold">Store Logo</h3>
                          <p className="text-sm text-muted-foreground">Appears in the navigation header (200×200px square recommended)</p>
                        </div>
                        <FormField
                          control={brandingForm.control}
                          name="storeLogo"
                          render={({ field }) => (
                            <FormItem>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Banner Section */}
                      <div className="space-y-4">
                        <div className="border-b pb-3">
                          <h3 className="text-lg font-semibold">Store Banner (Optional)</h3>
                          <p className="text-sm text-muted-foreground">Hero image at the top of your store (1200×400px recommended)</p>
                        </div>
                        <FormField
                          control={brandingForm.control}
                          name="storeBanner"
                          render={({ field }) => (
                            <FormItem>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={updateBrandingMutation.isPending}
                        data-testid="button-save-branding-quick-setup"
                        className="w-full sm:w-auto"
                      >
                        {updateBrandingMutation.isPending ? "Saving..." : "Save Branding"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Preview Store */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Preview Your Store
                  </CardTitle>
                  <CardDescription>See how your store appears to buyers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user?.username ? (
                    <div className="space-y-4">
                      <iframe
                        src={`/products?preview=${user.username}`}
                        className="w-full aspect-video rounded-lg border"
                        title="Store Preview"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          asChild
                          data-testid="button-preview-store"
                        >
                          <Link href={`/products?preview=${user.username}`} target="_blank">
                            <Globe className="h-4 w-4 mr-2" />
                            Open Full Preview
                          </Link>
                        </Button>
                        <Button
                          className="flex-1"
                          asChild
                          data-testid="button-visit-store"
                        >
                          <a href={getStoreUrl(user.username)} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-2" />
                            Visit Live Store
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Set up your store username above to preview your storefront
                      </p>
                    </div>
                  )}
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

                    <Button 
                      type="submit" 
                      disabled={updateBrandingMutation.isPending}
                      data-testid="button-save-policies"
                      className="w-full sm:w-auto"
                    >
                      {updateBrandingMutation.isPending ? "Saving..." : "Save Policies"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isSeller && (
          <TabsContent value="about-contact">
            <div className="space-y-6">
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
            </div>
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
                      {isStripeConnected ? (
                        stripeStatus?.capabilities?.card_payments === 'active' && 
                        stripeStatus?.capabilities?.transfers === 'active' ? (
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
                      <div className="space-y-3">
                        {/* Check for non-active capabilities - critical for payment processing */}
                        {stripeStatus?.capabilities && 
                         (stripeStatus.capabilities.card_payments !== 'active' || 
                          stripeStatus.capabilities.transfers !== 'active') && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-sm text-red-800 dark:text-red-200">
                              <strong>Setup Required:</strong> Your Stripe account needs to be fully activated. 
                              {stripeStatus.capabilities.card_payments === 'pending' || stripeStatus.capabilities.transfers === 'pending' 
                                ? ' Your account is pending review by Stripe.' 
                                : ' Please complete the onboarding process below to accept payments.'}
                            </p>
                          </div>
                        )}
                        
                        {/* Show payout status if charges are enabled */}
                        {canAcceptPayments && !canReceivePayouts && 
                         stripeStatus?.capabilities?.card_payments === 'active' && 
                         stripeStatus?.capabilities?.transfers === 'active' && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                              <strong>Payments Enabled:</strong> You can accept payments! Add bank details to receive payouts.
                            </p>
                          </div>
                        )}
                        {canAcceptPayments && canReceivePayouts && 
                         stripeStatus?.capabilities?.card_payments === 'active' && 
                         stripeStatus?.capabilities?.transfers === 'active' && (
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
                              {stripeStatus?.capabilities?.card_payments !== 'active' || 
                               stripeStatus?.capabilities?.transfers !== 'active' 
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
