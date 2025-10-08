import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  ExternalLink, 
  AlertCircle,
  Settings,
  Key,
  CreditCard,
  Target
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";

const metaSetupSchema = z.object({
  appId: z.string().min(1, "App ID is required"),
  appSecret: z.string().min(1, "App Secret is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  adAccountId: z.string().min(1, "Ad Account ID is required (format: act_XXXXX)"),
});

type MetaSetupForm = z.infer<typeof metaSetupSchema>;

export default function MetaAdsSetup() {
  const { toast } = useToast();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/meta-settings"],
  });

  const form = useForm<MetaSetupForm>({
    resolver: zodResolver(metaSetupSchema),
    defaultValues: {
      appId: settings?.appId || "",
      appSecret: settings?.appSecret || "",
      accessToken: settings?.accessToken || "",
      adAccountId: settings?.adAccountId || "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: MetaSetupForm) => {
      return await apiRequest("POST", "/api/meta-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta-settings"] });
      toast({
        title: "Settings saved",
        description: "Your Meta API credentials have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const testConnection = async () => {
    const values = form.getValues();
    if (!values.accessToken || !values.adAccountId) {
      toast({
        title: "Missing credentials",
        description: "Please fill in access token and ad account ID",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus("idle");

    try {
      await apiRequest("POST", "/api/meta-settings/test", {
        accessToken: values.accessToken,
        adAccountId: values.adAccountId,
      });
      setConnectionStatus("success");
      toast({
        title: "Connection successful",
        description: "Your Meta API credentials are working correctly!",
      });
    } catch (error: any) {
      setConnectionStatus("error");
      toast({
        title: "Connection failed",
        description: error.message || "Unable to connect to Meta API",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const onSubmit = (data: MetaSetupForm) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <SiFacebook className="h-8 w-8 text-[#1877F2]" />
              <SiInstagram className="h-8 w-8 text-[#E4405F]" />
            </div>
            <h1 className="text-4xl font-bold">Meta Ads Integration</h1>
          </div>
          <p className="text-muted-foreground">
            Connect your Facebook & Instagram advertising account to promote products
          </p>
        </div>

        {/* Setup Instructions */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Instructions
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Create Meta Developer App</h3>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">developers.facebook.com <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Click "My Apps" → "Create App"</li>
                  <li>Select "Other" use case, then "Business" app type</li>
                  <li>Add "Marketing API" product to your app</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Get Your Credentials</h3>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li><strong>App ID & Secret:</strong> Found in app dashboard → Settings → Basic</li>
                  <li><strong>Access Token:</strong> Tools → Graph API Explorer</li>
                  <li>Select your app, add permissions: <Badge variant="outline" className="ml-1">ads_management</Badge> <Badge variant="outline">ads_read</Badge></li>
                  <li>Generate long-lived token (60 days) or System User token (non-expiring)</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Setup Business Manager</h3>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Create or login to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Meta Business Manager <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Link your ad account to Business Manager</li>
                  <li>Get your Ad Account ID (format: act_XXXXX)</li>
                  <li>Ensure your app has access to the ad account</li>
                </ul>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Important Security Note</p>
                  <p className="text-muted-foreground">
                    Your access tokens will be securely stored and encrypted. We recommend using a System User token 
                    with limited permissions for production use.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Configuration Form */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Configuration
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="appId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="1234567890123456" 
                        {...field} 
                        data-testid="input-app-id"
                      />
                    </FormControl>
                    <FormDescription>
                      Your Meta App ID from the developer dashboard
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Secret</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="••••••••••••••••••••••••••••••••" 
                        {...field} 
                        data-testid="input-app-secret"
                      />
                    </FormControl>
                    <FormDescription>
                      Your Meta App Secret (keep this confidential)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Token</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                        {...field} 
                        data-testid="input-access-token"
                      />
                    </FormControl>
                    <FormDescription>
                      Long-lived user token or System User token with ads_management permission
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="adAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad Account ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="act_123456789012345" 
                        {...field} 
                        data-testid="input-ad-account-id"
                      />
                    </FormControl>
                    <FormDescription>
                      Your Meta Ad Account ID (must start with "act_")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={testingConnection}
                  data-testid="button-test-connection"
                >
                  {testingConnection ? "Testing..." : "Test Connection"}
                </Button>
                {connectionStatus === "success" && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                )}
                {connectionStatus === "error" && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Connection Failed
                  </Badge>
                )}
              </div>

              <div className="pt-4 border-t">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        {/* Quick Links */}
        <Card className="p-6 mt-6">
          <h3 className="font-semibold mb-4">Helpful Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="https://developers.facebook.com/docs/marketing-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg hover-elevate border"
            >
              <Target className="h-4 w-4" />
              <span className="text-sm">Marketing API Documentation</span>
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
            <a
              href="https://developers.facebook.com/tools/explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg hover-elevate border"
            >
              <Key className="h-4 w-4" />
              <span className="text-sm">Graph API Explorer</span>
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
            <a
              href="https://business.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg hover-elevate border"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">Business Manager</span>
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
            <a
              href="https://developers.facebook.com/tools/debug/accesstoken"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg hover-elevate border"
            >
              <CreditCard className="h-4 w-4" />
              <span className="text-sm">Access Token Debugger</span>
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
