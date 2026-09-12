import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { StatusService } from './status.service.js';
import { StatusController } from './status.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
