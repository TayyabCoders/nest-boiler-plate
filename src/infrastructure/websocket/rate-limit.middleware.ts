import { Injectable, Inject } from '@nestjs/common';
import type { ICacheProvider } from '@core/domain/ports/cache.port';
import { ILogger } from '@core/domain/logger.interface';
import { rateLimitConfig } from '@config/rate-limit.config';

@Injectable()
export class WsRateLimitMiddleware {
  constructor(
    @Inject('ICacheProvider')
    private readonly cache: ICacheProvider,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  async handle(socket: any, next: (err?: Error) => void) {
    const cfg = rateLimitConfig();
    const userId = socket.user?.id || socket.id;
    const key = `ws:rate_limit:${userId}`;
    const ttl = cfg.websocket.ttl;
    const limit = cfg.websocket.limit;

    try {
      const current = await this.cache.incr(key);

      if (current === 1) {
        await this.cache.changeExpiry(key, ttl);
      }

      if (current > limit) {
        this.logger.warn(
          'WsRateLimitMiddleware',
          `WebSocket rate limit exceeded for user ${userId}`,
        );

        // Emit rate limit warning to client
        socket.emit('rate_limit_warning', {
          limit,
          reset: ttl,
        });

        return next(new Error('Rate limit exceeded'));
      }

      // Send remaining count to client
      socket.emit('rate_limit_status', {
        remaining: limit - current,
        limit,
        reset: ttl,
      });

      next();
    } catch (error) {
      this.logger.error(
        'WsRateLimitMiddleware',
        `Rate limit check failed for user ${userId}`,
        (error as Error).message,
      );
      // Fail open - allow request if cache fails
      next();
    }
  }
}
