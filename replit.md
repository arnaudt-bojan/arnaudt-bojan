# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C (Direct-to-Consumer) e-commerce platform for creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. Each seller operates an isolated storefront via subdomain (`username.upfirst.io` in production) with no cross-seller discovery. The platform offers product browsing, a shopping cart, authenticated checkout, and a comprehensive seller dashboard. Key features include a B2B wholesale system, AI-optimized social media advertising integration, and robust multi-seller payment processing via Stripe Connect. It aims to be a seamless, modern, and scalable D2C solution with strong security, multi-currency support, and a comprehensive tax system.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst uses a modern web stack with React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend, utilizing TanStack Query and React Context for state management, and Wouter for routing. Forms are handled by React Hook Form with Zod validation. The backend is an Express.js, Node.js application, with PostgreSQL (Neon) and Drizzle ORM for data persistence.

**UI/UX Decisions:**
- **Design System**: Supports dark/light mode, Inter font family, consistent spacing and typography, and mobile-first responsive design.
- **Navigation**: Dashboard-centric design with consistent navigation; desktop uses a header, mobile uses a burger menu.
- **Product Display**: Multi-image support with interactive carousels and color-coded product types.
- **Dashboard Design**: Seller dashboard includes revenue analytics and order management; buyer dashboard offers order tracking.
- **Storefront Branding**: Displays store logo > Instagram username > seller name as fallback.

**System Design Choices & Feature Specifications:**
- **Product Management**: Supports diverse product types (in-stock, pre-order, made-to-order, wholesale) with multi-image uploads, bulk CSV import, and a simplified size-first variant system. Includes a flexible shipping system with package presets, international carrier templates, and zone-based matrices.
- **Shopping & Checkout**: Features a slide-over and persistent cart, guest checkout, and automatic server-side shipping cost calculation, enforcing a single-seller constraint per cart.
- **Authentication & Authorization**: Email-based authentication with a dual-token system (6-digit codes and magic links). Implements a capability-based authorization service with resource-scoped permissions for multiple user types (seller, buyer, collaborator).
- **Notification System**: Comprehensive, refactored email notifications using Resend with dark mode compatibility and templated messages.
- **Payment Processing**: Integrated with Stripe Connect for multi-seller payments, supporting various methods and country-selectable seller onboarding. Users select their country before account creation (cannot be changed later), preventing auto-detected country lock-in. Includes PCI-DSS compliant saved addresses and payment methods.
  - **Payment Method Sync**: Subscription payment methods from Stripe Checkout are automatically saved to `saved_payment_methods` table and marked as default, ensuring database stays in sync with Stripe subscription default
- **Subscription System**: Monthly/annual subscription model for sellers with credit card required for 30-day trial activation, managed via Stripe
  - **Trial Flow**: Store starts inactive → Stripe Checkout with card on file → 30-day trial granted via webhook
  - **Status Handling**: Stripe 'trialing' status maps to 'trial' (not 'active') for correct UI state
  - **Cancellation UX**: Clear "Trial Ending - No Charges" messaging when canceled during trial, with store deactivation warning
- **Multi-Currency Support**: IP-based currency detection with user-selectable currency, real-time exchange rates (Fawazahmed0 Currency API), and backend-driven seller-specific currency display. Includes prominent currency disclaimers on product pages, cart, and checkout informing buyers that displayed prices are estimates and actual charges will be in the seller's local currency (Stripe country currency).
- **Wholesale B2B System**: Invitation-only access for managing wholesale products and orders.
- **Social Ads System**: Multi-platform social advertising (Meta, TikTok, X) with AI optimization.
- **Item-Level Order Tracking**: Comprehensive per-item fulfillment system with independent status, tracking, and automated buyer notifications.
- **Document Generation System**: Professional PDF invoice and packing slip generation (B2C and wholesale templates).
- **Subdomain Architecture**: Environment-aware routing for seller storefronts (`username.upfirst.io` in production, `/s/username` in dev) with smart navigation between domains.
- **Tax System (B2C)**: Automated sales tax calculation via Stripe Tax for B2C transactions.
- **Pricing Service & Fail-Safe System**: Centralized pricing calculations for consistency and security.
- **Team Management**: Role-based access (owner, admin, editor, viewer) with invitation-based team expansion and granular permissions.
- **Platform Admin Dashboard**: Comprehensive dashboard for Upfirst platform owners.
- **Storefront Customization**: Sellers can add About Story, contact info, and social media links.
- **Settings Page Organization**: Streamlined seller settings with three tabs:
  - **Quick Setup**: Default landing tab for sellers with step-by-step checklist guiding through required setup tasks, consolidating essential store setup in one location (username/domain, logo upload, banner upload, Instagram connection, storefront preview)
  - **Profile**: Personal and company information with optional company fields (Company Name, Business Type, Tax ID) that auto-populate from Stripe Connect account data when available
  - **Branding & Policies**: Shipping and returns policy management only (formerly Branding tab)
  - **Stripe Connect Auto-Population**: When sellers connect their Stripe account, company name and business type are automatically populated from Stripe account data (business_profile.name or company.name, business_type), preserving any user-entered values
- **Inventory Management System**: Transaction-based stock reservation system with atomic operations, PostgreSQL row-level locking, and variant-level race protection
  - **Core**: Service-oriented design (`InventoryService`) with atomic operations using SELECT FOR UPDATE
  - **Variant Protection**: Row-level locking protects entire variants JSONB array; reservations filter by exact variantId (e.g., "large-red"); available stock = variant.stock - SUM(active reservations for that variantId)
  - **Critical Requirement**: When reserving stock for products with variants, variantId MUST be supplied to ensure correct variant is locked
  - **Three-Layer Release Defense**: Primary (checkoutSessionId), Fallback (order items matching), Cleanup Job (5min intervals)
  - **Payment Flow**: Reserve → (Success = Commit + Decrement) OR (Failure = Release) OR (Expiration = Auto-Release)
- **Order Management System**: Comprehensive order lifecycle management with status tracking, refunds, shipping updates, and balance payments
  - **Core Methods**: `updateOrderStatus` (status changes + document generation), `processRefund` (full/partial with Stripe), `updateTracking` (shipping updates + notifications), `requestBalancePayment` (pre-order balance collection)
  - **Storage Abstraction**: All order operations use IStorage interface only - no direct Drizzle table imports in services
  - **Refund Handling**: Supports full order and item-level partial refunds with automatic Stripe processing and order item tracking updates
  - **Balance Payments**: Creates separate Stripe payment intents for pre-order balance collection with automatic currency handling
  - **Payment Webhook**: Stripe `payment_intent.succeeded` webhook updates order with currency-aware amount conversion supporting zero-decimal (JPY, divisor=1), two-decimal (USD/GBP/EUR, divisor=100), and three-decimal (BHD, divisor=1000) currencies; uses `amount_received` for actual captured funds
  - **Email Notifications**: Complete automated notification system with seller-branded buyer emails (order confirmation, refunds, tracking, balance payments) and platform-branded seller alerts; all notifications use correct seller lookup via order items → product → sellerId
  - **Document Automation**: Auto-generates professional PDF invoices on 'paid' status and packing slips on 'shipped' status using DocumentGenerator with duplicate prevention and storage in dedicated invoices/packingSlips tables

## External Dependencies
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Email Service**: Resend
- **Payment Gateway**: Stripe SDK
- **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API, Instagram Basic Display API
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form
- **Validation**: Zod
- **Currency Exchange**: Fawazahmed0 Currency API
- **PDF Generation**: PDFKit