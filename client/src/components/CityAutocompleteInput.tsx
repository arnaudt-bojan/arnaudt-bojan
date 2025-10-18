import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface CityResult {
  placeId: string;
  displayName: string;
  city: string;
  state: string;
  country: string;
  countryName: string;
  latitude: number;
  longitude: number;
}

interface CityAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onCitySelect?: (city: CityResult) => void;
  countryCode?: string; // Optional: filter results by country
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

/**
 * City autocomplete input for shipping zones
 * Uses LocationIQ to search cities (no street addresses)
 * 
 * Architecture 3: Server-side API calls, client displays results
 */
export function CityAutocompleteInput({
  value,
  onChange,
  onCitySelect,
  countryCode,
  placeholder = "Search for a city",
  disabled = false,
  "data-testid": testId = "input-city-autocomplete",
}: CityAutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CityResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchCities = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({ q: query });
      if (countryCode) {
        params.append("countryCode", countryCode);
      }

      const response = await apiRequest("GET", `/api/cities/search?${params.toString()}`, null);

      if (!response.ok) {
        throw new Error("Failed to search cities");
      }

      const data: CityResult[] = await response.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch (error: any) {
      console.error("[CityAutocomplete] Search failed:", error);
      toast({
        title: "Search Failed",
        description: "Unable to search for cities. Please try again.",
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [countryCode, toast]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    // Debounce search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchCities(newValue);
    }, 300); // 300ms debounce
  };

  const handleSelectCity = (city: CityResult) => {
    onChange(city.displayName);
    setOpen(false);
    setResults([]);
    
    if (onCitySelect) {
      onCitySelect(city);
    }
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            data-testid={testId}
            className="pr-8"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <MapPin className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Searching..." : "No cities found"}
            </CommandEmpty>
            <CommandGroup>
              {results.map((city) => (
                <CommandItem
                  key={city.placeId}
                  value={city.placeId}
                  onSelect={() => handleSelectCity(city)}
                  data-testid={`option-city-${city.placeId}`}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{city.city}</span>
                    <span className="text-sm text-muted-foreground">
                      {[city.state, city.countryName].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
