# Uppshop - E-Commerce Platform

## Overview
Uppshop is a modern e-commerce platform inspired by uppfirst.com, designed for creators and brands to sell various product types: in-stock, pre-order (with deposit functionality), made-to-order, and wholesale. It aims to provide a seamless buying and selling experience with a unified user model. Key capabilities include a user-friendly landing page, product browsing, shopping cart functionality, authenticated checkout, and a comprehensive seller dashboard for product and order management. The platform also integrates advanced social media advertising features with AI optimization and robust payment processing.

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
- **Landing Page**: Inspired by uppfirst.com, featuring a bold hero section, product type showcases, and a features grid.
- **Seller Dashboard**: Provides revenue analytics, recent orders, and quick navigation for product management.

**Technical Implementations & Feature Specifications:**
- **Product Types**: Supports in-stock, pre-order (with `depositAmount` and `requiresDeposit`), made-to-order, and wholesale.
- **Shopping & Checkout**: Slide-over cart, quantity adjustment, persistent cart (localStorage), authenticated checkout, and order confirmation.
- **Buyer/Seller Separation**:
    - **Dual Login System**: Users can login as "Buyer" or "Seller" on the home page, with separate role assignment during registration.
    - **Buyer Dashboard** (`/buyer-dashboard`): Dedicated interface for buyers to view their orders with NFT minting capabilities.
    - **Seller Dashboard** (`/seller-dashboard`): Comprehensive seller interface with revenue analytics, product management, order tracking, and newsletter tools.
    - **Role-Based Routing**: Authentication callback automatically redirects users to appropriate dashboard based on their role.
- **Seller Features**:
    - **Product Management**: Comprehensive creation form (name, description, price, type, stock, image, category), list view, deletion with confirmation.
    - **Newsletter System**: Complete newsletter management with email list creation, content composition, and SendGrid integration placeholder for bulk email sending.
- **Buyer Features**:
    - **Order Tracking**: View all orders with payment status, order status, and detailed breakdowns.
    - **NFT Minting**: Mint Solana-based NFTs from fully paid orders with product metadata embedded on-chain (Solana integration placeholder).
- **Authentication**: Replit Auth with OpenID Connect, PostgreSQL-backed sessions (`express-session` + `connect-pg-simple`). Anonymous users can browse; authenticated users login as buyer or seller with role-based access.
- **Protected API Endpoints**: Authentication required for creating orders, accessing user-specific orders, managing all orders (for dashboard), all product management operations (create, edit, delete), newsletter management, and NFT minting.
- **Payment Integration**: Stripe SDK integration for Apple Pay, Google Pay, and credit card. Includes a seller-triggered balance payment system for pre-orders.
- **Social Ads System**: Comprehensive multi-platform social ads system with AI optimization for Meta (Advantage+ AI), TikTok (Smart Performance), and X (Promoted Tweets). Features popup OAuth for seamless connection, detailed creative controls, budget optimization, and manual targeting overrides.

**System Design Choices:**
- **Project Structure**: Organized into `client/`, `server/`, and `shared/` directories.
    - `client/`: Contains React components, pages, hooks, and utilities.
    - `server/`: Houses API routes, storage implementation, authentication, and server configuration.
    - `shared/`: Contains Drizzle schemas and Zod validation.
- **Data Models**: Defined schemas for:
    - `Product`: id, name, description, price, image, category, productType, stock, depositAmount, requiresDeposit
    - `Order`: id, userId, customerName, customerEmail, customerAddress, items, total, amountPaid, remainingBalance, paymentType, paymentStatus, stripePaymentIntentId, status, createdAt
    - `User`: id, email, firstName, lastName, profileImageUrl, role (owner/admin/manager/staff/viewer/customer/buyer/seller), invitedBy, createdAt, updatedAt
    - `Newsletter`: id, userId, subject, content, recipients (jsonb), status, sentAt, createdAt
    - `NftMint`: id, orderId, userId, mintAddress, transactionSignature, metadata (jsonb), createdAt
- **Database**: PostgreSQL with Drizzle ORM for all persistent data (products, orders, users, sessions, newsletters, nft_mints).

## External Dependencies
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
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
- **Blockchain**: Solana Web3.js, SPL Token, Metaplex SDK (NFT minting placeholder)
- **Email Service**: SendGrid API (integration placeholder for newsletter sending)