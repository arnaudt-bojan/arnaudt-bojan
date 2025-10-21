#!/usr/bin/env node
import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('🔨 Building backend for production...');

try {
  await build({
    entryPoints: [resolve(rootDir, 'server/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: resolve(rootDir, 'dist/index.js'),
    external: [
      // External packages that should not be bundled
      '@prisma/client',
      'prisma',
      '@nestjs/*',
      'express',
      'socket.io',
      'pg',
      'pg-native',
      'better-sqlite3',
      'sqlite3',
      'mysql2',
      'oracledb',
      'tedious',
      '@google-cloud/storage',
      '@solana/web3.js',
      'stripe',
      'resend',
      'shippo',
      'openid-client',
      'passport',
      'passport-local',
      'express-session',
      'connect-pg-simple',
      'prom-client',
      'winston',
      'bufferutil',
      'utf-8-validate',
    ],
    loader: {
      '.node': 'copy',
    },
    banner: {
      js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`,
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
    logLevel: 'info',
  });

  console.log('✅ Backend build complete: dist/index.js');
} catch (error) {
  console.error('❌ Backend build failed:', error);
  process.exit(1);
}
