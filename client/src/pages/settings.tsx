import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { User, Settings as SettingsIcon, CreditCard, Image, Globe, Copy, CheckCircle } from "lucide-react";

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

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type BrandingForm = z.infer<typeof brandingSchema>;
type UsernameForm = z.infer<typeof usernameSchema>;
type CustomDomainForm = z.infer<typeof customDomainSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentProvider, setPaymentProvider] = useState<string>(user?.paymentProvider || "stripe");
  const [copiedUsername, setCopiedUsername] = useState(false);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  const handleConnectStripe = async () => {
    try {
      const response = await apiRequest("GET", "/api/stripe/connect", {});
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

  const isSeller = user?.role === "seller" || user?.role === "owner" || user?.role === "admin";
  const isStripeConnected = user?.stripeConnectedAccountId;

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
        <TabsList className={`grid w-full ${isSeller ? 'grid-cols-5' : 'grid-cols-3'}`} data-testid="tabs-settings">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" data-testid="tab-password">Password</TabsTrigger>
          {isSeller && (
            <>
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
          <TabsContent value="store">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Store Username</CardTitle>
                  <CardDescription>Your unique store identifier and subdomain</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                                placeholder="Enter your Instagram handle or custom username" 
                                data-testid="input-username" 
                              />
                            </FormControl>
                            <FormDescription>
                              Use your Instagram handle or any custom username (3-20 characters, letters, numbers, and underscores only)
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
