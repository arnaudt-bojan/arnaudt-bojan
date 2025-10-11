# Upfirst - E-Commerce Platform

## Overview
Upfirst is an e-commerce platform designed to empower creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. It provides a unified user experience for both buyers and sellers, offering product browsing, a shopping cart, authenticated checkout, and a comprehensive seller dashboard for managing products and orders. The platform includes a B2B wholesale system, advanced AI-optimized social media advertising integration, and robust multi-seller payment processing via Stripe Connect. Its core purpose is to deliver a seamless, modern, and scalable solution for online commerce.

## Recent Changes
*Last updated: October 11, 2025*

### Wallet Payment Methods Implementation (Oct 11, 2025)
- **FULL IMPLEMENTATION**: Complete wallet payment support with Express Checkout Element
- **Apple Pay**: One-click checkout with saved address and payment method
- **Google Pay**: One-click checkout with saved address and payment method
- **Link**: Stripe's one-click payment solution
- **Dual Payment Flow**:
  1. Express Checkout Element (top) - One-click with wallets, includes shipping address from wallet
  2. PaymentElement (bottom) - Traditional card entry with wallet options in tabs
- **PaymentElement Wallets**: Enabled applePay: 'auto' and googlePay: 'auto' for in-form wallet buttons
- **Domain Verification**: May require domain registration with Apple Pay/Google Pay in production
- **Test Mode**: Works in Replit development environment; production requires verified domain
- Automatically extracts shipping address, email, name, and phone from wallet payments
- Full tax calculation and order creation for express checkout payments
- See implementation in `client/src/pages/checkout.tsx`

### Pre-Order Payment Flow Improvement (Oct 11, 2025)
- **BEST PRACTICE**: Changed pre-order payment flow to charge shipping with balance (not deposit)
- Customers now pay shipping when item ships, not months in advance
- Initial charge: Deposit + Tax (on deposit only)
- Balance charge: Remaining cost + Shipping + Tax (on remaining + shipping)
- Initial invoice shows full breakdown for transparency
- Prevents charging for shipping that hasn't happened yet
- Aligns with industry best practices (Kickstarter, Shopify, etc.)
- See `docs/PREORDER_PAYMENT_FLOW.md` for complete documentation

### Backend Security Refactor (Oct 11, 2025)
- **CRITICAL**: Complete security overhaul of order processing system
- Moved ALL business logic from frontend to backend services
- Created comprehensive backend service layer:
  - `CartValidationService` - Validates cart items against database with server-side pricing
  - `PricingService` - Handles all pricing calculations (deposit logic, tax, shipping)
  - `ShippingService` - Calculates shipping costs with seller validation
  - `OrderService` - Orchestrates order creation with validated data
  - `TaxService` - Handles tax calculations (Stripe Tax integration)
- Fixed critical security vulnerabilities:
  - **Price manipulation**: All prices now fetched from database, client cannot supply prices
  - **Quantity manipulation**: Strict validation enforces positive integers only (≥1)
  - **Shipping manipulation**: Shipping calculated server-side, client cannot supply cost
  - **Tax manipulation**: Tax calculated server-side, client cannot supply amount
  - **Total validation**: Rejects orders with zero or negative totals
  - **Seller constraint**: Validates all items from same seller
- Updated API endpoints:
  - `/api/cart/validate` - Validate cart with server prices
  - `/api/orders/calculate` - Calculate order summary with server-side shipping & tax
  - `/api/orders` - Create orders with server-validated data ONLY
- Client now sends: customer info + cart items (product IDs + quantities) + destination
- Backend calculates: prices, discounts, shipping, tax, totals
- Architecture is now production-grade and fraud-resistant
- See `docs/SECURITY_ARCHITECTURE.md` for complete security documentation

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst is built with a modern web stack. The frontend uses React, TypeScript, Tailwind CSS, and Shadcn UI for a responsive user experience, with TanStack Query and React Context for state management, and Wouter for routing. Forms are managed by React Hook Form with Zod validation. The backend is an Express.js, Node.js application, utilizing PostgreSQL (Neon) with Drizzle ORM for data persistence.

**UI/UX Decisions:**
- **Design System**: Supports dark/light mode, Inter font family, consistent spacing and typography, and mobile-first responsive design.
- **Navigation**: Dashboard-centric design with consistent navigation. Desktop features a clean header, while mobile uses a burger menu.
- **Product Display**: Multi-image support with interactive carousels. Product types are color-coded.
- **Dashboard Design**: Seller dashboard includes revenue analytics and order management; buyer dashboard offers order tracking and order details.

**System Design Choices & Feature Specifications:**
- **Product Management**: Supports diverse product types (in-stock, pre-order, made-to-order, wholesale) with multi-image uploads and bulk CSV import. Features a simplified size-first variant system, with an optional color mode for products in multiple colors. Enhanced validation includes explicit "(optional)" labels for optional fields and real-time form field updates for category selection. Shipping system includes package presets, imperial/metric unit toggle, international carrier templates, and zone-based shipping matrices.
- **Shopping & Checkout**: Includes a slide-over cart, persistent cart, guest checkout, and automatic shipping cost calculation. Carts enforce a single-seller constraint.
- **Authentication & Authorization**: Email-based authentication with a dual-token system (6-digit, single-use login codes and reusable magic links). Features a 4-role system (admin, editor, viewer, buyer) with multi-tenant security.
- **Notification System**: Comprehensive email notifications using Resend, with planned support for over 30 types.
- **Payment Processing**: Integrated with Stripe Connect for multi-seller payments, supporting credit cards and balance payments for pre-orders. Features borderless onboarding for sellers with automatic capability management (`card_payments` and `transfers`). UI displays real-time Stripe Connect capability status and provides clear checkout error handling.
- **Subscription System**: Monthly/annual subscription model for sellers with a free trial, managed via Stripe Customer objects, enabling store activation/deactivation.
- **Multi-Currency Support**: IP-based currency detection with user-selectable currency switcher and real-time exchange rates.
- **Wholesale B2B System**: Invitation-only access for managing wholesale products and orders, with backend filters to show relevant catalogs to invited buyers.
- **Social Ads System**: Multi-platform social advertising (Meta, TikTok, X) with AI optimization, creative controls, and budget management.
- **Item-Level Order Tracking**: Comprehensive per-item fulfillment system with independent status, tracking, and shipping for each product in an order, including automated buyer notifications.
- **Image Editing System**: Built-in image editor (crop, zoom, rotate, flip, filters) for logos and banners.
- **Flexible Shipping System**: Three-tier configuration allowing sellers to define zone-based shipping matrices, flat rates, real-time rates via Shippo, or free shipping.
- **Document Generation System**: Professional PDF invoice and packing slip generation using pdfkit, with templates for B2C and wholesale, object storage integration, and automatic generation.
- **Saved Addresses & Payment Methods**: PCI-DSS compliant system for securely saving shipping addresses and payment methods, leveraging Stripe Payment Methods API for card data tokenization.
- **Cart System**: Shopping cart stored in browser localStorage with automatic single-seller constraint enforcement. Sellers' carts are cleared on login.
- **Domain Detection System**: Intelligent domain routing that treats Replit deployment URLs as the main application, identifying seller storefronts via explicit `/s/:username` routes or `?seller=username` query parameters.
- **Tax System (B2C)**: Comprehensive automated sales tax calculation via Stripe Tax for B2C transactions. Features include:
  - **Seller Configuration**: Tax Settings tab in seller dashboard with enable/disable toggle, multi-select country/state nexus configuration, and optional Stripe Tax product code
  - **Cart Integration**: Real-time 8% tax estimate display when seller has tax enabled, with customer notice that actual tax is calculated at checkout
  - **Checkout Integration**: Stripe Tax automatic calculation based on shipping address and seller's configured tax nexus during payment processing
  - **Order Storage**: Complete tax data stored in orders (subtotalBeforeTax, taxAmount, total) for accurate record-keeping
  - **Customer Display**: Tax breakdown shown on order confirmation page, buyer order details, and downloadable invoice PDFs
  - **Seller Display**: Tax information visible in seller order management and analytics
  - **Edge Case Handling**: Robust decimal parsing for tax amounts, graceful fallbacks for orders without tax data (legacy orders)
  - **Compliance**: Tax amounts displayed even when $0 for transparency and accounting purposes
  - Note: Wholesale transactions are exempt from automatic B2C tax collection (handled separately via B2B workflows)
- **Pricing Service & Fail-Safe System**: Centralized pricing calculations (`shared/pricing-service.ts`) ensure consistency across cart, checkout, and payment processing. Features include:
  - **Deposit Payment Fix**: Shipping costs now correctly included in deposit payments (previously only in remaining balance)
  - **Validation System**: Pre-charge validation ensures displayed amount exactly matches Stripe charge, preventing pricing discrepancies
  - **Comprehensive Documentation**: `docs/PRICING_SYSTEM.md` details all pricing flows, calculations, and fail-safes
  - **Order Accuracy**: All charges (product + shipping + tax) verified before payment intent creation
- **Team Management**: Team management moved from dashboard quick actions to Settings tab (one-time setup, not a quick action). Features include:
  - **Role-Based Access**: 4-role system (owner, admin, editor, viewer) with invitation-based team expansion
  - **Invitation Management**: Email-based invitations with shareable links, expiration tracking, and cancellation
  - **Permission Control**: Granular role changes and team member removal (except owners)
- **Platform Admin Dashboard**: Comprehensive admin dashboard for Upfirst platform owners (accessible at `/admin`). Features include:
  - **Platform Metrics**: Total sellers (active/inactive), total products, orders, revenue, and 1.5% platform fees collected
  - **System Health Monitoring**: Real-time health status for database, email service, Stripe, and webhooks (auto-refreshes every 30s)
  - **Subscription Analytics**: Active and trial subscription counts with estimated Monthly Recurring Revenue (MRR)
  - **Transaction Log**: Recent 20 platform transactions with seller names, amounts, and platform fees
  - **Critical Error Tracking**: System for monitoring critical bugs and errors (stub for future implementation)
  - **Access Control**: Requires `isPlatformAdmin = 1` flag in users table. Admin users set via SQL: `UPDATE users SET is_platform_admin = 1 WHERE email = 'admin@example.com'`

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