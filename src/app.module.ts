import { DatabaseModule } from '@infra/database/database.module';

import { HealthModule } from '@modules/health/health.module';

import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { appConfig } from './config/app.config';

import { LoggerModule } from '@infra/logger/logger.module';

import { envSchema } from './config/env.validation';

import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';

import { TransformInterceptor } from '@common/interceptors/transform.interceptor';

import { PerformanceInterceptor } from '@common/interceptors/performance.interceptor';

import { AllExceptionsFilter } from '@common/filters/http-exception.filter';

import { MailModule } from '@infra/mail/mail.module';

import { ServeStaticModule } from '@nestjs/serve-static';

import { join } from 'path';

import { QueueModule } from '@infra/queue/queue.module';

import { EventEmitterModule } from '@nestjs/event-emitter';

import { CacheModule } from '@infra/cache/cache.module';

import { TenantsModule } from '@modules/tenants/tenants.module';

import { UsersModule } from '@modules/users/users.module';

import { RolesModule } from '@modules/roles/roles.module';

import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';

import { AuditLoggingInterceptor } from '@modules/audit-logs/common/interceptors/audit-logging.interceptor';

import { RequestLoggingMiddleware } from '@common/middleware/request-logging.middleware';

import { RateLimitModule } from '@infra/rate-limit/rate-limit.module';

import { CustomThrottlerGuard } from '@common/guards/rate-limit.guard';

import { RateLimitInterceptor } from '@common/interceptors/rate-limit.interceptor';

import { JwtModule, JwtService } from '@nestjs/jwt';

import { ConfigService } from '@nestjs/config';

import { Reflector } from '@nestjs/core';

import { ILogger } from '@core/domain/logger.interface';

import { AuthGuard } from '@common/guards/auth.guard';



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

    UsersModule,

    RolesModule,

    RateLimitModule,

    AuditLogsModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d' as any,
        },
      }),
      inject: [ConfigService],
      global: true,
    }),

  ],

  controllers: [],

  providers: [

    RequestLoggingMiddleware,

    {

      provide: APP_INTERCEPTOR,

      useClass: TransformInterceptor,

    },

    {

      provide: APP_INTERCEPTOR,

      useClass: PerformanceInterceptor,

    },

    {

      provide: APP_INTERCEPTOR,

      useClass: RateLimitInterceptor,

    },

    {

      provide: APP_INTERCEPTOR,

      useClass: AuditLoggingInterceptor,

    },

    {

      provide: APP_FILTER,

      useClass: AllExceptionsFilter,

    },

    {

      provide: APP_GUARD,

      useClass: CustomThrottlerGuard,

    },

    AuthGuard,

  ],

})

export class AppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {

    consumer.apply(RequestLoggingMiddleware).forRoutes('*');

  }

}

