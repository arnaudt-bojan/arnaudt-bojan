import { Injectable } from '@nestjs/common';
import { OrderPresentation } from './interfaces/order-presentation.interface';

@Injectable()
export class OrderPresentationService {
  getOrderStatusLabel(status: string): string {
    if (!status) return 'Unknown';
    const normalizedStatus = status.toLowerCase();
    
    const labels: Record<string, string> = {
      'pending': 'Pending Payment',
      'pending_payment': 'Awaiting Payment',
      'awaiting_payment': 'Awaiting Payment',
      'deposit_paid': 'Deposit Paid',
      'awaiting_balance': 'Awaiting Balance',
      'balance_overdue': 'Balance Overdue',
      'paid': 'Paid',
      'confirmed': 'Confirmed',
      'processing': 'Processing',
      'in_production': 'In Production',
      'ready_to_ship': 'Ready to Ship',
      'shipped': 'Shipped',
      'fulfilled': 'Fulfilled',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded',
      'on_hold': 'On Hold',
    };

    return labels[normalizedStatus] || status;
  }

  getOrderStatusColor(status: string): string {
    if (!status) return 'gray';
    const normalizedStatus = status.toLowerCase();
    
    const colors: Record<string, string> = {
      'pending': 'yellow',
      'pending_payment': 'orange',
      'awaiting_payment': 'orange',
      'deposit_paid': 'blue',
      'awaiting_balance': 'orange',
      'balance_overdue': 'red',
      'paid': 'green',
      'confirmed': 'blue',
      'processing': 'blue',
      'in_production': 'purple',
      'ready_to_ship': 'purple',
      'shipped': 'purple',
      'fulfilled': 'green',
      'delivered': 'green',
      'cancelled': 'red',
      'refunded': 'gray',
      'on_hold': 'orange',
    };

    return colors[normalizedStatus] || 'gray';
  }

  getFulfillmentStatusLabel(status: string): string {
    if (!status) return 'Unknown';
    const normalizedStatus = status.toLowerCase();
    
    const labels: Record<string, string> = {
      'unfulfilled': 'Unfulfilled',
      'partially_fulfilled': 'Partially Fulfilled',
      'fulfilled': 'Fulfilled',
      'in_transit': 'In Transit',
      'delivered': 'Delivered',
    };

    return labels[normalizedStatus] || status;
  }

  getFulfillmentStatusColor(status: string): string {
    if (!status) return 'gray';
    const normalizedStatus = status.toLowerCase();
    
    const colors: Record<string, string> = {
      'unfulfilled': 'gray',
      'partially_fulfilled': 'yellow',
      'fulfilled': 'blue',
      'in_transit': 'purple',
      'delivered': 'green',
    };

    return colors[normalizedStatus] || 'gray';
  }

  getNextOrderStatuses(currentStatus: string): string[] {
    if (!currentStatus) return [];
    const normalizedStatus = currentStatus.toLowerCase();
    
    const progression: Record<string, string[]> = {
      'pending': ['awaiting_payment', 'cancelled'],
      'pending_payment': ['deposit_paid', 'paid', 'cancelled'],
      'awaiting_payment': ['deposit_paid', 'paid', 'cancelled'],
      'deposit_paid': ['awaiting_balance', 'cancelled'],
      'awaiting_balance': ['paid', 'balance_overdue', 'cancelled'],
      'balance_overdue': ['paid', 'cancelled'],
      'paid': ['processing', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['in_production', 'ready_to_ship', 'fulfilled', 'cancelled'],
      'in_production': ['ready_to_ship', 'fulfilled', 'cancelled'],
      'ready_to_ship': ['fulfilled', 'cancelled'],
      'fulfilled': ['refunded'],
      'shipped': ['delivered', 'refunded'],
      'delivered': ['refunded'],
      'cancelled': [],
      'refunded': [],
    };

    return progression[normalizedStatus] || [];
  }

  getOrderPresentation(order: any): OrderPresentation {
    if (!order) {
      return {
        statusLabel: 'Unknown',
        statusColor: 'gray',
        fulfillmentLabel: 'Unknown',
        fulfillmentColor: 'gray',
        nextStatuses: [],
        canCancel: false,
        canRefund: false,
        canFulfill: false,
      };
    }

    const status = order.status || '';
    const fulfillmentStatus = order.fulfillment_status || order.fulfillmentStatus || '';
    const normalizedStatus = status.toLowerCase();
    
    return {
      statusLabel: this.getOrderStatusLabel(status),
      statusColor: this.getOrderStatusColor(status),
      fulfillmentLabel: this.getFulfillmentStatusLabel(fulfillmentStatus),
      fulfillmentColor: this.getFulfillmentStatusColor(fulfillmentStatus),
      nextStatuses: this.getNextOrderStatuses(status),
      canCancel: ['pending_payment', 'awaiting_payment', 'deposit_paid', 'awaiting_balance', 'paid', 'confirmed', 'processing'].includes(normalizedStatus),
      canRefund: ['delivered', 'fulfilled'].includes(normalizedStatus),
      canFulfill: ['processing', 'in_production', 'ready_to_ship', 'paid'].includes(normalizedStatus),
    };
  }
}
