import { useState, useMemo } from "react";
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
import { Users, Plus, Trash2, Mail, FolderOpen, Upload, Download, Send, Image as ImageIcon, Monitor, Smartphone, BarChart3, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

interface Newsletter {
  id: string;
  userId: string;
  subject: string;
  content: string;
  htmlContent: string | null;
  groupIds: string[] | null;
  status: string;
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
  newsletter?: Newsletter;
}

export default function NewsletterPage() {
  const { toast } = useToast();
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSubscriberDialogOpen, setIsSubscriberDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  // Newsletter composer state
  const [newsletterSubject, setNewsletterSubject] = useState("");
  const [newsletterContent, setNewsletterContent] = useState("");
  const [newsletterRecipients, setNewsletterRecipients] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const { data: groups, isLoading: groupsLoading } = useQuery<SubscriberGroup[]>({
    queryKey: ["/api/subscriber-groups"],
  });

  const { data: subscribers, isLoading: subscribersLoading } = useQuery<Subscriber[]>({
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

  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  // Separate unfiltered query for compose tab recipient counts
  const { data: allSubscribers } = useQuery<Subscriber[]>({
    queryKey: ["/api/subscribers", "all"],
    queryFn: async () => {
      const response = await fetch("/api/subscribers", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch subscribers");
      return response.json();
    },
  });

  const { data: analytics } = useQuery<NewsletterAnalytics[]>({
    queryKey: ["/api/newsletter-analytics"],
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/subscriber-groups", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Group Created",
        description: "Subscriber group has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
      setIsGroupDialogOpen(false);
      setGroupName("");
      setGroupDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group.",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/subscriber-groups/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Group Deleted",
        description: "The subscriber group has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
      if (selectedGroup) setSelectedGroup(null);
    },
  });

  const createSubscriberMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string; groupIds?: string[] }) => {
      const response = await apiRequest("POST", "/api/subscribers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscriber Added",
        description: "Subscriber has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
      setIsSubscriberDialogOpen(false);
      setSubscriberEmail("");
      setSubscriberName("");
      setSelectedGroups([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add subscriber.",
        variant: "destructive",
      });
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/subscribers/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Subscriber Removed",
        description: "The subscriber has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-groups"] });
    },
  });

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter a group name.",
        variant: "destructive",
      });
      return;
    }
    createGroupMutation.mutate({ name: groupName, description: groupDescription });
  };

  const handleCreateSubscriber = () => {
    if (!subscriberEmail.trim()) {
      toast({
        title: "Missing Email",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(subscriberEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    createSubscriberMutation.mutate({
      email: subscriberEmail,
      name: subscriberName || undefined,
      groupIds: selectedGroups.length > 0 ? selectedGroups : undefined,
    });
  };

  const exportSubscribers = () => {
    if (!subscribers || subscribers.length === 0) {
      toast({
        title: "No Subscribers",
        description: "There are no subscribers to export.",
        variant: "destructive",
      });
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

    toast({
      title: "Export Complete",
      description: `Exported ${subscribers.length} subscribers to CSV.`,
    });
  };

  if (groupsLoading || subscribersLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
              Newsletter Subscribers
            </h1>
            <p className="text-muted-foreground">
              Manage your subscribers and groups for newsletters
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportSubscribers}
              className="gap-2"
              data-testid="button-export-subscribers"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="subscribers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscribers" data-testid="tab-subscribers">
            <Users className="h-4 w-4 mr-2" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="groups" data-testid="tab-groups">
            <FolderOpen className="h-4 w-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="compose" data-testid="tab-compose">
            <Send className="h-4 w-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={selectedGroup || "all"} onValueChange={(v) => setSelectedGroup(v === "all" ? null : v)}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-group">
                  <SelectValue placeholder="Filter by group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscribers</SelectItem>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGroup && (
                <Badge variant="secondary">
                  Filtered: {groups?.find(g => g.id === selectedGroup)?.name}
                </Badge>
              )}
            </div>
            <Button
              onClick={() => setIsSubscriberDialogOpen(true)}
              className="gap-2"
              data-testid="button-add-subscriber"
            >
              <Plus className="h-4 w-4" />
              Add Subscriber
            </Button>
          </div>

          {!subscribers || subscribers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Subscribers Yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Add your first subscriber to start building your mailing list
                </p>
                <Button onClick={() => setIsSubscriberDialogOpen(true)} data-testid="button-add-first-subscriber">
                  Add Subscriber
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id} data-testid={`row-subscriber-${subscriber.id}`}>
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell>{subscriber.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={subscriber.status === "active" ? "default" : "secondary"}>
                          {subscriber.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(subscriber.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
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
            </Card>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setIsGroupDialogOpen(true)}
              className="gap-2"
              data-testid="button-create-group"
            >
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>

          {!groups || groups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Groups Yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Create subscriber groups to organize your mailing lists
                </p>
                <Button onClick={() => setIsGroupDialogOpen(true)} data-testid="button-create-first-group">
                  Create Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card key={group.id} className="hover-elevate" data-testid={`card-group-${group.id}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription>{group.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{group.subscriberCount || 0} subscribers</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGroupMutation.mutate(group.id)}
                        data-testid={`button-delete-group-${group.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compose Newsletter</CardTitle>
                <CardDescription>
                  Create and send newsletters to your subscribers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newsletter-subject">Subject Line</Label>
                <Input
                  id="newsletter-subject"
                  placeholder="Enter your newsletter subject..."
                  value={newsletterSubject}
                  onChange={(e) => setNewsletterSubject(e.target.value)}
                  data-testid="input-newsletter-subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newsletter-recipients">Recipients</Label>
                <Select value={newsletterRecipients} onValueChange={setNewsletterRecipients}>
                  <SelectTrigger id="newsletter-recipients" data-testid="select-newsletter-recipients">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers ({allSubscribers?.length || 0})</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.subscriberCount || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Add Product Image</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger data-testid="select-product-image">
                    <SelectValue placeholder="Select a product to add its image..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProductId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const product = products?.find(p => p.id === selectedProductId);
                      if (product && product.image) {
                        const imageHtml = `<p><img src="${product.image}" alt="${product.name}" style="max-width: 100%; height: auto;" /></p>`;
                        setNewsletterContent(newsletterContent + imageHtml);
                        setSelectedProductId("");
                      }
                    }}
                    data-testid="button-insert-product-image"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Insert Image
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Newsletter Content</Label>
                <div className="border rounded-md" data-testid="editor-newsletter-content">
                  <ReactQuill
                    theme="snow"
                    value={newsletterContent}
                    onChange={setNewsletterContent}
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link', 'image'],
                        ['clean']
                      ],
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewsletterSubject("");
                    setNewsletterContent("");
                    setNewsletterRecipients("all");
                    setSelectedProductId("");
                  }}
                  data-testid="button-clear-newsletter"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Implement send newsletter
                    toast({
                      title: "Newsletter Sent",
                      description: "Your newsletter has been sent successfully.",
                    });
                  }}
                  className="gap-2"
                  data-testid="button-send-newsletter"
                >
                  <Send className="h-4 w-4" />
                  Send Newsletter
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    See how your newsletter will look
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === "desktop" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("desktop")}
                    data-testid="button-preview-desktop"
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === "mobile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("mobile")}
                    data-testid="button-preview-mobile"
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className={`border rounded-md bg-background transition-all ${
                  previewMode === "mobile" ? "max-w-sm mx-auto" : "w-full"
                }`}
                data-testid="preview-container"
              >
                <div className="p-6 space-y-4">
                  {newsletterSubject && (
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold" data-testid="preview-subject">
                        {newsletterSubject}
                      </h3>
                    </div>
                  )}
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: newsletterContent || "<p className='text-muted-foreground'>Your newsletter content will appear here...</p>" }}
                    data-testid="preview-content"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {!analytics || analytics.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Analytics Yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Send your first newsletter to see analytics here
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.reduce((sum, a) => sum + (a.totalSent || 0), 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Opened</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.reduce((sum, a) => sum + (a.totalOpened || 0), 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.reduce((sum, a) => sum + (a.totalClicked || 0), 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Open Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.length > 0
                        ? Math.round(analytics.reduce((sum, a) => sum + (parseFloat(a.openRate || "0") || 0), 0) / analytics.length)
                        : 0}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Newsletter Performance</CardTitle>
                  <CardDescription>Detailed analytics for each newsletter</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Newsletter</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Clicked</TableHead>
                        <TableHead>Bounced</TableHead>
                        <TableHead>Open Rate</TableHead>
                        <TableHead>Click Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.map((item) => (
                        <TableRow key={item.id} data-testid={`row-analytics-${item.id}`}>
                          <TableCell className="font-medium">
                            {item.newsletter?.subject || "Unknown"}
                          </TableCell>
                          <TableCell>{item.totalSent || 0}</TableCell>
                          <TableCell>{item.totalDelivered || 0}</TableCell>
                          <TableCell>{item.totalOpened || 0}</TableCell>
                          <TableCell>{item.totalClicked || 0}</TableCell>
                          <TableCell>{item.totalBounced || 0}</TableCell>
                          <TableCell>
                            <Badge variant={parseFloat(item.openRate || "0") > 20 ? "default" : "secondary"}>
                              {item.openRate || "0"}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={parseFloat(item.clickRate || "0") > 5 ? "default" : "secondary"}>
                              {item.clickRate || "0"}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent data-testid="dialog-create-group">
          <DialogHeader>
            <DialogTitle>Create Subscriber Group</DialogTitle>
            <DialogDescription>
              Organize your subscribers into groups for targeted newsletters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="e.g., Weekly Newsletter, Product Updates"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                data-testid="input-group-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Description (Optional)</Label>
              <Input
                id="group-description"
                placeholder="Describe this group..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                data-testid="input-group-description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsGroupDialogOpen(false);
                setGroupName("");
                setGroupDescription("");
              }}
              data-testid="button-cancel-group"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={createGroupMutation.isPending}
              data-testid="button-save-group"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubscriberDialogOpen} onOpenChange={setIsSubscriberDialogOpen}>
        <DialogContent data-testid="dialog-add-subscriber">
          <DialogHeader>
            <DialogTitle>Add Subscriber</DialogTitle>
            <DialogDescription>
              Add a new subscriber to your mailing list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subscriber-email">Email Address</Label>
              <Input
                id="subscriber-email"
                type="email"
                placeholder="subscriber@example.com"
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                data-testid="input-subscriber-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriber-name">Name (Optional)</Label>
              <Input
                id="subscriber-name"
                placeholder="John Doe"
                value={subscriberName}
                onChange={(e) => setSubscriberName(e.target.value)}
                data-testid="input-subscriber-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Add to Groups (Optional)</Label>
              <Select
                value={selectedGroups[0] || ""}
                onValueChange={(v) => setSelectedGroups(v ? [v] : [])}
              >
                <SelectTrigger data-testid="select-subscriber-groups">
                  <SelectValue placeholder="Select groups..." />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubscriberDialogOpen(false);
                setSubscriberEmail("");
                setSubscriberName("");
                setSelectedGroups([]);
              }}
              data-testid="button-cancel-subscriber"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubscriber}
              disabled={createSubscriberMutation.isPending}
              data-testid="button-save-subscriber"
            >
              {createSubscriberMutation.isPending ? "Adding..." : "Add Subscriber"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
