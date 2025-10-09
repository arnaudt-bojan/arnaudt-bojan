import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("token");
    if (inviteToken) {
      setToken(inviteToken);
    } else {
      setStatus("error");
      setMessage("Invalid invitation link");
    }
  }, []);

  const acceptMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest("POST", `/api/invitations/accept/${token}`, {});
    },
    onSuccess: (data: any) => {
      setStatus("success");
      if (data.requiresLogin) {
        setMessage(`Invitation accepted! Check your email (${data.email}) for a magic link to log in and access your dashboard.`);
      } else {
        setMessage(`Welcome! You've been added as ${data.role}`);
        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
      }
    },
    onError: (error: any) => {
      setStatus("error");
      setMessage(error.message || "Failed to accept invitation");
    },
  });

  const handleAccept = () => {
    if (token) {
      acceptMutation.mutate(token);
    }
  };

  return (
    <div className="min-h-screen py-12 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="p-8 text-center">
          {status === "loading" && !acceptMutation.isPending && token && (
            <>
              <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
              <p className="text-muted-foreground mb-6">
                You've been invited to join the team. Click below to accept.
              </p>
              <Button
                onClick={handleAccept}
                className="w-full"
                data-testid="button-accept-invitation"
              >
                Accept Invitation
              </Button>
            </>
          )}

          {acceptMutation.isPending && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Processing invitation...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Success!</h2>
              <p className="text-muted-foreground mb-4">{message}</p>
              {!message.includes("Check your email") && (
                <p className="text-sm text-muted-foreground">
                  Redirecting to dashboard...
                </p>
              )}
              {message.includes("Check your email") && (
                <Button
                  onClick={() => setLocation("/")}
                  className="mt-4"
                  data-testid="button-go-home-success"
                >
                  Go to Home
                </Button>
              )}
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">{message}</p>
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                data-testid="button-go-home"
              >
                Go to Home
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
