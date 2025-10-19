export interface CartTotals {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

export interface WholesaleItem {
  price: number;
  quantity: number;
}

export interface QuotationLineItem {
  id: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface RefundLineItem {
  lineItemId: string;
  amount: number;
  reason?: string;
}

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
}

export interface ExchangeRateResponse {
  date: string;
  [currency: string]: any;
}
