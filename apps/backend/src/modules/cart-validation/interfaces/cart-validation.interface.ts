export interface CartItemValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stockAvailable: boolean;
  moqMet: boolean;
}

export interface StockAvailability {
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
  availableQuantity: number;
}

export interface MOQValidation {
  met: boolean;
  minimumQuantity: number;
  currentQuantity: number;
  remaining: number;
}

export interface CartValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  items: CartItemValidation[];
  totalItems: number;
  allItemsInStock: boolean;
  allMOQsMet: boolean;
}

export interface WholesaleCartValidation extends CartValidation {
  wholesaleRulesMet: boolean;
  depositRequired: number;
  minimumOrderValue: number;
  currentOrderValue: number;
}
