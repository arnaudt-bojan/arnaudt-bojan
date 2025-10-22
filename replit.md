# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform designed to empower creators and brands by providing individual, subdomain-based storefronts. It supports a wide range of product types (in-stock, pre-order, made-to-order, wholesale) and integrates essential e-commerce functionalities such as product management, shopping cart, authenticated checkout, a comprehensive seller dashboard, and AI-optimized social media advertising. The platform also includes B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and an advanced tax system, aiming to deliver a scalable, secure, and modern direct-to-consumer solution.

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

### Key Features
-   **UI/UX**: Dark/light modes, Inter font, consistent spacing and typography, mobile-first responsive design, dashboard-centric navigation, customizable seller branding.
-   **Backend Technicals**: NestJS with service layer, dependency injection, authentication guards, DataLoaders, and comprehensive DTO validation (`class-validator`). GraphQL schema covers 10 domain modules.
-   **Real-time Features**: 50+ Socket.IO events for various modules, utilizing room-based targeting and requiring session authentication.
-   **Product Management**: Supports diverse product types, simplified size-first variants, multi-image uploads, bulk CSV import.
-   **Cart & Inventory**: Enterprise-grade "soft hold" cart reservation with PostgreSQL row-level locking.
-   **Order Management**: Comprehensive order lifecycle, fulfillment, and refunds.
-   **Wholesale B2B**: Invitation-based access, variant-level MOQ, percentage deposit, Net 30/60/90 terms.
-   **Trade Quotation**: Customizable quotation numbers, professional invoice structure, Incoterms, Excel-like line item builder, server-side pricing validation, secure token-based buyer access.
-   **Payments & Subscriptions**: Stripe Connect for multi-seller payments and recurring subscriptions.
-   **Multi-currency & Tax**: IP-based currency detection, user-selectable options, advanced tax system.
-   **Social Ads**: Multi-platform (Meta, TikTok, X) advertising with AI optimization (Google Gemini).
-   **Email System**: Transactional templates and enterprise-grade newsletter capabilities via Resend.
-   **Custom Domains**: Sellers can connect custom domains with DNS verification, SSL, and routing.
-   **Analytics**: Comprehensive seller dashboard with server-side calculations.
-   **Deployment**: Dockerized with multi-stage builds and `docker-compose`.

## Recent Changes

### October 2025 - NestJS Build Configuration & Prisma Integration Fix
-   **NestJS Build Structure**: Fixed nested dist output structure preventing application startup
    -   Removed `rootDir` from `apps/backend/tsconfig.json` to allow imports from root `/server` directory
    -   Updated `apps/backend/package.json` start scripts to use correct dist path: `dist/apps/backend/src/main`
    -   Created `tsconfig.build.json` for NestJS build configuration
    -   Updated `nest-cli.json` with proper entry file configuration
-   **Prisma Client Integration**: Migrated to standard node_modules generation
    -   Removed custom `output` path from `prisma/schema.prisma` generator
    -   Prisma now generates to standard `node_modules/@prisma/client` location
    -   Updated all Prisma imports across backend to use `@prisma/client`
    -   Updated DataLoader type annotations with explicit return types for type safety
    -   Fixed wholesale-rules Map typing to use proper `wholesale_products` type
-   **Result**: Application now starts successfully with zero TypeScript errors
    -   Backend: NestJS GraphQL API running on port 4000
    -   Frontend: Next.js dev server running on port 3000
    -   Build validation pipeline fully functional with clean builds

### October 2025 - TypeScript & npm Configuration Cleanup
-   **TypeScript Deprecation Warnings Fixed**: Suppressed deprecation warnings for TypeScript 5.x
    -   Added `"ignoreDeprecations": "5.0"` to `tsconfig.json` and `apps/backend/tsconfig.json`
    -   Suppresses warnings about `baseUrl` and `moduleResolution: "node"` deprecations
    -   These options remain functional until TypeScript 7.0
    -   Migration plan documented in `TSCONFIG_NPM_FIXES.md`
-   **npm Warnings Eliminated**: Removed redundant optional dependency configuration
    -   Removed `optional=true` and `include=optional` from `.npmrc`
    -   These were redundant with npm default behavior and causing warnings
    -   Build process now runs completely clean

### October 2025 - Build Validation Pipeline
-   **Pre-Build Validation**: Build process now includes comprehensive validation before compilation
    -   **Frontend**: `prebuild` hook runs codegen → typecheck → lint (with --max-warnings=0)
    -   **Backend**: `prebuild` hook runs typecheck
    -   **Early Failure**: Build fails immediately on any TypeScript errors or ESLint warnings
    -   **Zero Warnings Policy**: ESLint configured with `--max-warnings=0` to enforce clean code
    -   **Documentation**: Added `BUILD_VALIDATION.md` with detailed build pipeline documentation

### October 2025 - TypeScript & ESLint Cleanup
-   **Zero Errors**: Fixed all 34+ TypeScript errors across frontend codebase
    -   Cart items now use `productId` instead of `id` (matches GraphQL schema)
    -   Migrated from custom interfaces to GraphQL generated types
    -   Extended interfaces where GraphQL types were missing properties
    -   Fixed MUI Select onChange handlers with proper type signatures
-   **Zero Warnings**: Fixed all 40+ ESLint warnings
    -   Removed unused imports, variables, and type definitions
    -   Eliminated all `any` types in favor of proper TypeScript interfaces
    -   Prefixed unused variables with underscore per ESLint rules
-   **Critical Fix**: Restored Stripe requirements warning by using snake_case `currently_due` property

### October 2025 - Apollo Client v4 Migration & GraphQL Code Generator Setup
-   **Apollo Client v4 Integration**: Migrated from deprecated experimental package to production-ready Apollo Client v4
    -   **Package**: Installed `@apollo/client-integration-nextjs` (v0.14.0) for Next.js App Router support
    -   **Import Structure**: Fixed Apollo Client v4 import paths across 34 files
        - React hooks: `@apollo/client/react` (useQuery, useMutation, etc.)
        - gql template: `@apollo/client/core`
        - Error types: `@apollo/client/errors`
    -   **Centralized Wrapper**: Created `apps/frontend/lib/apollo-client.tsx` to re-export all Apollo hooks/utilities
    -   **Migration Scope**: Updated all 34 components to import from centralized wrapper
-   **GraphQL Query Refactoring**: Eliminated duplicate operation names blocking code generation
    -   **Shared Query Structure**: Created 10 domain-organized shared files
        - Queries: user, products, orders, cart, wholesale, trade-quotations (6 files)
        - Mutations: products, cart, orders, wholesale (4 files)
    -   **Deduplication**: Removed duplicate queries (GetCurrentUser, ListProducts, GetOrder, etc.)
    -   **Schema Validation**: Fixed 72+ field mismatches by comparing against `docs/graphql-schema.graphql`
    -   **Migration Scope**: Updated 20+ component files to use shared queries
-   **GraphQL Code Generator**: Full type-safe GraphQL operations
    -   **Configuration**: `apps/frontend/codegen.ts` using client preset
    -   **Generated Output**: TypeScript types in `apps/frontend/lib/generated/`
    -   **Scalars**: Configured DateTime, Decimal, JSON, URL mappings
    -   **Exclusions**: Temporarily excluded meta-ads and wholesale-products pages (schema drift)
    -   **Status**: ✅ Zero duplicate operation name errors, codegen runs successfully
-   **Backend Fixes**: Added `npx` prefix to all nest commands in `apps/backend/package.json` to resolve permission errors

### October 2025 - Material UI v7 Grid Component Migration
-   **Grid Component Upgrade**: Migrated all 34 frontend pages from deprecated GridLegacy to updated Grid component (MUI v7)
    -   **Import change**: `import { Grid } from '@mui/material'` → `import Grid from '@mui/material/Grid'`
    -   **Removed deprecated props**: All `item` props removed (Grid auto-infers grid items in v7)
    -   **API change**: Responsive props now use `size` prop: `<Grid xs={12} md={6}>` → `<Grid size={{ xs: 12, md: 6 }}>`
    -   **Migration scope**: 270 Grid instances converted across 34 files
    -   **Source**: Official MUI v7 documentation at mui.com/material-ui/migration/upgrade-to-grid-v2/
    -   **Files**: dashboard, buyer, wholesale, trade, cart, checkout, orders, settings, analytics, wallet, campaigns, newsletter, meta-ads, admin, help, bulk-upload, storefront pages

### October 2025 - Monorepo Development Workflow Setup
-   **Updated npm dev script**: Orchestrates concurrent execution of NestJS backend + Next.js frontend
    -   Uses `concurrently` package to run both services with labeled output
    -   Backend: `npm run start:dev --workspace=@upfirst/backend` (NestJS watch mode)
    -   Frontend: `npm run dev --workspace=@upfirst/frontend` (Next.js dev mode on port 3000)
-   **Configuration**: Requires manual updates to 2 protected files (see WORKFLOW_UPDATE_REQUIRED.md)
    -   `package.json`: Update "dev" script to use concurrently with workspace commands
    -   `.replit`: Change `waitForPort` from 5000 to 3000 (Next.js frontend port)

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