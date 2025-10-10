import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BackToDashboard } from "@/components/back-to-dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { WholesaleProduct } from "@shared/schema";
import { Plus, Package, Trash2, Mail, Upload, Download } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function WholesaleProducts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: products, isLoading } = useQuery<WholesaleProduct[]>({
    queryKey: ["/api/wholesale/products"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/wholesale/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/products"] });
      toast({
        title: "Product deleted",
        description: "The wholesale product has been deleted successfully.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Name,Description,Image URL,Category,RRP,Wholesale Price,MOQ,Stock,Deposit Amount (optional),Requires Deposit (0 or 1),Readiness Days (optional)
Classic T-Shirt,Premium cotton t-shirt,https://example.com/image.jpg,Apparel,29.99,15.00,50,500,5.00,1,14
Leather Bag,Handcrafted leather bag,https://example.com/bag.jpg,Accessories,199.99,99.00,25,100,,,30`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wholesale-products-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template downloaded",
      description: "Fill in your product data and upload the CSV file",
    });
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('/api/wholesale/products/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      toast({
        title: "Products uploaded successfully",
        description: `${data.created} products created, ${data.errors?.length || 0} errors`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/wholesale/products"] });
      setShowBulkUpload(false);
      setUploadFile(null);

      if (data.errors && data.errors.length > 0) {
        console.log("Upload errors:", data.errors);
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload products",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <BackToDashboard />
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
                Wholesale Products
              </h1>
              <p className="text-muted-foreground">
                Manage your B2B wholesale catalog with MOQ and special pricing
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setLocation("/seller/wholesale/invitations")}
                data-testid="button-manage-invitations"
              >
                <Mail className="h-4 w-4 mr-2" />
                Buyer Invitations
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkUpload(true)}
                data-testid="button-bulk-upload"
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
              <Button
                onClick={() => setLocation("/seller/wholesale/create-product")}
                data-testid="button-create-wholesale-product"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Wholesale Product
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
        ) : !products || products.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No wholesale products yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first wholesale product to start offering B2B pricing
            </p>
            <Button
              onClick={() => setLocation("/seller/wholesale/create-product")}
              data-testid="button-create-first-product"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Wholesale Product
            </Button>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>RRP</TableHead>
                  <TableHead>Wholesale Price</TableHead>
                  <TableHead>MOQ</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.requiresDeposit === 1 && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Requires Deposit
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>${parseFloat(product.rrp).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">
                      ${parseFloat(product.wholesalePrice).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge>{product.moq} units</Badge>
                    </TableCell>
                    <TableCell>
                      {product.stock && product.stock > 0 ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          {product.stock} in stock
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                          Made to Order
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(product.id)}
                        data-testid={`button-delete-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete wholesale product?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the wholesale product
                from your catalog.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk Upload Wholesale Products</DialogTitle>
              <DialogDescription>
                Upload a CSV file with your wholesale product line sheet. Download the template to see the required format.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex-1"
                  data-testid="button-download-template"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-upload"
                  data-testid="input-csv-file"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {uploadFile ? uploadFile.name : "Click to upload CSV"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports CSV, Excel (.xlsx, .xls)
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-medium">CSV Format Requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Required: Name, Description, Image URL, Category, RRP, Wholesale Price, MOQ</li>
                  <li>Optional: Stock, Deposit Amount, Requires Deposit (0/1), Readiness Days</li>
                  <li>First row must be headers</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkUpload(false);
                  setUploadFile(null);
                }}
                disabled={isUploading}
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={!uploadFile || isUploading}
                data-testid="button-confirm-upload"
              >
                {isUploading ? "Uploading..." : "Upload Products"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
