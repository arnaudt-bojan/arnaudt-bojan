# Uppshop - E-Commerce Platform

## Overview
Uppshop is a modern e-commerce platform inspired by uppfirst.com, designed for creators and brands to sell various product types: in-stock, pre-order (with deposit functionality), made-to-order, and wholesale. It aims to provide a seamless buying and selling experience with a unified user model. Key capabilities include a user-friendly landing page, product browsing, shopping cart functionality, authenticated checkout, a comprehensive seller dashboard for product and order management, and a B2B wholesale system similar to Joor with invitation-only access. The platform also integrates advanced social media advertising features with AI optimization and robust payment processing.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Uppshop is built with a modern web stack. The frontend utilizes **React, TypeScript, Tailwind CSS, and Shadcn UI** for a responsive and consistent user experience, managing state with **TanStack Query** and **React Context**, and routing with **Wouter**. Forms are handled by **React Hook Form** with **Zod** validation. The backend is an **Express.js, Node.js** application, using **PostgreSQL (Neon)** with **Drizzle ORM** for persistent data storage.

**UI/UX Decisions:**
- **Design System**: Dark/light mode support, Inter font family, consistent spacing and typography.
- **Product Type Badges**: Color-coded for easy identification (In-Stock: Green, Pre-Order: Blue, Made-to-Order: Purple, Wholesale: Orange).
- **Responsive Design**: Mobile-first approach across all components.
- **Landing Page**: Inspired by uppfirst.com, featuring a bold hero section, product type showcases, features grid, and a featured products section displaying up to 8 products. Products are visible to all users (logged in or logged out) and can be added to cart directly from the home page.
- **Seller Dashboard**: Provides revenue analytics, recent orders, and quick navigation for product management.
- **Multi-Image Product Display**:
    - **Product Cards**: Interactive carousel with left/right navigation buttons (visible on hover) and dot indicators showing current image
    - **Product Detail Page (PDP)**: Main image display with thumbnail gallery below (5-column grid), clickable thumbnails with primary border highlight for selected image
    - **Image Storage**: Products support up to 10 images stored as TEXT[] array in database (`images` field)

**Technical Implementations & Feature Specifications:**
- **Product Types**: Supports in-stock, pre-order (with `depositAmount` and `requiresDeposit`), made-to-order, and wholesale.
- **Shopping & Checkout**: Slide-over cart, quantity adjustment, persistent cart (localStorage), guest checkout with auto-account creation, and order confirmation. Products are displayed on the landing page and accessible to all users without login requirement.
- **Guest Checkout**: 
    - **No Login Required**: Users can browse products and checkout without authentication
    - **Auto-Account Creation**: If email doesn't exist, automatically creates a buyer account with password "123456"
    - **Order Association**: All guest purchases are linked to user accounts (new or existing)
    - **Later Login**: Guests can log in with their email and auto-generated password to view orders
- **Instagram OAuth Integration**:
    - **Verified Username**: Sellers can connect their Instagram account via OAuth to automatically use their verified Instagram username as their store URL
    - **OAuth Flow**: Popup-based OAuth using Instagram Basic Display API with automatic token exchange
    - **Database Fields**: `instagramUserId`, `instagramUsername`, `instagramAccessToken` stored in users table
    - **API Routes**: `/api/instagram/connect` (initiate), `/api/instagram/callback` (handle OAuth), `/api/instagram/disconnect` (remove connection)
    - **Settings UI**: Connect/Disconnect Instagram buttons with connection status display, fallback to manual username input
    - **Requirements**: `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` environment variables from Meta/Facebook Developer Portal
- **Buyer/Seller Separation**:
    - **Dual Login System**: Users can login as "Buyer" or "Seller" on the home page, with separate role assignment during registration.
    - **Buyer Dashboard** (`/buyer-dashboard`): Dedicated interface for buyers to view their orders with NFT minting capabilities.
    - **Seller Dashboard** (`/seller-dashboard`): Comprehensive seller interface with revenue analytics, product management, order tracking, and newsletter tools.
    - **Role-Based Routing**: Authentication callback automatically redirects users to appropriate dashboard based on their role.
- **Seller Features**:
    - **Product Management**: Comprehensive creation form (name, description, price, type, stock, category), list view, deletion with confirmation.
        - **Multi-Image Upload**: Support for up to 10 product images per product with dynamic add/remove UI
        - **Primary Image**: First image in array serves as primary display image on product cards
    - **Order Management**: View all orders with click-through to individual order detail pages showing complete order information, customer details, payment status, and item breakdowns.
    - **Settings Page**: Profile management, password changes, store branding (banner/logo upload), and payment provider configuration (Stripe/PayPal).
    - **Newsletter System**: Complete newsletter management with email list creation, content composition, and SendGrid integration placeholder for bulk email sending.
- **Buyer Features**:
    - **Order Tracking**: View all orders with payment status, order status, and detailed breakdowns.
    - **NFT Minting**: Real Solana blockchain NFT minting for fully paid orders with Phantom wallet integration.
        - **Wallet Connection**: Phantom wallet browser extension integration via WalletContext with connect/disconnect functionality
        - **Real Blockchain**: NFTs minted on Solana devnet using Metaplex SDK
        - **Gas Fees**: Platform pays gas fees (~0.01-0.02 SOL per mint) via SOLANA_PAYER_PRIVATE_KEY
        - **NFT Ownership**: NFTs minted directly to user's connected wallet address
        - **Metadata**: Product details (name, price, image, order ID) stored on-chain via Metaplex
        - **Setup**: Use `npx tsx scripts/generate-solana-keypair.ts` to generate a new payer keypair for SOLANA_PAYER_PRIVATE_KEY
- **Authentication**: Dual authentication system:
    - **Replit Auth (OAuth)**: OpenID Connect with role-based access
    - **Local Authentication**: Simple username/password for testing purposes
    - **Test Accounts**: testbuyer@test.com / 123456 (buyer role), testseller@test.com / 123456 (seller role)
    - **Session Management**: PostgreSQL-backed sessions (`express-session` + `connect-pg-simple`)
    - **Login Page**: `/login` route provides form-based authentication for test accounts
- **Protected API Endpoints**: Authentication required for accessing user-specific orders, managing all orders (for dashboard), all product management operations (create, edit, delete), newsletter management, and NFT minting. Order creation supports both authenticated and guest checkout.
- **Payment Integration**: 
    - **Stripe SDK**: Apple Pay, Google Pay, and credit card support
    - **Stripe Connect OAuth**: Sellers can connect existing Stripe accounts or create new ones via OAuth flow
        - **OAuth Routes**: `/api/stripe/connect` (initiate), `/api/stripe/callback` (handle response), `/api/stripe/disconnect` (remove connection)
        - **Account Connection**: Sellers redirect to Stripe for authorization, can login to existing account or create new one with minimal setup
        - **Direct Payments**: Connected accounts receive payments directly (future feature: automatic payouts)
        - **Settings UI**: Connection status display, connect/disconnect buttons, explanatory information
        - **Database**: `stripeConnectedAccountId` stored in users table
    - **Balance Payment System**: Seller-triggered balance payment for pre-order deposits
- **Multi-Currency Support**: 
    - **Automatic Detection**: IP-based geolocation automatically detects user's currency on first visit
    - **Currency Selector**: Globe icon in header allows users to switch between 16+ popular currencies (USD, EUR, GBP, JPY, CAD, AUD, CHF, INR, etc.)
    - **Real-time Conversion**: All prices (product cards, detail pages, cart, checkout) automatically convert using live exchange rates
    - **Daily Rate Updates**: Exchange rates fetched from Fawazahmed0 Currency API (free, no API key required) and cached for 24 hours
    - **Persistent Selection**: User's currency preference saved in localStorage across sessions
- **Wholesale B2B System**: Joor-inspired invitation-only B2B platform for wholesale buyers
    - **Wholesale Products**: Sellers can create wholesale-specific products with MOQ (Minimum Order Quantity), RRP (Recommended Retail Price), wholesale pricing, deposit/balance options, and readiness dates
    - **Product Creation**: Sellers can upload new wholesale products or link existing retail products to wholesale catalog
    - **Invitation Management**: Token-based invitation system for wholesale buyers with pending/accepted/rejected status tracking
    - **Buyer Access Control**: Wholesale section accessible only to invited and accepted buyers
    - **Dedicated Dashboard**: Separate wholesale section in seller dashboard with product management and buyer invitation tools
    - **Database**: `wholesale_products` (sellerId, productId optional, rrp, wholesalePrice, moq, depositAmount, readinessDate, variants), `wholesale_invitations` (sellerId, buyerEmail, status, token)
    - **Routes**: `/seller/wholesale/products`, `/seller/wholesale/create-product`, `/seller/wholesale/invitations`
- **Social Ads System**: Comprehensive multi-platform social ads system with AI optimization for Meta (Advantage+ AI), TikTok (Smart Performance), and X (Promoted Tweets). Features popup OAuth for seamless connection, detailed creative controls, budget optimization, and manual targeting overrides.

**System Design Choices:**
- **Project Structure**: Organized into `client/`, `server/`, and `shared/` directories.
    - `client/`: Contains React components, pages, hooks, and utilities.
    - `server/`: Houses API routes, storage implementation, authentication, and server configuration.
    - `shared/`: Contains Drizzle schemas and Zod validation.
- **Data Models**: Defined schemas for:
    - `Product`: id, name, description, price, image (primary), images (TEXT[] array up to 10), category, productType, stock, depositAmount, requiresDeposit, variants (jsonb), madeToOrderDays, preOrderDate
    - `Order`: id, userId, customerName, customerEmail, customerAddress, items, total, amountPaid, remainingBalance, paymentType, paymentStatus, stripePaymentIntentId, status, createdAt
    - `User`: id, email, username, firstName, lastName, profileImageUrl, password (for local test accounts), role (owner/admin/manager/staff/viewer/customer/buyer/seller), invitedBy, storeBanner, storeLogo, paymentProvider, stripeConnectedAccountId, paypalMerchantId, instagramUserId, instagramUsername, instagramAccessToken, createdAt, updatedAt
    - `Newsletter`: id, userId, subject, content, recipients (jsonb), status, sentAt, createdAt
    - `NftMint`: id, orderId, userId, mintAddress, transactionSignature, metadata (jsonb), createdAt
    - `WholesaleProduct`: id, sellerId, productId (optional), name, description, image (primary), images (TEXT[] array), category, rrp, wholesalePrice, moq, depositAmount, requiresDeposit, stock, readinessDays, variants (jsonb), createdAt, updatedAt
    - `WholesaleInvitation`: id, sellerId, buyerEmail, buyerName, status, token, createdAt, acceptedAt
- **Database**: PostgreSQL with Drizzle ORM for all persistent data (products, orders, users, sessions, newsletters, nft_mints, wholesale_products, wholesale_invitations).

## External Dependencies
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect) + Local Authentication (passport-local for testing)
- **Payment Gateway**: Stripe SDK
- **Social Media APIs**:
    - Meta Graph API (for Facebook/Instagram Ads)
    - TikTok Business API v1.3 (for TikTok Ads)
    - X (Twitter) Ads API (OAuth 1.0a, backend structure in place)
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form
- **Validation**: Zod
- **Session Management**: `express-session`, `connect-pg-simple`
- **Currency Exchange**: Fawazahmed0 Currency API (free, 200+ currencies, no API key)
- **Blockchain**: 
    - **Solana Web3.js**: Connection to Solana blockchain (devnet)
    - **Metaplex SDK**: NFT creation and metadata management
    - **Phantom Wallet**: Browser extension for wallet connection
    - **SolanaService** (`server/solanaService.ts`): Handles NFT minting, metadata upload, and gas fee payment
- **Email Service**: SendGrid API (integration placeholder for newsletter sending)