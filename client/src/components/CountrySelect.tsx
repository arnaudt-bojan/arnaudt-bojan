import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl } from "@/components/ui/form";
import { COUNTRIES } from "../../../shared/countries";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CountrySelect({ value, onChange, disabled }: CountrySelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <FormControl>
        <SelectTrigger data-testid="select-country">
          <SelectValue placeholder="Select country" />
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
