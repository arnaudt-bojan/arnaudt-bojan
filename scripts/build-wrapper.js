#!/usr/bin/env node
/**
 * Build wrapper script for Replit deployments
 * Includes Prisma Client generation before building
 */

import { execSync } from 'child_process';

const steps = [
  {
    name: 'Generate Prisma Client',
    command: 'npx prisma generate'
  },
  {
    name: 'Build frontend with Vite',
    command: 'npx vite build'
  },
  {
    name: 'Build backend with esbuild',
    command: 'npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:@prisma/client'
  }
];

console.log('🔨 Starting build process...\n');

for (const step of steps) {
  console.log(`📦 ${step.name}...`);
  try {
    execSync(step.command, { stdio: 'inherit' });
    console.log(`✅ ${step.name} complete\n`);
  } catch (error) {
    console.error(`❌ ${step.name} failed`);
    process.exit(1);
  }
}

console.log('✅ Build complete!');
