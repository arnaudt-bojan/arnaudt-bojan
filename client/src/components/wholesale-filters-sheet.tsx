import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SlidersHorizontal, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/contexts/CurrencyContext";

export interface WholesaleFilterOptions {
  categoryL1: string[];
  categoryL2: string[];
  categoryL3: string[];
  priceRange: [number, number];
  moqRange: [number, number];
  requiresDeposit: boolean | null;
  inStock: boolean;
  paymentTerms: string[];
  readinessType: string[];
  sortBy: string;
}

interface WholesaleFiltersSheetProps {
  onFilterChange: (filters: WholesaleFilterOptions) => void;
  maxPrice?: number;
  maxMoq?: number;
  availableCategories?: {
    level1: string[];
    level2: string[];
    level3: string[];
  };
  availablePaymentTerms?: string[];
  availableReadinessTypes?: string[];
}

const DEFAULT_FILTERS: WholesaleFilterOptions = {
  categoryL1: [],
  categoryL2: [],
  categoryL3: [],
  priceRange: [0, 100000],
  moqRange: [0, 10000],
  requiresDeposit: null,
  inStock: false,
  paymentTerms: [],
  readinessType: [],
  sortBy: "newest",
};

export function WholesaleFiltersSheet({
  onFilterChange,
  maxPrice = 100000,
  maxMoq = 10000,
  availableCategories = { level1: [], level2: [], level3: [] },
  availablePaymentTerms = [],
  availableReadinessTypes = [],
}: WholesaleFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<WholesaleFilterOptions>(DEFAULT_FILTERS);
  const { formatPrice } = useCurrency();

  const handleReset = () => {
    const resetFilters: WholesaleFilterOptions = {
      ...DEFAULT_FILTERS,
      priceRange: [0, maxPrice] as [number, number],
      moqRange: [0, maxMoq] as [number, number],
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const handleApply = () => {
    onFilterChange(filters);
    setOpen(false);
  };

  const toggleCategory = (level: 'level1' | 'level2' | 'level3', category: string) => {
    const key = level === 'level1' ? 'categoryL1' : level === 'level2' ? 'categoryL2' : 'categoryL3';
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(category)
        ? prev[key].filter(c => c !== category)
        : [...prev[key], category]
    }));
  };

  const togglePaymentTerm = (term: string) => {
    setFilters(prev => ({
      ...prev,
      paymentTerms: prev.paymentTerms.includes(term)
        ? prev.paymentTerms.filter(t => t !== term)
        : [...prev.paymentTerms, term]
    }));
  };

  const toggleReadinessType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      readinessType: prev.readinessType.includes(type)
        ? prev.readinessType.filter(t => t !== type)
        : [...prev.readinessType, type]
    }));
  };

  const activeFiltersCount = 
    filters.categoryL1.length +
    filters.categoryL2.length +
    filters.categoryL3.length +
    filters.paymentTerms.length +
    filters.readinessType.length +
    (filters.requiresDeposit !== null ? 1 : 0) +
    (filters.inStock ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-open-filters">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filter Wholesale Products</SheetTitle>
          <SheetDescription>
            Refine your search with smart B2B filters
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
          <div className="space-y-6">
            {/* Sort By */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Sort By</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={filters.sortBy === "newest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, sortBy: "newest" })}
                  data-testid="sort-newest"
                >
                  Newest
                </Button>
                <Button
                  variant={filters.sortBy === "price-low" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, sortBy: "price-low" })}
                  data-testid="sort-price-low"
                >
                  Price: Low
                </Button>
                <Button
                  variant={filters.sortBy === "price-high" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, sortBy: "price-high" })}
                  data-testid="sort-price-high"
                >
                  Price: High
                </Button>
                <Button
                  variant={filters.sortBy === "moq-low" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, sortBy: "moq-low" })}
                  data-testid="sort-moq-low"
                >
                  MOQ: Low
                </Button>
                <Button
                  variant={filters.sortBy === "moq-high" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, sortBy: "moq-high" })}
                  data-testid="sort-moq-high"
                >
                  MOQ: High
                </Button>
                <Button
                  variant={filters.sortBy === "margin-high" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, sortBy: "margin-high" })}
                  data-testid="sort-margin-high"
                >
                  Margin %
                </Button>
              </div>
            </div>

            <Separator />

            {/* Category Level 1 */}
            {availableCategories.level1.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Category (Level 1)</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.level1.map((category) => (
                      <Badge
                        key={category}
                        variant={filters.categoryL1.includes(category) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleCategory('level1', category)}
                        data-testid={`filter-cat1-${category}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Category Level 2 */}
            {availableCategories.level2.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Category (Level 2)</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.level2.map((category) => (
                      <Badge
                        key={category}
                        variant={filters.categoryL2.includes(category) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleCategory('level2', category)}
                        data-testid={`filter-cat2-${category}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Category Level 3 */}
            {availableCategories.level3.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Category (Level 3)</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.level3.map((category) => (
                      <Badge
                        key={category}
                        variant={filters.categoryL3.includes(category) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleCategory('level3', category)}
                        data-testid={`filter-cat3-${category}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Price Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Price Range</Label>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
                </span>
              </div>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => setFilters({ ...filters, priceRange: value as [number, number] })}
                max={maxPrice}
                step={100}
                className="w-full"
                data-testid="slider-price"
              />
            </div>

            <Separator />

            {/* MOQ Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Min Order Quantity</Label>
                <span className="text-sm text-muted-foreground">
                  {filters.moqRange[0]} - {filters.moqRange[1]} units
                </span>
              </div>
              <Slider
                value={filters.moqRange}
                onValueChange={(value) => setFilters({ ...filters, moqRange: value as [number, number] })}
                max={maxMoq}
                step={10}
                className="w-full"
                data-testid="slider-moq"
              />
            </div>

            <Separator />

            {/* Deposit Required */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Deposit Required</Label>
                <p className="text-xs text-muted-foreground">Show only products requiring deposit</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filters.requiresDeposit === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, requiresDeposit: filters.requiresDeposit === true ? null : true })}
                  data-testid="filter-deposit-yes"
                >
                  Yes
                </Button>
                <Button
                  variant={filters.requiresDeposit === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, requiresDeposit: filters.requiresDeposit === false ? null : false })}
                  data-testid="filter-deposit-no"
                >
                  No
                </Button>
              </div>
            </div>

            <Separator />

            {/* In Stock Only */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Stock Availability</Label>
                <p className="text-xs text-muted-foreground">Show only products with available stock</p>
              </div>
              <Switch
                checked={filters.inStock}
                onCheckedChange={(checked) => setFilters({ ...filters, inStock: checked })}
                data-testid="switch-in-stock"
              />
            </div>

            {/* Payment Terms */}
            {availablePaymentTerms.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Payment Terms</Label>
                  <div className="flex flex-wrap gap-2">
                    {availablePaymentTerms.map((term) => (
                      <Badge
                        key={term}
                        variant={filters.paymentTerms.includes(term) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => togglePaymentTerm(term)}
                        data-testid={`filter-payment-${term}`}
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Readiness Type */}
            {availableReadinessTypes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Readiness</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableReadinessTypes.map((type) => (
                      <Badge
                        key={type}
                        variant={filters.readinessType.includes(type) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleReadinessType(type)}
                        data-testid={`filter-readiness-${type}`}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
              data-testid="button-reset-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1"
              data-testid="button-apply-filters"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
