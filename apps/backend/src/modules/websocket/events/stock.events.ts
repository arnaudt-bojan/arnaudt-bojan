export interface StockLowEvent {
  productId: string;
  sellerId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  timestamp: Date;
}

export interface StockOutEvent {
  productId: string;
  sellerId: string;
  productName: string;
  timestamp: Date;
}

export interface StockRestockedEvent {
  productId: string;
  sellerId: string;
  productName: string;
  newStock: number;
  timestamp: Date;
}
