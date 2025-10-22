# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform empowering creators and brands with individual, subdomain-based storefronts. It supports various product types (in-stock, pre-order, made-to-order, wholesale) and integrates essential e-commerce functionalities like product management, shopping cart, authenticated checkout, a comprehensive seller dashboard, and AI-optimized social media advertising. The platform includes B2B wholesale capabilities, multi-seller payment processing, multi-currency support, and an advanced tax system, aiming to deliver a scalable, secure, and modern direct-to-consumer solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file. **MANDATORY: ALL state-changing operations MUST emit Socket.IO events to affected users (see SOCKETIO_USAGE_RULES.md)**.

## System Architecture

### Core Architecture
The platform features three distinct, parallel platforms with all business logic strictly implemented server-side: B2C Retail, B2B Wholesale, and Professional Quotations. All calculations, business logic, and data transformations must occur server-side. The system is designed mobile-first and is Docker-ready.

### Technology Stack
-   **Frontend**: Next.js 14 with Material UI v7 and Apollo Client.
-   **Backend**: NestJS GraphQL API and Socket.IO, with an Express.js REST API for authentication and legacy support.
-   **Database**: PostgreSQL (Neon) with Prisma ORM.
-   **Real-time**: Socket.IO for comprehensive real-time updates across all modules.

### UI/UX Decisions
-   Dark/light modes, Inter font, consistent spacing and typography.
-   Mobile-first responsive design.
-   Dashboard-centric navigation.
-   Customizable seller branding.

### Technical Implementations
-   **Backend**: NestJS with service layer, dependency injection, authentication guards, DataLoaders, DTO validation (`class-validator`), and a GraphQL schema covering 10 domain modules.
-   **Real-time**: Over 50 Socket.IO events for various modules, utilizing room-based targeting and session authentication.
-   **Product Management**: Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import.
-   **Cart & Inventory**: Enterprise-grade "soft hold" cart reservation with PostgreSQL row-level locking.
-   **Order Management**: Comprehensive order lifecycle, fulfillment, and refunds.
-   **Wholesale B2B**: Invitation-based access, variant-level MOQ, percentage deposit, Net 30/60/90 terms.
-   **Trade Quotation**: Customizable quotation numbers, professional invoice structure, Incoterms, Excel-like line item builder, server-side pricing validation, secure token-based buyer access.
-   **Payments & Subscriptions**: Stripe Connect for multi-seller payments and recurring subscriptions.
-   **Multi-currency & Tax**: IP-based currency detection, user-selectable options, and an advanced tax system.
-   **Social Ads**: Multi-platform (Meta, TikTok, X) advertising with AI optimization (Google Gemini).
-   **Email System**: Transactional templates and enterprise-grade newsletter capabilities.
-   **Custom Domains**: Sellers can connect custom domains with DNS verification, SSL, and routing.
-   **Analytics**: Comprehensive seller dashboard with server-side calculations.
-   **Deployment**: Dockerized with multi-stage builds and `docker-compose`.
-   **Monorepo Structure**: Configured with `apps/frontend/` (Next.js 14 + Material UI v7 + SCSS), `apps/backend/` (NestJS + Prisma + GraphQL), and `packages/shared/`.
-   **Build Validation**: Comprehensive pre-build validation including codegen, typechecking, and linting with a zero-warnings policy.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Prisma ORM
-   **Email Service**: Resend
-   **Payment Gateway**: Stripe SDK
-   **Shipping Service**: Shippo API
-   **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API
-   **AI Services**: Google Gemini API
-   **UI Components**: Material UI v7
-   **WebSocket**: Socket.IO

## Recent Changes

### October 2025 - Test Organization & Cleanup
-   **Test Infrastructure Reorganization**: Organized tests by workspace and removed all obsolete files
    -   Migrated backend test mocks to `apps/backend/test/mocks/` (Stripe, PayPal, Resend, message queue)
    -   Kept E2E tests in root `tests/e2e/` (test full Next.js + NestJS integration)
    -   Removed obsolete vitest files (vitest not installed, backend uses Jest)
    -   Removed build artifacts: `tests/frontend/routes-manifest.json` (obsolete)
    -   Removed unused `scripts/auto-debug.ts` (not in package.json)
    -   Archived test documentation: Summary files moved to `docs/archive/test-summaries/`
-   **Backend Test Infrastructure**: Created proper documentation
    -   Added `apps/backend/test/README.md` documenting Jest-based testing
    -   Mock services available for Stripe, PayPal, Resend, and message queue
    -   Test utilities and setup files configured for NestJS testing
-   **Clean Test Structure**: Final organization
    -   `tests/e2e/` - Playwright E2E tests (testing full app integration)
    -   `apps/backend/test/` - Backend Jest tests, mocks, and utilities
    -   All obsolete files removed (45+ vitest files, auto-debug tools)
-   **Validation Results**: All systems operational
    -   Dev Environment: ✅ Running (Backend port 4000, Frontend port 3000)
    -   TypeScript Check: ✅ Zero errors
    -   LSP Diagnostics: ✅ Zero errors
    -   E2E Tests: ✅ Playwright framework ready in `tests/e2e/`

### October 2025 - Comprehensive Configuration Cleanup
-   **Root Configuration Updates**: Fixed all references to deleted legacy directories
    -   Updated `tsconfig.json`: Removed `client/`, `server/`, `shared/` includes; Added `scripts/**/*`, `packages/shared/**/*`
    -   Updated path aliases: Removed `@/*`, `@shared/*`; Added `"@upfirst/shared": ["./packages/shared"]`
    -   Removed `vite/client` types from root tsconfig
-   **Deleted Obsolete Test Configs**: Removed unused/redundant test configuration files
    -   Deleted `vitest.config.ts` (vitest not used, referenced deleted paths)
    -   Deleted `jest.config.js` (backend has its own at `apps/backend/test/jest-e2e.json`)
    -   Deleted `playwright.config.optimized.ts` (duplicate of `playwright.config.ts`)
    -   Deleted `tests/setup/vitest-setup.ts` (vitest not installed)
-   **CI Workflow Updates**: Updated `.github/workflows/test-suite.yml`
    -   Removed all references to deleted `server/__tests__/` directory
    -   Updated to use monorepo workspace test commands
    -   Updated Stripe config checks to reference `apps/frontend/` and `apps/backend/`
-   **Restored Missing Dependencies**: Installed required packages for E2E testing
    -   Installed `@playwright/test` (for E2E tests in `tests/e2e/`)
    -   Installed `glob` (for scripts utilities)
-   **Validation Results**: All build systems operational
    -   TypeScript Check: ✅ Zero errors (`npm run check`)
    -   LSP Diagnostics: ✅ Zero errors
    -   Backend: ✅ NestJS running on port 4000
    -   Frontend: ✅ Next.js running on port 3000
    -   Playwright: ✅ E2E test framework ready
-   **Known Issue**: `package.json` scripts (system protected - requires manual fix)
    -   Line 17: `"start"` references `server/index.ts` (deleted) - Should use `npm run start:prod --workspace=@upfirst/backend`
    -   Line 23: `"db:seed"` references `server/scripts/seed.ts` (deleted) - Should be removed or updated

### October 2025 - Shared Package Export Structure Fix
-   **Eliminated Duplicate Exports**: Fixed TypeScript build errors caused by duplicate exports in `packages/shared`
    -   Removed duplicate export of `prisma-types.ts` from `index.ts` (already re-exported by `schema.ts`)
    -   Fixed import paths in `schema.ts` from `@shared/` aliases to relative paths (`./prisma-types`, `./validation-schemas`)
    -   Corrected Prisma import path in `prisma-types.ts` from `../generated/prisma` to `../../generated/prisma`
    -   Removed duplicate `formatCurrency` function from `pricing-service.ts` (consolidated in `config/currency.ts`)
    -   Simplified `index.ts` export strategy: `schema.ts` acts as compatibility layer, `index.ts` exports schema + utilities
-   **Build Validation Success**: All pre-build validation steps passing
    -   GraphQL Codegen: ✅ Generated types successfully
    -   TypeScript Check: ✅ Zero errors (`tsc --noEmit`)
    -   ESLint: ✅ Zero warnings (`--max-warnings=0`)
    -   Dev Environment: ✅ Backend (port 4000) + Frontend (port 3000) running without errors
    -   Production Build: ✅ Pre-build validation complete (codegen → typecheck → lint)
-   **Export Strategy**: Clean monorepo module organization
    -   `schema.ts`: Compatibility layer re-exporting Prisma types and validation schemas
    -   `index.ts`: Single entry point exporting schema and utility modules (no duplicates)
    -   All imports use relative paths (no `@shared/` aliases within package)
    -   `pricing-service.ts` marked for deprecation once all references removed

### October 2025 - Legacy Code Cleanup & Backend Migration
-   **Backend Domain Services Migration**: Completed migration from legacy server/ directory to proper NestJS structure
    -   Created `DomainError` class at `apps/backend/src/common/errors/domain-error.ts`
    -   Created `logger` utility at `apps/backend/src/common/utils/logger.ts`
    -   Migrated cache functionality to `apps/backend/src/modules/cache/cache.service.ts`
    -   Created `OrderDomainService` at `apps/backend/src/modules/orders/domain/orders.domain-service.ts`
    -   Updated all backend imports to use proper NestJS module paths (eliminated `../../../../../server/` references)
    -   Added `invalidate()` method to CacheService for domain service cache invalidation
-   **Comprehensive Cleanup**: Removed all legacy, redundant, and unused files
    -   Deleted legacy directories: `client/`, `server/`, `shared/` (replaced by `apps/frontend`, `apps/backend`, `packages/shared`)
    -   Removed corrupted backup: `node_modules_corrupted_1761031198/`
    -   Deleted 6 unused config files: `tailwind.config.ts`, `tsconfig.server.json`, `components.json`, `*.backup` files, `Dockerfile.legacy`
    -   Removed 17 screenshot files from root directory
    -   Archived 53 historical documentation files to `docs/archive/`
    -   Kept 7 essential docs in root: `replit.md`, `BUILD_VALIDATION.md`, `SOCKETIO_USAGE_RULES.md`, `DEPLOYMENT_GUIDE.md`, `AWS-DEPLOYMENT.md`, `DOCKER_SETUP.md`, `design_guidelines.md`
    -   Removed test CSV files: `test-shopify.csv`, `test-woocommerce.csv`
-   **Result**: Clean monorepo structure with proper NestJS architecture
    -   Backend follows NestJS module patterns ✅
    -   Zero TypeScript errors ✅
    -   Zero runtime errors ✅
    -   Clean root directory with only essential files ✅
    -   All historical documentation preserved in `docs/archive/` ✅

### October 2025 - Vite Removal & Monorepo Build System
-   **Vite Dependencies Removed**: Eliminated unused Vite build system (monorepo uses Next.js + NestJS)
    -   Removed dependencies: `vite`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal`
    -   Deleted `vite.config.ts` and `server/vite.ts` (legacy middleware)
    -   Updated `server/index.ts` to remove Vite imports (`setupVite`, `serveStatic`)
    -   Added inline `log()` function to replace imported logger
    -   Total: 4 packages removed from dependency tree
-   **Build System Clarification**: Project now exclusively uses:
    -   **Development**: Monorepo apps via `npm run dev` (NestJS backend + Next.js frontend)
    -   **Frontend**: Next.js 14 with built-in dev server and production build
    -   **Backend**: NestJS with TypeScript watch mode and production compilation
    -   No Vite configuration or middleware required
-   **Verification**: Application runs successfully without Vite
    -   Backend: NestJS GraphQL API on port 4000 ✅
    -   Frontend: Next.js dev server on port 3000 ✅
    -   Zero TypeScript errors ✅
    -   Zero runtime errors ✅