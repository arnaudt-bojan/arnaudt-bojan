export interface ProductPresentation {
  availabilityText: string;
  badges: string[];
  stockLevelIndicator: string;
  availableForPurchase: boolean;
  isPreOrder: boolean;
  isMadeToOrder: boolean;
  isWholesale: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
}
