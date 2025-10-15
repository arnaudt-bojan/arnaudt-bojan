# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform empowering creators and brands with individual, subdomain-based storefronts. It supports diverse product types (in-stock, pre-order, made-to-order, wholesale) and offers comprehensive features including product management, shopping cart, authenticated checkout, a robust seller dashboard, and AI-optimized social media advertising integration. The platform incorporates B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and a comprehensive tax system. Upfirst aims to be a scalable, secure, and modern D2C solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst utilizes a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend, with an Express.js Node.js backend, PostgreSQL (Neon), and Drizzle ORM.

**UI/UX Decisions:**
The design system supports dark/light mode, uses the Inter font, and emphasizes consistent spacing, typography, and a mobile-first responsive approach. Navigation is dashboard-centric, and storefronts are customizable with seller branding. Product displays feature multi-image support and interactive elements.

**Technical Implementations:**
-   **Backend:** Employs a service layer pattern with dependency injection for business logic abstraction (e.g., `ProductService`, `StripeConnectService`, `WholesaleService`).
-   **Business Mode Toggle:** Sellers can switch between B2C (Retail), B2B (Wholesale), and Trade (Professional) modes within the dashboard, altering context and available routes.
-   **Product Management:** Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import.
-   **Shipping:** Centralized `ShippingService` integrates various methods including Free Shipping, Flat Rate, Matrix Shipping, and real-time Shippo API rates.
-   **Shopping & Checkout:** Features slide-over cart, guest checkout, server-side shipping cost calculation, single-seller per cart constraint, and optimized cart performance.
-   **Authentication & Authorization:** Email-based authentication with a dual-token system and capability-based authorization for seller, buyer, and collaborator roles.
-   **Notification System:** Comprehensive email and in-app notifications with shared templates, powered by Resend.
-   **Payment Processing:** Integrated with Stripe Connect for multi-seller payments, supporting various methods and PCI-DSS compliance.
-   **Subscription System:** Monthly/annual seller subscriptions managed via Stripe, including a 30-day trial.
-   **Multi-Currency Support:** IP-based detection with user-selectable currency and real-time exchange rates.
-   **Wholesale B2B System:** Invitation-based access, variant-level MOQ enforcement, deposit/balance payment splits, freight collect/buyer pickup shipping, and comprehensive order lifecycle management with automated notifications.
-   **Trade Quotation System:** Professional B2B quotation platform with an excel-like builder, server-side pricing validation, deposit/balance payment flows, secure token-based buyer access, and comprehensive status tracking.
-   **Social Ads System:** Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
-   **Item-Level Order Tracking:** Per-item fulfillment system with independent status and tracking.
-   **Document Generation:** Professional PDF invoice and packing slip generation.
-   **Subdomain Architecture:** Environment-aware routing for seller storefronts.
-   **Tax System (B2C):** Automated sales tax calculation via Stripe Tax API.
-   **Pricing Service:** Centralized pricing calculations for consistency and security.
-   **Team Management:** Simplified single-collaborator model with email-based invitations.
-   **Inventory Management:** Production-ready transaction-based stock reservation with atomic operations, PostgreSQL row-level locking, and automatic stock synchronization.
-   **Cart Reservation System:** Implements a "soft hold" pattern with reservations created at checkout, a 30-minute expiry, and automatic release/commit mechanisms.
-   **Order Management System:** Comprehensive order lifecycle management with status tracking, refunds, and balance payments.
-   **Real-Time Order Updates:** WebSocket-based live order synchronization with automatic frontend cache invalidation.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Drizzle ORM
-   **Email Service**: Resend
-   **Payment Gateway**: Stripe SDK
-   **Shipping Service**: Shippo API
-   **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API, Instagram Basic Display API
-   **UI Components**: Shadcn UI
-   **Styling**: Tailwind CSS
-   **State Management**: TanStack Query
-   **Routing**: Wouter
-   **Forms**: React Hook Form
-   **Validation**: Zod
-   **Currency Exchange**: Fawazahmed0 Currency API
-   **PDF Generation**: PDFKit