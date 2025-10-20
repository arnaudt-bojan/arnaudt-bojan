import { addDays, parseISO } from 'date-fns';

/**
 * Computes the delivery date for an order item based on product type
 * @param orderItem - The order item containing product type and delivery info
 * @param orderCreatedAt - The order creation date/timestamp
 * @returns ISO date string of delivery date, or null if not applicable
 */
export function computeDeliveryDate(
  orderItem: {
    productType: string;
    preOrderDate?: string | null;
    madeToOrderLeadTime?: number | null;
  },
  orderCreatedAt: Date | string
): string | null {
  // Pre-order: use selected delivery date
  if (orderItem.productType === 'pre-order') {
    return orderItem.preOrderDate || null;
  }
  
  // Made-to-order: calculate from lead time
  if (orderItem.productType === 'made-to-order') {
    if (!orderItem.madeToOrderLeadTime || orderItem.madeToOrderLeadTime <= 0) {
      return null;
    }
    
    const createdDate = typeof orderCreatedAt === 'string' 
      ? parseISO(orderCreatedAt) 
      : orderCreatedAt;
    
    const deliveryDate = addDays(createdDate, orderItem.madeToOrderLeadTime);
    return deliveryDate.toISOString();
  }
  
  // Other types: no delivery date
  return null;
}

/**
 * Computes the earliest delivery date across all items in an order
 * @param items - Array of order items
 * @param orderCreatedAt - The order creation date
 * @returns ISO date string of earliest delivery, or null if no items have delivery dates
 */
export function computeEarliestDeliveryDate(
  items: Array<{
    productType: string;
    preOrderDate?: string | null;
    madeToOrderLeadTime?: number | null;
  }>,
  orderCreatedAt: Date | string
): string | null {
  const deliveryDates = items
    .map(item => computeDeliveryDate(item, orderCreatedAt))
    .filter((date): date is string => date !== null)
    .map(date => new Date(date));
  
  if (deliveryDates.length === 0) {
    return null;
  }
  
  const earliest = new Date(Math.min(...deliveryDates.map(d => d.getTime())));
  return earliest.toISOString();
}
