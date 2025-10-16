import { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { Mail, Plus, Trash2, Send, Calendar, Play, Pause, BarChart3, Users, Filter, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface Campaign {
  id: string;
  userId: string;
  subject: string;
  content: string;
  htmlContent: string | null;
  groupIds: string[] | null;
  segmentIds: string[] | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sentAt: string | null;
  createdAt: string;
}

interface SubscriberGroup {
  id: string;
  name: string;
  description: string | null;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: any;
  subscriberCount: number;
}

interface Analytics {
  id: string;
  newsletterId: string;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  openRate: string | null;
  clickRate: string | null;
}

export default function CampaignsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [isCampaignBuilderOpen, setIsCampaignBuilderOpen] = useState(false);
  const [isSegmentBuilderOpen, setIsSegmentBuilderOpen] = useState(false);
  const [campaignStep, setCampaignStep] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Campaign Builder State
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Segment Builder State
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [segmentRules, setSegmentRules] = useState<any[]>([{ field: 'status', operator: 'equals', value: 'active' }]);
  const [segmentOperator, setSegmentOperator] = useState<'AND' | 'OR'>('AND');
  const [previewCount, setPreviewCount] = useState(0);

  // Queries
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: groups = [] } = useQuery<SubscriberGroup[]>({
    queryKey: ["/api/subscriber-groups"],
  });

  const { data: segments = [] } = useQuery<Segment[]>({
    queryKey: ["/api/segments"],
  });

  const { data: analytics = [] } = useQuery<Analytics[]>({
    queryKey: ["/api/newsletter-analytics"],
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: async (data: any): Promise<Campaign> => {
      console.log("[Campaign] Creating campaign with data:", data);
      const response = await apiRequest("POST", "/api/campaigns", data);
      console.log("[Campaign] Response:", response);
      return response as unknown as Campaign;
    },
    onSuccess: (campaign: Campaign) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign created successfully" });
      setIsCampaignBuilderOpen(false);
      resetCampaignBuilder();
    },
    onError: (error: any) => {
      console.error("[Campaign] Creation error:", error);
      const errorMessage = error?.message || error?.error || "Failed to create campaign";
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/campaigns/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send campaign", variant: "destructive" });
    },
  });

  const scheduleCampaignMutation = useMutation({
    mutationFn: async ({ id, scheduledAt, timezone }: any) => 
      apiRequest("POST", `/api/campaigns/${id}/schedule`, { scheduledAt, timezone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign scheduled successfully" });
    },
    onError: () => {
      toast({ title: "Failed to schedule campaign", variant: "destructive" });
    },
  });

  const pauseCampaignMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/campaigns/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign paused" });
    },
  });

  const resumeCampaignMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/campaigns/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign resumed" });
    },
  });

  const createSegmentMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/segments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      toast({ title: "Segment created successfully" });
      setIsSegmentBuilderOpen(false);
      resetSegmentBuilder();
    },
    onError: () => {
      toast({ title: "Failed to create segment", variant: "destructive" });
    },
  });

  const previewSegmentMutation = useMutation({
    mutationFn: async (rules: any) => apiRequest("POST", "/api/segments/preview", { rules }),
    onSuccess: (data: any) => {
      setPreviewCount(data.subscriberCount || 0);
    },
  });

  // Helper Functions
  const resetCampaignBuilder = () => {
    setSubject("");
    setContent("");
    setRecipientType("all");
    setSelectedGroupIds([]);
    setSelectedSegmentIds([]);
    setSendNow(true);
    setScheduledDate("");
    setScheduledTime("");
    setCampaignStep(1);
  };

  const resetSegmentBuilder = () => {
    setSegmentName("");
    setSegmentDescription("");
    setSegmentRules([{ field: 'status', operator: 'equals', value: 'active' }]);
    setSegmentOperator('AND');
    setPreviewCount(0);
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
    };

    // Handle recipient selection
    if (recipientType === 'all') {
      campaignData.sendToAll = true;
    } else if (recipientType === 'groups' && selectedGroupIds.length > 0) {
      campaignData.groupIds = selectedGroupIds;
    } else if (recipientType === 'segments' && selectedSegmentIds.length > 0) {
      campaignData.segmentIds = selectedSegmentIds;
    }

    if (!sendNow && scheduledDate && scheduledTime) {
      campaignData.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      campaignData.timezone = timezone;
    }

    createCampaignMutation.mutate(campaignData);
  };

  const handleCreateSegment = () => {
    if (!segmentName) {
      toast({ title: "Segment name is required", variant: "destructive" });
      return;
    }

    createSegmentMutation.mutate({
      name: segmentName,
      description: segmentDescription,
      rules: {
        conditions: segmentRules,
        operator: segmentOperator,
      },
    });
  };

  const handlePreviewSegment = () => {
    previewSegmentMutation.mutate({
      conditions: segmentRules,
      operator: segmentOperator,
    });
  };

  const addSegmentRule = () => {
    setSegmentRules([...segmentRules, { field: 'status', operator: 'equals', value: '' }]);
  };

  const removeSegmentRule = (index: number) => {
    setSegmentRules(segmentRules.filter((_, i) => i !== index));
  };

  const updateSegmentRule = (index: number, key: string, value: any) => {
    const updated = [...segmentRules];
    updated[index] = { ...updated[index], [key]: value };
    setSegmentRules(updated);
  };

  const filteredCampaigns = campaigns.filter(c => 
    statusFilter === "all" || c.status === statusFilter
  );

  const avgOpenRate = analytics.length > 0 
    ? (analytics.reduce((sum, a) => sum + parseFloat(a.openRate || '0'), 0) / analytics.length).toFixed(2)
    : '0';

  const avgClickRate = analytics.length > 0
    ? (analytics.reduce((sum, a) => sum + parseFloat(a.clickRate || '0'), 0) / analytics.length).toFixed(2)
    : '0';

  const totalSent = analytics.reduce((sum, a) => sum + a.totalSent, 0);

  return (
    <div className="min-h-screen bg-background">
      <BackToDashboard label="Back to Dashboard" />
      
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-campaigns">Email Campaigns</h1>
            <p className="text-muted-foreground">Create, schedule, and track your email campaigns</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsSegmentBuilderOpen(true)}
              variant="outline"
              data-testid="button-create-segment"
            >
              <Users className="mr-2 h-4 w-4" />
              New Segment
            </Button>
            <Button
              onClick={() => setIsCampaignBuilderOpen(true)}
              data-testid="button-create-campaign"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList data-testid="tabs-list-main">
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="segments" data-testid="tab-segments">Segments</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Campaigns</CardTitle>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="sending">Sending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="text-center py-8" data-testid="loading-campaigns">Loading campaigns...</div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-campaigns">
                    No campaigns found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Sent Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                          <TableCell className="font-medium" data-testid={`text-subject-${campaign.id}`}>
                            {campaign.subject}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                campaign.status === 'sent' ? 'default' :
                                campaign.status === 'scheduled' ? 'secondary' :
                                campaign.status === 'draft' ? 'outline' : 'destructive'
                              }
                              data-testid={`badge-status-${campaign.id}`}
                            >
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-recipients-${campaign.id}`}>
                            {campaign.groupIds?.length ? `${campaign.groupIds.length} groups` : 
                             campaign.segmentIds?.length ? `${campaign.segmentIds.length} segments` : 
                             'All subscribers'}
                          </TableCell>
                          <TableCell data-testid={`text-sent-date-${campaign.id}`}>
                            {campaign.sentAt ? format(new Date(campaign.sentAt), 'MMM d, yyyy h:mm a') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {campaign.status === 'draft' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                  data-testid={`button-send-${campaign.id}`}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              {campaign.status === 'scheduled' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => pauseCampaignMutation.mutate(campaign.id)}
                                  data-testid={`button-pause-${campaign.id}`}
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscriber Segments</CardTitle>
                <CardDescription>Dynamic groups based on subscriber behavior and attributes</CardDescription>
              </CardHeader>
              <CardContent>
                {segments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-segments">
                    No segments created yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {segments.map((segment) => (
                      <Card key={segment.id} data-testid={`card-segment-${segment.id}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg" data-testid={`text-segment-name-${segment.id}`}>
                                {segment.name}
                              </CardTitle>
                              {segment.description && (
                                <CardDescription data-testid={`text-segment-description-${segment.id}`}>
                                  {segment.description}
                                </CardDescription>
                              )}
                            </div>
                            <Badge variant="secondary" data-testid={`badge-segment-count-${segment.id}`}>
                              {segment.subscriberCount || 0} subscribers
                            </Badge>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-sent">{totalSent}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-open-rate">{avgOpenRate}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-click-rate">{avgClickRate}%</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-analytics">
                    No analytics data available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Clicked</TableHead>
                        <TableHead>Open Rate</TableHead>
                        <TableHead>Click Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.map((a) => (
                        <TableRow key={a.id} data-testid={`row-analytics-${a.id}`}>
                          <TableCell data-testid={`text-analytics-campaign-${a.id}`}>
                            Campaign #{a.newsletterId.slice(0, 8)}
                          </TableCell>
                          <TableCell data-testid={`text-analytics-sent-${a.id}`}>{a.totalSent}</TableCell>
                          <TableCell data-testid={`text-analytics-opened-${a.id}`}>{a.totalOpened}</TableCell>
                          <TableCell data-testid={`text-analytics-clicked-${a.id}`}>{a.totalClicked}</TableCell>
                          <TableCell data-testid={`text-analytics-open-rate-${a.id}`}>{a.openRate || '0'}%</TableCell>
                          <TableCell data-testid={`text-analytics-click-rate-${a.id}`}>{a.clickRate || '0'}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Campaign Builder Dialog */}
        <Dialog open={isCampaignBuilderOpen} onOpenChange={setIsCampaignBuilderOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-campaign-builder">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>
                Step {campaignStep} of 4: {
                  campaignStep === 1 ? 'Content' :
                  campaignStep === 2 ? 'Recipients' :
                  campaignStep === 3 ? 'Schedule' : 'Review'
                }
              </DialogDescription>
            </DialogHeader>

            {campaignStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                    data-testid="input-campaign-subject"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use variables: {'{'}{'{'} name {'}'}{'}'},  {'{'}{'{'} unsubscribe_link {'}'}{'}'}
                  </p>
                </div>
                <div>
                  <Label>Email Content *</Label>
                  <div className="border rounded-md" data-testid="editor-campaign-content">
                    <ReactQuill
                      value={content}
                      onChange={setContent}
                      theme="snow"
                      className="h-64"
                    />
                  </div>
                </div>
              </div>
            )}

            {campaignStep === 2 && (
              <div className="space-y-4">
                <Label>Select Recipients</Label>
                <RadioGroup value={recipientType} onValueChange={setRecipientType} data-testid="radio-recipient-type">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" data-testid="radio-all-subscribers" />
                    <Label htmlFor="all">All Subscribers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="groups" id="groups" data-testid="radio-groups" />
                    <Label htmlFor="groups">Select Groups</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="segments" id="segments" data-testid="radio-segments" />
                    <Label htmlFor="segments">Select Segments</Label>
                  </div>
                </RadioGroup>

                {recipientType === 'groups' && (
                  <div className="space-y-2">
                    <Label>Groups</Label>
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`group-${group.id}`}
                          checked={selectedGroupIds.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupIds([...selectedGroupIds, group.id]);
                            } else {
                              setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                            }
                          }}
                          data-testid={`checkbox-group-${group.id}`}
                        />
                        <Label htmlFor={`group-${group.id}`}>{group.name}</Label>
                      </div>
                    ))}
                  </div>
                )}

                {recipientType === 'segments' && (
                  <div className="space-y-2">
                    <Label>Segments</Label>
                    {segments.map((segment) => (
                      <div key={segment.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`segment-${segment.id}`}
                          checked={selectedSegmentIds.includes(segment.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSegmentIds([...selectedSegmentIds, segment.id]);
                            } else {
                              setSelectedSegmentIds(selectedSegmentIds.filter(id => id !== segment.id));
                            }
                          }}
                          data-testid={`checkbox-segment-${segment.id}`}
                        />
                        <Label htmlFor={`segment-${segment.id}`}>{segment.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {campaignStep === 3 && (
              <div className="space-y-4">
                <RadioGroup value={sendNow ? "now" : "schedule"} onValueChange={(v) => setSendNow(v === "now")} data-testid="radio-send-timing">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="now" id="now" data-testid="radio-send-now" />
                    <Label htmlFor="now">Send Now</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="schedule" id="schedule" data-testid="radio-schedule" />
                    <Label htmlFor="schedule">Schedule for Later</Label>
                  </div>
                </RadioGroup>

                {!sendNow && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          data-testid="input-schedule-date"
                        />
                      </div>
                      <div>
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          data-testid="input-schedule-time"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        data-testid="input-timezone"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {campaignStep === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Review Your Campaign</h3>
                <div className="space-y-2">
                  <div>
                    <Label>Subject:</Label>
                    <p className="text-sm" data-testid="text-review-subject">{subject}</p>
                  </div>
                  <div>
                    <Label>Recipients:</Label>
                    <p className="text-sm" data-testid="text-review-recipients">
                      {recipientType === 'all' ? 'All Subscribers' :
                       recipientType === 'groups' ? `${selectedGroupIds.length} groups` :
                       `${selectedSegmentIds.length} segments`}
                    </p>
                  </div>
                  <div>
                    <Label>Send:</Label>
                    <p className="text-sm" data-testid="text-review-schedule">
                      {sendNow ? 'Immediately' : `${scheduledDate} at ${scheduledTime} (${timezone})`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <div className="flex gap-2 w-full justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCampaignStep(Math.max(1, campaignStep - 1))}
                  disabled={campaignStep === 1}
                  data-testid="button-campaign-previous"
                >
                  Previous
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCampaignBuilderOpen(false);
                      resetCampaignBuilder();
                    }}
                    data-testid="button-campaign-cancel"
                  >
                    Cancel
                  </Button>
                  {campaignStep < 4 ? (
                    <Button
                      onClick={() => setCampaignStep(campaignStep + 1)}
                      data-testid="button-campaign-next"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCreateCampaign}
                      disabled={createCampaignMutation.isPending}
                      data-testid="button-campaign-create"
                    >
                      {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Segment Builder Dialog */}
        <Dialog open={isSegmentBuilderOpen} onOpenChange={setIsSegmentBuilderOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-segment-builder">
            <DialogHeader>
              <DialogTitle>Create Segment</DialogTitle>
              <DialogDescription>Define rules to dynamically group subscribers</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="segment-name">Segment Name *</Label>
                <Input
                  id="segment-name"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  placeholder="e.g., Engaged Users"
                  data-testid="input-segment-name"
                />
              </div>

              <div>
                <Label htmlFor="segment-description">Description</Label>
                <Input
                  id="segment-description"
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  placeholder="Optional description"
                  data-testid="input-segment-description"
                />
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Segment Rules</Label>
                  <Select value={segmentOperator} onValueChange={(v: 'AND' | 'OR') => setSegmentOperator(v)}>
                    <SelectTrigger className="w-[100px]" data-testid="select-segment-operator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {segmentRules.map((rule, index) => (
                    <div key={index} className="flex gap-2 items-center" data-testid={`rule-${index}`}>
                      <Select
                        value={rule.field}
                        onValueChange={(v) => updateSegmentRule(index, 'field', v)}
                      >
                        <SelectTrigger className="w-[150px]" data-testid={`select-field-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="created_at">Created At</SelectItem>
                          <SelectItem value="total_opens">Total Opens</SelectItem>
                          <SelectItem value="total_clicks">Total Clicks</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={rule.operator}
                        onValueChange={(v) => updateSegmentRule(index, 'operator', v)}
                      >
                        <SelectTrigger className="w-[150px]" data-testid={`select-operator-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={rule.value}
                        onChange={(e) => updateSegmentRule(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1"
                        data-testid={`input-value-${index}`}
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSegmentRule(index)}
                        disabled={segmentRules.length === 1}
                        data-testid={`button-remove-rule-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={addSegmentRule}
                  className="mt-2"
                  data-testid="button-add-rule"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </Button>
              </div>

              <div className="flex items-center justify-between bg-muted p-4 rounded-md">
                <div>
                  <p className="text-sm font-medium">Preview</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-preview-count">
                    {previewCount} subscribers match these rules
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={handlePreviewSegment}
                  disabled={previewSegmentMutation.isPending}
                  data-testid="button-preview-segment"
                >
                  {previewSegmentMutation.isPending ? "Loading..." : "Refresh Preview"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSegmentBuilderOpen(false);
                  resetSegmentBuilder();
                }}
                data-testid="button-segment-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSegment}
                disabled={createSegmentMutation.isPending}
                data-testid="button-segment-create"
              >
                {createSegmentMutation.isPending ? "Creating..." : "Create Segment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
