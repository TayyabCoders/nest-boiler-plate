# Cache Implementation Plan
## Making NestJS Cache Production-Grade

**Target:** Match Fastify boilerplate's production-ready cache implementation  
**Current State:** Basic 3-operation cache (get, set, del)  
**Target State:** 15+ operations with cluster support, error handling, and connection management

---

## Executive Summary

This implementation plan transforms the NestJS cache from a basic abstraction to a production-ready Redis client that matches the Fastify boilerplate's feature set while maintaining NestJS's clean architecture (port-based design, dependency injection, TypeScript).

**Timeline Estimate:** 3-4 phases over 2-3 days  
**Risk Level:** Medium (requires careful Redis integration)  
**Breaking Changes:** Minimal (backward-compatible additions)

---

## Phase 1: Core Infrastructure Improvements

### 1.1 Redis Cluster Support

**Objective:** Enable Redis Cluster for horizontal scaling and high availability

**Current State:**
- Single Redis instance only
- No cluster configuration
- Limited scalability

**Target State:**
- Support both single instance and Redis Cluster
- Auto-detection based on configuration
- Key distribution across cluster nodes
- Failover support

**Implementation Steps:**

1. **Update Environment Variables**
   ```typescript
   // env.validation.ts
   REDIS_CLUSTER_NODES?: string;  // Comma-separated: "host1:port1,host2:port2"
   REDIS_HOST?: string;           // Fallback for single instance
   REDIS_PORT?: number;           // Fallback for single instance
   ```

2. **Update Cache Module Factory**
   ```typescript
   // cache.module.ts
   useFactory: async (config: ConfigService) => {
     const clusterNodes = config.get('REDIS_CLUSTER_NODES');
     const isCluster = clusterNodes && clusterNodes.split(',').length > 1;
     
     if (isCluster) {
       // Redis Cluster configuration
       const nodes = clusterNodes.split(',').map(node => {
         const [host, port] = node.split(':');
         return { host, port: parseInt(port) };
       });
       
       return {
         store: await redisStore({
           nodes,
           redisOptions: {
             password: config.get('REDIS_PASSWORD'),
             connectTimeout: 10000,
             maxRetriesPerRequest: 3,
           },
           clusterRetryStrategy: (times) => Math.min(times * 50, 2000),
           enableOfflineQueue: true,
         }),
       };
     } else {
       // Single instance configuration
       return {
         store: await redisStore({
           url: `${protocol}://${host}:${port}`,
           password,
           ttl,
         }),
       };
     }
   }
   ```

3. **Add Cluster Detection Helper**
   ```typescript
   // cache.service.ts
   private isClusterMode(): boolean {
     const clusterNodes = this.config.get('REDIS_CLUSTER_NODES');
     return clusterNodes && clusterNodes.split(',').length > 1;
   }
   ```

**Files to Modify:**
- `src/config/env.validation.ts`
- `src/infrastructure/cache/cache.module.ts`
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test single instance connection
- Test cluster connection with multiple nodes
- Test failover scenario

---

### 1.2 Comprehensive Error Handling

**Objective:** Add try-catch blocks with logging for all operations

**Current State:**
- No custom error handling
- Relies on cache-manager defaults
- May throw unexpected errors

**Target State:**
- Fail-safe operations (never throw)
- Detailed error logging
- Graceful degradation

**Implementation Steps:**

1. **Inject Logger**
   ```typescript
   // cache.service.ts
   constructor(
     @Inject(CACHE_MANAGER)
     private readonly cacheManager: Cache,
     @Inject(ConfigService)
     private readonly config: ConfigService,
     private readonly logger: Logger,
   ) {}
   ```

2. **Add Error Handling Wrapper**
   ```typescript
   // cache.service.ts
   private async withErrorHandling<T>(
     operation: string,
    key: string,
    fn: () => Promise<T>
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.logger.error(
        `Cache ${operation} error for key ${key}`,
        error.stack
      );
      return null; // Fail-safe
    }
  }
   ```

3. **Update All Operations**
   ```typescript
   async get<T>(key: string): Promise<T | undefined> {
    return this.withErrorHandling('get', key, () => 
      this.cacheManager.get<T>(key)
    );
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.withErrorHandling('set', key, () => 
      this.cacheManager.set(key, value, ttl)
    );
  }

  async del(key: string): Promise<void> {
    await this.withErrorHandling('del', key, () => 
      this.cacheManager.del(key)
    );
  }
   ```

**Files to Modify:**
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test with invalid Redis connection
- Test with network failures
- Verify error logs are generated

---

### 1.3 Connection Management & Lifecycle Hooks

**Objective:** Add connection event handling and graceful shutdown

**Current State:**
- No connection event handling
- No graceful shutdown
- Framework-managed only

**Target State:**
- Connection event listeners (connect, error, close)
- Graceful shutdown on application termination
- Connection health monitoring

**Implementation Steps:**

1. **Add Connection Event Handlers**
   ```typescript
   // cache.module.ts
   useFactory: async (config: ConfigService) => {
     const store = await redisStore(redisOptions);
     
     // Access underlying Redis client
     const redisClient = store.client;
     
     redisClient.on('connect', () => {
       console.log('✅ Redis connected');
     });
     
     redisClient.on('error', (err) => {
       console.error('❌ Redis error:', err);
     });
     
     redisClient.on('close', () => {
       console.log('🔄 Redis connection closed');
     });
     
     return { store };
   }
   ```

2. **Add Graceful Shutdown Hook**
   ```typescript
   // cache.module.ts
   @Module({
     // ... existing config
   })
   export class CacheModule implements OnModuleDestroy {
     constructor(
       @Inject(CACHE_MANAGER)
       private readonly cacheManager: Cache,
     ) {}

     async onModuleDestroy() {
       try {
         const store = this.cacheManager.store;
         if (store && store.client) {
           await store.client.quit();
           console.log('✅ Redis connection closed gracefully');
         }
       } catch (error) {
         console.error('❌ Error closing Redis connection:', error);
       }
     }
   }
   ```

3. **Add Health Check**
   ```typescript
   // cache.service.ts
   async healthCheck(): Promise<boolean> {
    try {
      await this.cacheManager.get('health-check');
      return true;
    } catch (error) {
      this.logger.error('Cache health check failed', error);
      return false;
    }
  }
   ```

**Files to Modify:**
- `src/infrastructure/cache/cache.module.ts`
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test connection events are logged
- Test graceful shutdown on SIGTERM
- Test health check endpoint

---

### 1.4 Key Prefixing

**Objective:** Add configurable key prefix for namespace isolation

**Current State:**
- No key prefixing
- Potential key collisions

**Target State:**
- Configurable prefix via environment
- Automatic prefix application

**Implementation Steps:**

1. **Add Environment Variable**
   ```typescript
   // env.validation.ts
   REDIS_PREFIX?: string;
   ```

2. **Add Prefix Helper**
   ```typescript
   // cache.service.ts
   private getPrefixedKey(key: string): string {
    const prefix = this.config.get('REDIS_PREFIX') || 'default';
    return `${prefix}:${key}`;
  }
   ```

3. **Update All Operations**
   ```typescript
   async get<T>(key: string): Promise<T | undefined> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.withErrorHandling('get', key, () => 
      this.cacheManager.get<T>(prefixedKey)
    );
  }
   ```

**Files to Modify:**
- `src/config/env.validation.ts`
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Verify keys are prefixed correctly
- Test with different prefixes

---

## Phase 2: Advanced Operations

### 2.1 Extend ICacheProvider Interface

**Objective:** Add all advanced operations to the port interface

**Implementation:**

```typescript
// cache.port.ts
export interface ICacheProvider {
  // Basic operations
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;

  // Hash operations
  setHash(fieldKey: string, value: Record<string, any>, ttl?: number): Promise<boolean>;
  getHash(fieldKey: string, field?: string): Promise<any>;
  incrementHash(fieldKey: string, field: string, incrementValue: number): Promise<boolean>;

  // Set operations
  addSet(key: string, values: any[], ttl?: number): Promise<boolean>;
  getSet(key: string): Promise<any[]>;
  intersectSet(keys: string[]): Promise<any[]>;
  diffSet(keys: string[]): Promise<any[]>;
  replaceSetSafe(key: string, values: any[], ttlSeconds: number): Promise<void>;

  // Stream operations
  addStream(fieldKey: string, key: string, value: string): Promise<boolean>;
  getStream(fieldKey: string, from?: string, to?: string): Promise<any>;

  // Pattern operations
  deletePattern(pattern: string): Promise<boolean>;

  // TTL operations
  changeExpiry(key: string, ttl: number): Promise<boolean>;

  // Health check
  healthCheck(): Promise<boolean>;
}
```

**Files to Modify:**
- `src/core/domain/ports/cache.port.ts`

---

### 2.2 Hash Operations Implementation

**Objective:** Implement Redis hash operations (HSET, HGET, HGETALL, HINCRBY)

**Implementation:**

```typescript
// cache.service.ts
async setHash(fieldKey: string, value: Record<string, any>, ttl: number = 900): Promise<boolean> {
  const prefixedKey = this.getPrefixedKey(fieldKey);
  return this.withErrorHandling('setHash', fieldKey, async () => {
    const store = this.cacheManager.store as any;
    await store.client.hset(prefixedKey, value);
    if (ttl) {
      await store.client.expire(prefixedKey, ttl);
    }
    return true;
  }) ?? false;
}

async getHash(fieldKey: string, field?: string): Promise<any> {
  const prefixedKey = this.getPrefixedKey(fieldKey);
  return this.withErrorHandling('getHash', fieldKey, async () => {
    const store = this.cacheManager.store as any;
    if (field) {
      return await store.client.hget(prefixedKey, field);
    }
    return await store.client.hgetall(prefixedKey);
  });
}

async incrementHash(fieldKey: string, field: string, incrementValue: number): Promise<boolean> {
  const prefixedKey = this.getPrefixedKey(fieldKey);
  return this.withErrorHandling('incrementHash', fieldKey, async () => {
    const store = this.cacheManager.store as any;
    await store.client.hincrby(prefixedKey, field, incrementValue);
    return true;
  }) ?? false;
}
```

**Files to Modify:**
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test setting hash fields
- Test getting specific field
- Test getting all fields
- Test increment operation

---

### 2.3 Set Operations Implementation

**Objective:** Implement Redis set operations (SADD, SMEMBERS, SINTER, SDIFF)

**Implementation:**

```typescript
// cache.service.ts
async addSet(key: string, values: any[], ttl: number = 3600): Promise<boolean> {
  const prefixedKey = this.getPrefixedKey(key);
  return this.withErrorHandling('addSet', key, async () => {
    const store = this.cacheManager.store as any;
    await store.client.multi()
      .sadd(prefixedKey, ...values)
      .expire(prefixedKey, ttl)
      .exec();
    return true;
  }) ?? false;
}

async getSet(key: string): Promise<any[]> {
  const prefixedKey = this.getPrefixedKey(key);
  return this.withErrorHandling('getSet', key, async () => {
    const store = this.cacheManager.store as any;
    return await store.client.smembers(prefixedKey);
  }) ?? [];
}

async intersectSet(keys: string[]): Promise<any[]> {
  if (!Array.isArray(keys) || keys.length < 2) {
    this.logger.error('Intersecting requires at least two keys to compare');
    return [];
  }
  
  const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
  return this.withErrorHandling('intersectSet', keys.join(','), async () => {
    const store = this.cacheManager.store as any;
    return await store.client.sinter(...prefixedKeys);
  }) ?? [];
}

async diffSet(keys: string[]): Promise<any[]> {
  if (!Array.isArray(keys) || keys.length < 2) {
    this.logger.error('diffSet requires at least two keys to compare');
    return [];
  }
  
  const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
  return this.withErrorHandling('diffSet', keys.join(','), async () => {
    const store = this.cacheManager.store as any;
    return await store.client.sdiff(...prefixedKeys);
  }) ?? [];
}

async replaceSetSafe(key: string, values: any[], ttlSeconds: number): Promise<void> {
  const prefixedKey = this.getPrefixedKey(key);
  const tempKey = `${prefixedKey}:temp:${Date.now()}`;
  
  await this.withErrorHandling('replaceSetSafe', key, async () => {
    const store = this.cacheManager.store as any;
    const tx = store.client.multi();
    
    if (values.length > 0) {
      tx.sadd(tempKey, ...values);
    }
    
    if (ttlSeconds) {
      tx.expire(tempKey, ttlSeconds);
    }
    
    tx.rename(tempKey, prefixedKey);
    await tx.exec();
  });
}
```

**Files to Modify:**
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test adding values to set
- Test getting set members
- Test set intersection
- Test set difference
- Test atomic replace

---

### 2.4 Stream Operations Implementation

**Objective:** Implement Redis stream operations (XADD, XRANGE)

**Implementation:**

```typescript
// cache.service.ts
async addStream(fieldKey: string, key: string, value: string): Promise<boolean> {
  const prefixedKey = this.getPrefixedKey(fieldKey);
  return this.withErrorHandling('addStream', fieldKey, async () => {
    const store = this.cacheManager.store as any;
    await store.client.xadd(prefixedKey, '*', key, value);
    return true;
  }) ?? false;
}

async getStream(fieldKey: string, from: string = '-', to: string = '+'): Promise<any> {
  const prefixedKey = this.getPrefixedKey(fieldKey);
  return this.withErrorHandling('getStream', fieldKey, async () => {
    const store = this.cacheManager.store as any;
    return await store.client.xrange(prefixedKey, from, to);
  });
}
```

**Files to Modify:**
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test adding to stream
- Test reading from stream

---

## Phase 3: Pattern Deletion & TTL Management

### 3.1 Pattern Deletion Implementation

**Objective:** Implement SCAN-based pattern deletion (non-blocking)

**Implementation:**

```typescript
// cache.service.ts
async deletePattern(pattern: string): Promise<boolean> {
  const isCluster = this.isClusterMode();
  
  if (isCluster) {
    // Cluster mode: iterate through all nodes
    return this.withErrorHandling('deletePattern', pattern, async () => {
      const store = this.cacheManager.store as any;
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
    }) ?? false;
  } else {
    // Single instance: use SCAN to avoid blocking
    return this.withErrorHandling('deletePattern', pattern, async () => {
      const store = this.cacheManager.store as any;
      let cursor = '0';
      
      do {
        const reply = await store.client.scan(
          cursor, 
          'MATCH', 
          `${this.getPrefixedKey(pattern)}`, 
          'COUNT', 
          100
        );
        cursor = reply[0];
        const foundKeys = reply[1];
        
        if (foundKeys.length > 0) {
          await store.client.del(foundKeys);
        }
      } while (cursor !== '0');
      
      return true;
    }) ?? false;
  }
}
```

**Files to Modify:**
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test pattern deletion in single instance mode
- Test pattern deletion in cluster mode
- Verify non-blocking behavior

---

### 3.2 TTL Management Implementation

**Objective:** Implement TTL change operation

**Implementation:**

```typescript
// cache.service.ts
async changeExpiry(key: string, ttl: number): Promise<boolean> {
  const prefixedKey = this.getPrefixedKey(key);
  return this.withErrorHandling('changeExpiry', key, async () => {
    const store = this.cacheManager.store as any;
    await store.client.expire(prefixedKey, ttl);
    return true;
  }) ?? false;
}
```

**Files to Modify:**
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test changing TTL of existing key
- Test with non-existent key

---

### 3.3 Flush Operation (Optional)

**Objective:** Implement flush all operation (use with caution)

**Implementation:**

```typescript
// cache.service.ts
async flush(): Promise<boolean> {
  return this.withErrorHandling('flush', 'all', async () => {
    const store = this.cacheManager.store as any;
    await store.client.flushall();
    return true;
  }) ?? false;
}
```

**Files to Modify:**
- `src/infrastructure/cache/cache.service.ts`

**Testing:**
- Test flush operation (in dev environment only)

---

## Phase 4: Testing & Validation

### 4.1 Unit Tests

**Objective:** Add comprehensive unit tests for all operations

**Test Structure:**

```typescript
// cache.service.spec.ts
describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      store: {
        client: {
          hset: jest.fn(),
          hget: jest.fn(),
          hgetall: jest.fn(),
          sadd: jest.fn(),
          smembers: jest.fn(),
          // ... other Redis commands
        }
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'REDIS_PREFIX') return 'test';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  describe('basic operations', () => {
    it('should get value', async () => {
      mockCacheManager.get.mockResolvedValue('test-value');
      const result = await service.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should set value', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      await service.set('test-key', 'test-value', 3600);
      expect(mockCacheManager.set).toHaveBeenCalledWith('test:test-key', 'test-value', 3600);
    });

    it('should delete key', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);
      await service.del('test-key');
      expect(mockCacheManager.del).toHaveBeenCalledWith('test:test-key');
    });
  });

  describe('hash operations', () => {
    it('should set hash', async () => {
      mockCacheManager.store.client.hset.mockResolvedValue(1);
      mockCacheManager.store.client.expire.mockResolvedValue(1);
      const result = await service.setHash('test-key', { field: 'value' });
      expect(result).toBe(true);
    });

    it('should get hash field', async () => {
      mockCacheManager.store.client.hget.mockResolvedValue('value');
      const result = await service.getHash('test-key', 'field');
      expect(result).toBe('value');
    });

    it('should get all hash fields', async () => {
      mockCacheManager.store.client.hgetall.mockResolvedValue({ field: 'value' });
      const result = await service.getHash('test-key');
      expect(result).toEqual({ field: 'value' });
    });

    it('should increment hash field', async () => {
      mockCacheManager.store.client.hincrby.mockResolvedValue(5);
      const result = await service.incrementHash('test-key', 'counter', 1);
      expect(result).toBe(true);
    });
  });

  describe('set operations', () => {
    it('should add to set', async () => {
      mockCacheManager.store.client.multi.mockReturnValue({
        sadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      });
      const result = await service.addSet('test-key', ['value1', 'value2']);
      expect(result).toBe(true);
    });

    it('should get set members', async () => {
      mockCacheManager.store.client.smembers.mockResolvedValue(['value1', 'value2']);
      const result = await service.getSet('test-key');
      expect(result).toEqual(['value1', 'value2']);
    });

    it('should intersect sets', async () => {
      mockCacheManager.store.client.sinter.mockResolvedValue(['common']);
      const result = await service.intersectSet(['set1', 'set2']);
      expect(result).toEqual(['common']);
    });

    it('should diff sets', async () => {
      mockCacheManager.store.client.sdiff.mockResolvedValue(['diff']);
      const result = await service.diffSet(['set1', 'set2']);
      expect(result).toEqual(['diff']);
    });
  });

  describe('stream operations', () => {
    it('should add to stream', async () => {
      mockCacheManager.store.client.xadd.mockResolvedValue('1234567890-0');
      const result = await service.addStream('test-stream', 'field', 'value');
      expect(result).toBe(true);
    });

    it('should get from stream', async () => {
      mockCacheManager.store.client.xrange.mockResolvedValue([]);
      const result = await service.getStream('test-stream');
      expect(result).toEqual([]);
    });
  });

  describe('pattern operations', () => {
    it('should delete pattern', async () => {
      mockCacheManager.store.client.scan.mockResolvedValue(['0', ['key1', 'key2']]);
      mockCacheManager.store.client.del.mockResolvedValue(2);
      const result = await service.deletePattern('test:*');
      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle get errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis error'));
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle set errors gracefully', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis error'));
      await expect(service.set('test-key', 'value')).resolves.not.toThrow();
    });
  });

  describe('health check', () => {
    it('should return true on successful health check', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false on failed health check', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis error'));
      const result = await service.healthCheck();
      expect(result).toBe(false);
    });
  });
});
```

**Files to Create:**
- `src/infrastructure/cache/cache.service.spec.ts`

---

### 4.2 Integration Tests

**Objective:** Test with real Redis instance

**Implementation:**

```typescript
// cache.service.integration.spec.ts
describe('RedisCacheService Integration', () => {
  let service: RedisCacheService;
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [CacheModule, ConfigModule.forRoot()],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = app.get<RedisCacheService>(RedisCacheService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should set and get value', async () => {
    await service.set('integration-test', { data: 'test' }, 60);
    const result = await service.get('integration-test');
    expect(result).toEqual({ data: 'test' });
  });

  it('should perform hash operations', async () => {
    await service.setHash('user:123', { name: 'John', age: 30 });
    const name = await service.getHash('user:123', 'name');
    expect(name).toBe('John');
  });

  it('should perform set operations', async () => {
    await service.addSet('roles', ['admin', 'editor']);
    const roles = await service.getSet('roles');
    expect(roles).toContain('admin');
  });
});
```

**Files to Create:**
- `src/infrastructure/cache/cache.service.integration.spec.ts`

---

### 4.3 Documentation

**Objective:** Update README with cache usage examples

**Add to README.md:**

```markdown
## Cache Usage

### Basic Operations

```typescript
@Injectable()
export class UserService {
  constructor(
    @Inject('ICacheProvider')
    private readonly cache: ICacheProvider,
  ) {}

  async getUser(id: string) {
    // Try cache first
    const cached = await this.cache.get(`user:${id}`);
    if (cached) return cached;

    // Fetch from database
    const user = await this.userRepository.findOne(id);
    
    // Cache for 1 hour
    await this.cache.set(`user:${id}`, user, 3600);
    
    return user;
  }
}
```

### Hash Operations

```typescript
// Store user profile as hash
await cache.setHash('user:123:profile', {
  name: 'John',
  age: 30,
  email: 'john@example.com'
}, 900);

// Get specific field
const name = await cache.getHash('user:123:profile', 'name');

// Get all fields
const profile = await cache.getHash('user:123:profile');

// Increment counter
await cache.incrementHash('user:123:stats', 'loginCount', 1);
```

### Set Operations

```typescript
// Add roles to set
await cache.addSet('user:123:roles', ['admin', 'editor'], 3600);

// Get all roles
const roles = await cache.getSet('user:123:roles');

// Find common roles between users
const commonRoles = await cache.intersectSet([
  'user:123:roles',
  'user:456:roles'
]);

// Atomic replace
await cache.replaceSetSafe('user:123:roles', ['viewer'], 3600);
```

### Stream Operations

```typescript
// Add event to stream
await cache.addStream('events:user:123', 'type', 'login');

// Read from stream
const events = await cache.getStream('events:user:123');
```

### Pattern Deletion

```typescript
// Delete all user session keys
await cache.deletePattern('user:*:session');
```

### TTL Management

```typescript
// Change expiration time
await cache.changeExpiry('user:123', 7200);
```

### Health Check

```typescript
const isHealthy = await cache.healthCheck();
if (!isHealthy) {
  // Handle cache unavailability
}
```
```

**Files to Modify:**
- `README.md`

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Add Redis Cluster environment variables
- [ ] Update cache module factory for cluster support
- [ ] Add cluster detection helper
- [ ] Inject Logger into cache service
- [ ] Add error handling wrapper
- [ ] Update all basic operations with error handling
- [ ] Add connection event handlers
- [ ] Implement OnModuleDestroy hook
- [ ] Add health check method
- [ ] Add REDIS_PREFIX environment variable
- [ ] Add key prefixing helper
- [ ] Update all operations to use prefixed keys

### Phase 2: Advanced Operations
- [ ] Extend ICacheProvider interface with all operations
- [ ] Implement setHash method
- [ ] Implement getHash method
- [ ] Implement incrementHash method
- [ ] Implement addSet method
- [ ] Implement getSet method
- [ ] Implement intersectSet method
- [ ] Implement diffSet method
- [ ] Implement replaceSetSafe method
- [ ] Implement addStream method
- [ ] Implement getStream method

### Phase 3: Pattern & TTL
- [ ] Implement deletePattern method (single instance)
- [ ] Implement deletePattern method (cluster mode)
- [ ] Implement changeExpiry method
- [ ] Implement flush method (optional)

### Phase 4: Testing & Documentation
- [ ] Create unit tests for basic operations
- [ ] Create unit tests for hash operations
- [ ] Create unit tests for set operations
- [ ] Create unit tests for stream operations
- [ ] Create unit tests for pattern operations
- [ ] Create unit tests for error handling
- [ ] Create unit tests for health check
- [ ] Create integration tests
- [ ] Update README with usage examples
- [ ] Update environment documentation

---

## Risk Assessment

### High Risk Items
- **Redis Cluster Integration:** Complex configuration, requires testing with actual cluster
- **Pattern Deletion in Cluster Mode:** Key distribution complexity
- **Direct Redis Client Access:** Breaking cache-manager abstraction

### Mitigation Strategies
1. **Feature Flags:** Add flags to enable/disable advanced features
2. **Gradual Rollout:** Implement features incrementally
3. **Comprehensive Testing:** Unit and integration tests for each feature
4. **Fallback Mechanisms:** Graceful degradation on errors
5. **Documentation:** Clear usage guidelines and warnings

---

## Dependencies

### Required Packages (Already Installed)
- `@nestjs/cache-manager`
- `cache-manager`
- `cache-manager-redis-yet`

### Additional Packages (If Needed)
- `@types/ioredis` - For direct Redis client type definitions
- `redis-mock` - For unit testing

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Core Infrastructure | 1 day | None |
| Phase 2: Advanced Operations | 1 day | Phase 1 |
| Phase 3: Pattern & TTL | 0.5 day | Phase 1 |
| Phase 4: Testing & Documentation | 0.5-1 day | Phase 2, 3 |
| **Total** | **3-3.5 days** | |

---

## Success Criteria

- [ ] All 15+ operations implemented and tested
- [ ] Redis Cluster support verified
- [ ] Error handling covers all operations
- [ ] Connection lifecycle managed properly
- [ ] Unit test coverage > 80%
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Backward compatibility maintained
- [ ] Performance benchmarks match Fastify implementation

---

## Next Steps

1. **Review and Approve Plan:** Get stakeholder approval
2. **Setup Development Environment:** Ensure Redis instance available for testing
3. **Start Phase 1:** Begin with core infrastructure improvements
4. **Incremental Testing:** Test each phase before proceeding
5. **Code Review:** Review each phase with team
6. **Documentation:** Keep documentation updated throughout
7. **Final Validation:** End-to-end testing before deployment

---

**Plan Version:** 1.0  
**Last Updated:** June 2, 2026  
**Status:** Ready for Implementation
