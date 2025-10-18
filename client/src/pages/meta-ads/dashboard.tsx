import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Edit,
  MoreVertical,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Eye,
  Trash2,
  DollarSign,
  Calendar,
  TrendingUp,
  MousePointerClick,
  Users,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import type { MetaCampaign, MetaAdAccount } from "@shared/schema";
import { format } from "date-fns";
import { MetaAdsOnboardingWizard } from "@/components/meta-ads-onboarding-wizard";
import { MetaAdAccountSelector } from "@/components/meta-ad-account-selector";

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "active":
      return "default";
    case "paused":
      return "secondary";
    case "completed":
      return "outline";
    case "failed":
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "paused":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "completed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "cancelled":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

function CampaignCard({ campaign }: { campaign: MetaCampaign }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);

  const pauseCampaignMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/meta/campaigns/${campaign.id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/campaigns"] });
      toast({
        title: "Campaign paused",
        description: `${campaign.name} has been paused`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to pause campaign",
        variant: "destructive",
      });
    },
  });

  const activateCampaignMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/meta/campaigns/${campaign.id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/campaigns"] });
      toast({
        title: "Campaign activated",
        description: `${campaign.name} is now active`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate campaign",
        variant: "destructive",
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/meta/campaigns/${campaign.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/campaigns"] });
      toast({
        title: "Campaign deleted",
        description: `${campaign.name} has been deleted`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const lifetimeBudget = parseFloat(campaign.lifetimeBudget?.toString() || "0");
  const budgetRemaining = lifetimeBudget;
  const budgetPercentage = 0;

  return (
    <Card className="p-6" data-testid={`card-campaign-${campaign.id}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold truncate" data-testid={`text-campaign-name-${campaign.id}`}>
                {campaign.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor(campaign.status)} data-testid={`badge-status-${campaign.id}`}>
                {campaign.status.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <SiFacebook className="h-3 w-3 text-[#1877F2]" />
                <SiInstagram className="h-3 w-3 text-[#E4405F]" />
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" data-testid={`button-menu-${campaign.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {campaign.status === "active" && (
                <DropdownMenuItem onClick={() => pauseCampaignMutation.mutate()} data-testid={`menu-pause-${campaign.id}`}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </DropdownMenuItem>
              )}
              {campaign.status === "paused" && (
                <DropdownMenuItem onClick={() => activateCampaignMutation.mutate()} data-testid={`menu-resume-${campaign.id}`}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => deleteCampaignMutation.mutate()} 
                className="text-destructive"
                data-testid={`menu-delete-${campaign.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Date Created</p>
            <p className="font-medium flex items-center gap-1" data-testid={`text-created-date-${campaign.id}`}>
              <Calendar className="h-3 w-3" />
              {campaign.createdAt ? format(new Date(campaign.createdAt), "dd MMM yyyy").toUpperCase() : "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">End Date</p>
            <p className="font-medium flex items-center gap-1" data-testid={`text-end-date-${campaign.id}`}>
              <Calendar className="h-3 w-3" />
              {campaign.endDate ? format(new Date(campaign.endDate), "dd MMM yyyy").toUpperCase() : "Ongoing"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Budget Remaining</p>
          </div>
          <p className="text-lg font-bold" data-testid={`text-budget-${campaign.id}`}>
            ${budgetRemaining.toFixed(2)} (OUT OF ${lifetimeBudget.toFixed(2)} TOTAL)
          </p>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all" 
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            $0.00 spent ({budgetPercentage}%)
          </p>
        </div>

        <Collapsible open={isPerformanceOpen} onOpenChange={setIsPerformanceOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              data-testid={`button-toggle-performance-${campaign.id}`}
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance Metrics
              </span>
              {isPerformanceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Impressions
                </p>
                <p className="text-lg font-bold" data-testid={`text-impressions-${campaign.id}`}>
                  0
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" />
                  Clicks
                </p>
                <p className="text-lg font-bold" data-testid={`text-clicks-${campaign.id}`}>
                  0
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Conversions
                </p>
                <p className="text-lg font-bold" data-testid={`text-conversions-${campaign.id}`}>
                  0
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Cost/Conv
                </p>
                <p className="text-lg font-bold" data-testid={`text-cpc-${campaign.id}`}>
                  $0.00
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}

function CampaignCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
    </Card>
  );
}

export default function MetaAdsDashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [oauthWindow, setOauthWindow] = useState<Window | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<MetaCampaign[]>({
    queryKey: ["/api/meta/campaigns"],
  });

  const { data: adAccounts = [], isLoading: adAccountsLoading, refetch: refetchAdAccounts } = useQuery<MetaAdAccount[]>({
    queryKey: ["/api/meta/ad-accounts"],
  });

  // Check for OAuth errors in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    if (error) {
      if (error === 'access_denied') {
        setOauthError('oauth_cancelled');
        toast({
          title: "Connection Cancelled",
          description: "You cancelled the Meta account connection. No changes were made.",
          variant: "destructive",
        });
      } else if (error === 'redirect_uri_mismatch' || errorDescription?.includes('redirect_uri')) {
        setOauthError('redirect_uri_error');
      } else {
        setOauthError('oauth_failed');
        toast({
          title: "Connection Failed",
          description: errorDescription || "Failed to connect Meta account. Please try again.",
          variant: "destructive",
        });
      }
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location, toast]);

  // Listen for postMessage from OAuth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'meta_oauth_success') {
        if (oauthWindow && !oauthWindow.closed) {
          oauthWindow.close();
        }
        setOauthWindow(null);
        setOauthError(null);
        
        setTimeout(async () => {
          await queryClient.invalidateQueries({ queryKey: ["/api/meta/ad-accounts"] });
          await refetchAdAccounts();
          
          toast({
            title: "Meta Account Connected!",
            description: "Your Meta ad account has been successfully linked.",
          });
        }, 500);
      } else if (event.data?.type === 'meta_oauth_error') {
        if (oauthWindow && !oauthWindow.closed) {
          oauthWindow.close();
        }
        setOauthWindow(null);
        setOauthError(event.data.error || 'oauth_failed');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [oauthWindow, toast, refetchAdAccounts]);

  // Check if OAuth window closed
  useEffect(() => {
    if (!oauthWindow) return;

    const checkWindowClosed = setInterval(() => {
      if (oauthWindow.closed) {
        setOauthWindow(null);
        clearInterval(checkWindowClosed);
        
        setTimeout(async () => {
          await queryClient.invalidateQueries({ queryKey: ["/api/meta/ad-accounts"] });
          await refetchAdAccounts();
        }, 1000);
      }
    }, 500);

    return () => clearInterval(checkWindowClosed);
  }, [oauthWindow, refetchAdAccounts]);

  const handleConnectMeta = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const newWindow = window.open(
      '/api/meta/oauth/start',
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    );
    
    if (newWindow) {
      setOauthWindow(newWindow);
      setOauthError(null);
    } else {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to connect your Meta account.",
        variant: "destructive",
      });
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedAccount = adAccounts.find(acc => acc.isSelected === 1);
  const hasMultipleAccounts = adAccounts.length > 1;
  const needsAccountSelection = hasMultipleAccounts && !selectedAccount;

  if (adAccountsLoading) {
    return (
      <div className="min-h-screen py-6 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                <SiFacebook className="h-8 w-8 text-[#1877F2] animate-pulse" />
              </div>
              <p className="text-muted-foreground">Loading Meta Ads...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show account selector if multiple accounts and none selected
  if (needsAccountSelection && !showAccountSelector) {
    setShowAccountSelector(true);
  }

  // Show onboarding wizard if no accounts
  if (adAccounts.length === 0) {
    return (
      <div className="min-h-screen py-6 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/seller-dashboard")}
            className="mb-4"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Seller Dashboard
          </Button>

          {oauthError === 'oauth_cancelled' && (
            <Alert className="mb-6" data-testid="alert-oauth-cancelled">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Connection Cancelled</p>
                <p className="text-sm">You cancelled the Meta account connection. Click "Connect Meta Account" below to try again.</p>
              </AlertDescription>
            </Alert>
          )}

          {oauthError === 'redirect_uri_error' && (
            <Alert variant="destructive" className="mb-6" data-testid="alert-redirect-uri-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">OAuth Configuration Error</p>
                <p className="text-sm mb-2">The redirect URI is not whitelisted in your Meta App settings.</p>
                <Collapsible>
                  <CollapsibleTrigger className="text-sm underline">
                    View technical details
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                    <p>Expected redirect URI: {window.location.origin}/api/meta/oauth/callback</p>
                    <p className="mt-1">Add this URI to your Meta App settings at developers.facebook.com</p>
                  </CollapsibleContent>
                </Collapsible>
              </AlertDescription>
            </Alert>
          )}

          {oauthError === 'no_ad_accounts' && (
            <Alert variant="destructive" className="mb-6" data-testid="alert-no-ad-accounts">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">No Ad Accounts Found</p>
                <p className="text-sm mb-2">OAuth succeeded but no ad accounts were found. Please create an ad account first.</p>
                <a 
                  href="https://business.facebook.com/adsmanager/creation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm underline"
                >
                  Create Ad Account <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          <MetaAdsOnboardingWizard onConnect={handleConnectMeta} />
        </div>
      </div>
    );
  }

  // Show account selector if multiple accounts
  if (showAccountSelector && needsAccountSelection) {
    return (
      <div className="min-h-screen py-6 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/seller-dashboard")}
            className="mb-4"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Seller Dashboard
          </Button>

          <MetaAdAccountSelector 
            accounts={adAccounts} 
            onAccountSelected={() => setShowAccountSelector(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/seller-dashboard")}
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Seller Dashboard
        </Button>

        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <SiFacebook className="h-8 w-8 text-[#1877F2]" />
                <SiInstagram className="h-8 w-8 text-[#E4405F]" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-page-title">
                META ADS DASHBOARD
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button 
                variant="outline"
                onClick={() => setLocation("/meta-ads/analytics")}
                data-testid="button-view-analytics"
                size="lg"
                className="w-full sm:w-auto"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button 
                onClick={() => setLocation("/meta-ads/create")}
                data-testid="button-create-ad"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Ad
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4" data-testid="loading-campaigns">
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4" data-testid="empty-campaigns">
              <div className="flex justify-center">
                <div className="p-4 bg-muted rounded-full">
                  <SiFacebook className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {searchQuery || statusFilter !== "all" ? "No campaigns found" : "No campaigns yet"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || statusFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Get started by creating your first Meta ad campaign"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button onClick={() => setLocation("/meta-ads/create")} data-testid="button-create-first-ad">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Ad
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
