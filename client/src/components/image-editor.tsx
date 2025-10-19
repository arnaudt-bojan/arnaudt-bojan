import { useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crop, Sparkles, RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";

interface ImageEditorProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedImageUrl: string) => void;
  aspectRatio?: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Filters {
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  grayscale: number;
  sepia: number;
}

export function ImageEditor({ imageUrl, isOpen, onClose, onSave, aspectRatio = 4 / 3 }: ImageEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback((croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: CropArea,
    rotation: number,
    flipH: boolean,
    flipV: boolean,
    filters: Filters
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const rotRad = (rotation * Math.PI) / 180;

    // Calculate bounding box of the rotated image
    const bBoxWidth = Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
    const bBoxHeight = Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

    // Set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Apply filters
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`;

    // Draw rotated image
    ctx.drawImage(image, 0, 0);

    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement("canvas");
    const croppedCtx = croppedCanvas.getContext("2d");

    if (!croppedCtx) {
      throw new Error("No 2d context for cropped canvas");
    }

    // Set the size of the cropped canvas
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    // Draw the cropped image onto the new canvas
    croppedCtx.drawImage(
      canvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return croppedCanvas.toDataURL("image/jpeg", 0.95);
  };

  const handleSave = async () => {
    console.log('[ImageEditor] handleSave called', { 
      imageUrl, 
      croppedAreaPixels, 
      hasTransformations: rotation !== 0 || flipHorizontal || flipVertical 
    });
    setIsSaving(true);
    try {
      // Check if any transformations were made
      const hasTransformations = 
        rotation !== 0 || 
        flipHorizontal || 
        flipVertical ||
        filters.brightness !== 100 ||
        filters.contrast !== 100 ||
        filters.saturate !== 100 ||
        filters.blur !== 0 ||
        filters.grayscale !== 0 ||
        filters.sepia !== 0;

      // If no crop area and no transformations, just return original image
      if (!croppedAreaPixels && !hasTransformations) {
        console.log('[ImageEditor] No edits made, saving original URL:', imageUrl);
        onSave(imageUrl);
        onClose();
        return;
      }

      // If we have a crop area or transformations, process the image
      if (croppedAreaPixels) {
        console.log('[ImageEditor] Processing image with crop/transforms');
        const croppedImage = await getCroppedImg(
          imageUrl,
          croppedAreaPixels,
          rotation,
          flipHorizontal,
          flipVertical,
          filters
        );
        console.log('[ImageEditor] Cropped image created, length:', croppedImage.length);
        onSave(croppedImage);
        onClose();
      } else {
        // No crop area but has transformations - save original
        console.log('[ImageEditor] Has transformations but no crop, saving original URL');
        onSave(imageUrl);
        onClose();
      }
    } catch (e) {
      console.error("Error processing image:", e);
      // On error, still save the original image and close
      console.log('[ImageEditor] Error occurred, saving original URL as fallback');
      onSave(imageUrl);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturate: 100,
      blur: 0,
      grayscale: 0,
      sepia: 0,
    });
  };

  const resetAll = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    resetFilters();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-image-editor">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="crop" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crop" data-testid="tab-crop">
              <Crop className="h-4 w-4 mr-2" />
              Crop & Transform
            </TabsTrigger>
            <TabsTrigger value="filters" data-testid="tab-filters">
              <Sparkles className="h-4 w-4 mr-2" />
              Filters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crop" className="flex-1 flex flex-col mt-4 space-y-4 overflow-hidden">
            <div className="relative h-[400px] bg-muted/30 rounded-lg overflow-hidden">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                transform={`translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${flipHorizontal ? -1 : 1}, ${flipVertical ? -1 : 1})`}
                style={{
                  containerStyle: {
                    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`,
                  },
                }}
              />
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[200px]">
              <div className="space-y-2">
                <Label>Zoom: {zoom.toFixed(1)}x</Label>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  min={0.5}
                  max={3}
                  step={0.1}
                  data-testid="slider-zoom"
                />
              </div>

              <div className="space-y-2">
                <Label>Rotation: {rotation}°</Label>
                <Slider
                  value={[rotation]}
                  onValueChange={(value) => setRotation(value[0])}
                  min={0}
                  max={360}
                  step={1}
                  data-testid="slider-rotation"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFlipHorizontal(!flipHorizontal)}
                  data-testid="button-flip-horizontal"
                >
                  <FlipHorizontal className="h-4 w-4 mr-2" />
                  Flip H
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFlipVertical(!flipVertical)}
                  data-testid="button-flip-vertical"
                >
                  <FlipVertical className="h-4 w-4 mr-2" />
                  Flip V
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((rotation + 90) % 360)}
                  data-testid="button-rotate-90"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rotate 90°
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="filters" className="flex-1 flex flex-col mt-4 space-y-4 overflow-hidden">
            <div className="relative h-[400px] bg-muted/30 rounded-lg overflow-hidden">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: {
                    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`,
                  },
                }}
              />
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[200px]">
              <div className="space-y-2">
                <Label>Brightness: {filters.brightness}%</Label>
                <Slider
                  value={[filters.brightness]}
                  onValueChange={(value) => setFilters({ ...filters, brightness: value[0] })}
                  min={0}
                  max={200}
                  step={1}
                  data-testid="slider-brightness"
                />
              </div>

              <div className="space-y-2">
                <Label>Contrast: {filters.contrast}%</Label>
                <Slider
                  value={[filters.contrast]}
                  onValueChange={(value) => setFilters({ ...filters, contrast: value[0] })}
                  min={0}
                  max={200}
                  step={1}
                  data-testid="slider-contrast"
                />
              </div>

              <div className="space-y-2">
                <Label>Saturation: {filters.saturate}%</Label>
                <Slider
                  value={[filters.saturate]}
                  onValueChange={(value) => setFilters({ ...filters, saturate: value[0] })}
                  min={0}
                  max={200}
                  step={1}
                  data-testid="slider-saturation"
                />
              </div>

              <div className="space-y-2">
                <Label>Blur: {filters.blur}px</Label>
                <Slider
                  value={[filters.blur]}
                  onValueChange={(value) => setFilters({ ...filters, blur: value[0] })}
                  min={0}
                  max={10}
                  step={0.1}
                  data-testid="slider-blur"
                />
              </div>

              <div className="space-y-2">
                <Label>Grayscale: {filters.grayscale}%</Label>
                <Slider
                  value={[filters.grayscale]}
                  onValueChange={(value) => setFilters({ ...filters, grayscale: value[0] })}
                  min={0}
                  max={100}
                  step={1}
                  data-testid="slider-grayscale"
                />
              </div>

              <div className="space-y-2">
                <Label>Sepia: {filters.sepia}%</Label>
                <Slider
                  value={[filters.sepia]}
                  onValueChange={(value) => setFilters({ ...filters, sepia: value[0] })}
                  min={0}
                  max={100}
                  step={1}
                  data-testid="slider-sepia"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="w-full"
                data-testid="button-reset-filters"
              >
                Reset Filters
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={resetAll} className="w-full sm:w-auto" data-testid="button-reset-all">
            Reset All
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto" data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto" data-testid="button-save-edited">
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
