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

  // Flush operations
  flushDb(): Promise<boolean>;
}
