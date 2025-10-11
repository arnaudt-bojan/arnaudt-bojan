import { Link } from "wouter";
import { Globe, Mail } from "lucide-react";
import { SiInstagram, SiTiktok, SiSnapchat } from "react-icons/si";

interface FooterProps {
  sellerInfo?: {
    firstName?: string | null;
    lastName?: string | null;
    socialInstagram?: string | null;
    socialTwitter?: string | null;
    socialTiktok?: string | null;
    socialSnapchat?: string | null;
    socialWebsite?: string | null;
    contactEmail?: string | null;
    aboutStory?: string | null;
    shippingPolicy?: string | null;
    returnsPolicy?: string | null;
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

  // Helper function to construct social media links
  // Accepts either a handle (e.g., "myshop") or a full URL
  const getSocialLink = (value: string, platform: 'instagram' | 'twitter' | 'tiktok' | 'snapchat'): string => {
    // If it's already a full URL, return as-is
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    
    // Otherwise, construct the URL from the handle
    const handle = value.replace(/^@/, ''); // Remove @ prefix if present
    
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

  // Check if seller has any information to display
  const hasSellerInfo = sellerInfo && (
    sellerInfo.aboutStory || 
    sellerInfo.contactEmail || 
    sellerInfo.shippingPolicy || 
    sellerInfo.returnsPolicy ||
    hasSocialLinks
  );

  return (
    <footer className="mt-auto">
      {/* Seller Information Section (White/Light Background) */}
      {hasSellerInfo && (
        <div className="bg-background border-t">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* About Section */}
              {sellerInfo?.aboutStory && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">About</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {sellerInfo.aboutStory}
                  </p>
                </div>
              )}

              {/* Contact & Policies Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact & Policies</h3>
                <div className="space-y-3">
                  {sellerInfo?.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${sellerInfo.contactEmail}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="link-contact-email"
                      >
                        {sellerInfo.contactEmail}
                      </a>
                    </div>
                  )}
                  {sellerInfo?.shippingPolicy && (
                    <div className="text-sm">
                      <span className="font-medium">Shipping:</span>{" "}
                      <span className="text-muted-foreground">{sellerInfo.shippingPolicy}</span>
                    </div>
                  )}
                  {sellerInfo?.returnsPolicy && (
                    <div className="text-sm">
                      <span className="font-medium">Returns:</span>{" "}
                      <span className="text-muted-foreground">{sellerInfo.returnsPolicy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Links Section */}
              {hasSocialLinks && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
                  <div className="flex items-center gap-4">
                    {sellerInfo?.socialInstagram && (
                      <a
                        href={getSocialLink(sellerInfo.socialInstagram, 'instagram')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Instagram"
                        data-testid="link-instagram"
                      >
                        <SiInstagram className="h-5 w-5" />
                      </a>
                    )}
                    {sellerInfo?.socialTwitter && (
                      <a
                        href={getSocialLink(sellerInfo.socialTwitter, 'twitter')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Twitter"
                        data-testid="link-twitter"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                    )}
                    {sellerInfo?.socialTiktok && (
                      <a
                        href={getSocialLink(sellerInfo.socialTiktok, 'tiktok')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="TikTok"
                        data-testid="link-tiktok"
                      >
                        <SiTiktok className="h-5 w-5" />
                      </a>
                    )}
                    {sellerInfo?.socialSnapchat && (
                      <a
                        href={getSocialLink(sellerInfo.socialSnapchat, 'snapchat')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Snapchat"
                        data-testid="link-snapchat"
                      >
                        <SiSnapchat className="h-5 w-5" />
                      </a>
                    )}
                    {sellerInfo?.socialWebsite && (
                      <a
                        href={sellerInfo.socialWebsite.startsWith('http') ? sellerInfo.socialWebsite : `https://${sellerInfo.socialWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Website"
                        data-testid="link-website"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Platform Section (Black Background) */}
      <div className="bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Service Links */}
            <div className="flex items-center gap-6">
              <Link href="/help" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="link-help">
                Help
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="link-privacy">
                Privacy policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm" data-testid="link-terms">
                Terms of use
              </Link>
            </div>

            {/* Branding */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">EMPOWERED BY</span>
              <span className="text-xl font-bold">UPPFIRST</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center mt-6 text-gray-400 text-xs">
            © {new Date().getFullYear()} UPPFIRST
          </div>
        </div>
      </div>
    </footer>
  );
}
