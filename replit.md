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

### User Roles
- **Customer**: Default role for all new users. Can browse products, place orders, view order history
- **Seller**: Elevated role with access to seller dashboard, product management, and order fulfillment

### How to Make a User a Seller
1. Log in to Replit
2. Open the Database pane
3. Run this SQL query (replace with actual email):
   ```sql
   UPDATE users SET role='seller' WHERE email='user@example.com';
   ```
4. The user will gain seller access on their next login or page refresh

### Protected API Endpoints
- `POST /api/orders` - Requires authentication (links order to user automatically)
- `GET /api/orders/my` - Requires authentication (customer's own orders)
- `GET /api/orders` - Requires seller role (all orders for dashboard)
- `POST /api/products` - Requires seller role
- `PUT /api/products/:id` - Requires seller role
- `DELETE /api/products/:id` - Requires seller role
- `PATCH /api/orders/:id/status` - Requires seller role

### Auth Implementation Details
- **Provider**: Replit Auth with OpenID Connect
- **Session**: PostgreSQL-backed sessions (express-session + connect-pg-simple)
- **Middleware**: `isAuthenticated` and `isSeller` protect routes
- **Anonymous Access**: `/api/auth/user` returns 200 with null for unauthenticated users
- **Role Preservation**: Existing user roles are preserved on re-login

## Recent Changes
- **2025-10-08**: Complete Seller Product Management (uppfirst.com Inspired)
  - ✅ Built comprehensive product creation page with full form validation
  - ✅ Created seller products management page with list view
  - ✅ Added product deletion with confirmation dialogs
  - ✅ Implemented seller dashboard navigation (Products, Create Product buttons)
  - ✅ Protected all product management endpoints (POST/PUT/DELETE require seller role)
  - ✅ Added proper routing for all seller pages
  - ✅ Enhanced landing page to match uppfirst.com aesthetic
  - ✅ Product type badges with consistent color coding across all pages
  - ✅ Real-time UI updates after create/delete operations
  - ✅ Comprehensive end-to-end testing of seller workflow
  - 🎯 Result: Sellers can now fully manage their product catalog

- **2025-10-08**: User Authentication & Authorization
  - ✅ Migrated from in-memory to PostgreSQL database with Drizzle ORM
  - ✅ All products, orders, and users now persist in database
  - ✅ Automatic database seeding with 8 products on first run
  - ✅ Implemented Replit Auth with OpenID Connect
  - ✅ Added role-based access control (customer/seller roles)
  - ✅ Protected all seller endpoints with authentication middleware
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
