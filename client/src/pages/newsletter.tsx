import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Send, Users, Plus, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Newsletter {
  id: number;
  subject: string;
  content: string;
  recipients: string[];
  status: string;
  createdAt: string;
  sentAt?: string;
}

export default function NewsletterPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);

  const { data: newsletters, isLoading } = useQuery<Newsletter[]>({
    queryKey: ["/api/newsletters"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { subject: string; content: string; recipients: string[] }) => {
      const response = await apiRequest("POST", "/api/newsletters", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Newsletter Created",
        description: "Your newsletter has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create newsletter.",
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/newsletters/${id}/send`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Newsletter Sent",
        description: "Your newsletter has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send newsletter. Please check your SendGrid API key.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/newsletters/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Newsletter Deleted",
        description: "The newsletter has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete newsletter.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSubject("");
    setContent("");
    setRecipients([]);
    setEmailInput("");
  };

  const addEmail = () => {
    const email = emailInput.trim();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (recipients.includes(email)) {
      toast({
        title: "Duplicate Email",
        description: "This email has already been added.",
        variant: "destructive",
      });
      return;
    }

    setRecipients([...recipients, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setRecipients(recipients.filter((e) => e !== email));
  };

  const handleCreateNewsletter = () => {
    if (!subject.trim()) {
      toast({
        title: "Missing Subject",
        description: "Please enter a subject for your newsletter.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Missing Content",
        description: "Please enter content for your newsletter.",
        variant: "destructive",
      });
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one recipient email.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({ subject, content, recipients });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  if (isLoading) {
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
              Newsletter Management
            </h1>
            <p className="text-muted-foreground">
              Create and send newsletters to your customers
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="gap-2"
            data-testid="button-create-newsletter"
          >
            <Plus className="h-4 w-4" />
            Create Newsletter
          </Button>
        </div>
      </div>

      {!newsletters || newsletters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Newsletters Yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first newsletter to start engaging with your customers
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first">
              Create Newsletter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {newsletters.map((newsletter) => (
            <Card key={newsletter.id} className="hover-elevate" data-testid={`card-newsletter-${newsletter.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl mb-1">{newsletter.subject}</CardTitle>
                    <CardDescription>
                      Created: {new Date(newsletter.createdAt).toLocaleDateString()}
                      {newsletter.sentAt && ` • Sent: ${new Date(newsletter.sentAt).toLocaleDateString()}`}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(newsletter.status)}>
                    {newsletter.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {newsletter.content}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{newsletter.recipients.length} recipients</span>
                </div>

                <div className="flex gap-2 pt-2">
                  {newsletter.status === "draft" && (
                    <Button
                      onClick={() => sendMutation.mutate(newsletter.id)}
                      disabled={sendMutation.isPending}
                      className="gap-2"
                      data-testid={`button-send-${newsletter.id}`}
                    >
                      <Send className="h-4 w-4" />
                      {sendMutation.isPending ? "Sending..." : "Send Newsletter"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => deleteMutation.mutate(newsletter.id)}
                    disabled={deleteMutation.isPending}
                    className="gap-2"
                    data-testid={`button-delete-${newsletter.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-newsletter">
          <DialogHeader>
            <DialogTitle>Create Newsletter</DialogTitle>
            <DialogDescription>
              Compose your newsletter and add recipient email addresses
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter newsletter subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                data-testid="input-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your newsletter content..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                data-testid="input-content"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Recipients</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                  data-testid="input-email"
                />
                <Button onClick={addEmail} type="button" data-testid="button-add-email">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {recipients.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="gap-1 pr-1"
                      data-testid={`badge-email-${email}`}
                    >
                      {email}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeEmail(email)}
                        data-testid={`button-remove-${email}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> SendGrid API integration will be configured with your API key. The newsletter will be saved as a draft and can be sent when ready.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewsletter}
              disabled={createMutation.isPending}
              data-testid="button-save"
            >
              {createMutation.isPending ? "Saving..." : "Save Newsletter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
