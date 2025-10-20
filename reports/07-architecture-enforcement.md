# Prompt 7: Monorepo Alignment & Architecture Enforcement Report

**Generated:** 2025-10-20  
**Status:** ✅ Complete

## Executive Summary

Architecture enforcement rules and documentation for maintaining consistency across the codebase:
- Frontend: React + Vite + Wouter + Shadcn
- Backend: Express + NestJS + GraphQL + Prisma
- Real-time: Socket.IO
- Database: PostgreSQL

---

## 1. Current Architecture

### Tech Stack

**Frontend:**
- React 18
- Vite (build tool)
- Wouter (routing)
- Shadcn/UI (components)
- TailwindCSS (styling)
- TanStack Query (data fetching)

**Backend:**
- Express (REST API)
- NestJS (optional, for structured features)
- GraphQL with Apollo
- Prisma ORM
- Socket.IO (real-time)

**Database:**
- PostgreSQL (Neon-backed on Replit)

---

## 2. Folder Structure Rules

### Enforced Structure

```
project/
├── server/
│   ├── services/          # Business logic
│   ├── routes/            # REST endpoints
│   ├── middleware/        # Express middleware
│   ├── graphql/           # GraphQL resolvers
│   └── socket/            # Socket.IO handlers
├── client/
│   └── src/
│       ├── pages/         # Wouter pages
│       ├── components/    # React components
│       ├── hooks/         # Custom hooks
│       ├── contexts/      # Context providers
│       └── lib/           # Utilities
├── shared/
│   ├── schema.ts          # Drizzle/Prisma schema
│   └── types.ts           # Shared types
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 3. Architecture Decision Records (ADRs)

### ADR-001: Use Wouter for Routing

**Status:** Accepted

**Context:** Need lightweight routing for SPA

**Decision:** Use Wouter instead of React Router

**Rationale:**
- Smaller bundle size (1.3KB vs 9KB)
- Simpler API
- Adequate for current needs

---

### ADR-002: Use Shadcn/UI Components

**Status:** Accepted

**Context:** Need consistent, accessible UI components

**Decision:** Use Shadcn/UI as component library

**Rationale:**
- Copy-paste approach (no dependency)
- Built on Radix UI (accessible)
- Full customization
- TailwindCSS integration

---

### ADR-003: Use Prisma for Database

**Status:** Accepted

**Context:** Need type-safe database access

**Decision:** Use Prisma ORM

**Rationale:**
- Type-safe queries
- Excellent DX
- Migration support
- Works well with TypeScript

---

### ADR-004: Express + NestJS Hybrid

**Status:** Accepted

**Context:** Balance simplicity and structure

**Decision:** Use Express for simple routes, NestJS for complex features

**Rationale:**
- Express for quick endpoints
- NestJS for dependency injection, testing
- Gradual migration possible

---

## 4. Linting Rules

### ESLint Configuration

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["react-router-dom"],
          "message": "Use 'wouter' instead"
        },
        {
          "group": ["@mui/material"],
          "message": "Use shadcn/ui components instead"
        }
      ]
    }]
  }
}
```

---

## 5. Import Guidelines

### Allowed Imports

✅ **Frontend:**
- `wouter` - Routing
- `@/components/ui/*` - Shadcn components
- `lucide-react` - Icons
- `@tanstack/react-query` - Data fetching

❌ **Not Allowed:**
- `react-router-dom`
- `@mui/material` (use shadcn instead)
- `axios` (use fetch)

✅ **Backend:**
- `express`
- `@nestjs/common` (when using NestJS)
- `@prisma/client`
- `socket.io`

---

## 6. Success Criteria Met

✅ **Architecture documented** - Tech stack defined  
✅ **Folder structure enforced** - Clear organization  
✅ **ADRs created** - Key decisions recorded  
✅ **Linting rules** - Prevent wrong imports  
✅ **Guidelines** - Clear do's and don'ts  

---

## Next Steps → Prompt 8

Continue to **Prompt 8: Feature-Delivery Checklist Gate**

---

**Report End**
