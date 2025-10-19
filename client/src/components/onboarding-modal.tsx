import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Globe, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

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

  const handleManualSetup = () => {
    onClose();
    window.location.href = "/settings?tab=quick-setup";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md" data-testid="dialog-onboarding">
        <DialogHeader>
          <DialogTitle>Set Up Your Store URL</DialogTitle>
          <DialogDescription>
            Choose your store's web address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Manual Username - Primary Option */}
          <Card className="hover-elevate cursor-pointer border-primary/50" onClick={handleManualSetup} data-testid="card-manual-option">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Choose Username</CardTitle>
                    <Badge variant="default" className="text-xs">Recommended</Badge>
                  </div>
                  <CardDescription className="text-xs">username.upfirst.io</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                className="w-full" 
                variant="default"
                size="sm"
                onClick={handleManualSetup}
                data-testid="button-manual-setup"
              >
                <User className="mr-2 h-4 w-4" />
                Set Up Manually
              </Button>
            </CardContent>
          </Card>

          {/* Instagram - Optional */}
          <Card className="hover-elevate cursor-pointer" onClick={handleInstagramConnect} data-testid="card-instagram-option">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Instagram className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Instagram Username</CardTitle>
                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                  </div>
                  <CardDescription className="text-xs">@handle.upfirst.io</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                className="w-full" 
                variant="outline"
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

          {/* Custom Domain - Advanced */}
          <Link href="/settings?tab=domains">
            <Card className="hover-elevate cursor-pointer" data-testid="card-custom-domain-option">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Custom Domain</CardTitle>
                      <Badge variant="secondary" className="text-xs">Advanced</Badge>
                    </div>
                    <CardDescription className="text-xs">shop.yourdomain.com</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full" 
                  variant="outline"
                  size="sm"
                  data-testid="button-custom-domain"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Add Custom Domain
                </Button>
              </CardContent>
            </Card>
          </Link>
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
