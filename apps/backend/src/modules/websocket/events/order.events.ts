export interface OrderUpdatedEvent {
  orderId: string;
  status: string;
  sellerId: string;
  buyerId: string;
  timestamp: Date;
}

export interface OrderCreatedEvent {
  orderId: string;
  sellerId: string;
  buyerId: string;
  total: string;
  timestamp: Date;
}

export interface OrderFulfillmentEvent {
  orderId: string;
  fulfillmentStatus: string;
  trackingNumber?: string;
  carrier?: string;
  timestamp: Date;
}
