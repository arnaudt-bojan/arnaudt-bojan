import { Router } from 'express';
import { storage } from '../storage';
import { WholesaleOrderLifecycleService } from '../services/wholesale-order-lifecycle.service';
import { z } from 'zod';
import { isAuthenticated } from '../replitAuth';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe if available
let stripe: Stripe | undefined;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });
}

// Initialize wholesale order lifecycle service
const wholesaleOrderLifecycleService = new WholesaleOrderLifecycleService(storage, stripe);

/**
 * POST /api/wholesale/orders/:id/refunds
 * Process a refund for a wholesale order
 */
router.post('/:id/refunds', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const orderId = req.params.id;

    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const schema = z.object({
      refundType: z.enum(['full', 'partial']),
      reason: z.string().optional(),
      customRefundAmount: z.number().optional(),
    });

    const data = schema.parse(req.body);

    // Process refund
    const result = await wholesaleOrderLifecycleService.processRefund({
      orderId,
      sellerId: userId,
      refundType: data.refundType,
      reason: data.reason,
      customRefundAmount: data.customRefundAmount,
    });

    if (!result.success) {
      return res.status(result.statusCode || 500).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      refund: result.refund,
      refundAmount: result.refundAmount,
      stripeRefundId: result.stripeRefundId,
      status: result.status,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Wholesale refund error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/wholesale/orders/:id/refunds
 * Get refund history for a wholesale order
 */
router.get('/:id/refunds', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const orderId = req.params.id;

    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Verify seller owns this order
    const order = await storage.getWholesaleOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Wholesale order not found' });
    }

    if (order.sellerId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only view refunds for your own orders' });
    }

    // Get refund history
    const result = await wholesaleOrderLifecycleService.getRefundHistory(orderId);

    if (!result.success) {
      return res.status(result.statusCode || 500).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      refunds: result.refunds,
    });
  } catch (error: any) {
    console.error('Get wholesale refund history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
