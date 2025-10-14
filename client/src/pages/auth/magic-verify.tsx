import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MagicLinkVerify() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyMagicLink = async () => {
      try {
        // Extract token from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setError('No verification token provided');
          setIsVerifying(false);
          return;
        }

        // Call backend verification endpoint
        const response = await fetch(`/api/auth/magic/verify?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setSuccess(true);
          setIsVerifying(false);

          // Invalidate auth cache to refresh user data
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

          toast({
            title: "Welcome!",
            description: `You're now logged in as ${data.user?.email || 'user'}`,
          });

          // Redirect to appropriate dashboard
          setTimeout(() => {
            setLocation(data.redirectUrl || '/');
          }, 1000);
        } else {
          setError(data.error || 'Verification failed');
          setIsVerifying(false);
        }
      } catch (err) {
        console.error('Magic link verification error:', err);
        setError('An unexpected error occurred');
        setIsVerifying(false);
      }
    };

    verifyMagicLink();
  }, [setLocation, toast]);

  const handleRequestNewLink = () => {
    setLocation('/email-login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isVerifying && "Verifying Magic Link"}
            {success && "Verification Successful"}
            {error && "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {isVerifying && "Please wait while we verify your magic link..."}
            {success && "Redirecting you to your dashboard..."}
            {error && "We couldn't verify your magic link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {isVerifying && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" data-testid="loader-verifying" />
              <p className="text-sm text-muted-foreground">Authenticating...</p>
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500" data-testid="icon-success" />
              <p className="text-sm text-muted-foreground">Redirecting...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center space-y-4 w-full">
              <XCircle className="h-12 w-12 text-destructive" data-testid="icon-error" />
              <p className="text-sm text-center text-destructive" data-testid="text-error-message">
                {error}
              </p>
              <div className="space-y-2 w-full">
                <p className="text-sm text-muted-foreground text-center">
                  Your magic link may have expired or been used already.
                </p>
                <Button
                  onClick={handleRequestNewLink}
                  className="w-full"
                  data-testid="button-request-new-link"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Request New Magic Link
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
