import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // Bật ValidationPipe toàn cục để tự động validate DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field không có trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu FE gửi thừa field
      transform: true, // Tự động cast type (VD: string "1" -> number 1)
    }),
  );

  // Bật CORS cho Frontend gọi
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Port của React/Vite
    credentials: true,
  });

  await app.listen(3000);
  console.log('🚀 SPlan Backend is running on: http://localhost:3000');
}
bootstrap();
