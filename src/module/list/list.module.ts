import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ListService } from './list.service.js';
import { ListController } from './list.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [ListController],
  providers: [ListService],
  exports: [ListService],
})
export class ListModule {}
