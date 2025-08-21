import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend requests
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://app.shapeshift.com', 'https://develop.shapeshift.com', 'https://neo.shapeshift.com', 'https://gome.shapeshift.com', 'https://release.shapeshift.com', 'https://jib.shapeshift.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
