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
- **Tailwind CSS**: Utility-first CSS framework
- **API Proxy**: Configured to proxy `/api/graphql` to NestJS backend
- **Standalone Output**: Ready for Docker deployment

## Migration Strategy

This Next.js app runs in parallel with the existing Vite frontend to allow for:

1. Gradual feature migration
2. A/B testing of new vs. old stack
3. Zero-downtime transition
4. Rollback capability

## Environment Variables

- `NEXT_PUBLIC_GRAPHQL_URL`: GraphQL endpoint (defaults to http://localhost:4000/graphql)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com)
