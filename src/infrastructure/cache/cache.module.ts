import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisCacheService } from './cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ILogger } from '@core/domain/logger.interface';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const clusterNodes = config.get('REDIS_CLUSTER_NODES');
        const isCluster = clusterNodes && clusterNodes.split(',').length > 1;
        const password = config.get('REDIS_PASSWORD') || undefined;
        const ttl = config.get('REDIS_CACHE_TTL') * 1000; // convert to ms
        const isTls = config.get('REDIS_TLS');
        const prefix = config.get('REDIS_PREFIX') || 'default';

        let redisOptions: any;

        if (isCluster) {
          // Redis Cluster configuration
          const nodes = clusterNodes.split(',').map((node: string) => {
            const [host, port] = node.split(':');
            return { host, port: parseInt(port) };
          });

          console.log(`[CacheModule] Connecting to Redis Cluster with ${nodes.length} nodes, Prefix: ${prefix}, TLS: ${isTls}`);

          redisOptions = {
            nodes,
            redisOptions: {
              password,
              connectTimeout: 10000,
              maxRetriesPerRequest: 3,
            },
            clusterRetryStrategy: (times: number) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            enableOfflineQueue: true,
            ttl,
          };

          if (isTls) {
            redisOptions.redisOptions.tls = {
              rejectUnauthorized: false,
            };
          }
        } else {
          // Single Redis instance configuration
          const host = config.get('REDIS_HOST');
          const port = config.get('REDIS_PORT');
          const protocol = isTls ? 'rediss' : 'redis';

          console.log(`[CacheModule] Connecting to Redis at ${host}:${port}, Prefix: ${prefix}, TLS: ${isTls}`);

          redisOptions = {
            url: `${protocol}://${host}:${port}`,
            password,
            ttl,
          };

          if (isTls) {
            redisOptions.socket = {
              tls: true,
              rejectUnauthorized: false,
            };
          }
        }

        const store = await redisStore(redisOptions);

        // Add connection event handlers
        if (store && store.client) {
          const redisClient = store.client;
          const mode = isCluster ? 'Cluster' : 'Client';

          redisClient.on('connect', () => {
            console.log(`✅ Redis ${mode} connected`);
          });

          redisClient.on('error', (err: Error) => {
            console.error(`❌ Redis ${mode} error:`, err);
          });

          redisClient.on('close', () => {
            console.log(`🔄 Redis ${mode} connection closed`);
          });

          redisClient.on('reconnecting', () => {
            console.log(`🔄 Redis ${mode} reconnecting...`);
          });
        }

        return {
          store,
          isCluster,
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
export class CacheModule implements OnModuleDestroy {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  async onModuleDestroy() {
    try {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      if (store && store.client) {
        const isCluster = store.isCluster || false;
        const mode = isCluster ? 'Cluster' : 'Client';

        if (isCluster) {
          // Redis Cluster - close all nodes
          const masters = store.client.nodes('master') || [];
          const replicas = store.client.nodes('replica') || [];
          const allNodes = [...masters, ...replicas];

          const closePromises = allNodes.map((node: any) => {
            return new Promise((resolve) => {
              node.disconnect();
              resolve(undefined);
            });
          });

          await Promise.allSettled(closePromises);
          this.logger.log('CacheModule', `✅ Redis ${mode} connections closed`);
        } else {
          // Single Redis instance
          await store.client.quit();
          this.logger.log('CacheModule', `✅ Redis ${mode} connection closed`);
        }
      } else {
        this.logger.log('CacheModule', '✅ No Redis connection to close');
      }
    } catch (error) {
      this.logger.error(
        'CacheModule',
        '❌ Error closing Redis connection',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
