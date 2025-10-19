export interface CartUpdatedEvent {
  cartId: string;
  userId: string;
  itemCount: number;
  subtotal: string;
  timestamp: Date;
}

export interface CartItemAddedEvent {
  cartId: string;
  userId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  timestamp: Date;
}

export interface CartItemRemovedEvent {
  cartId: string;
  userId: string;
  productId: string;
  variantId?: string;
  timestamp: Date;
}
