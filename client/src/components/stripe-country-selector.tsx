import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

interface StripeCountrySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onCountrySelected: (country: string) => void;
}

// Common countries that support Stripe Express
const STRIPE_COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'IE', name: 'Ireland', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'FI', name: 'Finland', currency: 'EUR' },
  { code: 'PL', name: 'Poland', currency: 'PLN' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
];

export function StripeCountrySelector({ isOpen, onClose, onCountrySelected }: StripeCountrySelectorProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('US');

  const handleContinue = () => {
    onCountrySelected(selectedCountry);
    onClose();
  };

  const selectedCountryData = STRIPE_COUNTRIES.find(c => c.code === selectedCountry);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-country-selector">
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Select Your Country</DialogTitle>
          <DialogDescription className="text-center">
            Choose the country where your business is registered. This cannot be changed later, so please select carefully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {STRIPE_COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name} ({country.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCountryData && (
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <p className="text-sm font-medium">Selected: {selectedCountryData.name}</p>
              <p className="text-sm text-muted-foreground">
                Your store will use {selectedCountryData.currency} as the default currency
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-country"
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleContinue}
            data-testid="button-continue-stripe"
            className="flex-1 sm:flex-initial"
          >
            Continue to Stripe Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
