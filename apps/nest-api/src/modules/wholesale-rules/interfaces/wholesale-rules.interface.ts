export interface DepositCalculation {
  orderValue: number;
  depositPercentage: number;
  depositAmount: number;
  balanceAmount: number;
}

export interface BalanceCalculation {
  orderValue: number;
  depositPaid: number;
  balanceRemaining: number;
  balancePercentage: number;
}

export interface MOQValidationResult {
  valid: boolean;
  errors: string[];
  itemsFailingMOQ: {
    productId: string;
    productName: string;
    requiredQuantity: number;
    providedQuantity: number;
  }[];
}

export interface PaymentTermsValidation {
  valid: boolean;
  allowedTerms: string[];
  requestedTerm: string;
  error?: string;
}

export interface MinimumValueValidation {
  met: boolean;
  minimumValue: number;
  currentValue: number;
  shortfall: number;
}

export interface WholesalePricing {
  productId: string;
  basePrice: number;
  wholesalePrice: number;
  discount: number;
  quantity: number;
  total: number;
}

export interface WholesaleOrderValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  moqValidation: MOQValidationResult;
  paymentTermsValidation: PaymentTermsValidation;
  minimumValueValidation: MinimumValueValidation;
  depositCalculation: DepositCalculation;
  totalValue: number;
}

export interface WholesaleOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
}
