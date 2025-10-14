import PDFDocument from 'pdfkit';
import { Storage } from '@google-cloud/storage';
import Stripe from 'stripe';
import type { Order, OrderItem, User } from '../shared/schema';
import { logger } from './logger';

const storage = new Storage();
const BUCKET_NAME = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

interface StripeBusinessDetails {
  businessName: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  taxId?: string;
  email?: string;
  phone?: string;
}

interface InvoiceData {
  order: Order;
  orderItems: OrderItem[];
  seller: User;
  buyer: {
    name: string;
    email: string;
    address: string;
  };
  stripeDetails: StripeBusinessDetails;
}

interface PackingSlipData {
  order: Order;
  orderItems: OrderItem[];
  seller: User;
  shippingAddress: string;
}

export class PDFService {
  private stripe: Stripe | null = null;

  constructor(stripeSecretKey?: string) {
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-09-30.clover',
      });
    }
  }

  /**
   * Fetch business details from Stripe Connect account
   */
  async getStripeBusinessDetails(connectedAccountId: string): Promise<StripeBusinessDetails> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const account = await this.stripe.accounts.retrieve(connectedAccountId);
      
      return {
        businessName: account.business_profile?.name || account.email || 'Business',
        address: account.business_profile?.support_address ? {
          line1: account.business_profile.support_address.line1 || undefined,
          line2: account.business_profile.support_address.line2 || undefined,
          city: account.business_profile.support_address.city || undefined,
          state: account.business_profile.support_address.state || undefined,
          postal_code: account.business_profile.support_address.postal_code || undefined,
          country: account.business_profile.support_address.country || undefined,
        } : undefined,
        email: account.email || account.business_profile?.support_email || undefined,
        phone: account.business_profile?.support_phone || undefined,
      };
    } catch (error) {
      logger.error("[PDF Service] Error fetching Stripe business details:", error);
      // Return fallback details
      return {
        businessName: 'Business',
      };
    }
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header with logo/banner
      this.addInvoiceHeader(doc, data);
      
      // Invoice title and order info
      doc.moveDown(2);
      doc.fontSize(24).text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Order details
      doc.fontSize(10);
      doc.text(`Invoice #: ${data.order.id.slice(0, 8).toUpperCase()}`, 50, doc.y);
      doc.text(`Order Date: ${new Date(data.order.createdAt).toLocaleDateString()}`, 50, doc.y);
      doc.text(`Order Status: ${data.order.status}`, 50, doc.y);
      doc.moveDown();

      // Bill to / Ship to section
      this.addBillingSection(doc, data);

      // Line items table
      doc.moveDown();
      this.addLineItemsTable(doc, data.orderItems, data.order);

      // Totals
      this.addTotalsSection(doc, data.order);

      // Footer with Stripe business details
      this.addInvoiceFooter(doc, data.stripeDetails);

      doc.end();
    });
  }

  /**
   * Generate packing slip PDF
   */
  async generatePackingSlip(data: PackingSlipData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header with logo/banner
      this.addPackingSlipHeader(doc, data);
      
      // Packing slip title
      doc.moveDown(2);
      doc.fontSize(24).text('PACKING SLIP', { align: 'center' });
      doc.moveDown();
      
      // Order info
      doc.fontSize(10);
      doc.text(`Order #: ${data.order.id.slice(0, 8).toUpperCase()}`, 50, doc.y);
      doc.text(`Order Date: ${new Date(data.order.createdAt).toLocaleDateString()}`, 50, doc.y);
      doc.moveDown();

      // Shipping address
      doc.fontSize(12).text('Ship To:', 50, doc.y);
      doc.fontSize(10).text(data.shippingAddress, 50, doc.y, { width: 250 });
      doc.moveDown();

      // Items to pack
      doc.fontSize(12).text('Items to Ship:', 50, doc.y);
      doc.moveDown(0.5);
      
      this.addPackingItemsTable(doc, data.orderItems);

      // Instructions
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#666666');
      doc.text('Please ensure all items are securely packaged before shipping.', 50, doc.y);

      doc.end();
    });
  }

  /**
   * Save PDF to object storage with caching
   */
  async savePDFToStorage(pdfBuffer: Buffer, fileName: string): Promise<string> {
    if (!BUCKET_NAME) {
      throw new Error('Object storage bucket not configured');
    }

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`pdfs/${fileName}`);
    
    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'public, max-age=86400', // 24 hour cache
      },
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return url;
  }

  /**
   * Check if PDF exists in cache
   */
  async getPDFFromCache(fileName: string): Promise<Buffer | null> {
    if (!BUCKET_NAME) {
      return null;
    }

    try {
      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(`pdfs/${fileName}`);
      const [exists] = await file.exists();
      
      if (exists) {
        const [buffer] = await file.download();
        return buffer;
      }
    } catch (error) {
      logger.error("[PDF Service] Cache check error:", error);
    }
    
    return null;
  }

  // Helper methods for PDF generation

  private addInvoiceHeader(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const startY = doc.y;
    
    // Seller name for header
    const sellerName = [data.seller.firstName, data.seller.lastName].filter(Boolean).join(' ') || 
                       data.seller.username || 
                       data.seller.email || 
                       'Store';
    
    // Add logo if available
    if (data.seller.storeLogo) {
      // Note: In production, fetch and add image from URL
      doc.fontSize(14).text(sellerName, 50, startY);
    } else {
      doc.fontSize(18).text(sellerName, 50, startY);
    }

    // Seller contact info on right - use contactEmail if set, otherwise fallback to email
    doc.fontSize(10);
    const contactEmail = (data.seller as any).contactEmail || data.seller.email || '';
    doc.text(contactEmail, 350, startY, { align: 'right' });
    
    // Draw line under header
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  }

  private addPackingSlipHeader(doc: PDFKit.PDFDocument, data: PackingSlipData) {
    const startY = doc.y;
    const sellerName = [data.seller.firstName, data.seller.lastName].filter(Boolean).join(' ') || 
                       data.seller.username || 
                       data.seller.email || 
                       'Store';
    
    doc.fontSize(16).text(sellerName, 50, startY);
    const contactEmail = (data.seller as any).contactEmail || data.seller.email || '';
    doc.fontSize(10).text(contactEmail, 50, doc.y);
    
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  }

  private addBillingSection(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const startY = doc.y;
    
    // Bill To (left column)
    doc.fontSize(12).text('Bill To:', 50, startY);
    doc.fontSize(10);
    doc.text(data.buyer.name, 50, doc.y);
    doc.text(data.buyer.email, 50, doc.y);
    
    // Ship To (right column)
    doc.fontSize(12).text('Ship To:', 300, startY);
    doc.fontSize(10);
    doc.text(data.buyer.address, 300, startY + 20, { width: 250 });
  }

  private addLineItemsTable(doc: PDFKit.PDFDocument, items: OrderItem[], order: Order) {
    const tableTop = doc.y + 20;
    const itemX = 50;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 490;

    // Table header
    doc.fontSize(10).fillColor('#000000');
    doc.text('Item', itemX, tableTop);
    doc.text('Qty', qtyX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);
    
    // Header line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let currentY = tableTop + 25;

    // Table rows
    items.forEach((item) => {
      const subtotal = parseFloat(item.subtotal?.toString() || '0');
      
      doc.fontSize(10).fillColor('#000000');
      doc.text(item.productName, itemX, currentY, { width: 280 });
      doc.text(item.quantity.toString(), qtyX, currentY);
      doc.text(`$${parseFloat(item.price.toString()).toFixed(2)}`, priceX, currentY);
      doc.text(`$${subtotal.toFixed(2)}`, totalX, currentY);
      
      currentY += 25;
    });

    doc.y = currentY;
  }

  private addPackingItemsTable(doc: PDFKit.PDFDocument, items: OrderItem[]) {
    const tableTop = doc.y;
    
    // Simple list for packing slip
    items.forEach((item, index) => {
      doc.fontSize(10);
      doc.text(`☐  ${item.quantity}x ${item.productName}`, 50, tableTop + (index * 20));
    });

    doc.y = tableTop + (items.length * 20) + 10;
  }

  private addTotalsSection(doc: PDFKit.PDFDocument, order: Order) {
    const startY = doc.y + 20;
    const labelX = 400;
    const valueX = 490;

    // Helper to safely parse decimal values, handling null/undefined/empty strings
    const parseDecimal = (value: string | null | undefined): number | null => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const total = parseFloat(order.total);
    const subtotalBeforeTax = parseDecimal(order.subtotalBeforeTax);
    const shippingCost = parseDecimal(order.shippingCost);
    const taxAmount = parseDecimal(order.taxAmount);

    let currentY = startY;
    doc.fontSize(10);

    // Show subtotal before tax if available
    if (subtotalBeforeTax !== null) {
      doc.text('Subtotal:', labelX, currentY);
      doc.text(`$${subtotalBeforeTax.toFixed(2)}`, valueX, currentY);
      currentY += 20;
    }

    // Show shipping if available and > 0
    if (shippingCost !== null && shippingCost > 0) {
      doc.text('Shipping:', labelX, currentY);
      doc.text(`$${shippingCost.toFixed(2)}`, valueX, currentY);
      currentY += 20;
    }

    // Show tax if available (independent of subtotal) - display even if $0 for transparency and compliance
    if (taxAmount !== null) {
      doc.text('Tax:', labelX, currentY);
      doc.text(`$${taxAmount.toFixed(2)}`, valueX, currentY);
      currentY += 20;
    }
    
    // Total (bold and larger)
    doc.fontSize(12).fillColor('#000000');
    doc.text('Total:', labelX, currentY);
    doc.text(`$${total.toFixed(2)}`, valueX, currentY);

    doc.y = currentY + 25;
  }

  private addInvoiceFooter(doc: PDFKit.PDFDocument, details: StripeBusinessDetails) {
    const footerY = 700; // Near bottom of page
    
    doc.fontSize(8).fillColor('#666666');
    doc.text('Payment processed by:', 50, footerY);
    doc.text(details.businessName, 50, footerY + 12);
    
    if (details.address) {
      const addressParts = [
        details.address.line1,
        details.address.line2,
        details.address.city,
        details.address.state,
        details.address.postal_code,
        details.address.country,
      ].filter(Boolean);
      
      doc.text(addressParts.join(', '), 50, footerY + 24, { width: 500 });
    }
    
    if (details.email || details.phone) {
      const contact = [details.email, details.phone].filter(Boolean).join(' | ');
      doc.text(contact, 50, footerY + 36);
    }
  }
}
