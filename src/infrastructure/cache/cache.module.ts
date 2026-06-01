import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisCacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const host = config.get('REDIS_HOST');
        const port = config.get('REDIS_PORT');
        const password = config.get('REDIS_PASSWORD') || undefined;
        const ttl = config.get('REDIS_CACHE_TTL') * 1000; // convert to ms

        const isTls = config.get('REDIS_TLS');
        const protocol = isTls ? 'rediss' : 'redis';
        
        console.log(`[CacheModule] Connecting to Redis at ${host}:${port}, TLS: ${isTls}`);

        const redisOptions: any = {
          url: `${protocol}://${host}:${port}`,
          password,
          ttl,
        };

        if (isTls) {
          redisOptions.socket = {
            tls: true,
            rejectUnauthorized: false // Often needed for PaaS Redis, though Upstash usually has valid certs
          };
        }

        return {
          store: await redisStore(redisOptions),
        };
      },
    }),
  ],
  providers: [
    {
      provide: 'ICacheProvider',
      useClass: RedisCacheService,
    },
  ],
  exports: [NestCacheModule, 'ICacheProvider'],
})
export class CacheModule {}
