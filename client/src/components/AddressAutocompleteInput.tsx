import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Address } from "../../../shared/schema";

interface AddressSuggestion {
  displayName: string;
  address: Partial<Address>;
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress: (address: Partial<Address>) => void;
  countryCode?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  onSelectAddress,
  countryCode,
  placeholder = "Start typing your address...",
  disabled
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiRequest('POST', '/api/addresses/search', {
          query: value,
          countryCode,
          limit: 5
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.results || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Address search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [value, countryCode]);

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    onChange(suggestion.displayName);
    onSelectAddress(suggestion.address);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          data-testid="input-address-search"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
          data-testid="list-address-suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start text-left font-normal"
              onMouseDown={() => handleSelectSuggestion(suggestion)}
              data-testid={`button-address-suggestion-${index}`}
            >
              <MapPin className="mr-2 h-4 w-4" />
              <span className="truncate">{suggestion.displayName}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
