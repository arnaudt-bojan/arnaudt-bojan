import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Star, Link as LinkIcon, Upload, Pencil, ImageOff, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageEditor } from "@/components/image-editor";
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';

interface UniversalImageUploadProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  label?: string;
  maxImages?: number;
  mode?: "single" | "multiple";
  allowUrl?: boolean;
  allowUpload?: boolean;
  aspectRatio?: "square" | "wide" | "auto";
  heroSelection?: boolean;
  size?: "default" | "compact";
  className?: string;
}

export function UniversalImageUpload({
  value,
  onChange,
  label = "Images",
  maxImages = 10,
  mode = "multiple",
  allowUrl = true,
  allowUpload = true,
  aspectRatio = "square",
  heroSelection = true,
  size = "default",
  className,
}: UniversalImageUploadProps) {
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [editingImage, setEditingImage] = useState<{ index: number; url: string } | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Normalize value to array for easier handling
  const images = Array.isArray(value) ? value : value ? [value] : [];
  const isSingle = mode === "single";

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;

    const urls = urlInput
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith("http"));

    if (urls.length > 0) {
      if (isSingle) {
        onChange(urls[0]);
      } else {
        const newImages = [...images, ...urls].slice(0, maxImages);
        onChange(newImages);
      }
      setUrlInput("");
      setShowUrlDialog(false);
    }
  };

  const removeImage = (index: number) => {
    if (isSingle) {
      onChange("");
    } else {
      const newImages = images.filter((_, i) => i !== index);
      onChange(newImages);
      
      // Adjust hero index if needed
      if (heroIndex >= newImages.length) {
        setHeroIndex(Math.max(0, newImages.length - 1));
      }
    }
  };

  const setAsHero = (index: number) => {
    if (isSingle || !heroSelection) return;
    
    // Move selected image to first position
    const newImages = [...images];
    const [heroImage] = newImages.splice(index, 1);
    newImages.unshift(heroImage);
    onChange(newImages);
    setHeroIndex(0);
  };

  const handleEditImage = (index: number) => {
    setEditingImage({ index, url: images[index] });
  };

  const handleSaveEdit = (editedImageUrl: string) => {
    if (editingImage === null) return;
    
    if (isSingle) {
      onChange(editedImageUrl);
    } else {
      const newImages = [...images];
      newImages[editingImage.index] = editedImageUrl;
      onChange(newImages);
    }
    setEditingImage(null);
  };

  const canAddMore = isSingle ? images.length === 0 : images.length < maxImages;
  
  // Determine aspect ratio for editor
  const editorAspectRatio = 
    aspectRatio === "square" ? 1 : 
    aspectRatio === "wide" ? 16 / 9 : 
    4 / 3;

  const aspectRatioClass = 
    aspectRatio === "square" ? "aspect-square" : 
    aspectRatio === "wide" ? "aspect-[16/9]" : 
    "aspect-auto";

  // Upload handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/objects/upload-file', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const uploadData = await uploadResponse.json() as { objectPath: string };
        const imageUrl = `/objects/${uploadData.objectPath.replace(/^\/+/, '')}`;
        uploadedUrls.push(imageUrl);
      }

      if (isSingle) {
        onChange(uploadedUrls[0]);
      } else {
        const newImages = [...images, ...uploadedUrls].slice(0, maxImages);
        onChange(newImages);
      }
      
      toast({
        title: "Success",
        description: `Uploaded ${uploadedUrls.length} ${uploadedUrls.length === 1 ? 'image' : 'images'}`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [images, isSingle, maxImages, onChange, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: isSingle ? 1 : maxImages - images.length,
    disabled: uploading || !canAddMore,
    noClick: false,
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Label className="text-base font-semibold">
          {label} {!isSingle && `(${images.length}/${maxImages})`}
        </Label>
        {allowUrl && canAddMore && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUrlDialog(true)}
            data-testid="button-add-url"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Add URL
          </Button>
        )}
      </div>

      {/* URL Input Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isSingle ? "Add Image URL" : "Add Image URLs"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {isSingle 
                  ? "Enter image URL" 
                  : "Enter image URLs (one per line or comma-separated)"}
              </Label>
              {isSingle ? (
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  data-testid="input-single-url"
                />
              ) : (
                <textarea
                  placeholder={`https://example.com/image1.jpg\nhttps://example.com/image2.jpg`}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="textarea-multiple-urls"
                />
              )}
            </div>
            <Button onClick={handleUrlAdd} className="w-full" data-testid="button-confirm-url">
              Add {isSingle ? "URL" : `${urlInput.split(/[\n,]/).filter(u => u.trim().startsWith("http")).length} URLs`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Image Grid with Upload Card */}
      <div className={cn(
        "grid gap-3",
        isSingle ? "grid-cols-1 max-w-md" : 
        size === "compact" ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6" :
        "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      )}>
        {/* Existing Images */}
        {images.map((imageUrl, index) => (
          <Card
            key={index}
            className={cn(
              "relative group overflow-hidden hover-elevate",
              heroSelection && index === heroIndex && "ring-2 ring-primary"
            )}
          >
            {/* Hero badge */}
            {heroSelection && !isSingle && index === heroIndex && (
              <div className="absolute z-10 top-1.5 left-1.5">
                <div className={cn(
                  "bg-primary text-primary-foreground rounded-md font-semibold flex items-center gap-1",
                  size === "compact" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
                )}>
                  <Star className={cn("fill-current", size === "compact" ? "h-2.5 w-2.5" : "h-3 w-3")} />
                  Hero
                </div>
              </div>
            )}

            {/* Image preview */}
            <div className={cn("bg-muted", aspectRatioClass)}>
              {imageUrl && !imageErrors.has(index) ? (
                <img
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setImageErrors(prev => new Set(Array.from(prev).concat(index)));
                  }}
                  onLoad={() => {
                    setImageErrors(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(index);
                      return newSet;
                    });
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <ImageOff className="h-6 w-6 text-destructive" />
                  <p className="text-xs text-muted-foreground px-2 text-center">Failed to load</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {heroSelection && !isSingle && index !== heroIndex && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className={cn(size === "compact" ? "h-6 w-6" : "h-7 w-7")}
                  onClick={() => setAsHero(index)}
                  title="Set as hero"
                  data-testid={`button-set-hero-${index}`}
                >
                  <Star className={cn(size === "compact" ? "h-3 w-3" : "h-3.5 w-3.5")} />
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className={cn(size === "compact" ? "h-6 w-6" : "h-7 w-7")}
                onClick={() => handleEditImage(index)}
                title="Edit"
                data-testid={`button-edit-image-${index}`}
              >
                <Pencil className={cn(size === "compact" ? "h-3 w-3" : "h-3.5 w-3.5")} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className={cn(size === "compact" ? "h-6 w-6" : "h-7 w-7")}
                onClick={() => removeImage(index)}
                title="Remove"
                data-testid={`button-remove-image-${index}`}
              >
                <X className={cn(size === "compact" ? "h-3 w-3" : "h-3.5 w-3.5")} />
              </Button>
            </div>
          </Card>
        ))}

        {/* Add Image Card */}
        {allowUpload && canAddMore && (
          <Card
            {...getRootProps()}
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all border-2 border-dashed",
              isDragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
              uploading && "opacity-50 cursor-not-allowed"
            )}
            data-testid="dropzone-card"
          >
            <input {...getInputProps()} data-testid="input-file-upload" />
            <div className={cn("flex flex-col items-center justify-center gap-2", aspectRatioClass)}>
              {uploading ? (
                <>
                  <Upload className={cn("animate-pulse text-muted-foreground", size === "compact" ? "h-6 w-6" : "h-8 w-8")} />
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                </>
              ) : isDragActive ? (
                <>
                  <Upload className={cn("text-primary", size === "compact" ? "h-6 w-6" : "h-8 w-8")} />
                  <p className="text-xs text-primary font-medium">Drop here</p>
                </>
              ) : (
                <>
                  <div className={cn(
                    "rounded-full bg-muted flex items-center justify-center",
                    size === "compact" ? "h-10 w-10" : "h-12 w-12"
                  )}>
                    <Plus className={cn("text-muted-foreground", size === "compact" ? "h-5 w-5" : "h-6 w-6")} />
                  </div>
                  <p className={cn("font-medium text-muted-foreground", size === "compact" ? "text-xs" : "text-sm")}>
                    Add Image
                  </p>
                  {size !== "compact" && (
                    <p className="text-xs text-muted-foreground px-2 text-center">
                      Drag or click
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Helper text */}
      {heroSelection && !isSingle && images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          First image is your hero. Click <Star className="h-3 w-3 inline" /> to change.
        </p>
      )}

      {/* Image Editor */}
      {editingImage && (
        <ImageEditor
          imageUrl={editingImage.url}
          isOpen={true}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveEdit}
          aspectRatio={editorAspectRatio}
        />
      )}
    </div>
  );
}
