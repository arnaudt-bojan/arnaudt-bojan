import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Papa from "papaparse";

interface UploadResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export default function BulkProductUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const { data: categories } = useQuery<Array<{ id: string; name: string; level: number; parentId: string | null }>>({
    queryKey: ["/api/categories"],
  });

  const downloadTemplate = () => {
    // Create CSV template with headers and example row
    const headers = [
      "name",
      "description", 
      "price",
      "image",
      "category",
      "productType",
      "stock",
      "depositAmount",
      "requiresDeposit",
      "madeToOrderDays",
      "preOrderDate"
    ];

    const exampleRow = [
      "Example Product",
      "This is a detailed product description",
      "99.99",
      "https://example.com/image.jpg",
      "Electronics",
      "in-stock",
      "100",
      "",
      "0",
      "",
      ""
    ];

    const instructions = [
      "# PRODUCT BULK UPLOAD TEMPLATE",
      "# Instructions:",
      "# - Fill in product details below the header row",
      "# - productType: in-stock, pre-order, made-to-order, or wholesale",
      "# - requiresDeposit: 0 (false) or 1 (true)",
      "# - depositAmount: required if requiresDeposit is 1",
      "# - madeToOrderDays: required if productType is made-to-order",
      "# - preOrderDate: required if productType is pre-order (format: YYYY-MM-DD)",
      "# - Delete this instruction section before uploading",
      "",
    ];

    const csvContent = [
      ...instructions,
      headers.join(","),
      exampleRow.join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
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
  };

  const uploadMutation = useMutation({
    mutationFn: async (products: any[]) => {
      const response = await apiRequest("POST", "/api/products/bulk", { products });
      return await response.json();
    },
    onSuccess: (data: UploadResult) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      if (data.success > 0) {
        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${data.success} product${data.success > 1 ? 's' : ''}`,
        });
      }
      
      if (data.failed > 0) {
        toast({
          title: "Some products failed",
          description: `${data.failed} product${data.failed > 1 ? 's' : ''} could not be uploaded. Check the errors below.`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload products. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
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

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Filter out instruction rows (starting with #)
        const products = results.data.filter((row: any) => 
          !row.name?.startsWith("#") && row.name
        ).map((row: any) => ({
          name: row.name,
          description: row.description,
          price: row.price,
          image: row.image,
          images: row.image ? [row.image] : [],
          category: row.category,
          productType: row.productType,
          stock: row.stock ? parseInt(row.stock) : 0,
          depositAmount: row.depositAmount || null,
          requiresDeposit: row.requiresDeposit ? parseInt(row.requiresDeposit) : 0,
          madeToOrderDays: row.madeToOrderDays ? parseInt(row.madeToOrderDays) : null,
          preOrderDate: row.preOrderDate || null,
        }));

        if (products.length === 0) {
          toast({
            title: "No products found",
            description: "The CSV file contains no valid products",
            variant: "destructive",
          });
          return;
        }

        uploadMutation.mutate(products);
      },
      error: (error) => {
        toast({
          title: "Parse error",
          description: `Failed to parse CSV: ${error.message}`,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bulk Product Upload</h1>
        <p className="text-muted-foreground">Upload multiple products at once using a CSV file</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Download Template</CardTitle>
            <CardDescription>
              Download the CSV template, fill it with your product data, and upload it back
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadTemplate} variant="outline" data-testid="button-download-template">
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload CSV File</CardTitle>
            <CardDescription>
              Select your filled CSV file and upload it to create products
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
              </div>
              <Button 
                onClick={handleUpload} 
                disabled={!file || uploadMutation.isPending}
                data-testid="button-upload-csv"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadMutation.isPending ? "Uploading..." : "Upload Products"}
              </Button>
            </div>

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Processing products...</p>
                <Progress value={50} className="w-full" />
              </div>
            )}

            {uploadResult && (
              <div className="space-y-4 mt-6">
                <div className="flex gap-4">
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {uploadResult.success} Successful
                  </Badge>
                  {uploadResult.failed > 0 && (
                    <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <XCircle className="mr-1 h-3 w-3" />
                      {uploadResult.failed} Failed
                    </Badge>
                  )}
                </div>

                {uploadResult.errors.length > 0 && (
                  <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Upload Errors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {uploadResult.errors.map((err, idx) => (
                          <li key={idx} className="text-red-700 dark:text-red-300">
                            Row {err.row}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSV Format Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Required fields:</strong> name, description, price, image, category, productType</p>
            <p><strong>Product Types:</strong> in-stock, pre-order, made-to-order, wholesale</p>
            <p><strong>Optional fields:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>stock - Number of items in stock (default: 0)</li>
              <li>depositAmount - Required if requiresDeposit is 1</li>
              <li>requiresDeposit - 0 or 1 (default: 0)</li>
              <li>madeToOrderDays - Number of days for made-to-order products</li>
              <li>preOrderDate - Format: YYYY-MM-DD (for pre-order products)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
