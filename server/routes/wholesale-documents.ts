import { Router } from 'express';
import { storage } from '../storage';
import { DocumentGenerator, type InvoiceData, type PackingSlipData } from '../services/document-generator';
import { z } from 'zod';
import { isAuthenticated } from '../replitAuth';
import type { WholesaleOrderItem } from '@shared/schema';
import { formatCurrency } from '../currencyService';

const router = Router();

/**
 * POST /api/wholesale/documents/invoices/generate
 * Generate an invoice for a wholesale order
 */
router.post('/invoices/generate', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const schema = z.object({
      orderId: z.string(),
      poNumber: z.string().optional(),
      vatNumber: z.string().optional(),
      incoterms: z.string().optional(),
      paymentTerms: z.string().optional(),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Get wholesale order
    const order = await storage.getWholesaleOrder(data.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Wholesale order not found' });
    }

    // Get wholesale order items
    const orderItems = await storage.getWholesaleOrderItems(data.orderId);
    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'Order has no items' });
    }

    // Authorization: Only seller can generate invoice
    if (userId !== order.sellerId) {
      return res.status(403).json({ error: 'Forbidden: You can only generate invoices for your own orders' });
    }

    // Get seller details
    const seller = await storage.getUser(order.sellerId);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Check if invoice already exists
    const existingInvoices = await storage.getInvoicesByOrderId(data.orderId);
    if (existingInvoices.length > 0 && !data.notes?.includes('regenerate')) {
      return res.status(200).json({
        message: 'Invoice already exists',
        invoice: existingInvoices[0],
      });
    }

    // CRITICAL: Use stored pricing data from order (Architecture 3 compliance)
    // Never recalculate subtotal, tax, or total - always use stored values from orders table
    if (!order.subtotalCents || !order.totalCents) {
      return res.status(400).json({ error: 'Order missing stored pricing data - cannot generate invoice' });
    }
    
    // Use stored pricing values from order (single source of truth)
    const subtotalCents = order.subtotalCents;
    const taxAmountCents = order.taxAmountCents || 0;
    const totalCents = order.totalCents;
    const currency = order.currency || 'USD';
    
    // Convert to dollars for display with currency-aware formatting
    const subtotal = formatCurrency(subtotalCents / 100, currency);
    const tax = formatCurrency(taxAmountCents / 100, currency);
    const total = formatCurrency(totalCents / 100, currency);
    const depositAmount = formatCurrency(order.depositAmountCents / 100, currency);
    const balanceAmount = formatCurrency(order.balanceAmountCents / 100, currency);

    // Prepare invoice data
    const invoiceNumber = DocumentGenerator.generateDocumentNumber('INV-WH');
    
    // Get shipping details for invoicing address
    const shippingDetails = await storage.getWholesaleShippingDetails(data.orderId);
    let customerAddress = '';
    if (shippingDetails && shippingDetails.invoicingAddress) {
      const addr = shippingDetails.invoicingAddress as any;
      customerAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}, ${addr.country || ''}`.trim();
    }
    
    const invoiceData: InvoiceData = {
      invoice: {
        number: invoiceNumber,
        date: new Date(),
        dueDate: order.balancePaymentDueDate || undefined,
      },
      seller: {
        businessName: seller.firstName && seller.lastName 
          ? `${seller.firstName} ${seller.lastName}` 
          : seller.email!,
        email: seller.email!,
        logo: seller.storeLogo || undefined,
        vatNumber: data.vatNumber || undefined,
      },
      customer: {
        name: order.buyerName || order.buyerEmail,
        email: order.buyerEmail,
        address: customerAddress || 'Buyer address not provided',
        company: order.buyerCompanyName || undefined,
        vatNumber: order.vatNumber || undefined,
      },
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        date: new Date(order.createdAt),
        total,
        tax,
        subtotal,
        paymentStatus: order.status === 'fulfilled' ? 'fully_paid' : order.status === 'deposit_paid' ? 'deposit_paid' : 'pending',
      },
      items: orderItems.map((item: WholesaleOrderItem) => ({
        name: item.productName,
        sku: item.productSku || item.productId,
        variant: item.variant ? JSON.stringify(item.variant) : undefined,
        quantity: item.quantity,
        price: formatCurrency(item.unitPriceCents / 100, currency),
        subtotal: formatCurrency(item.subtotalCents / 100, currency),
      })),
      wholesale: {
        poNumber: data.poNumber || order.poNumber || undefined,
        incoterms: data.incoterms || order.incoterms || undefined,
        paymentTerms: data.paymentTerms || order.paymentTerms || undefined,
      },
      currency: order.currency || 'USD',
      notes: data.notes || `Deposit: ${depositAmount} | Balance: ${balanceAmount}`,
    };

    // Generate PDF
    const { url } = await DocumentGenerator.generateInvoice(invoiceData);

    // Save invoice record
    const invoice = await storage.createInvoice({
      orderId: order.id,
      sellerId: order.sellerId,
      invoiceNumber,
      documentUrl: url,
      documentType: 'invoice',
      orderType: 'wholesale',
      currency: order.currency || 'USD',
      totalAmount: total,
      taxAmount: tax,
      poNumber: data.poNumber || order.poNumber || undefined,
      vatNumber: data.vatNumber || order.vatNumber || undefined,
      incoterms: data.incoterms || order.incoterms || undefined,
      paymentTerms: data.paymentTerms || order.paymentTerms || undefined,
      generatedBy: userId,
      generationTrigger: 'manual',
    });

    return res.status(201).json({
      success: true,
      invoice,
      url,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Wholesale invoice generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/wholesale/documents/packing-slips/generate
 * Generate a packing slip for a wholesale order
 */
router.post('/packing-slips/generate', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const schema = z.object({
      orderId: z.string(),
      warehouseNotes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Get wholesale order
    const order = await storage.getWholesaleOrder(data.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Wholesale order not found' });
    }

    // Get wholesale order items
    const orderItems = await storage.getWholesaleOrderItems(data.orderId);
    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'Order has no items' });
    }

    // Authorization: Only seller can generate packing slip
    if (userId !== order.sellerId) {
      return res.status(403).json({ error: 'Forbidden: You can only generate packing slips for your own orders' });
    }

    // Get seller details
    const seller = await storage.getUser(order.sellerId);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Check if packing slip already exists
    const existingPackingSlips = await storage.getPackingSlipsByOrderId(data.orderId);
    if (existingPackingSlips.length > 0) {
      return res.status(200).json({
        message: 'Packing slip already exists',
        packingSlip: existingPackingSlips[0],
      });
    }

    // Get shipping details for destination address
    const shippingDetails = await storage.getWholesaleShippingDetails(data.orderId);
    let customerAddress = '';
    if (shippingDetails) {
      if (shippingDetails.shippingType === 'buyer_pickup' && shippingDetails.pickupAddress) {
        const addr = shippingDetails.pickupAddress as any;
        customerAddress = `Pickup at: ${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}`.trim();
      } else if (shippingDetails.invoicingAddress) {
        const addr = shippingDetails.invoicingAddress as any;
        customerAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}, ${addr.country || ''}`.trim();
      }
    }
    
    // Prepare packing slip data
    const packingSlipNumber = DocumentGenerator.generateDocumentNumber('PS-WH');
    
    const packingSlipData: PackingSlipData = {
      packingSlip: {
        number: packingSlipNumber,
        date: new Date(),
      },
      seller: {
        businessName: seller.firstName && seller.lastName 
          ? `${seller.firstName} ${seller.lastName}` 
          : seller.email!,
        logo: seller.storeLogo || undefined,
      },
      customer: {
        name: order.buyerCompanyName || order.buyerName || order.buyerEmail,
        address: customerAddress || 'Shipping address not provided',
        email: order.buyerEmail,
      },
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        date: new Date(order.createdAt),
      },
      items: orderItems.map((item: WholesaleOrderItem) => ({
        name: item.productName,
        sku: item.productSku || item.productId,
        variant: item.variant ? JSON.stringify(item.variant) : undefined,
        quantity: item.quantity,
        image: item.productImage || undefined,
      })),
      warehouseNotes: data.warehouseNotes,
      includesPricing: false, // Wholesale packing slips don't include pricing
    };

    // Generate PDF
    const { url } = await DocumentGenerator.generatePackingSlip(packingSlipData);

    // Save packing slip record
    const packingSlip = await storage.createPackingSlip({
      orderId: order.id,
      sellerId: order.sellerId,
      packingSlipNumber,
      documentUrl: url,
      documentType: 'packing_slip',
      warehouseNotes: data.warehouseNotes,
      giftMessage: null,
      includesPricing: 0,
      generatedBy: userId,
      generationTrigger: 'manual',
    });

    return res.status(201).json({
      success: true,
      packingSlip,
      url,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Wholesale packing slip generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/wholesale/documents/invoices/order/:orderId
 * Get all invoices for a wholesale order
 */
router.get('/invoices/order/:orderId', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const orderId = req.params.orderId;

    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get order to verify ownership
    const order = await storage.getWholesaleOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Wholesale order not found' });
    }

    if (order.sellerId !== userId && order.buyerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const invoices = await storage.getInvoicesByOrderId(orderId);
    return res.status(200).json({ invoices });
  } catch (error: any) {
    console.error('Get wholesale invoices error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/wholesale/documents/packing-slips/order/:orderId
 * Get all packing slips for a wholesale order
 */
router.get('/packing-slips/order/:orderId', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const orderId = req.params.orderId;

    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get order to verify ownership
    const order = await storage.getWholesaleOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Wholesale order not found' });
    }

    if (order.sellerId !== userId && order.buyerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const packingSlips = await storage.getPackingSlipsByOrderId(orderId);
    return res.status(200).json({ packingSlips });
  } catch (error: any) {
    console.error('Get wholesale packing slips error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
