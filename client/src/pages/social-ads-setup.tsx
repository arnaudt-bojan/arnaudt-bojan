import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  ExternalLink, 
  AlertCircle,
  LinkIcon,
  Unlink,
  Target,
  Megaphone
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiX } from "react-icons/si";

function MetaIntegration() {
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const { data: settings, refetch } = useQuery<any>({
    queryKey: ["/api/meta-settings"],
  });

  const handleConnect = () => {
    setConnecting(true);
    
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      "/api/meta-auth/connect",
      "Facebook Login",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "META_AUTH_SUCCESS") {
        setConnecting(false);
        toast({ title: "Connected!", description: "Facebook account connected successfully" });
        refetch();
        popup?.close();
        window.removeEventListener("message", handleMessage);
      } else if (event.data.type === "META_AUTH_ERROR") {
        setConnecting(false);
        toast({ title: "Connection failed", description: event.data.error || "Failed to connect", variant: "destructive" });
        popup?.close();
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setConnecting(false);
        window.removeEventListener("message", handleMessage);
      }
    }, 1000);
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch("/api/meta-auth/disconnect", { method: "POST", credentials: "include" });
      if (response.ok) {
        toast({ title: "Disconnected", description: "Facebook account disconnected" });
        refetch();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
    }
  };

  const isConnected = settings?.connected && settings?.accessToken;

  return (
    <div className="space-y-6">
      <Card className="p-6">
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
                {isConnected ? `Account: ${settings?.accountName}` : "Connect to start creating ads"}
              </p>
            </div>
          </div>
          
          {isConnected ? (
            <Button variant="outline" onClick={handleDisconnect} className="gap-2" data-testid="button-disconnect-meta">
              <Unlink className="h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={connecting} className="gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90" data-testid="button-connect-facebook">
              <SiFacebook className="h-4 w-4" />
              {connecting ? "Connecting..." : "Connect with Facebook"}
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
            <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Targeted Campaigns</h3>
              <p className="text-sm text-muted-foreground">Reach your ideal audience on Facebook & Instagram</p>
            </div>
          </div>
          
          <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
            <SiFacebook className="h-5 w-5 text-[#1877F2] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Facebook Ads</h3>
              <p className="text-sm text-muted-foreground">Reach billions on the world's largest social network</p>
            </div>
          </div>
          
          <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
            <SiInstagram className="h-5 w-5 text-[#E4405F] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Instagram Ads</h3>
              <p className="text-sm text-muted-foreground">Engage visual shoppers with stunning ads</p>
            </div>
          </div>

          <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
            <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Audience Targeting</h3>
              <p className="text-sm text-muted-foreground">Age, gender, location, and interest-based targeting</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Requirements</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Facebook Business Account</p>
              <p className="text-sm text-muted-foreground">
                Create at <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">business.facebook.com <ExternalLink className="h-3 w-3 inline" /></a>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Ad Account & Payment Method</p>
              <p className="text-sm text-muted-foreground">Set up in Business Manager</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TikTokIntegration() {
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const { data: settings, refetch } = useQuery<any>({
    queryKey: ["/api/tiktok-settings"],
  });

  const handleConnect = () => {
    setConnecting(true);
    
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      "/api/tiktok-auth/connect",
      "TikTok Login",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "TIKTOK_AUTH_SUCCESS") {
        setConnecting(false);
        toast({ title: "Connected!", description: "TikTok account connected successfully" });
        refetch();
        popup?.close();
        window.removeEventListener("message", handleMessage);
      } else if (event.data.type === "TIKTOK_AUTH_ERROR") {
        setConnecting(false);
        toast({ title: "Connection failed", description: event.data.error || "Failed to connect", variant: "destructive" });
        popup?.close();
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setConnecting(false);
        window.removeEventListener("message", handleMessage);
      }
    }, 1000);
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch("/api/tiktok-auth/disconnect", { method: "POST", credentials: "include" });
      if (response.ok) {
        toast({ title: "Disconnected", description: "TikTok account disconnected" });
        refetch();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
    }
  };

  const isConnected = settings?.connected && settings?.accessToken;

  return (
    <div className="space-y-6">
      <Card className="p-6">
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
                {isConnected ? "Connected to TikTok" : "Not Connected"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isConnected ? `Account: ${settings?.advertiserName}` : "Connect to start creating ads"}
              </p>
            </div>
          </div>
          
          {isConnected ? (
            <Button variant="outline" onClick={handleDisconnect} className="gap-2" data-testid="button-disconnect-tiktok">
              <Unlink className="h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={connecting} className="gap-2 bg-black hover:bg-black/90 text-white" data-testid="button-connect-tiktok">
              <SiTiktok className="h-4 w-4" />
              {connecting ? "Connecting..." : "Connect with TikTok"}
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
            <SiTiktok className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">TikTok For Business</h3>
              <p className="text-sm text-muted-foreground">Create video ads for TikTok's engaged audience</p>
            </div>
          </div>
          
          <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
            <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Viral Potential</h3>
              <p className="text-sm text-muted-foreground">Reach younger demographics with trending content</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Requirements</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">TikTok For Business Account</p>
              <p className="text-sm text-muted-foreground">
                Create at <a href="https://business-api.tiktok.com/portal" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TikTok Business Center <ExternalLink className="h-3 w-3 inline" /></a>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Advertiser Account & Payment</p>
              <p className="text-sm text-muted-foreground">Set up in TikTok Ads Manager</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function XIntegration() {
  const { toast } = useToast();

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/x-settings"],
  });

  const handleConnect = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      "/api/x-auth/connect",
      "X (Twitter) Setup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
  };

  const isConnected = settings?.connected && settings?.accessToken;

  return (
    <div className="space-y-6">
      <Card className="p-6">
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
                {isConnected ? "Connected to X" : "Not Connected"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isConnected ? `Account: ${settings?.accountName}` : "OAuth 1.0a setup required"}
              </p>
            </div>
          </div>
          
          <Button onClick={handleConnect} className="gap-2 bg-black hover:bg-black/90 text-white" data-testid="button-connect-x">
            <SiX className="h-4 w-4" />
            Setup X Ads
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          OAuth 1.0a Authentication
        </h2>
        <p className="text-muted-foreground mb-4">
          X (Twitter) Ads API uses OAuth 1.0a authentication, which requires additional setup. Contact support for assistance with integration.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">X Developer Account</p>
              <p className="text-sm text-muted-foreground">
                Apply at <a href="https://developer.x.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developer.x.com <ExternalLink className="h-3 w-3 inline" /></a>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Ads API Access</p>
              <p className="text-sm text-muted-foreground">Request access through X Ads support</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SocialAdsSetup() {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Social Media Advertising</h1>
          <p className="text-muted-foreground">
            Connect your accounts and promote products across social platforms
          </p>
        </div>

        <Tabs defaultValue="meta" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="tabs-social-platforms">
            <TabsTrigger value="meta" className="gap-2" data-testid="tab-meta">
              <SiFacebook className="h-4 w-4" />
              Meta (Facebook/Instagram)
            </TabsTrigger>
            <TabsTrigger value="tiktok" className="gap-2" data-testid="tab-tiktok">
              <SiTiktok className="h-4 w-4" />
              TikTok
            </TabsTrigger>
            <TabsTrigger value="x" className="gap-2" data-testid="tab-x">
              <SiX className="h-4 w-4" />
              X (Twitter)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meta">
            <MetaIntegration />
          </TabsContent>

          <TabsContent value="tiktok">
            <TikTokIntegration />
          </TabsContent>

          <TabsContent value="x">
            <XIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
