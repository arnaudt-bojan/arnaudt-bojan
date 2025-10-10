# Upfirst - E-Commerce Platform

## Overview
Upfirst is an e-commerce platform empowering creators and brands to sell various product types: in-stock, pre-order, made-to-order, and wholesale. It offers a unified user experience for buyers and sellers, featuring product browsing, a shopping cart, authenticated checkout, and a comprehensive seller dashboard for managing products and orders. Key capabilities include a B2B wholesale system, advanced AI-optimized social media advertising, and robust multi-seller payment processing via Stripe Connect. The platform aims to provide a seamless, modern, and scalable solution for online commerce.

## User Preferences
- **Communication Style**: I prefer clear, concise explanations with a focus on actionable steps.
- **Coding Style**: Favor modern JavaScript/TypeScript practices, functional components in React, and maintainable code.
- **Workflow Preferences**: I prefer an iterative development approach, focusing on core features first and then enhancing them.
- **Interaction Preferences**: Ask for confirmation before implementing significant architectural changes or refactoring large portions of the codebase.
- **Working Preferences**: Ensure all UI implementations adhere to the `design_guidelines.md` and prioritize mobile-first responsive design. Ensure consistent spacing and typography. Do not make changes to the `replit.nix` file.

## System Architecture
Upfirst is built with a modern web stack. The frontend utilizes **React, TypeScript, Tailwind CSS, and Shadcn UI** for a responsive user experience, with **TanStack Query** and **React Context** for state management, and **Wouter** for routing. Forms are managed by **React Hook Form** with **Zod** validation. The backend is an **Express.js, Node.js** application, using **PostgreSQL (Neon)** with **Drizzle ORM** for data persistence.

**UI/UX Decisions:**
- **Design System**: Supports dark/light mode, Inter font family, consistent spacing and typography, and mobile-first responsive design.
- **Navigation**: Dashboard-centric design with consistent navigation (e.g., "Back to Dashboard" breadcrumb). Desktop features a clean header, while mobile uses a burger menu.
- **Product Display**: Multi-image support with interactive carousels. Product types are color-coded for clarity.
- **Dashboard Design**: Seller dashboard includes revenue analytics and order management; buyer dashboard offers order tracking and order details access.

**System Design Choices & Feature Specifications:**
- **Product Management**: Supports diverse product types with multi-image uploads and bulk CSV import. Features a **simplified size-first variant system** where most products list color in the product name (e.g., "Red T-Shirt") then add size variants (S, M, L, XL). Optional color mode available for products that come in multiple colors - when enabled, first color automatically pre-populates with main product images (deletable). Enhanced validation system with clear error messages for required fields (name, description, price, image, category) and explicit "(optional)" labels for optional fields (stock, discount, variants, etc.). Category selection uses real-time form field updates to prevent validation errors. **Shipping system includes package preset dropdown with imperial/metric unit toggle, international carrier templates (US, UK, Europe, Canada, Australia), and zone-based shipping matrices**.
- **Shopping & Checkout**: Includes a slide-over cart, persistent cart, guest checkout, and automatic shipping cost calculation. Carts enforce a single-seller constraint for proper payment routing and data isolation.
- **Authentication & Authorization**: Email-based authentication with dual-token system. Login codes (6-digit, single-use, 15 min expiry) for manual verification. Magic links in emails (reusable, 6 month expiry) for one-click login. Sellers assigned admin role, buyers created automatically via guest checkout. 4-role system (admin, editor, viewer, buyer) with multi-tenant security ensures data isolation.
- **Notification System**: Comprehensive email notifications using Resend, with planned support for 30+ types.
- **Payment Processing**: Integrated with **Stripe Connect** for multi-seller payments, supporting credit cards and balance payments for pre-orders. Features borderless onboarding for sellers with automatic capability management - both `card_payments` and `transfers` capabilities are explicitly requested during account creation and auto-updated for existing accounts. This ensures proper payment routing with `on_behalf_of` parameter (seller name on customer statement). Note: Apple Pay and Google Pay are disabled in checkout as they require domain verification with Stripe (not feasible on Replit subdomains).
  - **Capability Status Monitoring**: UI displays real-time Stripe Connect capability status. Only shows "Fully Enabled" when both `card_payments` and `transfers` capabilities are "active". Any other status (inactive, pending, restricted) triggers a warning and "Complete Onboarding" button.
  - **Checkout Error Handling**: Clear error messages when seller hasn't completed Stripe setup, preventing generic Stripe errors for buyers. Payment success toast only appears AFTER order is successfully created in database, preventing confusion when order creation fails after payment.
- **Subscription System**: Monthly/annual subscription model for sellers with a free trial, managed via Stripe Customer objects, enabling store activation/deactivation.
- **Multi-Currency Support**: IP-based currency detection with a user-selectable currency switcher and real-time exchange rates.
- **Wholesale B2B System**: Invitation-only access for managing wholesale products and orders. Buyers only see the wholesale catalog link (in dashboard and mobile menu) if they have accepted invitations from sellers. Backend filters products to only show items from sellers who invited that specific buyer.
- **Social Ads System**: Multi-platform social advertising (Meta, TikTok, X) with AI optimization, creative controls, and budget management.
- **Item-Level Order Tracking**: Comprehensive per-item fulfillment system with independent status, tracking, and shipping for each product in an order. Includes automated buyer notifications.
- **Image Editing System**: Built-in image editor (crop, zoom, rotate, flip, filters) for logos and banners using `react-easy-crop`.
- **Flexible Shipping System**: Three-tier configuration allowing sellers to define zone-based shipping matrices, flat rates, real-time rates via Shippo, or free shipping.
- **Document Generation System**: Professional PDF invoice and packing slip generation using pdfkit, with templates for B2C and wholesale, object storage integration, and automatic generation triggers.
- **Saved Addresses & Payment Methods**: PCI-DSS compliant system allowing all users (buyers and sellers) to securely save shipping addresses and payment methods for faster checkout. Addresses stored directly in database with full details. Payment methods use Stripe Payment Methods API - only Stripe tokens and display metadata stored (never raw card data). Available in Settings > Addresses & Payments tab.
- **Cart System**: Shopping cart stored in browser localStorage with automatic single-seller constraint enforcement. Sellers' carts are automatically cleared on login to prevent confusion (sellers don't shop on their own platform).
- **Domain Detection System**: Intelligent domain routing that treats Replit deployment URLs as the main application domain. Seller storefronts are only identified through explicit `/s/:username` routes or `?seller=username` query parameters. This prevents false "Store Not Found" errors when users navigate the main application. Supports future custom domain mapping for sellers.

## Testing Buyer Experience as a Seller

**Problem**: Sellers need to test the complete buyer flow (checkout, emails, order confirmation) but their seller account can't shop.

**Solutions**:

### Option 1: Guest Checkout (Recommended)
1. Open an **Incognito/Private Browser Window**
2. Navigate to your storefront URL (from Share Store link)
3. Add products to cart and checkout as a guest
4. Use your personal email to receive buyer notifications
5. Check order in seller dashboard

### Option 2: Create Test Buyer Account
1. Use a different email (e.g., `yourname+buyer@gmail.com`)
2. Checkout as guest with that email
3. Buyer account is auto-created
4. Check that email inbox for order confirmations

### Option 3: Use Another Browser
1. If not using incognito, use a completely different browser
2. Your seller session stays in Chrome, buyer session in Firefox/Safari
3. Checkout normally and receive all buyer emails

**Why This Works**: The cart clearing happens when you login as a seller. Guest/incognito sessions don't have seller authentication, so they work as normal buyer flows.

## Recent Changes (October 10, 2025)

### Currency Symbol Display Fix
- Fixed currency symbol to show universal symbol (¤) when Stripe not connected
- API now returns `null` currency when no Stripe connection
- getCurrencySymbol properly handles null/undefined and returns ¤
- Updated: `server/routes.ts`, `client/src/lib/currency-utils.ts`

### Variant System Redesign (Size-First)
- **Redesigned variant system** to be simpler and more intuitive
- **Default mode**: Size-only variants (most common use case - e.g., "Red T-Shirt" in S, M, L, XL)
- **Optional color mode**: Toggle to enable colors for products in multiple colors
- **First color pre-population**: When adding first color, automatically includes main product images (deletable)
- **Implementation**: New `SimpleVariantManager` component replaces old `ProductVariantManager`
- **Data structure**: Stores `hasColors` flag with either size array (simple) or color variants (complex)
- **Updated files**: 
  - `client/src/components/simple-variant-manager.tsx` (new)
  - `client/src/components/product-form-fields.tsx` (updated)
  - `client/src/pages/create-product.tsx` (updated)
  - `client/src/pages/edit-product.tsx` (updated)

### Shipping System Enhancements
- **Package presets**: Dropdown with standard sizes (envelope, small box, medium box, large box, tube, wine box)
- **Unit toggle**: Switch between Imperial (lb/in) and Metric (kg/cm) with proper conversion
- **International carriers**: Expanded from US-only to international templates:
  - US: USPS, FedEx, UPS (envelopes, paks, boxes)
  - UK: Royal Mail, Parcelforce
  - Europe: DHL, DPD, Hermes
  - Canada: Canada Post
  - Australia: Australia Post
- **Updated**: `client/src/components/product-form-fields.tsx`

### Authentication Token System Improvements
- **Dual-Token System**: Separated login codes from magic links with distinct behavior
  - Login codes: 6-digit, single-use, 15-minute expiry (for manual entry)
  - Magic links: Reusable, 6-month expiry (for one-click email login)
- **Schema Update**: Added `tokenType` field to `auth_tokens` table ('login_code' vs 'magic_link')
- **Security Fix**: Legacy tokens (null tokenType) are treated as single-use to prevent replay attacks
- **Implementation**: Updated token generation and verification logic in `server/auth-email.ts`

### Store Activation Default
- Changed `storeActive` default from 0 to 1 in users table
- New sellers now have stores set to "Live" by default upon account creation
- No manual activation required for new sellers

### Subscription Sync Improvements
- Fixed UI refresh issue after Stripe checkout completion
- Added `queryClient.invalidateQueries` after subscription sync to ensure UI updates
- Added user-facing toast notification when subscription status is synced
- Updated: `client/src/components/subscription-pricing-dialog.tsx`

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