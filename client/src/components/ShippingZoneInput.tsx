import { CountrySelect } from "@/components/CountrySelect";
import { ContinentSelect } from "@/components/ContinentSelect";
import { CityAutocompleteInput, type CityResult } from "@/components/CityAutocompleteInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getContinentByCode } from "@shared/continents";
import { getCountryName } from "@shared/countries";

export type ZoneType = "continent" | "country" | "city";

interface ShippingZoneInputProps {
  zoneType: ZoneType;
  onZoneTypeChange: (type: ZoneType) => void;
  zoneName: string;
  onZoneNameChange: (name: string) => void;
  zoneIdentifier?: string;
  onZoneIdentifierChange?: (identifier: string) => void;
  disabled?: boolean;
}

/**
 * Shipping Zone Input Component
 * 
 * Displays appropriate picker based on zone type:
 * - Continent: ContinentSelect (static dropdown)
 * - Country: CountrySelect (ISO codes)
 * - City: CityAutocompleteInput (LocationIQ)
 * 
 * Architecture 3: Normalized identifiers for server-side matching
 */
export function ShippingZoneInput({
  zoneType,
  onZoneTypeChange,
  zoneName,
  onZoneNameChange,
  zoneIdentifier,
  onZoneIdentifierChange,
  disabled = false,
}: ShippingZoneInputProps) {

  const handleCitySelect = (city: CityResult) => {
    // Update zone name (display value)
    onZoneNameChange(city.displayName);
    
    // Update zone identifier (for matching)
    if (onZoneIdentifierChange) {
      onZoneIdentifierChange(city.placeId);
    }
  };

  const handleContinentChange = (continentCode: string) => {
    // Update zone identifier
    if (onZoneIdentifierChange) {
      onZoneIdentifierChange(continentCode);
    }
    
    // Update zone name from continents list (synchronous)
    const continent = getContinentByCode(continentCode);
    if (continent) {
      onZoneNameChange(continent.displayName);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    // Update zone identifier
    if (onZoneIdentifierChange) {
      onZoneIdentifierChange(countryCode);
    }
    
    // Update zone name from countries list (synchronous)
    const countryName = getCountryName(countryCode);
    if (countryName) {
      onZoneNameChange(countryName);
    }
  };

  return (
    <div className="space-y-4">
      {/* Zone Type Selector */}
      <div className="space-y-2">
        <Label htmlFor="zone-type">Zone Type</Label>
        <Select
          value={zoneType}
          onValueChange={(value) => onZoneTypeChange(value as ZoneType)}
          disabled={disabled}
        >
          <SelectTrigger id="zone-type" data-testid="select-zone-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="continent" data-testid="option-zone-type-continent">
              Continent
            </SelectItem>
            <SelectItem value="country" data-testid="option-zone-type-country">
              Country
            </SelectItem>
            <SelectItem value="city" data-testid="option-zone-type-city">
              City
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Zone Picker based on Type */}
      <div className="space-y-2">
        <Label htmlFor="zone-name">
          {zoneType === "continent" && "Select Continent"}
          {zoneType === "country" && "Select Country"}
          {zoneType === "city" && "Search City"}
        </Label>

        {zoneType === "continent" && (
          <ContinentSelect
            value={zoneIdentifier || ""}
            onValueChange={handleContinentChange}
            placeholder="Select a continent"
            disabled={disabled}
            data-testid="input-zone-continent"
          />
        )}

        {zoneType === "country" && (
          <CountrySelect
            value={zoneIdentifier || ""}
            onValueChange={handleCountryChange}
            placeholder="Select a country"
            disabled={disabled}
            data-testid="input-zone-country"
          />
        )}

        {zoneType === "city" && (
          <CityAutocompleteInput
            value={zoneName}
            onChange={onZoneNameChange}
            onCitySelect={handleCitySelect}
            placeholder="Search for a city (e.g., New York, London)"
            disabled={disabled}
            data-testid="input-zone-city"
          />
        )}
      </div>

      {/* Display selected zone name (read-only) */}
      {zoneName && (
        <div className="text-sm text-muted-foreground">
          Selected: <span className="font-medium">{zoneName}</span>
          {zoneIdentifier && zoneIdentifier !== zoneName && (
            <span className="ml-2 text-xs">({zoneIdentifier})</span>
          )}
        </div>
      )}
    </div>
  );
}
