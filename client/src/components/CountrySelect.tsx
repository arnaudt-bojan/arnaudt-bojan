import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl } from "@/components/ui/form";
import { COUNTRIES } from "../../../shared/countries";

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function CountrySelect({ value, onValueChange, placeholder, disabled, "data-testid": dataTestId }: CountrySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <FormControl>
        <SelectTrigger data-testid={dataTestId || "select-country"}>
          <SelectValue placeholder={placeholder || "Select country"} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {COUNTRIES.map((country) => (
          <SelectItem 
            key={country.code} 
            value={country.code}
            data-testid={`option-country-${country.code}`}
          >
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
