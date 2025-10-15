import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Send, Save, DollarSign, Calendar } from "lucide-react";
import { z } from "zod";

// Currency options
const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
];

// Line item schema
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  unitPrice: z.coerce.number().positive("Unit price must be greater than 0"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  shippingCost: z.coerce.number().min(0).optional(),
});

// Quotation form schema
const quotationFormSchema = z.object({
  buyerEmail: z.string().email("Please enter a valid email address"),
  currency: z.string().default("USD"),
  depositPercentage: z.number().min(10).max(90),
  validUntil: z.string().min(1, "Valid until date is required"),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;

export default function TradeQuotationBuilder() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/seller/trade/quotations/:id/edit");
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  
  const isEditMode = !!params?.id;
  const quotationId = params?.id;

  // Fetch existing quotation if editing
  const { data: existingQuotation, isLoading: isLoadingQuotation } = useQuery({
    queryKey: ["/api/trade/quotations", quotationId],
    enabled: isEditMode && !!quotationId,
    queryFn: async () => {
      const response = await fetch(`/api/trade/quotations/${quotationId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load quotation");
      return response.json();
    },
  });

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      buyerEmail: "",
      currency: "USD",
      depositPercentage: 50,
      validUntil: "",
      items: [{ description: "", unitPrice: 0, quantity: 1, taxRate: 0, shippingCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Load existing quotation data
  useEffect(() => {
    if (existingQuotation && isEditMode) {
      form.reset({
        buyerEmail: existingQuotation.buyerEmail,
        currency: existingQuotation.currency,
        depositPercentage: existingQuotation.depositPercentage,
        validUntil: existingQuotation.validUntil
          ? new Date(existingQuotation.validUntil).toISOString().split("T")[0]
          : "",
        items: existingQuotation.items || [
          { description: "", unitPrice: 0, quantity: 1, taxRate: 0, shippingCost: 0 },
        ],
      });
    }
  }, [existingQuotation, isEditMode, form]);

  // Watch form values for real-time calculations
  const watchedItems = form.watch("items");
  const depositPercentage = form.watch("depositPercentage");
  const currency = form.watch("currency");

  // Calculate line totals and summary
  const calculations = watchedItems.reduce(
    (acc, item) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const shippingCost = Number(item.shippingCost) || 0;

      const lineSubtotal = unitPrice * quantity;
      const lineTax = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + lineTax + shippingCost;

      return {
        subtotal: acc.subtotal + lineSubtotal,
        totalTax: acc.totalTax + lineTax,
        totalShipping: acc.totalShipping + shippingCost,
        grandTotal: acc.grandTotal + lineTotal,
        lineTotals: [...acc.lineTotals, lineTotal],
      };
    },
    { subtotal: 0, totalTax: 0, totalShipping: 0, grandTotal: 0, lineTotals: [] as number[] }
  );

  const depositAmount = (calculations.grandTotal * depositPercentage) / 100;
  const balanceAmount = calculations.grandTotal - depositAmount;

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const payload = {
        buyerEmail: data.buyerEmail,
        currency: data.currency,
        depositPercentage: data.depositPercentage,
        validUntil: new Date(data.validUntil).toISOString(),
        items: data.items.map((item) => ({
          description: item.description,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
          taxRate: item.taxRate ? Number(item.taxRate) : undefined,
          shippingCost: item.shippingCost ? Number(item.shippingCost) : undefined,
        })),
      };

      if (isEditMode && quotationId) {
        return await apiRequest("PATCH", `/api/trade/quotations/${quotationId}`, payload);
      } else {
        return await apiRequest("POST", "/api/trade/quotations", payload);
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade/quotations"] });
      toast({
        title: isEditMode ? "Quotation updated" : "Quotation created",
        description: `Quotation ${data.quotationNumber} has been saved as draft.`,
      });
      
      if (isSending) {
        // Send the quotation after saving
        sendMutation.mutate(data.id);
      } else {
        setLocation("/seller/trade/quotations");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save quotation",
        variant: "destructive",
      });
    },
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/trade/quotations/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade/quotations"] });
      toast({
        title: "Quotation sent",
        description: "The quotation has been sent to the buyer.",
      });
      setLocation("/seller/trade/quotations");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send quotation",
        variant: "destructive",
      });
      setIsSending(false);
    },
  });

  const onSaveDraft = (data: QuotationFormData) => {
    setIsSending(false);
    saveMutation.mutate(data);
  };

  const onSaveAndSend = (data: QuotationFormData) => {
    setIsSending(true);
    saveMutation.mutate(data);
  };

  const handleAddRow = () => {
    append({ description: "", unitPrice: 0, quantity: 1, taxRate: 0, shippingCost: 0 });
  };

  const handleRemoveRow = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast({
        title: "Cannot remove",
        description: "At least one line item is required",
        variant: "destructive",
      });
    }
  };

  if (isEditMode && isLoadingQuotation) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center py-12">Loading quotation...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/seller/trade/quotations")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotations
          </Button>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            {isEditMode ? "Edit Quotation" : "Create Quotation"}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? "Update quotation details and line items"
              : "Create a new quotation for your buyer"}
          </p>
        </div>

        <Form {...form}>
          <form className="space-y-8">
            {/* Quotation Header */}
            <Card>
              <CardHeader>
                <CardTitle>Quotation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="buyerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buyer Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="buyer@example.com"
                            {...field}
                            data-testid="input-buyer-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies.map((curr) => (
                              <SelectItem key={curr.value} value={curr.value}>
                                {curr.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="depositPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Percentage: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            min={10}
                            max={90}
                            step={5}
                            value={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                            data-testid="slider-deposit-percentage"
                          />
                        </FormControl>
                        <FormDescription>
                          Set the deposit amount as a percentage of the total
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid Until Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              type="date"
                              {...field}
                              className="pl-10"
                              min={new Date().toISOString().split("T")[0]}
                              data-testid="input-valid-until"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Quotation expiration date</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {existingQuotation?.quotationNumber && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Quotation Number:{" "}
                      <span className="font-medium text-foreground" data-testid="text-quotation-number">
                        {existingQuotation.quotationNumber}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items Grid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  data-testid="button-add-row"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Line #</TableHead>
                        <TableHead className="min-w-[200px]">Description</TableHead>
                        <TableHead className="w-32">Unit Price</TableHead>
                        <TableHead className="w-24">Quantity</TableHead>
                        <TableHead className="w-24">Tax Rate %</TableHead>
                        <TableHead className="w-32">Shipping</TableHead>
                        <TableHead className="w-32">Line Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      placeholder="Item description"
                                      className="min-h-[60px]"
                                      data-testid={`input-description-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      data-testid={`input-unit-price-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      {...field}
                                      data-testid={`input-quantity-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.taxRate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      {...field}
                                      data-testid={`input-tax-rate-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.shippingCost`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      data-testid={`input-shipping-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-line-total-${index}`}>
                            {currency} {calculations.lineTotals[index]?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(index)}
                              disabled={fields.length === 1}
                              data-testid={`button-delete-row-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Totals Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium" data-testid="text-subtotal">
                      {currency} {calculations.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Tax:</span>
                    <span className="font-medium" data-testid="text-total-tax">
                      {currency} {calculations.totalTax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Shipping:</span>
                    <span className="font-medium" data-testid="text-total-shipping">
                      {currency} {calculations.totalShipping.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3 border-t">
                    <span>Grand Total:</span>
                    <span data-testid="text-grand-total">
                      {currency} {calculations.grandTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t">
                    <span className="text-muted-foreground">
                      Deposit Amount ({depositPercentage}%):
                    </span>
                    <span className="font-medium text-green-600" data-testid="text-deposit-amount">
                      {currency} {depositAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance Amount:</span>
                    <span className="font-medium text-orange-600" data-testid="text-balance-amount">
                      {currency} {balanceAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={form.handleSubmit(onSaveDraft)}
                disabled={saveMutation.isPending || sendMutation.isPending}
                data-testid="button-save-draft"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending && !isSending ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSaveAndSend)}
                disabled={saveMutation.isPending || sendMutation.isPending}
                data-testid="button-save-send"
              >
                <Send className="h-4 w-4 mr-2" />
                {saveMutation.isPending && isSending ? "Sending..." : "Save & Send"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/seller/trade/quotations")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
