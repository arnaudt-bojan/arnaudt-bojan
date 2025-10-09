import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Settings as SettingsIcon, CreditCard, Image, Globe, Copy, CheckCircle, Tag, Plus, Edit, Trash2, DollarSign, Clock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const brandingSchema = z.object({
  storeBanner: z.string().url("Must be a valid URL").or(z.literal("")),
  storeLogo: z.string().url("Must be a valid URL").or(z.literal("")),
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
type PasswordForm = z.infer<typeof passwordSchema>;
type BrandingForm = z.infer<typeof brandingSchema>;
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  
  const { data: subscriptionStatus, refetch: refetchSubscription } = useQuery<{
    status: string | null;
    plan: string | null;
    trialEndsAt: string | null;
    hasPaymentMethod: boolean;
    subscription: any | null;
  }>({
    queryKey: ["/api/subscription/status"],
  });

  const setupPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/setup-payment", {});
      return await response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to setup payment method",
        variant: "destructive",
      });
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("POST", "/api/subscription/create", { plan });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription activated successfully!",
      });
      refetchSubscription();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create subscription",
        variant: "destructive",
      });
    },
  });

  const handlePaymentSuccess = () => {
    setClientSecret(null);
    refetchSubscription();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  const handleMakeStoreLive = () => {
    if (subscriptionStatus?.hasPaymentMethod) {
      createSubscriptionMutation.mutate(selectedPlan);
    } else {
      setupPaymentMutation.mutate();
    }
  };

  const daysRemaining = subscriptionStatus?.trialEndsAt 
    ? Math.ceil((new Date(subscriptionStatus.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
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
          {subscriptionStatus?.status === "trial" && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Free Trial Active</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {daysRemaining !== null && daysRemaining > 0
                  ? `${daysRemaining} days remaining in your trial`
                  : "Your trial has ended"}
              </p>
            </div>
          )}

          {subscriptionStatus?.status === "active" && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">Active Subscription</h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your {subscriptionStatus.plan} plan is active
              </p>
            </div>
          )}

          {!subscriptionStatus?.status && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Create your first product to start your 30-day free trial
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      {subscriptionStatus?.status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
            <CardDescription>
              {subscriptionStatus?.hasPaymentMethod
                ? "Payment method saved securely"
                : "Add a payment method to activate your store"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!subscriptionStatus?.hasPaymentMethod && !clientSecret && (
              <Button 
                onClick={() => setupPaymentMutation.mutate()} 
                disabled={setupPaymentMutation.isPending}
                data-testid="button-add-payment-method"
              >
                {setupPaymentMutation.isPending ? "Loading..." : "Add Payment Method"}
              </Button>
            )}

            {clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentSetupForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
              </Elements>
            )}

            {subscriptionStatus?.hasPaymentMethod && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>Payment method on file</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscription Plan Selection */}
      {subscriptionStatus?.status === "trial" && subscriptionStatus?.hasPaymentMethod && !subscriptionStatus?.subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>Select a subscription plan to activate your store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPlan === "monthly" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover-elevate"
                }`}
                onClick={() => setSelectedPlan("monthly")}
                data-testid="plan-monthly"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Monthly</h3>
                  <div className="text-2xl font-bold">$9.99</div>
                </div>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>

              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPlan === "annual" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover-elevate"
                }`}
                onClick={() => setSelectedPlan("annual")}
                data-testid="plan-annual"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Annual</h3>
                  <div className="text-2xl font-bold">$99</div>
                </div>
                <p className="text-sm text-muted-foreground">per year (Save $20)</p>
              </div>
            </div>

            <Button 
              onClick={() => createSubscriptionMutation.mutate(selectedPlan)}
              disabled={createSubscriptionMutation.isPending}
              className="w-full"
              data-testid="button-activate-subscription"
            >
              {createSubscriptionMutation.isPending ? "Activating..." : "Activate Store"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Make Store Live Button */}
      {subscriptionStatus?.status === "trial" && !subscriptionStatus?.hasPaymentMethod && (
        <Card>
          <CardHeader>
            <CardTitle>Make Your Store Live</CardTitle>
            <CardDescription>
              Add payment method and activate your store subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPlan === "monthly" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover-elevate"
                  }`}
                  onClick={() => setSelectedPlan("monthly")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Monthly</h3>
                    <div className="text-2xl font-bold">$9.99</div>
                  </div>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>

                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPlan === "annual" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover-elevate"
                  }`}
                  onClick={() => setSelectedPlan("annual")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Annual</h3>
                    <div className="text-2xl font-bold">$99</div>
                  </div>
                  <p className="text-sm text-muted-foreground">per year (Save $20)</p>
                </div>
              </div>

              <Button 
                onClick={handleMakeStoreLive}
                disabled={setupPaymentMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-make-store-live"
              >
                {setupPaymentMutation.isPending ? "Processing..." : "Make Store Live"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [paymentProvider, setPaymentProvider] = useState<string>(user?.paymentProvider || "stripe");
  const [copiedUsername, setCopiedUsername] = useState(false);

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
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const brandingForm = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      storeBanner: user?.storeBanner || "",
      storeLogo: user?.storeLogo || "",
    },
  });

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

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      return await apiRequest("PATCH", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: "Password updated", description: "Your password has been changed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update password", 
        variant: "destructive" 
      });
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

  const handleConnectStripe = async () => {
    try {
      const response = await apiRequest("GET", "/api/stripe/connect");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to connect Stripe account",
        variant: "destructive",
      });
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
  const isStripeConnected = user?.stripeConnectedAccountId;
  const isInstagramConnected = user?.instagramUsername;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full ${isSeller ? 'grid-cols-7' : 'grid-cols-3'}`} data-testid="tabs-settings">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" data-testid="tab-password">Password</TabsTrigger>
          {isSeller && (
            <>
              <TabsTrigger value="subscription" data-testid="tab-subscription">
                <DollarSign className="h-4 w-4 mr-2" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="store" data-testid="tab-store">
                <Globe className="h-4 w-4 mr-2" />
                Store
              </TabsTrigger>
              <TabsTrigger value="branding" data-testid="tab-branding">
                <Image className="h-4 w-4 mr-2" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="payment" data-testid="tab-payment">
                <CreditCard className="h-4 w-4 mr-2" />
                Payment
              </TabsTrigger>
              <TabsTrigger value="categories" data-testid="tab-categories">
                <Tag className="h-4 w-4 mr-2" />
                Categories
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
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
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" data-testid="input-currentPassword" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" data-testid="input-newPassword" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" data-testid="input-confirmPassword" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={updatePasswordMutation.isPending}
                    data-testid="button-change-password"
                  >
                    {updatePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {isSeller && (
          <TabsContent value="subscription">
            <SubscriptionTab user={user} />
          </TabsContent>
        )}

        {isSeller && (
          <TabsContent value="store">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Instagram Connection</CardTitle>
                  <CardDescription>Connect your Instagram account to use it as your store username</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isInstagramConnected ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm font-medium text-green-800 dark:text-green-300">Instagram Connected</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Connected Account:</p>
                          <code className="text-sm bg-background px-3 py-2 rounded border inline-block">
                            @{user?.instagramUsername}
                          </code>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-muted/50 rounded-md space-y-2">
                        <p className="text-sm font-medium">Your Store URL:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-background px-3 py-2 rounded border flex-1">
                            {user?.username}.uppshop.com
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(`${user?.username}.uppshop.com`)}
                            data-testid="button-copy-store-url"
                          >
                            {copiedUsername ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        onClick={() => disconnectInstagramMutation.mutate()}
                        disabled={disconnectInstagramMutation.isPending}
                        data-testid="button-disconnect-instagram"
                      >
                        {disconnectInstagramMutation.isPending ? "Disconnecting..." : "Disconnect Instagram"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md space-y-2">
                        <h4 className="font-semibold text-sm">Why Connect Instagram?</h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Use your verified Instagram username as your store URL</li>
                          <li>Build trust with customers using your established brand</li>
                          <li>Automatic authentication ensures username ownership</li>
                        </ul>
                      </div>

                      {user?.username && (
                        <div className="p-4 bg-muted/50 rounded-md space-y-2">
                          <p className="text-sm font-medium">Current Store URL:</p>
                          <code className="text-sm bg-background px-3 py-2 rounded border inline-block">
                            {user?.username}.uppshop.com
                          </code>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Button
                          onClick={handleConnectInstagram}
                          data-testid="button-connect-instagram"
                          className="w-full"
                        >
                          Connect Instagram Account
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Opens in a popup window. Make sure pop-ups are enabled.
                        </p>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Or use a custom username:</p>
                        <Form {...usernameForm}>
                          <form onSubmit={usernameForm.handleSubmit((data) => updateUsernameMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={usernameForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Custom Username</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Enter a custom username" 
                                      data-testid="input-username" 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    3-20 characters, letters, numbers, and underscores only
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
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Domain</CardTitle>
                  <CardDescription>Connect your own domain to your store</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Form {...customDomainForm}>
                    <form onSubmit={customDomainForm.handleSubmit((data) => updateCustomDomainMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={customDomainForm.control}
                        name="customDomain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="mystore.com" 
                                data-testid="input-custom-domain" 
                              />
                            </FormControl>
                            <FormDescription>
                              Enter your domain without "www" (e.g., mystore.com)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={updateCustomDomainMutation.isPending}
                        data-testid="button-save-custom-domain"
                      >
                        {updateCustomDomainMutation.isPending ? "Saving..." : "Save Domain"}
                      </Button>
                    </form>
                  </Form>

                  {user?.customDomain && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md space-y-3">
                      <h4 className="font-semibold text-sm">DNS Configuration Required</h4>
                      <p className="text-sm text-muted-foreground">
                        Add these DNS records to your domain registrar:
                      </p>
                      <div className="space-y-2">
                        <div className="bg-background p-3 rounded border">
                          <p className="text-xs font-mono">
                            <span className="font-semibold">Type:</span> A<br />
                            <span className="font-semibold">Name:</span> @ (or your domain)<br />
                            <span className="font-semibold">Value:</span> [Contact support for IP]
                          </p>
                        </div>
                        <div className="bg-background p-3 rounded border">
                          <p className="text-xs font-mono">
                            <span className="font-semibold">Type:</span> TXT<br />
                            <span className="font-semibold">Name:</span> @ (or your domain)<br />
                            <span className="font-semibold">Value:</span> [Contact support for verification code]
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        DNS changes can take 24-48 hours to propagate. Contact support if you need assistance.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {isSeller && (
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Store Branding</CardTitle>
                <CardDescription>Customize your storefront appearance</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...brandingForm}>
                  <form onSubmit={brandingForm.handleSubmit((data) => updateBrandingMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={brandingForm.control}
                      name="storeBanner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Banner URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://example.com/banner.jpg" data-testid="input-storeBanner" />
                          </FormControl>
                          <FormDescription>Banner image displayed on your storefront</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={brandingForm.control}
                      name="storeLogo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Logo URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://example.com/logo.png" data-testid="input-storeLogo" />
                          </FormControl>
                          <FormDescription>Logo replacing "Uppshop" in the header</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={updateBrandingMutation.isPending}
                      data-testid="button-save-branding"
                    >
                      {updateBrandingMutation.isPending ? "Saving..." : "Save Branding"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isSeller && (
          <TabsContent value="categories">
            <CategoryManagement />
          </TabsContent>
        )}

        {isSeller && (
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Provider</CardTitle>
                <CardDescription>Configure how you receive payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="payment-provider">Payment Provider</Label>
                  <Select
                    value={paymentProvider}
                    onValueChange={(value) => {
                      setPaymentProvider(value);
                      updatePaymentProviderMutation.mutate(value);
                    }}
                  >
                    <SelectTrigger id="payment-provider" data-testid="select-payment-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Currently using: <span className="font-medium">{paymentProvider === "stripe" ? "Stripe" : "PayPal"}</span>
                  </p>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3">Connect Your Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your {paymentProvider === "stripe" ? "Stripe" : "PayPal"} account to start receiving payments. You can connect an existing account or create a new one during the setup process.
                  </p>
                  
                  {paymentProvider === "stripe" ? (
                    <>
                      {isStripeConnected ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-900 dark:text-green-100">
                              Stripe account connected
                            </span>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={() => disconnectStripeMutation.mutate()}
                            disabled={disconnectStripeMutation.isPending}
                            data-testid="button-disconnect-stripe"
                          >
                            {disconnectStripeMutation.isPending ? "Disconnecting..." : "Disconnect Stripe"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="default" 
                          onClick={handleConnectStripe}
                          data-testid="button-connect-stripe"
                        >
                          Connect Stripe Account
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button variant="outline" disabled data-testid="button-connect-paypal">
                      Connect PayPal Account (Coming Soon)
                    </Button>
                  )}
                  
                  <div className="mt-4 p-4 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground">
                      <strong className="font-semibold">What happens when you connect:</strong>
                      <br />
                      • You'll be redirected to {paymentProvider === "stripe" ? "Stripe" : "PayPal"} to authorize the connection
                      <br />
                      • You can use an existing account or create a new one
                      <br />
                      • Start receiving payments immediately after connecting
                      <br />
                      • Manage payouts and advanced features in your {paymentProvider === "stripe" ? "Stripe" : "PayPal"} dashboard
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Shipping Settings</CardTitle>
                <CardDescription>Configure shipping price for your products</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...shippingForm}>
                  <form onSubmit={shippingForm.handleSubmit((data) => updateShippingMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={shippingForm.control}
                      name="shippingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flat Rate Shipping Price</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              placeholder="0.00" 
                              data-testid="input-shipping-price" 
                            />
                          </FormControl>
                          <FormDescription>
                            Set a flat rate shipping price for all orders. Enter 0 for free shipping.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={updateShippingMutation.isPending}
                      data-testid="button-save-shipping"
                    >
                      {updateShippingMutation.isPending ? "Saving..." : "Save Shipping Price"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
