// src/main.ts
import 'reflect-metadata'; // <--- BẮT BUỘC PHẢI CÓ DÒNG NÀY Ở TRÊN CÙNG
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.enableCors();
  await app.listen(3000);
  console.log('🚀 Server chạy rồi nhé!');
}
bootstrap();
