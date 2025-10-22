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