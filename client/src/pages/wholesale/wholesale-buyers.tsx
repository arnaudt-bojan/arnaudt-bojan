import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Users } from "lucide-react";
import type { WholesaleInvitation, WholesaleAccessGrant } from "@shared/schema";

// Invitation form schema
const inviteSchema = z.object({
  email: z.string().email("Must be a valid email address"),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function WholesaleBuyers() {
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
    },
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery<WholesaleInvitation[]>({
    queryKey: ['/api/wholesale/invitations'],
  });

  // Fetch active buyers
  const { data: buyers = [], isLoading: loadingBuyers } = useQuery<WholesaleAccessGrant[]>({
    queryKey: ['/api/wholesale/buyers'],
  });

  // Create invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
      return await apiRequest('/api/wholesale/invite', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wholesale/invitations'] });
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
      setInviteDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const onInviteSubmit = (data: InviteForm) => {
    inviteMutation.mutate(data);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20" },
      accepted: { label: "Accepted", className: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" },
      expired: { label: "Expired", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400 hover:bg-gray-500/20" },
      cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20" },
    };

    const config = statusConfig[status] || { label: status, className: "" };
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="page-wholesale-buyers">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Wholesale Buyers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your B2B customer relationships
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} data-testid="button-invite-buyer">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite New Buyer
        </Button>
      </div>

      {/* Invited Buyers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Invited Buyers</CardTitle>
          <CardDescription>Pending and recent invitations</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvitations ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No invitations sent yet. Invite buyers to access your wholesale catalog.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                      <TableCell className="font-medium" data-testid={`text-email-${invitation.id}`}>
                        {invitation.email}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invitation.status)}
                      </TableCell>
                      <TableCell data-testid={`text-date-${invitation.id}`}>
                        {invitation.createdAt ? format(new Date(invitation.createdAt), "MMM d, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={invitation.status !== "pending"}
                          data-testid={`button-revoke-${invitation.id}`}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Buyers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Active Buyers</CardTitle>
          <CardDescription>Current wholesale customers</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBuyers ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : buyers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No active buyers yet. Invite buyers to start building your wholesale network.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer Email</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyers.map((buyer) => (
                    <TableRow key={buyer.id} data-testid={`row-buyer-${buyer.id}`}>
                      <TableCell className="font-medium" data-testid={`text-buyer-email-${buyer.id}`}>
                        {buyer.buyerEmail}
                      </TableCell>
                      <TableCell data-testid={`text-join-date-${buyer.id}`}>
                        {buyer.createdAt ? format(new Date(buyer.createdAt), "MMM d, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-${buyer.id}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent data-testid="dialog-invite">
          <DialogHeader>
            <DialogTitle>Invite Wholesale Buyer</DialogTitle>
            <DialogDescription>
              Send an invitation to a buyer to access your wholesale catalog
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="buyer@company.com" data-testid="input-invite-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteDialogOpen(false)}
                  data-testid="button-cancel-invite"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={inviteMutation.isPending}
                  data-testid="button-send-invite"
                >
                  {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
