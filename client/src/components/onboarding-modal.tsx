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
      <DialogContent className="max-w-md" data-testid="dialog-onboarding">
        <DialogHeader>
          <DialogTitle>Set Up Your Store URL</DialogTitle>
          <DialogDescription>
            Choose your store's web address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Card className="hover-elevate cursor-pointer" onClick={handleInstagramConnect} data-testid="card-instagram-option">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Instagram className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Instagram Username</CardTitle>
                  <CardDescription className="text-xs">@username.upfirst.io</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                className="w-full" 
                variant="default"
                size="sm"
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
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Custom Domain</CardTitle>
                  <CardDescription className="text-xs">Coming Soon</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                className="w-full" 
                variant="outline"
                size="sm"
                disabled
                data-testid="button-custom-domain"
              >
                <Globe className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-skip-onboarding">
            Skip for Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
