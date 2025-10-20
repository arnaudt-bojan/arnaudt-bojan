# Dependency Audit Matrix - Monorepo Restructuring

**Date**: October 20, 2025  
**Phase**: 4.1 - Monorepo Dependency Restructuring  
**Status**: In Progress

## Executive Summary

Current root package.json has **169 total dependencies** (136 production + 33 dev) all mixed together. This audit categorizes each dependency to enable proper workspace-based monorepo structure.

---

## Dependency Categories

### Category Definitions

1. **DEV-ROOT** - Development/build tooling (stays in root)
2. **NEXTJS** - Next.js frontend app runtime dependencies
3. **NESTJS** - NestJS backend API runtime dependencies  
4. **SHARED** - Used by both apps
5. **LEGACY** - Not currently used (can be removed)

---

## Categorization Matrix

### Dev Dependencies (Root Only)

| Package | Category | Keep in Root | Notes |
|---------|----------|--------------|-------|
| `@replit/vite-plugin-cartographer` | DEV-ROOT | ✅ | Build tooling |
| `@replit/vite-plugin-dev-banner` | DEV-ROOT | ✅ | Build tooling |
| `@replit/vite-plugin-runtime-error-modal` | DEV-ROOT | ✅ | Build tooling |
| `@tailwindcss/typography` | DEV-ROOT | ✅ | Shared styling |
| `@tailwindcss/vite` | DEV-ROOT | ✅ | Build tooling |
| `@types/connect-pg-simple` | DEV-ROOT | ✅ | Type definitions |
| `@types/express` | DEV-ROOT | ✅ | Type definitions |
| `@types/express-session` | DEV-ROOT | ✅ | Type definitions |
| `@types/node` | DEV-ROOT | ✅ | Type definitions |
| `@types/passport` | DEV-ROOT | ✅ | Type definitions |
| `@types/passport-local` | DEV-ROOT | ✅ | Type definitions |
| `@types/react` | DEV-ROOT | ✅ | Type definitions |
| `@types/react-dom` | DEV-ROOT | ✅ | Type definitions |
| `@types/ws` | DEV-ROOT | ✅ | Type definitions |
| `@vitejs/plugin-react` | DEV-ROOT | ✅ | Build tooling |
| `autoprefixer` | DEV-ROOT | ✅ | PostCSS plugin |
| `esbuild` | DEV-ROOT | ✅ | Build tooling |
| `postcss` | DEV-ROOT | ✅ | Build tooling |
| `tailwindcss` | DEV-ROOT | ✅ | Shared styling |
| `tsx` | DEV-ROOT | ✅ | TS execution |
| `typescript` | DEV-ROOT | ✅ | Compiler |
| `vite` | DEV-ROOT | ✅ | Build tooling |

**Total Root Dev Deps: 22**

---

### Next.js Runtime Dependencies

| Package | Category | Move To | Notes |
|---------|----------|---------|-------|
| `next` | NEXTJS | apps/nextjs | Core framework - ALREADY THERE |
| `react` | SHARED | Both apps | ALREADY IN NEXTJS |
| `react-dom` | SHARED | Both apps | ALREADY IN NEXTJS |
| `@apollo/client` | NEXTJS | apps/nextjs | GraphQL client |
| `@emotion/react` | NEXTJS | apps/nextjs | Material-UI peer dep |
| `@emotion/styled` | NEXTJS | apps/nextjs | Material-UI peer dep |
| `@mui/icons-material` | NEXTJS | apps/nextjs | Icons |
| `@mui/material` | NEXTJS | apps/nextjs | UI framework |
| `@mui/material-nextjs` | NEXTJS | apps/nextjs | Next.js integration |
| `@mui/x-data-grid` | NEXTJS | apps/nextjs | Data grid |
| `@mui/x-date-pickers` | NEXTJS | apps/nextjs | Date pickers |
| `@hookform/resolvers` | NEXTJS | apps/nextjs | Form validation |
| `@tanstack/react-query` | NEXTJS | apps/nextjs | Data fetching |
| `@tinymce/tinymce-react` | NEXTJS | apps/nextjs | Rich text editor |
| `@radix-ui/*` (25 packages) | NEXTJS | apps/nextjs | UI primitives |
| `@stripe/connect-js` | NEXTJS | apps/nextjs | Payments |
| `@stripe/react-connect-js` | NEXTJS | apps/nextjs | Payments |
| `@stripe/react-stripe-js` | NEXTJS | apps/nextjs | Payments |
| `@stripe/stripe-js` | NEXTJS | apps/nextjs | Payments |
| `@uppy/aws-s3` | NEXTJS | apps/nextjs | File uploads |
| `@uppy/core` | NEXTJS | apps/nextjs | File uploads |
| `@uppy/dashboard` | NEXTJS | apps/nextjs | File uploads |
| `@uppy/react` | NEXTJS | apps/nextjs | File uploads |
| `axios` | SHARED | Both apps | HTTP client |
| `clsx` | NEXTJS | apps/nextjs | Classname utility |
| `cmdk` | NEXTJS | apps/nextjs | Command menu |
| `date-fns` | SHARED | Both apps | Date utilities |
| `embla-carousel-react` | NEXTJS | apps/nextjs | Carousel |
| `framer-motion` | NEXTJS | apps/nextjs | Animations |
| `input-otp` | NEXTJS | apps/nextjs | OTP input |
| `lucide-react` | NEXTJS | apps/nextjs | Icons |
| `next-themes` | NEXTJS | apps/nextjs | Theme switching |
| `papaparse` | NEXTJS | apps/nextjs | CSV parsing |
| `react-day-picker` | NEXTJS | apps/nextjs | Date picker |
| `react-dropzone` | NEXTJS | apps/nextjs | File uploads |
| `react-easy-crop` | NEXTJS | apps/nextjs | Image cropping |
| `react-hook-form` | NEXTJS | apps/nextjs | Forms |
| `react-icons` | NEXTJS | apps/nextjs | Icons |
| `react-quill` | NEXTJS | apps/nextjs | Rich text |
| `react-resizable-panels` | NEXTJS | apps/nextjs | Resizable panels |
| `recharts` | NEXTJS | apps/nextjs | Charts |
| `tailwind-merge` | NEXTJS | apps/nextjs | Tailwind utility |
| `tailwindcss-animate` | NEXTJS | apps/nextjs | Animations |
| `tinymce` | NEXTJS | apps/nextjs | Rich text editor |
| `vaul` | NEXTJS | apps/nextjs | Drawer component |
| `wouter` | LEGACY | Remove | Not used in Next.js app |
| `class-variance-authority` | NEXTJS | apps/nextjs | Variant utility |
| `socket.io-client` | NEXTJS | apps/nextjs | WebSocket client |
| `zod` | SHARED | Both apps | Validation |
| `zod-validation-error` | SHARED | Both apps | Validation errors |

**Total Next.js Specific Deps: ~65**  
**Shared Deps: ~5**

---

### NestJS Runtime Dependencies

| Package | Category | Move To | Notes |
|---------|----------|---------|-------|
| `@nestjs/cli` | NESTJS | apps/nest-api | CLI tools |
| `@nestjs/common` | NESTJS | apps/nest-api | Core framework |
| `@nestjs/core` | NESTJS | apps/nest-api | Core framework |
| `@nestjs/apollo` | NESTJS | apps/nest-api | GraphQL integration |
| `@nestjs/graphql` | NESTJS | apps/nest-api | GraphQL module |
| `@nestjs/platform-express` | NESTJS | apps/nest-api | Express adapter |
| `@nestjs/platform-socket.io` | NESTJS | apps/nest-api | WebSocket adapter |
| `@nestjs/schematics` | NESTJS | apps/nest-api | Code generation |
| `@nestjs/testing` | NESTJS | apps/nest-api | Testing utilities |
| `@nestjs/websockets` | NESTJS | apps/nest-api | WebSocket support |
| `@apollo/server` | NESTJS | apps/nest-api | GraphQL server |
| `@as-integrations/express4` | NESTJS | apps/nest-api | Apollo Express |
| `@prisma/client` | NESTJS | apps/nest-api | Database ORM |
| `prisma` | NESTJS | apps/nest-api | Database toolkit |
| `@graphql-codegen/cli` | NESTJS | apps/nest-api | Code generation |
| `@graphql-codegen/typescript` | NESTJS | apps/nest-api | Code generation |
| `@graphql-codegen/typescript-operations` | NESTJS | apps/nest-api | Code generation |
| `@graphql-codegen/typescript-resolvers` | NESTJS | apps/nest-api | Code generation |
| `graphql` | SHARED | Both apps | GraphQL core |
| `@types/express-fileupload` | NESTJS | apps/nest-api | Type definitions |
| `@types/jest` | NESTJS | apps/nest-api | Type definitions |
| `@types/memoizee` | NESTJS | apps/nest-api | Type definitions |
| `@types/papaparse` | NESTJS | apps/nest-api | Type definitions |
| `@types/pdfkit` | NESTJS | apps/nest-api | Type definitions |
| `class-transformer` | NESTJS | apps/nest-api | DTO transformation |
| `class-validator` | NESTJS | apps/nest-api | DTO validation |
| `dataloader` | NESTJS | apps/nest-api | GraphQL N+1 solution |
| `express` | NESTJS | apps/nest-api | HTTP server |
| `express-fileupload` | NESTJS | apps/nest-api | File uploads |
| `express-session` | NESTJS | apps/nest-api | Sessions |
| `connect-pg-simple` | NESTJS | apps/nest-api | Session store |
| `memorystore` | NESTJS | apps/nest-api | Session store |
| `passport` | NESTJS | apps/nest-api | Authentication |
| `passport-local` | NESTJS | apps/nest-api | Auth strategy |
| `openid-client` | NESTJS | apps/nest-api | OAuth/OIDC |
| `socket.io` | NESTJS | apps/nest-api | WebSocket server |
| `ws` | NESTJS | apps/nest-api | WebSocket |
| `memoizee` | NESTJS | apps/nest-api | Caching |
| `reflect-metadata` | NESTJS | apps/nest-api | Decorators |
| `winston` | NESTJS | apps/nest-api | Logging |
| `jest` | NESTJS | apps/nest-api | Testing framework |
| `ts-jest` | NESTJS | apps/nest-api | Jest TS support |
| `@playwright/test` | LEGACY | Remove | E2E testing (not API) |
| `concurrently` | LEGACY | Remove | Script runner (not needed) |

**Total NestJS Specific Deps: ~45**

---

### Integration/Service Dependencies

| Package | Category | Move To | Notes |
|---------|----------|---------|-------|
| `@google-cloud/storage` | NESTJS | apps/nest-api | Object storage |
| `@google/genai` | NESTJS | apps/nest-api | AI integration |
| `@metaplex-foundation/js` | NEXTJS | apps/nextjs | Solana/crypto |
| `@solana/spl-token` | NEXTJS | apps/nextjs | Solana |
| `@solana/web3.js` | NEXTJS | apps/nextjs | Solana |
| `stripe` | NESTJS | apps/nest-api | Payment backend |
| `resend` | NESTJS | apps/nest-api | Email service |
| `shippo` | NESTJS | apps/nest-api | Shipping service |
| `pdfkit` | NESTJS | apps/nest-api | PDF generation |
| `xlsx` | SHARED | Both apps | Excel processing |

---

### Shared Dependencies (Both Apps)

| Package | Move To | Notes |
|---------|---------|-------|
| `react` | Both | UI framework |
| `react-dom` | Both | UI framework |
| `axios` | Both | HTTP client |
| `date-fns` | Both | Date utilities |
| `graphql` | Both | GraphQL core |
| `zod` | Both | Validation |
| `zod-validation-error` | Both | Validation errors |
| `xlsx` | Both | Excel processing |

**Total Shared: 8**

---

## Migration Plan Summary

### Root package.json (Dev Only)
- **22 dev dependencies** - Build tools, type definitions, linters
- **0 production dependencies**

### apps/nextjs/package.json
- **~65 Next.js-specific** dependencies
- **~8 shared** dependencies  
- **Total: ~73 dependencies**

### apps/nest-api/package.json
- **~45 NestJS-specific** dependencies
- **~8 shared** dependencies
- **Total: ~53 dependencies**

### packages/shared/package.json
- **Dependencies**: zod, date-fns (utilities used by shared code)
- **PeerDependencies**: @prisma/client (types only)

---

## Dependencies to Remove

| Package | Reason |
|---------|--------|
| `wouter` | Not used in Next.js app (uses Next.js router) |
| `@playwright/test` | E2E testing - should be in root dev deps if needed |
| `concurrently` | Not needed with proper npm workspaces |
| `@jridgewell/trace-mapping` | Unused |
| `tw-animate-css` | Redundant with tailwindcss-animate |

**Total to Remove: 5**

---

## Validation Checklist

- [ ] All Next.js runtime deps moved to apps/nextjs/package.json
- [ ] All NestJS runtime deps moved to apps/nest-api/package.json
- [ ] Shared deps duplicated in both apps
- [ ] Dev deps remain only in root
- [ ] Workspace config added to root package.json
- [ ] npm install --workspaces succeeds
- [ ] Both apps build independently
- [ ] No missing dependency errors

---

## Next Steps

1. ✅ **Complete** - Dependency Audit Matrix (this document)
2. ⏳ **Next** - Workspace Bootstrap (modify root package.json)
3. ⏳ **Pending** - Next.js App Manifest
4. ⏳ **Pending** - NestJS API Manifest
5. ⏳ **Pending** - Shared Package Extraction
6. ⏳ **Pending** - Infrastructure Updates (Dockerfiles)
