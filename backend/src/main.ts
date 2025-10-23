import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    // Production domains
    process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
    process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : null,
    process.env.FRONTEND_URL, // Custom frontend URL
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        Logger.warn(`CORS: Blocked origin ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Add root "/" endpoint for Replit health probe
  const adapter = app.getHttpAdapter();
  adapter.get('/', (_req: any, res: any) => {
    res.status(200).json({ 
      status: 'ok', 
      service: 'Upfirst API',
      timestamp: new Date().toISOString()
    });
  });

  // Replit sets PORT env var - use it for deployment
  const port = Number(process.env.PORT) || Number(process.env.NESTJS_PORT) || 4000;
  
  await app.listen(port, '0.0.0.0');
  
  Logger.log(`🚀 NestJS GraphQL API running on http://localhost:${port}/graphql`, 'Bootstrap');
  Logger.log(`🏥 Health check available at http://localhost:${port}/health`, 'Bootstrap');
  Logger.log(`🏥 Root health endpoint at http://localhost:${port}/`, 'Bootstrap');
}

bootstrap();
