import { Badge } from "@/components/ui/badge";
import type { ProductType } from "@shared/schema";

interface ProductTypeBadgeProps {
  type: ProductType;
}

export function ProductTypeBadge({ type }: ProductTypeBadgeProps) {
  const getVariant = (productType: ProductType) => {
    switch (productType) {
      case "in-stock":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "pre-order":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "made-to-order":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
      case "wholesale":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getLabel = (productType: ProductType) => {
    switch (productType) {
      case "in-stock":
        return "In Stock";
      case "pre-order":
        return "Pre-Order";
      case "made-to-order":
        return "Made to Order";
      case "wholesale":
        return "Trade";
      default:
        return productType;
    }
  };

  return (
    <Badge
      className={`${getVariant(type)} border no-default-hover-elevate no-default-active-elevate`}
      data-testid={`badge-product-type-${type}`}
    >
      {getLabel(type)}
    </Badge>
  );
}
