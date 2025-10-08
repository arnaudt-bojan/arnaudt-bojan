# Uppshop - E-Commerce Platform

## Overview
Uppshop is a modern e-commerce platform inspired by uppfirst.com, designed for creators and brands to sell products with flexible selling options. The platform supports multiple product types: in-stock, pre-order, made-to-order, and wholesale products.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Storage**: In-memory storage (MemStorage)
- **State Management**: TanStack Query, React Context
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

## Features Implemented

### MVP Features (Phase 1 - Frontend Complete)
✅ **Landing Page**
- Hero section with CTA buttons
- Product type showcase (in-stock, pre-order, made-to-order, wholesale)
- Features section highlighting platform benefits
- Mobile-first responsive design

✅ **Product Listing**
- Grid layout with product cards
- Filter by product type
- Product type badges with color coding
- Add to cart functionality

✅ **Product Detail Page**
- Large product image display
- Product information and pricing
- Product type badge
- Stock availability (for in-stock items)
- Add to cart button

✅ **Shopping Cart**
- Slide-over cart panel
- Quantity adjustment
- Remove items
- Cart total calculation
- Persistent cart (localStorage)

✅ **Guest Checkout**
- Customer information form
- Order summary
- Shipping address collection
- Order confirmation

✅ **Seller Dashboard**
- Revenue analytics (total revenue, total orders, pending orders, avg order value)
- Order management table
- Order status tracking with color-coded badges
- Customer information display

✅ **Design System**
- Dark/light mode support with theme toggle
- Inter font family
- Consistent spacing and typography
- Professional color palette
- Responsive navigation header

## Project Structure

```
client/src/
├── components/
│   ├── ui/              # Shadcn UI components
│   ├── header.tsx       # Main navigation header
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   ├── product-card.tsx
│   ├── product-type-badge.tsx
│   └── cart-sheet.tsx   # Shopping cart slide-over
├── pages/
│   ├── home.tsx         # Landing page
│   ├── products.tsx     # Product listing
│   ├── product-detail.tsx
│   ├── checkout.tsx     # Guest checkout
│   └── seller-dashboard.tsx
├── lib/
│   ├── cart-context.tsx # Cart state management
│   └── queryClient.ts   # TanStack Query setup
└── App.tsx

server/
├── routes.ts            # API endpoints (to be implemented)
└── storage.ts           # Storage interface (to be implemented)

shared/
└── schema.ts            # Data models and types
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

## Recent Changes
- **2025-10-08**: Completed frontend implementation with all MVP features
  - Created landing page with hero section
  - Built product listing with filtering
  - Implemented product detail pages
  - Added shopping cart with slide-over UI
  - Created guest checkout flow
  - Built seller dashboard with analytics
  - Integrated dark/light theme toggle
  - Added cart state management with localStorage persistence
