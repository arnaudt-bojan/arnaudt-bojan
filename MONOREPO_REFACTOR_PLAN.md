# Upfirst Monorepo Refactoring - Complete Migration Plan

**Date**: October 21, 2025  
**Status**: Planning Phase  
**Estimated Time**: 4-6 hours total

---

## Current State Analysis

### ✅ Already Complete (85%)
- **apps/nextjs/** - Next.js 14 app with Material UI v7, app-level package.json (73 deps)
- **apps/nest-api/** - NestJS GraphQL API with app-level package.json (53 deps)
- **packages/shared/** - Shared utilities workspace package
- **Dependency audit** - Complete categorization in DEPENDENCY_AUDIT_MATRIX.md

### ❌ Remaining Issues
- **Root package.json** - Still flat, no workspaces config, all 169 deps mixed
- **Legacy client/** - Old React app overlaps with apps/nextjs/
- **Legacy server/** - Express REST API needs migration to apps/nest-api/
- **Tailwind CSS** - Needs migration to styled-components
- **CSS files** - Need migration to SCSS
- **Import paths** - Still using relative imports instead of @upfirst/shared
- **Dockerfiles** - Still monolithic, need per-app containers
- **Replit config** - Not workspace-aware

---

## Target Architecture

```
upfirst-monorepo/
├── apps/
│   ├── frontend/          # Next.js 14 + styled-components + SCSS
│   │   ├── app/           # Next.js app directory
│   │   ├── components/    # React components with styled-components
│   │   ├── styles/        # SCSS stylesheets
│   │   ├── lib/           # Frontend utilities
│   │   ├── Dockerfile     # Frontend container
│   │   └── package.json   # Frontend dependencies only
│   │
│   └── backend/           # NestJS + Prisma + PostgreSQL
│       ├── src/           # NestJS modules
│       ├── prisma/        # Database schema
│       ├── Dockerfile     # Backend container
│       └── package.json   # Backend dependencies only
│
├── packages/
│   └── shared/            # Shared types, utilities, schemas
│       ├── schema.ts      # Database schemas
│       ├── types.ts       # Shared TypeScript types
│       └── package.json   # Shared dependencies
│
├── docker-compose.yml     # Multi-service orchestration
├── package.json           # Workspace config, dev dependencies only
├── .replit                # Workspace-aware dev environment
└── start.sh               # Workspace-aware startup script
```

---

## Migration Strategy

### Phase 1: Complete Monorepo Structure (2 hours)

**1.1 Enable Workspaces**
- Edit root package.json to add workspaces configuration
- Move production dependencies to app-level manifests
- Keep only dev dependencies in root
- Run `npm install` to create workspace structure

**1.2 Consolidate Frontend**
- Rename apps/nextjs → apps/frontend
- Merge client/src components into apps/frontend/app
- Delete legacy client/ directory
- Update all import paths

**1.3 Consolidate Backend**
- Rename apps/nest-api → apps/backend
- Migrate server/ Express routes to NestJS modules
- Move Prisma schema to apps/backend/prisma
- Delete legacy server/ directory (keep shared utilities)
- Update all import paths to @upfirst/shared

**1.4 Update Import Paths**
- Replace `shared/` → `@upfirst/shared/` in all files
- Update tsconfig.json path mappings
- Verify no circular dependencies

---

### Phase 2: Styling Migration (1.5 hours)

**2.1 Set Up styled-components**
- Install styled-components + @types/styled-components
- Create theme system compatible with Material UI v7
- Set up global styles using styled-components
- Configure Next.js for styled-components SSR

**2.2 Set Up SCSS**
- Install sass + scss-loader
- Convert globals.css → globals.scss
- Set up SCSS variables, mixins, functions
- Configure Next.js to process SCSS

**2.3 Migrate Components**
- Create migration utility to convert Tailwind → styled-components
- Migrate components module-by-module:
  - Start with atomic components (Button, Input, etc.)
  - Then composite components (ProductCard, OrderRow, etc.)
  - Finally page-level components
- Replace Tailwind utility classes with styled-components theme
- Maintain Material UI components as-is (they already use Emotion)

**2.4 Remove Tailwind**
- Remove tailwindcss from dependencies
- Delete tailwind.config.ts
- Remove Tailwind imports from all files
- Verify no Tailwind classes remain

---

### Phase 3: DevOps Updates (1 hour)

**3.1 Update Replit Configuration**
- Create workspace-aware .replit file
- Update start.sh to run both frontend and backend
- Configure environment variables per service
- Test development workflow in Replit

**3.2 Create Per-App Dockerfiles**
- apps/frontend/Dockerfile (Next.js production build)
- apps/backend/Dockerfile (NestJS production build)
- Use multi-stage builds for optimization
- Test Docker builds locally

**3.3 Update docker-compose.yml**
- Configure frontend service (port 3000)
- Configure backend service (port 4000)
- Configure PostgreSQL service
- Set up service networking
- Add volume mounts for development

**3.4 Update AWS Deployment**
- Update AWS-DEPLOYMENT.md for monorepo structure
- Create ECS task definitions per service
- Update CI/CD pipeline for workspace builds
- Document deployment procedure

---

### Phase 4: Testing & Verification (30 mins)

**4.1 Build Verification**
- Test `npm run build` in apps/frontend
- Test `npm run build` in apps/backend
- Test `npm run build` in packages/shared
- Verify no missing dependencies

**4.2 Functionality Testing**
- Test B2C retail flows (browse, cart, checkout)
- Test B2B wholesale flows (invitations, MOQ, deposit)
- Test trade quotations (create, edit, buyer access)
- Test real-time Socket.IO events

**4.3 Environment Testing**
- Test development in Replit
- Test local Docker with docker-compose up
- Test production build process
- Verify AWS deployment readiness

---

## Dependency Migration Details

### Frontend (apps/frontend/package.json)
```json
{
  "dependencies": {
    "next": "14.2.33",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "styled-components": "^6.1.13",
    "sass": "^1.77.0",
    "@mui/material": "^7.3.4",
    "@mui/icons-material": "^7.3.4",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    // ... other frontend deps
  }
}
```

### Backend (apps/backend/package.json)
```json
{
  "dependencies": {
    "@nestjs/common": "^11.1.6",
    "@nestjs/core": "^11.1.6",
    "@nestjs/graphql": "^13.2.0",
    "@prisma/client": "^6.17.1",
    "prisma": "^6.17.1",
    "express": "^4.21.2",
    "socket.io": "^4.8.1",
    // ... other backend deps
  }
}
```

### Root (package.json)
```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "typescript": "5.6.3",
    "tsx": "^4.20.5",
    // ... only dev/build tools
  }
}
```

---

## Styling Migration Examples

### Before (Tailwind)
```tsx
<div className="flex items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
  <Button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700">
    Submit
  </Button>
</div>
```

### After (styled-components)
```tsx
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(6)};
  background: ${({ theme }) => theme.palette.background.paper};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  box-shadow: ${({ theme }) => theme.shadows[2]};
`;

const StyledButton = styled(Button)`
  padding: ${({ theme }) => `${theme.spacing(2)} ${theme.spacing(4)}`};
  background: ${({ theme }) => theme.palette.primary.main};
  color: ${({ theme }) => theme.palette.primary.contrastText};
  
  &:hover {
    background: ${({ theme}) => theme.palette.primary.dark};
  }
`;

<Container>
  <StyledButton>Submit</StyledButton>
</Container>
```

---

## Risk Mitigation

### High-Risk Areas
1. **Breaking changes in imports** - Mitigate with comprehensive find/replace
2. **Socket.IO event handlers** - Verify all events still work
3. **Prisma schema location** - Update all Prisma client imports
4. **Environment variables** - Ensure proper propagation to services

### Rollback Strategy
- Git commit after each phase completion
- Keep legacy client/ and server/ directories until final verification
- Test thoroughly before deletion
- Document rollback steps in each phase

---

## Success Criteria

### Functional Requirements
- ✅ All B2C retail features work (products, cart, checkout, orders)
- ✅ All B2B wholesale features work (invitations, MOQ, deposits, credit)
- ✅ All trade quotation features work (create, edit, buyer access, payments)
- ✅ Real-time Socket.IO events work (cart, orders, products, analytics)
- ✅ Authentication and authorization work correctly
- ✅ Payment processing (Stripe Connect) works
- ✅ Email notifications (Resend) work
- ✅ File uploads (Object Storage) work

### Technical Requirements
- ✅ Frontend builds successfully with styled-components
- ✅ Backend builds successfully with NestJS
- ✅ No Tailwind classes remain in codebase
- ✅ All CSS converted to SCSS
- ✅ Workspace structure functions correctly
- ✅ Docker containers build and run
- ✅ Replit development environment works
- ✅ AWS deployment process documented

### Performance Requirements
- ✅ Docker image sizes reduced by >40%
- ✅ Build times reduced by >30%
- ✅ No performance degradation in app
- ✅ Bundle sizes comparable or smaller

---

## Next Steps

1. **Get User Approval** - Confirm migration plan and timeline
2. **Create Backup** - Git commit current state
3. **Execute Phase 1** - Complete monorepo structure
4. **Execute Phase 2** - Migrate styling to styled-components + SCSS
5. **Execute Phase 3** - Update DevOps configurations
6. **Execute Phase 4** - Comprehensive testing
7. **Documentation** - Update all docs for new structure
8. **Deployment** - Deploy to production

---

**Estimated Total Time**: 4-6 hours  
**Risk Level**: Medium (significant changes, but reversible)  
**Prerequisites**: User approval, full backup, testing environment ready
