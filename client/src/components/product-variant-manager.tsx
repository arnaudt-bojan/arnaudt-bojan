import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UniversalImageUpload } from "@/components/universal-image-upload";
import { Plus, X, Palette, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColorVariant {
  colorName: string;
  colorHex: string;
  images: string[];
  sizes: { size: string; stock: number }[];
}

interface ProductVariantManagerProps {
  colorVariants: ColorVariant[];
  onChange: (variants: ColorVariant[]) => void;
}

export function ProductVariantManager({
  colorVariants,
  onChange,
}: ProductVariantManagerProps) {
  const [showColorDialog, setShowColorDialog] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newColorImages, setNewColorImages] = useState<string[]>([]);

  const openAddColorDialog = () => {
    setEditingColorIndex(null);
    setNewColorName("");
    setNewColorHex("#000000");
    setNewColorImages([]);
    setShowColorDialog(true);
  };

  const openEditColorDialog = (index: number) => {
    const variant = colorVariants[index];
    setEditingColorIndex(index);
    setNewColorName(variant.colorName);
    setNewColorHex(variant.colorHex);
    setNewColorImages(variant.images);
    setShowColorDialog(true);
  };

  const saveColorVariant = () => {
    if (!newColorName.trim()) return;

    const colorVariant: ColorVariant = {
      colorName: newColorName.trim(),
      colorHex: newColorHex,
      images: newColorImages,
      sizes: editingColorIndex !== null ? colorVariants[editingColorIndex].sizes : [],
    };

    if (editingColorIndex !== null) {
      // Edit existing
      const updated = [...colorVariants];
      updated[editingColorIndex] = colorVariant;
      onChange(updated);
    } else {
      // Add new
      onChange([...colorVariants, colorVariant]);
    }

    setShowColorDialog(false);
  };

  const removeColorVariant = (index: number) => {
    onChange(colorVariants.filter((_, i) => i !== index));
  };

  const addSize = (colorIndex: number) => {
    const updated = [...colorVariants];
    updated[colorIndex].sizes.push({ size: "", stock: 0 });
    onChange(updated);
  };

  const updateSize = (colorIndex: number, sizeIndex: number, field: "size" | "stock", value: string | number) => {
    const updated = [...colorVariants];
    if (field === "size") {
      updated[colorIndex].sizes[sizeIndex].size = value as string;
    } else {
      updated[colorIndex].sizes[sizeIndex].stock = value as number;
    }
    onChange(updated);
  };

  const removeSize = (colorIndex: number, sizeIndex: number) => {
    const updated = [...colorVariants];
    updated[colorIndex].sizes.splice(sizeIndex, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {colorVariants.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="bg-muted/30 rounded-full p-4 w-fit mx-auto mb-4">
            <Palette className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            No color variants added yet. Add colors with optional images, then specify sizes for each color.
          </p>
          <Button type="button" variant="outline" onClick={openAddColorDialog} data-testid="button-add-color-variant">
            <Plus className="h-4 w-4 mr-2" />
            Add First Color
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {colorVariants.map((colorVariant, colorIndex) => (
            <Card key={colorIndex} className="p-6 space-y-4">
              {/* Color Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full border-2 border-border"
                    style={{ backgroundColor: colorVariant.colorHex }}
                  />
                  <div>
                    <h4 className="font-semibold text-lg">{colorVariant.colorName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {colorVariant.images.length} image{colorVariant.images.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditColorDialog(colorIndex)}
                    data-testid={`button-edit-color-${colorIndex}`}
                  >
                    Edit Color
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeColorVariant(colorIndex)}
                    data-testid={`button-remove-color-${colorIndex}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Images Preview */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {colorVariant.images.map((img, imgIndex) => (
                  <img
                    key={imgIndex}
                    src={img}
                    alt={`${colorVariant.colorName} ${imgIndex + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border"
                  />
                ))}
              </div>

              {/* Sizes for this color */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <Label>Sizes for {colorVariant.colorName}</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSize(colorIndex)}
                    data-testid={`button-add-size-${colorIndex}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Size
                  </Button>
                </div>

                {colorVariant.sizes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sizes added. Click "Add Size" to add size options for this color.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {colorVariant.sizes.map((sizeVariant, sizeIndex) => (
                      <div key={sizeIndex} className="flex gap-2 items-center">
                        <Input
                          placeholder="Size (e.g., S, M, L)"
                          value={sizeVariant.size}
                          onChange={(e) => updateSize(colorIndex, sizeIndex, "size", e.target.value)}
                          data-testid={`input-size-${colorIndex}-${sizeIndex}`}
                          className="text-base flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Stock"
                          value={sizeVariant.stock === 0 ? "" : sizeVariant.stock}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateSize(colorIndex, sizeIndex, "stock", value === "" ? 0 : parseInt(value) || 0);
                          }}
                          data-testid={`input-stock-${colorIndex}-${sizeIndex}`}
                          className="text-base w-24"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSize(colorIndex, sizeIndex)}
                          data-testid={`button-remove-size-${colorIndex}-${sizeIndex}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={openAddColorDialog}
            className="w-full"
            data-testid="button-add-another-color"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Color
          </Button>
        </div>
      )}

      {/* Color Dialog */}
      <Dialog open={showColorDialog} onOpenChange={setShowColorDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingColorIndex !== null ? "Edit Color Variant" : "Add Color Variant"}
            </DialogTitle>
            <DialogDescription>
              Add a color name and optional images. If no images are added, the product's main images will be used. You can add sizes afterwards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Images first - most important */}
            <div className="space-y-2">
              <Label className="text-base">Color Images (Optional)</Label>
              <UniversalImageUpload
                value={newColorImages}
                onChange={(value) => setNewColorImages(Array.isArray(value) ? value : [value])}
                label=""
                mode="multiple"
                maxImages={10}
                aspectRatio="square"
                heroSelection={true}
                allowUrl={true}
                allowUpload={true}
              />
              <p className="text-sm text-muted-foreground">
                Upload images showing this color (optional). If not added, main product images will be shown on PDP when this color is selected.
              </p>
            </div>

            {/* Color name */}
            <div className="space-y-2">
              <Label htmlFor="color-name" className="text-base">Color Name *</Label>
              <Input
                id="color-name"
                placeholder="e.g., Ocean Blue, Forest Green, Sunset Red"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                data-testid="input-color-name"
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                Give this color a descriptive name that customers will see.
              </p>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label htmlFor="color-hex" className="text-base">Color Display</Label>
              <div className="flex gap-3 items-center">
                <input
                  id="color-hex"
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="h-12 w-12 rounded-lg border-2 cursor-pointer"
                  data-testid="input-color-hex"
                />
                <div>
                  <Input
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    placeholder="#000000"
                    className="text-base font-mono w-32"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This color will appear in the selector circle
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowColorDialog(false)}
              data-testid="button-cancel-color"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveColorVariant}
              disabled={!newColorName.trim() || newColorImages.length === 0}
              data-testid="button-save-color"
            >
              {editingColorIndex !== null ? "Update Color" : "Add Color"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
