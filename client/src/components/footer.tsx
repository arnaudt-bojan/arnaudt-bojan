import { Link } from "wouter";
import { Instagram, Music2, Link as LinkIcon, Share2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
          {/* Service Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Service</h3>
            <div className="space-y-2">
              <Link href="/help" className="block text-gray-400 hover:text-white transition-colors">
                Help
              </Link>
              <Link href="/privacy" className="block text-gray-400 hover:text-white transition-colors">
                Privacy policy
              </Link>
              <Link href="/terms" className="block text-gray-400 hover:text-white transition-colors">
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
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="TikTok"
              >
                <Music2 className="h-5 w-5" />
              </a>
              <button
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Copy link"
              >
                <LinkIcon className="h-5 w-5" />
              </button>
              <button
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} UPPFIRST
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
