import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SpaceService } from './space.service.js';
import { SpaceController } from './space.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [SpaceController],
  providers: [SpaceService],
  exports: [SpaceService],
})
export class SpaceModule {}
