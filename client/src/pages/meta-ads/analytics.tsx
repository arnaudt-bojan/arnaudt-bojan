import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  Calendar as CalendarIcon,
  ArrowRight,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { format, subDays } from "date-fns";
import type { MetaCampaign } from "@shared/schema";

interface SellerMetricsSummary {
  sellerId: string;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: string;
  totalRevenue: string;
  totalImpressions: number;
  totalClicks: number;
  avgCpm: string;
  avgCpc: string;
  avgCtr: string;
  avgRoas: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  totalSpend: string;
  totalRevenue: string;
  avgCpm: string;
  avgCpc: string;
  avgCtr: string;
  roas: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

type DateRangePreset = "7days" | "30days" | "custom";

const CHART_COLORS = {
  primary: "#000000",
  secondary: "#666666",
  accent: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

const PIE_COLORS = ["#000000", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  loading,
}: {
  title: string;
  value: string;
  icon: any;
  trend?: "up" | "down";
  trendValue?: string;
  loading?: boolean;
}) {
  return (
    <Card className="p-6" data-testid={`card-kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-2" />
          ) : (
            <p className="text-2xl font-bold" data-testid={`text-kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </p>
          )}
          {trend && trendValue && !loading && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}>
              {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-[300px] w-full" />
    </Card>
  );
}

export default function MetaAdsAnalytics() {
  const [, setLocation] = useLocation();
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("7days");
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Calculate date range based on preset
  const getDateRange = () => {
    if (dateRangePreset === "custom" && customDateFrom && customDateTo) {
      return {
        startDate: format(customDateFrom, "yyyy-MM-dd"),
        endDate: format(customDateTo, "yyyy-MM-dd"),
      };
    }
    
    const endDate = new Date();
    const startDate = dateRangePreset === "7days" ? subDays(endDate, 7) : subDays(endDate, 30);
    
    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  };

  const dateRange = getDateRange();

  // Fetch summary metrics with real-time refresh every 30 seconds
  const { data: summary, isLoading: summaryLoading } = useQuery<SellerMetricsSummary>({
    queryKey: ["/api/meta/analytics/summary", dateRange],
    refetchInterval: 30000, // 30 seconds
  });

  // Fetch all campaigns for the table
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<MetaCampaign[]>({
    queryKey: ["/api/meta/campaigns"],
  });

  // Fetch performance data for each campaign
  const { data: campaignPerformances = [], isLoading: performancesLoading } = useQuery<CampaignPerformance[]>({
    queryKey: ["/api/meta/analytics/all-campaigns", dateRange],
    queryFn: async () => {
      const responses = await Promise.all(
        campaigns.map(async (campaign) => {
          const params = new URLSearchParams(dateRange);
          const res = await fetch(`/api/meta/analytics/campaigns/${campaign.id}?${params}`);
          if (!res.ok) return null;
          return res.json();
        })
      );
      return responses.filter(Boolean);
    },
    enabled: campaigns.length > 0,
    refetchInterval: 30000,
  });

  // Filter campaigns based on status
  const filteredPerformances = campaignPerformances.filter((perf) => {
    const campaign = campaigns.find((c) => c.id === perf.campaignId);
    if (!campaign) return false;
    return statusFilter === "all" || campaign.status === statusFilter;
  });

  // Sort performances
  const sortedPerformances = [...filteredPerformances].sort((a, b) => {
    let aValue: any = a[sortField as keyof CampaignPerformance];
    let bValue: any = b[sortField as keyof CampaignPerformance];
    
    // Convert string numbers to numbers for sorting
    if (typeof aValue === "string" && !isNaN(Number(aValue))) {
      aValue = Number(aValue);
    }
    if (typeof bValue === "string" && !isNaN(Number(bValue))) {
      bValue = Number(bValue);
    }
    
    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Generate daily spend chart data (mock for now - would need daily breakdown from API)
  const dailySpendData = Array.from({ length: 7 }, (_, i) => ({
    date: format(subDays(new Date(), 6 - i), "MMM dd"),
    spend: Math.random() * 100 + 50,
  }));

  // Generate impressions vs clicks data
  const impressionsClicksData = sortedPerformances.slice(0, 5).map((perf) => ({
    name: perf.campaignName.substring(0, 15),
    impressions: perf.totalImpressions,
    clicks: perf.totalClicks,
  }));

  // Campaign comparison data
  const campaignComparisonData = sortedPerformances.slice(0, 5).map((perf) => ({
    name: perf.campaignName.substring(0, 15),
    spend: parseFloat(perf.totalSpend),
    revenue: parseFloat(perf.totalRevenue),
  }));

  // Budget allocation pie data
  const budgetAllocationData = sortedPerformances.slice(0, 6).map((perf) => ({
    name: perf.campaignName.substring(0, 20),
    value: parseFloat(perf.totalSpend),
  }));

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Campaign Name",
      "Status",
      "Impressions",
      "Clicks",
      "Spend",
      "Revenue",
      "CTR",
      "CPM",
      "CPC",
      "ROAS",
    ];
    
    const rows = sortedPerformances.map((perf) => {
      const campaign = campaigns.find((c) => c.id === perf.campaignId);
      return [
        perf.campaignName,
        campaign?.status || "unknown",
        perf.totalImpressions,
        perf.totalClicks,
        perf.totalSpend,
        perf.totalRevenue,
        perf.avgCtr,
        perf.avgCpm,
        perf.avgCpc,
        perf.roas,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meta-ads-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen py-6 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/meta-ads/dashboard")}
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meta Ads Dashboard
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <SiFacebook className="h-8 w-8 text-[#1877F2]" />
                <SiInstagram className="h-8 w-8 text-[#E4405F]" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-page-title">
                ANALYTICS DASHBOARD
              </h1>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={exportToCSV}
                disabled={sortedPerformances.length === 0}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => setLocation("/meta-ads/dashboard")} data-testid="button-back-to-dashboard-alt">
                <BarChart3 className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Select value={dateRangePreset} onValueChange={(value) => setDateRangePreset(value as DateRangePreset)}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-date-range">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateRangePreset === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" data-testid="button-date-from">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customDateFrom ? format(customDateFrom, "MMM dd, yyyy") : "From Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" data-testid="button-date-to">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customDateTo ? format(customDateTo, "MMM dd, yyyy") : "To Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Spend"
            value={`$${summary?.totalSpend || "0.00"}`}
            icon={DollarSign}
            loading={summaryLoading}
          />
          <KPICard
            title="Total Impressions"
            value={summary?.totalImpressions.toLocaleString() || "0"}
            icon={Eye}
            loading={summaryLoading}
          />
          <KPICard
            title="Total Clicks"
            value={summary?.totalClicks.toLocaleString() || "0"}
            icon={MousePointerClick}
            loading={summaryLoading}
          />
          <KPICard
            title="CTR"
            value={`${summary?.avgCtr || "0.00"}%`}
            icon={Target}
            loading={summaryLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="CPM"
            value={`$${summary?.avgCpm || "0.00"}`}
            icon={TrendingUp}
            loading={summaryLoading}
          />
          <KPICard
            title="CPC"
            value={`$${summary?.avgCpc || "0.00"}`}
            icon={TrendingUp}
            loading={summaryLoading}
          />
          <KPICard
            title="ROAS"
            value={summary?.avgRoas || "0.00"}
            icon={TrendingUp}
            loading={summaryLoading}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Spend Chart */}
          {performancesLoading ? (
            <ChartSkeleton />
          ) : (
            <Card className="p-6" data-testid="card-daily-spend-chart">
              <h3 className="text-lg font-semibold mb-4">Daily Spend Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySpendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="spend" stroke={CHART_COLORS.primary} strokeWidth={2} name="Spend ($)" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Impressions vs Clicks */}
          {performancesLoading ? (
            <ChartSkeleton />
          ) : (
            <Card className="p-6" data-testid="card-impressions-clicks-chart">
              <h3 className="text-lg font-semibold mb-4">Impressions vs Clicks</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={impressionsClicksData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="impressions" stroke={CHART_COLORS.accent} strokeWidth={2} name="Impressions" />
                  <Line type="monotone" dataKey="clicks" stroke={CHART_COLORS.success} strokeWidth={2} name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Campaign Comparison */}
          {performancesLoading ? (
            <ChartSkeleton />
          ) : (
            <Card className="p-6" data-testid="card-campaign-comparison-chart">
              <h3 className="text-lg font-semibold mb-4">Campaign Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={campaignComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="spend" fill={CHART_COLORS.primary} name="Spend ($)" />
                  <Bar dataKey="revenue" fill={CHART_COLORS.success} name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Budget Allocation */}
          {performancesLoading ? (
            <ChartSkeleton />
          ) : (
            <Card className="p-6" data-testid="card-budget-allocation-chart">
              <h3 className="text-lg font-semibold mb-4">Budget Allocation</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={budgetAllocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {budgetAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* Campaign Performance Table */}
        <Card className="p-6" data-testid="card-performance-table">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Campaign Performance</h3>
          </div>
          
          {performancesLoading || campaignsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sortedPerformances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No campaign performance data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover-elevate" onClick={() => {
                      setSortField("campaignName");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}>
                      Campaign Name
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="cursor-pointer hover-elevate text-right" onClick={() => {
                      setSortField("totalImpressions");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}>
                      Impressions
                    </TableHead>
                    <TableHead className="cursor-pointer hover-elevate text-right" onClick={() => {
                      setSortField("totalClicks");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}>
                      Clicks
                    </TableHead>
                    <TableHead className="cursor-pointer hover-elevate text-right" onClick={() => {
                      setSortField("totalSpend");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}>
                      Spend
                    </TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPerformances.map((perf) => {
                    const campaign = campaigns.find((c) => c.id === perf.campaignId);
                    return (
                      <TableRow key={perf.campaignId} data-testid={`row-campaign-${perf.campaignId}`}>
                        <TableCell className="font-medium" data-testid={`text-campaign-name-${perf.campaignId}`}>
                          {perf.campaignName}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(campaign?.status || "unknown")} data-testid={`badge-status-${perf.campaignId}`}>
                            {campaign?.status.toUpperCase() || "UNKNOWN"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-impressions-${perf.campaignId}`}>
                          {perf.totalImpressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-clicks-${perf.campaignId}`}>
                          {perf.totalClicks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-spend-${perf.campaignId}`}>
                          ${parseFloat(perf.totalSpend).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-ctr-${perf.campaignId}`}>
                          {perf.avgCtr}%
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-roas-${perf.campaignId}`}>
                          {perf.roas}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation("/meta-ads/dashboard")}
                            data-testid={`button-back-to-dashboard-${perf.campaignId}`}
                          >
                            Back to Dashboard
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
