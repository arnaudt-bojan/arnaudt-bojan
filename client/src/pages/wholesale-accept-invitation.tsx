import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface WholesaleInvitation {
  id: string;
  sellerId: string;
  buyerEmail: string;
  buyerName: string | null;
  status: string;
  token: string;
  createdAt: string;
  acceptedAt: string | null;
}

export default function WholesaleAcceptInvitation() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: invitation, isLoading } = useQuery<WholesaleInvitation>({
    queryKey: ["/api/wholesale/invitations/token", token],
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/wholesale/invitations/${token}/accept`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Invitation Accepted",
        description: "You now have access to the wholesale catalog!",
      });
      setTimeout(() => {
        setLocation("/wholesale/catalog");
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleAccept = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to accept this invitation",
        variant: "destructive",
      });
      setLocation(`/login?redirect=/wholesale/accept/${token}`);
      return;
    }
    setIsProcessing(true);
    acceptMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-6 w-6" />
              Already Accepted
            </CardTitle>
            <CardDescription>
              This invitation has already been accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can access the wholesale catalog at any time.
            </p>
            <Button onClick={() => setLocation("/wholesale/catalog")} className="w-full">
              Go to Wholesale Catalog
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Wholesale Invitation
          </CardTitle>
          <CardDescription>
            You've been invited to access the wholesale B2B catalog
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buyer Email:</span>
              <span className="font-medium">{invitation.buyerEmail}</span>
            </div>
            {invitation.buyerName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Buyer Name:</span>
                <span className="font-medium">{invitation.buyerName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invited:</span>
              <span className="font-medium">
                {new Date(invitation.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {!user && (
            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-sm text-muted-foreground">
                You need to be logged in to accept this invitation. You'll be redirected to login.
              </p>
            </div>
          )}

          <Button
            onClick={handleAccept}
            disabled={isProcessing}
            className="w-full"
            data-testid="button-accept-invitation"
          >
            {isProcessing ? "Accepting..." : "Accept Invitation"}
          </Button>

          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="w-full"
            data-testid="button-decline"
          >
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
