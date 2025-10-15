import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UniversalImageUpload } from "@/components/universal-image-upload";
import { Plus, X, Ruler, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SizeVariant {
  size: string;
  stock: number;
  sku?: string;
}

export interface ColorVariant {
  colorName: string;
  colorHex: string;
  images: string[];
  sizes: SizeVariant[];
}

interface SimpleVariantManagerProps {
  // For size-only mode
  sizes?: SizeVariant[];
  onSizesChange?: (sizes: SizeVariant[]) => void;
  // For color mode
  hasColors: boolean;
  onHasColorsChange: (hasColors: boolean) => void;
  colors?: ColorVariant[];
  onColorsChange?: (colors: ColorVariant[]) => void;
  // Main product images to pre-populate first color
  mainProductImages?: string[];
}

export function SimpleVariantManager({
  sizes = [],
  onSizesChange,
  hasColors,
  onHasColorsChange,
  colors = [],
  onColorsChange,
  mainProductImages = [],
}: SimpleVariantManagerProps) {
  const [showColorDialog, setShowColorDialog] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newColorImages, setNewColorImages] = useState<string[]>([]);

  // Size-only mode handlers
  const addSize = () => {
    if (onSizesChange) {
      onSizesChange([...sizes, { size: "", stock: 0, sku: "" }]);
    }
  };

  const updateSize = (index: number, field: "size" | "stock" | "sku", value: string | number) => {
    if (onSizesChange) {
      const updated = [...sizes];
      if (field === "size") {
        updated[index].size = value as string;
      } else if (field === "stock") {
        updated[index].stock = value as number;
      } else if (field === "sku") {
        updated[index].sku = value as string;
      }
      onSizesChange(updated);
    }
  };

  const removeSize = (index: number) => {
    if (onSizesChange) {
      onSizesChange(sizes.filter((_, i) => i !== index));
    }
  };

  // Color mode handlers
  const openAddColorDialog = () => {
    setEditingColorIndex(null);
    setNewColorName("");
    setNewColorHex("#000000");
    
    // Pre-populate with main product images for first color
    if (colors.length === 0 && mainProductImages.length > 0) {
      setNewColorImages([...mainProductImages]);
    } else {
      setNewColorImages([]);
    }
    
    setShowColorDialog(true);
  };

  const openEditColorDialog = (index: number) => {
    const color = colors[index];
    setEditingColorIndex(index);
    setNewColorName(color.colorName);
    setNewColorHex(color.colorHex);
    setNewColorImages(color.images);
    setShowColorDialog(true);
  };

  const saveColorVariant = () => {
    if (!newColorName.trim() || !onColorsChange) return;

    const colorVariant: ColorVariant = {
      colorName: newColorName.trim(),
      colorHex: newColorHex,
      images: newColorImages,
      sizes: editingColorIndex !== null ? colors[editingColorIndex].sizes : [],
    };

    if (editingColorIndex !== null) {
      const updated = [...colors];
      updated[editingColorIndex] = colorVariant;
      onColorsChange(updated);
    } else {
      onColorsChange([...colors, colorVariant]);
    }

    setShowColorDialog(false);
  };

  const removeColorVariant = (index: number) => {
    if (onColorsChange) {
      onColorsChange(colors.filter((_, i) => i !== index));
    }
  };

  const addSizeToColor = (colorIndex: number) => {
    if (onColorsChange) {
      const updated = [...colors];
      updated[colorIndex].sizes.push({ size: "", stock: 0, sku: "" });
      onColorsChange(updated);
    }
  };

  const updateColorSize = (
    colorIndex: number,
    sizeIndex: number,
    field: "size" | "stock" | "sku",
    value: string | number
  ) => {
    if (onColorsChange) {
      const updated = [...colors];
      if (field === "size") {
        updated[colorIndex].sizes[sizeIndex].size = value as string;
      } else if (field === "stock") {
        updated[colorIndex].sizes[sizeIndex].stock = value as number;
      } else if (field === "sku") {
        updated[colorIndex].sizes[sizeIndex].sku = value as string;
      }
      onColorsChange(updated);
    }
  };

  const removeSizeFromColor = (colorIndex: number, sizeIndex: number) => {
    if (onColorsChange) {
      const updated = [...colors];
      updated[colorIndex].sizes.splice(sizeIndex, 1);
      onColorsChange(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Color toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">Product has multiple colors</Label>
          <p className="text-sm text-muted-foreground">
            Enable if this product comes in different colors with separate images
          </p>
        </div>
        <Switch
          checked={hasColors}
          onCheckedChange={onHasColorsChange}
          data-testid="switch-enable-colors"
        />
      </div>

      {/* Size-only mode */}
      {!hasColors && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Size Variants</Label>
              <p className="text-sm text-muted-foreground">Add sizes for this product</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSize} data-testid="button-add-size">
              <Plus className="h-4 w-4 mr-2" />
              Add Size
            </Button>
          </div>

          {sizes.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <div className="bg-muted/30 rounded-full p-3 w-fit mx-auto mb-3">
                <Ruler className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No sizes added yet</p>
              <Button type="button" variant="outline" size="sm" onClick={addSize} data-testid="button-add-first-size">
                <Plus className="h-4 w-4 mr-2" />
                Add First Size
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sizes.map((sizeVariant, index) => (
                <Card key={index} className="p-4">
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Size</Label>
                        <Input
                          placeholder="e.g., S, M, L, XL"
                          value={sizeVariant.size}
                          onChange={(e) => updateSize(index, "size", e.target.value)}
                          data-testid={`input-size-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Stock</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={sizeVariant.stock || ""}
                          onChange={(e) => updateSize(index, "stock", parseInt(e.target.value) || 0)}
                          data-testid={`input-stock-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">SKU (Optional)</Label>
                        <Input
                          placeholder="Leave blank to auto-generate"
                          value={sizeVariant.sku || ""}
                          onChange={(e) => updateSize(index, "sku", e.target.value)}
                          data-testid={`input-sku-${index}`}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSize(index)}
                      data-testid={`button-remove-size-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Color mode */}
      {hasColors && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Color Variants</Label>
              <p className="text-sm text-muted-foreground">Add colors with optional images and sizes</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddColorDialog}
              data-testid="button-add-color"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Color
            </Button>
          </div>

          {colors.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <div className="bg-muted/30 rounded-full p-3 w-fit mx-auto mb-3">
                <Palette className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No colors added yet</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddColorDialog}
                data-testid="button-add-first-color"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Color
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {colors.map((color, colorIndex) => (
                <Card key={colorIndex} className="p-6 space-y-4">
                  {/* Color header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded border-2"
                        style={{ backgroundColor: color.colorHex }}
                      />
                      <div>
                        <h4 className="font-medium">{color.colorName}</h4>
                        <p className="text-xs text-muted-foreground">{color.colorHex}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditColorDialog(colorIndex)}
                        data-testid={`button-edit-color-${colorIndex}`}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeColorVariant(colorIndex)}
                        data-testid={`button-remove-color-${colorIndex}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Color images */}
                  {color.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {color.images.map((img, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={img}
                          alt={`${color.colorName} ${imgIndex + 1}`}
                          className="w-16 h-16 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}

                  {/* Sizes for this color */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Sizes for {color.colorName}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSizeToColor(colorIndex)}
                        data-testid={`button-add-size-color-${colorIndex}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Size
                      </Button>
                    </div>

                    {color.sizes.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No sizes added for this color</p>
                    ) : (
                      <div className="space-y-2">
                        {color.sizes.map((sizeVariant, sizeIndex) => (
                          <div key={sizeIndex} className="flex gap-3 items-center">
                            <div className="flex-1 grid grid-cols-3 gap-3">
                              <Input
                                placeholder="Size (e.g., S, M, L)"
                                value={sizeVariant.size}
                                onChange={(e) =>
                                  updateColorSize(colorIndex, sizeIndex, "size", e.target.value)
                                }
                                data-testid={`input-color-size-${colorIndex}-${sizeIndex}`}
                              />
                              <Input
                                type="number"
                                min="0"
                                placeholder="Stock"
                                value={sizeVariant.stock || ""}
                                onChange={(e) =>
                                  updateColorSize(colorIndex, sizeIndex, "stock", parseInt(e.target.value) || 0)
                                }
                                data-testid={`input-color-stock-${colorIndex}-${sizeIndex}`}
                              />
                              <Input
                                placeholder="SKU (Optional)"
                                value={sizeVariant.sku || ""}
                                onChange={(e) =>
                                  updateColorSize(colorIndex, sizeIndex, "sku", e.target.value)
                                }
                                data-testid={`input-color-sku-${colorIndex}-${sizeIndex}`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSizeFromColor(colorIndex, sizeIndex)}
                              data-testid={`button-remove-color-size-${colorIndex}-${sizeIndex}`}
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
            </div>
          )}
        </div>
      )}

      {/* Color dialog */}
      <Dialog open={showColorDialog} onOpenChange={setShowColorDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingColorIndex !== null ? "Edit" : "Add"} Color</DialogTitle>
            <DialogDescription>
              {editingColorIndex === null && colors.length === 0
                ? "First color will use your main product images (you can delete them if needed)"
                : "Define the color name, hex code, and optional images"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color Name</Label>
                <Input
                  placeholder="e.g., Black, Navy Blue"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  data-testid="input-color-name"
                />
              </div>
              <div>
                <Label>Color Hex</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-16 h-9 p-1"
                    data-testid="input-color-hex-picker"
                  />
                  <Input
                    placeholder="#000000"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    data-testid="input-color-hex-text"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Images (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {editingColorIndex === null && colors.length === 0
                  ? "Pre-populated with main product images - delete any you don't want"
                  : "Upload images specific to this color"}
              </p>
              <UniversalImageUpload
                value={newColorImages}
                onChange={(value) => setNewColorImages(Array.isArray(value) ? value : [value])}
                maxImages={5}
                mode="multiple"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowColorDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveColorVariant} data-testid="button-save-color">
              {editingColorIndex !== null ? "Save Changes" : "Add Color"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
