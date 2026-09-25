import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ['http://localhost:4000'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SPlan API')
    .setDescription(
      'REST API cho SPlan — quản lý workspace/space/item kiểu Jira',
    )
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(3000);
  console.log('🚀 SPlan Backend is running on: http://localhost:3000');
  console.log('📚 Swagger docs: http://localhost:3000/docs');
}
void bootstrap();
