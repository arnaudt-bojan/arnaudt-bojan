import { Router } from 'express';
import { storage } from '../storage';
import { DocumentGenerator, type InvoiceData, type PackingSlipData } from '../services/document-generator';
import { z } from 'zod';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Helper to get seller ID from order
async function getSellerIdFromOrder(orderId: string): Promise<string | null> {
  const orderItems = await storage.getOrderItems(orderId);
  if (orderItems.length === 0) return null;
  
  // Get first product to find seller
  const firstItem = orderItems[0];
  const product = await storage.getProduct(firstItem.productId);
  if (!product) return null;
  
  return product.sellerId;
}

/**
 * POST /api/documents/invoices/generate
 * Generate an invoice for an order
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
      orderType: z.enum(['b2c', 'wholesale']).optional().default('b2c'),
      poNumber: z.string().optional(),
      vatNumber: z.string().optional(),
      incoterms: z.string().optional(),
      paymentTerms: z.string().optional(),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Get order
    const order = await storage.getOrder(data.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const orderItems = await storage.getOrderItems(data.orderId);
    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'Order has no items' });
    }

    // Get seller ID from first product
    const sellerId = await getSellerIdFromOrder(data.orderId);
    if (!sellerId) {
      return res.status(400).json({ error: 'Could not determine seller for this order' });
    }

    // Authorization: Only seller or admin can generate invoice
    if (currentUser.role !== 'admin' && userId !== sellerId) {
      return res.status(403).json({ error: 'Forbidden: You can only generate invoices for your own orders' });
    }

    // Get seller details
    const seller = await storage.getUser(sellerId);
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

    // CRITICAL: Use stored pricing data (single source of truth) - never recalculate
    const subtotal = order.subtotalBeforeTax 
      ? parseFloat(order.subtotalBeforeTax).toFixed(2)
      : orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
    
    const shipping = order.shippingCost 
      ? parseFloat(order.shippingCost).toFixed(2)
      : '0.00';
    
    const tax = order.taxAmount 
      ? parseFloat(order.taxAmount).toFixed(2)
      : '0.00';
    
    const total = parseFloat(order.total).toFixed(2);

    // Prepare invoice data
    const invoiceNumber = DocumentGenerator.generateDocumentNumber('INV');
    
    const invoiceData: InvoiceData = {
      invoice: {
        number: invoiceNumber,
        date: new Date(),
        dueDate: data.paymentTerms ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      },
      seller: {
        businessName: seller.firstName && seller.lastName 
          ? `${seller.firstName} ${seller.lastName}` 
          : seller.email!,
        email: seller.email!,
        logo: seller.storeLogo || undefined,
        vatNumber: data.vatNumber,
      },
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        address: order.customerAddress,
      },
      order: {
        id: order.id,
        orderNumber: order.id.substring(0, 8).toUpperCase(),
        date: new Date(order.createdAt),
        total,
        tax,
        subtotal,
        shipping,
        paymentStatus: order.paymentStatus || 'pending',
      },
      items: orderItems.map(item => ({
        name: item.productName,
        sku: item.productId,
        variant: item.variant ? JSON.stringify(item.variant) : undefined,
        quantity: item.quantity,
        price: parseFloat(item.price).toFixed(2),
        subtotal: parseFloat(item.subtotal).toFixed(2),
      })),
      wholesale: data.orderType === 'wholesale' ? {
        poNumber: data.poNumber,
        incoterms: data.incoterms,
        paymentTerms: data.paymentTerms,
      } : undefined,
      currency: seller.listingCurrency || 'USD',
      notes: data.notes,
    };

    // Generate PDF
    const { url } = await DocumentGenerator.generateInvoice(invoiceData);

    // Save invoice record
    const invoice = await storage.createInvoice({
      orderId: order.id,
      sellerId,
      invoiceNumber,
      documentUrl: url,
      documentType: 'invoice',
      orderType: data.orderType,
      currency: seller.listingCurrency || 'USD',
      totalAmount: total,
      taxAmount: tax,
      poNumber: data.poNumber,
      vatNumber: data.vatNumber,
      incoterms: data.incoterms,
      paymentTerms: data.paymentTerms,
      generatedBy: userId,
      generationTrigger: 'manual',
    });

    res.json({
      success: true,
      invoice,
      downloadUrl: url,
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to generate invoice' });
  }
});

/**
 * POST /api/documents/packing-slips/generate
 * Generate a packing slip for an order
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
      giftMessage: z.string().optional(),
      includesPricing: z.boolean().optional().default(false),
    });

    const data = schema.parse(req.body);

    // Get order
    const order = await storage.getOrder(data.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const orderItems = await storage.getOrderItems(data.orderId);
    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'Order has no items' });
    }

    // Get seller ID
    const sellerId = await getSellerIdFromOrder(data.orderId);
    if (!sellerId) {
      return res.status(400).json({ error: 'Could not determine seller for this order' });
    }

    // Authorization: Only seller or admin can generate packing slip
    if (currentUser.role !== 'admin' && userId !== sellerId) {
      return res.status(403).json({ error: 'Forbidden: You can only generate packing slips for your own orders' });
    }

    // Get seller details
    const seller = await storage.getUser(sellerId);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Check if packing slip already exists
    const existingSlips = await storage.getPackingSlipsByOrderId(data.orderId);
    if (existingSlips.length > 0) {
      return res.status(200).json({
        message: 'Packing slip already exists',
        packingSlip: existingSlips[0],
      });
    }

    // Prepare packing slip data
    const packingSlipNumber = DocumentGenerator.generateDocumentNumber('PS');
    
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
        name: order.customerName,
        email: order.customerEmail,
        address: order.customerAddress,
      },
      order: {
        id: order.id,
        orderNumber: order.id.substring(0, 8).toUpperCase(),
        date: new Date(order.createdAt),
      },
      items: orderItems.map(item => ({
        name: item.productName,
        sku: item.productId,
        variant: item.variant ? JSON.stringify(item.variant) : undefined,
        quantity: item.quantity,
        image: item.productImage || undefined,
      })),
      warehouseNotes: data.warehouseNotes,
      giftMessage: data.giftMessage,
      includesPricing: data.includesPricing,
    };

    // Generate PDF
    const { url } = await DocumentGenerator.generatePackingSlip(packingSlipData);

    // Save packing slip record
    const packingSlip = await storage.createPackingSlip({
      orderId: order.id,
      sellerId,
      packingSlipNumber,
      documentUrl: url,
      documentType: 'packing_slip',
      warehouseNotes: data.warehouseNotes,
      giftMessage: data.giftMessage,
      includesPricing: data.includesPricing ? 1 : 0,
      generatedBy: userId,
      generationTrigger: 'manual',
    });

    res.json({
      success: true,
      packingSlip,
      downloadUrl: url,
    });
  } catch (error: any) {
    console.error('Error generating packing slip:', error);
    res.status(500).json({ error: error.message || 'Failed to generate packing slip' });
  }
});

/**
 * GET /api/documents/invoices/order/:orderId
 * Get all invoices for an order
 */
router.get('/invoices/order/:orderId', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { orderId } = req.params;
    const invoices = await storage.getInvoicesByOrderId(orderId);

    // Authorization check
    if (invoices.length > 0) {
      const sellerId = invoices[0].sellerId;
      if (currentUser.role !== 'admin' && userId !== sellerId) {
        const order = await storage.getOrder(orderId);
        if (!order || order.userId !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }

    res.json({ invoices });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch invoices' });
  }
});

/**
 * GET /api/documents/packing-slips/order/:orderId
 * Get all packing slips for an order
 */
router.get('/packing-slips/order/:orderId', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { orderId } = req.params;
    const packingSlips = await storage.getPackingSlipsByOrderId(orderId);

    // Authorization check
    if (packingSlips.length > 0) {
      const sellerId = packingSlips[0].sellerId;
      if (currentUser.role !== 'admin' && userId !== sellerId) {
        const order = await storage.getOrder(orderId);
        if (!order || order.userId !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }

    res.json({ packingSlips });
  } catch (error: any) {
    console.error('Error fetching packing slips:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch packing slips' });
  }
});

/**
 * GET /api/documents/invoices/:id/download
 * Download invoice PDF (returns signed URL redirect)
 */
router.get('/invoices/:id/download', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Authorization
    if (currentUser.role !== 'admin' && userId !== invoice.sellerId) {
      const order = await storage.getOrder(invoice.orderId);
      if (!order || order.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    res.redirect(invoice.documentUrl);
  } catch (error: any) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to download invoice' });
  }
});

/**
 * GET /api/documents/packing-slips/:id/download
 * Download packing slip PDF (returns signed URL redirect)
 */
router.get('/packing-slips/:id/download', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const packingSlip = await storage.getPackingSlip(req.params.id);
    if (!packingSlip) {
      return res.status(404).json({ error: 'Packing slip not found' });
    }

    // Authorization
    if (currentUser.role !== 'admin' && userId !== packingSlip.sellerId) {
      const order = await storage.getOrder(packingSlip.orderId);
      if (!order || order.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    res.redirect(packingSlip.documentUrl);
  } catch (error: any) {
    console.error('Error downloading packing slip:', error);
    res.status(500).json({ error: error.message || 'Failed to download packing slip' });
  }
});

export default router;
