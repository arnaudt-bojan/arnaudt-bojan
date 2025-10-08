import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Megaphone, 
  Target,
  DollarSign,
  Image as ImageIcon,
  Calendar,
  AlertCircle
} from "lucide-react";
import type { Product } from "@shared/schema";

const campaignSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  campaignName: z.string().min(2, "Campaign name must be at least 2 characters"),
  objective: z.string().min(1, "Please select an objective"),
  dailyBudget: z.string().min(1, "Daily budget is required"),
  headline: z.string().min(1, "Headline is required").max(40, "Headline must be 40 characters or less"),
  primaryText: z.string().min(1, "Primary text is required").max(125, "Primary text must be 125 characters or less"),
  description: z.string().max(30, "Description must be 30 characters or less").optional(),
  callToAction: z.string().min(1, "Call to action is required"),
  targetAgeMin: z.string().min(1, "Minimum age is required"),
  targetAgeMax: z.string().min(1, "Maximum age is required"),
  targetGender: z.string().min(1, "Please select target gender"),
  targetCountries: z.string().min(1, "Target countries are required"),
});

type CampaignForm = z.infer<typeof campaignSchema>;

const campaignObjectives = [
  { value: "OUTCOME_SALES", label: "Sales (Drive purchases)" },
  { value: "OUTCOME_TRAFFIC", label: "Traffic (Send people to your site)" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement (Get more likes, comments)" },
  { value: "OUTCOME_AWARENESS", label: "Awareness (Reach more people)" },
  { value: "OUTCOME_LEADS", label: "Leads (Collect contact info)" },
];

const callToActions = [
  { value: "SHOP_NOW", label: "Shop Now" },
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "GET_OFFER", label: "Get Offer" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "BOOK_NOW", label: "Book Now" },
  { value: "CONTACT_US", label: "Contact Us" },
];

export default function CreateAdCampaign() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: metaSettings } = useQuery<any>({
    queryKey: ["/api/meta-settings"],
  });

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      productId: "",
      campaignName: "",
      objective: "OUTCOME_SALES",
      dailyBudget: "20",
      headline: "",
      primaryText: "",
      description: "",
      callToAction: "SHOP_NOW",
      targetAgeMin: "18",
      targetAgeMax: "65",
      targetGender: "ALL",
      targetCountries: "US",
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignForm) => {
      return await apiRequest("POST", "/api/meta-campaigns", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta-campaigns"] });
      toast({
        title: "Campaign created",
        description: `Your ad campaign has been created successfully! Campaign ID: ${data.campaignId}`,
      });
      setLocation("/seller/products");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating campaign",
        description: error.message || "Failed to create ad campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignForm) => {
    createCampaignMutation.mutate(data);
  };

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    setSelectedProduct(product || null);
    
    if (product) {
      form.setValue("headline", product.name.substring(0, 40));
      form.setValue("primaryText", product.description?.substring(0, 125) || "");
      form.setValue("campaignName", `${product.name} - ${new Date().toLocaleDateString()}`);
    }
  };

  if (!metaSettings?.accessToken) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Meta API Not Configured</h2>
            <p className="text-muted-foreground mb-6">
              You need to configure your Meta API credentials before creating ad campaigns.
            </p>
            <Button onClick={() => setLocation("/social-ads-setup")}>
              Setup Social Ads
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Megaphone className="h-8 w-8" />
            Create Ad Campaign
          </h1>
          <p className="text-muted-foreground">
            Promote your product on Facebook and Instagram
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Selection */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Select Product</h2>
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product to Promote</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleProductSelect(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-product">
                          <SelectValue placeholder="Choose a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${product.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProduct && (
                <div className="mt-4 p-4 bg-muted rounded-lg flex gap-4">
                  {selectedProduct.image && (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{selectedProduct.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {selectedProduct.description}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      ${selectedProduct.price}
                    </Badge>
                  </div>
                </div>
              )}
            </Card>

            {/* Campaign Settings */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Campaign Settings
              </h2>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-campaign-name" />
                      </FormControl>
                      <FormDescription>Internal name for your campaign</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Objective</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-objective">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {campaignObjectives.map((obj) => (
                            <SelectItem key={obj.value} value={obj.value}>
                              {obj.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>What you want to achieve with this campaign</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dailyBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Budget (USD)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            min="1" 
                            {...field} 
                            data-testid="input-daily-budget"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Minimum $1/day recommended</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Ad Creative */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Ad Creative
              </h2>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="headline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headline (max 40 characters)</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={40} data-testid="input-headline" />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/40 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Text (max 125 characters)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          maxLength={125} 
                          rows={3}
                          data-testid="input-primary-text"
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/125 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (max 30 characters, optional)</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={30} data-testid="input-description" />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0}/30 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="callToAction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Call to Action</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cta">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {callToActions.map((cta) => (
                            <SelectItem key={cta.value} value={cta.value}>
                              {cta.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Targeting */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Audience Targeting
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetAgeMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Age</FormLabel>
                        <FormControl>
                          <Input type="number" min="13" max="65" {...field} data-testid="input-age-min" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetAgeMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Age</FormLabel>
                        <FormControl>
                          <Input type="number" min="13" max="65" {...field} data-testid="input-age-max" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetGender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetCountries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Countries</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="US, CA, GB (comma-separated country codes)" 
                          {...field} 
                          data-testid="input-countries"
                        />
                      </FormControl>
                      <FormDescription>
                        Use 2-letter country codes (e.g., US, GB, CA)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/seller/products")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCampaignMutation.isPending}
                data-testid="button-create-campaign"
              >
                {createCampaignMutation.isPending ? "Creating Campaign..." : "Create Campaign"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
