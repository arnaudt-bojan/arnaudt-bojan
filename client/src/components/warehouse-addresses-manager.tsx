import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Edit2, Trash2, Star } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { CountrySelect } from "@/components/CountrySelect";
import { getCountryName } from "@shared/countries";

interface WarehouseAddress {
  id: string;
  sellerId: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
  isDefault: number;
  shippoAddressObjectId: string | null;
}

const warehouseAddressSchema = z.object({
  name: z.string().min(1, "Name is required (e.g., Main Warehouse, NYC Location)"),
  addressLine1: z.string().min(1, "Street address is required"),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  countryCode: z.string().length(2, "Country code is required"),
  phone: z.string().optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
});

type WarehouseAddressFormData = z.infer<typeof warehouseAddressSchema>;

export function WarehouseAddressesManager() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<WarehouseAddress | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<WarehouseAddress | null>(null);

  const { data: addresses = [], isLoading } = useQuery<WarehouseAddress[]>({
    queryKey: ["/api/seller/warehouse-addresses"],
  });

  const form = useForm<WarehouseAddressFormData>({
    resolver: zodResolver(warehouseAddressSchema),
    defaultValues: {
      name: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      countryCode: "US",
      phone: "",
      isDefault: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WarehouseAddressFormData) => {
      return await apiRequest("POST", "/api/seller/warehouse-addresses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/warehouse-addresses"] });
      toast({ title: "Success", description: "Warehouse address added successfully" });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add warehouse address", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WarehouseAddressFormData> }) => {
      return await apiRequest("PATCH", `/api/seller/warehouse-addresses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/warehouse-addresses"] });
      toast({ title: "Success", description: "Warehouse address updated successfully" });
      setEditingAddress(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update warehouse address", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/seller/warehouse-addresses/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/warehouse-addresses"] });
      toast({ title: "Success", description: "Warehouse address deleted successfully" });
      setDeletingAddress(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete warehouse address", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/seller/warehouse-addresses/${id}/set-default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/warehouse-addresses"] });
      toast({ title: "Success", description: "Default warehouse address updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to set default warehouse address", variant: "destructive" });
    },
  });

  const handleOpenAddDialog = () => {
    form.reset({
      name: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      countryCode: "US",
      phone: "",
      isDefault: addresses.length === 0, // Auto-set as default if first address
    });
    setShowAddDialog(true);
  };

  const handleOpenEditDialog = (address: WarehouseAddress) => {
    form.reset({
      name: address.name,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      city: address.city,
      state: address.state || "",
      postalCode: address.postalCode,
      countryCode: address.countryCode,
      phone: address.phone || "",
      isDefault: address.isDefault === 1,
    });
    setEditingAddress(address);
  };

  const handleSubmit = (data: WarehouseAddressFormData) => {
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Loading warehouse addresses...</p>
      </div>
    );
  }

  const defaultAddress = addresses.find(addr => addr.isDefault === 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage your warehouse addresses. Required for shipping label generation.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} size="sm" data-testid="button-add-warehouse">
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">No warehouse addresses yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first warehouse address to start shipping</p>
            <Button onClick={handleOpenAddDialog} size="sm" data-testid="button-add-first-warehouse">
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className={address.isDefault === 1 ? "border-primary" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold" data-testid={`text-warehouse-name-${address.id}`}>
                        {address.name}
                      </h4>
                      {address.isDefault === 1 && (
                        <Badge variant="default" className="gap-1" data-testid={`badge-default-${address.id}`}>
                          <Star className="h-3 w-3" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p data-testid={`text-address-${address.id}`}>
                        {address.addressLine1}
                        {address.addressLine2 && `, ${address.addressLine2}`}
                      </p>
                      <p>
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p>{getCountryName(address.countryCode) || address.countryCode}</p>
                      {address.phone && <p>Phone: {address.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {address.isDefault !== 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(address.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${address.id}`}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditDialog(address)}
                      data-testid={`button-edit-${address.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingAddress(address)}
                      data-testid={`button-delete-${address.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || editingAddress !== null} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingAddress(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Edit Warehouse Address" : "Add Warehouse Address"}</DialogTitle>
            <DialogDescription>
              {editingAddress ? "Update your warehouse address details" : "Add a new warehouse address for shipping"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Main Warehouse, NYC Location" data-testid="input-warehouse-name" />
                    </FormControl>
                    <FormDescription>
                      Give this warehouse a memorable name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <CountrySelect
                      value={field.value}
                      onValueChange={(code: string) => field.onChange(code)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Search Address</FormLabel>
                <AddressAutocompleteInput
                  value={form.watch("addressLine1") || ""}
                  onChange={(value) => form.setValue("addressLine1", value)}
                  onSelectAddress={(address) => {
                    if (address.line1) form.setValue("addressLine1", address.line1);
                    if (address.line2) form.setValue("addressLine2", address.line2 || "");
                    if (address.city) form.setValue("city", address.city);
                    if (address.state) form.setValue("state", address.state);
                    if (address.postalCode) form.setValue("postalCode", address.postalCode);
                  }}
                  countryCode={form.watch("countryCode")}
                />
                <FormDescription>
                  Start typing to search for your address
                </FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main Street" data-testid="input-address-line1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apartment/Suite (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Suite 4B" data-testid="input-address-line2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="San Francisco" data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CA" data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="94117" data-testid="input-postal-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1 (555) 123-4567" data-testid="input-phone" />
                    </FormControl>
                    <FormDescription>
                      Contact number for shipping carriers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!editingAddress && addresses.length > 0 && (
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                          data-testid="checkbox-set-default"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Set as default warehouse</FormLabel>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingAddress(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingAddress !== null} onOpenChange={(open) => !open && setDeletingAddress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse Address?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAddress?.name}"? This action cannot be undone.
              {deletingAddress?.isDefault === 1 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  This is your default warehouse address. Another address will be set as default after deletion.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAddress && deleteMutation.mutate(deletingAddress.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
