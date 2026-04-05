import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // =========================================================================
  // ENTERPRISE SECURITY: Network & Middleware Level
  // =========================================================================
  
  // 1. HELMET: Sets robust HTTP headers to prevent XSS, Clickjacking, MIME-sniffing
  app.use(helmet());

  // 2. CORS: Restrict API access exclusively to our Frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
