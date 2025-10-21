# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform enabling creators and brands to launch individual, subdomain-based storefronts. It supports diverse product types (in-stock, pre-order, made-to-order, wholesale) and integrates core e-commerce functionalities like product management, shopping cart, authenticated checkout, a comprehensive seller dashboard, and AI-optimized social media advertising. The platform includes B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and an advanced tax system, aiming to provide a scalable, secure, and modern direct-to-consumer solution.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file. **MANDATORY: ALL state-changing operations MUST emit Socket.IO events to affected users (see SOCKETIO_USAGE_RULES.md)**.

## System Architecture

### Core Architecture
The platform comprises three distinct, parallel platforms with all business logic strictly implemented server-side (Architecture 3): B2C Retail, B2B Wholesale, and Professional Quotations. All calculations, business logic, and data transformations must occur server-side. The system is designed mobile-first and is Docker-ready.

### Technology Stack
-   **Frontend**: Next.js 14 with Material UI v7 and Apollo Client.
-   **Backend**: NestJS GraphQL API and Socket.IO, with an Express.js REST API for authentication and legacy support.
-   **Database**: PostgreSQL (Neon) with Prisma ORM.
-   **Real-time**: Socket.IO for comprehensive real-time updates across all modules.

### Key Features
-   **UI/UX**: Dark/light modes, Inter font, consistent spacing and typography, mobile-first responsive design, dashboard-centric navigation, customizable seller branding.
-   **Backend Technicals**: NestJS with service layer, dependency injection, authentication guards, DataLoaders, and comprehensive DTO validation (`class-validator`). GraphQL schema covers 10 domain modules.
-   **Real-time Features**: 50+ Socket.IO events for products, orders, cart, wholesale, quotations, settings, analytics, notifications. All connections require session authentication and utilize room-based targeting.
-   **Product Management**: Supports diverse product types, simplified size-first variants, multi-image uploads, bulk CSV import.
-   **Cart & Inventory**: Enterprise-grade "soft hold" cart reservation with PostgreSQL row-level locking.
-   **Order Management**: Comprehensive order lifecycle, fulfillment, and refunds.
-   **Wholesale B2B**: Invitation-based access, variant-level MOQ, percentage deposit, Net 30/60/90 terms.
-   **Trade Quotation**: Customizable quotation numbers, professional invoice structure, Incoterms, Excel-like line item builder, server-side pricing validation, secure token-based buyer access.
-   **Payments & Subscriptions**: Stripe Connect for multi-seller payments and recurring subscriptions.
-   **Multi-currency & Tax**: IP-based currency detection, user-selectable options, advanced tax system.
-   **Social Ads**: Multi-platform (Meta, TikTok, X) advertising with AI optimization (Google Gemini).
-   **Email System**: 37+ transactional templates and enterprise-grade newsletter capabilities via Resend.
-   **Custom Domains**: Sellers can connect custom domains with DNS verification, SSL, and routing.
-   **Analytics**: Comprehensive seller dashboard with server-side calculations.
-   **Deployment**: Dockerized with multi-stage builds and `docker-compose`.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Prisma ORM
-   **Email Service**: Resend
-   **Payment Gateway**: Stripe SDK
-   **Shipping Service**: Shippo API
-   **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API
-   **AI Services**: Google Gemini API
-   **UI Components**: Material UI v7, Shadcn UI
-   **Styling**: Tailwind CSS
-   **State Management**: Apollo Client, TanStack Query
-   **Routing**: Next.js App Router, Wouter
-   **Forms**: React Hook Form
-   **Validation**: Zod, class-validator, class-transformer
-   **CSV Processing**: PapaParse, XLSX
-   **Currency Exchange**: Fawazahmed0 Currency API
-   **PDF Generation**: PDFKit
-   **Rich Text Editor**: TinyMCE
-   **WebSocket**: Socket.IO
-   **Charts**: Recharts
-   **Date Pickers**: @mui/x-date-pickers

## Recent Changes

### October 2025 - Test Infrastructure Enhancement
-   **Test Suite Expansion**: Added 93 new test cases across 5 test files to catch runtime issues before production
    -   Wallet contract tests (API shape validation)
    -   Wallet integration tests (failure condition handling)
    -   Stripe Connect tests (configuration + state validation)
    -   Currency propagation tests (multi-platform consistency)
    -   Order route tests (blank screen prevention)
-   **Pessimistic Mock System**: Default-to-failure mocks requiring explicit opt-in to success paths (tests/setup/pessimistic-mocks.ts)
-   **Currency Centralization**: ESLint rule enforcing all currency values imported from shared/config/currency.ts
-   **CI/CD Pipeline**: Non-blocking test gates detecting schema drift and regressions (.github/workflows/test-suite.yml)
-   **Documentation**: Comprehensive implementation roadmap (docs/TEST-INFRASTRUCTURE-STATUS.md, docs/TEST-SUITE-SUMMARY.md)
-   **Status**: Infrastructure complete, catches all manually identified bugs, awaits endpoint implementation

## Technical Debt & Future Improvements
-   **Logging Standardization** (Priority: Low, Post-deployment): Replace console.log statements with winston logger in production code. Current console.log usage found in server/routes.ts including bulk upload debugging (lines 3203-3215), NFT minting logs (lines 9473-9479), file upload debugging (lines 11046-11096), and WebSocket upgrade logs (lines 13615+). Not a deployment blocker but should be migrated to structured logging for better production observability.
-   **Metrics Integration** (Priority: Medium): Replace console.log metric placeholders with prom-client counters (wallet_balance_error_total, stripe_connect_init_error_total, route_render_fail_total, currency_literal_violation_total). Expose /metrics endpoint for Prometheus scraping.
-   **Missing Endpoints** (Priority: High): Implement endpoints required by test suite:
    -   GET /api/seller/wallet/balance (wallet dashboard)
    -   GET/PATCH /api/user/profile (currency preference)
    -   POST /api/seller/stripe/connect/onboard (Stripe Connect)
    -   GET /api/seller/stripe/connect/status (account status)
    -   GET /api/wholesale/credit/balance (B2B credit tracking)
-   **Frontend Component Tests** (Priority: Medium): Wire pessimistic mocks into frontend tests for subscription modal state transitions, blank screen prevention, error banner validation.