import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { objectStorageClient, signObjectURL } from '../objectStorage';
import type { Order, OrderItem, User, Product } from '@shared/schema';

const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const privateDir = process.env.PRIVATE_OBJECT_DIR || '.private';

/**
 * Utility: Format address for display (handles newlines and commas)
 * Returns array of clean address lines
 */
export function formatAddressLines(address: string): string[] {
  return address
    .split(/[\n,]+/)  // Split by newlines OR commas only
    .map(line => line.trim())
    .filter(line => line.length > 0);  // Remove empty lines
}

export interface InvoiceData {
  invoice: {
    number: string;
    date: Date;
    dueDate?: Date;
  };
  seller: {
    businessName: string;
    email: string;
    address?: string;
    phone?: string;
    logo?: string;
    vatNumber?: string;
    taxId?: string;
  };
  customer: {
    name: string;
    email: string;
    address: string;
    company?: string;
    vatNumber?: string;
  };
  order: {
    id: string;
    orderNumber: string;
    date: Date;
    total: string;
    tax: string;
    subtotal: string;
    shipping?: string;
    paymentStatus: string;
    billingName?: string;
    billingStreet?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    billingCountry?: string;
    shippingStreet?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPostalCode?: string;
    shippingCountry?: string;
  };
  items: Array<{
    name: string;
    sku?: string;
    variant?: string;
    quantity: number;
    price: string;
    subtotal: string;
  }>;
  wholesale?: {
    poNumber?: string;
    incoterms?: string;
    paymentTerms?: string;
  };
  currency: string;
  notes?: string;
}

export interface PackingSlipData {
  packingSlip: {
    number: string;
    date: Date;
  };
  seller: {
    businessName: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
  };
  customer: {
    name: string;
    address: string;
    email: string;
  };
  order: {
    id: string;
    orderNumber: string;
    date: Date;
    billingName?: string;
    billingStreet?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    billingCountry?: string;
    shippingStreet?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPostalCode?: string;
    shippingCountry?: string;
  };
  items: Array<{
    name: string;
    sku?: string;
    variant?: string;
    quantity: number;
    image?: string;
  }>;
  warehouseNotes?: string;
  giftMessage?: string;
  includesPricing?: boolean;
}

export class DocumentGenerator {
  /**
   * Generate Invoice PDF
   */
  static async generateInvoice(data: InvoiceData): Promise<{ buffer: Buffer; url: string }> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));

    // Header with Logo
    if (data.seller.logo) {
      try {
        doc.image(data.seller.logo, 50, 45, { width: 100 });
      } catch (e) {
        // Logo failed to load, skip
      }
    }

    // Company Info (Top Right)
    doc
      .fontSize(10)
      .text(data.seller.businessName, 350, 50, { align: 'right' })
      .fontSize(9)
      .fillColor('#666666');

    let sellerInfoY = 65;
    
    // Format seller address with line breaks
    if (data.seller.address) {
      const sellerAddressLines = formatAddressLines(data.seller.address);
      sellerAddressLines.forEach((line) => {
        doc.text(line, 350, sellerInfoY, { align: 'right' });
        sellerInfoY += 12;
      });
    }
    
    if (data.seller.phone) {
      doc.text(data.seller.phone, 350, sellerInfoY, { align: 'right' });
      sellerInfoY += 12;
    }
    
    if (data.seller.email) {
      doc.text(data.seller.email, 350, sellerInfoY, { align: 'right' });
      sellerInfoY += 12;
    }
    
    if (data.seller.vatNumber) {
      doc.text(`VAT: ${data.seller.vatNumber}`, 350, sellerInfoY, { align: 'right' });
    }

    // Invoice Title
    doc
      .fillColor('#000000')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('INVOICE', 50, 150);

    // Invoice Details
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice Number: ${data.invoice.number}`, 50, 190)
      .text(`Invoice Date: ${data.invoice.date.toLocaleDateString()}`, 50, 205)
      .text(`Order ID: ${data.order.orderNumber}`, 50, 220);

    if (data.invoice.dueDate) {
      doc.text(`Due Date: ${data.invoice.dueDate.toLocaleDateString()}`, 50, 235);
    }

    // Wholesale-specific fields
    if (data.wholesale?.poNumber) {
      doc.text(`PO Number: ${data.wholesale.poNumber}`, 50, data.invoice.dueDate ? 250 : 235);
    }
    if (data.wholesale?.incoterms) {
      doc.text(`Incoterms: ${data.wholesale.incoterms}`, 50, data.invoice.dueDate ? 265 : 250);
    }
    if (data.wholesale?.paymentTerms) {
      doc.text(`Payment Terms: ${data.wholesale.paymentTerms}`, 50, data.invoice.dueDate ? 280 : 265);
    }

    // Bill To Section
    const billToY = data.wholesale ? 320 : 270;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Bill To:', 50, billToY);

    // Format billing address (use billing fields if available, otherwise fallback to customer address)
    const billingAddress = data.order.billingStreet 
      ? `${data.order.billingStreet}\n${data.order.billingCity}, ${data.order.billingState} ${data.order.billingPostalCode}\n${data.order.billingCountry}`
      : data.customer.address;
    const billingAddressLines = formatAddressLines(billingAddress);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.order.billingName || data.customer.company || data.customer.name, 50, billToY + 20);
    
    // Print billing address lines with proper spacing
    let billToAddressY = billToY + 35;
    billingAddressLines.forEach((line) => {
      doc.text(line, 50, billToAddressY);
      billToAddressY += 15;
    });
    
    doc.text(data.customer.email, 50, billToAddressY);
    billToAddressY += 15;

    if (data.customer.vatNumber) {
      doc.text(`VAT: ${data.customer.vatNumber}`, 50, billToAddressY);
      billToAddressY += 15;
    }

    // Ship To Section (add below Bill To)
    const shipToY = billToAddressY + 20;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Ship To:', 50, shipToY);

    // Format shipping address (use shipping fields if available, otherwise fallback to customer address)
    const shippingAddress = data.order.shippingStreet
      ? `${data.order.shippingStreet}\n${data.order.shippingCity}, ${data.order.shippingState} ${data.order.shippingPostalCode}\n${data.order.shippingCountry}`
      : data.customer.address;
    const shippingAddressLines = formatAddressLines(shippingAddress);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.customer.company || data.customer.name, 50, shipToY + 20);
    
    // Print shipping address lines with proper spacing
    let shipToAddressY = shipToY + 35;
    shippingAddressLines.forEach((line) => {
      doc.text(line, 50, shipToAddressY);
      shipToAddressY += 15;
    });

    // Items Table - Dynamic position based on both address sections
    const tableTop = shipToAddressY + 20;  // 20px gap after Ship To section
    const itemHeaderY = tableTop;

    // Table Header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .rect(50, itemHeaderY, 500, 25)
      .fill('#4f46e5');

    doc
      .fillColor('#ffffff')
      .text('Description', 60, itemHeaderY + 7)
      .text('Qty', 320, itemHeaderY + 7, { width: 50, align: 'center' })
      .text('Price', 390, itemHeaderY + 7, { width: 70, align: 'right' })
      .text('Total', 480, itemHeaderY + 7, { width: 60, align: 'right' });

    // Table Items
    doc.fillColor('#000000').font('Helvetica');
    let itemY = itemHeaderY + 35;

    data.items.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(50, itemY - 5, 500, 25).fill(bgColor);

      doc
        .fillColor('#000000')
        .fontSize(9)
        .text(item.name + (item.variant ? ` (${item.variant})` : ''), 60, itemY, {
          width: 240,
        });

      if (item.sku) {
        doc.fillColor('#666666').fontSize(8).text(`SKU: ${item.sku}`, 60, itemY + 12);
      }

      doc
        .fillColor('#000000')
        .fontSize(9)
        .text(item.quantity.toString(), 320, itemY, { width: 50, align: 'center' })
        .text(`${data.currency} ${item.price}`, 390, itemY, { width: 70, align: 'right' })
        .text(`${data.currency} ${item.subtotal}`, 480, itemY, { width: 60, align: 'right' });

      itemY += 30;
    });

    // Totals Section
    const totalsY = itemY + 20;

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal:', 380, totalsY, { width: 90, align: 'right' })
      .text(`${data.currency} ${data.order.subtotal}`, 475, totalsY, { width: 75, align: 'right' });

    if (data.order.shipping && parseFloat(data.order.shipping) > 0) {
      doc
        .text('Shipping:', 380, totalsY + 20, { width: 90, align: 'right' })
        .text(`${data.currency} ${data.order.shipping}`, 475, totalsY + 20, { width: 75, align: 'right' });
    }

    if (parseFloat(data.order.tax) > 0) {
      doc
        .text('Tax:', 380, totalsY + (data.order.shipping ? 40 : 20), { width: 90, align: 'right' })
        .text(`${data.currency} ${data.order.tax}`, 475, totalsY + (data.order.shipping ? 40 : 20), { width: 75, align: 'right' });
    }

    // Total with background
    const totalY = totalsY + (data.order.shipping ? 60 : 40);
    doc
      .rect(360, totalY - 5, 190, 25)
      .fill('#4f46e5')
      .fillColor('#ffffff')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', 370, totalY, { width: 100 })
      .text(`${data.currency} ${data.order.total}`, 470, totalY, { width: 70, align: 'right' });

    // Payment Status
    doc
      .fillColor('#000000')
      .fontSize(10)
      .font('Helvetica')
      .text(`Payment Status: ${data.order.paymentStatus}`, 50, totalY + 40);

    // Notes
    if (data.notes) {
      doc
        .fontSize(9)
        .fillColor('#666666')
        .text('Notes:', 50, totalY + 70)
        .text(data.notes, 50, totalY + 85, { width: 500 });
    }

    // Footer
    doc
      .fontSize(8)
      .fillColor('#999999')
      .text(
        'Thank you for your business!',
        50,
        doc.page.height - 50,
        { align: 'center', width: 500 }
      );

    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });

    // Upload to object storage
    const fileName = `invoices/${data.invoice.number}.pdf`;
    const url = await this.uploadToStorage(buffer, fileName);

    return { buffer, url };
  }

  /**
   * Generate Packing Slip PDF
   */
  static async generatePackingSlip(data: PackingSlipData): Promise<{ buffer: Buffer; url: string }> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));

    // Header with Logo
    if (data.seller.logo) {
      try {
        doc.image(data.seller.logo, 50, 45, { width: 100 });
      } catch (e) {
        // Logo failed to load, skip
      }
    }

    // Company Info (Top Right)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(data.seller.businessName, 350, 50, { align: 'right' })
      .fontSize(9)
      .fillColor('#666666')
      .font('Helvetica');

    let psSellerInfoY = 65;
    
    // Format seller address with line breaks
    if (data.seller.address) {
      const psSellerAddressLines = formatAddressLines(data.seller.address);
      psSellerAddressLines.forEach((line) => {
        doc.text(line, 350, psSellerInfoY, { align: 'right' });
        psSellerInfoY += 12;
      });
    }
    
    if (data.seller.phone) {
      doc.text(data.seller.phone, 350, psSellerInfoY, { align: 'right' });
      psSellerInfoY += 12;
    }
    
    if (data.seller.email) {
      doc.text(data.seller.email, 350, psSellerInfoY, { align: 'right' });
    }

    // Packing Slip Title
    doc
      .fillColor('#000000')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('PACKING SLIP', 50, 150);

    // Packing Slip Details
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Packing Slip #: ${data.packingSlip.number}`, 50, 190)
      .text(`Date: ${data.packingSlip.date.toLocaleDateString()}`, 50, 205)
      .text(`Order #: ${data.order.orderNumber}`, 50, 220);

    // Bill To Section
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Bill To:', 50, 260);

    // Format billing address (use billing fields if available, otherwise fallback to customer address)
    const psBillingAddress = data.order.billingStreet 
      ? `${data.order.billingStreet}\n${data.order.billingCity}, ${data.order.billingState} ${data.order.billingPostalCode}\n${data.order.billingCountry}`
      : data.customer.address;
    const psBillingAddressLines = formatAddressLines(psBillingAddress);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.order.billingName || data.customer.name, 50, 280);
    
    // Print billing address lines with proper spacing
    let psBillToAddressY = 295;
    psBillingAddressLines.forEach((line) => {
      doc.text(line, 50, psBillToAddressY);
      psBillToAddressY += 15;
    });

    // Ship To Section (add below Bill To)
    const psShipToY = psBillToAddressY + 20;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Ship To:', 50, psShipToY);

    // Format shipping address (use shipping fields if available, otherwise fallback to customer address)
    const psShippingAddress = data.order.shippingStreet
      ? `${data.order.shippingStreet}\n${data.order.shippingCity}, ${data.order.shippingState} ${data.order.shippingPostalCode}\n${data.order.shippingCountry}`
      : data.customer.address;
    const psShippingAddressLines = formatAddressLines(psShippingAddress);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.customer.name, 50, psShipToY + 20);
    
    // Print shipping address lines with proper spacing
    let psShipToAddressY = psShipToY + 35;
    psShippingAddressLines.forEach((line) => {
      doc.text(line, 50, psShipToAddressY);
      psShipToAddressY += 15;
    });

    // Items Table - Dynamic position based on both address sections
    const tableTop = psShipToAddressY + 20;  // 20px gap after Ship To section
    const itemHeaderY = tableTop;

    // Table Header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .rect(50, itemHeaderY, 500, 25)
      .fill('#4f46e5');

    doc
      .fillColor('#ffffff')
      .text('Item', 60, itemHeaderY + 7)
      .text('SKU', 280, itemHeaderY + 7)
      .text('Variant', 370, itemHeaderY + 7)
      .text('Qty', 490, itemHeaderY + 7, { width: 50, align: 'center' });

    // Table Items
    doc.fillColor('#000000').font('Helvetica');
    let itemY = itemHeaderY + 35;

    data.items.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(50, itemY - 5, 500, 30).fill(bgColor);

      doc
        .fillColor('#000000')
        .fontSize(9)
        .text(item.name, 60, itemY, { width: 200 })
        .text(item.sku || '-', 280, itemY)
        .text(item.variant || '-', 370, itemY)
        .text(item.quantity.toString(), 490, itemY, { width: 50, align: 'center' });

      itemY += 35;
    });

    // Gift Message
    if (data.giftMessage) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Gift Message:', 50, itemY + 30)
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(data.giftMessage, 50, itemY + 50, {
          width: 500,
          align: 'left',
        });
      itemY += 90;
    }

    // Warehouse Notes
    if (data.warehouseNotes) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Warehouse Notes:', 50, itemY + (data.giftMessage ? 0 : 30))
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(data.warehouseNotes, 50, itemY + (data.giftMessage ? 20 : 50), {
          width: 500,
        });
    }

    // Footer
    doc
      .fontSize(8)
      .fillColor('#999999')
      .text(
        'Please check all items carefully and report any discrepancies immediately.',
        50,
        doc.page.height - 50,
        { align: 'center', width: 500 }
      );

    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });

    // Upload to object storage
    const fileName = `packing-slips/${data.packingSlip.number}.pdf`;
    const url = await this.uploadToStorage(buffer, fileName);

    return { buffer, url };
  }

  /**
   * Upload PDF buffer to Replit Object Storage
   */
  private static async uploadToStorage(buffer: Buffer, fileName: string): Promise<string> {
    if (!bucketName) {
      throw new Error('Object storage not configured');
    }

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(`${privateDir}/documents/${fileName}`);

    await file.save(buffer, {
      metadata: {
        contentType: 'application/pdf',
      },
    });

    // Generate signed URL using Replit's sidecar (valid for 7 days)
    const objectName = `${privateDir}/documents/${fileName}`;
    const url = await signObjectURL({
      bucketName,
      objectName,
      method: 'GET',
      ttlSec: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return url;
  }

  /**
   * Generate document number with format: PREFIX-YYYYMMDD-XXXXX
   */
  static generateDocumentNumber(prefix: string): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}-${datePart}-${randomPart}`;
  }
}
