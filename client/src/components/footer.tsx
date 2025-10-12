import { Link } from "wouter";
import { Globe, Mail } from "lucide-react";
import { SiInstagram, SiTiktok, SiSnapchat } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FooterProps {
  sellerInfo?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null; // Login email (fallback for contact)
    socialInstagram?: string | null;
    socialTwitter?: string | null;
    socialTiktok?: string | null;
    socialSnapchat?: string | null;
    socialWebsite?: string | null;
    contactEmail?: string | null;
    aboutStory?: string | null;
    shippingPolicy?: string | null;
    returnsPolicy?: string | null;
    termsSource?: string | null;
    termsPdfUrl?: string | null;
  } | null;
}

export function Footer({ sellerInfo }: FooterProps) {
  const hasSocialLinks = sellerInfo && (
    sellerInfo.socialInstagram || 
    sellerInfo.socialTwitter || 
    sellerInfo.socialTiktok || 
    sellerInfo.socialSnapchat || 
    sellerInfo.socialWebsite
  );

  // Use contactEmail if set, otherwise fall back to login email
  const displayEmail = sellerInfo?.contactEmail || sellerInfo?.email;

  // Helper function to construct social media links
  const getSocialLink = (value: string, platform: 'instagram' | 'twitter' | 'tiktok' | 'snapchat'): string => {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    
    const handle = value.replace(/^@/, '');
    
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${handle}`;
      case 'twitter':
        return `https://twitter.com/${handle}`;
      case 'tiktok':
        return `https://tiktok.com/@${handle}`;
      case 'snapchat':
        return `https://snapchat.com/add/${handle}`;
      default:
        return value;
    }
  };

  return (
    <footer className="mt-auto border-t bg-black text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left side: Seller info (Contact, Socials, About) */}
          <div className="flex items-center gap-6 flex-wrap justify-center md:justify-start">
            {/* Contact - uses contactEmail or falls back to login email */}
            {displayEmail && (
              <a 
                href={`mailto:${displayEmail}`}
                className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1.5"
                data-testid="link-contact"
              >
                <Mail className="h-4 w-4" />
                Contact
              </a>
            )}

            {/* Social Icons */}
            {hasSocialLinks && (
              <div className="flex items-center gap-3">
                {sellerInfo?.socialInstagram && (
                  <a
                    href={getSocialLink(sellerInfo.socialInstagram, 'instagram')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Instagram"
                    data-testid="link-instagram"
                  >
                    <SiInstagram className="h-4 w-4" />
                  </a>
                )}
                {sellerInfo?.socialTwitter && (
                  <a
                    href={getSocialLink(sellerInfo.socialTwitter, 'twitter')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Twitter"
                    data-testid="link-twitter"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                {sellerInfo?.socialTiktok && (
                  <a
                    href={getSocialLink(sellerInfo.socialTiktok, 'tiktok')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="TikTok"
                    data-testid="link-tiktok"
                  >
                    <SiTiktok className="h-4 w-4" />
                  </a>
                )}
                {sellerInfo?.socialSnapchat && (
                  <a
                    href={getSocialLink(sellerInfo.socialSnapchat, 'snapchat')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Snapchat"
                    data-testid="link-snapchat"
                  >
                    <SiSnapchat className="h-4 w-4" />
                  </a>
                )}
                {sellerInfo?.socialWebsite && (
                  <a
                    href={sellerInfo.socialWebsite.startsWith('http') ? sellerInfo.socialWebsite : `https://${sellerInfo.socialWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Website"
                    data-testid="link-website"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {/* About Modal */}
            {sellerInfo?.aboutStory && (
              <Dialog>
                <DialogTrigger asChild>
                  <button 
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                    data-testid="button-about"
                  >
                    About
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>About</DialogTitle>
                    <DialogDescription className="text-base leading-relaxed pt-4">
                      {sellerInfo.aboutStory}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Center: Platform Links */}
          <div className="flex items-center gap-6">
            <Link href="/help" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="link-help">
              Help
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="link-privacy">
              Privacy
            </Link>
            {/* Terms link - uses custom PDF if available and valid, otherwise platform default */}
            {sellerInfo?.termsSource === 'custom_pdf' && sellerInfo?.termsPdfUrl && sellerInfo.termsPdfUrl.trim() !== '' ? (
              <a 
                href={sellerInfo.termsPdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors text-sm" 
                data-testid="link-terms"
              >
                Terms
              </a>
            ) : (
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="link-terms">
                Terms
              </Link>
            )}
          </div>

          {/* Right: Branding */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">EMPOWERED BY</span>
            <span className="text-lg font-bold">UPPFIRST</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
