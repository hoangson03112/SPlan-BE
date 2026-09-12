import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ItemService } from './item.service.js';
import { ItemController } from './item.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [ItemController],
  providers: [ItemService],
  exports: [ItemService],
})
export class ItemModule {}
