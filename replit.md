# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform empowering creators and brands with individual, subdomain-based storefronts. It supports diverse product types (in-stock, pre-order, made-to-order, wholesale) and offers comprehensive features including product management, shopping cart, authenticated checkout, a robust seller dashboard, and AI-optimized social media advertising integration. The platform incorporates B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and a comprehensive tax system. Upfirst aims to be a scalable, secure, and modern D2C solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst utilizes a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend, with an Express.js Node.js backend, PostgreSQL (Neon), and Drizzle ORM.

### **Core Architectural Principle: Three Parallel Platforms**
**CRITICAL:** Upfirst is architected as **three distinct, parallel platforms**, not a single unified system:

1. **B2C Platform** (Retail/Direct-to-Consumer)
   - Individual storefronts at `username.upfirst.io`
   - Shopping cart, checkout, order management
   - Dashboard: `/seller-dashboard`

2. **B2B Platform** (Wholesale)
   - Invitation-based buyer access
   - MOQ enforcement, deposit/balance payments
   - Dashboard: `/wholesale/dashboard`

3. **Trade Platform** (Professional Quotations)
   - Excel-like quotation builder
   - Token-based buyer access, status tracking
   - Dashboard: `/seller/trade/quotations`

**Key Principles:**
- Each platform is **separate** with its own routes, pages, and workflows
- Services can be **shared** but must be **modified** for each platform's specific needs
- All business logic follows **Architecture 3** (server-side only)
- When referencing "B2C", "B2B", or "Trade", we're discussing **specific platform implementations**

**UI/UX Decisions:**
The design system supports dark/light mode, uses the Inter font, and emphasizes consistent spacing, typography, and a mobile-first responsive approach. Navigation is dashboard-centric, and storefronts are customizable with seller branding. Product displays feature multi-image support and interactive elements.

**Technical Implementations:**
-   **Backend:** Employs a service layer pattern with dependency injection for business logic abstraction (e.g., `ProductService`, `StripeConnectService`, `WholesaleService`, `TradeQuotationService`).
-   **Business Mode Selector:** Sellers can switch between B2C, B2B, and Trade platforms within the dashboard header, with automatic navigation to the appropriate platform dashboard.
-   **Product Management:** Supports diverse product types, simplified size-first variants, multi-image uploads, and best-in-class bulk CSV import with job tracking and validation.
-   **Shipping:** Centralized `ShippingService` integrates various methods including Free Shipping, Flat Rate, Matrix Shipping, and real-time Shippo API rates.
-   **Shopping & Checkout:** Features slide-over cart, guest checkout, server-side shipping cost calculation, single-seller per cart constraint, and optimized cart performance.
-   **Authentication & Authorization:** Email-based authentication with a dual-token system and capability-based authorization for seller, buyer, and collaborator roles.
-   **Notification System:** Comprehensive email and in-app notifications with shared templates, powered by Resend.
-   **Payment Processing:** Integrated with Stripe Connect for multi-seller payments, supporting various methods and PCI-DSS compliance.
-   **Subscription System:** Monthly/annual seller subscriptions managed via Stripe, including a 30-day trial.
-   **Multi-Currency Support:** IP-based detection with user-selectable currency and real-time exchange rates.
-   **Wholesale B2B System:** Invitation-based access, variant-level MOQ enforcement, deposit/balance payment splits, freight collect/buyer pickup shipping, and comprehensive order lifecycle management with automated notifications.
-   **Trade Quotation System:** Professional B2B quotation platform with an excel-like builder, server-side pricing validation, deposit/balance payment flows, secure token-based buyer access, and comprehensive status tracking.
-   **Social Ads System:** Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
-   **Item-Level Order Tracking:** Per-item fulfillment system with independent status and tracking.
-   **Document Generation:** Professional PDF invoice and packing slip generation.
-   **Subdomain Architecture:** Environment-aware routing for seller storefronts.
-   **Tax System (B2C):** Automated sales tax calculation via Stripe Tax API.
-   **Pricing Service:** Centralized pricing calculations for consistency and security.
-   **Team Management:** Simplified single-collaborator model with email-based invitations.
-   **Inventory Management:** Production-ready transaction-based stock reservation with atomic operations, PostgreSQL row-level locking, and automatic stock synchronization.
-   **Cart Reservation System:** Implements a "soft hold" pattern with reservations created at checkout, a 30-minute expiry, and automatic release/commit mechanisms.
-   **Order Management System:** Comprehensive order lifecycle management with status tracking, refunds, and balance payments.
-   **Real-Time Order Updates:** WebSocket-based live order synchronization with automatic frontend cache invalidation.
-   **Delivery Date Display:** Pre-order and made-to-order products display delivery dates on checkout and order confirmation pages. Pre-order items show customer-selected dates while made-to-order items calculate delivery dates from order date plus lead time. Delivery dates are persisted in order snapshots (order.items JSON and order_items table) to ensure accuracy even if products are modified or deleted.
-   **Delivery Reminder System:** ✅ PRODUCTION-READY - Automated background service that emails sellers 7 days before pre-order/made-to-order product delivery dates. Features include: per-item duplicate prevention tracking (supports orders with multiple items at different delivery dates), magic link authentication with HMAC-SHA256 signed tokens (7-day expiry, mandatory SESSION_SECRET), professional email template with full order/customer details and Upfirst branding, 6-hour polling interval, graceful error handling. Magic links provide one-click seller access to order pages for balance payment requests, delivery date updates, and order status changes. Runs as background job initialized in server/index.ts with ResendEmailProvider. Test endpoint `/api/dev/test-delivery-reminder` available in development mode.
-   **Bulk Product Upload System:** Shopify-class bulk upload with comprehensive CSV import, job tracking, validation, and rollback. Features include: URL-safe delimiters (@@ and ;;) for color variants preserving HTTPS URLs, real-time validation with row-level error reporting, batch processing with progress tracking, persistent job history, one-click rollback to undo imports, and Architecture 3 compliance with server-side calculations. Utilizes `BulkUploadService` with papaparse CSV parsing and Zod validation.
-   **AI-Powered Field Mapping:** Gemini AI integration for intelligent CSV column mapping directly to database schema. Users can upload CSVs in any format, and the AI automatically maps custom headers to database fields (e.g., name, price, stock, variants) with confidence scores. Features include: database schema-based mapping (not CSV template), high-confidence auto-mapping (>80%), medium-confidence review flags (50-80%), manual mapping for low confidence (<50%), visual confidence indicators, comprehensive data normalization (images, variants, stock), Variant SKU support for both size-only and color variants, robust parsing of JSON/arrays/objects from AI, strict validation (non-negative integer stock, URL extraction from nested objects, color variant flattening), and seamless transformation of any CSV format to database schema. All bulk uploads restricted to in-stock products only. Enables universal CSV import compatibility without requiring specific column names or format.
-   **Newsletter System (Klaviyo-level):** ✅ PRODUCTION-READY - Enterprise-grade email marketing platform refactored to Architecture 3 with complete service layer separation. Core services: `CampaignService` (orchestration, HTML normalization, multi-source recipient merging, sendToAll support), `SubscriberService` (CRUD, bulk operations, unsubscribe), `TemplateService` (personalization, variable substitution), `AnalyticsService` (event tracking, idempotent webhooks, unsubscribe metrics), `SegmentationService` (rule evaluation, date validation), `ComplianceService` (GDPR, CAN-SPAM, automatic group removal). Features: database-persistent job queue with atomic claiming and retry logic, multi-ESP support via abstraction layer, rate limiting, recipient deduplication across direct/segment/group sources, scheduled campaigns with timezone support, segmentIds persistence for targeted campaigns, comprehensive analytics with unsubscribe tracking, GDPR-compliant unsubscribe footer with proper styling/dark mode support, custom fromName and preheader fields, automatic removal of unsubscribed users from all groups, HMAC-SHA256 signed unsubscribe tokens (SESSION_SECRET mandatory, no fallback). All business logic server-side following Architecture 3 patterns. Complete Zod validation on 11 API routes with user-friendly error messages. Modern campaign builder UI (898 lines) with step-by-step wizard, segment creation/preview, and real-time analytics dashboard. **Rich Text Editor:** TinyMCE integration with professional-grade formatting controls including multiple font families (Arial, Georgia, Times New Roman, Verdana, etc.), font sizes (8pt-72pt), text/background colors, alignment options, lists, tables, links, and image uploads. Replaced React Quill for Klaviyo/Mailchimp-level formatting capabilities.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Drizzle ORM
-   **Email Service**: Resend
-   **Payment Gateway**: Stripe SDK
-   **Shipping Service**: Shippo API
-   **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API, Instagram Basic Display API
-   **AI Services**: Google Gemini API (field mapping, content analysis)
-   **UI Components**: Shadcn UI
-   **Styling**: Tailwind CSS
-   **State Management**: TanStack Query
-   **Routing**: Wouter
-   **Forms**: React Hook Form
-   **Validation**: Zod
-   **CSV Parsing**: PapaParse, XLSX
-   **Currency Exchange**: Fawazahmed0 Currency API
-   **PDF Generation**: PDFKit
-   **Rich Text Editor**: TinyMCE