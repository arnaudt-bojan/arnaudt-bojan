export interface OrderPresentation {
  statusLabel: string;
  statusColor: string;
  fulfillmentLabel: string;
  fulfillmentColor: string;
  nextStatuses: string[];
  canCancel: boolean;
  canRefund: boolean;
  canFulfill: boolean;
}
