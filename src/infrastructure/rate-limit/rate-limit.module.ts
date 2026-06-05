import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { rateLimitConfig } from '@config/rate-limit.config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = rateLimitConfig();

        return {
          throttlers: [
            {
              name: 'global',
              ttl: cfg.global.ttl,
              limit: cfg.global.limit,
            },
            {
              name: 'auth',
              ttl: cfg.auth.ttl,
              limit: cfg.auth.limit,
            },
            {
              name: 'apiKey',
              ttl: cfg.apiKey.ttl,
              limit: cfg.apiKey.limit,
            },
            {
              name: 'ip',
              ttl: cfg.ip.ttl,
              limit: cfg.ip.limit,
            },
          ],
        };
      },
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
