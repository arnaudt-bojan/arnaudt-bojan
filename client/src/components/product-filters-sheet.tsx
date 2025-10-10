import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SlidersHorizontal, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
}

interface FilterOptions {
  categories: string[];
  productTypes: string[];
  priceRange: [number, number];
  sizes: string[];
  colors: string[];
  sortBy: string;
}

interface ProductFiltersSheetProps {
  onFilterChange: (filters: FilterOptions) => void;
  maxPrice?: number;
}

export function ProductFiltersSheet({ 
  onFilterChange, 
  maxPrice = 1000 
}: ProductFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    productTypes: [],
    priceRange: [0, maxPrice],
    sizes: [],
    colors: [],
    sortBy: "newest",
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Group categories by level
  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2);
  const level3Categories = categories.filter(c => c.level === 3);

  const productTypes = [
    { value: "in-stock", label: "In Stock" },
    { value: "pre-order", label: "Pre-Order" },
    { value: "made-to-order", label: "Made to Order" },
    { value: "wholesale", label: "Trade" },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "name-asc", label: "Name: A-Z" },
    { value: "name-desc", label: "Name: Z-A" },
  ];

  const commonSizes = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
  const commonColors = [
    "Black", "White", "Gray", "Red", "Blue", "Green", 
    "Yellow", "Orange", "Purple", "Pink", "Brown"
  ];

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleArrayFilter = (key: keyof FilterOptions, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const clearAllFilters = () => {
    const resetFilters: FilterOptions = {
      categories: [],
      productTypes: [],
      priceRange: [0, maxPrice],
      sizes: [],
      colors: [],
      sortBy: "newest",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = 
    filters.categories.length > 0 ||
    filters.productTypes.length > 0 ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < maxPrice;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-filters">
          <SlidersHorizontal className="h-4 w-4" />
          Filters & Sort
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              •
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Filters & Sort</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-1"
                data-testid="button-clear-filters"
              >
                <X className="h-3 w-3" />
                Clear All
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-6">
          <div className="space-y-6">
            {/* Sort By */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Sort By</Label>
              <RadioGroup 
                value={filters.sortBy} 
                onValueChange={(value) => updateFilter("sortBy", value)}
              >
                {sortOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option.value} 
                      id={`sort-${option.value}`}
                      data-testid={`radio-sort-${option.value}`}
                    />
                    <Label 
                      htmlFor={`sort-${option.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Price Range */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Price Range</Label>
              <div className="flex items-center gap-4 text-sm">
                <span>${filters.priceRange[0]}</span>
                <span className="text-muted-foreground">—</span>
                <span>${filters.priceRange[1]}</span>
              </div>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
                min={0}
                max={maxPrice}
                step={10}
                data-testid="slider-price-range"
              />
            </div>

            <Separator />

            {/* Product Types */}
            <Accordion type="single" collapsible defaultValue="product-types">
              <AccordionItem value="product-types">
                <AccordionTrigger className="text-base font-semibold">
                  Product Type
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  {productTypes.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type.value}`}
                        checked={filters.productTypes.includes(type.value)}
                        onCheckedChange={() => toggleArrayFilter("productTypes", type.value)}
                        data-testid={`checkbox-type-${type.value}`}
                      />
                      <Label 
                        htmlFor={`type-${type.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Categories */}
            {level1Categories.length > 0 && (
              <>
                <Accordion type="single" collapsible defaultValue="categories">
                  <AccordionItem value="categories">
                    <AccordionTrigger className="text-base font-semibold">
                      Categories
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-3">
                      {level1Categories.map(category => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${category.id}`}
                            checked={filters.categories.includes(category.id)}
                            onCheckedChange={() => toggleArrayFilter("categories", category.id)}
                            data-testid={`checkbox-category-${category.id}`}
                          />
                          <Label 
                            htmlFor={`cat-${category.id}`}
                            className="font-normal cursor-pointer"
                          >
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <Separator />
              </>
            )}

            {/* Sizes */}
            <Accordion type="single" collapsible>
              <AccordionItem value="sizes">
                <AccordionTrigger className="text-base font-semibold">
                  Size
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  {commonSizes.map(size => (
                    <div key={size} className="flex items-center space-x-2">
                      <Checkbox
                        id={`size-${size}`}
                        checked={filters.sizes.includes(size)}
                        onCheckedChange={() => toggleArrayFilter("sizes", size)}
                        data-testid={`checkbox-size-${size}`}
                      />
                      <Label 
                        htmlFor={`size-${size}`}
                        className="font-normal cursor-pointer"
                      >
                        {size}
                      </Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Colors */}
            <Accordion type="single" collapsible>
              <AccordionItem value="colors">
                <AccordionTrigger className="text-base font-semibold">
                  Color
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  {commonColors.map(color => (
                    <div key={color} className="flex items-center space-x-2">
                      <Checkbox
                        id={`color-${color}`}
                        checked={filters.colors.includes(color)}
                        onCheckedChange={() => toggleArrayFilter("colors", color)}
                        data-testid={`checkbox-color-${color}`}
                      />
                      <Label 
                        htmlFor={`color-${color}`}
                        className="font-normal cursor-pointer"
                      >
                        {color}
                      </Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
