# Uppshop - E-Commerce Platform

## Overview
Uppshop is a modern e-commerce platform inspired by uppfirst.com, designed for creators and brands to sell products with flexible selling options. The platform supports multiple product types: in-stock, pre-order, made-to-order, and wholesale products.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Storage**: DatabaseStorage with persistent data
- **State Management**: TanStack Query, React Context
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

## Features Implemented

### Customer Features
✅ **Landing Page** (Inspired by uppfirst.com)
- Bold hero section with "Sell Any Way, Instantly" messaging
- Product type showcase cards (in-stock, pre-order, made-to-order, wholesale)
- Features grid highlighting platform benefits
- Call-to-action buttons for shopping and seller access
- Mobile-first responsive design

✅ **Product Browsing**
- Grid layout with product cards
- Filter by product type
- Product type badges with color coding
- Product detail pages with images and descriptions
- Anonymous browsing (no login required)

✅ **Shopping & Checkout**
- Slide-over cart panel with live updates
- Quantity adjustment and item removal
- Cart total calculation
- Persistent cart (localStorage)
- Authenticated checkout (requires login)
- Order confirmation

### Seller Features (uppfirst.com Inspired)
✅ **Seller Dashboard**
- Revenue analytics dashboard (total revenue, total orders, pending orders, avg order value)
- Recent orders table with customer information
- Order status tracking with color-coded badges
- Quick navigation to Products and Create Product pages
- Protected by authentication and seller role

✅ **Product Management**
- Comprehensive product creation form
  - Product name, description, pricing
  - Product type selection (in-stock, pre-order, made-to-order, wholesale)
  - Stock quantity management (for in-stock items)
  - Image URL input
  - Category organization
- Product list view with all products
- Product type badges matching design system
- Delete products with confirmation dialog
- Real-time updates after creation/deletion

✅ **Navigation & UX**
- Seamless routing between seller pages
- Dashboard navigation buttons (Products, Create Product)
- Back buttons and cancel actions
- Success/error toast notifications
- Loading states and skeletons

✅ **Design System**
- Dark/light mode support with theme toggle
- Inter font family
- Consistent spacing and typography
- Professional color palette matching uppfirst aesthetic
- Product type color coding:
  - In-Stock: Green
  - Pre-Order: Blue
  - Made-to-Order: Purple
  - Wholesale: Orange
- Responsive design across all screen sizes

## Project Structure

```
client/src/
├── components/
│   ├── ui/                    # Shadcn UI components
│   ├── header.tsx             # Navigation with auth/cart
│   ├── theme-provider.tsx     # Dark/light mode
│   ├── theme-toggle.tsx
│   ├── product-card.tsx
│   ├── product-type-badge.tsx
│   └── cart-sheet.tsx         # Shopping cart slide-over
├── pages/
│   ├── home.tsx               # Landing page (uppfirst-inspired)
│   ├── products.tsx           # Product listing
│   ├── product-detail.tsx     # Product detail view
│   ├── checkout.tsx           # Authenticated checkout
│   ├── seller-dashboard.tsx   # Seller analytics dashboard
│   ├── seller-products.tsx    # Product management list
│   ├── create-product.tsx     # Product creation form
│   └── not-found.tsx          # 404 page
├── hooks/
│   └── useAuth.ts             # Authentication hook
├── lib/
│   ├── cart-context.tsx       # Cart state management
│   └── queryClient.ts         # TanStack Query setup
└── App.tsx                    # Main app with routing

server/
├── routes.ts                  # API endpoints with auth middleware
├── storage.ts                 # DatabaseStorage implementation
├── replitAuth.ts              # Replit Auth & OIDC setup
├── vite.ts                    # Vite server config
└── index.ts                   # Express server

shared/
└── schema.ts                  # Drizzle schemas & Zod validation
```

## Data Models

### Product
- id (UUID)
- name
- description
- price (decimal)
- image (URL)
- category
- productType (in-stock | pre-order | made-to-order | wholesale)
- stock (integer, optional)
- depositAmount (decimal, optional) - For pre-order products
- requiresDeposit (boolean, default 0) - Whether product requires deposit payment

### Order
- id (UUID)
- customerName
- customerEmail
- customerAddress
- items (JSON string of cart items)
- total (decimal)
- status (pending | processing | shipped | delivered | cancelled)
- createdAt (timestamp)

### Cart Item
- Product + quantity

## Next Steps (Backend Implementation)
1. Implement storage interface for Products, Orders, Cart
2. Create API endpoints:
   - GET /api/products - List all products
   - GET /api/products/:id - Get product by ID
   - POST /api/orders - Create new order
   - GET /api/orders - List all orders (for seller dashboard)
3. Seed initial product data
4. Test complete user flows

## Design Guidelines
- Follow design_guidelines.md for all UI implementations
- Use Inter font for all text
- Maintain consistent spacing (small: p-2/4, medium: p-6/8, large: p-12/16)
- Product type badges use specific colors:
  - In-stock: green
  - Pre-order: blue
  - Made-to-order: purple
  - Wholesale: orange
- Dark mode support throughout
- Mobile-first responsive design

## Authentication & Authorization

### User Model
**Every authenticated user is BOTH a buyer AND a seller** - no role separation! This matches the uppfirst.com model where everyone can both buy and sell products.

- **Anonymous Users**: Can browse products only
- **Authenticated Users**: Can browse, buy, sell, create products, and manage their own orders

### Navigation
- **Before Login**: Products (browse only)
- **After Login**: Products, Dashboard, My Products, Orders
- **Mobile Menu**: Burger menu (uppfirst.com style) with all authenticated navigation

### Protected API Endpoints
- `POST /api/orders` - Requires authentication (links order to user automatically)
- `GET /api/orders/my` - Requires authentication (customer's own orders)
- `GET /api/orders` - Requires authentication (all orders for dashboard)
- `POST /api/products` - Requires authentication (anyone can create)
- `PUT /api/products/:id` - Requires authentication (anyone can edit)
- `DELETE /api/products/:id` - Requires authentication (anyone can delete)
- `PATCH /api/orders/:id/status` - Requires authentication (anyone can update)

### Auth Implementation Details
- **Provider**: Replit Auth with OpenID Connect
- **Session**: PostgreSQL-backed sessions (express-session + connect-pg-simple)
- **Middleware**: `isAuthenticated` protects all authenticated routes
- **Anonymous Access**: `/api/auth/user` returns 200 with null for unauthenticated users
- **No Role Checks**: Removed all seller role validation - everyone is both buyer and seller

## Recent Changes
- **2025-10-08**: Multi-Platform Social Ads Integration (Meta, TikTok, X)
  - ✅ **Unified Social Ads Dashboard** - Single page with tabs for Meta, TikTok, and X (Twitter)
  - ✅ **Meta (Facebook/Instagram) Ads** - Popup-based OAuth flow
    - One-click "Connect with Facebook" - no page redirects
    - Auto-fetches access token and ad account ID
    - Secure server-side token storage
    - Campaign creation with objectives, budgets, targeting, and creative
    - "Promote" buttons on product pages
    - Requires META_APP_ID & META_APP_SECRET environment variables
  - ✅ **TikTok Ads Integration** - Popup-based OAuth flow
    - One-click "Connect with TikTok" - seamless authorization
    - TikTok Business API v1.3 integration
    - Auto-fetches advertiser accounts
    - Secure token and refresh token storage
    - Requires TIKTOK_APP_ID & TIKTOK_APP_SECRET environment variables
  - ✅ **X (Twitter) Ads Setup** - OAuth 1.0a placeholder
    - X Ads API uses OAuth 1.0a (different from OAuth 2.0)
    - Setup page with documentation and requirements
    - Backend structure ready for future OAuth 1.0a implementation
    - Requires manual setup with X Developer Platform
  - 🎯 **Architecture**: Separate settings tables (meta_settings, tiktok_settings, x_settings)
  - 🎯 **User Experience**: No page reloads - all OAuth in popup windows with auto-close
  - 🎯 **Database**: Secure credential storage linked to user accounts
  - 🎯 **Route Updated**: `/meta-ads-setup` → `/social-ads-setup` (unified dashboard)

- **2025-10-08**: Stripe Payment Integration & Seller-Triggered Balance Payments
  - ✅ Integrated Stripe SDK with Apple Pay, Google Pay, and credit card support
  - ✅ Added payment tracking fields to orders schema (paymentStatus, stripePaymentIntentId, stripeBalancePaymentIntentId)
  - ✅ Created `/api/create-payment-intent` endpoint for checkout payments
  - ✅ Created `/api/trigger-balance-payment/:orderId` endpoint for seller-triggered balance payments
  - ✅ Product cards and detail pages now display deposit amounts for pre-orders
  - ✅ Checkout calculates and displays deposit vs full payment
  - ⏳ **Awaiting Stripe API keys** to complete testing (VITE_STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY)
  - 🎯 Result: **Seller-triggered balance payment system** - sellers can manually trigger balance payments when products are ready to ship

- **2025-10-08**: Pre-Order Deposit Payment System
  - ✅ Added `depositAmount` and `requiresDeposit` fields to products schema
  - ✅ Updated create product page with deposit amount input for pre-orders
  - ✅ Updated edit product page with deposit fields support
  - ✅ Modified checkout flow to calculate deposit for pre-orders vs full payment for in-stock
  - ✅ Redesigned create product page with prominent 4-card product type selection at top
  - ✅ Created quick access page with shortcuts to Dashboard, Products, Orders, Create Product
  - ✅ Fixed TypeScript errors and infinite render loop in edit product page
  - 🎯 Result: Pre-order products now support deposit/balance payment system

- **2025-10-08**: Unified Buyer/Seller Experience (uppfirst.com Model)
  - ✅ **REMOVED role-based access control** - everyone is both buyer and seller
  - ✅ All authenticated users can create, edit, and delete products
  - ✅ Navigation shows Dashboard, My Products, Orders for all logged-in users
  - ✅ Updated burger menu to match uppfirst.com style
  - ✅ Simplified authentication - no need to manually set seller role
  - 🎯 Result: Login once, do everything - buy and sell seamlessly

- **2025-10-08**: Complete Product Management (uppfirst.com Inspired)
  - ✅ Built comprehensive product creation page with full form validation
  - ✅ Created seller products management page with list view
  - ✅ Added product deletion with confirmation dialogs
  - ✅ Implemented seller dashboard navigation (Products, Create Product buttons)
  - ✅ Added proper routing for all seller pages
  - ✅ Enhanced landing page to match uppfirst.com aesthetic
  - ✅ Product type badges with consistent color coding across all pages
  - ✅ Real-time UI updates after create/delete operations

- **2025-10-08**: User Authentication & Database
  - ✅ Migrated from in-memory to PostgreSQL database with Drizzle ORM
  - ✅ All products, orders, and users now persist in database
  - ✅ Automatic database seeding with 8 products on first run
  - ✅ Implemented Replit Auth with OpenID Connect
  - ✅ Orders automatically linked to authenticated users via userId
  - ✅ User profile dropdown with avatar and logout in header
  - ✅ Anonymous users can browse products, must login to checkout
  - ✅ Sessions table with proper indexing

- **2025-10-08**: Initial Platform Development
  - Created landing page with hero section (uppfirst-inspired)
  - Built product listing with filtering and type badges
  - Implemented product detail pages
  - Added shopping cart with slide-over UI
  - Created authenticated checkout flow
  - Built seller dashboard with revenue analytics
  - Integrated dark/light theme toggle
  - Added cart state management with localStorage persistence
