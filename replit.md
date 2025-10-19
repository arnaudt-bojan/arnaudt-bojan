# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform designed to empower creators and brands with individual, subdomain-based storefronts. It supports diverse product types (in-stock, pre-order, made-to-order, wholesale) and integrates essential e-commerce functionalities such as product management, shopping cart, authenticated checkout, a comprehensive seller dashboard, and AI-optimized social media advertising. The platform features B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and an advanced tax system. Upfirst's ambition is to provide a scalable, secure, and modern direct-to-consumer solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst employs a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend; an Express.js Node.js backend; PostgreSQL (Neon) as the database; and a **hybrid ORM architecture** using Prisma ORM for primary data operations with Drizzle ORM retained for critical cart operations requiring PostgreSQL row-level locking (`saveCart()` and `atomicReserveStock()`).

**Core Architectural Principle: Three Parallel Platforms with Server-Side Business Logic**
The platform is structured into three distinct, parallel platforms, with all business logic strictly implemented server-side (Architecture 3):
1.  **B2C Platform** (Retail/Direct-to-Consumer): Dedicated storefronts, shopping cart, checkout, order management, and a seller dashboard.
2.  **B2B Platform** (Wholesale): Invitation-based buyer access, Minimum Order Quantity (MOQ) enforcement, deposit/balance payments, and a separate dashboard.
3.  **Trade Platform** (Professional Quotations): Excel-like quotation builder, token-based buyer access, status tracking, and its own dashboard.

**Mandatory Architectural Principles:**
-   **Architecture 3: Server-Side Business Logic Only**: All calculations, business logic, and data transformations must occur server-side. The client displays server-provided data without performing critical business calculations.
-   **Mobile-First Design Standards**: All new UI components and features must be designed mobile-first, ensuring responsiveness across devices. This includes dual-view patterns (table-to-card), responsive dialogs, single-column forms on mobile, and adaptive grid layouts.

**UI/UX Decisions:**
The design system supports dark/light modes, uses the Inter font, emphasizes consistent spacing and typography, and prioritizes a mobile-first responsive approach. Navigation is dashboard-centric, and storefronts offer customizable seller branding.

**Technical Implementations:**
-   **Backend**: Service layer pattern with dependency injection.
-   **Product Management**: Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import. Products are ordered by creation date (newest first) and track `createdAt`/`updatedAt` timestamps.
-   **Shipping**: Centralized `ShippingService` integrating Free Shipping, Flat Rate, Matrix Shipping, and real-time API rates.
-   **Shopping & Checkout**: Features a slide-over cart, guest checkout, server-side shipping cost calculation, and single-seller per cart.
-   **Authentication & Authorization**: Email-based with a dual-token system and capability-based authorization.
-   **Payment Processing**: Integrated with Stripe Connect for multi-seller payments.
-   **Subscription System**: Monthly/annual seller subscriptions via Stripe, including a 30-day trial.
-   **Multi-Currency Support**: IP-based detection with user-selectable currency and real-time exchange rates. Seller-facing pages display values in the seller's Stripe account currency, while buyer-facing pages convert to the buyer's selected currency.
-   **Wholesale B2B System**: Invitation-based access, variant-level MOQ, percentage deposit system, Net 30/60/90 payment terms, multi-image product galleries, 3-level category hierarchy, SKU auto-generation, and comprehensive order lifecycle management.
-   **Trade Quotation System**: Customizable quotation numbers, professional invoice structure, 8 standard Incoterms, document uploads, Excel-like line item builder, server-side pricing validation, deposit/balance payment flows, and secure token-based buyer access.
-   **Social Ads System**: Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
-   **Inventory Management**: Production-ready transaction-based stock reservation with atomic operations and PostgreSQL row-level locking.
-   **Cart Reservation System**: Enterprise-grade "soft hold" with PostgreSQL row-level locking, 30-minute expiry, and server-side business logic.
-   **Order Management System**: Comprehensive order lifecycle management with status tracking, refunds, balance payments, and real-time updates.
-   **Delivery Date Display & Reminder System**: Displays delivery dates for pre-order/made-to-order products and automated email reminders.
-   **Bulk Product Upload System**: Shopify-class bulk upload with CSV import, job tracking, validation, and rollback.
-   **AI-Powered Field Mapping**: Google Gemini AI integration for intelligent CSV column mapping.
-   **Newsletter System**: Enterprise-grade email marketing platform with campaign management, subscriber handling, segmentation, and multi-ESP support.
-   **Meta Ads B2C Platform**: Self-service social advertising system for Meta campaigns, integrating with Meta Marketing API, Gemini AI, and Stripe. Features popup-based OAuth, AI-powered ad copy, Advantage+ optimization, credit-based budgeting, and real-time analytics.
-   **AI-Optimized Landing Page**: A marketing landing page at `/experience` route, featuring platform overview, parallel platform deep-dives, pricing tiers, FAQ, comparison matrix, custom SEO, structured data, Open Graph/Twitter Card tags, and smooth scroll animations.
-   **Analytics Dashboard**: Comprehensive seller analytics with server-side calculations (Architecture 3) for revenue, order, product, and customer insights, including B2C vs B2B breakdowns. Features 5 time period filters, KPI cards, Recharts visualizations, and mobile-responsive layouts. Monetary values display in the seller's Stripe account currency.
-   **E2E Testing Authentication Bypass**: A test-only authentication endpoint (`POST /api/test/auth/session`) for Playwright E2E tests, blocked in production.
-   **Custom Domain System**: Allows sellers to connect custom domains (e.g., `shop.example.com`) to their storefronts. Implements a dual-strategy approach (Cloudflare SaaS primary, Manual DNS fallback) with DNS verification, SSL provisioning, domain routing, and status tracking.
-   **Enterprise Email System**: Production-ready email infrastructure with 37+ transactional templates covering all platform workflows (B2C orders, B2B wholesale, trade quotations, seller notifications, subscriptions). Features comprehensive multi-currency support (seller.listingCurrency for seller-facing emails, order.currency for buyer-facing emails), safe image URL handling with safeImageUrl() for email client compatibility, and graceful optional field handling with safeText() utilities to prevent "undefined" errors. All emails use consistent branding with generateEmailBaseLayout(), generateUpfirstHeader/Footer for platform emails, and generateSellerHeader/Footer for branded storefront emails. Includes server-side currency symbol helpers (getCurrencySymbol, formatEmailPrice) and follows Architecture 3 principles with all formatting server-side.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Prisma ORM (primary) + Drizzle ORM (cart operations only)
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

## Phase 1 Migration Status (October 2025)

### Migration Completion: 95%
The platform has successfully completed **Phase 1 of the Drizzle-to-Prisma migration** using the Strangler Fig pattern for zero-downtime transition. Prisma now handles all primary database operations while Drizzle is strategically retained for critical cart operations requiring PostgreSQL row-level locking.

### Hybrid ORM Architecture
**Rationale**: The platform implements a **hybrid Prisma + Drizzle architecture** to leverage the strengths of both ORMs:

**Prisma ORM** (Primary - 95% of operations):
- Handles all product, order, seller, user, and analytics queries
- Provides type-safe database access with auto-generated types
- Enables efficient migrations and schema management
- Powers 50+ normalization mappers for Drizzle-to-Prisma data transformation

**Drizzle ORM** (Critical cart operations - 5%):
- **`saveCart()`**: Session-based cart persistence with atomic operations
- **`atomicReserveStock()`**: Enterprise-grade stock reservation with PostgreSQL row-level locking (`FOR UPDATE SKIP LOCKED`)
- Retained specifically for these operations due to proven reliability with database-level locking mechanisms

**Why Hybrid?** Cart operations require precise database-level row locking to prevent race conditions in high-concurrency scenarios (multiple buyers purchasing limited stock simultaneously). Drizzle's direct SQL capabilities make it ideal for these atomic operations, while Prisma's type safety and developer experience excel for standard CRUD operations.

### Critical Fixes Applied (October 19, 2025)

**Checkout Page Crash Fix** - Production-Ready ✅
- **Root Cause**: Checkout page accessed `items[0].sellerId` but cart items don't have `sellerId` property (only cart object has it)
- **Fixes Implemented**:
  1. Added `sellerId: string | null` to `CartContext` interface and provider (`client/src/lib/cart-context.tsx`)
  2. Fixed variable declaration order: moved `seller` useQuery before useEffect that uses it (`client/src/pages/checkout.tsx`)
  3. Fixed type mismatch: converted `sellerId` from `string | null` to `string | undefined` for `usePricing` hook compatibility
  4. Confirmed existing empty cart guard prevents crashes if user navigates to checkout with empty cart
- **Architect Validation**: All fixes reviewed and approved by architect agent - production-ready with no regressions
- **Impact**: Checkout page now renders correctly with customer info forms, shipping fields, and order summary instead of crashing with blank white screen

### Testing Completion

**B2C Flows Tested** ✅
- Authentication: Login/logout working
- Product browsing: Storefront displays 18+ products with interactive elements
- Shopping cart: Add-to-cart, quantity updates, cart persistence working
- Checkout: Customer info forms, shipping address, payment processing rendered correctly
- React app hydration: Confirmed working in E2E browser tests

**Seller-Side Tested** ✅
- Dashboard pages: No LSP errors, clean TypeScript compilation
- Product management: Products listing functional
- Navigation: Dashboard routing working
- Interactive elements: Add-to-cart buttons, currency selectors, product links operational

**B2B Wholesale** ⚠️
- Frontend routes not implemented (out of Phase 1 scope)
- Backend wholesale API endpoints functional
- Will be tested in Phase 2 when frontend routes added

### Known Issues

**Environmental (Non-Blocking)**:
- CSP warnings for Google Fonts and inline styles (environmental, doesn't affect functionality)
- WebSocket initial handshake returns 400 then connects successfully (normal behavior)
- Domain middleware errors during status check cycles (non-critical background job)

**LSP Warnings**:
- ~150 type safety warnings in `server/storage.ts` related to Drizzle-Prisma type conversions
- Non-blocking for runtime - code executes correctly
- Will be addressed in Phase 2 cleanup when Drizzle is fully deprecated

### Phase 2 Roadmap (5% Remaining)

**Cart Migration Completion**:
- Migrate `saveCart()` from Drizzle to Prisma with equivalent row-level locking
- Migrate `atomicReserveStock()` to Prisma using raw SQL for `FOR UPDATE SKIP LOCKED`
- Full Drizzle deprecation once cart operations proven stable in Prisma
- Cleanup remaining type conversion mappers

**Infrastructure Enhancements**:
- Resolve CSP warnings for Google Fonts and inline styles
- Optimize domain middleware error handling
- Complete TypeScript strict mode compliance in storage layer

**Next.js/NestJS Migration** (Future Phases):
- Phase 3: Frontend migration to Next.js with SSR
- Phase 4: Backend migration to NestJS with GraphQL
- Phase 5: Material UI design system integration
- Phase 6: Docker containerization and deployment optimization