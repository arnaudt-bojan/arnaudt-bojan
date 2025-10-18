import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONTINENTS, type ContinentCode } from "@shared/continents";

interface ContinentSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

/**
 * Continent selector for shipping zones
 * Uses standardized continent codes for normalized matching
 * 
 * Architecture 3: Static list, no API calls
 */
export function ContinentSelect({
  value,
  onValueChange,
  placeholder = "Select continent",
  disabled = false,
  "data-testid": testId = "select-continent",
}: ContinentSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {CONTINENTS.map((continent) => (
          <SelectItem
            key={continent.code}
            value={continent.code}
            data-testid={`option-continent-${continent.code}`}
          >
            {continent.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
