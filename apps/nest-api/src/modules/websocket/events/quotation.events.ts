export interface QuotationCreatedEvent {
  quotationId: string;
  sellerId: string;
  quotationNumber: string;
  buyerEmail: string;
  total: string;
  timestamp: Date;
}

export interface QuotationUpdatedEvent {
  quotationId: string;
  sellerId: string;
  quotationNumber: string;
  changes: {
    items?: boolean;
    pricing?: boolean;
    terms?: boolean;
  };
  timestamp: Date;
}

export interface QuotationSentEvent {
  quotationId: string;
  sellerId: string;
  buyerId?: string;
  buyerEmail: string;
  quotationNumber: string;
  timestamp: Date;
}

export interface QuotationViewedEvent {
  quotationId: string;
  sellerId: string;
  quotationNumber: string;
  viewedBy: string;
  timestamp: Date;
}

export interface QuotationAcceptedEvent {
  quotationId: string;
  sellerId: string;
  buyerId: string;
  quotationNumber: string;
  total: string;
  timestamp: Date;
}

export interface QuotationRejectedEvent {
  quotationId: string;
  sellerId: string;
  buyerId: string;
  quotationNumber: string;
  reason?: string;
  timestamp: Date;
}

export interface QuotationExpiredEvent {
  quotationId: string;
  sellerId: string;
  buyerId?: string;
  quotationNumber: string;
  timestamp: Date;
}
