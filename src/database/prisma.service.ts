import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // BẮT BUỘC PHẢI CÓ CONSTRUCTOR VÀ SUPER()
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' }, // Bắt sự kiện query để log ra console
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    // Lắng nghe và format lại log query cho dễ đọc (Senior Tip)
    // Giúp em biết chính xác Prisma đang chạy câu SQL nào xuống Postgres
    this.$on('query' as never, (e: any) => {
      Logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`, 'Prisma');
    });

    await this.$connect();
    Logger.log('🟢 Database connected successfully!', 'PrismaService');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
