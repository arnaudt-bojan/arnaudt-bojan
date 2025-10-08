import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { 
  Megaphone, 
  Sparkles,
  Target,
  DollarSign,
  Zap,
  Info
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import type { Product } from "@shared/schema";

const metaCampaignSchema = z.object({
  campaignName: z.string().min(2, "Campaign name required"),
  objective: z.string().min(1, "Select an objective"),
  dailyBudget: z.string().min(1, "Budget required"),
  
  // Advantage+ Settings
  advantagePlusEnabled: z.boolean(),
  advantageShoppingCampaign: z.boolean(),
  advantagePlusCreative: z.boolean(),
  advantagePlusPlacements: z.boolean(),
  advantagePlusAudience: z.boolean(),
  
  // Budget & Bidding
  budgetOptimization: z.boolean(),
  bidStrategy: z.string(),
  costControl: z.string().optional(),
  
  // Creative
  headline: z.string().min(1).max(40),
  primaryText: z.string().min(1).max(125),
  description: z.string().max(30).optional(),
  callToAction: z.string(),
  
  // Targeting (overridable if Advantage+ disabled)
  targetAgeMin: z.string(),
  targetAgeMax: z.string(),
  targetGender: z.string(),
  targetCountries: z.string(),
  detailedTargeting: z.string().optional(),
  
  // Placements
  facebookFeed: z.boolean(),
  facebookStories: z.boolean(),
  instagramFeed: z.boolean(),
  instagramStories: z.boolean(),
  instagramReels: z.boolean(),
  messengerInbox: z.boolean(),
  audienceNetwork: z.boolean(),
});

type MetaCampaignForm = z.infer<typeof metaCampaignSchema>;

const campaignObjectives = [
  { value: "OUTCOME_SALES", label: "Sales (Drive purchases)" },
  { value: "OUTCOME_TRAFFIC", label: "Traffic (Send to website)" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement (Likes, comments)" },
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

export default function CreateMetaCampaign() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/create-meta-campaign/:id");

  const { data: product } = useQuery<Product>({
    queryKey: ["/api/products", params?.id],
  });

  const form = useForm<MetaCampaignForm>({
    resolver: zodResolver(metaCampaignSchema),
    defaultValues: {
      campaignName: "",
      objective: "OUTCOME_SALES",
      dailyBudget: "20",
      
      advantagePlusEnabled: true,
      advantageShoppingCampaign: true,
      advantagePlusCreative: true,
      advantagePlusPlacements: true,
      advantagePlusAudience: true,
      
      budgetOptimization: true,
      bidStrategy: "LOWEST_COST",
      costControl: "",
      
      headline: "",
      primaryText: "",
      description: "",
      callToAction: "SHOP_NOW",
      
      targetAgeMin: "18",
      targetAgeMax: "65",
      targetGender: "ALL",
      targetCountries: "US",
      detailedTargeting: "",
      
      facebookFeed: true,
      facebookStories: true,
      instagramFeed: true,
      instagramStories: true,
      instagramReels: true,
      messengerInbox: true,
      audienceNetwork: true,
    },
  });

  const [advantagePlusEnabled, setAdvantagePlusEnabled] = useState(true);

  const createCampaignMutation = useMutation({
    mutationFn: async (data: MetaCampaignForm) => {
      return await apiRequest("POST", "/api/meta-campaigns", {
        productId: params?.id,
        ...data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Campaign created!",
        description: "Your Meta ad campaign has been created successfully",
      });
      setLocation("/seller/products");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MetaCampaignForm) => {
    createCampaignMutation.mutate(data);
  };

  if (!product) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <SiFacebook className="h-8 w-8 text-[#1877F2]" />
              <SiInstagram className="h-8 w-8 text-[#E4405F]" />
            </div>
            <h1 className="text-4xl font-bold">Create Meta Campaign</h1>
          </div>
          <p className="text-muted-foreground">
            Promote {product.name} on Facebook & Instagram with AI-powered Advantage+
          </p>
        </div>

        {/* Product Preview */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Product</h2>
          <div className="flex gap-4">
            {product.image && (
              <img src={product.image} alt={product.name} className="w-24 h-24 object-cover rounded" />
            )}
            <div>
              <h3 className="font-semibold text-lg">{product.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
              <Badge className="mt-2">${product.price}</Badge>
            </div>
          </div>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Advantage+ Settings */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-6 w-6 text-[#1877F2]" />
                <h2 className="text-2xl font-semibold">Advantage+ AI Optimization</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Let Meta's AI automatically optimize your campaign for better performance
              </p>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="advantagePlusEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">
                          Enable Advantage+ (Recommended)
                        </FormLabel>
                        <FormDescription>
                          Use Meta's AI to automatically optimize your campaign for maximum results
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            setAdvantagePlusEnabled(checked);
                          }}
                          data-testid="switch-advantage-plus"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {advantagePlusEnabled && (
                  <>
                    <FormField
                      control={form.control}
                      name="advantageShoppingCampaign"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-advantage-shopping"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium">
                              Advantage+ Shopping Campaign
                            </FormLabel>
                            <FormDescription>
                              Automated campaign type designed specifically for e-commerce sales
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="advantagePlusCreative"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-advantage-creative"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium">
                              Advantage+ Creative
                            </FormLabel>
                            <FormDescription>
                              AI automatically enhances your ad creative (brightness, contrast, text overlays)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="advantagePlusPlacements"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-advantage-placements"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium">
                              Advantage+ Placements
                            </FormLabel>
                            <FormDescription>
                              AI automatically places your ads where they'll perform best across Facebook & Instagram
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="advantagePlusAudience"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-advantage-audience"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium">
                              Advantage+ Audience
                            </FormLabel>
                            <FormDescription>
                              AI expands beyond your target audience to find people most likely to convert
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </Card>

            {/* Campaign Details */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Campaign Details</h2>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="My Product Campaign" data-testid="input-campaign-name" />
                      </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Budget & Optimization */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="h-6 w-6" />
                <h2 className="text-2xl font-semibold">Budget & Bidding</h2>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="dailyBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Budget ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" data-testid="input-budget" />
                      </FormControl>
                      <FormDescription>
                        Minimum recommended: $20/day for optimal performance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budgetOptimization"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="space-y-0.5">
                        <FormLabel className="font-medium">Campaign Budget Optimization</FormLabel>
                        <FormDescription>
                          AI distributes budget across ad sets for best results
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bidStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bid Strategy</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LOWEST_COST">Lowest Cost (Recommended)</SelectItem>
                          <SelectItem value="COST_CAP">Cost Cap</SelectItem>
                          <SelectItem value="BID_CAP">Bid Cap</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Lowest Cost lets AI find the best deals automatically
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Ad Creative */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Ad Creative</h2>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="headline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headline (Max 40 chars)</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={40} data-testid="input-headline" />
                      </FormControl>
                      <FormDescription>{field.value.length}/40 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Text (Max 125 chars)</FormLabel>
                      <FormControl>
                        <Textarea {...field} maxLength={125} rows={3} data-testid="textarea-primary-text" />
                      </FormControl>
                      <FormDescription>{field.value.length}/125 characters</FormDescription>
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
                          <SelectTrigger>
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
            {!advantagePlusEnabled && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="h-6 w-6" />
                  <h2 className="text-2xl font-semibold">Audience Targeting</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetAgeMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Age</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="18" max="65" />
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
                          <Input {...field} type="number" min="18" max="65" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetGender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                          <Input {...field} placeholder="US, CA, UK" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={createCampaignMutation.isPending}
                className="gap-2"
                data-testid="button-create-campaign"
              >
                {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                <Zap className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/seller/products")}
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
