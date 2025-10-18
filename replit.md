# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform empowering creators and brands with individual, subdomain-based storefronts. It supports various product types (in-stock, pre-order, made-to-order, wholesale) and offers features like product management, shopping cart, authenticated checkout, a robust seller dashboard, and AI-optimized social media advertising integration. The platform includes B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and a comprehensive tax system. Upfirst aims to be a scalable, secure, and modern D2C solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst utilizes a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend, with an Express.js Node.js backend, PostgreSQL (Neon), and Drizzle ORM.

**Core Architectural Principle: Three Parallel Platforms**
Upfirst is architected as three distinct, parallel platforms:
1.  **B2C Platform** (Retail/Direct-to-Consumer): Individual storefronts, shopping cart, checkout, order management, and a dedicated seller dashboard.
2.  **B2B Platform** (Wholesale): Invitation-based buyer access, MOQ enforcement, deposit/balance payments, and a separate dashboard.
3.  **Trade Platform** (Professional Quotations): Excel-like quotation builder, token-based buyer access, status tracking, and its own dashboard.

All business logic follows a server-side-only approach (Architecture 3).

**Mandatory Architectural Principles:**

**Architecture 3: Server-Side Business Logic Only**
- All calculations, business logic, and data transformations MUST occur server-side.
- Client displays server-provided data without performing calculations.
- Zero client-side arithmetic for business-critical operations.

**Mobile-First Design Standards (Mandatory)**
All new pages, popups, components, forms, and features MUST follow these mobile-first design rules, ensuring responsiveness across devices. Key patterns include:
1.  **Table-to-Card Conversion Pattern (Dual-View)**: Tables for desktop, cards for mobile, displaying identical data.
2.  **Dialog/Modal Responsive Pattern**: Dialogs must be scrollable, use responsive widths, and have stacking footers/full-width buttons on mobile.
3.  **Form Responsive Layouts**: Forms use single-column layouts on mobile, expanding to multiple columns on larger screens.
4.  **Button Groups & Action Buttons**: Buttons stack vertically and become full-width on mobile.
5.  **Breakpoint Standards**: Consistent use of Tailwind's `sm:`, `md:`, `lg:` for responsive design.
6.  **Grid Layouts**: Flexible grids adapting to screen size, preventing horizontal scroll.
7.  **Typography & Spacing**: Responsive text sizes and padding for touch-friendly interfaces.
8.  **Data Display Rules**: Complex data uses dual-view patterns; images are full-width on mobile.
9.  **Navigation Patterns**: Hamburger menus or collapsible sidebars for mobile; expanded navigation for desktop.

**UI/UX Decisions:**
The design system supports dark/light mode, uses the Inter font, and emphasizes consistent spacing, typography, and a mobile-first responsive approach. Navigation is dashboard-centric, and storefronts are customizable with seller branding.

**Technical Implementations:**
-   **Backend:** Service layer pattern with dependency injection.
-   **Product Management:** Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import.
-   **Shipping:** Centralized `ShippingService` integrating Free Shipping, Flat Rate, Matrix Shipping, and real-time API rates.
-   **Shopping & Checkout:** Features slide-over cart, guest checkout, server-side shipping cost calculation, and single-seller per cart.
-   **Authentication & Authorization:** Email-based with dual-token system and capability-based authorization.
-   **Payment Processing:** Integrated with Stripe Connect for multi-seller payments.
-   **Subscription System:** Monthly/annual seller subscriptions managed via Stripe, including a 30-day trial.
-   **Multi-Currency Support:** IP-based detection with user-selectable currency and real-time exchange rates. Strict separation between seller-side (no conversion) and buyer-side (with conversion) pricing displays.
-   **Wholesale B2B System:** Invitation-based access, variant-level MOQ, percentage deposit system, Net 30/60/90 payment terms, multi-image product galleries, 3-level category hierarchy, SKU auto-generation, dual readiness options, and comprehensive order lifecycle management.
-   **Trade Quotation System:** Customizable quotation numbers, professional invoice structure, 8 standard Incoterms, data sheet/T&C document uploads, excel-like line item builder, server-side pricing validation, deposit/balance payment flows, and secure token-based buyer access.
-   **Social Ads System:** Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
-   **Inventory Management:** Production-ready transaction-based stock reservation with atomic operations and PostgreSQL row-level locking.
-   **Cart Reservation System:** Enterprise-grade "soft hold" system with PostgreSQL row-level locking, 30-minute expiry, and server-side business logic.
-   **Order Management System:** Comprehensive order lifecycle management with status tracking, refunds, balance payments, and real-time updates.
-   **Delivery Date Display & Reminder System:** Displays delivery dates for pre-order/made-to-order products and automated email reminders for sellers.
-   **Bulk Product Upload System:** Shopify-class bulk upload with CSV import, job tracking, validation, and rollback.
-   **AI-Powered Field Mapping:** Google Gemini AI integration for intelligent CSV column mapping.
-   **Newsletter System:** Enterprise-grade email marketing platform with campaign management, subscriber handling, segmentation, and multi-ESP support.
-   **Meta Ads B2C Platform:** Self-service social advertising system for Meta campaigns, integrating with Meta Marketing API, Gemini AI, and Stripe for payments. Features popup-based OAuth, AI-powered ad copy, Advantage+ optimization, credit-based budget system, and real-time analytics.
-   **AI-Optimized Landing Page:** World-class marketing landing page at `/experience` route featuring platform overview, parallel platform deep-dives, pricing tiers, FAQ, and comparison matrix. Includes custom SEO hooks, structured data, Open Graph/Twitter Card tags, smooth scroll animations, and mobile-responsive navigation.

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