import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { getTestApp } from "../setup/test-app.js";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../server/index.js";
import {
  createBuyerSession,
  createSellerSession,
} from "../setup/auth-helpers.js";
import { createFixtures } from "../setup/fixtures.js";
import { prisma } from "../../server/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

describe("Invoice Generation @api @integration @b2b", () => {
  let app: Express;
  let fixtures: ReturnType<typeof createFixtures>;
  let buyerAuth: Awaited<ReturnType<typeof createBuyerSession>>;
  let sellerAuth: Awaited<ReturnType<typeof createSellerSession>>;
  let sellerId: string;
  let buyerId: string;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(async () => {
    fixtures = createFixtures(prisma);

    buyerAuth = await createBuyerSession(app, prisma);
    sellerAuth = await createSellerSession(app, prisma);

    const { user: seller } = await fixtures.createSeller();
    sellerId = seller.id;
    buyerId = buyerAuth.userId;
  });

  afterEach(async () => {
    // Cleanup is handled by test isolation
  });

  it("should generate PDF invoice for wholesale order", async () => {
    // Create wholesale order
    const order = await fixtures.createWholesaleOrder(sellerId, buyerId, {
      total: "5000.00",
      payment_terms: "NET30",
      po_number: "PO-2024-001",
      status: "deposit_paid",
    });

    // Request invoice PDF
    const invoiceRes = await request(app)
      .get(`/api/wholesale/orders/${order.id}/invoice`)
      .set("Cookie", buyerAuth.sessionCookie)
      .expect(200);

    // Should return PDF invoice
    expect(invoiceRes.headers["content-type"]).toContain("application/pdf");
  });

  it("should include all required invoice fields in JSON format", async () => {
    // Create wholesale order
    const order = await fixtures.createWholesaleOrder(sellerId, buyerId, {
      total: "5000.00",
      payment_terms: "NET30",
      po_number: "PO-2024-001",
      status: "deposit_paid",
      subtotal: "4500.00",
      tax: "500.00",
    });

    // Request invoice data (JSON)
    const invoiceRes = await request(app)
      .get(`/api/wholesale/orders/${order.id}`)
      .set("Cookie", buyerAuth.sessionCookie)
      .expect(200);

    const invoice = invoiceRes.body.order;

    // Verify required fields
    expect(invoice).toHaveProperty("order_number");
    expect(invoice).toHaveProperty("created_at");
    expect(invoice).toHaveProperty("seller_id");
    expect(invoice).toHaveProperty("buyer_id");
    expect(invoice).toHaveProperty("subtotal");
    expect(invoice).toHaveProperty("total");
    expect(invoice).toHaveProperty("payment_terms");
    expect(invoice.payment_terms).toBe("NET30");
    expect(invoice.po_number).toBe("PO-2024-001");
  });

  it("should calculate invoice due date based on payment terms", async () => {
    // NET30 terms
    const net30Order = await fixtures.createWholesaleOrder(sellerId, buyerId, {
      total: "5000.00",
      payment_terms: "NET30",
      status: "deposit_paid",
    });

    const net30Res = await request(app)
      .get(`/api/wholesale/orders/${net30Order.id}`)
      .set("Cookie", buyerAuth.sessionCookie)
      .expect(200);

    expect(net30Res.body.order.payment_terms).toBe("NET30");

    // NET60 terms
    const net60Order = await fixtures.createWholesaleOrder(sellerId, buyerId, {
      total: "5000.00",
      payment_terms: "NET60",
      status: "deposit_paid",
    });

    const net60Res = await request(app)
      .get(`/api/wholesale/orders/${net60Order.id}`)
      .set("Cookie", buyerAuth.sessionCookie)
      .expect(200);

    expect(net60Res.body.order.payment_terms).toBe("NET60");
  });

  it("should include line items in invoice", async () => {
    // Create wholesale order with items
    const product = await fixtures.createWholesaleProduct(sellerId, {
      name: "Test Product",
      wholesale_price: "50.00",
      moq: 10,
    });

    const order = await fixtures.createWholesaleOrder(sellerId, buyerId, {
      total: "5000.00",
      payment_terms: "NET30",
      status: "deposit_paid",
      items: JSON.stringify([
        {
          product_id: product.id,
          name: product.name,
          quantity: 100,
          unit_price: "50.00",
          total: "5000.00",
        },
      ]),
    });

    const invoiceRes = await request(app)
      .get(`/api/wholesale/orders/${order.id}`)
      .set("Cookie", buyerAuth.sessionCookie)
      .expect(200);

    const items = JSON.parse(invoiceRes.body.order.items);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("product_id");
    expect(items[0]).toHaveProperty("quantity");
    expect(items[0]).toHaveProperty("unit_price");
  });

  it("should support invoice download for trade quotations", async () => {
    // Create trade quotation
    const quotation = await fixtures.createTradeQuotation(
      sellerId,
      "buyer@example.com",
      {
        status: "accepted",
        total: "10000.00",
        subtotal: "9500.00",
        deposit_amount: "3000.00",
        balance_amount: "7000.00",
      },
    );

    // Request quotation invoice
    const invoiceRes = await request(app)
      .get(`/api/trade/quotations/${quotation.id}/invoice`)
      .set("Cookie", sellerAuth.sessionCookie)
      .expect(200);

    // Should return PDF
    expect(invoiceRes.headers["content-type"]).toContain("application/pdf");
  });

  it("should handle invoices for partially paid orders", async () => {
    // Create order with deposit paid
    const order = await fixtures.createWholesaleOrder(sellerId, buyerId, {
      total: "10000.00",
      payment_terms: "deposit_balance",
      status: "awaiting_balance",
      deposit_amount: "3000.00",
      balance_amount: "7000.00",
      deposit_paid: 1,
    });

    const invoiceRes = await request(app)
      .get(`/api/wholesale/orders/${order.id}`)
      .set("Cookie", buyerAuth.sessionCookie)
      .expect(200);

    expect(invoiceRes.body.order.deposit_paid).toBe(1);
    expect(invoiceRes.body.order.status).toBe("partially_paid");
  });
});
