import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.NESTJS_PORT || 4000;
  
  await app.listen(port, '0.0.0.0');
  
  Logger.log(`🚀 NestJS GraphQL API running on http://localhost:${port}/graphql`, 'Bootstrap');
  Logger.log(`🏥 Health check available at http://localhost:${port}/health`, 'Bootstrap');
}

bootstrap();
