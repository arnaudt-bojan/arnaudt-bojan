import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiX } from "react-icons/si";
import type { Product } from "@shared/schema";

export default function PromoteProduct() {
  const [, params] = useRoute("/promote-product/:id");
  const [, setLocation] = useLocation();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", params?.id],
  });

  const { data: metaSettings } = useQuery<any>({
    queryKey: ["/api/meta-settings"],
  });

  const { data: tiktokSettings } = useQuery<any>({
    queryKey: ["/api/tiktok-settings"],
  });

  const { data: xSettings } = useQuery<any>({
    queryKey: ["/api/x-settings"],
  });

  const handlePlatformSelect = (platform: string) => {
    if (platform === "meta") {
      setLocation(`/create-meta-campaign/${params?.id}`);
    } else if (platform === "tiktok") {
      setLocation(`/create-tiktok-campaign/${params?.id}`);
    } else if (platform === "x") {
      setLocation(`/create-x-campaign/${params?.id}`);
    }
  };

  const handleSetupPlatform = (platform: string) => {
    setLocation(`/social-ads-setup?tab=${platform}`);
  };

  if (isLoading || !product) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  const isMetaConnected = metaSettings?.connected && metaSettings?.accessToken;
  const isTikTokConnected = tiktokSettings?.connected && tiktokSettings?.accessToken;
  const isXConnected = xSettings?.connected && xSettings?.accessToken;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Product Header */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {product.image && (
              <img
                src={product.image}
                alt={product.name}
                className="w-full md:w-48 h-48 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <p className="text-muted-foreground mb-4">{product.description}</p>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-lg px-4 py-1">
                  ${product.price}
                </Badge>
                <Badge>{product.productType}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Platform Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Choose Advertising Platform</h2>
          <p className="text-muted-foreground">
            Select where you want to promote this product
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Meta (Facebook/Instagram) */}
          <Card className="p-6 hover-elevate active-elevate-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <SiFacebook className="h-6 w-6 text-[#1877F2]" />
                <SiInstagram className="h-6 w-6 text-[#E4405F]" />
              </div>
              <h3 className="text-xl font-bold">Meta</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Reach billions on Facebook & Instagram with AI-powered Advantage+ campaigns
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Advantage+ Shopping</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>AI Creative Optimization</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Automatic Placements</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Smart Audience Targeting</span>
              </div>
            </div>

            {isMetaConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Connected</span>
                </div>
                <Button 
                  className="w-full gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90"
                  onClick={() => handlePlatformSelect("meta")}
                  data-testid="button-promote-meta"
                >
                  Create Campaign
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Not connected</span>
                </div>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSetupPlatform("meta")}
                  data-testid="button-setup-meta"
                >
                  Setup Meta Ads
                </Button>
              </div>
            )}
          </Card>

          {/* TikTok */}
          <Card className="p-6 hover-elevate active-elevate-2">
            <div className="flex items-center gap-3 mb-4">
              <SiTiktok className="h-6 w-6" />
              <h3 className="text-xl font-bold">TikTok</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Engage younger audiences with viral video content and Smart Performance campaigns
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Smart Performance Mode</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Auto Creative Optimization</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Smart Targeting</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Auto Budget Optimization</span>
              </div>
            </div>

            {isTikTokConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Connected</span>
                </div>
                <Button 
                  className="w-full gap-2 bg-black hover:bg-black/90 text-white"
                  onClick={() => handlePlatformSelect("tiktok")}
                  data-testid="button-promote-tiktok"
                >
                  Create Campaign
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Not connected</span>
                </div>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSetupPlatform("tiktok")}
                  data-testid="button-setup-tiktok"
                >
                  Setup TikTok Ads
                </Button>
              </div>
            )}
          </Card>

          {/* X (Twitter) */}
          <Card className="p-6 hover-elevate active-elevate-2">
            <div className="flex items-center gap-3 mb-4">
              <SiX className="h-6 w-6" />
              <h3 className="text-xl font-bold">X</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Reach engaged audiences on X (Twitter) with promoted posts and conversational ads
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Promoted Tweets</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Audience Targeting</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Keyword Targeting</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Engagement Optimization</span>
              </div>
            </div>

            {isXConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Connected</span>
                </div>
                <Button 
                  className="w-full gap-2 bg-black hover:bg-black/90 text-white"
                  onClick={() => handlePlatformSelect("x")}
                  data-testid="button-promote-x"
                >
                  Create Campaign
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Not connected</span>
                </div>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSetupPlatform("x")}
                  data-testid="button-setup-x"
                >
                  Setup X Ads
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/seller/products")}
            data-testid="button-back"
          >
            Back to Products
          </Button>
        </div>
      </div>
    </div>
  );
}
