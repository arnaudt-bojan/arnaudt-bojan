import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Star, Image as ImageIcon, Link as LinkIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";

interface BulkImageInputProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function BulkImageInput({ 
  images, 
  onChange, 
  maxImages = 10 
}: BulkImageInputProps) {
  const [bulkUrls, setBulkUrls] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  const handleBulkAdd = () => {
    // Parse URLs from textarea (newline or comma separated)
    const urls = bulkUrls
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith("http"))
      .slice(0, maxImages);

    if (urls.length > 0) {
      onChange(urls);
      setBulkUrls("");
      setShowBulkDialog(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
    
    // Adjust hero index if needed
    if (heroIndex >= newImages.length) {
      setHeroIndex(Math.max(0, newImages.length - 1));
    }
  };

  const setAsHero = (index: number) => {
    // Move selected image to first position
    const newImages = [...images];
    const [heroImage] = newImages.splice(index, 1);
    newImages.unshift(heroImage);
    onChange(newImages);
    setHeroIndex(0);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
    
    // Update hero index
    if (fromIndex === heroIndex) {
      setHeroIndex(toIndex);
    } else if (fromIndex < heroIndex && toIndex >= heroIndex) {
      setHeroIndex(heroIndex - 1);
    } else if (fromIndex > heroIndex && toIndex <= heroIndex) {
      setHeroIndex(heroIndex + 1);
    }
  };

  const addSingleUrl = () => {
    if (images.length < maxImages) {
      onChange([...images, ""]);
    }
  };

  const updateSingleUrl = (index: number, url: string) => {
    const newImages = [...images];
    newImages[index] = url;
    onChange(newImages);
  };

  // Handle image upload
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    return {
      method: "PUT" as const,
      url: (response as any).uploadURL,
    };
  };

  const handleUploadComplete = async (index: number, result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL;

      // Normalize the path and set ACL policy
      const response = await apiRequest("PUT", "/api/product-images", {
        imageURL: uploadURL,
      });

      // Update the image URL with the normalized path
      updateSingleUrl(index, (response as any).objectPath);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Product Images (up to {maxImages})
        </Label>
        <div className="flex gap-2">
          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
            <DialogTrigger asChild>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="gap-2"
                data-testid="button-bulk-add-images"
              >
                <LinkIcon className="h-4 w-4" />
                Paste Multiple URLs
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Multiple Image URLs</DialogTitle>
                <DialogDescription>
                  Paste image URLs (one per line or comma-separated). The first image will be your hero image.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Textarea
                  placeholder={`https://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg`}
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="textarea-bulk-urls"
                />
                <Button 
                  onClick={handleBulkAdd} 
                  className="w-full"
                  data-testid="button-confirm-bulk-add"
                >
                  Add {bulkUrls.split(/[\n,]/).filter(u => u.trim().startsWith("http")).length} Images
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {images.length < maxImages && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSingleUrl}
              className="gap-2"
              data-testid="button-add-single-image"
            >
              <ImageIcon className="h-4 w-4" />
              Add One
            </Button>
          )}
        </div>
      </div>

      {images.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            No images added yet. Add images using the buttons above.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <Card 
              key={index} 
              className={cn(
                "relative group overflow-hidden",
                index === heroIndex && "ring-2 ring-primary"
              )}
            >
              {/* Hero badge */}
              {index === heroIndex && (
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Hero
                  </div>
                </div>
              )}

              {/* Image preview */}
              <div className="aspect-square bg-muted">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.classList.add('hidden');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* URL input with upload button */}
              <div className="p-2 space-y-2">
                <input
                  type="url"
                  placeholder="https://... or upload below"
                  value={imageUrl}
                  onChange={(e) => updateSingleUrl(index, e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid={`input-image-url-${index}`}
                />
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={(result) => handleUploadComplete(index, result)}
                  variant="outline"
                  buttonClassName="w-full h-7 text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </ObjectUploader>
              </div>

              {/* Action buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {index !== heroIndex && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    onClick={() => setAsHero(index)}
                    title="Set as hero image"
                    data-testid={`button-set-hero-${index}`}
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={() => removeImage(index)}
                  title="Remove image"
                  data-testid={`button-remove-image-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Position indicator */}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-xs">
                #{index + 1}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        💡 The first image is your <strong>hero image</strong> (main display). 
        Click the star to set a different image as hero, or drag to reorder.
      </p>
    </div>
  );
}
