export interface WholesaleInvitationSentEvent {
  invitationId: string;
  sellerId: string;
  buyerEmail: string;
  buyerName?: string;
  timestamp: Date;
}

export interface WholesaleInvitationAcceptedEvent {
  invitationId: string;
  sellerId: string;
  buyerId: string;
  buyerEmail: string;
  timestamp: Date;
}

export interface WholesaleInvitationRejectedEvent {
  invitationId: string;
  sellerId: string;
  buyerEmail: string;
  timestamp: Date;
}

export interface WholesaleOrderPlacedEvent {
  orderId: string;
  sellerId: string;
  buyerId: string;
  total: string;
  depositAmount: string;
  balanceAmount: string;
  paymentTerms: string;
  timestamp: Date;
}

export interface WholesaleOrderUpdatedEvent {
  orderId: string;
  sellerId: string;
  buyerId: string;
  status: string;
  timestamp: Date;
}

export interface WholesaleDepositPaidEvent {
  orderId: string;
  sellerId: string;
  buyerId: string;
  amount: string;
  timestamp: Date;
}

export interface WholesaleBalancePaidEvent {
  orderId: string;
  sellerId: string;
  buyerId: string;
  amount: string;
  timestamp: Date;
}

export interface WholesaleOrderShippedEvent {
  orderId: string;
  buyerId: string;
  trackingNumber?: string;
  carrier?: string;
  timestamp: Date;
}
