# Uppshop - E-Commerce Platform

## Overview
Uppshop is a modern e-commerce platform for creators and brands to sell various product types: in-stock, pre-order (with deposit functionality), made-to-order, and wholesale. It offers a seamless buying and selling experience with a unified user model. Key capabilities include product browsing, shopping cart, authenticated checkout, a comprehensive seller dashboard for product and order management, and a B2B wholesale system with invitation-only access. The platform also integrates advanced social media advertising features with AI optimization and robust payment processing, including NFT minting for buyers.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Uppshop is built with a modern web stack. The frontend utilizes **React, TypeScript, Tailwind CSS, and Shadcn UI** for a responsive user experience, managing state with **TanStack Query** and **React Context**, and routing with **Wouter**. Forms are handled by **React Hook Form** with **Zod** validation. The backend is an **Express.js, Node.js** application, using **PostgreSQL (Neon)** with **Drizzle ORM** for persistent data storage.

**UI/UX Decisions:**
- **Design System**: Dark/light mode support, Inter font family, consistent spacing and typography, mobile-first responsive design.
- **Product Display**: Multi-image support with interactive carousels on product cards and thumbnail galleries on product detail pages. Color-coded badges for product types (In-Stock: Green, Pre-Order: Blue, Made-to-Order: Purple, Wholesale: Orange).
- **Dashboard Design**: Seller dashboard features revenue analytics and order management. Buyer dashboard provides order tracking and NFT minting access.

**Technical Implementations & Feature Specifications:**
- **Product Management**: Supports in-stock, pre-order (with deposit), made-to-order, and wholesale products. Sellers can create, view, and manage products, including multi-image uploads.
- **Shopping & Checkout**: Features a slide-over cart, quantity adjustment, persistent cart, and guest checkout with automatic account creation. Checkout displays subtotal, shipping cost (fetched from seller settings), and total with shipping automatically added to order total.
- **Authentication & Authorization**: Dual system using Replit Auth (OAuth) and local authentication for testing, with role-based access for buyers and sellers. Users are redirected to their respective dashboards post-login.
- **Payment Processing**: Integrated with Stripe SDK for Apple Pay, Google Pay, and credit cards. Sellers can connect their Stripe accounts via OAuth. Supports balance payments for pre-orders.
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
- **Currency Exchange**: Fawazahmed0 Currency API
- **Blockchain**: Solana Web3.js, Metaplex SDK, Phantom Wallet
- **Email Service**: SendGrid API (placeholder)