export interface ProductCreatedEvent {
  productId: string;
  sellerId: string;
  name: string;
  price: string;
  stock: number;
  timestamp: Date;
}

export interface ProductUpdatedEvent {
  productId: string;
  sellerId: string;
  changes: {
    name?: string;
    price?: string;
    stock?: number;
    status?: string;
  };
  timestamp: Date;
}

export interface ProductDeletedEvent {
  productId: string;
  sellerId: string;
  timestamp: Date;
}

export interface ProductStockChangedEvent {
  productId: string;
  sellerId: string;
  oldStock: number;
  newStock: number;
  timestamp: Date;
}

export interface ProductPriceChangedEvent {
  productId: string;
  sellerId: string;
  oldPrice: string;
  newPrice: string;
  timestamp: Date;
}

export interface ProductLowStockEvent {
  productId: string;
  sellerId: string;
  name: string;
  currentStock: number;
  threshold: number;
  timestamp: Date;
}
