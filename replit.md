# Upfirst - E-Commerce Platform

## Overview
Upfirst is an e-commerce platform designed for creators and brands to sell various product types: in-stock, pre-order (with deposit), made-to-order, and wholesale. It aims to provide a seamless buying and selling experience with a unified user model. Key capabilities include product browsing, a shopping cart, authenticated checkout, a comprehensive seller dashboard for product and order management, and a B2B wholesale system with invitation-only access. The platform also integrates advanced social media advertising features with AI optimization, robust payment processing, and NFT minting for buyers.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst is built with a modern web stack. The frontend uses **React, TypeScript, Tailwind CSS, and Shadcn UI** for a responsive user experience, with **TanStack Query** and **React Context** for state management, and **Wouter** for routing. Forms are handled by **React Hook Form** with **Zod** validation. The backend is an **Express.js, Node.js** application, using **PostgreSQL (Neon)** with **Drizzle ORM** for persistent data storage.

**Navigation Architecture:**
- **Dashboard-Centric Design**: Seller Dashboard is the main hub with quick access to all features via action chips
- **Consistent Navigation**: All seller pages (Settings, Products, Orders, etc.) include a "Back to Dashboard" breadcrumb in the same location
- **Desktop Navigation**: Clean header with Dashboard and Settings buttons visible on desktop (no burger menu clutter)
- **Mobile-First**: Burger menu appears on mobile devices for easy access to all features
- **Storefront**: Buyer-facing pages remain clean while maintaining subtle access to seller dashboard

**UI/UX Decisions:**
- **Design System**: Supports dark/light mode, uses Inter font family, consistent spacing and typography, and mobile-first responsive design.
- **Product Display**: Features multi-image support with interactive carousels and thumbnail galleries. Product types are color-coded (In-Stock: Green, Pre-Order: Blue, Made-to-Order: Purple, Wholesale: Orange).
- **Dashboard Design**: Seller dashboard includes revenue analytics and order management. Buyer dashboard offers order tracking and NFT minting access.

**Technical Implementations & Feature Specifications:**
- **Product Management**: Supports diverse product types (in-stock, pre-order, made-to-order, wholesale) with multi-image uploads and bulk CSV upload functionality.
- **Shopping & Checkout**: Features a slide-over cart, quantity adjustment, persistent cart, and guest checkout. Shipping costs are fetched from seller settings and automatically added to the total. All orders require customerEmail and create/use buyer accounts. **Cart enforces single-seller constraint** - products from different sellers cannot be mixed in one cart to ensure proper payment routing (Stripe Connect) and data isolation.
- **Authentication & Authorization**: 
  - Email-based authentication (verification code and magic link) for sellers only - creates admin role accounts
  - All emails normalized to lowercase and trimmed for consistency
  - Buyers created automatically via guest checkout (no email auth)
  - Buyer accounts have null passwords (security measure - cannot login)
  - 4-role system: admin, editor, viewer (sellers) and buyer
  - Seller emails blocked from guest checkout to prevent role confusion
  - **Order Authorization**: Comprehensive multi-tenant security - sellers can only view/modify orders containing their products; buyers can only view their own orders; platform owner/admin can access all orders. Cart validation enforces single-seller orders for proper data isolation and payment routing.
- **Notification System**: 
  - Comprehensive email notification system using Resend
  - All emails sent from Upfirst (platform branding), seller emails use Reply-To
  - Development mode: verification codes logged to console when domain unverified
  - Phase 1 notifications implemented: seller welcome (triggered on signup)
  - Phase 1 templates ready: Stripe onboarding reminders, payment failures, inventory alerts, payout failures (require webhook integration)
  - 30+ notification types planned across 3 phases (see docs/notification-system-design.md)
- **Payment Processing**: Integrated with **Stripe Connect** for multi-seller payments, supporting Apple Pay, Google Pay, and credit cards. Supports balance payments for pre-orders. Each order contains products from a single seller only - payment routes directly to that seller's Stripe Connect account.
- **Subscription System**: Sellers pay a monthly or annual fee with a 30-day free trial. Payment methods are securely stored using Stripe Customer objects.
- **Multi-Currency Support**: Automatic IP-based currency detection with a user-selectable currency switcher and real-time exchange rate conversion.
- **NFT Minting**: Buyers can mint NFTs on the Solana devnet for fully paid orders, integrated with Phantom wallet.
- **Wholesale B2B System**: Invitation-only system for managing wholesale products with specific pricing and order requirements.
- **Social Ads System**: Comprehensive multi-platform social advertising (Meta, TikTok, X) with AI optimization, creative controls, and budget management.
- **Instagram Integration**: Sellers can connect Instagram to use their username as their store URL.
- **Session Management**: PostgreSQL-backed sessions using `express-session` and `connect-pg-simple`.
- **Store Visibility Control**: Sellers can toggle store status (active/inactive). Inactive stores show a "Store Unavailable" page to buyers with seller contact info, while sellers retain full access to manage their inactive stores.
- **Newsletter System**: Comprehensive email marketing system with subscriber management, rich text editor (React Quill), email groups/segments, live preview (desktop/mobile), and analytics dashboard. Integrated with Resend batch API for bulk sending with open/click/bounce tracking. Development mode logs newsletters to console for testing with unverified domains. Includes tracking pixels, unsubscribe links, and deduplicated event analytics. Production-ready pending domain verification.

## External Dependencies
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Custom email-based auth (verification codes and magic links)
- **Email Service**: Resend (for transactional emails and notifications)
- **Payment Gateway**: Stripe SDK
- **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API, Instagram Basic Display API
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form
- **Validation**: Zod
- **CSV Parsing**: PapaParse
- **Currency Exchange**: Fawazahmed0 Currency API
- **Blockchain**: Solana Web3.js, Metaplex SDK, Phantom Wallet