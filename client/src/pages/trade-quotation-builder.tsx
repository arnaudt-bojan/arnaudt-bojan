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
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Send, Save, DollarSign, Calendar, Ship, Upload, FileText, X, Download } from "lucide-react";
import { z } from "zod";
import { DocumentUploader } from "@/components/DocumentUploader";
import type { UploadResult } from "@uppy/core";

// Currency options
const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
];

// Delivery terms (Incoterms 2020)
const deliveryTerms = [
  { value: "EXW", label: "EXW - Ex Works (Buyer handles all logistics)" },
  { value: "FOB", label: "FOB - Free On Board (Seller delivers to port)" },
  { value: "CIF", label: "CIF - Cost, Insurance, Freight (Seller covers shipping + insurance)" },
  { value: "DDP", label: "DDP - Delivered Duty Paid (Seller handles everything)" },
  { value: "DAP", label: "DAP - Delivered at Place (Seller delivers to location)" },
  { value: "FCA", label: "FCA - Free Carrier (Seller delivers to carrier)" },
  { value: "CPT", label: "CPT - Carriage Paid To (Seller pays main carriage)" },
  { value: "Other", label: "Other (Custom terms)" },
];

// Line item schema - B2B best practice: only Description, Quantity, Unit Price, Line Total
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  unitPrice: z.coerce.number().positive("Unit price must be greater than 0"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
});

// Quotation form schema with B2B professional fields
const quotationFormSchema = z.object({
  quotationNumber: z.string().optional(), // Editable quotation number
  buyerEmail: z.string().email("Please enter a valid email address"),
  currency: z.string().default("USD"),
  depositPercentage: z.number().min(10).max(90),
  validUntil: z.string().min(1, "Valid until date is required"),
  deliveryTerms: z.string().optional(), // Incoterms
  dataSheetUrl: z.string().optional(), // Uploaded data sheet
  termsAndConditionsUrl: z.string().optional(), // Uploaded T&C
  taxAmount: z.coerce.number().min(0).default(0), // Bottom-level tax
  shippingAmount: z.coerce.number().min(0).default(0), // Bottom-level shipping
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
      quotationNumber: "",
      buyerEmail: "",
      currency: "USD",
      depositPercentage: 50,
      validUntil: "",
      deliveryTerms: "",
      dataSheetUrl: "",
      termsAndConditionsUrl: "",
      taxAmount: 0,
      shippingAmount: 0,
      items: [{ description: "", unitPrice: 0, quantity: 1 }],
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
        quotationNumber: existingQuotation.quotationNumber || "",
        buyerEmail: existingQuotation.buyerEmail,
        currency: existingQuotation.currency,
        depositPercentage: existingQuotation.depositPercentage,
        validUntil: existingQuotation.validUntil
          ? new Date(existingQuotation.validUntil).toISOString().split("T")[0]
          : "",
        deliveryTerms: existingQuotation.deliveryTerms || "",
        dataSheetUrl: existingQuotation.dataSheetUrl || "",
        termsAndConditionsUrl: existingQuotation.termsAndConditionsUrl || "",
        taxAmount: Number(existingQuotation.taxAmount) || 0,
        shippingAmount: Number(existingQuotation.shippingAmount) || 0,
        items: existingQuotation.items || [
          { description: "", unitPrice: 0, quantity: 1 },
        ],
      });
    }
  }, [existingQuotation, isEditMode, form]);

  // Watch form values for real-time calculations
  const watchedItems = form.watch("items");
  const depositPercentage = form.watch("depositPercentage");
  const currency = form.watch("currency");
  const taxAmount = form.watch("taxAmount");
  const shippingAmount = form.watch("shippingAmount");

  // Calculate line totals and summary - B2B best practice: tax/shipping at bottom
  const calculations = watchedItems.reduce(
    (acc, item) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      const lineTotal = unitPrice * quantity;

      return {
        subtotal: acc.subtotal + lineTotal,
        lineTotals: [...acc.lineTotals, lineTotal],
      };
    },
    { subtotal: 0, lineTotals: [] as number[] }
  );

  // Add bottom-level tax and shipping to calculate grand total
  const totalTax = Number(taxAmount) || 0;
  const totalShipping = Number(shippingAmount) || 0;
  const grandTotal = calculations.subtotal + totalTax + totalShipping;

  const depositAmount = (grandTotal * depositPercentage) / 100;
  const balanceAmount = grandTotal - depositAmount;

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const payload = {
        quotationNumber: data.quotationNumber || undefined,
        buyerEmail: data.buyerEmail,
        currency: data.currency,
        depositPercentage: data.depositPercentage,
        validUntil: new Date(data.validUntil).toISOString(),
        deliveryTerms: data.deliveryTerms || undefined,
        dataSheetUrl: data.dataSheetUrl || undefined,
        termsAndConditionsUrl: data.termsAndConditionsUrl || undefined,
        taxAmount: Number(data.taxAmount) || 0,
        shippingAmount: Number(data.shippingAmount) || 0,
        items: data.items.map((item) => ({
          description: item.description,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
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
    append({ description: "", unitPrice: 0, quantity: 1 });
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

  // Document upload handlers
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    return {
      method: "PUT" as const,
      url: (response as any).uploadURL,
    };
  };

  const handleDataSheetUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      try {
        const uploadedFile = result.successful[0];
        const uploadURL = uploadedFile.uploadURL;
        
        console.log("[Data Sheet Upload] Upload URL:", uploadURL);
        
        // Normalize the path
        const response = await apiRequest("PUT", "/api/trade/documents", {
          documentURL: uploadURL,
        }) as { objectPath: string };
        
        console.log("[Data Sheet Upload] Normalized path:", response.objectPath);
        
        form.setValue("dataSheetUrl", response.objectPath);
        toast({
          title: "Success",
          description: "Data sheet uploaded successfully",
        });
      } catch (error) {
        console.error("[Data Sheet Upload] Error:", error);
        toast({
          title: "Error",
          description: "Failed to upload data sheet",
          variant: "destructive",
        });
      }
    }
  };

  const handleTermsUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      try {
        const uploadedFile = result.successful[0];
        const uploadURL = uploadedFile.uploadURL;
        
        console.log("[T&C Upload] Upload URL:", uploadURL);
        
        // Normalize the path
        const response = await apiRequest("PUT", "/api/trade/documents", {
          documentURL: uploadURL,
        }) as { objectPath: string };
        
        console.log("[T&C Upload] Normalized path:", response.objectPath);
        
        form.setValue("termsAndConditionsUrl", response.objectPath);
        toast({
          title: "Success",
          description: "Terms & Conditions uploaded successfully",
        });
      } catch (error) {
        console.error("[T&C Upload] Error:", error);
        toast({
          title: "Error",
          description: "Failed to upload Terms & Conditions",
          variant: "destructive",
        });
      }
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
                    name="quotationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quotation Number (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="QT-2025-001 (auto-generated if empty)"
                            {...field}
                            data-testid="input-quotation-number"
                          />
                        </FormControl>
                        <FormDescription>Leave empty to auto-generate</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <FormField
                    control={form.control}
                    name="deliveryTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Terms (Incoterms)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-delivery-terms">
                              <SelectValue placeholder="Select delivery terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {deliveryTerms.map((term) => (
                              <SelectItem key={term.value} value={term.value}>
                                {term.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>International shipping terms (Incoterms 2020)</FormDescription>
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
                        <TableHead className="min-w-[250px]">Description</TableHead>
                        <TableHead className="w-32">Unit Price</TableHead>
                        <TableHead className="w-24">Quantity</TableHead>
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

            {/* Attachments (Optional) - B2B Best Practice */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Attachments (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Data Sheet Upload */}
                  <div className="space-y-3">
                    <Label>Data Sheet (PDF)</Label>
                    <DocumentUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      allowedFileTypes={['.pdf']}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleDataSheetUpload}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Data Sheet
                    </DocumentUploader>
                    {form.watch("dataSheetUrl") && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span className="text-muted-foreground truncate">
                          {form.watch("dataSheetUrl").split('/').pop()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => form.setValue("dataSheetUrl", "")}
                          data-testid="button-remove-datasheet"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Product specification sheets or technical documentation
                    </p>
                  </div>

                  {/* T&C Upload */}
                  <div className="space-y-3">
                    <Label>Terms & Conditions (PDF/DOC)</Label>
                    <DocumentUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      allowedFileTypes={['.pdf', '.doc', '.docx', '.txt']}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleTermsUpload}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Terms & Conditions
                    </DocumentUploader>
                    {form.watch("termsAndConditionsUrl") && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span className="text-muted-foreground truncate">
                          {form.watch("termsAndConditionsUrl").split('/').pop()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => form.setValue("termsAndConditionsUrl", "")}
                          data-testid="button-remove-terms"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Legal terms, warranty, returns, liability
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax & Shipping - B2B Best Practice: Bottom-Level */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tax & Shipping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="taxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Tax Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            data-testid="input-tax-amount"
                          />
                        </FormControl>
                        <FormDescription>Applied to entire quotation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Shipping Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            data-testid="input-shipping-amount"
                          />
                        </FormControl>
                        <FormDescription>Applied to entire quotation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      {currency} {totalTax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Shipping:</span>
                    <span className="font-medium" data-testid="text-total-shipping">
                      {currency} {totalShipping.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3 border-t">
                    <span>Grand Total:</span>
                    <span data-testid="text-grand-total">
                      {currency} {grandTotal.toFixed(2)}
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
