import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { BulkImageInput } from "@/components/bulk-image-input";

// Wholesale product schema
const wholesaleProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  images: z.array(z.string().min(1, "Image URL/path is required")).min(1, "At least one image is required"),
  category: z.string().min(1, "Category is required"),
  rrp: z.coerce.number().positive("RRP must be positive"),
  wholesalePrice: z.coerce.number().positive("Wholesale price must be positive"),
  suggestedRetailPrice: z.coerce.number().positive().optional().or(z.literal("")),
  moq: z.coerce.number().int().positive("MOQ must be a positive integer"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative"),
  depositAmount: z.coerce.number().positive().optional().or(z.literal("")),
  depositPercentage: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  requiresDeposit: z.boolean().default(false),
  expectedShipDate: z.string().optional(),
  balancePaymentDate: z.string().optional(),
  orderDeadline: z.string().optional(),
  paymentTerms: z.string().default("Net 30"),
  shipFromStreet: z.string().optional(),
  shipFromCity: z.string().optional(),
  shipFromState: z.string().optional(),
  shipFromZip: z.string().optional(),
  shipFromCountry: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
}).refine((data) => {
  if (!data.requiresDeposit) return true;
  const hasAmount = data.depositAmount && data.depositAmount !== "";
  const hasPercentage = data.depositPercentage && data.depositPercentage !== "";
  return (hasAmount && !hasPercentage) || (!hasAmount && hasPercentage);
}, {
  message: "Either deposit amount or percentage is required (not both)",
  path: ["depositAmount"]
});

type WholesaleProductForm = z.infer<typeof wholesaleProductSchema>;

export default function CreateWholesaleProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<WholesaleProductForm>({
    resolver: zodResolver(wholesaleProductSchema),
    defaultValues: {
      name: "",
      description: "",
      images: [],
      category: "",
      rrp: "" as any,
      wholesalePrice: "" as any,
      suggestedRetailPrice: "",
      moq: "" as any,
      stock: "" as any,
      depositAmount: "",
      depositPercentage: "",
      requiresDeposit: false,
      paymentTerms: "Net 30",
      shipFromStreet: "",
      shipFromCity: "",
      shipFromState: "",
      shipFromZip: "",
      shipFromCountry: "US",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WholesaleProductForm) => {
      // Transform form data to API format
      const payload = {
        name: data.name,
        description: data.description,
        image: data.images[0], // First image as hero/primary
        images: data.images, // All images array
        category: data.category,
        rrp: Number(data.rrp),
        wholesalePrice: Number(data.wholesalePrice),
        suggestedRetailPrice: data.suggestedRetailPrice && data.suggestedRetailPrice !== "" ? Number(data.suggestedRetailPrice) : null,
        moq: Number(data.moq),
        stock: Number(data.stock),
        depositAmount: data.depositAmount && data.depositAmount !== "" ? Number(data.depositAmount) : null,
        depositPercentage: data.depositPercentage && data.depositPercentage !== "" ? Number(data.depositPercentage) : null,
        requiresDeposit: data.requiresDeposit ? 1 : 0,
        expectedShipDate: data.expectedShipDate || undefined,
        balancePaymentDate: data.balancePaymentDate || undefined,
        orderDeadline: data.orderDeadline || undefined,
        paymentTerms: data.paymentTerms,
        shipFromAddress: (data.shipFromStreet || data.shipFromCity) ? {
          street: data.shipFromStreet,
          city: data.shipFromCity,
          state: data.shipFromState,
          zip: data.shipFromZip,
          country: data.shipFromCountry,
        } : undefined,
        contactDetails: (data.contactName || data.contactPhone || data.contactEmail) ? {
          name: data.contactName,
          phone: data.contactPhone,
          email: data.contactEmail,
        } : undefined,
      };

      return await apiRequest('POST', '/api/wholesale/products', payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wholesale product created successfully",
      });
      setLocation('/wholesale/products');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WholesaleProductForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6" data-testid="page-create-wholesale-product">
      <div className="flex items-center gap-4">
        <Link href="/wholesale/products">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Wholesale Product</h1>
          <p className="text-muted-foreground mt-1">
            Add a new product to your wholesale B2B catalog
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core product details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <BulkImageInput
                        images={field.value}
                        onChange={field.onChange}
                        maxImages={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Pricing & Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Terms</CardTitle>
              <CardDescription>B2B pricing and payment configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rrp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RRP (Recommended Retail Price)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-rrp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wholesalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wholesale Price</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-wholesale-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="suggestedRetailPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suggested Retail Price (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-srp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-terms">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Net 90">Net 90</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="requiresDeposit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        data-testid="switch-requires-deposit"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Requires Deposit Payment</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("requiresDeposit") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Amount</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" data-testid="input-deposit-amount" />
                        </FormControl>
                        <FormDescription>Fixed deposit amount in dollars</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="depositPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Percentage</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" min="0" max="100" data-testid="input-deposit-percentage" />
                        </FormControl>
                        <FormDescription>Percentage of total order value (0-100)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory & MOQ */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory & MOQ</CardTitle>
              <CardDescription>Stock and minimum order requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="moq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Quantity (MOQ)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" data-testid="input-moq" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Level</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" data-testid="input-stock" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
              <CardDescription>B2B timeline and deadlines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="expectedShipDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Ship Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-ship-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="balancePaymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Balance Payment Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-balance-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orderDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Deadline</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-order-deadline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Ship From Address</CardTitle>
              <CardDescription>Warehouse or shipping location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="shipFromStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-ship-street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="shipFromCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-ship-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipFromState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-ship-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipFromZip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-ship-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
              <CardDescription>Warehouse or product contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" data-testid="input-contact-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/wholesale/products">
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              data-testid="button-submit"
            >
              {createMutation.isPending ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
