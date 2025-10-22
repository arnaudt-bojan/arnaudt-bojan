# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform designed to empower creators and brands with individual, subdomain-based storefronts. It supports diverse product types (in-stock, pre-order, made-to-order, wholesale) and integrates essential e-commerce functionalities such as product management, shopping cart, authenticated checkout, a comprehensive seller dashboard, and AI-optimized social media advertising. The platform includes B2B wholesale capabilities, multi-seller payment processing, multi-currency support, and an advanced tax system. Its purpose is to deliver a scalable, secure, and modern direct-to-consumer solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file. **MANDATORY: ALL state-changing operations MUST emit Socket.IO events to affected users (see SOCKETIO_USAGE_RULES.md)**.

## System Architecture

### Core Architecture
The platform comprises three distinct, parallel platforms: B2C Retail, B2B Wholesale, and Professional Quotations. All business logic, calculations, and data transformations are strictly implemented server-side. The system is designed mobile-first and is Docker-ready, utilizing a monorepo structure.

### Technology Stack
-   **Frontend**: Next.js 14 with Material UI v7 and Apollo Client.
-   **Backend**: NestJS with GraphQL API (primary) and minimal REST endpoints for health checks.
-   **Database**: PostgreSQL (Neon) with Prisma ORM.
-   **Real-time**: Socket.IO for comprehensive real-time updates across all modules.

### UI/UX Decisions
-   Supports dark/light modes, uses Inter font, and maintains consistent spacing and typography.
-   Emphasizes mobile-first responsive design.
-   Features dashboard-centric navigation.
-   Allows customizable seller branding for storefronts.

### Technical Implementations
-   **Backend**: Leverages NestJS with a service layer, dependency injection, authentication guards, DataLoaders, DTO validation, and a GraphQL schema covering 10 domain modules.
-   **Real-time**: Implements over 50 Socket.IO events for various modules, utilizing room-based targeting and session authentication.
-   **Product Management**: Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import.
-   **Cart & Inventory**: Features enterprise-grade "soft hold" cart reservation with PostgreSQL row-level locking.
-   **Order Management**: Manages the complete order lifecycle, fulfillment, and refunds.
-   **Wholesale B2B**: Provides invitation-based access, variant-level MOQ, percentage deposit, and flexible Net 30/60/90 payment terms.
-   **Trade Quotation**: Offers customizable quotation numbers, professional invoice structures, Incoterms, an Excel-like line item builder, server-side pricing validation, and secure token-based buyer access.
-   **Payments & Subscriptions**: Integrates Stripe Connect for multi-seller payments and recurring subscriptions.
-   **Multi-currency & Tax**: Includes IP-based currency detection, user-selectable options, and an advanced tax system.
-   **Social Ads**: Facilitates multi-platform advertising (Meta, TikTok, X) with AI optimization via Google Gemini.
-   **Email System**: Utilizes transactional templates and enterprise-grade newsletter capabilities.
-   **Custom Domains**: Allows sellers to connect custom domains with DNS verification, SSL, and routing.
-   **Analytics**: Provides a comprehensive seller dashboard with server-side calculations.
-   **Deployment**: Dockerized with multi-stage builds and `docker-compose`.
-   **Monorepo Structure**: Configured with `apps/frontend/` (Next.js 14 + Material UI v7 + SCSS), `apps/backend/` (NestJS + Prisma + GraphQL), and `packages/shared/`.
-   **Build Validation**: Includes comprehensive pre-build validation (codegen, typechecking, linting) with a zero-warnings policy.

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

### October 2025 - Deployment Fixes
-   **Production Build Fix**: Fixed TypeScript compilation failing during deployment
    -   Created `typecheck:build` script in backend using `tsconfig.build.json`
    -   Production builds now exclude test files (apps/backend/test/)
    -   Prevents build failures from missing dev dependencies (nock, vitest)
    -   Updated `prebuild` script to use `typecheck:build` instead of `typecheck`
-   **Production Start Script Fix**: Fixed deployment crash loop ("concurrently: not found")
    -   Updated root `package.json` start and dev scripts to use `npx concurrently`
    -   Ensures `concurrently` executable is found in production environment
    -   Changed: `"start": "concurrently ..."` → `"start": "npx concurrently ..."`
    -   Resolves Replit deployment promote stage crash loop
-   **Backend Start Path Fix**: Fixed backend crash ("Cannot find module dist/apps/backend/src/main")
    -   NestJS builds to `apps/backend/dist/main.js` not `dist/apps/backend/src/main`
    -   Updated backend `start:prod` script: `node dist/apps/backend/src/main` → `node dist/main`
    -   Backend now starts correctly in production
-   **NPX Binary Resolution Fix**: Fixed deployment crash with wrong package versions
    -   Issue: `npx` bypassed local workspace dependencies causing MODULE_NOT_FOUND errors
    -   Issue: `npx next` downloaded Next.js 16.0.0 instead of using local 14.2.33
    -   Issue: `npx concurrently` in root spawned subprocesses without workspace PATH
    -   Solution: Removed `npx` from ALL scripts (root + workspaces) to use local binaries
    -   Changed root: `npx concurrently` → `concurrently`
    -   Changed frontend: `npx next build/start` → `next build/start`
    -   Changed backend: `npx nest build` → `nest build`, `npx prisma` → `prisma`
    -   Local binaries now resolved correctly from workspace node_modules/.bin
    -   **CRITICAL**: npm scripts automatically add node_modules/.bin to PATH, making `npx` unnecessary and problematic in monorepos