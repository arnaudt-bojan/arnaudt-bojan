import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, FileText, ChevronRight, Package, ShoppingCart, Box, ArrowRight, Sparkles, FileSpreadsheet, Zap, CheckCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { AIFieldMapping } from "@/components/ai-field-mapping";

type PreprocessingResult = {
  format: 'woocommerce' | 'shopify' | 'generic';
  originalRowCount: number;
  productCount: number;
  warnings: string[];
  diagnostics: {
    orphanedVariations?: number;
    missingParents?: number;
    duplicateHandles?: number;
  };
  headers: string[];
};

type BulkUploadJob = {
  id: string;
  sellerId: string;
  fileName: string;
  status: 'pending' | 'preprocessed' | 'validating' | 'validated' | 'importing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  mappings: Record<string, string>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

type BulkUploadItem = {
  id: string;
  jobId: string;
  rowNumber: number;
  rowData: Record<string, any>;
  validationStatus: 'pending' | 'valid' | 'error' | 'warning';
  validationMessages: string[];
  productId?: string;
  createdAt: string;
};

export default function BulkProductUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [preprocessingResult, setPreprocessingResult] = useState<PreprocessingResult | null>(null);
  const [preprocessingError, setPreprocessingError] = useState<string | null>(null);

  // Fetch job history
  const { data: jobHistory, isLoading: loadingHistory } = useQuery<BulkUploadJob[]>({
    queryKey: ["/api/bulk-upload/jobs"],
  });

  // Fetch current job details
  const { data: currentJob, refetch: refetchJob } = useQuery<BulkUploadJob>({
    queryKey: [`/api/bulk-upload/job/${currentJobId}`],
    enabled: !!currentJobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      return job?.status === 'validating' || job?.status === 'importing' ? 2000 : false;
    },
  });

  // Fetch validation results
  const { data: validationResults } = useQuery<BulkUploadItem[]>({
    queryKey: [`/api/bulk-upload/job/${currentJobId}/items`],
    enabled: !!currentJobId && currentJob?.status !== 'pending',
  });

  // Download template
  const downloadTemplate = async () => {
    try {
      const response = await fetch("/api/bulk-upload/template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product_upload_template.csv";
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Template downloaded",
        description: "Fill in the template and upload it to add products in bulk",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Download instructions
  const downloadInstructions = async () => {
    try {
      const response = await fetch("/api/bulk-upload/instructions");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_upload_instructions.txt";
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Instructions downloaded",
        description: "Review the instructions for detailed CSV format information",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download instructions.",
        variant: "destructive",
      });
    }
  };

  // Upload CSV mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/bulk-upload/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.job.id);
      setCsvHeaders(data.headers || []);
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-upload/jobs"] });
      toast({
        title: "Upload successful",
        description: `Uploaded ${data.totalRows} rows. Starting preprocessing...`,
      });
      // Auto-trigger preprocessing
      if (data.job.id) {
        preprocessMutation.mutate(data.job.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Preprocess CSV mutation
  const preprocessMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await apiRequest("POST", `/api/bulk-upload/preprocess/${jobId}`) as unknown as PreprocessingResult;
    },
    onSuccess: (data) => {
      setPreprocessingResult(data);
      setPreprocessingError(null);
      refetchJob();
      queryClient.invalidateQueries({ queryKey: [`/api/bulk-upload/job/${currentJobId}/items`] });
    },
    onError: (error: Error) => {
      setPreprocessingError(error.message);
    },
  });

  // Validate CSV mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!currentJobId) throw new Error("No job ID");
      return await apiRequest("POST", `/api/bulk-upload/validate/${currentJobId}`);
    },
    onSuccess: () => {
      refetchJob();
      queryClient.invalidateQueries({ queryKey: [`/api/bulk-upload/job/${currentJobId}/items`] });
      toast({
        title: "Validation complete",
        description: "Your CSV has been validated. Review the results below.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Validation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import products mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!currentJobId) throw new Error("No job ID");
      return await apiRequest("POST", `/api/bulk-upload/import/${currentJobId}`);
    },
    onSuccess: (data: any) => {
      refetchJob();
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-upload/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Import complete",
        description: `Successfully imported ${data.successCount} products!`,
      });
      setActiveTab("history");
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rollback job mutation
  const rollbackMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await apiRequest("POST", `/api/bulk-upload/rollback/${jobId}`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-upload/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Rollback complete",
        description: `Rolled back ${data.deletedCount} products`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rollback failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreprocessingResult(null);
      setPreprocessingError(null);
    }
  };

  const handleUpload = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    uploadMutation.mutate(formData);
  };

  const handleValidate = () => {
    validateMutation.mutate();
  };

  const handleImport = () => {
    importMutation.mutate();
  };

  const handleRollback = (jobId: string) => {
    if (confirm("Are you sure you want to rollback this import? This will delete all imported products from this job.")) {
      rollbackMutation.mutate(jobId);
    }
  };

  const getStatusBadge = (status: BulkUploadJob['status']) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      preprocessed: { variant: "secondary" as const, label: "Preprocessed" },
      validating: { variant: "secondary" as const, label: "Validating" },
      validated: { variant: "default" as const, label: "Validated" },
      importing: { variant: "secondary" as const, label: "Importing" },
      completed: { variant: "default" as const, label: "Completed" },
      failed: { variant: "destructive" as const, label: "Failed" },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const getFormatBadge = (format: 'woocommerce' | 'shopify' | 'generic') => {
    const formatConfig = {
      woocommerce: { label: "WooCommerce", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
      shopify: { label: "Shopify", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
      generic: { label: "Generic CSV", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    };

    const config = formatConfig[format] || formatConfig.generic;
    return <Badge className={config.className} data-testid={`badge-format-${format}`}>{config.label}</Badge>;
  };

  const validItems = validationResults?.filter(r => r.validationStatus === 'valid') || [];
  const warningItems = validationResults?.filter(r => r.validationStatus === 'warning') || [];
  const errorItems = validationResults?.filter(r => r.validationStatus === 'error') || [];

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold" data-testid="heading-bulk-upload">Bulk Product Upload</h1>
            <p className="text-muted-foreground mt-2">Import hundreds of products instantly with AI-powered field mapping</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              disabled={!preprocessingResult}
              data-testid="tab-map"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Map Fields
            </TabsTrigger>
            <TabsTrigger 
              value="validate" 
              disabled={!currentJob || currentJob.status === 'pending'}
              data-testid="tab-validate"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Validate
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6 mt-6">
            {/* Hero Section - AI-First */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI-Powered Import</span>
                  </div>
                  
                  <h2 className="text-3xl font-bold">Upload Any CSV Format</h2>
                  <p className="text-lg text-muted-foreground">
                    No template required. Our AI automatically detects and maps your CSV columns—whether it's from WooCommerce, Shopify, or your custom format.
                  </p>

                  <div className="grid md:grid-cols-3 gap-4 pt-6">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 hover-elevate">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold">1. Upload CSV</h3>
                      <p className="text-sm text-muted-foreground text-center">Drop any CSV file from any platform</p>
                    </div>

                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 hover-elevate">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold">2. AI Maps Fields</h3>
                      <p className="text-sm text-muted-foreground text-center">Automatic column detection & mapping</p>
                    </div>

                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 hover-elevate">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCheck className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold">3. Import Products</h3>
                      <p className="text-sm text-muted-foreground text-center">Validate & import in seconds</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Upload Your CSV File
                </CardTitle>
                <CardDescription>
                  Select your product CSV from WooCommerce, Shopify, or any custom format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      data-testid="input-csv-file"
                    />
                    {file && (
                      <p className="text-sm text-muted-foreground mt-2" data-testid="text-selected-file">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleUpload} 
                    disabled={!file || uploadMutation.isPending || preprocessMutation.isPending}
                    data-testid="button-upload-csv"
                    size="lg"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload & Process
                      </>
                    )}
                  </Button>
                </div>

                <Alert className="bg-primary/5 border-primary/20">
                  <Zap className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <p className="font-medium text-primary mb-1">Supported Formats</p>
                    <p className="text-sm text-muted-foreground">
                      ✓ WooCommerce exports • ✓ Shopify exports • ✓ Custom CSV with product data
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {preprocessMutation.isPending && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <div>
                      <p className="font-medium">Preprocessing CSV...</p>
                      <p className="text-sm text-muted-foreground">Detecting format and flattening multi-row products</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {preprocessingError && !preprocessMutation.isPending && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium mb-1">Preprocessing Failed</p>
                      <p className="text-sm" data-testid="text-preprocessing-error">{preprocessingError}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (currentJobId) {
                          setPreprocessingError(null);
                          preprocessMutation.mutate(currentJobId);
                        }
                      }}
                      data-testid="button-retry-preprocessing"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {preprocessingResult && !preprocessMutation.isPending && (
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Preprocessing Complete
                    </CardTitle>
                    {getFormatBadge(preprocessingResult.format)}
                  </div>
                  <CardDescription>
                    CSV format detected and data prepared for import
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Row Transformation</p>
                        <p className="text-lg font-semibold" data-testid="text-row-transformation">
                          {preprocessingResult.originalRowCount} rows → {preprocessingResult.productCount} products
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">CSV Headers</p>
                        <p className="text-lg font-semibold" data-testid="text-headers-count">
                          {preprocessingResult.headers.length} fields detected
                        </p>
                      </div>
                    </div>
                  </div>

                  {preprocessingResult.warnings && preprocessingResult.warnings.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-2">Warnings:</p>
                        <ul className="list-disc list-inside space-y-1" data-testid="list-preprocessing-warnings">
                          {preprocessingResult.warnings.map((warning, idx) => (
                            <li key={idx} className="text-sm">{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {preprocessingResult.diagnostics && ((preprocessingResult.diagnostics.orphanedVariations ?? 0) > 0 || (preprocessingResult.diagnostics.missingParents ?? 0) > 0) && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-2">Issues Detected:</p>
                        <ul className="list-disc list-inside space-y-1" data-testid="list-preprocessing-issues">
                          {(preprocessingResult.diagnostics.orphanedVariations ?? 0) > 0 && (
                            <li className="text-sm">
                              {preprocessingResult.diagnostics.orphanedVariations} orphaned variation(s) found
                            </li>
                          )}
                          {(preprocessingResult.diagnostics.missingParents ?? 0) > 0 && (
                            <li className="text-sm">
                              {preprocessingResult.diagnostics.missingParents} missing parent product(s)
                            </li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={() => {
                        setActiveTab("map");
                      }}
                      className="flex-1"
                      data-testid="button-continue-to-mapping"
                    >
                      Continue to AI Field Mapping
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setPreprocessingResult(null);
                        setFile(null);
                      }}
                      data-testid="button-upload-another"
                    >
                      Upload Another File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Template Section - As Optional Fallback */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Need Help? Use Our Template (Optional)</CardTitle>
                <CardDescription>
                  If you prefer a structured format, download our template and instructions
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button onClick={downloadTemplate} variant="outline" data-testid="button-download-template">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
                <Button onClick={downloadInstructions} variant="outline" data-testid="button-download-instructions">
                  <FileText className="mr-2 h-4 w-4" />
                  Download Instructions
                </Button>
              </CardContent>
            </Card>

            {/* Format Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Important Format Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">Product Types:</p>
                  <p className="text-muted-foreground">All bulk uploads are automatically set to in-stock products</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Variant Formats:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1 text-muted-foreground">
                    <li>Size-only: <code className="text-xs bg-muted px-1 py-0.5 rounded">S:10:SKU|M:20:SKU</code></li>
                    <li>Color variants: <code className="text-xs bg-muted px-1 py-0.5 rounded">Red@@#FF0000@@img.jpg@@S:10:SKU;;Blue@@#0000FF@@img2.jpg@@M:15:SKU</code></li>
                  </ul>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Use @@ and ;; delimiters for color variants to support HTTPS image URLs
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Field Mapping
                </CardTitle>
                <CardDescription>
                  Our AI has automatically mapped your CSV columns to our database fields. Review and adjust if needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {csvHeaders.length > 0 && currentJobId && (
                  <AIFieldMapping
                    userHeaders={csvHeaders}
                    jobId={currentJobId}
                    onMappingComplete={(mappings) => {
                      toast({
                        title: "Mappings saved",
                        description: "Your data has been transformed. Proceeding to validation.",
                      });
                      // Refetch job to get updated status
                      refetchJob();
                      // Invalidate items query to refresh validation results
                      queryClient.invalidateQueries({ queryKey: [`/api/bulk-upload/job/${currentJobId}/items`] });
                      setActiveTab("validate");
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validate" className="space-y-6 mt-6">
            {currentJob && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{currentJob.fileName}</CardTitle>
                        <CardDescription>
                          {currentJob.totalRows} rows • {getStatusBadge(currentJob.status)}
                        </CardDescription>
                      </div>
                      {(currentJob.status === 'pending' || currentJob.status === 'preprocessed') && (
                        <Button onClick={handleValidate} disabled={validateMutation.isPending} data-testid="button-validate">
                          {validateMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Start Validation
                            </>
                          )}
                        </Button>
                      )}
                      {currentJob.status === 'validated' && errorItems.length === 0 && (
                        <Button onClick={handleImport} disabled={importMutation.isPending} data-testid="button-import">
                          {importMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              Import Products
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  {currentJob.status === 'validating' && (
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Validating products...</p>
                          <Progress value={(currentJob.processedRows / currentJob.totalRows) * 100} className="mt-2" />
                          <p className="text-sm text-muted-foreground mt-1">
                            {currentJob.processedRows} of {currentJob.totalRows} rows validated
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                  {currentJob.status === 'importing' && (
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Importing products...</p>
                          <Progress value={(currentJob.successCount / validItems.length) * 100} className="mt-2" />
                          <p className="text-sm text-muted-foreground mt-1">
                            {currentJob.successCount} of {validItems.length} products imported
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {currentJob.status === 'validated' && validationResults && validationResults.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Validation Results</CardTitle>
                      <CardDescription>
                        Review validation status for each product
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                          <div>
                            <p className="text-2xl font-bold" data-testid="text-valid-count">{validItems.length}</p>
                            <p className="text-sm text-muted-foreground">Valid</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                          <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                          <div>
                            <p className="text-2xl font-bold" data-testid="text-warning-count">{warningItems.length}</p>
                            <p className="text-sm text-muted-foreground">Warnings</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
                          <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                          <div>
                            <p className="text-2xl font-bold" data-testid="text-error-count">{errorItems.length}</p>
                            <p className="text-sm text-muted-foreground">Errors</p>
                          </div>
                        </div>
                      </div>

                      {errorItems.length > 0 && (
                        <Alert variant="destructive" className="mb-4">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            Fix errors before importing. Items with errors will not be imported.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>Product Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Messages</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {validationResults.map((item) => (
                              <TableRow key={item.id} data-testid={`row-validation-${item.id}`}>
                                <TableCell className="font-medium">{item.rowNumber}</TableCell>
                                <TableCell>{item.rowData.name || 'N/A'}</TableCell>
                                <TableCell>
                                  {item.validationStatus === 'valid' && (
                                    <Badge variant="default" className="bg-green-600 dark:bg-green-900/30">
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Valid
                                    </Badge>
                                  )}
                                  {item.validationStatus === 'warning' && (
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                      <AlertCircle className="mr-1 h-3 w-3" />
                                      Warning
                                    </Badge>
                                  )}
                                  {item.validationStatus === 'error' && (
                                    <Badge variant="destructive">
                                      <XCircle className="mr-1 h-3 w-3" />
                                      Error
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.validationMessages.length > 0 && (
                                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                                      {item.validationMessages.map((msg, idx) => (
                                        <li key={idx}>{msg}</li>
                                      ))}
                                    </ul>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentJob.status === 'completed' && (
                  <Card className="border-green-600 dark:border-green-400">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        <CardTitle className="text-green-600 dark:text-green-400">Import Complete!</CardTitle>
                      </div>
                      <CardDescription>
                        Successfully imported {currentJob.successCount} products
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {currentJob.status === 'failed' && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">Import Failed</p>
                      <p className="text-sm mt-1">{currentJob.errorMessage || 'An error occurred during import'}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Import History</CardTitle>
                <CardDescription>View and manage your previous bulk uploads</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : jobHistory && jobHistory.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Products</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobHistory.map((job) => (
                          <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                            <TableCell className="font-medium">{job.fileName}</TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell>
                              {job.status === 'completed' ? (
                                <span data-testid={`text-success-count-${job.id}`}>{job.successCount} imported</span>
                              ) : (
                                <span>{job.totalRows} rows</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentJobId(job.id);
                                    setActiveTab("validate");
                                  }}
                                  data-testid={`button-view-${job.id}`}
                                >
                                  View
                                </Button>
                                {job.status === 'completed' && job.successCount > 0 && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRollback(job.id)}
                                    disabled={rollbackMutation.isPending}
                                    data-testid={`button-rollback-${job.id}`}
                                  >
                                    Rollback
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No import history yet</p>
                    <p className="text-sm">Upload a CSV to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
