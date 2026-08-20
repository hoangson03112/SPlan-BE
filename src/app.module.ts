import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate, // Bắt buộc validate env trước khi chạy
    }),
    DatabaseModule,
    // Sau này sẽ import AuthModule, IssueModule vào đây
  ],
})
export class AppModule {}
