import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CreditCard, Plus, Trash2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SavedPaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  label: string | null;
  isDefault: number;
  createdAt: string;
  updatedAt: string;
}

function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [label, setLabel] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast({
          title: "Error",
          description: submitError.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: window.location.href,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (setupIntent && setupIntent.status === "succeeded") {
        await apiRequest("POST", "/api/user/payment-methods", {
          stripePaymentMethodId: setupIntent.payment_method,
          label: label || null,
        });

        toast({
          title: "Success",
          description: "Payment method added successfully!",
        });
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add payment method",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Label (Optional)</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Personal, Business, etc."
          data-testid="input-payment-label"
        />
      </div>
      <div className="border rounded-md p-4 bg-background">
        <PaymentElement />
      </div>
      <DialogFooter>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing} 
          className="w-full" 
          data-testid="button-save-payment-method"
        >
          {isProcessing ? "Processing..." : "Save Payment Method"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SavedPaymentMethodsManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: paymentMethods = [], isLoading } = useQuery<SavedPaymentMethod[]>({
    queryKey: ["/api/user/payment-methods"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/user/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/payment-methods"] });
      toast({
        title: "Success",
        description: "Payment method deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment method",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/user/payment-methods/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/payment-methods"] });
      toast({
        title: "Success",
        description: "Default payment method updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set default payment method",
        variant: "destructive",
      });
    },
  });

  const handleOpenAddDialog = async () => {
    try {
      const response = await apiRequest("POST", "/api/payment/setup-intent");
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setIsAddDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment form",
        variant: "destructive",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setClientSecret(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/user/payment-methods"] });
    handleCloseDialog();
  };

  const getCardIcon = (brand: string | null) => {
    return <CreditCard className="h-8 w-8" />;
  };

  if (isLoading) {
    return <div>Loading payment methods...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Saved Payment Methods</h3>
          <p className="text-sm text-muted-foreground">
            Securely manage your payment methods for faster checkout
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            🔒 Your card details are securely stored by Stripe. We never see or store your full card number.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddDialog} data-testid="button-add-payment-method">
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>
                Add a new payment method for faster checkout
              </DialogDescription>
            </DialogHeader>
            {clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <AddPaymentMethodForm onSuccess={handleSuccess} />
              </Elements>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              No saved payment methods yet
            </p>
            <Button onClick={handleOpenAddDialog} data-testid="button-add-first-payment-method">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={method.isDefault ? "border-primary" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
                      {getCardIcon(method.cardBrand)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold capitalize">
                          {method.cardBrand || "Card"} ••••{" "}{method.cardLast4}
                        </h4>
                        {method.label && (
                          <Badge variant="secondary" data-testid={`badge-payment-label-${method.id}`}>
                            {method.label}
                          </Badge>
                        )}
                        {method.isDefault === 1 && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20" data-testid={`badge-default-payment-${method.id}`}>
                            <Check className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {method.cardExpMonth}/{method.cardExpYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {method.isDefault === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(method.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-payment-${method.id}`}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(method.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-payment-${method.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
