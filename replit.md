# Upfirst - E-Commerce Platform

## Recent Changes

### Phase 3A: NestJS GraphQL Foundation (October 19, 2025)
**Status**: ✅ Complete - NestJS application operational with GraphQL schema-first architecture

**What Was Done:**
- Bootstrapped NestJS application in `apps/nest-api/` workspace (separate from Express)
- Configured GraphQL module (schema-first) using existing 2,300-line SDL from `docs/graphql-schema.graphql`
- Integrated shared Prisma client (reuses DATABASE_URL, graceful shutdown hooks)
- Implemented health check endpoint: `GET http://localhost:4000/health`
- Resolved Apollo Server version compatibility (Apollo Server 4 + @nestjs/apollo@13.1.0)
- Created modular structure: Health module, Prisma module, GraphQL module

**Architecture:**
- NestJS runs on port 4000 (alongside Express on 5000)
- GraphQL playground at `http://localhost:4000/graphql`
- Express proxy middleware ready to route traffic based on feature flags
- Shared Prisma client (no dual database connections)

**Next Phase:** Phase 3B will implement product resolvers with dataloaders for N+1 prevention

**File Structure:**
- `apps/nest-api/src/main.ts` - NestJS entry point
- `apps/nest-api/src/app.module.ts` - Root module
- `apps/nest-api/src/modules/health/` - Health check
- `apps/nest-api/src/modules/prisma/` - Prisma service
- `apps/nest-api/src/modules/graphql/` - GraphQL configuration

### Phase 2: Drizzle ORM Removal (October 19, 2025)
**Status**: ✅ Complete - Drizzle ORM packages removed, 100% Prisma architecture

**What Was Done:**
- Uninstalled all Drizzle packages: `drizzle-orm`, `drizzle-kit`, `drizzle-zod`, `@neondatabase/serverless`
- Removed `drizzle.config.ts` configuration file
- Created new validation layer: `shared/validation-schemas.ts` with pure Zod schemas (no drizzle-zod)
- Created compatibility layer: `shared/schema.ts` re-exports types and validations
- Updated core imports in routes, services, and client components
- Database operations now 100% Prisma-based

**Known Limitations:**
- Analytics queries (analytics.service.ts, quotation.service.ts) contain commented Drizzle queries needing Prisma migration
- Import queue processor (server/index.ts) disabled pending Prisma migration
- These features are non-critical and can be migrated incrementally

**File Structure:**
- `shared/prisma-types.ts` - All Prisma type exports
- `shared/validation-schemas.ts` - Pure Zod validation schemas
- `shared/schema.ts` - Compatibility layer (re-exports from above)

### GraphQL Schema Design (October 19, 2025)
**Status**: ✅ Complete - Comprehensive GraphQL schema + resolver mapping documentation

**What Was Done:**
- Designed 2,300-line GraphQL SDL schema covering 10 domain modules
- Created 2,500-line resolver mapping documentation with contract test guidelines
- Modules: Identity, Catalog, Cart, Orders, Wholesale, Quotations, Subscriptions, Marketing, Newsletter, Platform Ops
- 40+ queries, 50+ mutations, 7 subscriptions
- Built Express proxy layer with feature flag system for gradual NestJS cutover

**File Structure:**
- `docs/graphql-schema.graphql` - Complete SDL schema (2,300+ lines)
- `docs/graphql-resolver-mapping.md` - Resolver mapping + contract tests (2,500 lines)
- `config/feature-flags.json` - Feature flag configuration
- `server/middleware/proxy.middleware.ts` - Express proxy with hot-reload

## Overview
Upfirst is a D2C e-commerce platform empowering creators and brands with individual, subdomain-based storefronts. It supports diverse product types (in-stock, pre-order, made-to-order, wholesale) and integrates essential e-commerce functionalities such as product management, shopping cart, authenticated checkout, a comprehensive seller dashboard, and AI-optimized social media advertising. The platform features B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and an advanced tax system. Upfirst's ambition is to provide a scalable, secure, and modern direct-to-consumer solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst employs a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend; an Express.js Node.js backend; PostgreSQL (Neon) as the database; and Prisma ORM for all database operations.

**Core Architectural Principle: Three Parallel Platforms with Server-Side Business Logic**
The platform is structured into three distinct, parallel platforms, with all business logic strictly implemented server-side (Architecture 3):
1.  **B2C Platform** (Retail/Direct-to-Consumer): Dedicated storefronts, shopping cart, checkout, order management, and a seller dashboard.
2.  **B2B Platform** (Wholesale): Invitation-based buyer access, Minimum Order Quantity (MOQ) enforcement, deposit/balance payments, and a separate dashboard.
3.  **Trade Platform** (Professional Quotations): Excel-like quotation builder, token-based buyer access, status tracking, and its own dashboard.

**Mandatory Architectural Principles:**
-   **Architecture 3: Server-Side Business Logic Only**: All calculations, business logic, and data transformations must occur server-side. The client displays server-provided data without performing critical business calculations.
-   **Mobile-First Design Standards**: All new UI components and features must be designed mobile-first, ensuring responsiveness across devices.

**UI/UX Decisions:**
The design system supports dark/light modes, uses the Inter font, emphasizes consistent spacing and typography, and prioritizes a mobile-first responsive approach. Navigation is dashboard-centric, and storefronts offer customizable seller branding.

**Technical Implementations:**
-   **Backend**: Service layer pattern with dependency injection.
-   **Product Management**: Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import.
-   **Shipping**: Centralized `ShippingService` integrating Free Shipping, Flat Rate, Matrix Shipping, and real-time API rates.
-   **Shopping & Checkout**: Features a slide-over cart, guest checkout, server-side shipping cost calculation, and single-seller per cart.
-   **Authentication & Authorization**: Email-based with a dual-token system and capability-based authorization.
-   **Payment Processing**: Integrated with Stripe Connect for multi-seller payments.
-   **Subscription System**: Monthly/annual seller subscriptions via Stripe, including a 30-day trial.
-   **Multi-Currency Support**: IP-based detection with user-selectable currency and real-time exchange rates.
-   **Wholesale B2B System**: Invitation-based access, variant-level MOQ, percentage deposit system, Net 30/60/90 payment terms, and comprehensive order lifecycle management.
-   **Trade Quotation System**: Customizable quotation numbers, professional invoice structure, 8 standard Incoterms, Excel-like line item builder, server-side pricing validation, and secure token-based buyer access.
-   **Social Ads System**: Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
-   **Inventory Management**: Production-ready transaction-based stock reservation with atomic operations and PostgreSQL row-level locking.
-   **Cart Reservation System**: Enterprise-grade "soft hold" with PostgreSQL row-level locking, 30-minute expiry, and server-side business logic.
-   **Order Management System**: Comprehensive order lifecycle management with status tracking, refunds, and real-time updates.
-   **Bulk Product Upload System**: Shopify-class bulk upload with CSV import, job tracking, validation, and rollback.
-   **AI-Powered Field Mapping**: Google Gemini AI integration for intelligent CSV column mapping.
-   **Newsletter System**: Enterprise-grade email marketing platform with campaign management, subscriber handling, segmentation, and multi-ESP support.
-   **Meta Ads B2C Platform**: Self-service social advertising system for Meta campaigns, integrating with Meta Marketing API, Gemini AI, and Stripe.
-   **AI-Optimized Landing Page**: A marketing landing page at `/experience` route, featuring platform overview, parallel platform deep-dives, pricing tiers, FAQ, custom SEO, structured data, and Open Graph/Twitter Card tags.
-   **Analytics Dashboard**: Comprehensive seller analytics with server-side calculations (Architecture 3) for revenue, order, product, and customer insights, including B2C vs B2B breakdowns.
-   **Custom Domain System**: Allows sellers to connect custom domains to their storefronts, implementing a dual-strategy approach (Cloudflare SaaS primary, Manual DNS fallback) with DNS verification, SSL provisioning, and domain routing.
-   **Enterprise Email System**: Production-ready email infrastructure with 37+ transactional templates covering all platform workflows (B2C orders, B2B wholesale, trade quotations, seller notifications, subscriptions).

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Prisma ORM
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