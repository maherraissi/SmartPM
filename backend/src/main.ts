import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';

async function bootstrap() {
 const app = await NestFactory.create<NestExpressApplication>(AppModule);

 // =========================================================================
 // ENTERPRISE SECURITY: Network & Middleware Level
 // =========================================================================

 // 1. HELMET: Sets robust HTTP headers to prevent XSS, Clickjacking, MIME-sniffing
 //    contentSecurityPolicy disabled so that uploaded PDFs/videos can be served
 app.use(helmet({ contentSecurityPolicy: false }));

 // 2. CORS: Restrict API access exclusively to our Frontend
 app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
 });

 // 3. STATIC FILES: Serve uploaded training documents & videos publicly
 app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads',
 });

 await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
