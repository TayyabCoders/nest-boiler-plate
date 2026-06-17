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
              ttl: cfg.global.ttl,
              limit: cfg.global.limit,
            },
          ],
        };
      },
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
