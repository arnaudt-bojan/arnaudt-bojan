import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Star, Link as LinkIcon, ImagePlus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageDropzone } from "@/components/image-dropzone";
import { ImageEditor } from "@/components/image-editor";

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
  className,
}: UniversalImageUploadProps) {
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [editingImage, setEditingImage] = useState<{ index: number; url: string } | null>(null);

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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
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
            {isSingle ? "Add URL" : "Paste URLs"}
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

      {/* Drag & Drop Upload Area (only when upload is enabled and can add more) */}
      {allowUpload && canAddMore && (
        <ImageDropzone
          value={value}
          onChange={onChange}
          maxFiles={maxImages}
          mode={mode}
        />
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className={cn(
          "grid gap-4",
          isSingle ? "grid-cols-1 max-w-md" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        )}>
          {images.map((imageUrl, index) => (
            <Card
              key={index}
              className={cn(
                "relative group overflow-hidden",
                heroSelection && index === heroIndex && "ring-2 ring-primary"
              )}
            >
              {/* Hero badge */}
              {heroSelection && !isSingle && index === heroIndex && (
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Hero
                  </div>
                </div>
              )}

              {/* Image preview */}
              <div className={cn("bg-muted", aspectRatioClass)}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.classList.add('hidden');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {heroSelection && !isSingle && index !== heroIndex && (
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
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => handleEditImage(index)}
                  title="Edit image"
                  data-testid={`button-edit-image-${index}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
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
              {!isSingle && (
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-xs">
                  #{index + 1}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Helper text */}
      {heroSelection && !isSingle && images.length > 0 && (
        <p className="text-sm text-muted-foreground">
          💡 The first image is your <strong>hero image</strong> (main display). Click the star to set a different image as hero.
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
