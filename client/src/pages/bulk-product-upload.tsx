import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, FileText, ChevronRight, Package, ShoppingCart, Box, ArrowRight } from "lucide-react";
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
    orphanedVariations: number;
    missingParents: number;
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
      const response = await apiRequest("POST", `/api/bulk-upload/preprocess/${jobId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Preprocessing failed");
      }
      return await response.json();
    },
    onSuccess: (data: PreprocessingResult, jobId) => {
      setPreprocessingResult(data);
      setPreprocessingError(null);
      setCsvHeaders(data.headers);
      queryClient.invalidateQueries({ queryKey: [`/api/bulk-upload/job/${jobId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-upload/jobs"] });
      toast({
        title: "Preprocessing complete",
        description: `Detected ${data.format} format. ${data.productCount} products ready for mapping.`,
      });
      // Stay on upload tab to show preprocessing results
      setActiveTab("upload");
    },
    onError: (error: Error) => {
      setPreprocessingError(error.message);
      toast({
        title: "Preprocessing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/bulk-upload/validate/${jobId}`);
      return await response.json();
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bulk-upload/job/${jobId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bulk-upload/job/${jobId}/items`] });
      toast({
        title: "Validation started",
        description: "Validating products...",
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

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/bulk-upload/import/${jobId}`);
      return await response.json();
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bulk-upload/job/${jobId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bulk-upload/job/${jobId}/items`] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      toast({
        title: "Import started",
        description: "Importing products...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/bulk-upload/rollback/${jobId}`);
      return await response.json();
    },
    onSuccess: (data) => {
      refetchJob();
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-upload/jobs"] });
      toast({
        title: "Rollback successful",
        description: `Deleted ${data.deletedCount} products`,
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
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    uploadMutation.mutate(formData);
  };

  const handleValidate = () => {
    if (currentJobId) {
      validateMutation.mutate(currentJobId);
    }
  };

  const handleImport = () => {
    if (currentJobId) {
      importMutation.mutate(currentJobId);
    }
  };

  const handleRollback = (jobId: string) => {
    if (confirm("Are you sure you want to rollback this import? This will delete all products created from this upload.")) {
      rollbackMutation.mutate(jobId);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: "outline", icon: AlertCircle },
      preprocessed: { variant: "outline", icon: CheckCircle },
      validating: { variant: "outline", icon: Loader2 },
      validated: { variant: "outline", icon: CheckCircle },
      importing: { variant: "outline", icon: Loader2 },
      completed: { variant: "default", icon: CheckCircle },
      failed: { variant: "destructive", icon: XCircle },
    };

    const { variant, icon: Icon } = variants[status] || variants.pending;

    return (
      <Badge variant={variant} data-testid={`badge-status-${status}`}>
        <Icon className={`mr-1 h-3 w-3 ${status === 'validating' || status === 'importing' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  const getFormatBadge = (format: string) => {
    const formatConfig: Record<string, { label: string; icon: any; variant: any }> = {
      woocommerce: { label: "WooCommerce", icon: ShoppingCart, variant: "default" },
      shopify: { label: "Shopify", icon: Package, variant: "default" },
      generic: { label: "Generic CSV", icon: Box, variant: "secondary" },
    };

    const config = formatConfig[format] || formatConfig.generic;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} data-testid={`badge-format-${format}`}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const errorItems = validationResults?.filter(item => item.validationStatus === 'error') || [];
  const warningItems = validationResults?.filter(item => item.validationStatus === 'warning') || [];
  const validItems = validationResults?.filter(item => item.validationStatus === 'valid') || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bulk Product Upload</h1>
        <p className="text-muted-foreground">Upload multiple products at once using a CSV file with advanced validation</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" data-testid="tab-upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="map" disabled={!currentJobId || csvHeaders.length === 0} data-testid="tab-map">
            Map Fields
          </TabsTrigger>
          <TabsTrigger value="validate" disabled={!currentJobId} data-testid="tab-validate">
            Validate
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Download Template</CardTitle>
              <CardDescription>
                Download the CSV template with all product fields and instructions
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

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Upload CSV File</CardTitle>
              <CardDescription>
                Select your filled CSV file to start the import process
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
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload CSV
                    </>
                  )}
                </Button>
              </div>
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

                {preprocessingResult.warnings.length > 0 && (
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

                {(preprocessingResult.diagnostics.orphanedVariations > 0 || preprocessingResult.diagnostics.missingParents > 0) && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-2">Issues Detected:</p>
                      <ul className="list-disc list-inside space-y-1" data-testid="list-preprocessing-issues">
                        {preprocessingResult.diagnostics.orphanedVariations > 0 && (
                          <li className="text-sm">
                            {preprocessingResult.diagnostics.orphanedVariations} orphaned variation(s) found
                          </li>
                        )}
                        {preprocessingResult.diagnostics.missingParents > 0 && (
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
                    Continue to Field Mapping
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

          <Card>
            <CardHeader>
              <CardTitle>Important Format Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Product Types:</p>
                <p className="text-muted-foreground">in-stock, pre-order, made-to-order, wholesale</p>
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
              <CardTitle>AI Field Mapping</CardTitle>
              <CardDescription>
                Review and adjust how your CSV columns map to our standard product fields
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
                    {currentJob.status === 'pending' && (
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
                {(currentJob.status === 'validating' || currentJob.status === 'importing') && (
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing...</span>
                        <span>{currentJob.processedRows} / {currentJob.totalRows}</span>
                      </div>
                      <Progress 
                        value={(currentJob.processedRows / currentJob.totalRows) * 100} 
                        data-testid="progress-processing"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {currentJob.status === 'validated' && validationResults && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Valid Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-valid-count">
                        {validItems.length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-warning-count">
                        {warningItems.length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-error-count">
                        {errorItems.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {errorItems.length > 0 && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <XCircle className="h-5 w-5" />
                      Validation Errors ({errorItems.length})
                    </CardTitle>
                    <CardDescription>Fix these errors before importing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Errors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errorItems.map((item) => (
                          <TableRow key={item.id} data-testid={`error-row-${item.rowNumber}`}>
                            <TableCell>{item.rowNumber}</TableCell>
                            <TableCell>{item.rowData.name || 'N/A'}</TableCell>
                            <TableCell>
                              <ul className="list-disc list-inside text-sm text-destructive">
                                {item.validationMessages.map((msg, idx) => (
                                  <li key={idx}>{msg}</li>
                                ))}
                              </ul>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {currentJob.status === 'completed' && (
                <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Successfully imported {currentJob.successCount} products!
                  </AlertDescription>
                </Alert>
              )}

              {currentJob.status === 'failed' && currentJob.errorMessage && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentJob.errorMessage}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>View and manage your previous bulk uploads</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : jobHistory && jobHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Success/Errors</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobHistory.map((job) => (
                      <TableRow key={job.id} data-testid={`history-row-${job.id}`}>
                        <TableCell className="font-medium">{job.fileName}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>{job.totalRows}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {job.successCount > 0 && (
                              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
                                {job.successCount} ✓
                              </Badge>
                            )}
                            {job.errorCount > 0 && (
                              <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20">
                                {job.errorCount} ✗
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
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
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRollback(job.id)}
                                disabled={rollbackMutation.isPending}
                                data-testid={`button-rollback-${job.id}`}
                              >
                                {rollbackMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No upload history yet. Upload your first CSV to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
