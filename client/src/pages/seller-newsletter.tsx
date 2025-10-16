import { useState, useRef, useMemo } from "react";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { 
  Users, Plus, Trash2, Mail, Upload, Download, Send, 
  Monitor, Smartphone, BarChart3, TrendingUp, Clock, 
  CheckCircle, AlertCircle, X, ChevronRight, ChevronLeft,
  Eye, Loader2, MoreVertical, Edit, Copy, Calendar, FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import Papa from "papaparse";
import { format } from "date-fns";

interface SubscriberGroup {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  subscriberCount?: number;
}

interface Subscriber {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
}

interface Campaign {
  id: string;
  userId: string;
  subject: string;
  content: string;
  htmlContent: string | null;
  preheader?: string | null;
  fromName?: string | null;
  groupIds: string[] | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sentAt: string | null;
  createdAt: string;
}

interface NewsletterAnalytics {
  id: string;
  newsletterId: string;
  userId: string;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: string | null;
  clickRate: string | null;
  bounceRate: string | null;
  createdAt: string;
  newsletter?: Campaign;
}

export default function SellerNewsletterPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("campaigns");
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(1);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  
  // Campaign state
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [fromName, setFromName] = useState("");
  const [content, setContent] = useState("");
  const [recipientType, setRecipientType] = useState<"all" | "groups">("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "later" | "draft">("now");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  
  // Subscriber management state
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSubscriberDialogOpen, setIsSubscriberDialogOpen] = useState(false);
  const [isCsvUploadDialogOpen, setIsCsvUploadDialogOpen] = useState(false);
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [testEmails, setTestEmails] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ email: string; name?: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // TinyMCE editor ref
  const editorRef = useRef<TinyMCEEditor | null>(null);

  // Queries
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: groups = [] } = useQuery<SubscriberGroup[]>({
    queryKey: ["/api/subscriber-groups"],
  });

  const { data: subscribers = [], isLoading: subscribersLoading } = useQuery<Subscriber[]>({
    queryKey: selectedGroup ? ["/api/subscribers", selectedGroup] : ["/api/subscribers"],
    queryFn: async () => {
      const url = selectedGroup 
        ? `/api/subscribers?groupId=${selectedGroup}` 
        : "/api/subscribers";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch subscribers");
      return response.json();
    },
  });

  const { data: analytics = [] } = useQuery<NewsletterAnalytics[]>({
    queryKey: ["/api/newsletter-analytics"],
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      const shouldSend = data._shouldSend;
      // Remove internal flag before sending to backend
      const { _shouldSend, ...cleanData } = data;
      
      if (editingCampaignId) {
        console.log("[Campaign] Updating campaign", editingCampaignId, "with data:", cleanData);
        const response = await apiRequest("PUT", `/api/campaigns/${editingCampaignId}`, cleanData);
        const campaign = await response.json();
        return { campaign, shouldSend };
      } else {
        console.log("[Campaign] Creating campaign with data:", cleanData);
        const response = await apiRequest("POST", "/api/campaigns", cleanData);
        const campaign = await response.json();
        return { campaign, shouldSend };
      }
    },
    onSuccess: async (result: any) => {
      console.log("[Campaign] onSuccess result:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      
      // If "Send Now" was selected, send the campaign immediately
      if (result.shouldSend && result.campaign?.id) {
        console.log("[Campaign] Sending campaign", result.campaign.id);
        try {
          const sendResult = await apiRequest("POST", `/api/campaigns/${result.campaign.id}/send`, {});
          console.log("[Campaign] Send result:", sendResult);
          queryClient.invalidateQueries({ queryKey: ["/api/newsletter-analytics"] });
          toast({ title: "Campaign sent successfully!" });
        } catch (error: any) {
          console.error("[Campaign] Send error:", error);
          toast({ title: "Campaign created but failed to send", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: editingCampaignId ? "Campaign updated successfully" : "Campaign saved successfully" });
      }
      
      resetDrawer();
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      console.error("[Campaign] Error:", error);
      toast({ title: editingCampaignId ? "Failed to update campaign" : "Failed to create campaign", variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/campaigns/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/campaigns/${id}/send`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter-analytics"] });
      toast({ title: "Campaign sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send campaign", variant: "destructive" });
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ campaignId, emails }: { campaignId: string; emails: string[] }) => {
      const response = await apiRequest("POST", `/api/campaigns/${campaignId}/send-test`, { emails });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Test email sent!", description: data.message });
      setIsTestEmailDialogOpen(false);
      setTestEmails("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to send test email", description: error.message, variant: "destructive" });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiRequest("POST", "/api/subscriber-groups", data);
    },
    onSuccess: () => {
      toast({ title: "Group Created", description: "Subscriber group has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
      setIsGroupDialogOpen(false);
      setGroupName("");
      setGroupDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create group.", variant: "destructive" });
    },
  });

  const createSubscriberMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string; groupIds?: string[] }) => {
      return await apiRequest("POST", "/api/subscribers", data);
    },
    onSuccess: () => {
      toast({ title: "Subscriber Added", description: "Subscriber has been added successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
      setIsSubscriberDialogOpen(false);
      setSubscriberEmail("");
      setSubscriberName("");
      setSelectedGroups([]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add subscriber.", variant: "destructive" });
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/subscribers/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Subscriber Removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/subscriber-groups/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Group Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
      if (selectedGroup) setSelectedGroup(null);
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (subscribers: { email: string; name?: string }[]) => {
      return await apiRequest("POST", "/api/subscribers/bulk", { subscribers });
    },
    onSuccess: (data: any) => {
      toast({ title: "Import Complete", description: data.message || "Subscribers imported successfully." });
      setIsCsvUploadDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
    },
    onError: () => {
      toast({ title: "Import Failed", variant: "destructive" });
    },
  });

  // Helper functions
  const resetDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerStep(1);
    setEditingCampaignId(null);
    setSubject("");
    setPreheader("");
    setFromName("");
    setContent("");
    setRecipientType("all");
    setSelectedGroupIds([]);
    setSendNow(true);
    setScheduledDate("");
    setScheduledTime("");
    setSendMode("now");
  };

  const openEditDrawer = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setSubject(campaign.subject);
    setPreheader(campaign.preheader || "");
    setFromName(campaign.fromName || "");
    setContent(campaign.content);
    setRecipientType(campaign.groupIds && campaign.groupIds.length > 0 ? "groups" : "all");
    setSelectedGroupIds(campaign.groupIds || []);
    
    // Check if campaign is scheduled
    if (campaign.status === 'scheduled') {
      setSendNow(false);
      setSendMode('later');
      // Note: We'd need scheduledAt from the backend to populate the date/time
    } else if (campaign.status === 'draft') {
      setSendNow(false);
      setSendMode('draft');
      setScheduledDate("");
      setScheduledTime("");
    } else {
      setSendNow(true);
      setSendMode('now');
      setScheduledDate("");
      setScheduledTime("");
    }
    
    setDrawerStep(1);
    setIsDrawerOpen(true);
  };

  const handleCreateCampaign = () => {
    if (!subject || !content) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const campaignData: any = {
      subject,
      content,
      htmlContent: content,
      preheader: preheader || undefined,
      fromName: fromName || undefined,
      _shouldSend: sendMode === 'now', // Internal flag to trigger immediate sending (not draft/scheduled)
    };

    // Handle recipient selection - NO SEGMENTS
    if (recipientType === 'all') {
      campaignData.sendToAll = true;
    } else if (recipientType === 'groups' && selectedGroupIds.length > 0) {
      campaignData.groupIds = selectedGroupIds;
    }

    if (sendMode === 'later' && scheduledDate && scheduledTime) {
      campaignData.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    }

    createCampaignMutation.mutate(campaignData);
  };

  const handleSendTestEmail = async () => {
    // First, create/update the campaign as draft
    if (!subject || !content) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const campaignData: any = {
      subject,
      content,
      htmlContent: content,
      preheader: preheader || undefined,
      fromName: fromName || undefined,
      sendToAll: true, // Required for creating campaign
    };

    try {
      let campaignId = editingCampaignId;
      
      if (!campaignId) {
        // Create draft campaign first
        const response = await apiRequest("POST", "/api/campaigns", campaignData);
        const campaign = await response.json();
        campaignId = campaign.id;
        setEditingCampaignId(campaignId);
        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      }

      // Parse test emails (comma or space separated)
      const emailArray = testEmails
        .split(/[,\s]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (emailArray.length === 0) {
        toast({ title: "Please enter at least one email address", variant: "destructive" });
        return;
      }

      // Send test email
      sendTestEmailMutation.mutate({ campaignId: campaignId!, emails: emailArray });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({ title: "Invalid File", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }

    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((row: any) => ({
          email: row.email || row.Email || '',
          name: row.name || row.Name || '',
        })).filter(item => item.email.trim() !== '');
        setCsvPreview(parsed);
        if (parsed.length === 0) {
          toast({ title: "Empty File", description: "No valid email addresses found in CSV.", variant: "destructive" });
        }
      },
      error: () => {
        toast({ title: "Parse Error", variant: "destructive" });
      }
    });
  };

  const exportSubscribers = () => {
    if (!subscribers || subscribers.length === 0) {
      toast({ title: "No Subscribers", variant: "destructive" });
      return;
    }

    const csv = [
      "Email,Name,Status,Created At",
      ...subscribers.map(s => `${s.email},${s.name || ''},${s.status},${s.createdAt}`)
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Export Complete", description: `Exported ${subscribers.length} subscribers to CSV.` });
  };

  // Compute stats
  const latestCampaign = campaigns.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // When viewing "All Subscribers", the backend already filters to active only
  // So subscribers.length IS the active count when selectedGroup is null
  const totalSubscribers = subscribers.length;
  const activeSubscribers = subscribers.filter(s => s.status === 'active').length;
  const totalSent = analytics.reduce((sum, a) => sum + a.totalSent, 0);
  const avgOpenRate = analytics.length > 0 
    ? (analytics.reduce((sum, a) => sum + parseFloat(a.openRate || '0'), 0) / analytics.length).toFixed(1)
    : '0';
  const avgClickRate = analytics.length > 0 
    ? (analytics.reduce((sum, a) => sum + parseFloat(a.clickRate || '0'), 0) / analytics.length).toFixed(1)
    : '0';
  const totalUnsubscribed = analytics.reduce((sum, a) => sum + a.totalUnsubscribed, 0);
  const avgUnsubscribeRate = analytics.length > 0 && totalSent > 0
    ? ((totalUnsubscribed / totalSent) * 100).toFixed(2)
    : '0';

  const filteredCampaigns = campaigns.filter(c => 
    statusFilter === "all" || c.status === statusFilter
  );

  const subscriberCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    groups.forEach(group => {
      counts[group.id] = subscribers.filter(sub => 
        // This would need proper group membership check from backend
        // For now, we'll use the subscriberCount from the group if available
        true
      ).length;
    });
    return counts;
  }, [groups, subscribers]);

  const isStepValid = (step: number): boolean => {
    if (step === 1) return !!subject;
    if (step === 2) return !!content;
    if (step === 3) {
      if (recipientType === 'groups') return selectedGroupIds.length > 0;
      if (sendMode === 'later') return !!scheduledDate && !!scheduledTime;
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <BackToDashboard label="Back to Dashboard" />
      
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Hero Summary Card */}
        <Card className="mb-6" data-testid="card-hero-summary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Email Marketing</span>
              <Button 
                onClick={() => setIsDrawerOpen(true)}
                data-testid="button-create-campaign-hero"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Latest Campaign</p>
                <div className="flex items-center gap-2">
                  {latestCampaign ? (
                    <>
                      <Badge variant={
                        latestCampaign.status === 'sent' ? 'default' : 
                        latestCampaign.status === 'draft' ? 'secondary' : 
                        'outline'
                      }>
                        {latestCampaign.status}
                      </Badge>
                      <p className="text-sm font-medium truncate">{latestCampaign.subject}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No campaigns yet</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
                <p className="text-2xl font-bold">{totalSubscribers}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{totalSent}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
                <p className="text-2xl font-bold">{avgOpenRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList data-testid="tabs-list-main">
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">
              <Mail className="mr-2 h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="subscribers" data-testid="tab-subscribers">
              <Users className="mr-2 h-4 w-4" />
              Subscribers
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle>All Campaigns</CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border rounded-md px-3 py-1.5 text-sm"
                      data-testid="select-status-filter"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>No campaigns found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                          <TableCell className="font-medium">{campaign.subject}</TableCell>
                          <TableCell>
                            <Badge variant={
                              campaign.status === 'sent' ? 'default' : 
                              campaign.status === 'draft' ? 'secondary' : 
                              'outline'
                            }>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {campaign.groupIds ? `${campaign.groupIds.length} groups` : 'All subscribers'}
                          </TableCell>
                          <TableCell>
                            {campaign.sentAt ? format(new Date(campaign.sentAt), 'MMM d, yyyy h:mm a') : '-'}
                          </TableCell>
                          <TableCell>{format(new Date(campaign.createdAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  data-testid={`button-actions-${campaign.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {campaign.status === 'draft' && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                      data-testid={`action-send-${campaign.id}`}
                                    >
                                      <Send className="mr-2 h-4 w-4" />
                                      Send Now
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => openEditDrawer(campaign)}
                                      data-testid={`action-edit-${campaign.id}`}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {campaign.status === 'scheduled' && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => openEditDrawer(campaign)}
                                      data-testid={`action-edit-schedule-${campaign.id}`}
                                    >
                                      <Calendar className="mr-2 h-4 w-4" />
                                      Edit Schedule
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {(campaign.status === 'sent' || campaign.status === 'failed') && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        toast({ title: "View Details feature coming soon" });
                                      }}
                                      data-testid={`action-view-${campaign.id}`}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => {
                                    toast({ title: "Duplicate feature coming soon" });
                                  }}
                                  data-testid={`action-duplicate-${campaign.id}`}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                {campaign.status !== 'sending' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                      data-testid={`action-delete-${campaign.id}`}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="mt-6">
            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
              {/* Groups Sidebar */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Groups</CardTitle>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setIsGroupDialogOpen(true)}
                      data-testid="button-create-group"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className={`w-full text-left px-4 py-2 hover-elevate ${!selectedGroup ? 'bg-accent' : ''}`}
                      data-testid="button-group-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">All Subscribers</span>
                        <Badge variant="secondary">{totalSubscribers}</Badge>
                      </div>
                    </button>
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center">
                        <button
                          onClick={() => setSelectedGroup(group.id)}
                          className={`flex-1 text-left px-4 py-2 hover-elevate ${selectedGroup === group.id ? 'bg-accent' : ''}`}
                          data-testid={`button-group-${group.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{group.name}</span>
                            <Badge variant="secondary">{group.subscriberCount || 0}</Badge>
                          </div>
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteGroupMutation.mutate(group.id)}
                          data-testid={`button-delete-group-${group.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Subscribers List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle>
                      {selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : 'All Subscribers'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportSubscribers}
                        data-testid="button-export-subscribers"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCsvUploadDialogOpen(true)}
                        data-testid="button-import-subscribers"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setIsSubscriberDialogOpen(true)}
                        data-testid="button-add-subscriber"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Subscriber
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {subscribersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : subscribers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No subscribers found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscribers.map((subscriber) => (
                          <TableRow key={subscriber.id} data-testid={`row-subscriber-${subscriber.id}`}>
                            <TableCell className="font-medium">{subscriber.email}</TableCell>
                            <TableCell>{subscriber.name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={subscriber.status === 'active' ? 'default' : 'secondary'}>
                                {subscriber.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(subscriber.createdAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteSubscriberMutation.mutate(subscriber.id)}
                                data-testid={`button-delete-subscriber-${subscriber.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Sent</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalSent}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg. Open Rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{avgOpenRate}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg. Click Rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{avgClickRate}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Unsubscribe Rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{avgUnsubscribeRate}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Campaigns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{campaigns.length}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No analytics data available</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead>Delivered</TableHead>
                          <TableHead>Opened</TableHead>
                          <TableHead>Clicked</TableHead>
                          <TableHead>Unsubscribed</TableHead>
                          <TableHead>Open Rate</TableHead>
                          <TableHead>Click Rate</TableHead>
                          <TableHead>Unsub Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.map((item) => {
                          const unsubRate = item.totalSent > 0 
                            ? ((item.totalUnsubscribed / item.totalSent) * 100).toFixed(2)
                            : '0';
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.newsletter?.subject || 'Unknown'}
                              </TableCell>
                              <TableCell>{item.totalSent}</TableCell>
                              <TableCell>{item.totalDelivered}</TableCell>
                              <TableCell>{item.totalOpened}</TableCell>
                              <TableCell>{item.totalClicked}</TableCell>
                              <TableCell>{item.totalUnsubscribed}</TableCell>
                              <TableCell>{item.openRate || '0'}%</TableCell>
                              <TableCell>{item.clickRate || '0'}%</TableCell>
                              <TableCell>{unsubRate}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Campaign Creation Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingCampaignId ? 'Edit Email Campaign' : 'Create Email Campaign'}</SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    drawerStep >= step ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'
                  }`}>
                    {drawerStep > step ? <CheckCircle className="h-4 w-4" /> : step}
                  </div>
                  {step < 3 && <div className={`h-0.5 w-16 mx-2 ${drawerStep > step ? 'bg-primary' : 'bg-muted'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Details */}
            {drawerStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject line"
                    autoComplete="off"
                    data-testid="input-subject"
                  />
                </div>
                <div>
                  <Label htmlFor="preheader">Preheader Text (Optional)</Label>
                  <Input
                    id="preheader"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="Short preview text"
                    data-testid="input-preheader"
                  />
                </div>
                <div>
                  <Label htmlFor="fromName">From Name (Optional)</Label>
                  <Input
                    id="fromName"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Your name or brand"
                    data-testid="input-from-name"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Content & Preview */}
            {drawerStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Editor */}
                  <div>
                    <Label className="mb-2 block">Email Content *</Label>
                    <Editor
                      apiKey="no-api-key"
                      onInit={(evt, editor) => editorRef.current = editor}
                      value={content}
                      onEditorChange={(newContent) => setContent(newContent)}
                      init={{
                        height: 500,
                        menubar: false,
                        plugins: [
                          'lists', 'link', 'image', 'table', 'code', 'fullscreen',
                          'insertdatetime', 'media', 'wordcount', 'anchor', 'searchreplace',
                          'visualblocks', 'visualchars', 'charmap', 'nonbreaking',
                          'emoticons', 'help'
                        ],
                        toolbar: 'undo redo | blocks | fontfamily fontsize | ' +
                                'forecolor backcolor | bold italic underline strikethrough | ' +
                                'alignleft aligncenter alignright alignjustify | ' +
                                'bullist numlist outdent indent | link image media table | ' +
                                'removeformat code fullscreen',
                        font_family_formats: 'Arial=arial,helvetica,sans-serif; ' +
                                            'Arial Black=arial black,avant garde; ' +
                                            'Book Antiqua=book antiqua,palatino; ' +
                                            'Comic Sans MS=comic sans ms,sans-serif; ' +
                                            'Courier New=courier new,courier; ' +
                                            'Georgia=georgia,palatino; ' +
                                            'Helvetica=helvetica; ' +
                                            'Impact=impact,chicago; ' +
                                            'Tahoma=tahoma,arial,helvetica,sans-serif; ' +
                                            'Times New Roman=times new roman,times; ' +
                                            'Trebuchet MS=trebuchet ms,geneva; ' +
                                            'Verdana=verdana,geneva',
                        font_size_formats: '8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt 48pt 72pt',
                        content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; }',
                        branding: false,
                        promotion: false,
                        images_upload_handler: async (blobInfo: any) => {
                          const formData = new FormData();
                          formData.append('image', blobInfo.blob(), blobInfo.filename());
                          
                          try {
                            const response = await fetch('/api/newsletter/upload-image', {
                              method: 'POST',
                              body: formData,
                              credentials: 'include',
                            });
                            
                            if (!response.ok) {
                              throw new Error('Upload failed');
                            }
                            
                            const data = await response.json();
                            toast({
                              title: "Image uploaded",
                              description: "Image added to your email",
                            });
                            return data.url;
                          } catch (error) {
                            console.error('Image upload error:', error);
                            toast({
                              title: "Upload failed",
                              description: "Could not upload image. Please try again.",
                              variant: "destructive",
                            });
                            throw error;
                          }
                        },
                      }}
                    />
                  </div>

                  {/* Mobile Preview */}
                  <div>
                    <Label className="mb-2 block flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Mobile Preview
                    </Label>
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        {/* iPhone Frame */}
                        <div className="w-[390px] h-[844px] bg-black rounded-[3rem] p-3 shadow-2xl">
                          {/* Screen */}
                          <div className="w-full h-full bg-white dark:bg-gray-100 rounded-[2.5rem] overflow-hidden flex flex-col">
                            {/* Status Bar */}
                            <div className="bg-white px-6 pt-3 pb-2 flex items-center justify-between text-xs font-semibold text-black">
                              <span>9:41</span>
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-3" viewBox="0 0 16 12" fill="currentColor">
                                  <path d="M15 5h-2V3c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v2H1c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1z"/>
                                </svg>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                              </div>
                            </div>
                            
                            {/* Email Header Bar */}
                            <div className="bg-gray-50 border-b px-4 py-3 flex items-center gap-3">
                              <button className="text-blue-600">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                                </svg>
                              </button>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-black">Inbox</div>
                              </div>
                            </div>
                            
                            {/* Email Content */}
                            <div className="flex-1 overflow-y-auto bg-white">
                              {/* Email Sender Info */}
                              <div className="px-4 py-3 border-b">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                                    {(fromName || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-black break-words">
                                      {fromName || 'Your Brand'}
                                    </div>
                                    <div className="text-xs text-gray-500 break-words">
                                      to me
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    Now
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <h2 className="text-base font-semibold text-black break-words">
                                    {subject || 'Email Subject'}
                                  </h2>
                                  {preheader && (
                                    <p className="text-sm text-gray-600 mt-1 break-words">
                                      {preheader}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Email Body */}
                              <div className="px-4 py-4">
                                <div 
                                  className="prose prose-sm max-w-none text-black break-words [&_*]:break-words [&_*]:text-black"
                                  dangerouslySetInnerHTML={{ 
                                    __html: content || '<p style="color: #6b7280;">Your email content will appear here...</p>' 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Home Indicator */}
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Recipients & Send */}
            {drawerStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Select Recipients *</Label>
                  <RadioGroup value={recipientType} onValueChange={(v: any) => setRecipientType(v)}>
                    <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate">
                      <RadioGroupItem value="all" id="all" data-testid="radio-recipients-all" />
                      <Label htmlFor="all" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span>All Subscribers</span>
                          <Badge>{activeSubscribers} subscribers</Badge>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate">
                      <RadioGroupItem value="groups" id="groups" data-testid="radio-recipients-groups" />
                      <Label htmlFor="groups" className="flex-1 cursor-pointer">
                        <span>Specific Groups</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {recipientType === 'groups' && (
                  <div className="space-y-2">
                    <Label>Select Groups</Label>
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedGroupIds.includes(group.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedGroupIds([...selectedGroupIds, group.id]);
                            } else {
                              setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                            }
                          }}
                          data-testid={`checkbox-group-${group.id}`}
                        />
                        <Label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span>{group.name}</span>
                            <Badge variant="secondary">{group.subscriberCount || 0}</Badge>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="mb-3 block">What would you like to do?</Label>
                  <RadioGroup 
                    value={sendMode} 
                    onValueChange={(v: "now" | "later" | "draft") => {
                      setSendMode(v);
                      if (v === "now") {
                        setSendNow(true);
                        setScheduledDate("");
                        setScheduledTime("");
                      } else if (v === "draft") {
                        setSendNow(false);
                        setScheduledDate("");
                        setScheduledTime("");
                      } else if (v === "later") {
                        setSendNow(false);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate">
                      <RadioGroupItem value="now" id="now" data-testid="radio-send-now" />
                      <Label htmlFor="now" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Send Now</div>
                            <div className="text-sm text-muted-foreground">Send immediately to all recipients</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate">
                      <RadioGroupItem value="later" id="later" data-testid="radio-send-later" />
                      <Label htmlFor="later" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Schedule for Later</div>
                            <div className="text-sm text-muted-foreground">Pick a date and time to send</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate">
                      <RadioGroupItem value="draft" id="draft" data-testid="radio-save-draft" />
                      <Label htmlFor="draft" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Save as Draft</div>
                            <div className="text-sm text-muted-foreground">Save and send later manually</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {sendMode === "later" && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="scheduledDate">Date *</Label>
                        <Input
                          id="scheduledDate"
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          data-testid="input-scheduled-date"
                        />
                      </div>
                      <div>
                        <Label htmlFor="scheduledTime">Time *</Label>
                        <Input
                          id="scheduledTime"
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          data-testid="input-scheduled-time"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Readiness Checklist */}
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Campaign Ready</p>
                      <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          {subject ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3" />}
                          Subject line added
                        </li>
                        <li className="flex items-center gap-2">
                          {content ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3" />}
                          Content created
                        </li>
                        <li className="flex items-center gap-2">
                          {recipientType === 'all' || selectedGroupIds.length > 0 ? 
                            <CheckCircle className="h-3 w-3 text-green-600" /> : 
                            <AlertCircle className="h-3 w-3" />
                          }
                          Recipients selected
                        </li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Send Test Email */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setIsTestEmailDialogOpen(true)}
                    disabled={!subject || !content}
                    data-testid="button-send-test-email"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Test Email
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => drawerStep > 1 ? setDrawerStep(drawerStep - 1) : resetDrawer()}
                data-testid="button-drawer-back"
              >
                {drawerStep > 1 ? (
                  <>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </>
                )}
              </Button>

              {drawerStep < 3 ? (
                <Button
                  onClick={() => setDrawerStep(drawerStep + 1)}
                  disabled={!isStepValid(drawerStep)}
                  data-testid="button-drawer-next"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateCampaign}
                  disabled={createCampaignMutation.isPending || !isStepValid(3)}
                  data-testid="button-create-campaign-final"
                >
                  {createCampaignMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {sendMode === 'now' ? 'Sending...' : 'Saving...'}
                    </>
                  ) : sendMode === 'now' ? (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Create & Send
                    </>
                  ) : sendMode === 'later' ? (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Campaign
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Save as Draft
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Group Creation Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent data-testid="dialog-create-group">
          <DialogHeader>
            <DialogTitle>Create Subscriber Group</DialogTitle>
            <DialogDescription>Organize your subscribers into groups for targeted campaigns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., VIP Customers"
                data-testid="input-group-name"
              />
            </div>
            <div>
              <Label htmlFor="groupDescription">Description (Optional)</Label>
              <Input
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Describe this group..."
                data-testid="input-group-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (groupName.trim()) {
                  createGroupMutation.mutate({ name: groupName, description: groupDescription });
                } else {
                  toast({ title: "Group name is required", variant: "destructive" });
                }
              }}
              disabled={createGroupMutation.isPending}
              data-testid="button-submit-group"
            >
              {createGroupMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscriber Creation Dialog */}
      <Dialog open={isSubscriberDialogOpen} onOpenChange={setIsSubscriberDialogOpen}>
        <DialogContent data-testid="dialog-add-subscriber">
          <DialogHeader>
            <DialogTitle>Add Subscriber</DialogTitle>
            <DialogDescription>Add a new subscriber to your mailing list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="subscriberEmail">Email Address *</Label>
              <Input
                id="subscriberEmail"
                type="email"
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                placeholder="subscriber@example.com"
                data-testid="input-subscriber-email"
              />
            </div>
            <div>
              <Label htmlFor="subscriberName">Name (Optional)</Label>
              <Input
                id="subscriberName"
                value={subscriberName}
                onChange={(e) => setSubscriberName(e.target.value)}
                placeholder="John Doe"
                data-testid="input-subscriber-name"
              />
            </div>
            {groups.length > 0 && (
              <div>
                <Label>Add to Groups (Optional)</Label>
                <div className="space-y-2 mt-2">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sub-group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups([...selectedGroups, group.id]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                          }
                        }}
                      />
                      <Label htmlFor={`sub-group-${group.id}`}>{group.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscriberDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (subscriberEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subscriberEmail)) {
                  createSubscriberMutation.mutate({
                    email: subscriberEmail,
                    name: subscriberName || undefined,
                    groupIds: selectedGroups.length > 0 ? selectedGroups : undefined,
                  });
                } else {
                  toast({ title: "Valid email address is required", variant: "destructive" });
                }
              }}
              disabled={createSubscriberMutation.isPending}
              data-testid="button-submit-subscriber"
            >
              {createSubscriberMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Subscriber
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={isCsvUploadDialogOpen} onOpenChange={setIsCsvUploadDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-csv-upload">
          <DialogHeader>
            <DialogTitle>Import Subscribers from CSV</DialogTitle>
            <DialogDescription>Upload a CSV file with email and name columns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              data-testid="input-csv-file"
            />
            {csvPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Preview ({csvPreview.length} subscribers)</p>
                <div className="border rounded-md max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.email}</TableCell>
                          <TableCell>{item.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {csvPreview.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing first 10 of {csvPreview.length} subscribers
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCsvUploadDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (csvPreview.length > 0) {
                  bulkImportMutation.mutate(csvPreview);
                } else {
                  toast({ title: "Please upload a valid CSV file", variant: "destructive" });
                }
              }}
              disabled={bulkImportMutation.isPending || csvPreview.length === 0}
              data-testid="button-submit-csv-import"
            >
              {bulkImportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Import {csvPreview.length} Subscribers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
        <DialogContent data-testid="dialog-send-test-email">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of your campaign to verify how it looks before sending to subscribers.
              Subject will be prefixed with [TEST].
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="testEmails">Email Address(es) *</Label>
              <Input
                id="testEmails"
                type="text"
                value={testEmails}
                onChange={(e) => setTestEmails(e.target.value)}
                placeholder="test@example.com, another@example.com"
                data-testid="input-test-emails"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Separate multiple emails with commas or spaces (max 5)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsTestEmailDialogOpen(false);
                setTestEmails("");
              }}
              data-testid="button-cancel-test-email"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendTestEmail}
              disabled={sendTestEmailMutation.isPending || !testEmails.trim()}
              data-testid="button-submit-test-email"
            >
              {sendTestEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
