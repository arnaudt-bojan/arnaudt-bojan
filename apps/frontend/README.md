# Upfirst Next.js 14 App

This is a Next.js 14 application running alongside the existing Vite/React frontend for gradual migration.

## Architecture

- **Next.js Frontend**: Port 3000 (this app)
- **Vite Frontend**: Port 5000 (existing)
- **NestJS GraphQL API**: Port 4000

## Getting Started

### Install dependencies:

```bash
cd apps/nextjs
npm install
```

### Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **App Router**: Using Next.js 14 App Router for modern routing
- **TypeScript**: Full TypeScript support
- **Material-UI**: MUI components with SSR support via AppRouterCacheProvider
- **Apollo Client**: GraphQL client with configurable endpoint
- **Tailwind CSS**: Utility-first CSS framework (alongside MUI)
- **API Proxy**: Configured to proxy `/api/graphql` to NestJS backend
- **Environment Variables**: Configurable API endpoints for different environments
- **Standalone Output**: Ready for Docker deployment

## Migration Strategy

This Next.js app runs in parallel with the existing Vite frontend to allow for:

1. Gradual feature migration
2. A/B testing of new vs. old stack
3. Zero-downtime transition
4. Rollback capability

## Environment Variables

This app uses environment variables to configure API endpoints for different environments (development, staging, production).

### Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Configure the variables in `.env.local` for your environment:

### Available Variables

- **`NEXT_PUBLIC_GRAPHQL_URL`** (required)
  - GraphQL API endpoint
  - **Development**: `http://localhost:4000/graphql`
  - **Production**: `https://your-api-domain.com/graphql`
  - **Default**: `http://localhost:4000/graphql`

- **`NEXT_PUBLIC_API_BASE_URL`** (optional)
  - Base URL for REST API endpoints
  - Leave empty to use relative paths (recommended for same-domain deployments)
  - Only set this if your Next.js app and API are on different domains
  - **Default**: empty (uses relative paths)

### Notes

- All environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Changes to `.env.local` require restarting the dev server
- Never commit `.env.local` to version control (it's in .gitignore)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com)
