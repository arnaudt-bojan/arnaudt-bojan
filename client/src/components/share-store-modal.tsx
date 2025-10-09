import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Copy, Share2, QrCode } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiX } from "react-icons/si";

interface ShareStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareStoreModal({ open, onOpenChange }: ShareStoreModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Get store URL based on username
  const getStoreUrl = () => {
    if (!user?.username) {
      return `${window.location.origin}/products`;
    }

    const hostname = window.location.hostname;
    
    // Development/Replit environment - use query parameter
    if (hostname.includes('replit') || hostname === 'localhost') {
      return `${window.location.origin}?seller=${user.username}`;
    }
    
    // Production - use subdomain
    return `${window.location.protocol}//${user.username}.upfirst.io`;
  };

  const storeUrl = getStoreUrl();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Store link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareToSocial = (platform: string) => {
    const text = `Check out my store at ${storeUrl}`;
    const encodedUrl = encodeURIComponent(storeUrl);
    const encodedText = encodeURIComponent(text);

    let shareUrl = "";
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case "instagram":
        toast({
          title: "Instagram Sharing",
          description: "Copy the link above and create a post or story on Instagram with your store URL in your bio or as a swipe-up link (for business accounts).",
        });
        return;
      case "tiktok":
        toast({
          title: "TikTok Sharing",
          description: "Copy the link above and add it to your TikTok bio or create a video promoting your store!",
        });
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const generateQRCode = () => {
    toast({
      title: "QR Code",
      description: "QR code generation coming soon!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-share-store">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Share Your Store!</DialogTitle>
          <DialogDescription>
            Share your store link with customers through social media and other channels
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Your Storename
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Your Instagram handle becomes your store name.
            </p>
            <div className="flex gap-2">
              <Input
                value={storeUrl}
                readOnly
                className="flex-1"
                data-testid="input-store-url"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                data-testid="button-copy-url"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => shareToSocial("share")}
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Quick-share buttons for profile updates to reach more customers.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => shareToSocial("instagram")}
                data-testid="button-share-instagram"
              >
                <div className="flex items-center gap-2">
                  <SiInstagram className="h-5 w-5" />
                  <span>Add to Instagram</span>
                </div>
                <span>→</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => shareToSocial("facebook")}
                data-testid="button-share-facebook"
              >
                <div className="flex items-center gap-2">
                  <SiFacebook className="h-5 w-5" />
                  <span>Add to Facebook</span>
                </div>
                <span>→</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => shareToSocial("tiktok")}
                data-testid="button-share-tiktok"
              >
                <div className="flex items-center gap-2">
                  <SiTiktok className="h-5 w-5" />
                  <span>Add to Tiktok</span>
                </div>
                <span>→</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => shareToSocial("twitter")}
                data-testid="button-share-x"
              >
                <div className="flex items-center gap-2">
                  <SiX className="h-5 w-5" />
                  <span>Add to X</span>
                </div>
                <span>→</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={generateQRCode}
                data-testid="button-qr-code"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  <span>Share by QR code</span>
                </div>
                <span>→</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
