# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform designed to empower creators and brands with individual, subdomain-based storefronts. It supports diverse product types (in-stock, pre-order, made-to-order, wholesale) and integrates essential e-commerce functionalities such as product management, shopping cart, authenticated checkout, a comprehensive seller dashboard, and AI-optimized social media advertising. The platform features B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and an advanced tax system. Upfirst's ambition is to provide a scalable, secure, and modern direct-to-consumer solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file. **MANDATORY: ALL state-changing operations MUST emit Socket.IO events to affected users (see SOCKETIO_USAGE_RULES.md)**.

## Test Authentication Credentials
**CRITICAL: Always use these credentials for manual testing and E2E tests**
- **Email**: `mirtorabi+seller1@gmail.com`
- **Verification Code**: `111111`
- **Note**: This is the ONLY test account to use. Do not create new test accounts or try other credentials.

## System Architecture

### ✅ **CTO MIGRATION COMPLETE** (October 2025)
Upfirst has successfully migrated to the CTO's strategic technology stack:
- **Frontend**: Next.js 14 + Material UI v7 (NEW) running on port 3000, replacing Vite/Shadcn
- **Backend**: NestJS GraphQL API + Prisma ORM on port 4000, with Express.js REST API on port 5000
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Real-time**: Socket.IO integrated in NestJS
- **Deployment**: Docker-ready with docker-compose.yml for all services

**Current Stack (Production-Ready)**:
- **Next.js Frontend** (Port 3000): Material UI v7, Apollo Client, **43 pages fully migrated** (all platforms complete)
- **NestJS GraphQL API** (Port 4000): 10+ modules with comprehensive GraphQL schema
- **Express REST API** (Port 5000): Authentication endpoints, legacy support
- **PostgreSQL** (Port 5432): Neon database with Prisma ORM
- **Vite Frontend** (Port 5000): Legacy UI (maintained in parallel for reference)

**Migration Status**: ✅ **100% COMPLETE** - All 43 pages migrated to Next.js 14 + Material UI v7 with Architecture 3 compliance (October 2025)
- **Buyer Platform** (9 pages): Home, Storefront, Product Detail, Cart, Checkout (3), Dashboard, Order Details
- **Wholesale B2B** (13 pages): Seller Dashboard, Products, Orders, Buyers, Invitations + Buyer Catalog, Cart, Checkout, Confirmation
- **Trade/Quotations** (6 pages): Dashboard, List, Builder, Edit, Orders, Token-based Buyer View
- **Advanced Features** (15 pages): Meta Ads (3), Analytics & Wallet (2), Email Marketing (2), Admin Tools (5), Static Pages (3)

For complete migration details, see `NEXTJS_MIGRATION_COMPLETE.md` and `DEPLOYMENT_GUIDE.md`.

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
-   **Backend**: NestJS application for GraphQL API and Socket.IO, integrated with an existing Express.js server. Uses service layer pattern with dependency injection, authentication guards, and DataLoaders for N+1 query prevention. **DTO Validation System (Phase 2.2 - October 2025)**: Comprehensive class-validator based DTOs for all REST endpoints with automatic request validation, type transformation, and detailed error messages. 20+ DTOs across 6 domains (Orders, Products, Cart, Checkout, Wholesale, Quotations) with shared validation decorators for common patterns (UUIDs, emails, currency, addresses). Validation middleware wired into Express pipeline with comprehensive logging and error handling.
-   **GraphQL API**: Comprehensive schema with 10 domain modules (Identity, Catalog, Cart, Orders, Wholesale, Quotations, Subscriptions, Marketing, Newsletter, Platform Ops), including queries, mutations, and subscriptions. Secured with session-based authentication and role-based access control.
-   **Real-time Features (Socket.IO Only - Consolidated October 2025)**: **Comprehensive 100% coverage** with 50+ events across all modules. **Socket.IO-only architecture** on `/socket.io/` with WebSocket-only transport for optimal performance. All connections require session authentication with balanced security: users auto-join private `user:{userId}` rooms, and can join validated public `storefront:{sellerId}` and `product:{productId}` rooms. Includes real-time updates for products (inventory, pricing), wholesale (invitations, orders), quotations (status changes), orders (fulfillment, payment webhooks - both buyer AND seller), cart, settings (branding, contact, store status, warehouse, payment, tax, shipping, domain), and analytics. Features comprehensive metrics tracking (connections, errors, room memberships, events) via `/api/metrics/socketio` endpoint. Uses room-based targeting for efficient event delivery. All events follow {module}:{action} naming convention with typed interfaces. **[See SOCKETIO_CONSOLIDATION_COMPLETE.md, SOCKETIO_IMPLEMENTATION_SUMMARY.md and SOCKETIO_USAGE_RULES.md for complete details]**
-   **Product Management**: Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import with AI-powered field mapping.
-   **Cart & Inventory**: Enterprise-grade "soft hold" cart reservation with PostgreSQL row-level locking and transaction-based stock reservation.
-   **Order Management**: Comprehensive order lifecycle management, fulfillment tracking, and refunds.
-   **Wholesale B2B System**: Invitation-based access, variant-level MOQ, percentage deposit system, Net 30/60/90 payment terms, and comprehensive order lifecycle management.
-   **Trade Quotation System**: Customizable quotation numbers, professional invoice structure, Incoterms support, Excel-like line item builder, server-side pricing validation, and secure token-based buyer access.
-   **Payments & Subscriptions**: Integrated with Stripe Connect for multi-seller payments and recurring seller subscriptions.
-   **Multi-currency & Tax**: IP-based currency detection with user-selectable options and an advanced tax system.
-   **Social Ads System**: Multi-platform (Meta, TikTok, X) social advertising with AI optimization via Google Gemini.
-   **Email System**: Production-ready infrastructure with 37+ transactional templates covering all platform workflows and enterprise-grade newsletter capabilities.
-   **Custom Domains**: Allows sellers to connect custom domains with DNS verification, SSL provisioning, and routing.
-   **Analytics**: Comprehensive seller analytics dashboard with server-side calculations for various business insights.
-   **Deployment**: Dockerized with multi-stage builds for NestJS API, Vite frontend, and Next.js frontend, orchestrated with `docker-compose` and Nginx reverse proxy.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Prisma ORM
-   **Email Service**: Resend
-   **Payment Gateway**: Stripe SDK
-   **Shipping Service**: Shippo API
-   **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API
-   **AI Services**: Google Gemini API
-   **UI Components**: Material UI v7 (Next.js), Shadcn UI (Vite legacy)
-   **Styling**: Tailwind CSS
-   **State Management**: TanStack Query (Vite), Apollo Client (Next.js)
-   **Routing**: Next.js App Router (Next.js), Wouter (Vite legacy)
-   **Forms**: React Hook Form
-   **Validation**: Zod (frontend), class-validator + class-transformer (backend DTOs)
-   **CSV Parsing**: PapaParse, XLSX
-   **Currency Exchange**: Fawazahmed0 Currency API
-   **PDF Generation**: PDFKit
-   **Rich Text Editor**: TinyMCE
-   **WebSocket**: Socket.IO
-   **Charts**: Recharts
-   **Date Pickers**: @mui/x-date-pickers