import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, 
  Copy, 
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { 
  SiFacebook, 
  SiX, 
  SiLinkedin, 
  SiWhatsapp,
  SiInstagram
} from "react-icons/si";
import type { Product } from "@shared/schema";

interface PromoteProductDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

export function PromoteProductDialog({ open, onClose, product }: PromoteProductDialogProps) {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);

  const productUrl = `${window.location.origin}/products/${product.id}`;
  const shareText = `Check out ${product.name} - ${product.description?.substring(0, 100)}... Only $${product.price}!`;

  const socialPlatforms = [
    {
      name: "Facebook",
      icon: SiFacebook,
      color: "text-[#1877F2]",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "X (Twitter)",
      icon: SiX,
      color: "text-[#000000] dark:text-[#FFFFFF]",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: SiLinkedin,
      color: "text-[#0A66C2]",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "WhatsApp",
      icon: SiWhatsapp,
      color: "text-[#25D366]",
      url: `https://wa.me/?text=${encodeURIComponent(shareText + " " + productUrl)}`,
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({
      title: "Link copied",
      description: "Product link copied to clipboard",
    });
  };

  const handleShare = (platform: string, url: string) => {
    window.open(url, "_blank", "width=600,height=400");
    toast({
      title: "Sharing on " + platform,
      description: "Opening share dialog...",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Promote Product
          </DialogTitle>
          <DialogDescription>
            Share this product on social media to reach more customers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Preview */}
          <Card className="p-4">
            <div className="flex gap-4">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="capitalize">
                    {product.productType}
                  </Badge>
                  <span className="text-lg font-bold">${product.price}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Copy Link */}
          <div>
            <label className="text-sm font-medium mb-2 block">Product Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={productUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-lg bg-muted text-sm"
                data-testid="input-product-url"
              />
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="gap-2"
                data-testid="button-copy-link"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Social Media Platforms */}
          <div>
            <label className="text-sm font-medium mb-3 block">Share on Social Media</label>
            <div className="grid grid-cols-2 gap-3">
              {socialPlatforms.map((platform) => (
                <Button
                  key={platform.name}
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  onClick={() => handleShare(platform.name, platform.url)}
                  data-testid={`button-share-${platform.name.toLowerCase()}`}
                >
                  <platform.icon className={`h-5 w-5 ${platform.color}`} />
                  <span className="flex-1 text-left">Share on {platform.name}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </div>

          {/* Instagram Note */}
          <Card className="p-4 bg-muted/50 border-dashed">
            <div className="flex items-start gap-3">
              <SiInstagram className="h-5 w-5 text-pink-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">Instagram</h4>
                <p className="text-xs text-muted-foreground">
                  Copy the link above and create a post or story on Instagram with your product image.
                  Paste the link in your bio or as a swipe-up link (for business accounts).
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
