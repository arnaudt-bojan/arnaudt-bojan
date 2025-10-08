# Design Guidelines for E-Commerce Platform

## Design Approach: Reference-Based (E-Commerce Leaders)

**Primary References:** Shopify, Stripe, Linear
- **Shopify:** Clean product cards, straightforward checkout flows, merchant dashboard patterns
- **Stripe:** Minimal color usage, crisp typography, data-focused layouts
- **Linear:** Modern spacing, subtle interactions, refined UI components

**Design Philosophy:** Minimalist e-commerce that prioritizes product imagery and seamless transactions. Clean, distraction-free interface that lets products shine while maintaining professional credibility for both buyers and sellers.

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Background: 0 0% 100% (pure white)
- Surface: 0 0% 98% (off-white cards)
- Primary: 0 0% 9% (near-black for CTAs, headers)
- Secondary: 0 0% 45% (medium gray for supporting text)
- Border: 0 0% 90% (subtle dividers)
- Success: 142 71% 45% (green for confirmations)
- Accent: 217 91% 60% (blue for links, badges)

**Dark Mode:**
- Background: 0 0% 7% (deep charcoal)
- Surface: 0 0% 12% (elevated cards)
- Primary: 0 0% 98% (near-white for CTAs, headers)
- Secondary: 0 0% 65% (light gray for supporting text)
- Border: 0 0% 20% (subtle dividers)
- Success: 142 71% 45% (same green)
- Accent: 217 91% 60% (same blue)

### B. Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - UI elements, body text
- Display: 'Inter' at various weights - headlines, product names

**Scale:**
- Hero/Display: text-5xl to text-6xl, font-bold (48-60px)
- Product Titles: text-2xl, font-semibold (24px)
- Section Headers: text-3xl, font-bold (30px)
- Body: text-base, font-normal (16px)
- Labels/Meta: text-sm, font-medium (14px)
- Captions: text-xs (12px)

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Micro spacing (within components): p-2, gap-2, space-y-4
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-20, py-24
- Grid gaps: gap-6, gap-8

**Container System:**
- Full-width sections: w-full with max-w-7xl mx-auto px-4
- Product grids: max-w-6xl
- Checkout/forms: max-w-2xl
- Dashboard content: max-w-7xl

### D. Component Library

**Navigation:**
- Sticky top header (h-16) with logo, search, cart icon, account
- Transparent on hero, solid white/black on scroll
- Mobile: Hamburger menu with slide-out drawer

**Product Cards:**
- Square aspect-ratio images (aspect-square)
- Overlay badges for product type (Pre-order, Made-to-Order, In-Stock)
- Product name (font-semibold), price (font-bold), quick add to cart button
- Hover: subtle scale transform (hover:scale-105 transition)

**Buttons:**
- Primary: Full black/white with rounded-lg, px-6 py-3, font-medium
- Secondary: Outline with rounded-lg, border-2
- Ghost: Transparent with hover:bg-gray-100/50
- On images: Blur background with backdrop-blur-sm bg-white/10

**Forms & Inputs:**
- Rounded-lg borders with focus:ring-2 focus:ring-offset-2
- Consistent height h-12 for inputs
- Label above input (text-sm font-medium mb-2)
- Dark mode: bg-white/5 border-white/10

**Product Grid:**
- 4 columns on desktop (grid-cols-4)
- 2 columns on tablet (md:grid-cols-2)
- 1 column on mobile (grid-cols-1)
- Gap-6 for breathing room

**Cart/Checkout:**
- Sticky sidebar on desktop showing order summary
- Mobile: Expandable bottom sheet for cart
- Line items with thumbnail, name, quantity selector
- Clear pricing breakdown (subtotal, shipping, total)

**Dashboard (Seller):**
- Sidebar navigation (hidden on mobile, toggle button)
- Table layouts for orders (striped rows, hover states)
- Status badges with color coding (pending, processing, shipped)
- Quick action buttons per row

**Badges & Labels:**
- Product type badges: px-3 py-1 rounded-full text-xs font-medium
- In-Stock: bg-green-100 text-green-800 (dark: bg-green-900/30 text-green-400)
- Pre-Order: bg-blue-100 text-blue-800
- Made-to-Order: bg-purple-100 text-purple-800
- Wholesale: bg-orange-100 text-orange-800

### E. Animations

Use sparingly:
- Page transitions: Simple fade-ins (duration-200)
- Product card hover: Subtle scale (scale-105, duration-300)
- Cart drawer: Slide from right (transition-transform)
- Button interactions: Built-in states only
- Loading states: Simple spinner or skeleton screens

---

## Images

**Hero Section:**
- Large hero image showcasing featured products or brand lifestyle shot
- Overlay with value proposition headline and CTA
- Aspect ratio: 16:9 on desktop, full viewport height on mobile
- Use gradient overlay (from-black/60 to-transparent) for text readability

**Product Images:**
- High-quality product photography on white/neutral background
- Consistent aspect ratio (square 1:1) for grid uniformity
- Multiple angles/views on product detail page (gallery carousel)
- Zoom on hover for desktop product pages

**Featured Brands:**
- Logo carousel/grid (grayscale logos on light bg, white logos on dark bg)
- Seamless infinite scroll animation for brand marquee

**Lifestyle/Context Images:**
- Use in "How It Works" section showing products in use
- Testimonial sections with customer/brand photos
- About/Story section with founder/team imagery

**Placeholder Strategy:**
- Use product category illustrations or gradient backgrounds when images unavailable
- Maintain consistent aspect ratios even with placeholders