# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform designed to empower creators and brands with individual, subdomain-based storefronts. It supports various product types (in-stock, pre-order, made-to-order, wholesale) and offers comprehensive features including product management, shopping cart, authenticated checkout, a robust seller dashboard, and AI-optimized social media advertising integration. The platform incorporates B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and a comprehensive tax system. Upfirst aims to be a scalable, secure, and modern D2C solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## E2E Test Accounts
For end-to-end testing, the following test accounts are configured with authentication bypass (fixed code "111111" - no real OTP needed):

**Seller Accounts** (emails delivered to mirtorabi@gmail.com):
- `mirtorabi+seller1@gmail.com` - Username: `e2eseller1` - Role: admin/seller
- `mirtorabi+seller2@gmail.com` - Username: `e2eseller2` - Role: admin/seller

**Buyer Accounts** (emails delivered to mirtorabi@gmail.com):
- `mirtorabi+buyer1@gmail.com` - Role: buyer
- `mirtorabi+buyer2@gmail.com` - Role: buyer

**Authentication Bypass**: All test accounts accept code `111111` without requiring email verification. This is implemented in `server/auth-email.ts` for automated E2E testing.

## System Architecture
Upfirst utilizes a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend, with an Express.js Node.js backend, PostgreSQL (Neon), and Drizzle ORM.

**Core Architectural Principle: Three Parallel Platforms**
Upfirst is architected as three distinct, parallel platforms, not a single unified system:
1.  **B2C Platform** (Retail/Direct-to-Consumer): Individual storefronts at `username.upfirst.io`, shopping cart, checkout, order management, and a dedicated seller dashboard.
2.  **B2B Platform** (Wholesale): Invitation-based buyer access, MOQ enforcement, deposit/balance payments, and a separate dashboard.
3.  **Trade Platform** (Professional Quotations): Excel-like quotation builder, token-based buyer access, status tracking, and its own dashboard.

Each platform has its own routes, pages, and workflows, while services can be shared but must be adapted for specific platform needs. All business logic follows a server-side-only approach (Architecture 3).

**UI/UX Decisions:**
The design system supports dark/light mode, uses the Inter font, and emphasizes consistent spacing, typography, and a mobile-first responsive approach. Navigation is dashboard-centric, and storefronts are customizable with seller branding.

**Technical Implementations:**
-   **Backend:** Service layer pattern with dependency injection for business logic.
-   **Product Management:** Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import with job tracking.
-   **Shipping:** Centralized `ShippingService` integrating Free Shipping, Flat Rate, Matrix Shipping, and real-time API rates. All shipping rates are stored and displayed in the seller's listing currency (multi-currency support).
-   **Shopping & Checkout:** Features slide-over cart, guest checkout, server-side shipping cost calculation, single-seller per cart, and optimized performance.
-   **Authentication & Authorization:** Email-based with dual-token system and capability-based authorization for various roles.
-   **Payment Processing:** Integrated with Stripe Connect for multi-seller payments, supporting various methods and PCI-DSS compliance.
-   **Subscription System:** Monthly/annual seller subscriptions managed via Stripe, including a 30-day trial.
-   **Multi-Currency Support:** IP-based detection with user-selectable currency and real-time exchange rates.
-   **Wholesale B2B System (Joor/Zedonk-Class):** Industry-leading B2B wholesale platform with invitation-based access, variant-level MOQ, percentage deposit system (0-100% configurable), Net 30/60/90 payment terms, multi-image product galleries, 3-level category hierarchy (shared with B2C retail via categoryLevel1Id/2Id/3Id fields), SKU auto-generation ({CATEGORY_ABBR}-{RANDOM_6}), dual readiness options (days after order OR fixed delivery date), warehouse transparency, product-specific T&C uploads, and comprehensive order lifecycle management. Professional PDP with image gallery, SKU display, and wholesale feature cards.
-   **Trade Quotation System (Professional B2B):** World-class quotation platform with customizable quotation numbers (QT-YYYY-###), professional invoice structure (tax & shipping at bottom, not per line item), 8 standard Incoterms (FOB, CIF, DDP, EXW, DAP, FCA, CPT, CIP), data sheet file uploads (PDF specs), T&C document uploads (legal terms), excel-like line item builder, server-side pricing validation, deposit/balance payment flows, secure token-based buyer access, and normalized object storage with proper ACL. Follows international trade standards for B2B quotations.
-   **Social Ads System:** Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
-   **Inventory Management:** Production-ready transaction-based stock reservation with atomic operations, PostgreSQL row-level locking, and automatic synchronization.
-   **Cart Reservation System (Atomic):** Enterprise-grade "soft hold" system with PostgreSQL row-level locking preventing all race conditions. Implements `updateReservationQuantityAtomic` storage method that locks product rows within transactions to guarantee fresh stock data, excludes current reservation from availability checks, and updates quantities in-place (zero duplicate reservations). Pre-order/made-to-order products bypass stock validation. 30-minute expiry with 5-minute background cleanup cycle. Architecture 3 compliant: all business logic server-side, zero client arithmetic.
-   **Order Management System:** Comprehensive order lifecycle management with status tracking, refunds, and balance payments, including real-time updates via WebSockets. Features smart URL normalization for tracking links (auto-adds https:// protocol if missing) to prevent broken links when sellers enter tracking URLs like "ups.com/track123".
-   **Delivery Date Display & Reminder System:** Displays delivery dates for pre-order/made-to-order products and features an automated background service to email sellers 7 days prior to delivery dates with magic link authentication.
-   **Bulk Product Upload System:** Shopify-class bulk upload with comprehensive CSV import, job tracking, validation, and rollback, including URL-safe delimiters and real-time error reporting.
-   **AI-Powered Field Mapping:** Google Gemini AI integration for intelligent CSV column mapping to database schema, enabling universal CSV import compatibility without requiring specific formats.
-   **Newsletter System:** Enterprise-grade email marketing platform with campaign management, subscriber handling, segmentation, compliance, a database-persistent job queue, multi-ESP support, and a rich text editor (TinyMCE).
-   **Meta Ads B2C Platform:** Self-service social advertising system for Meta (Facebook/Instagram) campaigns, integrating with Meta Marketing API, Gemini AI for ad intelligence, and Stripe for payments. Features popup-based OAuth (like Stripe Connect), AI-powered ad copy, Advantage+ optimization, 20% Upfirst fee on ad spend, credit-based budget system, real-time analytics, and automated low-balance alerts. OAuth flow opens in popup window to avoid Replit URL bar restrictions.
-   **AI-Optimized Landing Page:** World-class marketing landing page at `/experience` route featuring comprehensive platform overview, three parallel platform deep-dives (Retail B2C, B2B Wholesale, Trade), pricing tiers, FAQ section, and comparison matrix. Includes custom SEO hooks with proper metadata restoration, structured data (JSON-LD for FAQ/Organization/SoftwareApplication), Open Graph/Twitter Card tags, smooth scroll animations with intersection observers, mobile-responsive burger menu navigation for unauthenticated users, and AI-search optimized content. Valid HTML5 semantics throughout with proper Link component usage (no nested anchors).

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Drizzle ORM
-   **Email Service**: Resend
-   **Payment Gateway**: Stripe SDK
-   **Shipping Service**: Shippo API
-   **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API
-   **AI Services**: Google Gemini API
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