import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, type AddressInput } from "../../../shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "./CountrySelect";
import { AddressAutocompleteInput } from "./AddressAutocompleteInput";
import { getCountryName } from "../../../shared/countries";
import type { Address } from "../../../shared/schema";

interface AddressFormProps {
  defaultValues?: Partial<AddressInput>;
  onSubmit: (data: AddressInput) => void;
  disabled?: boolean;
  showAutocomplete?: boolean;
}

export function AddressForm({ 
  defaultValues, 
  onSubmit, 
  disabled,
  showAutocomplete = true 
}: AddressFormProps) {
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultValues || {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      countryName: "",
    },
  });

  const handleAutocompleteSelect = (address: Partial<Address>) => {
    // Fill form fields with autocomplete results
    if (address.line1) form.setValue("line1", address.line1);
    if (address.line2) form.setValue("line2", address.line2);
    if (address.city) form.setValue("city", address.city);
    if (address.state) form.setValue("state", address.state);
    if (address.postalCode) form.setValue("postalCode", address.postalCode);
    if (address.country) {
      form.setValue("country", address.country);
      const countryName = getCountryName(address.country);
      if (countryName) form.setValue("countryName", countryName);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    form.setValue("country", countryCode);
    const countryName = getCountryName(countryCode);
    if (countryName) form.setValue("countryName", countryName);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Country (Required First) */}
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <CountrySelect
                value={field.value}
                onChange={handleCountryChange}
                disabled={disabled}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address Autocomplete (if enabled) */}
        {showAutocomplete && (
          <FormItem>
            <FormLabel>Search Address</FormLabel>
            <AddressAutocompleteInput
              value={form.watch("line1")}
              onChange={(value) => form.setValue("line1", value)}
              onSelectAddress={handleAutocompleteSelect}
              countryCode={form.watch("country")}
              disabled={disabled}
            />
            <p className="text-sm text-muted-foreground">
              Start typing to search for your address
            </p>
          </FormItem>
        )}

        {/* Line 1 (Street Address) */}
        <FormField
          control={form.control}
          name="line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Input {...field} placeholder="123 Main Street" disabled={disabled} data-testid="input-line1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Line 2 (Apartment/Suite) */}
        <FormField
          control={form.control}
          name="line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apartment/Suite (Optional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="Apt 4B" disabled={disabled} data-testid="input-line2" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City */}
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input {...field} placeholder="London" disabled={disabled} data-testid="input-city" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* State/Province */}
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State/Province/Region</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Greater London" disabled={disabled} data-testid="input-state" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Postal Code */}
        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="W8 7QQ" disabled={disabled} data-testid="input-postalCode" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
