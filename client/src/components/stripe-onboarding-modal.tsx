import { useState, useEffect } from "react";
import { loadConnectAndInitialize, StripeConnectInstance } from "@stripe/connect-js";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StripeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onComplete: () => void;
  purpose?: 'onboarding' | 'payouts';
}

export function StripeOnboardingModal({ isOpen, onClose, accountId, onComplete, purpose = 'onboarding' }: StripeOnboardingModalProps) {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !accountId) return;

    const fetchClientSecret = async () => {
      try {
        const response = await apiRequest("POST", "/api/stripe/account-session", { purpose });
        const data = await response.json();
        return data.clientSecret;
      } catch (error) {
        console.error("Failed to fetch client secret:", error);
        toast({
          title: "Error",
          description: "Failed to initialize Stripe onboarding",
          variant: "destructive",
        });
        throw error;
      }
    };

    const initializeStripe = async () => {
      const instance = loadConnectAndInitialize({
        publishableKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
        fetchClientSecret,
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: 'hsl(262.1 83.3% 57.8%)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            borderRadius: '0.5rem',
          },
        },
      });

      setStripeConnectInstance(instance);
    };

    initializeStripe();
  }, [isOpen, accountId]);

  const handleExit = async () => {
    try {
      const response = await apiRequest("GET", "/api/stripe/account-status");
      const data = await response.json();
      
      if (data.chargesEnabled) {
        toast({
          title: "Stripe Connected!",
          description: data.payoutsEnabled 
            ? "Your payment account is fully set up." 
            : "You can accept payments! Add bank details in settings to receive payouts.",
        });
        onComplete();
      } else {
        toast({
          title: "Setup Incomplete",
          description: "Please complete all required fields to start accepting payments.",
          variant: "destructive",
        });
      }
      onClose();
    } catch (error) {
      console.error("Failed to check account status:", error);
      onClose();
    }
  };

  if (!stripeConnectInstance) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0" data-testid="dialog-stripe-onboarding">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>
            {purpose === 'payouts' ? 'Add Bank Details for Payouts' : 'Connect Your Stripe Account'}
          </DialogTitle>
          <DialogDescription>
            {purpose === 'payouts' 
              ? 'Add your bank account details to receive payouts from customer purchases.'
              : 'Complete the setup to start accepting payments. You can add bank details later to receive payouts.'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-auto">
          <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
            <ConnectAccountOnboarding
              onExit={handleExit}
              collectionOptions={{
                fields: 'currently_due',
                futureRequirements: 'omit',
              }}
            />
          </ConnectComponentsProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
