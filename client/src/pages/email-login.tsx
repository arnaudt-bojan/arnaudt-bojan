import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import { detectDomain } from "@/lib/domain-utils";

export default function EmailLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Detect domain context to pass to backend
  const domainInfo = detectDomain();
  const sellerContext = domainInfo.isSellerDomain ? domainInfo.sellerUsername : undefined;

  const sendCodeMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/email/send-code", { 
        email,
        sellerContext // Pass seller context to backend
      });
      return response.json();
    },
    onSuccess: () => {
      setCodeSent(true);
      toast({
        title: "Code Sent!",
        description: "Check your email for a 6-digit authentication code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send code",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/email/verify-code", { 
        email, 
        code,
        sellerContext // Pass seller context to backend
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome!",
        description: `You're now logged in as ${data.user.email}`,
      });
      // Redirect to URL provided by backend
      const redirectUrl = data.redirectUrl || '/';
      setLocation(redirectUrl);
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Code",
        description: error.message || "The code you entered is invalid or expired",
        variant: "destructive",
      });
    },
  });

  const sendMagicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/email/send-magic-link", { 
        email,
        sellerContext // Pass seller context to backend
      });
      return response.json();
    },
    onSuccess: () => {
      setLinkSent(true);
      toast({
        title: "Magic Link Sent!",
        description: "Check your email and click the link to sign in instantly.",
        duration: 8000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link",
        variant: "destructive",
      });
    },
  });

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    sendCodeMutation.mutate(email);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit code from your email",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate({ email, code });
  };

  const handleSendMagicLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    sendMagicLinkMutation.mutate(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome to Upfirst</CardTitle>
          <CardDescription>
            Sign in with your email - no password needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-login-method">
              <TabsTrigger value="code" data-testid="tab-code">
                <KeyRound className="h-4 w-4 mr-2" />
                Code
              </TabsTrigger>
              <TabsTrigger value="magic-link" data-testid="tab-magic-link">
                <Mail className="h-4 w-4 mr-2" />
                Magic Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="space-y-4 mt-6">
              {!codeSent ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-code">Email Address</Label>
                    <Input
                      id="email-code"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email-code"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={sendCodeMutation.isPending}
                    data-testid="button-send-code"
                  >
                    {sendCodeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Code'
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">6-Digit Code</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                      data-testid="input-code"
                      required
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      Enter the code sent to {email}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={verifyCodeMutation.isPending}
                    data-testid="button-verify-code"
                  >
                    {verifyCodeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setCodeSent(false);
                      setCode("");
                    }}
                    data-testid="button-back-to-email"
                  >
                    Use Different Email
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="magic-link" className="space-y-4 mt-6">
              {!linkSent ? (
                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-magic">Email Address</Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email-magic"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={sendMagicLinkMutation.isPending}
                    data-testid="button-send-magic-link"
                  >
                    {sendMagicLinkMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Magic Link'
                    )}
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4 py-6">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Check Your Email</h3>
                    <p className="text-sm text-muted-foreground">
                      We've sent a magic link to <strong>{email}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click the link in your email to sign in instantly
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setLinkSent(false);
                      setEmail("");
                    }}
                    data-testid="button-try-again"
                  >
                    Use Different Email
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
