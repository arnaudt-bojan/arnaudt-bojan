import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import type { MetaCampaign } from "@shared/schema";
import { format } from "date-fns";

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
  const budgetPercentage = 0; // Will be calculated from metrics

  return (
    <Card className="p-6" data-testid={`card-campaign-${campaign.id}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold truncate" data-testid={`text-campaign-name-${campaign.id}`}>
                {campaign.name}
              </h3>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6"
                onClick={() => setLocation(`/meta-campaigns/${campaign.id}/edit`)}
                data-testid={`button-edit-name-${campaign.id}`}
              >
                <Edit className="h-3 w-3" />
              </Button>
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
              <DropdownMenuItem onClick={() => setLocation(`/meta-campaigns/${campaign.id}`)} data-testid={`menu-view-${campaign.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation(`/meta-campaigns/${campaign.id}/edit`)} data-testid={`menu-edit-${campaign.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Campaign
              </DropdownMenuItem>
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

        {/* Dates */}
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

        {/* Budget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Budget Remaining</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs underline hover:no-underline"
              onClick={() => setLocation(`/meta-campaigns/${campaign.id}/budget`)}
              data-testid={`button-increase-budget-${campaign.id}`}
            >
              Increase budget
            </Button>
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

        {/* Performance Metrics (Collapsible) */}
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
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: campaigns = [], isLoading } = useQuery<MetaCampaign[]>({
    queryKey: ["/api/meta/campaigns"],
  });

  // Filter campaigns based on search and status
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen py-6 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
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
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setLocation("/meta-ads/analytics")}
                data-testid="button-view-analytics"
                size="lg"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button 
                onClick={() => setLocation("/meta-ads-setup")}
                data-testid="button-create-ad"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Ad
              </Button>
            </div>
          </div>

          {/* Search and Filter */}
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

        {/* Campaign List */}
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
                  <Button onClick={() => setLocation("/meta-ads-setup")} data-testid="button-create-first-ad">
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
