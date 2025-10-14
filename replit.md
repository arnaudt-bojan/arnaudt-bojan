# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform designed for creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. Each seller operates an isolated, subdomain-based storefront. The platform offers comprehensive features including product browsing, shopping cart, authenticated checkout, a robust seller dashboard, B2B wholesale capabilities, AI-optimized social media advertising integration, and multi-seller payment processing via Stripe Connect. It aims to be a scalable, secure, and modern D2C solution with multi-currency support and a comprehensive tax system, targeting significant market potential by empowering a diverse range of sellers.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst uses a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend (with TanStack Query, Wouter, React Hook Form, and Zod). The backend is an Express.js Node.js application, using PostgreSQL (Neon) with Drizzle ORM.

**Backend Architecture:**
A service layer pattern is employed, abstracting business logic from thin route handlers into dedicated service classes. Dependency injection is used for managing service dependencies. Key services include:
- `ProductService`
- `StripeConnectService`
- `WholesaleService`
- `OrderLifecycleService`
- `PricingCalculationService`
- `StripeWebhookService`
- `MetaIntegrationService`
- `TeamManagementService`
- Specialized services for Shipping, Tax, Notification, and Inventory.

**UI/UX Decisions:**
The design system supports dark/light mode, uses the Inter font, and emphasizes consistent spacing, typography, and a mobile-first responsive approach. Navigation is dashboard-centric. Product displays feature multi-image support and interactive elements. Storefronts are customizable with seller branding.

**B2C/B2B Environment Toggle & Wholesale Access:**
Sellers can switch between B2C (retail) and B2B (wholesale) environments using a toggle in the dashboard header. The toggle changes environment context ONLY (no automatic navigation):
- **B2C → B2B**: Environment switches to wholesale mode (stay on current page)
- **B2B → B2C**: Environment switches to retail mode (stay on current page)

Wholesale features are accessed via `/seller/wholesale/*` routes when in B2B mode:
- Products: `/seller/wholesale/products` (B2B product management)
- Invitations: `/seller/wholesale/invitations` (buyer invitation & management)
- Orders: `/seller/wholesale/orders` (wholesale order management)

Buyer wholesale access uses separate routes:
- Catalog: `/wholesale/catalog` (browse seller's wholesale products)
- Cart: `/wholesale/cart` (wholesale cart with MOQ validation)
- Checkout: `/wholesale/checkout` (freight collect/buyer pickup)
- Orders: `/wholesale/orders` (buyer order history)

**System Design Choices & Feature Specifications:**
-   **Product Management**: Supports diverse product types, multi-image uploads, bulk CSV import, simplified size-first variants, and comprehensive multi-method shipping.
-   **Shipping Service**: Centralized `ShippingService` integrates Free Shipping, Flat Rate, Matrix Shipping, and real-time Shippo API rates, requiring sellers to configure a warehouse address.
-   **Shopping & Checkout**: Includes slide-over/persistent cart, guest checkout, server-side shipping cost calculation, and a single-seller constraint per cart.
-   **Authentication & Authorization**: Email-based authentication with a dual-token system and capability-based authorization for seller, buyer, and collaborator roles.
-   **Notification System**: Comprehensive email and in-app notification infrastructure with shared templates, email metadata services, and mobile-responsive designs, powered by Resend.
-   **Payment Processing**: Integrated with Stripe Connect for multi-seller payments, supporting various methods, PCI-DSS compliant saved details, and automated subscription payment method sync.
-   **Subscription System**: Monthly/annual seller subscriptions managed via Stripe, including a 30-day trial.
-   **Multi-Currency Support**: IP-based detection with user-selectable currency and real-time exchange rates.
-   **Wholesale B2B System**: Comprehensive B2B platform with invitation-based access, MOQ enforcement (variant-level), deposit/balance payment split via Stripe, freight collect/buyer pickup shipping (NO traditional shipping methods), enhanced buyer invitation system with 7-day expiry, separate wholesale order management with status tracking (pending_deposit → deposit_paid → in_production → ready_to_release → fulfilled → delivered/completed), Stripe payment integration with webhook automation, automated email notifications (6 templates: order confirmation, deposit received, balance reminder, balance overdue, order shipped, order fulfilled), balance payment reminder job (runs daily), payment link generation, and complete order lifecycle management.
-   **Social Ads System**: Multi-platform (Meta, TikTok, X) social advertising with AI optimization.
-   **Item-Level Order Tracking**: Per-item fulfillment system with independent status, tracking, and automated buyer notifications.
-   **Document Generation System**: Professional PDF invoice and packing slip generation.
-   **Subdomain Architecture**: Environment-aware routing for seller storefronts.
-   **Tax System (B2C)**: Automated sales tax calculation via Stripe Tax API, leveraging seller-configured tax nexus and product codes.
-   **Pricing Service**: Centralized pricing calculations for consistency and security.
-   **Team Management**: Simplified single-collaborator model. Sellers invite collaborators via email with 7-day expiry tokens. Collaborators have full store access. Invitations promote buyers to sellers automatically. Team management UI in settings allows invite/revoke operations.
-   **Platform Admin Dashboard**: Comprehensive dashboard for Upfirst platform owners.
-   **Storefront Customization**: Sellers can customize their storefront with About Story, contact info, and social media links.
-   **Settings Page Organization**: Comprehensive seller settings across 12 tabs, including 'Quick Setup' and 'Warehouse' configuration. Profile tab simplified to show only Contact Email as editable field, with all business information (including address) displayed from Stripe Connect account. "Saved Cards" tab focuses exclusively on payment method management (removed saved addresses section). "Terms & Policies" tab renamed from "Store Policies & T&C" with platform default link and working PDF upload.
-   **Terms & Conditions System**: Seller T&C management integrated into the storefront footer with three options: custom PDF upload, platform default terms (with view link), or no terms.
-   **Inventory Management System**: Transaction-based stock reservation with atomic operations, PostgreSQL row-level locking, and automatic stock synchronization.
-   **Order Management System**: Comprehensive order lifecycle management with status tracking, refunds, and balance payments.
-   **Real-Time Order Updates (WebSocket)**: Live order synchronization system (`/ws/orders`) with automatic frontend cache invalidation, ensuring instant UI updates. Uses integer cents arithmetic for payment precision.
-   **Platform Analytics API**: Endpoint for ShopSwift integration providing comprehensive platform and seller metrics, secured by an API key.

## Testing & Development Guidelines

**Proven Login Approach for E2E Tests:**

For **ALL seller/buyer login tests**, use this OIDC-based approach to avoid wasting time:

```
SELLER LOGIN (ALWAYS USE THIS):
1. [OIDC] Configure next login: {sub: "local-testseller@test.com", email: "testseller@test.com"}
2. [Browser] Navigate to homepage (/)
3. [Browser] Click "Log in" button in header
4. [Verify] OIDC bypass authenticates automatically → redirected to dashboard
5. [Verify] User authenticated and dashboard loads

BUYER LOGIN (ALWAYS USE THIS):
1. [OIDC] Configure next login: {sub: "local-testbuyer@test.com", email: "testbuyer@test.com"}
2. [Browser] Navigate to homepage (/)
3. [Browser] Click "Log in" button in header
4. [Verify] OIDC bypass authenticates automatically → redirected to dashboard
5. [Verify] User authenticated

WHY THIS WORKS:
- OIDC bypass is enabled in test environment
- No email verification needed (bypass handles authentication)
- Works for both sellers and buyers
- Fastest, most reliable method
```

**AVOID:**
- ❌ Email-code flow (`/email-login`) - requires actual email verification
- ❌ Magic link flow - requires email access
- ❌ Password flow (`/login`) - password mismatches in testing

**Test Users Available:**
- Seller: `testseller@test.com` (ID: `local-testseller@test.com`)
- Buyer: `testbuyer@test.com` (ID: `local-testbuyer@test.com`)

**Authentication Routes:**
- `/login` - Email/password form (use OIDC instead)
- `/email-login` - Email code verification (use OIDC instead)
- `/dashboard` - Smart redirect based on role
- `/auth/magic` - Magic link verification

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