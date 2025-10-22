"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderDomainService = void 0;
const prisma_1 = require("../../../generated/prisma");
const order_errors_1 = require("./errors/order-errors");
class OrderDomainService {
    constructor(prisma, websocketGateway, cache) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
        this.cache = cache;
    }
    async getOrder(orderId, userId) {
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new order_errors_1.OrderNotFoundError(orderId);
        }
        const isBuyer = order.user_id === userId;
        const isSeller = order.seller_id === userId;
        if (!isBuyer && !isSeller) {
            throw new order_errors_1.OrderNotFoundError(orderId);
        }
        return this.mapOrderToGraphQL(order);
    }
    async listOrders(filters) {
        const { sellerId, buyerId, status, first = 20, after } = filters;
        let cursor;
        if (after) {
            try {
                const decoded = JSON.parse(Buffer.from(after, 'base64').toString('utf-8'));
                cursor = { id: decoded.id };
            }
            catch (e) {
                throw new order_errors_1.InvalidCursorError();
            }
        }
        const where = {};
        if (sellerId)
            where.seller_id = sellerId;
        if (buyerId)
            where.user_id = buyerId;
        if (status)
            where.status = status;
        const orders = await this.prisma.orders.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: first + 1,
            ...(cursor && { skip: 1, cursor }),
        });
        const hasNextPage = orders.length > first;
        const nodes = hasNextPage ? orders.slice(0, first) : orders;
        const mappedOrders = nodes.map(order => this.mapOrderToGraphQL(order));
        const endCursor = nodes.length > 0
            ? Buffer.from(JSON.stringify({ id: nodes[nodes.length - 1].id })).toString('base64')
            : null;
        return {
            nodes: mappedOrders,
            pageInfo: {
                hasNextPage,
                endCursor,
            },
        };
    }
    async getOrdersByBuyer(buyerId) {
        const orders = await this.prisma.orders.findMany({
            where: { user_id: buyerId },
            orderBy: { created_at: 'desc' },
        });
        return orders.map(order => this.mapOrderToGraphQL(order));
    }
    async getOrdersBySeller(sellerId) {
        const orders = await this.prisma.orders.findMany({
            where: { seller_id: sellerId },
            orderBy: { created_at: 'desc' },
        });
        return orders.map(order => this.mapOrderToGraphQL(order));
    }
    async createOrder(input, userId) {
        const { cartId, shippingAddress, billingAddress, paymentMethodId, buyerNotes } = input;
        const cart = await this.prisma.carts.findUnique({
            where: { id: cartId },
        });
        if (!cart) {
            throw new order_errors_1.CartNotFoundError(cartId);
        }
        if (cart.buyer_id !== userId) {
            throw new order_errors_1.UnauthorizedCartAccessError();
        }
        const items = cart.items || [];
        if (items.length === 0) {
            throw new order_errors_1.EmptyCartError();
        }
        const subtotal = items.reduce((sum, item) => {
            return sum + parseFloat(item.price) * item.quantity;
        }, 0);
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const order = await this.prisma.$transaction(async (tx) => {
            const orderData = {
                user_id: userId,
                seller_id: cart.seller_id,
                customer_name: shippingAddress.fullName,
                customer_email: 'buyer@example.com',
                customer_address: `${shippingAddress.addressLine1}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`,
                items: JSON.stringify(items),
                total: subtotal,
                subtotal_before_tax: subtotal,
                tax_amount: 0,
                shipping_cost: 0,
                amount_paid: 0,
                remaining_balance: subtotal,
                payment_type: 'full',
                payment_status: 'pending',
                status: 'PENDING',
                fulfillment_status: 'unfulfilled',
                currency: 'USD',
                shipping_street: shippingAddress.addressLine1,
                shipping_city: shippingAddress.city,
                shipping_state: shippingAddress.state,
                shipping_postal_code: shippingAddress.postalCode,
                shipping_country: shippingAddress.country || 'US',
                billing_name: billingAddress?.fullName || shippingAddress.fullName,
                billing_email: billingAddress?.addressLine1 || shippingAddress.addressLine1,
                billing_street: billingAddress?.addressLine1 || shippingAddress.addressLine1,
                billing_city: billingAddress?.city || shippingAddress.city,
                billing_state: billingAddress?.state || shippingAddress.state,
                billing_postal_code: billingAddress?.postalCode || shippingAddress.postalCode,
                billing_country: billingAddress?.country || shippingAddress.country || 'US',
                created_at: new Date().toISOString(),
            };
            const createdOrder = await tx.orders.create({
                data: orderData,
            });
            for (const item of items) {
                await tx.order_items.create({
                    data: {
                        order_id: createdOrder.id,
                        product_id: item.productId,
                        product_name: item.name,
                        product_type: item.productType || 'physical',
                        quantity: item.quantity,
                        price: item.price.toString(),
                        subtotal: (item.price * item.quantity).toString(),
                        item_status: 'PENDING',
                        created_at: new Date().toISOString(),
                    },
                });
            }
            await tx.carts.update({
                where: { id: cartId },
                data: {
                    items: JSON.stringify([]),
                    updated_at: new Date().toISOString(),
                },
            });
            return createdOrder;
        }, {
            timeout: 30000,
            isolationLevel: prisma_1.Prisma.TransactionIsolationLevel.ReadCommitted,
        });
        const graphqlOrder = this.mapOrderToGraphQL(order);
        if (this.websocketGateway) {
            this.websocketGateway.emitOrderUpdate(userId, graphqlOrder);
            this.websocketGateway.emitOrderUpdate(cart.seller_id, graphqlOrder);
            this.websocketGateway.emitAnalyticsSaleCompleted(cart.seller_id, {
                sellerId: cart.seller_id,
                orderId: order.id,
                amount: order.total.toString(),
                itemCount: items.length,
            });
        }
        if (this.cache) {
            await this.cache.invalidate(`orders:buyer:${userId}`);
            await this.cache.invalidate(`orders:seller:${cart.seller_id}`);
        }
        return graphqlOrder;
    }
    async updateOrderFulfillment(input, userId) {
        const { orderId, fulfillmentStatus, trackingNumber, carrier, trackingUrl, estimatedDelivery } = input;
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new order_errors_1.OrderNotFoundError(orderId);
        }
        if (order.seller_id !== userId) {
            throw new order_errors_1.ForbiddenError('Access denied: Only the seller can update order fulfillment');
        }
        const updatedOrder = await this.prisma.orders.update({
            where: { id: orderId },
            data: {
                fulfillment_status: fulfillmentStatus,
                tracking_number: trackingNumber || null,
                shipping_carrier: carrier || null,
                tracking_link: trackingUrl || null,
                updated_at: new Date().toISOString(),
            },
        });
        const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);
        if (this.websocketGateway) {
            this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
            this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);
        }
        if (this.cache) {
            await this.cache.invalidate(`order:${orderId}`);
        }
        return graphqlOrder;
    }
    async issueRefund(input, userId) {
        const { orderId, amount, reason, refundType } = input;
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new order_errors_1.OrderNotFoundError(orderId);
        }
        if (order.seller_id !== userId) {
            throw new order_errors_1.ForbiddenError('Access denied: Only the seller can issue refunds');
        }
        const orderTotalCents = Math.round(parseFloat(order.total.toString()) * 100);
        const refundAmountCents = Math.round(amount * 100);
        if (refundAmountCents > orderTotalCents) {
            throw new order_errors_1.InvalidRefundAmountError();
        }
        const updatedOrder = await this.prisma.orders.update({
            where: { id: orderId },
            data: {
                payment_status: refundType === 'full' ? 'refunded' : 'partially_refunded',
                status: refundType === 'full' ? 'CANCELLED' : order.status,
                updated_at: new Date().toISOString(),
            },
        });
        const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);
        if (this.websocketGateway) {
            this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
            this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);
        }
        if (this.cache) {
            await this.cache.invalidate(`order:${orderId}`);
        }
        return graphqlOrder;
    }
    async processBalancePayment(input, userId) {
        const { orderId, paymentIntentId, amountPaid, currency = 'USD' } = input;
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new order_errors_1.OrderNotFoundError(orderId);
        }
        const isBuyer = order.user_id === userId;
        const isSeller = order.seller_id === userId;
        if (!isBuyer && !isSeller) {
            throw new order_errors_1.ForbiddenError('Access denied: You are not authorized to process payment for this order');
        }
        const currentBalance = parseFloat(order.remaining_balance?.toString() || '0');
        const currentAmountPaid = parseFloat(order.amount_paid?.toString() || '0');
        if (amountPaid <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }
        if (amountPaid > currentBalance) {
            throw new Error(`Payment amount cannot exceed remaining balance of ${currentBalance}`);
        }
        const newAmountPaid = currentAmountPaid + amountPaid;
        const newRemainingBalance = currentBalance - amountPaid;
        let paymentStatus = order.payment_status;
        if (newRemainingBalance === 0) {
            paymentStatus = 'paid';
        }
        else if (newAmountPaid > 0) {
            paymentStatus = 'partially_paid';
        }
        const updatedOrder = await this.prisma.orders.update({
            where: { id: orderId },
            data: {
                amount_paid: newAmountPaid.toString(),
                remaining_balance: newRemainingBalance.toString(),
                payment_status: paymentStatus,
                stripe_payment_intent_id: paymentIntentId,
                updated_at: new Date().toISOString(),
            },
        });
        const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);
        if (this.websocketGateway) {
            this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
            this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);
        }
        if (this.cache) {
            await this.cache.invalidate(`order:${orderId}`);
            await this.cache.invalidate(`orders:buyer:${updatedOrder.user_id}`);
            await this.cache.invalidate(`orders:seller:${updatedOrder.seller_id}`);
        }
        return graphqlOrder;
    }
    mapOrderToGraphQL(order) {
        return {
            id: order.id,
            orderNumber: order.id.slice(0, 8).toUpperCase(),
            buyerId: order.user_id,
            sellerId: order.seller_id,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerAddress: order.customer_address,
            total: order.total?.toString() || '0',
            subtotal: order.subtotal_before_tax?.toString() || order.total?.toString() || '0',
            taxAmount: order.tax_amount?.toString() || '0',
            shippingCost: order.shipping_cost?.toString() || '0',
            amountPaid: order.amount_paid?.toString() || '0',
            remainingBalance: order.remaining_balance?.toString() || '0',
            paymentType: order.payment_type || 'full',
            paymentStatus: order.payment_status || 'pending',
            status: order.status || 'pending',
            fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
            trackingNumber: order.tracking_number || null,
            carrier: order.shipping_carrier || null,
            trackingUrl: order.tracking_url || null,
            estimatedDelivery: order.estimated_delivery || null,
            currency: order.currency || 'USD',
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            items: [],
            events: [],
            refunds: [],
        };
    }
}
exports.OrderDomainService = OrderDomainService;
//# sourceMappingURL=orders.domain-service.js.map