# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C (Direct-to-Consumer) e-commerce platform enabling creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. Each seller operates an isolated, subdomain-based storefront. The platform provides comprehensive features including product browsing, shopping cart, authenticated checkout, a robust seller dashboard, B2B wholesale capabilities, AI-optimized social media advertising integration, and multi-seller payment processing via Stripe Connect. It aims to be a scalable, secure, and modern D2C solution with multi-currency support and a comprehensive tax system.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## Testing Protocol
- **Test Seller Account**: 
  - Email: `mirtorabi+testseller@gmail.com`
  - Username: `mirtorabi`
  - Fixed Authentication Code: `111111` (no need to check email for code)
  - Storefront URL (dev): `/s/mirtorabi`
- **Testing Workflow**:
  1. When testing as seller, use the test seller account above
  2. **IMPORTANT**: Always logout of the test seller before acting as a buyer (sellers cannot see cart on their own products)
  3. Copy the storefront URL (`/s/mirtorabi`) when switching from seller to buyer for testing
  4. This prevents test failures and reduces testing time by avoiding login/logout confusion

## System Architecture
Upfirst utilizes a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend (with TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for forms). The backend is an Express.js Node.js application, using PostgreSQL (Neon) with Drizzle ORM for data persistence.

**Backend Architecture (Architecture 3 - Service Layer Pattern):**
- **Service Layer Orchestration**: Business logic extracted from route handlers into dedicated service classes
- **Dependency Injection**: All services use constructor injection for dependencies (storage, stripe, notifications, etc.)
- **Thin Route Handlers**: Routes follow validate → call service → return pattern
- **Service Classes** (10 total):
  1. `ProductService` - Product CRUD operations
  2. `LegacyStripeCheckoutService` - Legacy checkout flows
  3. `StripeConnectService` - Stripe Connect integration
  4. `SubscriptionService` - Subscription management
  5. `WholesaleService` - Wholesale operations
  6. `TeamManagementService` - Team collaboration
  7. `OrderLifecycleService` - Order status, tracking, refunds, balance payments
  8. `PricingCalculationService` - Cart pricing with shipping/tax calculations
  9. `StripeWebhookService` - Webhook processing (subscription, invoice, payment events)
  10. `MetaIntegrationService` - Meta OAuth callback handling
- **Existing Specialized Services**: `ShippingService`, `TaxService`, `NotificationService`, `InventoryService`, `OrderService`, `WebhookHandler` (payment intents)
- **Migration Status**: Completed October 2025. Routes.ts reduced from ~6,382 → ~5,600 lines (~1,300+ lines extracted to services)

**Testing Strategy (October 2025):**
- **Current Status**: Phase 1 complete - Manual E2E testing executed (October 13, 2025)
- **Test Results**: 7/10 services validated, 0 critical bugs discovered ✅
- **Testability Score**: 9/10 - Services excellently designed with dependency injection, clear interfaces, mockable dependencies
- **Recommended Approach**: Hybrid testing strategy (Option C)
  - Phase 1: ✅ **COMPLETE** - Manual E2E testing for immediate regression coverage
  - Phase 2: **PENDING** - Unit testing infrastructure with Vitest (32-46 hours setup + implementation)
- **Documentation**: 
  - `docs/TESTING_STRATEGY_REPORT.md` - Comprehensive feasibility analysis and recommendations
  - `docs/MANUAL_E2E_TEST_CHECKLIST.md` - Manual test checklist (20 test cases)
  - `docs/ARCHITECTURE_3_TEST_RESULTS.md` - **Complete test results** (October 13, 2025)
  - `docs/BACKEND_SERVICES.md` - Service validation status tracking
- **Validated Services** (7/10):
  1. ✅ CartService - Cart persistence bug FIXED
  2. ✅ PricingCalculationService - All calculations verified
  3. ✅ ShippingService - Shippo integration working
  4. ✅ ProductService - SKU generation, stock sync, CRUD validated
  5. ✅ ConfigurationError - Error handling improved
  6. ✅ CartValidationService - Server-side validation working
  7. ✅ InventoryService - Stock reservation working
- **Blocked Services** (2/10): OrderLifecycleService, LegacyStripeCheckoutService (Stripe Connect onboarding required)
- **Priority Services for Unit Testing** (Future):
  1. PricingCalculationService (complex pricing logic)
  2. OrderLifecycleService (security-critical refund calculations)
  3. StripeWebhookService (event routing, idempotency)

**Known Issues Status (Post-Testing):**
1. ✅ **FIXED** - Cart persistence issue (validated October 13, 2025)
2. ✅ **NOT A BUG** - /dashboard/products route works correctly (both /dashboard/products and /seller/products routes functional)
3. ✅ **IMPROVED** - Shipping API error handling now returns 400 with clear error message (not 500)

**UI/UX Decisions:**
- **Design System**: Supports dark/light mode, Inter font, consistent spacing/typography, and mobile-first responsive design.
- **Navigation**: Dashboard-centric with consistent navigation (header for desktop, burger menu for mobile).
- **Product Display**: Multi-image support, interactive carousels, and color-coded product types.
- **Dashboard Design**: Seller dashboard includes analytics and order management; buyer dashboard offers order tracking.
- **Storefront Branding**: Displays store logo, Instagram username, or seller name as fallback.

**System Design Choices & Feature Specifications:**
- **Product Management**: Supports diverse product types, multi-image uploads, bulk CSV import, simplified size-first variants, and a comprehensive multi-method shipping system.
- **Shipping Service Architecture**: Centralized `ShippingService` with 4 shipping methods integrated with `PricingService` for accurate calculations:
  - **Free Shipping**: Zero-cost option
  - **Flat Rate**: Fixed cost per product
  - **Matrix Shipping**: Zone-based rates (city > country > continent priority) with delivery estimates
  - **Shippo Integration**: Real-time carrier rates (USPS, FedEx, UPS, DHL) using package dimensions, with automatic cheapest rate selection. Uses seller's configured warehouse address as shipping origin.
  - **Warehouse Address**: Sellers configure ship-from address in Settings > Warehouse tab (street, city, state, postal code, country). Required for Shippo shipping method.
  - Returns: cost, method, zone, carrier, estimated days, human-readable description for checkout display
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
- **Tax System (B2C)**: Automated sales tax calculation via Stripe Tax API with multi-seller support. Each seller configures tax nexus (countries/states) and product codes in Settings > Tax. Tax calculations are performed on behalf of seller's Stripe Connect account using their tax registrations, customer shipping address, and warehouse ship-from address.
- **Pricing Service & Fail-Safe System**: Centralized pricing calculations for consistency and security.
- **Team Management**: Role-based access (owner, admin, editor, viewer) with invitation-based expansion and granular permissions.
- **Platform Admin Dashboard**: Comprehensive dashboard for Upfirst platform owners.
- **Storefront Customization**: Sellers can add About Story, contact info, and social media links.
- **Settings Page Organization**: Comprehensive seller settings across 12 tabs, including 'Quick Setup' for unified username/logo/banner configuration with live preview, and 'Warehouse' for ship-from address configuration.
- **Terms & Conditions System**: Seller T&C management with custom PDF upload or platform fallback, integrated into storefront footer.
- **Inventory Management System**: Transaction-based stock reservation with atomic operations, PostgreSQL row-level locking, variant-level race protection, and automatic stock synchronization.
- **Order Management System**: Comprehensive order lifecycle management with status tracking, refunds, shipping updates, and balance payments, using Stripe for processing and an automated email notification system.

## External Dependencies
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Email Service**: Resend
- **Payment Gateway**: Stripe SDK
- **Shipping Service**: Shippo API (real-time carrier rates)
- **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API, Instagram Basic Display API
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form
- **Validation**: Zod
- **Currency Exchange**: Fawazahmed0 Currency API
- **PDF Generation**: PDFKit