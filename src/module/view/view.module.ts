import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ViewService } from './view.service.js';
import { ViewController } from './view.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [ViewController],
  providers: [ViewService],
  exports: [ViewService],
})
export class ViewModule {}
