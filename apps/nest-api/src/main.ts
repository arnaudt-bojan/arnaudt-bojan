import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.enableCors({
    origin: ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  const port = process.env.NESTJS_PORT || 4000;
  
  await app.listen(port, '0.0.0.0');
  
  Logger.log(`🚀 NestJS GraphQL API running on http://localhost:${port}/graphql`, 'Bootstrap');
  Logger.log(`🏥 Health check available at http://localhost:${port}/health`, 'Bootstrap');
}

bootstrap();
