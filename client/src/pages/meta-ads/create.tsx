import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CalendarIcon, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  ThumbsUp,
  MessageCircle,
  Share2,
  ChevronDown,
  X
} from "lucide-react";
import { format } from "date-fns";
import type { Product } from "@shared/schema";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// Validation schemas for each step
const step1Schema = z.object({
  productId: z.string().min(1, "Please select a product"),
  adCopy: z.string().min(10, "Ad copy must be at least 10 characters").max(125, "Ad copy must be 125 characters or less"),
  targetCountries: z.array(z.string()).min(1, "Select at least one country"),
  targetLanguages: z.array(z.string()).min(1, "Select at least one language"),
});

const step2Schema = z.object({
  // Preview step - no validation needed
});

const step3Schema = z.object({
  endDate: z.date().min(new Date(), "End date must be in the future"),
  totalBudget: z.string()
    .min(1, "Budget is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 5, "Minimum budget is $5"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
];

interface MultiSelectDropdownProps {
  options: { code: string; name: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  label: string;
}

function MultiSelectDropdown({ options, value, onChange, placeholder, label }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  };

  const removeOption = (code: string) => {
    onChange(value.filter((v) => v !== code));
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.code));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between hover-elevate"
            data-testid={`button-select-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span className="truncate">
              {selectedOptions.length > 0 
                ? `${selectedOptions.length} selected`
                : placeholder
              }
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="max-h-64 overflow-auto p-1">
            {options.map((option) => (
              <div
                key={option.code}
                className="flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer hover-elevate"
                onClick={() => toggleOption(option.code)}
                data-testid={`option-${option.code}`}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.code)}
                  onChange={() => {}}
                  className="h-4 w-4"
                  data-testid={`checkbox-${option.code}`}
                />
                <span className="text-sm">{option.name}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedOptions.map((option) => (
            <Badge 
              key={option.code} 
              variant="secondary"
              className="gap-1"
              data-testid={`badge-${option.code}`}
            >
              {option.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(option.code);
                }}
                data-testid={`button-remove-${option.code}`}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentForm({ 
  amount, 
  onSuccess 
}: { 
  amount: number; 
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment processing",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        toast({
          title: "Payment Successful",
          description: "Your ad campaign budget has been added",
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-h-[200px]">
        <PaymentElement />
      </div>
      
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing}
        data-testid="button-pay"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
}

export default function CreateAdWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch ad accounts to verify Meta connection
  const { data: adAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/meta/ad-accounts"],
  });

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      productId: "",
      adCopy: "",
      targetCountries: ["US"],
      targetLanguages: ["en"],
    },
  });

  // Step 3 form
  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      endDate: undefined,
      totalBudget: "",
    },
  });

  // AI copy generation mutation
  const generateCopyMutation = useMutation({
    mutationFn: async (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) throw new Error("Product not found");

      return apiRequest("POST", "/api/meta/ai/generate-copy", {
        product: {
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          image: product.image,
        },
        targetAudience: {
          location: step1Form.getValues("targetCountries").join(", "),
        },
        tone: "professional",
      });
    },
    onSuccess: (data: any) => {
      step1Form.setValue("adCopy", data.primaryTextLong || data.primaryTextShort || "");
      toast({
        title: "AI Copy Generated",
        description: "Your ad copy has been generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate ad copy. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Purchase budget mutation
  const purchaseBudgetMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest("POST", "/api/meta/budget/purchase", {
        amount,
        currency: "USD",
        description: "Meta Ads campaign budget",
      });
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!step1Data || !step3Data || !selectedProduct || !adAccounts[0]) {
        throw new Error("Missing required data");
      }

      return apiRequest("POST", "/api/meta/campaigns", {
        adAccountId: adAccounts[0].id,
        productId: step1Data.productId,
        name: `${selectedProduct.name} Campaign`,
        objective: "OUTCOME_SALES",
        primaryText: step1Data.adCopy,
        headline: selectedProduct.name,
        description: selectedProduct.description.substring(0, 30),
        callToAction: "SHOP_NOW",
        destinationUrl: `${window.location.origin}/products/${selectedProduct.id}`,
        dailyBudget: (Number(step3Data.totalBudget) / 30).toFixed(2), // Approximate daily budget
        lifetimeBudget: step3Data.totalBudget,
        startDate: new Date(),
        endDate: step3Data.endDate,
        targeting: {
          geo_locations: { countries: step1Data.targetCountries },
          languages: step1Data.targetLanguages,
        },
        alertEmail: "", // Will be filled from user profile
        productImageUrl: selectedProduct.image,
        useAdvantagePlus: true,
      });
    },
    onSuccess: () => {
      toast({
        title: "Campaign Created",
        description: "Your Meta ad campaign has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meta/campaigns"] });
      setLocation("/meta-ads/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  // Handle step 1 submission
  const onStep1Submit = (data: Step1Data) => {
    const product = products.find((p) => p.id === data.productId);
    if (!product) {
      toast({
        title: "Error",
        description: "Selected product not found",
        variant: "destructive",
      });
      return;
    }
    
    setStep1Data(data);
    setSelectedProduct(product);
    setCurrentStep(2);
  };

  // Handle step 3 submission (payment)
  const onStep3Submit = (data: Step3Data) => {
    setStep3Data(data);
    purchaseBudgetMutation.mutate(data.totalBudget);
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    createCampaignMutation.mutate();
  };

  // Check if user has connected Meta account
  if (adAccounts.length === 0) {
    const handleConnectMeta = () => {
      window.location.href = "/api/meta/oauth/start";
    };

    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/meta-ads/dashboard")}
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="p-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="flex items-center gap-3 p-6 bg-muted rounded-2xl">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/1024px-2021_Facebook_icon.svg.png" alt="Facebook" className="h-16 w-16" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png" alt="Instagram" className="h-16 w-16" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">Connect Your Meta Ad Account</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You need to connect your Facebook Business account before creating ad campaigns. This allows you to run ads across Facebook and Instagram.
              </p>
              <Button 
                onClick={handleConnectMeta} 
                size="lg"
                data-testid="button-connect-meta-account"
              >
                Connect Meta Account
              </Button>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                You'll be redirected to Meta to authorize access to your ad account
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const progress = (currentStep / 3) * 100;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/meta-ads/dashboard")}
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meta Ads Dashboard
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Create Meta Ad Campaign</h1>
          <p className="text-muted-foreground mt-2">
            Step {currentStep} of 3: {
              currentStep === 1 ? "Product & Copy" :
              currentStep === 2 ? "Preview" :
              "Budget & Payment"
            }
          </p>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" data-testid="progress-bar" />

        {/* Step 1: Product & Copy */}
        {currentStep === 1 && (
          <Form {...step1Form}>
            <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product & Ad Copy</CardTitle>
                  <CardDescription>
                    Select a product and create compelling ad copy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Product Selection */}
                  <FormField
                    control={step1Form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apply to</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-product">
                              <SelectValue placeholder="Choose Product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productsLoading ? (
                              <SelectItem value="_loading" disabled>
                                Loading products...
                              </SelectItem>
                            ) : products.length === 0 ? (
                              <SelectItem value="_empty" disabled>
                                No products available
                              </SelectItem>
                            ) : (
                              products.map((product) => (
                                <SelectItem 
                                  key={product.id} 
                                  value={product.id}
                                  data-testid={`option-product-${product.id}`}
                                >
                                  {product.name} - ${product.price}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Ad Copy */}
                  <FormField
                    control={step1Form.control}
                    name="adCopy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad Copy</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Write compelling ad copy or generate with AI..."
                            className="resize-none min-h-[100px]"
                            maxLength={125}
                            data-testid="textarea-ad-copy"
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value.length}/125 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Generate AI Copy Button */}
                  <Button
                    type="button"
                    variant="default"
                    className="w-full"
                    onClick={() => {
                      const productId = step1Form.getValues("productId");
                      if (!productId) {
                        toast({
                          title: "Select a product first",
                          description: "Please select a product before generating ad copy",
                          variant: "destructive",
                        });
                        return;
                      }
                      generateCopyMutation.mutate(productId);
                    }}
                    disabled={generateCopyMutation.isPending}
                    data-testid="button-generate-ai-copy"
                  >
                    {generateCopyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Ad Copy with AI
                      </>
                    )}
                  </Button>

                  <Separator />

                  {/* Target Countries */}
                  <FormField
                    control={step1Form.control}
                    name="targetCountries"
                    render={({ field }) => (
                      <FormItem>
                        <MultiSelectDropdown
                          options={COUNTRIES}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select countries"
                          label="Target Countries"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Target Languages */}
                  <FormField
                    control={step1Form.control}
                    name="targetLanguages"
                    render={({ field }) => (
                      <FormItem>
                        <MultiSelectDropdown
                          options={LANGUAGES}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select languages"
                          label="Target Languages"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" size="lg" data-testid="button-next-step-1">
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 2: Preview */}
        {currentStep === 2 && step1Data && selectedProduct && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ad Preview</CardTitle>
                <CardDescription>
                  See how your ad will appear on Meta platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Meta Ad Preview */}
                <div className="max-w-md mx-auto border rounded-lg overflow-hidden bg-card">
                  {/* Header */}
                  <div className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      U
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Upfirst</div>
                      <div className="text-xs text-muted-foreground">Sponsored</div>
                    </div>
                  </div>

                  {/* Ad Copy */}
                  <div className="px-3 pb-3">
                    <p className="text-sm" data-testid="text-ad-copy-preview">
                      {step1Data.adCopy}
                    </p>
                  </div>

                  {/* Product Image */}
                  <div className="w-full aspect-square bg-muted">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      data-testid="img-product-preview"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="p-3 bg-muted/50">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {window.location.hostname}
                    </div>
                    <div className="font-semibold text-sm mt-1" data-testid="text-product-name">
                      {selectedProduct.name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      ${selectedProduct.price}
                    </div>
                  </div>

                  {/* Engagement Icons */}
                  <div className="p-3 flex items-center gap-6 border-t">
                    <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <ThumbsUp className="h-5 w-5" />
                      <span className="text-sm">Like</span>
                    </button>
                    <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">Comment</span>
                    </button>
                    <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Share2 className="h-5 w-5" />
                      <span className="text-sm">Share</span>
                    </button>
                  </div>
                </div>

                {/* Targeting Info */}
                <div className="mt-6 space-y-3">
                  <div>
                    <span className="text-sm font-medium">Countries: </span>
                    <span className="text-sm text-muted-foreground">
                      {step1Data.targetCountries
                        .map((code) => COUNTRIES.find((c) => c.code === code)?.name)
                        .join(", ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Languages: </span>
                    <span className="text-sm text-muted-foreground">
                      {step1Data.targetLanguages
                        .map((code) => LANGUAGES.find((l) => l.code === code)?.name)
                        .join(", ")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCurrentStep(1)}
                data-testid="button-back-step-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                size="lg"
                onClick={() => setCurrentStep(3)}
                data-testid="button-next-step-2"
              >
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Payment */}
        {currentStep === 3 && (
          <Form {...step3Form}>
            <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Budget & Schedule</CardTitle>
                  <CardDescription>
                    Set your campaign budget and end date
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* End Date */}
                  <FormField
                    control={step3Form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal hover-elevate"
                                data-testid="button-select-end-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Total Budget */}
                  <FormField
                    control={step3Form.control}
                    name="totalBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Budget (USD)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="5"
                              placeholder="0.00"
                              className="pl-7"
                              data-testid="input-total-budget"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Minimum budget is $5.00
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Total to Pay */}
                  {step3Form.watch("totalBudget") && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total to pay now:</span>
                        <span className="text-2xl font-bold" data-testid="text-total-amount">
                          ${Number(step3Form.watch("totalBudget")).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        This amount will be added to your ad account balance
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Section */}
              {!clientSecret && (
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                    data-testid="button-back-step-3"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={purchaseBudgetMutation.isPending}
                    data-testid="button-proceed-payment"
                  >
                    {purchaseBudgetMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Proceed to Payment"
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        )}

        {/* Stripe Payment Form */}
        {currentStep === 3 && clientSecret && step3Data && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>
                Enter your payment details to fund your campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  amount={Number(step3Data.totalBudget)}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setClientSecret("");
                    setStep3Data(null);
                  }}
                  data-testid="button-back-payment"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Budget
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Creating Campaign Loading */}
        {createCampaignMutation.isPending && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Creating your campaign...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
