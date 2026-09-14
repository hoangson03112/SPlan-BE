import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validate } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './module/auth/auth.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { WorkspaceModule } from './module/workspace/workspace.module.js';
import { SpaceModule } from './module/space/space.module.js';
import { ItemModule } from './module/item/item.module.js';
import { StatusModule } from './module/status/status.module.js';
import { FieldModule } from './module/field/field.module.js';
import { ListModule } from './module/list/list.module.js';
import { ViewModule } from './module/view/view.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    WorkspaceModule,
    SpaceModule,
    ItemModule,
    StatusModule,
    FieldModule,
    ListModule,
    ViewModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
