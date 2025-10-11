# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C (Direct-to-Consumer) e-commerce platform designed for creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. Each seller operates an isolated storefront accessible via subdomain in production (`username.upfirst.io`) or path-based routing in dev (`/s/username`), with NO cross-seller discovery features. The platform offers product browsing within individual stores, a shopping cart, authenticated checkout, and a comprehensive seller dashboard. Key capabilities include a B2B wholesale system, AI-optimized social media advertising integration, and robust multi-seller payment processing via Stripe Connect. The platform focuses on delivering a seamless, modern, and scalable D2C commerce solution with strong security, multi-currency support, and a comprehensive tax system.

## Recent Changes (Oct 11, 2025)
- **Auth System Complete Integration**: Full migration to new capability-based auth system complete (BACKEND + FRONTEND + TESTING)
  - **Backend**: Successfully migrated all 156 route middleware uses from `isAuthenticated`/`isSeller` to `requireAuth`/`requireUserType`
  - **Backend**: Fixed critical authorization bypass vulnerability by adding seller protection to product/seller management routes
  - **Backend**: All seller routes now properly protected with `requireUserType('seller')`: /api/seller/*, /api/products (mutations), /api/wholesale/*
  - **Backend**: Auth middleware handles OIDC token refresh + session persistence + concurrency mutex
  - **Backend**: Authorization service provides 40+ capabilities with resource-scoped permissions
  - **Migration**: 34 users migrated successfully - sellers/admins/owners → seller userType, buyers → buyer userType, collaborators → collaborator userType with conservative viewAnalytics capability, unknown roles skipped
  - **Frontend**: Created useAuth hook with capability checking (hasCapability, hasAllCapabilities, hasAnyCapability)
  - **Frontend**: Updated /api/auth/user to return capabilities from AuthorizationService
  - **Frontend**: Harmonized useAuth and AuthStoreContext with identical role fallback logic for all user types
  - **Frontend**: Purchase prevention complete - sellers/collaborators blocked from Add to Cart/Buy Now buttons and checkout redirect
  - **Frontend**: Both useAuth and AuthStoreContext check userType with explicit role fallbacks (seller/admin/owner → seller, editor/viewer → collaborator, buyer → buyer)
  - **Bug Fix #1**: Fixed new user creation to set userType field (was only setting legacy role field)
  - **Bug Fix #2**: Fixed sellerContext extraction from returnUrl to properly classify storefront signups as buyers (not sellers)
  - **Testing**: E2E tests verified seller purchase prevention (PASS), buyer signup with correct userType (PASS)
  - **Security**: All 34 migrated users properly classified, no privilege escalation, consistent auth checks across entire stack
  - **Status**: Production-ready - all 10 auth tasks completed and architect-approved
- **Notification Service Refactoring**: Comprehensive refactoring of 2,200+ line notification system to eliminate ALL hardcoded values
  - Created service-oriented architecture with dependency injection: EmailConfigService, EmailProviderService, NotificationMessagesService
  - Eliminated ALL hardcoded email addresses (support@, hello@, FROM_EMAIL) - now using centralized config
  - Eliminated ALL hardcoded subject lines - 17 message templates with typed interfaces for email/in-app notifications
  - Added currency formatting to email templates using Intl.NumberFormat (matches frontend formatPrice())
  - Email provider abstraction layer (IEmailProvider interface) enables easy switching between providers
  - Bug fixes: getFromEmail() → getPlatformFrom(), added all item-level notification templates
  - Future enhancements identified: Platform name from env/config, eliminate string manipulation in templates, template-driven in-app messages
- **Seller-Specific Currency Display**: Implemented backend-driven currency display system - seller's listingCurrency is single source of truth
  - Backend `/api/pricing/calculate` endpoint provides centralized pricing calculations in seller's currency
  - Product API responses include seller's `currency` field (from listingCurrency)
  - CartItem interfaces extended with `currency?: string` field for persistence in localStorage
  - All price displays (PDP, cart, checkout, order success) use seller's currency via format functions
  - Removed CurrencyContext from cart/checkout - replaced with seller-specific currency from cart items
  - E2E tested: verified GBP currency displays correctly across product → cart → checkout flow
  - NO frontend currency conversions - backend is the single source of truth for all pricing
- **Subdomain Architecture Implementation**: Implemented production-ready subdomain routing for seller storefronts
  - Production: Sellers accessible at `username.upfirst.io` (root path `/` shows storefront)
  - Dev/Replit: Sellers accessible at `/s/username` for local testing
  - Smart navigation: Uses Wouter `<Link>` for same-origin SPA navigation, `<a>` tags for cross-origin subdomain navigation
  - Environment-aware `getStoreUrl()` function returns relative paths in dev, absolute subdomain URLs in production
  - Conditional routing in App.tsx based on domain detection: seller subdomains serve storefront routes, main domain serves admin routes
  - All share links, preview buttons, and logo navigation properly handle environment-specific URLs
- **D2C Architecture Enforcement**: Removed all cross-seller discovery features to enforce strict D2C model (like Big Cartel)
  - Removed global `/products` page that showed all sellers' products
  - Removed "Products" navigation link that led to cross-seller browsing
  - Logo on storefronts navigates to current seller's store using environment-aware URLs
  - Cart visibility limited to seller storefronts and checkout only
- **ReturnUrl Preservation**: Fixed email auth flow to preserve returnUrl through login, ensuring users return to the page they were viewing (e.g., storefronts) instead of being redirected to dashboard
- **Storefront Branding**: Removed UPPFIRST logo from storefronts; now displays store logo > Instagram username > seller name (firstName + lastName or username) as fallback
- **Reactive Domain Detection**: AuthStoreContext now tracks location changes using wouter's useLocation() to properly detect seller storefronts during client-side navigation
- **Welcome Email**: Only sent once on first registration, tracked via welcomeEmailSent flag

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

**System Design Choices & Feature Specifications:**
- **Product Management**: Supports diverse product types (in-stock, pre-order, made-to-order, wholesale) with multi-image uploads, bulk CSV import, and a simplified size-first variant system with optional color mode. Includes a flexible shipping system with package presets, international carrier templates, and zone-based matrices.
- **Shopping & Checkout**: Features a slide-over and persistent cart, guest checkout, and automatic server-side shipping cost calculation, enforcing a single-seller constraint per cart.
- **Authentication & Authorization**: Email-based authentication with a dual-token system (6-digit codes and magic links). Implements a 4-role system (admin, editor, viewer, buyer) with multi-tenant security.
- **Notification System**: Comprehensive email notifications using Resend, with dark mode compatibility.
- **Payment Processing**: Integrated with Stripe Connect for multi-seller payments, supporting credit cards, balance payments, and wallet payments (Apple Pay, Google Pay, Link) with borderless seller onboarding.
- **Subscription System**: Monthly/annual subscription model for sellers with a free trial, managed via Stripe Customer objects, enabling store activation/deactivation.
- **Multi-Currency Support**: IP-based currency detection with user-selectable currency and real-time exchange rates.
- **Wholesale B2B System**: Invitation-only access for managing wholesale products and orders.
- **Social Ads System**: Multi-platform social advertising (Meta, TikTok, X) with AI optimization and budget management.
- **Item-Level Order Tracking**: Comprehensive per-item fulfillment system with independent status, tracking, and automated buyer notifications.
- **Document Generation System**: Professional PDF invoice and packing slip generation (B2C and wholesale templates).
- **Saved Addresses & Payment Methods**: PCI-DSS compliant system for securely saving shipping addresses and payment methods using Stripe Payment Methods API.
- **Subdomain Architecture**: Environment-aware routing system for seller storefronts
  - Production: `username.upfirst.io` serves storefront at root path `/`
  - Dev/Replit: `/s/username` serves storefront for local testing
  - Smart navigation: Conditional use of Wouter `<Link>` (same-origin SPA) vs `<a>` tags (cross-origin subdomain)
  - `getStoreUrl(username)` utility: Returns relative paths in dev, absolute subdomain URLs in production
  - Domain detection in App.tsx: Renders different route sets based on hostname (seller subdomain vs main domain)
  - All navigation, sharing, and preview features respect environment-specific URL patterns
- **Tax System (B2C)**: Automated sales tax calculation via Stripe Tax for B2C transactions, including real-time cart estimates.
- **Pricing Service & Fail-Safe System**: Centralized pricing calculations (`shared/pricing-service.ts`) for consistency and security across cart, checkout, and payment processing.
- **Team Management**: Role-based access (owner, admin, editor, viewer) with invitation-based team expansion and granular permissions.
- **Platform Admin Dashboard**: Comprehensive dashboard for Upfirst platform owners, providing metrics, system health, subscription analytics, and error tracking.
- **About & Contact + Storefront Footer System**: Sellers can add About Story, contact info, and social media links to their storefronts. Footer displays social media icon links, platform links (Help, Privacy, Terms), and UPPFIRST branding. About Story is stored but accessed via modal (not shown in footer).

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