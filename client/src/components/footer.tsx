import { Link } from "wouter";
import { Globe } from "lucide-react";
import { SiInstagram, SiTiktok, SiSnapchat } from "react-icons/si";

interface FooterProps {
  sellerInfo?: {
    socialInstagram?: string | null;
    socialTwitter?: string | null;
    socialTiktok?: string | null;
    socialSnapchat?: string | null;
    socialWebsite?: string | null;
    contactEmail?: string | null;
    aboutStory?: string | null;
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

  return (
    <footer className="bg-black text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
          {/* About Story Section - Only show if seller has a story */}
          {sellerInfo?.aboutStory && (
            <div className="flex-1 max-w-md">
              <h3 className="text-lg font-semibold mb-4">About</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{sellerInfo.aboutStory}</p>
            </div>
          )}
          
          {/* Service Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Service</h3>
            <div className="space-y-2">
              <Link href="/help" className="block text-gray-400 hover:text-white transition-colors" data-testid="link-help">
                Help
              </Link>
              <Link href="/privacy" className="block text-gray-400 hover:text-white transition-colors" data-testid="link-privacy">
                Privacy policy
              </Link>
              <Link href="/terms" className="block text-gray-400 hover:text-white transition-colors" data-testid="link-terms">
                Terms of use
              </Link>
            </div>
          </div>

          {/* Branding */}
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">EMPOWERED BY</div>
            <div className="text-2xl font-bold">UPPFIRST</div>
          </div>
        </div>

        {/* Social Icons & Copyright */}
        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Social Links - Only show if seller has social links */}
            {hasSocialLinks ? (
              <div className="flex items-center gap-4">
                {sellerInfo?.socialInstagram && (
                  <a
                    href={getSocialLink(sellerInfo.socialInstagram, 'instagram')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
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
                    className="text-gray-400 hover:text-white transition-colors"
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
                    className="text-gray-400 hover:text-white transition-colors"
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
                    className="text-gray-400 hover:text-white transition-colors"
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
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Website"
                    data-testid="link-website"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>
            ) : (
              <div></div>
            )}

            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} UPPFIRST
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
