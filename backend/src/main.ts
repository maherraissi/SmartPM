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
  origin: (origin, callback) => {
   // Allow requests with no origin (mobile apps, curl, Postman)
   if (!origin) return callback(null, true);
   const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:4200',
    'http://localhost:4200',
    'http://localhost:30080',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:30080',
   ];
   // Also allow any 192.168.x.x or 10.x.x.x (minikube/docker range)
   const isLocalNetwork = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d+\.\d+(:\d+)?$/.test(origin);
   if (allowedOrigins.includes(origin) || isLocalNetwork) {
    callback(null, true);
   } else {
    callback(null, false);
   }
  },
  credentials: true,
 });

 // 3. STATIC FILES: Serve uploaded training documents & videos publicly
 app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads',
 });

 await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
