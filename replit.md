# Upfirst - E-Commerce Platform

## Overview
Upfirst is a D2C e-commerce platform designed to empower creators and brands with individual, subdomain-based storefronts. It supports diverse product types (in-stock, pre-order, made-to-order, wholesale) and integrates essential e-commerce functionalities such as product management, shopping cart, authenticated checkout, a comprehensive seller dashboard, and AI-optimized social media advertising. The platform features B2B wholesale capabilities, multi-seller payment processing via Stripe Connect, multi-currency support, and an advanced tax system. Upfirst's ambition is to provide a scalable, secure, and modern direct-to-consumer solution with significant market potential.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst employs a modern web stack: React, TypeScript, Tailwind CSS, and Shadcn UI for the frontend; a NestJS/Express.js Node.js backend; PostgreSQL (Neon) as the database; and Prisma ORM for all database operations. The backend features a GraphQL API with Socket.IO for real-time updates and Docker for containerization.

**Core Architectural Principle: Three Parallel Platforms with Server-Side Business Logic**
The platform is structured into three distinct, parallel platforms, with all business logic strictly implemented server-side (Architecture 3):
1.  **B2C Platform** (Retail/Direct-to-Consumer): Dedicated storefronts, shopping cart, checkout, order management, and a seller dashboard.
2.  **B2B Platform** (Wholesale): Invitation-based buyer access, Minimum Order Quantity (MOQ) enforcement, deposit/balance payments, and a separate dashboard.
3.  **Trade Platform** (Professional Quotations): Excel-like quotation builder, token-based buyer access, status tracking, and its own dashboard.

**Mandatory Architectural Principles:**
-   **Architecture 3: Server-Side Business Logic Only**: All calculations, business logic, and data transformations must occur server-side. The client displays server-provided data without performing critical business calculations.
-   **Mobile-First Design Standards**: All new UI components and features must be designed mobile-first, ensuring responsiveness across devices.

**UI/UX Decisions:**
The design system supports dark/light modes, uses the Inter font, emphasizes consistent spacing and typography, and prioritizes a mobile-first responsive approach. Navigation is dashboard-centric, and storefronts offer customizable seller branding.

**Technical Implementations:**
-   **Backend**: NestJS application for GraphQL API and Socket.IO, integrated with an existing Express.js server. Uses service layer pattern with dependency injection, authentication guards, and DataLoaders for N+1 query prevention.
-   **GraphQL API**: Comprehensive schema with 10 domain modules (Identity, Catalog, Cart, Orders, Wholesale, Quotations, Subscriptions, Marketing, Newsletter, Platform Ops), including queries, mutations, and subscriptions. Secured with session-based authentication and role-based access control.
-   **Real-time Features**: Socket.IO integration for real-time updates on orders, cart, and notifications, using user-specific and seller broadcast rooms.
-   **Product Management**: Supports diverse product types, simplified size-first variants, multi-image uploads, and bulk CSV import with AI-powered field mapping.
-   **Cart & Inventory**: Enterprise-grade "soft hold" cart reservation with PostgreSQL row-level locking and transaction-based stock reservation.
-   **Order Management**: Comprehensive order lifecycle management, fulfillment tracking, and refunds.
-   **Wholesale B2B System**: Invitation-based access, variant-level MOQ, percentage deposit system, Net 30/60/90 payment terms, and comprehensive order lifecycle management.
-   **Trade Quotation System**: Customizable quotation numbers, professional invoice structure, Incoterms support, Excel-like line item builder, server-side pricing validation, and secure token-based buyer access.
-   **Payments & Subscriptions**: Integrated with Stripe Connect for multi-seller payments and recurring seller subscriptions.
-   **Multi-currency & Tax**: IP-based currency detection with user-selectable options and an advanced tax system.
-   **Social Ads System**: Multi-platform (Meta, TikTok, X) social advertising with AI optimization via Google Gemini.
-   **Email System**: Production-ready infrastructure with 37+ transactional templates covering all platform workflows and enterprise-grade newsletter capabilities.
-   **Custom Domains**: Allows sellers to connect custom domains with DNS verification, SSL provisioning, and routing.
-   **Analytics**: Comprehensive seller analytics dashboard with server-side calculations for various business insights.
-   **Deployment**: Dockerized with multi-stage builds for NestJS API, Vite frontend, and Next.js frontend, orchestrated with `docker-compose` and Nginx reverse proxy.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **ORM**: Prisma ORM
-   **Email Service**: Resend
-   **Payment Gateway**: Stripe SDK
-   **Shipping Service**: Shippo API
-   **Social Media APIs**: Meta Graph API, TikTok Business API, X (Twitter) Ads API
-   **AI Services**: Google Gemini API
-   **UI Components**: Shadcn UI
-   **Styling**: Tailwind CSS
-   **State Management**: TanStack Query
-   **Routing**: Wouter, Next.js App Router
-   **Forms**: React Hook Form
-   **Validation**: Zod
-   **CSV Parsing**: PapaParse, XLSX
-   **Currency Exchange**: Fawazahmed0 Currency API
-   **PDF Generation**: PDFKit
-   **Rich Text Editor**: TinyMCE
-   **WebSocket**: Socket.IO