import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, Globe, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [connecting, setConnecting] = useState(false);

  const handleInstagramConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch("/api/instagram/auth-url");
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Failed to connect Instagram:", error);
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl" data-testid="dialog-onboarding">
        <DialogHeader>
          <DialogTitle className="text-2xl">Set Up Your Store URL</DialogTitle>
          <DialogDescription>
            Choose how you want to set up your store's web address. You can always change this later in Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Card className="hover-elevate cursor-pointer" onClick={handleInstagramConnect} data-testid="card-instagram-option">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Use Instagram Username</CardTitle>
                  <CardDescription>Connect your Instagram and use @username.uppfirst.com</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                Automatically use your verified Instagram username as your store URL. Quick and easy!
              </div>
              <Button 
                className="w-full" 
                variant="default" 
                onClick={handleInstagramConnect}
                disabled={connecting}
                data-testid="button-connect-instagram"
              >
                <Instagram className="mr-2 h-4 w-4" />
                {connecting ? "Connecting..." : "Connect Instagram"}
              </Button>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Globe className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Custom Domain</CardTitle>
                  <CardDescription>Use your own domain name (Coming Soon)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                <div className="mb-2">Options available soon:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Purchase a new domain through GoDaddy</li>
                  <li>Connect your existing domain with automatic DNS setup</li>
                </ul>
              </div>
              <Button 
                className="w-full" 
                variant="outline" 
                disabled
                data-testid="button-custom-domain"
              >
                <Globe className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} data-testid="button-skip-onboarding">
            Skip for Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
