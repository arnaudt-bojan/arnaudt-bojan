import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Sparkles, CheckCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CSV_TEMPLATE_FIELDS } from "@shared/bulk-upload-template";

interface FieldMapping {
  userField: string;
  standardField: string | null;
  confidence: number;
  reasoning?: string;
}

interface MappingAnalysis {
  mappings: FieldMapping[];
  unmappedUserFields: string[];
  missingRequiredFields: string[];
  suggestions: string[];
}

interface AIFieldMappingProps {
  userHeaders: string[];
  jobId?: string;
  onMappingComplete: (mappings: FieldMapping[]) => void;
}

export function AIFieldMapping({ userHeaders, jobId, onMappingComplete }: AIFieldMappingProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [analysis, setAnalysis] = useState<MappingAnalysis | null>(null);

  // Analyze headers using AI
  const analyzeMutation = useMutation({
    mutationFn: async (headers: string[]) => {
      const response = await apiRequest("POST", "/api/bulk-upload/analyze-headers", { headers });
      if (!response.ok) {
        throw new Error("Failed to analyze headers");
      }
      return await response.json() as MappingAnalysis;
    },
    onSuccess: (data: MappingAnalysis) => {
      setAnalysis(data);
      setMappings(data.mappings);
      toast({
        title: "AI Analysis Complete",
        description: `Mapped ${data.mappings.length} fields with confidence scores`,
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze CSV headers. Please try manual mapping.",
        variant: "destructive",
      });
    },
  });

  // Auto-analyze on mount
  useEffect(() => {
    if (userHeaders.length > 0 && !analysis) {
      analyzeMutation.mutate(userHeaders);
    }
  }, [userHeaders]);

  // Update a specific mapping
  const updateMapping = (userField: string, standardField: string | null) => {
    setMappings(prev =>
      prev.map(m =>
        m.userField === userField
          ? { ...m, standardField, confidence: standardField ? 100 : 0 }
          : m
      )
    );
  };

  // Get confidence badge variant and icon
  const getConfidenceBadge = (confidence: number, standardField: string | null) => {
    // If unmapped (standardField is null), show as low confidence/manual
    if (standardField === null) {
      return { variant: "outline" as const, icon: <Info className="h-3 w-3" />, label: "Ignored" };
    }
    
    if (confidence >= 80) {
      return { variant: "default" as const, icon: <CheckCircle className="h-3 w-3" />, label: "High" };
    } else if (confidence >= 50) {
      return { variant: "secondary" as const, icon: <AlertTriangle className="h-3 w-3" />, label: "Review" };
    } else {
      return { variant: "destructive" as const, icon: <Info className="h-3 w-3" />, label: "Manual" };
    }
  };

  // Apply mappings mutation  
  const applyMappingsMutation = useMutation({
    mutationFn: async (mappings: FieldMapping[]) => {
      // First, update the job with mappings
      if (jobId) {
        await apiRequest("POST", `/api/bulk-upload/update-mappings/${jobId}`, { mappings });
        // Then apply the transformation
        const response = await apiRequest("POST", `/api/bulk-upload/apply-mappings/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to apply mappings");
        }
        return await response.json();
      }
      return null;
    },
    onSuccess: () => {
      toast({
        title: "Mappings Applied",
        description: "CSV data has been transformed successfully",
      });
      onMappingComplete(mappings);
    },
    onError: (error) => {
      toast({
        title: "Failed to Apply Mappings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Validate and apply mappings
  const handleApplyMappings = () => {
    const missingRequired = CSV_TEMPLATE_FIELDS
      .filter(f => f.required)
      .filter(f => !mappings.some(m => m.standardField === f.name))
      .map(f => f.name);

    if (missingRequired.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please map: ${missingRequired.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (jobId) {
      applyMappingsMutation.mutate(mappings);
    } else {
      // No job ID, just return mappings (preview mode)
      onMappingComplete(mappings);
    }
  };

  if (analyzeMutation.isPending) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">AI is analyzing your CSV...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Mapping {userHeaders.length} columns to our standard format
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      {analysis && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mappings.filter(m => m.standardField !== null && m.confidence >= 80).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Auto-mapped fields</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Need Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mappings.filter(m => m.standardField !== null && m.confidence >= 50 && m.confidence < 80).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Review suggested mappings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Unmapped</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mappings.filter(m => m.standardField === null).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Fields will be ignored</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suggestions */}
      {analysis && analysis.suggestions.length > 0 && (
        <div className="space-y-2">
          {analysis.suggestions.map((suggestion, idx) => {
            const variant = suggestion.includes('⚠️') ? "destructive" : 
                          suggestion.includes('✅') ? "default" : 
                          suggestion.includes('👀') ? "default" : "default";
            return (
              <Alert key={idx} variant={variant}>
                <AlertDescription>{suggestion}</AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Field Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Field Mappings
          </CardTitle>
          <CardDescription>
            Review and adjust how your CSV columns map to our standard fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Your Column</TableHead>
                <TableHead>Maps To</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>AI Reasoning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => {
                const confidenceBadge = getConfidenceBadge(mapping.confidence, mapping.standardField);
                return (
                  <TableRow key={mapping.userField}>
                    <TableCell className="font-medium">
                      {mapping.userField}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.standardField || "none"}
                        onValueChange={(value) => 
                          updateMapping(mapping.userField, value === "none" ? null : value)
                        }
                        data-testid={`select-mapping-${mapping.userField}`}
                      >
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Don't map —</SelectItem>
                          {CSV_TEMPLATE_FIELDS.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name} {field.required && <span className="text-destructive">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={confidenceBadge.variant} className="gap-1">
                        {confidenceBadge.icon}
                        {confidenceBadge.label} ({mapping.confidence}%)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mapping.reasoning || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Apply Mappings Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleApplyMappings} 
          size="lg"
          data-testid="button-apply-mappings"
          className="gap-2"
        >
          Apply Mappings & Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
