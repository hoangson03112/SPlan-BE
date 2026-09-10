import { Module } from '@nestjs/common';
import { SpaceService } from './space.service.js';
import { SpaceController } from './space.controller.js';

@Module({
  controllers: [SpaceController],
  providers: [SpaceService],
  exports: [SpaceService],
})
export class SpaceModule {}
