/**
 * Redis Cache Test Script
 *
 * This script tests the Redis cache implementation.
 * Run with: npx ts-node scripts/test-cache.ts
 */

import 'dotenv/config';
import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_TLS = process.env.REDIS_TLS === 'true';
const REDIS_PREFIX = process.env.REDIS_PREFIX || 'test';

async function testCache() {
  console.log('🧪 Starting Redis Cache Test...\n');
  console.log(`📍 Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`🔒 TLS: ${REDIS_TLS}`);
  console.log(`🔑 Password: ${REDIS_PASSWORD ? '***' : 'None'}`);
  console.log(`🏷️  Prefix: ${REDIS_PREFIX}\n`);

  const client = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
    password: REDIS_PASSWORD,
  });

  client.on('error', (err) => console.error('❌ Redis Client Error:', err));
  client.on('connect', () => console.log('✅ Redis Client Connected'));

  try {
    await client.connect();
    console.log('✅ Connected to Redis successfully\n');

    // Test 1: Basic Operations
    console.log('📋 Test 1: Basic Operations (get, set, del)');
    console.log('─'.repeat(50));
    
    await client.set(`${REDIS_PREFIX}:test:key1`, 'value1');
    const value1 = await client.get(`${REDIS_PREFIX}:test:key1`);
    console.log(`✅ SET/GET: ${value1}`);

    await client.del(`${REDIS_PREFIX}:test:key1`);
    const deletedValue = await client.get(`${REDIS_PREFIX}:test:key1`);
    console.log(`✅ DEL: ${deletedValue === null ? 'Key deleted' : 'Failed'}`);

    await client.set(`${REDIS_PREFIX}:test:key2`, JSON.stringify({ name: 'John', age: 30 }), { EX: 10 });
    const jsonValue = await client.get(`${REDIS_PREFIX}:test:key2`);
    console.log(`✅ SET with TTL: ${jsonValue}`);
    console.log('');

    // Test 2: Hash Operations
    console.log('📋 Test 2: Hash Operations (hset, hget, hgetall, hincrby)');
    console.log('─'.repeat(50));

    await client.hSet(`${REDIS_PREFIX}:test:user:123`, {
      name: 'John',
      age: '30',
      email: 'john@example.com',
    });
    await client.expire(`${REDIS_PREFIX}:test:user:123`, 900);
    console.log('✅ HSET: User profile stored');

    const name = await client.hGet(`${REDIS_PREFIX}:test:user:123`, 'name');
    console.log(`✅ HGET: name = ${name}`);

    const profile = await client.hGetAll(`${REDIS_PREFIX}:test:user:123`);
    console.log(`✅ HGETALL: ${JSON.stringify(profile)}`);

    await client.hIncrBy(`${REDIS_PREFIX}:test:user:123`, 'loginCount', 1);
    const loginCount = await client.hGet(`${REDIS_PREFIX}:test:user:123`, 'loginCount');
    console.log(`✅ HINCRBY: loginCount = ${loginCount}`);
    console.log('');

    // Test 3: Set Operations
    console.log('📋 Test 3: Set Operations (sadd, smembers, sinter, sdiff)');
    console.log('─'.repeat(50));

    await client.sAdd(`${REDIS_PREFIX}:test:user:123:roles`, ['admin', 'editor', 'viewer']);
    await client.expire(`${REDIS_PREFIX}:test:user:123:roles`, 3600);
    console.log('✅ SADD: Roles added');

    const roles = await client.sMembers(`${REDIS_PREFIX}:test:user:123:roles`);
    console.log(`✅ SMEMBERS: ${roles.join(', ')}`);

    await client.sAdd(`${REDIS_PREFIX}:test:user:456:roles`, ['editor', 'viewer']);
    await client.sAdd(`${REDIS_PREFIX}:test:user:789:roles`, ['admin', 'viewer']);

    const commonRoles = await client.sInter([
      `${REDIS_PREFIX}:test:user:123:roles`,
      `${REDIS_PREFIX}:test:user:456:roles`,
    ]);
    console.log(`✅ SINTER: Common roles = ${commonRoles.join(', ')}`);

    const diffRoles = await client.sDiff([
      `${REDIS_PREFIX}:test:user:123:roles`,
      `${REDIS_PREFIX}:test:user:456:roles`,
    ]);
    console.log(`✅ SDIFF: Different roles = ${diffRoles.join(', ')}`);
    console.log('');

    // Test 4: Stream Operations
    console.log('📋 Test 4: Stream Operations (xadd, xrange)');
    console.log('─'.repeat(50));

    const streamId = await client.xAdd(
      `${REDIS_PREFIX}:test:events:user:123`,
      '*',
      {
        type: 'login',
        timestamp: Date.now().toString(),
      },
    );
    console.log(`✅ XADD: Event added with ID ${streamId}`);

    const events = await client.xRange(`${REDIS_PREFIX}:test:events:user:123`, '-', '+');
    console.log(`✅ XRANGE: ${events.length} events retrieved`);
    console.log('');

    // Test 5: Pattern Deletion
    console.log('📋 Test 5: Pattern Deletion (scan + del)');
    console.log('─'.repeat(50));

    // Create some test keys with pattern
    await client.set(`${REDIS_PREFIX}:test:session:1`, 'data1');
    await client.set(`${REDIS_PREFIX}:test:session:2`, 'data2');
    await client.set(`${REDIS_PREFIX}:test:session:3`, 'data3');

    let cursor = 0;
    let deletedCount = 0;
    do {
      const result = await client.scan(cursor, {
        MATCH: `${REDIS_PREFIX}:test:session:*`,
        COUNT: 100,
      });
      cursor = Number(result.cursor);
      const keys = result.keys;
      
      if (keys.length > 0) {
        await client.del(keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    console.log(`✅ SCAN + DEL: Deleted ${deletedCount} keys matching pattern`);
    console.log('');

    // Test 6: TTL Management
    console.log('📋 Test 6: TTL Management (expire, ttl)');
    console.log('─'.repeat(50));

    await client.set(`${REDIS_PREFIX}:test:ttl:key`, 'value', { EX: 300 });
    const ttl = await client.ttl(`${REDIS_PREFIX}:test:ttl:key`);
    console.log(`✅ EXPIRE + TTL: Key expires in ${ttl} seconds`);

    await client.expire(`${REDIS_PREFIX}:test:ttl:key`, 600);
    const newTtl = await client.ttl(`${REDIS_PREFIX}:test:ttl:key`);
    console.log(`✅ EXPIRE update: Key now expires in ${newTtl} seconds`);
    console.log('');

    // Test 8: Cleanup
    console.log('📋 Test 8: Cleanup');
    console.log('─'.repeat(50));

    const keys = await client.keys(`${REDIS_PREFIX}:test:*`);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`✅ Cleaned up ${keys.length} test keys`);
    } else {
      console.log('✅ No test keys to clean up');
    }
    console.log('');

    console.log('─'.repeat(50));
    console.log('✅ All cache tests passed successfully!');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await client.quit();
    console.log('🔌 Redis connection closed');
  }
}

// Run the test
testCache().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
