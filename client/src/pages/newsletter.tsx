import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Plus, Trash2, Mail, FolderOpen, Upload, Download } from "lucide-react";
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
