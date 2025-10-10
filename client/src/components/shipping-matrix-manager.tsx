import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Package } from "lucide-react";

const matrixSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const zoneSchema = z.object({
  zoneType: z.enum(["continent", "country", "city"]),
  zoneName: z.string().min(1, "Zone name is required"),
  zoneCode: z.string().optional(),
  rate: z.coerce.number().min(0, "Rate must be 0 or greater"),
  estimatedDays: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
});

type MatrixForm = z.infer<typeof matrixSchema>;
type ZoneForm = z.infer<typeof zoneSchema>;

export function ShippingMatrixManager() {
  const { toast } = useToast();
  const [selectedMatrix, setSelectedMatrix] = useState<any | null>(null);
  const [showMatrixDialog, setShowMatrixDialog] = useState(false);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);

  const { data: matrices = [], refetch: refetchMatrices } = useQuery<any[]>({
    queryKey: ["/api/shipping-matrices"],
  });

  const { data: zones = [], refetch: refetchZones } = useQuery<any[]>({
    queryKey: ["/api/shipping-matrices", selectedMatrix?.id, "zones"],
    enabled: !!selectedMatrix?.id,
  });

  const matrixForm = useForm<MatrixForm>({
    resolver: zodResolver(matrixSchema),
    defaultValues: { name: "", description: "" },
  });

  const zoneForm = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      zoneType: "continent" as const,
      zoneName: "",
      zoneCode: "",
      rate: 0,
      estimatedDays: "" as const,
    },
  });

  const createMatrixMutation = useMutation({
    mutationFn: (data: MatrixForm) => apiRequest("POST", "/api/shipping-matrices", data),
    onSuccess: () => {
      refetchMatrices();
      setShowMatrixDialog(false);
      matrixForm.reset();
      toast({ title: "Success", description: "Shipping matrix created successfully" });
    },
  });

  const createZoneMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/shipping-zones", data),
    onSuccess: () => {
      refetchZones();
      setShowZoneDialog(false);
      setEditingZone(null);
      zoneForm.reset();
      toast({ title: "Success", description: "Shipping zone added successfully" });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/shipping-zones/${id}`, data),
    onSuccess: () => {
      refetchZones();
      setShowZoneDialog(false);
      setEditingZone(null);
      zoneForm.reset();
      toast({ title: "Success", description: "Shipping zone updated successfully" });
    },
  });

  const deleteMatrixMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shipping-matrices/${id}`, {}),
    onSuccess: () => {
      refetchMatrices();
      setSelectedMatrix(null);
      toast({ title: "Success", description: "Shipping matrix deleted successfully" });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shipping-zones/${id}`, {}),
    onSuccess: () => {
      refetchZones();
      toast({ title: "Success", description: "Shipping zone deleted successfully" });
    },
  });

  const handleCreateMatrix = (data: MatrixForm) => {
    createMatrixMutation.mutate(data);
  };

  const handleCreateZone = (data: ZoneForm) => {
    const zoneData = {
      ...data,
      matrixId: selectedMatrix.id,
      rate: data.rate,
      estimatedDays: data.estimatedDays || null,
    };

    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data: zoneData });
    } else {
      createZoneMutation.mutate(zoneData);
    }
  };

  const handleEditZone = (zone: any) => {
    setEditingZone(zone);
    zoneForm.reset({
      zoneType: zone.zoneType,
      zoneName: zone.zoneName,
      zoneCode: zone.zoneCode || "",
      rate: parseFloat(zone.rate),
      estimatedDays: zone.estimatedDays || "",
    });
    setShowZoneDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Shipping Matrices</h3>
          <p className="text-sm text-muted-foreground">
            Create zone-based shipping rates for your products
          </p>
        </div>
        <Button
          onClick={() => {
            matrixForm.reset();
            setShowMatrixDialog(true);
          }}
          data-testid="button-create-matrix"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Matrix
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matrices List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Shipping Matrices</CardTitle>
            <CardDescription>Select a matrix to manage its zones</CardDescription>
          </CardHeader>
          <CardContent>
            {matrices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shipping matrices created yet</p>
            ) : (
              <div className="space-y-2">
                {matrices.map((matrix: any) => (
                  <div
                    key={matrix.id}
                    className={`p-3 rounded-lg border cursor-pointer hover-elevate active-elevate-2 ${
                      selectedMatrix?.id === matrix.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedMatrix(matrix)}
                    data-testid={`matrix-item-${matrix.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{matrix.name}</p>
                        {matrix.description && (
                          <p className="text-sm text-muted-foreground">{matrix.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMatrixMutation.mutate(matrix.id);
                        }}
                        data-testid={`button-delete-matrix-${matrix.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zones Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {selectedMatrix ? `Zones: ${selectedMatrix.name}` : "Select a Matrix"}
                </CardTitle>
                <CardDescription>Add shipping rates for different zones</CardDescription>
              </div>
              {selectedMatrix && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingZone(null);
                    zoneForm.reset();
                    setShowZoneDialog(true);
                  }}
                  data-testid="button-add-zone"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedMatrix ? (
              <p className="text-sm text-muted-foreground">Select a matrix to view its zones</p>
            ) : zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No zones added yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone: any) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{zone.zoneName}</TableCell>
                      <TableCell className="capitalize">{zone.zoneType}</TableCell>
                      <TableCell>${zone.rate}</TableCell>
                      <TableCell>{zone.estimatedDays || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditZone(zone)}
                            data-testid={`button-edit-zone-${zone.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteZoneMutation.mutate(zone.id)}
                            data-testid={`button-delete-zone-${zone.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Matrix Dialog */}
      <Dialog open={showMatrixDialog} onOpenChange={setShowMatrixDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shipping Matrix</DialogTitle>
            <DialogDescription>
              Create a new shipping matrix to organize your shipping zones
            </DialogDescription>
          </DialogHeader>
          <Form {...matrixForm}>
            <form onSubmit={matrixForm.handleSubmit(handleCreateMatrix)} className="space-y-4">
              <FormField
                control={matrixForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrix Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Standard International" data-testid="input-matrix-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={matrixForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief description" data-testid="input-matrix-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMatrixMutation.isPending} data-testid="button-save-matrix">
                  {createMatrixMutation.isPending ? "Creating..." : "Create Matrix"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Zone" : "Add Shipping Zone"}</DialogTitle>
            <DialogDescription>
              Define a shipping zone and its rate
            </DialogDescription>
          </DialogHeader>
          <Form {...zoneForm}>
            <form onSubmit={zoneForm.handleSubmit(handleCreateZone)} className="space-y-4">
              <FormField
                control={zoneForm.control}
                name="zoneType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-zone-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="continent">Continent</SelectItem>
                        <SelectItem value="country">Country</SelectItem>
                        <SelectItem value="city">City</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={zoneForm.control}
                name="zoneName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., North America, United States, New York" data-testid="input-zone-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={zoneForm.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Rate ($)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-zone-rate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={zoneForm.control}
                name="estimatedDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Delivery Days (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" placeholder="7" data-testid="input-zone-days" />
                    </FormControl>
                    <FormDescription>
                      Estimated delivery time in days
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createZoneMutation.isPending || updateZoneMutation.isPending}
                  data-testid="button-save-zone"
                >
                  {editingZone ? "Update Zone" : "Add Zone"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
