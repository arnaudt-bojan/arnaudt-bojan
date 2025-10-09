# Uppshop - E-Commerce Platform

## Overview
Uppshop is a modern e-commerce platform for creators and brands to sell various product types: in-stock, pre-order (with deposit functionality), made-to-order, and wholesale. It offers a seamless buying and selling experience with a unified user model. Key capabilities include product browsing, shopping cart, authenticated checkout, a comprehensive seller dashboard for product and order management, and a B2B wholesale system with invitation-only access. The platform also integrates advanced social media advertising features with AI optimization and robust payment processing, including NFT minting for buyers.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## Recent Changes (October 2025)

### Latest Updates (Oct 9, 2025)
- **Stripe Express Account Migration** - Replaced Stripe OAuth with Express account creation using Account Links API. Sellers can now start immediately with minimal KYC, with full verification deferred until first payout. Added `stripeChargesEnabled`, `stripePayoutsEnabled`, and `stripeAccountVerified` fields to track account status.
- **Automatic Currency Detection** - Listing currency now automatically pulled from seller's Stripe account default currency setting, ensuring correct currency display and preventing conversion issues.
- **PayPal Marketplace Integration** - Implemented PayPal Commerce Platform partner integration with merchant referral flow and onboarding status tracking (foundation laid for future PayPal credentials).
- **Dynamic Navbar Logo System** - Implemented priority-based logo display: Instagram username (@username) > uploaded storeLogo > username with "Add Logo" prompt. Provides clear branding hierarchy for seller stores.
- **Go Live Dashboard Feature** - Relocated subscription activation from settings to seller dashboard with prominent "Go Live" banner. Shows 30-day free trial offer, trial status with countdown, and clear payment setup CTA to drive activation.
- **Product Schema Nullable Fix** - Fixed validation error where optional fields (discountPercentage, preOrderDate, promotionEndDate) sent as null failed validation. Added nullable().transform() to convert null to undefined for proper handling.
- **Checkout Error UX Improvement** - Added prominent error alerts on checkout page when seller hasn't connected Stripe. Alert displays on both shipping and payment steps with clear "Payment Not Available" message and guidance to contact seller.

### Previous Updates
- **Session Expiration Fix** - Fixed critical bug where local auth users experienced premature session expiration. Sessions now properly extend `expires_at` on each request with 7-day rolling window, preventing "Session expired" 401 errors.
- **Product Card Size Control** - Implemented responsive card size toggle with Compact (2-6 columns), Medium (1-4 columns), and Large (1-3 columns) views. Preference persists in localStorage for seamless user experience across sessions.
- **Discount & Promotion System** - Added comprehensive discount management allowing sellers to set percentage discounts (0-100%) and optional promotion end dates. Displays discounted prices in red with strikethrough original prices on both product cards and detail pages. Includes visual discount badges (e.g., "-25% OFF").
- **Instagram Error Handling** - Improved Instagram OAuth error handling to show user-friendly messages when credentials aren't configured instead of 500 errors.
- **CRITICAL FIX: Payment Provider Validation** - Fixed critical business logic flaw where payments would go to platform account instead of seller when Stripe wasn't connected. Backend now returns 400 error when payment intent creation is attempted without seller's Stripe account. Added prominent warning banners on seller dashboard and products page alerting sellers to connect Stripe before receiving payments.
- **OAuth Connection Fix** - Fixed fetch API error in Instagram/Stripe OAuth connections by removing empty body object from GET requests. Changed from `apiRequest("GET", url, {})` to `apiRequest("GET", url)` to prevent 400 errors.
- **Guest Checkout Fix** - Removed authentication requirement from `/api/create-payment-intent` endpoint to allow guest checkout. Buyers can now complete checkout without logging in, while backend still validates seller has connected Stripe.
- **CRITICAL FIX: Data Isolation** - Fixed a critical security issue where sellers could see other sellers' products and orders. Implemented seller-specific API endpoints (`/api/seller/products`, `/api/seller/orders`) that filter data by authenticated seller's ID. All seller dashboards now use these filtered endpoints to ensure complete data isolation.
- **Product Schema Fix** - Created `frontendProductSchema` (omits `sellerId`) for client-side validation, while backend uses full `insertProductSchema` and automatically adds `sellerId` from authenticated user. This fixes form submission issues where client-side validation was failing due to missing sellerId.
- **Category Auto-fill** - Products now auto-populate category field with "General" if no category is selected, preventing validation errors.
- **Store Preview & Sharing** - Added "Preview Store" link to seller mobile menu (navigates to /products). Created ShareStoreModal component with store URL copy, Instagram connect prompt, social media quick-share buttons (Instagram, Facebook, TikTok, X), and QR code generation placeholder. Share button added to seller dashboard.
- **Seller Dashboard Redirect** - Logged-in sellers (admin/editor/viewer roles) are now automatically redirected from home page to seller dashboard for better UX.
- **Pre-order Date Display** - Pre-order products now display "Expected Delivery" date on product detail pages and checkout summary when preOrderDate is set. Fixed preOrderDate validation to use z.coerce.date() for proper ISO string to Date conversion.

## System Architecture
Uppshop is built with a modern web stack. The frontend utilizes **React, TypeScript, Tailwind CSS, and Shadcn UI** for a responsive user experience, managing state with **TanStack Query** and **React Context**, and routing with **Wouter**. Forms are handled by **React Hook Form** with **Zod** validation. The backend is an **Express.js, Node.js** application, using **PostgreSQL (Neon)** with **Drizzle ORM** for persistent data storage.

**UI/UX Decisions:**
- **Design System**: Dark/light mode support, Inter font family, consistent spacing and typography, mobile-first responsive design.
- **Product Display**: Multi-image support with interactive carousels on product cards and thumbnail galleries on product detail pages. Color-coded badges for product types (In-Stock: Green, Pre-Order: Blue, Made-to-Order: Purple, Wholesale: Orange).
- **Dashboard Design**: Seller dashboard features revenue analytics and order management. Buyer dashboard provides order tracking and NFT minting access.

**Technical Implementations & Feature Specifications:**
- **Product Management**: Supports in-stock, pre-order (with deposit), made-to-order, and wholesale products. Sellers can create, view, and manage products, including multi-image uploads. Features bulk CSV upload for efficient product catalog creation with template download and row-level error tracking.
- **Shopping & Checkout**: Features a slide-over cart, quantity adjustment, persistent cart, and guest checkout with automatic account creation. Checkout displays subtotal, shipping cost (fetched from seller settings), and total with shipping automatically added to order total. Sellers can configure per-seller flat-rate shipping via settings page.
- **Authentication & Authorization**: Domain-based authentication system where sellers login from main domain (uppfirst.com) and buyers from seller subdomains (seller.uppfirst.com). Simplified 4-role system: admin (full access), editor (product/order management), viewer (read-only), buyer (customer). Local username/password auth (to be replaced with email authentication). First user becomes admin automatically.
- **Payment Processing**: Integrated with **Stripe Connect** for multi-seller platform payments. Uppfirst takes 1.5% application fee, seller receives 98.5%, and buyer sees seller's name on statement (not Uppfirst). Supports Apple Pay, Google Pay, credit cards via automatic payment methods. Sellers connect Stripe accounts via OAuth. Supports balance payments for pre-orders.
- **Subscription System**: Sellers pay $9.99/month or $99/year for store access. 30-day free trial starts when seller creates their first product. Payment methods stored securely using Stripe Customer objects and SetupIntent. Sellers can add payment method and activate subscription via Settings > Subscription tab. Trial countdown and subscription status displayed prominently.
- **Multi-Currency Support**: Automatic IP-based currency detection with a user-selectable currency switcher (16+ currencies). Prices convert in real-time using cached exchange rates.
- **NFT Minting**: Buyers can mint NFTs on the Solana devnet for fully paid orders, integrated with Phantom wallet. The platform covers gas fees.
- **Wholesale B2B System**: An invitation-only system allowing sellers to manage wholesale-specific products (with MOQ, RRP, wholesale pricing) and invite wholesale buyers.
- **Social Ads System**: Comprehensive multi-platform social advertising (Meta, TikTok, X) with AI optimization, creative controls, budget management, and manual targeting overrides via OAuth connections.
- **Instagram Integration**: Sellers can connect their Instagram account via OAuth to use their verified username as their store URL.

**System Design Choices:**
- **Project Structure**: Divided into `client/` (frontend), `server/` (backend), and `shared/` (common schemas, validation).
- **Data Models**: Comprehensive schemas for `Product`, `Order`, `User`, `Newsletter`, `NftMint`, `WholesaleProduct`, and `WholesaleInvitation` are defined using Drizzle ORM.
- **Session Management**: PostgreSQL-backed sessions using `express-session` and `connect-pg-simple`.

## External Dependencies
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Replit Auth, `passport-local` (for testing)
- **Payment Gateway**: Stripe SDK
- **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API, Instagram Basic Display API
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form
- **Validation**: Zod
- **Session Management**: `express-session`, `connect-pg-simple`
- **CSV Parsing**: PapaParse (for bulk product uploads)
- **Currency Exchange**: Fawazahmed0 Currency API
- **Blockchain**: Solana Web3.js, Metaplex SDK, Phantom Wallet
- **Email Service**: SendGrid API (placeholder)