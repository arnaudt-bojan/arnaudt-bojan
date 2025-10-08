import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  ExternalLink, 
  AlertCircle,
  Settings,
  Link as LinkIcon,
  Unlink,
  Target,
  Megaphone
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";

export default function MetaAdsSetup() {
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const { data: settings, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/meta-settings"],
  });

  const handleConnectFacebook = () => {
    setConnecting(true);
    // Redirect to backend OAuth endpoint which will redirect to Facebook
    window.location.href = "/api/meta-auth/connect";
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch("/api/meta-auth/disconnect", {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        toast({
          title: "Disconnected",
          description: "Your Facebook account has been disconnected",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect",
        variant: "destructive",
      });
    }
  };

  const isConnected = settings?.connected && settings?.accessToken;

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
            Connect your Facebook account to promote products on Facebook & Instagram
          </p>
        </div>

        {/* Connection Status */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isConnected ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
              }`}>
                {isConnected ? (
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <LinkIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {isConnected ? "Connected to Facebook" : "Not Connected"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? `Account: ${settings?.accountName || "Facebook Business Account"}`
                    : "Connect your Facebook account to start creating ads"
                  }
                </p>
              </div>
            </div>
            
            {isConnected ? (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="gap-2"
                data-testid="button-disconnect"
              >
                <Unlink className="h-4 w-4" />
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleConnectFacebook}
                disabled={connecting}
                className="gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90"
                data-testid="button-connect-facebook"
              >
                <SiFacebook className="h-4 w-4" />
                {connecting ? "Connecting..." : "Connect with Facebook"}
              </Button>
            )}
          </div>
        </Card>

        {/* What You'll Get */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            What You Can Do
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
              <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Create Ad Campaigns</h3>
                <p className="text-sm text-muted-foreground">
                  Promote your products on Facebook and Instagram with targeted ads
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
              <Settings className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Full Campaign Control</h3>
                <p className="text-sm text-muted-foreground">
                  Set budgets, target audiences, and customize ad creative
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
              <SiFacebook className="h-5 w-5 text-[#1877F2] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Facebook Ads</h3>
                <p className="text-sm text-muted-foreground">
                  Reach billions of users on the world's largest social network
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
              <SiInstagram className="h-5 w-5 text-[#E4405F] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Instagram Ads</h3>
                <p className="text-sm text-muted-foreground">
                  Engage visual shoppers on Instagram's feed and stories
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* How It Works */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            How It Works
          </h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Connect Your Facebook Account</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Connect with Facebook" and authorize Uppshop to access your ad account. 
                  You'll need a Facebook Business Manager account with an ad account set up.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Select Products to Promote</h3>
                <p className="text-sm text-muted-foreground">
                  Go to your Products page and click "Promote" on any product you want to advertise. 
                  The product details will be automatically used in your ad.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Configure & Launch Campaign</h3>
                <p className="text-sm text-muted-foreground">
                  Set your budget, target audience, and ad creative. Then launch your campaign 
                  to start reaching customers on Facebook and Instagram!
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Requirements */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Requirements</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Facebook Business Account</p>
                <p className="text-sm text-muted-foreground">
                  Create one at{" "}
                  <a 
                    href="https://business.facebook.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    business.facebook.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Ad Account</p>
                <p className="text-sm text-muted-foreground">
                  Set up in Business Manager → Business Settings → Ad Accounts
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Payment Method</p>
                <p className="text-sm text-muted-foreground">
                  Add a payment method to your ad account for running campaigns
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  First Time Setup
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  If you don't have a Business Manager account yet, you'll be prompted to create one 
                  during the connection process. This only takes a few minutes!
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
