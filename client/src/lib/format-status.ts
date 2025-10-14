/**
 * Centralized status formatting utilities
 * Ensures consistent display across the application
 */

/**
 * Format any status string for display
 * - Replaces underscores with spaces
 * - Capitalizes first letter of each word
 * 
 * Examples:
 * - "in_stock" -> "In Stock"
 * - "partially_refunded" -> "Partially Refunded"
 * - "deposit_paid" -> "Deposit Paid"
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get formatted label for payment status
 */
export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    deposit_paid: "Deposit Paid",
    fully_paid: "Fully Paid",
    partially_refunded: "Partially Refunded",
    refunded: "Refunded",
    failed: "Failed",
  };
  return labels[status] || formatStatus(status);
}

/**
 * Get formatted label for order status
 */
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return labels[status] || formatStatus(status);
}

/**
 * Get formatted label for product type
 */
export function getProductTypeLabel(productType: string): string {
  const labels: Record<string, string> = {
    'in-stock': 'In Stock',
    'in_stock': 'In Stock',
    'pre-order': 'Pre-Order',
    'pre_order': 'Pre-Order',
    'made-to-order': 'Made to Order',
    'made_to_order': 'Made to Order',
    'wholesale': 'Wholesale',
  };
  return labels[productType] || formatStatus(productType);
}

/**
 * Get formatted label for stock status
 */
export function getStockStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    in_stock: "In Stock",
    'in-stock': "In Stock",
    out_of_stock: "Out of Stock",
    'out-of-stock': "Out of Stock",
    low_stock: "Low Stock",
    'low-stock': "Low Stock",
  };
  return labels[status] || formatStatus(status);
}

/**
 * Get formatted label for item status
 */
export function getItemStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
    partially_refunded: "Partially Refunded",
  };
  return labels[status] || formatStatus(status);
}

/**
 * Get formatted label for wholesale order status
 */
export function getWholesaleOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_deposit: "Pending Deposit",
    deposit_paid: "Deposit Paid",
    in_production: "In Production",
    ready_to_release: "Ready to Release",
    fulfilled: "Fulfilled",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || formatStatus(status);
}
