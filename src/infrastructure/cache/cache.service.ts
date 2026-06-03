import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ICacheProvider } from '@core/domain/ports/cache.port';
import { ConfigService } from '@nestjs/config';
import { ILogger } from '@core/domain/logger.interface';

@Injectable()
export class RedisCacheService implements ICacheProvider {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly config: ConfigService,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  private isClusterMode(): boolean {
    const clusterNodes = this.config.get('REDIS_CLUSTER_NODES');
    return clusterNodes && clusterNodes.split(',').length > 1;
  }

  private getPrefixedKey(key: string): string {
    const prefix = this.config.get('REDIS_PREFIX') || 'default';
    return `${prefix}:${key}`;
  }

  private async withErrorHandling<T>(
    operation: string,
    key: string,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.logger.error(
        RedisCacheService.name,
        `Cache ${operation} error for key ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null; // Fail-safe
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const prefixedKey = this.getPrefixedKey(key);
    const result = await this.withErrorHandling('get', key, () =>
      this.cacheManager.get<T>(prefixedKey),
    );
    return result === null ? undefined : result;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    await this.withErrorHandling('set', key, () =>
      this.cacheManager.set(prefixedKey, value, ttl),
    );
  }

  async del(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    await this.withErrorHandling('del', key, () =>
      this.cacheManager.del(prefixedKey),
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.cacheManager.get('health-check');
      return true;
    } catch (error) {
      this.logger.error(
        RedisCacheService.name,
        'Cache health check failed',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  // Hash operations
  async setHash(fieldKey: string, value: Record<string, any>, ttl: number = 900): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(fieldKey);
    const result = await this.withErrorHandling('setHash', fieldKey, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      await store.client.hset(prefixedKey, value);
      if (ttl) {
        await store.client.expire(prefixedKey, ttl);
      }
      return true;
    });
    return result === null ? false : result;
  }

  async getHash(fieldKey: string, field?: string): Promise<any> {
    const prefixedKey = this.getPrefixedKey(fieldKey);
    return this.withErrorHandling('getHash', fieldKey, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      if (field) {
        return await store.client.hget(prefixedKey, field);
      }
      return await store.client.hgetall(prefixedKey);
    });
  }

  async incrementHash(fieldKey: string, field: string, incrementValue: number): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(fieldKey);
    const result = await this.withErrorHandling('incrementHash', fieldKey, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      await store.client.hincrby(prefixedKey, field, incrementValue);
      return true;
    });
    return result === null ? false : result;
  }

  // Set operations
  async addSet(key: string, values: any[], ttl: number = 3600): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    this.logger.log(RedisCacheService.name, `cache.service: Add set started for key ${key}`);
    const result = await this.withErrorHandling('addSet', key, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      await store.client
        .multi()
        .sadd(prefixedKey, ...values)
        .expire(prefixedKey, ttl)
        .exec();
      this.logger.log(RedisCacheService.name, `cache.service: Add set ended for key ${key}`);
      return true;
    });
    return result === null ? false : result;
  }

  async getSet(key: string): Promise<any[]> {
    const prefixedKey = this.getPrefixedKey(key);
    this.logger.log(RedisCacheService.name, `cache.service: getSet started for key ${key}`);
    const result = await this.withErrorHandling('getSet', key, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      this.logger.log(RedisCacheService.name, `cache.service: getSet ended for key ${key}`);
      return await store.client.smembers(prefixedKey);
    });
    return result === null ? [] : result;
  }

  async intersectSet(keys: string[]): Promise<any[]> {
    if (!Array.isArray(keys) || keys.length < 2) {
      this.logger.error(RedisCacheService.name, 'Intersecting requires at least two keys to compare');
      return [];
    }
    const prefixedKeys = keys.map((key) => this.getPrefixedKey(key));
    this.logger.log(RedisCacheService.name, `cache.service: IntersectSet started for keys ${keys.join(', ')}`);
    const result = await this.withErrorHandling('intersectSet', keys.join(','), async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      this.logger.log(RedisCacheService.name, `cache.service: IntersectSet ended for keys ${keys.join(', ')}`);
      return await store.client.sinter(...prefixedKeys);
    });
    return result === null ? [] : result;
  }

  async diffSet(keys: string[]): Promise<any[]> {
    if (!Array.isArray(keys) || keys.length < 2) {
      this.logger.error(RedisCacheService.name, 'diffSet requires at least two keys to compare');
      return [];
    }
    const prefixedKeys = keys.map((key) => this.getPrefixedKey(key));
    this.logger.log(RedisCacheService.name, 'cache.service: diffSet function started');
    const result = await this.withErrorHandling('diffSet', keys.join(','), async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      this.logger.log(RedisCacheService.name, 'cache.service: diffSet function ended');
      return await store.client.sdiff(...prefixedKeys);
    });
    return result === null ? [] : result;
  }

  async replaceSetSafe(key: string, values: any[], ttlSeconds: number): Promise<void> {
    this.logger.log(RedisCacheService.name, 'cache.service: replaceSetSafe started');
    const prefixedKey = this.getPrefixedKey(key);
    const tempKey = `${prefixedKey}:temp:${Date.now()}`;

    await this.withErrorHandling('replaceSetSafe', key, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      const tx = store.client.multi();

      if (values.length > 0) {
        tx.sadd(tempKey, ...values);
      } else {
        this.logger.warn(RedisCacheService.name, 'No values provided to replaceSetSafe, creating empty set');
      }

      if (ttlSeconds) {
        tx.expire(tempKey, ttlSeconds);
      } else {
        this.logger.warn(RedisCacheService.name, 'No TTL provided to replaceSetSafe, not setting expiration');
      }

      tx.rename(tempKey, prefixedKey); // overwrite atomically
      await tx.exec();
      this.logger.log(RedisCacheService.name, 'cache.service: replaceSetSafe ended');
    });
  }

  // Stream operations
  async addStream(fieldKey: string, key: string, value: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(fieldKey);
    const result = await this.withErrorHandling('addStream', fieldKey, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      await store.client.xadd(prefixedKey, '*', key, value);
      return true;
    });
    return result === null ? false : result;
  }

  async getStream(fieldKey: string, from: string = '-', to: string = '+'): Promise<any> {
    const prefixedKey = this.getPrefixedKey(fieldKey);
    return this.withErrorHandling('getStream', fieldKey, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      return await store.client.xrange(prefixedKey, from, to);
    });
  }

  // Pattern operations
  async deletePattern(pattern: string): Promise<boolean> {
    const isCluster = this.isClusterMode();

    if (isCluster) {
      // Cluster mode: iterate through all nodes
      const result = await this.withErrorHandling('deletePattern', pattern, async () => {
        const cacheManagerAny = this.cacheManager as any;
        const store = cacheManagerAny.store;
        const nodes = store.client.nodes('master');
        const allKeys: string[] = [];

        for (const node of nodes) {
          const nodeKeys = await node.keys(`${this.getPrefixedKey(pattern)}`);
          allKeys.push(...nodeKeys);
        }

        if (allKeys.length > 0) {
          await store.client.del(allKeys);
        }

        return true;
      });
      return result === null ? false : result;
    } else {
      // Single instance: use SCAN to avoid blocking
      const result = await this.withErrorHandling('deletePattern', pattern, async () => {
        const cacheManagerAny = this.cacheManager as any;
        const store = cacheManagerAny.store;
        let cursor = '0';

        do {
          const reply = await store.client.scan(cursor, 'MATCH', `${this.getPrefixedKey(pattern)}`, 'COUNT', 100);
          cursor = reply[0];
          const foundKeys = reply[1];

          if (foundKeys.length > 0) {
            await store.client.del(foundKeys);
          }
        } while (cursor !== '0');

        return true;
      });
      return result === null ? false : result;
    }
  }

  // Flush operations
  async flushDb(): Promise<boolean> {
    const result = await this.withErrorHandling('flushDb', 'all', async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      await store.client.flushDb();
      return true;
    });
    return result === null ? false : result;
  }

  // TTL operations
  async changeExpiry(key: string, ttl: number): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    const result = await this.withErrorHandling('changeExpiry', key, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      await store.client.expire(prefixedKey, ttl);
      return true;
    });
    return result === null ? false : result;
  }

  async ttl(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    const result = await this.withErrorHandling('ttl', key, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      return await store.client.ttl(prefixedKey);
    });
    return result === null ? -1 : result;
  }

  // Increment operations (for rate limiting)
  async incr(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    const result = await this.withErrorHandling('incr', key, async () => {
      const cacheManagerAny = this.cacheManager as any;
      const store = cacheManagerAny.store;
      return await store.client.incr(prefixedKey);
    });
    return result === null ? 0 : result;
  }
}
