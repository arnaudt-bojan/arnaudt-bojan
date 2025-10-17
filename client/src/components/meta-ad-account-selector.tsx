import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { SiFacebook } from "react-icons/si";
import type { MetaAdAccount } from "@shared/schema";

interface MetaAdAccountSelectorProps {
  accounts: MetaAdAccount[];
  onAccountSelected: () => void;
}

export function MetaAdAccountSelector({ accounts, onAccountSelected }: MetaAdAccountSelectorProps) {
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const selectAccountMutation = useMutation({
    mutationFn: async (adAccountId: string) =>
      apiRequest("POST", "/api/meta/select-account", { adAccountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/ad-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meta/campaigns"] });
      toast({
        title: "Ad Account Selected",
        description: "Your selected ad account is now active for campaigns",
      });
      onAccountSelected();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to select ad account",
        variant: "destructive",
      });
    },
  });

  const handleSelect = () => {
    if (!selectedAccountId) {
      toast({
        title: "No Account Selected",
        description: "Please select an ad account from the dropdown",
        variant: "destructive",
      });
      return;
    }
    selectAccountMutation.mutate(selectedAccountId);
  };

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  return (
    <Card data-testid="card-account-selector">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <SiFacebook className="h-8 w-8 text-[#1877F2]" />
          <div className="flex-1">
            <CardTitle data-testid="text-selector-title">Select Ad Account</CardTitle>
            <CardDescription>
              You have {accounts.length} Meta ad account{accounts.length !== 1 ? 's' : ''} connected
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert data-testid="alert-multiple-accounts">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select which ad account you want to use for creating campaigns
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <label className="text-sm font-medium">Choose Ad Account:</label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger data-testid="select-ad-account">
              <SelectValue placeholder="Select an ad account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem 
                  key={account.id} 
                  value={account.id}
                  data-testid={`option-account-${account.id}`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {account.businessName || `Ad Account ${account.metaAdAccountId}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID: {account.metaAdAccountId} • {account.currency || 'USD'}
                      {account.isSelected === 1 && ' • Currently Selected'}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedAccount && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2" data-testid="selected-account-details">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium">Selected Account Details:</span>
            </div>
            <div className="text-sm space-y-1 ml-6">
              <p><span className="text-muted-foreground">Business Name:</span> {selectedAccount.businessName || 'N/A'}</p>
              <p><span className="text-muted-foreground">Account ID:</span> {selectedAccount.metaAdAccountId}</p>
              <p><span className="text-muted-foreground">Currency:</span> {selectedAccount.currency || 'USD'}</p>
              <p><span className="text-muted-foreground">Status:</span> {selectedAccount.status}</p>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleSelect}
          disabled={!selectedAccountId || selectAccountMutation.isPending}
          data-testid="button-confirm-selection"
        >
          {selectAccountMutation.isPending ? "Selecting..." : "Confirm Selection"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          You can change your selected account anytime in settings
        </p>
      </CardContent>
    </Card>
  );
}
