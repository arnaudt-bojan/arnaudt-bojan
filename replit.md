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

### October 2025 - Material UI v7 Grid Component Migration
-   **Grid Component Upgrade**: Migrated all 34 frontend pages from deprecated GridLegacy to updated Grid component (MUI v7)
    -   **Import change**: `import { Grid } from '@mui/material'` → `import Grid from '@mui/material/Grid'`
    -   **Removed deprecated props**: All `item` props removed (Grid auto-infers grid items in v7)
    -   **API change**: Responsive props now use `size` prop: `<Grid xs={12} md={6}>` → `<Grid size={{ xs: 12, md: 6 }}>`
    -   **Migration scope**: 270 Grid instances converted across 34 files
    -   **Source**: Official MUI v7 documentation at mui.com/material-ui/migration/upgrade-to-grid-v2/
    -   **Files**: dashboard, buyer, wholesale, trade, cart, checkout, orders, settings, analytics, wallet, campaigns, newsletter, meta-ads, admin, help, bulk-upload, storefront pages

### October 2025 - Monorepo Development Workflow Setup
-   **Created dev.sh script**: Orchestrates concurrent execution of NestJS backend + Next.js frontend
    -   Uses `concurrently` package to run both services with labeled output
    -   Backend: `npm run start:dev --workspace=@upfirst/backend` (NestJS watch mode)
    -   Frontend: `npm run dev --workspace=@upfirst/frontend` (Next.js dev mode on port 3000)
-   **Workflow configuration**: Requires manual update to `.replit` file (see WORKFLOW_UPDATE_REQUIRED.md)
    -   Change `args = "npm run dev"` → `args = "./dev.sh"`
    -   Change `waitForPort = 5000` → `waitForPort = 3000`

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