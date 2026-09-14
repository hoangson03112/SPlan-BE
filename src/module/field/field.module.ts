import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { FieldService } from './field.service.js';
import { FieldController } from './field.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [FieldController],
  providers: [FieldService],
  exports: [FieldService],
})
export class FieldModule {}
