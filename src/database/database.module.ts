// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Đánh dấu là Global để Module nào cũng dùng được PrismaService
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Phải export thì nơi khác mới dùng được
})
export class DatabaseModule {}
