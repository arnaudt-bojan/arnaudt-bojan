# Upfirst - E-Commerce Platform

## Overview
Upfirst is an e-commerce platform designed to empower creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. It provides a unified user experience for both buyers and sellers, offering product browsing, a shopping cart, authenticated checkout, and a comprehensive seller dashboard for managing products and orders. The platform includes a B2B wholesale system, advanced AI-optimized social media advertising integration, and robust multi-seller payment processing via Stripe Connect. Its core purpose is to deliver a seamless, modern, and scalable solution for online commerce, with a strong focus on security, multi-currency support, and a comprehensive tax system.

## Recent Changes
*Last updated: October 11, 2025*

### Product Variant Persistence Bugs Fixed (Oct 11, 2025)
- **CRITICAL FIX**: Resolved multiple severe bugs preventing product variants from saving correctly
- **Impact**: Sellers can now reliably create and edit products with color/size variants
- **Root Cause Analysis**: Identified and fixed 6 distinct bugs in the product management system

**Bug #1: Missing Variant Fields in Product Schema**
- **Issue**: Product schema in `shared/schema.ts` missing critical variant-related fields
- **Fields Added**: `variants` (JSONB), `hasColors` (INTEGER), `images` (text array)
- **Fix**: Updated schema with all required variant, image, and metadata fields

**Bug #2: Missing hasColors Column in Database**
- **Issue**: Database table missing `hasColors` column, causing INSERT/UPDATE failures
- **Impact**: All product saves failed with "column hasColors does not exist" error
- **Fix**: Added `hasColors integer` column via `npm run db:push --force`

**Bug #3: Null Username Prevention (Storefront Access)**
- **Issue**: 5 old users had null usernames, preventing storefront access (`/s/:username`)
- **Impact**: Affected users couldn't access their storefronts or create products
- **Fix**: Assigned unique usernames via SQL: `UPDATE users SET username = 'store_' || id WHERE username IS NULL`
- **Users Fixed**: 5 users now have valid storefront URLs

**Bug #4: Type Mismatch - hasColors Boolean vs Integer**
- **Issue**: Frontend sent boolean `true/false`, database expected integer `0/1`
- **Impact**: hasColors always saved as incorrect value, breaking variant mode detection
- **Fix**: Convert hasColors to number in create/edit product forms before submission

**Bug #5: Edit Product State Reset Bug**
- **Issue**: useEffect dependency `[product, form]` caused state reset every time TanStack Query refetched
- **Symptom**: Form pre-population worked, but colors state reset to empty, losing all variants
- **Root Cause**: `product` object reference changed on every query refetch, triggering useEffect unnecessarily
- **Fix**: Changed useEffect dependency to `[product?.id]` - only runs when product ID changes (new product loaded)
- **Impact**: Form and variants state now stable during editing session

**Bug #6: React Closure Staleness Bug (Most Critical)**
- **Issue**: useMutation function accessed `colors/sizes/hasColors` from closure, which became stale when state updated
- **Symptom**: Adding new variants (e.g., Green color) updated UI, but mutation sent OLD state to server
- **Root Cause**: Mutation function defined with useMutation captured state at definition time; when state updated via `setColors`, mutation closure still had old values
- **Fix**: Moved ALL variant/dates/promotion preparation logic from mutation function into `onSubmit`:
  - `onSubmit` executes immediately when form submits
  - Reads FRESH `colors/sizes/hasColors` directly from component scope
  - Creates `fullData` object with complete data
  - Passes `fullData` to mutation (mutation just sends it, no closure access)
- **Test Verification**: Successfully added Green color with XL/25 size; console logs confirmed onSubmit had 3 colors, PUT request sent all 3 colors, API returned all 3 colors persisted

**Production Readiness**:
- ✅ All 6 bugs fixed and tested end-to-end
- ✅ Debug logging removed (production-clean code)
- ✅ Comprehensive regression tests passing
- ✅ Architect review passed for all critical fixes
- ✅ TypeScript types maintained (minor `any` casts for mutation payload, typing improvement pending)

**Files Modified**:
- `shared/schema.ts` - Added variant fields to product schema
- `client/src/pages/create-product.tsx` - Fixed hasColors type conversion
- `client/src/pages/edit-product.tsx` - Fixed useEffect dependency and closure staleness bug
- Database: Added `hasColors` column, fixed null usernames for 5 users

### Subscription Dialog Auto-Close & Refresh Fix (Oct 11, 2025)
- **CRITICAL FIX**: Resolved Settings page not showing updated subscription status after successful subscription
- **Impact**: Users can now see their active subscription immediately after subscribing
- **Root Cause**: Dialog closed after subscription but didn't refresh page; Settings page wasn't passing `activateStoreAfter` prop

**Solution Implemented**:
- Added `/api/subscription/status` query invalidation to subscription dialog (ensures all subscription state updates)
- Settings page now passes `activateStoreAfter={true}` to trigger page refresh after subscription
- Conditional reload behavior preserved: only pages that opt-in via prop will refresh (protects unsaved form data)

**User Flow After Fix**:
1. User on Settings page clicks "Subscribe Now"
2. Completes Stripe checkout in popup window
3. Dialog detects success via polling (every 2 seconds)
4. Toast shows "Subscription Active!"
5. Dialog closes automatically
6. Page refreshes after 500ms delay
7. User sees green "Active Subscription" card immediately

**Production Readiness**:
- ✅ Architect review passed - implementation correctly scopes reloads while preserving flexibility
- ✅ E2E test passed - dialog opens/closes correctly, UI flow verified
- ✅ Query invalidation ensures subscription state updates everywhere
- ✅ No regressions in polling, cleanup logic, or toast handling

**Files Modified**:
- `client/src/components/subscription-pricing-dialog.tsx` - Added subscription status query invalidation
- `client/src/pages/settings.tsx` - Added `activateStoreAfter={true}` prop

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
- **Product Management**: Supports diverse product types (in-stock, pre-order, made-to-order, wholesale) with multi-image uploads and bulk CSV import. Features a simplified size-first variant system, with an optional color mode. Shipping system includes package presets, imperial/metric unit toggle, international carrier templates, and zone-based shipping matrices.
- **Shopping & Checkout**: Includes a slide-over cart, persistent cart, guest checkout, and automatic server-side shipping cost calculation. Carts enforce a single-seller constraint.
- **Authentication & Authorization**: Email-based authentication with a dual-token system (6-digit, single-use login codes and reusable magic links). Features a 4-role system (admin, editor, viewer, buyer) with multi-tenant security.
- **Notification System**: Comprehensive email notifications using Resend, with dark mode compatibility.
- **Payment Processing**: Integrated with Stripe Connect for multi-seller payments, supporting credit cards, balance payments for pre-orders, and wallet payments (Apple Pay, Google Pay, Link). Features borderless onboarding for sellers with automatic capability management.
- **Subscription System**: Monthly/annual subscription model for sellers with a free trial, managed via Stripe Customer objects, enabling store activation/deactivation.
- **Multi-Currency Support**: IP-based currency detection with user-selectable currency switcher and real-time exchange rates.
- **Wholesale B2B System**: Invitation-only access for managing wholesale products and orders, with backend filters.
- **Social Ads System**: Multi-platform social advertising (Meta, TikTok, X) with AI optimization, creative controls, and budget management.
- **Item-Level Order Tracking**: Comprehensive per-item fulfillment system with independent status, tracking, and shipping for each product in an order, including automated buyer notifications.
- **Flexible Shipping System**: Three-tier configuration allowing sellers to define zone-based shipping matrices, flat rates, real-time rates via Shippo, or free shipping.
- **Document Generation System**: Professional PDF invoice and packing slip generation using pdfkit, with templates for B2C and wholesale.
- **Saved Addresses & Payment Methods**: PCI-DSS compliant system for securely saving shipping addresses and payment methods, leveraging Stripe Payment Methods API.
- **Domain Detection System**: Intelligent domain routing for storefronts via explicit `/s/:username` routes or `?seller=username` query parameters.
- **Tax System (B2C)**: Comprehensive automated sales tax calculation via Stripe Tax for B2C transactions, including seller configuration, real-time cart estimates, checkout integration, and detailed order storage.
- **Pricing Service & Fail-Safe System**: Centralized pricing calculations (`shared/pricing-service.ts`) ensure consistency and security across cart, checkout, and payment processing, including pre-charge validation.
- **Team Management**: Role-based access (owner, admin, editor, viewer) with invitation-based team expansion and granular permission control.
- **Platform Admin Dashboard**: Comprehensive admin dashboard for Upfirst platform owners, providing platform metrics, system health monitoring, subscription analytics, transaction logs, and critical error tracking.

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