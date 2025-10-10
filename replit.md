# Upfirst - E-Commerce Platform

## Overview
Upfirst is an e-commerce platform designed to empower creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. It provides a unified user experience for both buyers and sellers, offering product browsing, a shopping cart, authenticated checkout, and a comprehensive seller dashboard for managing products and orders. The platform includes a B2B wholesale system, advanced AI-optimized social media advertising integration, and robust multi-seller payment processing via Stripe Connect. Its core purpose is to deliver a seamless, modern, and scalable solution for online commerce.

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
- **Product Management**: Supports diverse product types (in-stock, pre-order, made-to-order, wholesale) with multi-image uploads and bulk CSV import. Features a simplified size-first variant system, with an optional color mode for products in multiple colors. Enhanced validation includes explicit "(optional)" labels for optional fields and real-time form field updates for category selection. Shipping system includes package presets, imperial/metric unit toggle, international carrier templates, and zone-based shipping matrices.
- **Shopping & Checkout**: Includes a slide-over cart, persistent cart, guest checkout, and automatic shipping cost calculation. Carts enforce a single-seller constraint.
- **Authentication & Authorization**: Email-based authentication with a dual-token system (6-digit, single-use login codes and reusable magic links). Features a 4-role system (admin, editor, viewer, buyer) with multi-tenant security.
- **Notification System**: Comprehensive email notifications using Resend, with planned support for over 30 types.
- **Payment Processing**: Integrated with Stripe Connect for multi-seller payments, supporting credit cards and balance payments for pre-orders. Features borderless onboarding for sellers with automatic capability management (`card_payments` and `transfers`). UI displays real-time Stripe Connect capability status and provides clear checkout error handling.
- **Subscription System**: Monthly/annual subscription model for sellers with a free trial, managed via Stripe Customer objects, enabling store activation/deactivation.
- **Multi-Currency Support**: IP-based currency detection with user-selectable currency switcher and real-time exchange rates.
- **Wholesale B2B System**: Invitation-only access for managing wholesale products and orders, with backend filters to show relevant catalogs to invited buyers.
- **Social Ads System**: Multi-platform social advertising (Meta, TikTok, X) with AI optimization, creative controls, and budget management.
- **Item-Level Order Tracking**: Comprehensive per-item fulfillment system with independent status, tracking, and shipping for each product in an order, including automated buyer notifications.
- **Image Editing System**: Built-in image editor (crop, zoom, rotate, flip, filters) for logos and banners.
- **Flexible Shipping System**: Three-tier configuration allowing sellers to define zone-based shipping matrices, flat rates, real-time rates via Shippo, or free shipping.
- **Document Generation System**: Professional PDF invoice and packing slip generation using pdfkit, with templates for B2C and wholesale, object storage integration, and automatic generation.
- **Saved Addresses & Payment Methods**: PCI-DSS compliant system for securely saving shipping addresses and payment methods, leveraging Stripe Payment Methods API for card data tokenization.
- **Cart System**: Shopping cart stored in browser localStorage with automatic single-seller constraint enforcement. Sellers' carts are cleared on login.
- **Domain Detection System**: Intelligent domain routing that treats Replit deployment URLs as the main application, identifying seller storefronts via explicit `/s/:username` routes or `?seller=username` query parameters.

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