# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C (Direct-to-Consumer) e-commerce platform enabling creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. Each seller operates an isolated, subdomain-based storefront. The platform provides comprehensive features including product browsing, shopping cart, authenticated checkout, a robust seller dashboard, B2B wholesale capabilities, AI-optimized social media advertising integration, and multi-seller payment processing via Stripe Connect. It aims to be a scalable, secure, and modern D2C solution with multi-currency support and a comprehensive tax system.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst utilizes a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend (with TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for forms). The backend is an Express.js Node.js application, using PostgreSQL (Neon) with Drizzle ORM for data persistence.

**UI/UX Decisions:**
- **Design System**: Supports dark/light mode, Inter font, consistent spacing/typography, and mobile-first responsive design.
- **Navigation**: Dashboard-centric with consistent navigation (header for desktop, burger menu for mobile).
- **Product Display**: Multi-image support, interactive carousels, and color-coded product types.
- **Dashboard Design**: Seller dashboard includes analytics and order management; buyer dashboard offers order tracking.
- **Storefront Branding**: Displays store logo, Instagram username, or seller name as fallback.

**System Design Choices & Feature Specifications:**
- **Product Management**: Supports diverse product types, multi-image uploads, bulk CSV import, simplified size-first variants, and a flexible shipping system (package presets, international carrier templates, zone-based matrices).
- **Shopping & Checkout**: Features slide-over/persistent cart, guest checkout, server-side shipping cost calculation, and single-seller constraint per cart.
- **Authentication & Authorization**: Email-based authentication with dual-token system (6-digit codes, magic links). Capability-based authorization with resource-scoped permissions for seller, buyer, and collaborator roles.
- **Notification System**: Refactored email notifications using Resend with dark mode and templated messages.
- **Payment Processing**: Integrated with Stripe Connect for multi-seller payments, supporting various methods and country-selectable seller onboarding. Includes PCI-DSS compliant saved addresses and payment methods, with automatic sync of subscription payment methods.
- **Subscription System**: Monthly/annual seller subscriptions managed via Stripe, including a 30-day trial activated with a credit card on file.
- **Multi-Currency Support**: IP-based detection with user-selectable currency, real-time exchange rates, and backend-driven seller-specific currency display.
- **Wholesale B2B System**: Invitation-only access for managing wholesale products and orders.
- **Social Ads System**: Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
- **Item-Level Order Tracking**: Per-item fulfillment system with independent status, tracking, and automated buyer notifications.
- **Document Generation System**: Professional PDF invoice and packing slip generation (B2C and wholesale templates).
- **Subdomain Architecture**: Environment-aware routing for seller storefronts (`username.upfirst.io` in production, `/s/username` in dev).
- **Tax System (B2C)**: Automated sales tax calculation via Stripe Tax.
- **Pricing Service & Fail-Safe System**: Centralized pricing calculations for consistency and security.
- **Team Management**: Role-based access (owner, admin, editor, viewer) with invitation-based expansion and granular permissions.
- **Platform Admin Dashboard**: Comprehensive dashboard for Upfirst platform owners.
- **Storefront Customization**: Sellers can add About Story, contact info, and social media links.
- **Settings Page Organization**: Comprehensive seller settings across 11 tabs, with a 'Quick Setup' tab for unified username, logo, and banner configuration with live preview.
- **Terms & Conditions System**: Seller T&C management with custom PDF upload or platform fallback, integrated into storefront footer.
- **Inventory Management System**: Transaction-based stock reservation with atomic operations, PostgreSQL row-level locking, variant-level race protection, and automatic stock synchronization.
- **Order Management System**: Comprehensive order lifecycle management with status tracking, refunds, shipping updates, and balance payments, using Stripe for processing and an automated email notification system.

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