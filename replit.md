# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform designed to empower creators and brands with individual, subdomain-based storefronts. It supports various product types (in-stock, pre-order, made-to-order, wholesale) and offers comprehensive features including product management, shopping cart, authenticated checkout, a robust seller dashboard, and AI-optimized social media advertising integration. The platform incorporates B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and a comprehensive tax system. Upfirst aims to be a scalable, secure, and modern D2C solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst utilizes a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend, with an Express.js Node.js backend, PostgreSQL (Neon), and Drizzle ORM.

**Core Architectural Principle: Three Parallel Platforms**
Upfirst is architected as three distinct, parallel platforms, not a single unified system:
1.  **B2C Platform** (Retail/Direct-to-Consumer): Individual storefronts at `username.upfirst.io`, shopping cart, checkout, order management, and a dedicated seller dashboard.
2.  **B2B Platform** (Wholesale): Invitation-based buyer access, MOQ enforcement, deposit/balance payments, and a separate dashboard.
3.  **Trade Platform** (Professional Quotations): Excel-like quotation builder, token-based buyer access, status tracking, and its own dashboard.

Each platform has its own routes, pages, and workflows, while services can be shared but must be adapted for specific platform needs. All business logic follows a server-side-only approach (Architecture 3).

**UI/UX Decisions:**
The design system supports dark/light mode, uses the Inter font, and emphasizes consistent spacing, typography, and a mobile-first responsive approach. Navigation is dashboard-centric, and storefronts are customizable with seller branding.

**Technical Implementations:**
-   **Backend:** Service layer pattern with dependency injection for business logic.
-   **Product Management:** Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import with job tracking.
-   **Shipping:** Centralized `ShippingService` integrating Free Shipping, Flat Rate, Matrix Shipping, and real-time API rates.
-   **Shopping & Checkout:** Features slide-over cart, guest checkout, server-side shipping cost calculation, single-seller per cart, and optimized performance.
-   **Authentication & Authorization:** Email-based with dual-token system and capability-based authorization for various roles.
-   **Payment Processing:** Integrated with Stripe Connect for multi-seller payments, supporting various methods and PCI-DSS compliance.
-   **Subscription System:** Monthly/annual seller subscriptions managed via Stripe, including a 30-day trial.
-   **Multi-Currency Support:** IP-based detection with user-selectable currency and real-time exchange rates.
-   **Wholesale B2B System:** Invitation-based access, variant-level MOQ, deposit/balance payment splits, and order lifecycle management.
-   **Trade Quotation System:** Professional B2B quotation platform with an excel-like builder, server-side pricing validation, deposit/balance payment flows, and secure token-based buyer access.
-   **Social Ads System:** Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
-   **Inventory Management:** Production-ready transaction-based stock reservation with atomic operations, PostgreSQL row-level locking, and automatic synchronization.
-   **Cart Reservation System:** Implements a "soft hold" with 30-minute expiry and automatic release/commit mechanisms.
-   **Order Management System:** Comprehensive order lifecycle management with status tracking, refunds, and balance payments, including real-time updates via WebSockets.
-   **Delivery Date Display & Reminder System:** Displays delivery dates for pre-order/made-to-order products and features an automated background service to email sellers 7 days prior to delivery dates with magic link authentication.
-   **Bulk Product Upload System:** Shopify-class bulk upload with comprehensive CSV import, job tracking, validation, and rollback, including URL-safe delimiters and real-time error reporting.
-   **AI-Powered Field Mapping:** Google Gemini AI integration for intelligent CSV column mapping to database schema, enabling universal CSV import compatibility without requiring specific formats.
-   **Newsletter System:** Enterprise-grade email marketing platform with campaign management, subscriber handling, segmentation, compliance, a database-persistent job queue, multi-ESP support, and a rich text editor (TinyMCE).
-   **Meta Ads B2C Platform:** Self-service social advertising system for Meta (Facebook/Instagram) campaigns, integrating with Meta Marketing API, Gemini AI for ad intelligence, and Stripe for payments. Features OAuth, AI-powered ad copy, Advantage+ optimization, 20% Upfirst fee on ad spend, credit-based budget system, real-time analytics, and automated low-balance alerts.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Drizzle ORM
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