import { DatabaseModule } from '@infra/database/database.module';
import { HealthModule } from '@modules/health/health.module';
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { LoggerModule } from '@infra/logger/logger.module';
import { envSchema } from './config/env.validation';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '@common/filters/http-exception.filter';
import { MailModule } from '@infra/mail/mail.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { QueueModule } from '@infra/queue/queue.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@infra/cache/cache.module';
import { TenantsModule } from '@modules/tenants/tenants.module';

@Global()
@Module({
  imports: [
    CacheModule,
    EventEmitterModule.forRoot(),
    QueueModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/test',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: (config) => envSchema.parse(config),
    }),
    HealthModule,
    DatabaseModule,
    LoggerModule,
    MailModule,
    TenantsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
