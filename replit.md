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

## Deployment Strategy

### Multi-Environment Setup (October 2025)
Upfirst now supports three deployment environments:

1. **Replit Development** (Active)
   - Technology: Nix + npm
   - Database: Replit PostgreSQL (auto-provisioned)
   - Use: Daily development in Replit IDE
   - Status: ✅ Working

2. **Replit Staging** (Reserved VM)
   - Technology: Nix-based Reserved VM
   - Database: Replit PostgreSQL (managed)
   - Use: Pre-production testing, team demos
   - Deploy: Via Replit UI (Reserved VM with "Always On")
   - Status: Documented in REPLIT-STAGING-SETUP.md
   - **Note**: Background jobs require Reserved VM with "Always On" enabled

3. **Local Docker Development**
   - Technology: Docker Compose (PostgreSQL 16 + app container)
   - Database: PostgreSQL container with persistent volumes
   - Use: Offline development, contributors, testing
   - Start: `docker-compose up`
   - Status: Ready to use

4. **AWS Production** (Planned)
   - Technology: AWS ECS/EKS with Docker
   - Database: RDS PostgreSQL (Multi-AZ)
   - Infrastructure: ALB + ECR + Secrets Manager + CloudWatch
   - Use: Live production traffic at upfirst.io
   - Status: Fully documented in AWS-DEPLOYMENT.md
   - Estimated cost: $300-500/month

### Deployment Files
- `Dockerfile` - Multi-stage build (development, builder, production)
- `docker-compose.yml` - Local development environment
- `.dockerignore` - Optimized Docker builds
- `DEPLOYMENT.md` - Master deployment guide
- `AWS-DEPLOYMENT.md` - AWS ECS production setup
- `REPLIT-STAGING-SETUP.md` - Replit staging deployment
- `QUICK-START.md` - Quick reference guide

### Key Technical Decisions
- **Replit uses Nix, not Docker**: Deployment to Replit uses Nix package management, not Dockerfile
- **Platform-specific dependencies**: Explicitly includes `@esbuild/linux-x64` and `@rollup/rollup-linux-x64-gnu` in dependencies for Docker builds
- **tsx in production**: Uses `tsx` (TypeScript executor) in production Docker; future optimization could compile to JavaScript
- **Database persistence**: docker-compose uses named volumes for PostgreSQL data persistence

## Recent Changes

### October 2025 - Material UI v7 Grid2 Migration
-   **Grid to Grid2 Migration**: Completed migration of all 35 frontend page files from deprecated Grid component to Grid2 (MUI v7)
    -   Migrated imports: `import { Grid } from '@mui/material'` → `import Grid from '@mui/material/Grid2'`
    -   Removed deprecated `item` prop from all Grid components (Grid2 infers grid items automatically)
    -   Preserved all responsive layout props (`xs`, `md`, `spacing`, `sx`, etc.)
    -   **Files migrated**: dashboard, buyer, wholesale, trade, cart, checkout, orders, settings, analytics, wallet, campaigns, newsletter, meta-ads, admin, help, bulk-upload, and all storefront pages
-   **Apollo Client SSR Fix**: Updated Next.js 14 App Router Apollo Client setup using `@apollo/experimental-nextjs-app-support`
    -   Replaced standard Apollo classes with NextSSRApolloClient, NextSSRInMemoryCache, SSRMultipartLink
    -   Fixed lib/apollo-client.ts → lib/apollo-client.tsx (JSX syntax requires .tsx extension)
-   **Status**: All Grid2 migrations verified (0 deprecated Grid patterns remaining) ✅

### October 2025 - Multi-Environment Deployment Setup
-   **Deployment Infrastructure**: Configured three-environment deployment strategy (Replit dev, Replit staging, Local Docker, AWS production)
-   **Docker Configuration**: Created multi-stage Dockerfile supporting both local development and AWS production deployment
-   **Local Development**: Updated docker-compose.yml for offline development with PostgreSQL container and hot-reload
-   **Documentation**: Comprehensive deployment guides (DEPLOYMENT.md, AWS-DEPLOYMENT.md, REPLIT-STAGING-SETUP.md, QUICK-START.md)
-   **Platform Dependencies**: Fixed platform-specific binary handling for esbuild and rollup in Docker Linux x64 environment
-   **Database Persistence**: Fixed docker-compose to preserve database data (removed --force-reset flag)
-   **Status**: All environments documented and ready to use ✅

### October 2025 - Test Infrastructure Enhancement
-   **Test Suite Expansion**: Added 93+ test cases across 7 test files to catch runtime issues before production
    -   Wallet contract tests (API shape validation)
    -   Wallet integration tests (failure condition handling)
    -   Stripe Connect tests (configuration + state validation)
    -   Stripe Connect UI tests (race condition prevention) ✨ **CAUGHT REAL BUG**
    -   Currency propagation tests (multi-platform consistency)
    -   Order route tests (blank screen prevention)
    -   **Subscription flow tests** (webhooks, sync, Socket.IO) ✨ **NEW**
-   **Real Bugs Caught & Fixed**:
    -   **Bug #1**: Stripe Connect modal never appeared after currency selection (race condition in user data refetch)
    -   **Bug #2**: "Continue to Stripe Setup" button not working (conditional rendering removed, store accountId in state)
    -   **Bug #3**: Subscription customer ID not saved after checkout ✨ **FIXED**
        - **Root Cause**: `checkout.session.completed` webhook saved subscription ID but not `stripeCustomerId`
        - **Fix**: Updated webhook handler (line 229 in stripe-webhook.service.ts) to save `stripeCustomerId: session.customer`
        - **Impact**: Subscription sync endpoint now works correctly after checkout completion
        - **Test**: Created comprehensive subscription flow test (server/__tests__/subscription-flow.spec.ts)
    -   **Bug #4**: Stripe Connect onboarding race condition ✨ **FIXED**
        - **Root Cause**: Backend queried database for accountId before frontend's account creation completed
        - **Fix**: Backend now accepts optional `accountId` parameter, frontend passes it directly to eliminate database lookup
        - **Impact**: Eliminates "No Stripe account found" error when opening onboarding modal
        - **Files**: server/routes.ts, server/services/stripe-connect.service.ts, client/src/components/stripe-onboarding-modal.tsx
-   **Subscription Socket.IO Integration** ✨ **NEW**: 
    -   Added `settings:subscription_updated` event emitted on all subscription status changes
    -   Webhook handlers now emit Socket.IO events for: checkout completion, subscription created/updated/deleted, invoice payment success/failure
    -   Sync endpoint emits Socket.IO event after manual sync
    -   Frontend listener automatically invalidates React Query cache for subscription status
    -   Connection metrics now track subscription events separately
-   **Subscription Sync Improvements** ✨ **NEW**:
    -   Fixed "Sync Subscription" button to handle missing `stripeCustomerId` gracefully
    -   Changed endpoints to return 200 status with `success: false` instead of 404 (allows frontend to show helpful messages)
    -   Better error messages: "No subscription found. Please complete the checkout process first."
-   **Pessimistic Mock System**: Default-to-failure mocks requiring explicit opt-in to success paths (tests/setup/pessimistic-mocks.ts)
-   **Currency Centralization**: ESLint rule enforcing all currency values imported from shared/config/currency.ts
-   **CI/CD Pipeline**: Non-blocking test gates detecting schema drift and regressions (.github/workflows/test-suite.yml)
-   **Documentation**: Comprehensive implementation roadmap (docs/TEST-INFRASTRUCTURE-STATUS.md, docs/TEST-SUITE-SUMMARY.md)
-   **Status**: Infrastructure complete, actively catching production bugs ✅

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