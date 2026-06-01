# BullMQ to RabbitMQ Migration Guide

## Overview

This document provides a comprehensive guide for migrating from BullMQ (Redis-based) to RabbitMQ (AMQP-based) in the NestJS application, following the same architecture used in the Fastify implementation.

## Architecture Comparison

### Current Setup (BullMQ)
- **Queue Backend**: Redis
- **Library**: `@nestjs/bullmq` + `bullmq`
- **Pattern**: Job-based processing with retry logic
- **Features**: Built-in retry, delay, priority, rate limiting

### Target Setup (RabbitMQ)
- **Queue Backend**: RabbitMQ
- **Library**: `amqplib` (direct AMQP client)
- **Pattern**: Message-based processing with exchanges and routing keys
- **Features**: Topic exchanges, dead letter queues, message TTL, flexible routing

## Migration Strategy

### Phase 1: Preparation
1. Install RabbitMQ dependencies
2. Update environment variables
3. Create RabbitMQ service layer
4. Update configuration validation

### Phase 2: Implementation
1. Create RabbitMQ module and service
2. Implement connection management
3. Implement exchange and queue setup
4. Implement publisher/consumer patterns
5. Update health checks

### Phase 3: Migration
1. Convert mail processor to RabbitMQ consumer
2. Update mail service to use RabbitMQ publisher
3. Remove BullMQ dependencies
4. Update module imports

### Phase 4: Testing
1. Test message publishing
2. Test message consumption
3. Test error handling and DLQ
4. Test graceful shutdown

## Detailed Implementation Plan

### 1. Dependencies Installation

**Remove:**
```bash
npm uninstall @nestjs/bullmq bullmq
```

**Add:**
```bash
npm install amqplib amqp-connection-manager @types/amqplib
```

### 2. Environment Variables

**Add to `.env`:**
```env
# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_VHOST=/

# Optional: Kafka (disabled by default)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=app-client
KAFKA_GROUP_ID=app-group
```

**Update `src/config/env.validation.ts`:**
```typescript
// Add RabbitMQ config
RABBITMQ_URL: z.string().default('amqp://localhost'),
RABBITMQ_USER: z.string().optional(),
RABBITMQ_PASSWORD: z.string().optional(),
RABBITMQ_HOST: z.string().default('localhost'),
RABBITMQ_PORT: z.coerce.number().default(5672),
RABBITMQ_VHOST: z.string().default('/'),

// Optional Kafka config
KAFKA_BROKERS: z.string().optional(),
KAFKA_CLIENT_ID: z.string().optional(),
KABKA_GROUP_ID: z.string().optional(),
```

### 3. File Structure Changes

**Simple Single-File Structure (matching Fastify pattern):**
```
src/infrastructure/queue/
├── queue.service.ts    # Everything in one file (connection, channels, topology, publish, consume, health check, shutdown)
└── queue.module.ts      # Simple module with QueueService provider
```

**Removed:**
```
src/infrastructure/mail/mail.processor.ts  # BullMQ processor
```

**Why Single File?**
- Matches the simplicity of your Fastify `queue.config.js`
- No unnecessary abstraction layers
- Easier to maintain and understand
- Uses `amqp-connection-manager` for automatic reconnection (better than raw amqplib)

### 4. Core Components Implementation

#### 4.1 Queue Service (Single File)

**File:** `src/infrastructure/queue/queue.service.ts`

This single file contains everything:
- Connection management with `amqp-connection-manager`
- Separate publisher and consumer channels
- Exchange and queue topology setup
- Message publishing
- Message consumption
- Health checks
- Graceful shutdown

**Complete implementation:**
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { LoggerAdapter } from '../logger/logger.adapter';

// Exchange / Queue Definitions
const EXCHANGES = {
  EVENTS: 'events',
  DLX:    'dlx',
} as const;

const QUEUES = [
  { name: 'user.events',                   routingKey: 'user.*' },
  { name: 'service.events',                routingKey: 'service.*' },
  { name: 'notification.events',           routingKey: 'notification.*' },
  { name: 'service:notification.message',  routingKey: 'service:notification.*' },
] as const;

export const ROUTING_KEYS = {
  USER_CREATED:         'user.created',
  USER_UPDATED:         'user.updated',
  SERVICE_STARTED:      'service.started',
  NOTIFICATION_SEND:    'notification.send',
  SERVICE_NOTIFICATION: 'service:notification.send',
} as const;

const DLQ_NAME = 'dlq';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private connection:      amqp.AmqpConnectionManager;
  private publishChannel:  amqp.ChannelWrapper;
  private consumeChannel:  amqp.ChannelWrapper;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerAdapter,
  ) {}

  async onModuleInit()   { await this.initialize(); }
  async onModuleDestroy(){ await this.gracefulShutdown(); }

  private async initialize() {
    const url      = this.config.get<string>('RABBITMQ_URL', 'amqp://localhost');
    const prefetch = this.config.get<number>('RABBITMQ_PREFETCH', 1);
    const ttl      = this.config.get<number>('RABBITMQ_MESSAGE_TTL', 3600000);

    this.connection = amqp.connect([url]);

    this.connection.on('connect',    ()      => this.logger.log('✅ RabbitMQ connected'));
    this.connection.on('disconnect', ({err}) => this.logger.warn(`⚠️ RabbitMQ disconnected: ${err?.message}`));

    // Publisher channel — sets up full topology on connect/reconnect
    this.publishChannel = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(prefetch);
        await this.setupTopology(channel, ttl);
        this.logger.log('✅ RabbitMQ publisher channel ready');
      },
    });

    // Consumer channel — separate from publisher
    this.consumeChannel = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(prefetch);
        this.logger.log('✅ RabbitMQ consumer channel ready');
      },
    });

    await this.publishChannel.waitForConnect();
    this.logger.log('✅ RabbitMQ initialized and configured');
  }

  private async setupTopology(channel: ConfirmChannel, ttl: number) {
    // Exchanges
    await channel.assertExchange(EXCHANGES.EVENTS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.DLX,    'topic', { durable: true });

    // Queues + bindings
    for (const queue of QUEUES) {
      await channel.assertQueue(queue.name, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGES.DLX,
          'x-message-ttl': ttl,
        },
      });
      await channel.bindQueue(queue.name, EXCHANGES.EVENTS, queue.routingKey);
    }

    // Dead Letter Queue
    await channel.assertQueue(DLQ_NAME, { durable: true });
    await channel.bindQueue(DLQ_NAME, EXCHANGES.DLX, '#');
  }

  async publish(
    routingKey: string,
    message: Record<string, any>,
    exchange = EXCHANGES.EVENTS,
  ): Promise<void> {
    try {
      await this.publishChannel.publish(exchange, routingKey, message, {
        persistent: true,
        timestamp: Date.now(),
      });
      this.logger.log(`📤 Published to [${exchange}] → [${routingKey}]`);
    } catch (error) {
      this.logger.error(`❌ Publish failed [${routingKey}]: ${error.message}`);
      throw error;
    }
  }

  async consume(
    queue: string,
    callback: (msg: Record<string, any>) => Promise<void>,
  ): Promise<void> {
    await this.consumeChannel.addSetup(async (channel: ConfirmChannel) => {
      await channel.consume(queue, async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          channel.ack(msg);
          this.logger.log(`📨 Consumed from [${queue}]`);
        } catch (error) {
          this.logger.error(`❌ Consume error [${queue}]: ${error.message}`);
          channel.nack(msg, false, false); // → DLQ
        }
      });
      this.logger.log(`🎯 Consumer registered on [${queue}]`);
    });
  }

  isConnected(): boolean {
    return this.connection?.isConnected() ?? false;
  }

  healthCheck() {
    return {
      rabbitmq:  this.isConnected(),
      timestamp: new Date().toISOString(),
    };
  }

  private async gracefulShutdown() {
    this.logger.log('🛑 Closing RabbitMQ connections...');
    try {
      await this.publishChannel?.close();
      this.logger.log('✅ Publisher channel closed');

      await this.consumeChannel?.close();
      this.logger.log('✅ Consumer channel closed');

      await this.connection?.close();
      this.logger.log('✅ RabbitMQ connection closed');
    } catch (error) {
      this.logger.error(`❌ Shutdown error: ${error.message}`);
    }
  }
}
```

#### 4.2 Queue Module

**File:** `src/infrastructure/queue/queue.module.ts`

Simple module with just the QueueService provider:
```typescript
import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';

@Module({
  providers: [QueueService],
  exports:   [QueueService],
})
export class QueueModule {}
```

### 6. Exchange and Queue Setup

Based on Fastify implementation, we'll set up:

**Exchanges:**
- `events` (topic) - Main exchange for event routing
- `dlx` (topic) - Dead letter exchange

**Queues:**
- `user.events` - User-related events (routing: `user.*`)
- `service.events` - Service-related events (routing: `service.*`)
- `notification.events` - Notification events (routing: `notification.*`)
- `service:notification.message` - Service notification messages (routing: `service:notification.*`)
- `dlq` - Dead letter queue (routing: `#`)

**Queue Arguments:**
- `x-dead-letter-exchange`: `dlx`
- `x-message-ttl`: `3600000` (1 hour)

### 7. Mail Service Migration

**Current (BullMQ):**
```typescript
// src/infrastructure/mail/mail.service.ts
@InjectQueue('mail')
private mailQueue: Queue;

async sendEmail(to, subject, body, isHtml, useQueue = true) {
  if (useQueue) {
    await this.mailQueue.add('send-email', { to, subject, body, isHtml });
  } else {
    // Send directly
  }
}
```

**New (RabbitMQ):**
```typescript
// src/infrastructure/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { QueueService, ROUTING_KEYS } from '../queue/queue.service';

@Injectable()
export class MailService {
  constructor(private readonly queueService: QueueService) {}

  async sendEmail(to: string, subject: string, body: string, isHtml: boolean, useQueue = true) {
    if (useQueue) {
      await this.queueService.publish(
        ROUTING_KEYS.NOTIFICATION_SEND,
        { to, subject, body, isHtml }
      );
    } else {
      // Send directly via transport layer
    }
  }
}
```

### 8. Mail Processor Conversion

**Current (BullMQ):**
```typescript
// src/infrastructure/mail/mail.processor.ts
@Processor('mail')
export class MailProcessor extends WorkerHost {
  async process(job: Job) {
    // Process job
  }
}
```

**New (RabbitMQ):**
```typescript
// src/infrastructure/mail/mail.consumer.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { MailService } from './mail.service';

@Injectable()
export class MailConsumer implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit() {
    // Explicitly register the handler on startup
    await this.queueService.consume('notification.events', async (message) => {
      await this.handleEmailMessage(message);
    });
  }

  private async handleEmailMessage(message: any) {
    const { to, subject, body, isHtml } = message;
    await this.mailService.sendEmail(to, subject, body, isHtml, false);
  }
}
```

### 9. Health Check Integration

**File:** `src/modules/health/application/health.service.ts`

**Add RabbitMQ health indicator:**
```typescript
async checkRabbitMQ() {
  const status = await this.rabbitmqService.healthCheck();
  return {
    status: status.rabbitmq ? 'up' : 'down',
    info: { timestamp: status.timestamp }
  };
}
```

### 10. Graceful Shutdown

**File:** `src/main.ts`

**Add shutdown hook:**
```typescript
app.enableShutdownHooks();

// On shutdown
await app.get(QueueModule).close();
```

## Migration Steps Summary

### Step 1: Install Dependencies
```bash
npm uninstall @nestjs/bullmq bullmq
npm install amqplib @types/amqplib
```

### Step 2: Update Environment Variables
Add RabbitMQ configuration to `.env` and update `env.validation.ts`

### Step 3: Create Queue Service
- Create `queue.service.ts` with all RabbitMQ logic
- Create `queue.module.ts` with simple provider/export

### Step 4: Update Queue Module
- Replace BullModule with QueueService
- Module is now simple (just provider/export)

### Step 5: Migrate Mail Service
- Replace `@InjectQueue` with `RabbitMQPublisherService`
- Update `sendEmail` method

### Step 6: Create Mail Consumer
- Remove `mail.processor.ts`
- Create `mail.consumer.ts` that calls `queueService.consume()`
- Register consumer in MailModule

### Step 7: Update Health Checks
- Add RabbitMQ health indicator
- Update health endpoint

### Step 8: Update Main.ts
- Graceful shutdown is handled by QueueService's OnModuleDestroy hook
- No changes needed to main.ts

### Step 9: Cleanup
- Remove unused BullMQ imports
- Remove Redis queue configuration (if not used for cache)
- Update documentation

### Step 10: Testing
- Test message publishing
- Test message consumption
- Test error handling
- Test DLQ routing
- Test reconnection

## Key Differences to Note

### 1. Job vs Message
- **BullMQ**: Jobs with IDs, retry counts, priorities
- **RabbitMQ**: Messages with routing keys, no built-in retry (must implement manually)

### 2. Retry Logic
- **BullMQ**: Built-in retry with exponential backoff
- **RabbitMQ**: Must implement retry in consumer or use DLQ + requeue

### 3. Delayed Jobs
- **BullMQ**: Built-in delayed jobs
- **RabbitMQ**: Use message TTL or delayed exchange plugin

### 4. Priority
- **BullMQ**: Built-in priority queues
- **RabbitMQ**: Use priority queues with queue arguments

### 5. Monitoring
- **BullMQ**: Built-in UI (Bull Board)
- **RabbitMQ**: Use RabbitMQ Management Plugin

## Testing Strategy

### Unit Tests
- Test RabbitMQService connection management
- Test publisher service message serialization
- Test consumer service message handling
- Test error handling

### Integration Tests
- Test end-to-end message flow
- Test DLQ routing
- Test reconnection logic
- Test concurrent consumers

### Manual Testing
1. Start RabbitMQ: `docker-compose up -d rabbitmq`
2. Start application
3. Publish test message
4. Verify message consumption
5. Simulate connection failure
6. Verify reconnection
7. Verify DLQ on error

## Docker Configuration

**Add to `docker-compose.yml`:**
```yaml
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"
    - "15672:15672"
  environment:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5

volumes:
  rabbitmq_data:
```

## Rollback Plan

If migration fails:
1. Revert to previous commit
2. Restore BullMQ dependencies
3. Restore Redis configuration
4. Restart application

## Post-Migration Tasks

1. **Monitor**: Set up RabbitMQ monitoring
2. **Metrics**: Add message metrics (published, consumed, failed)
3. **Alerts**: Set up alerts for DLQ growth
4. **Documentation**: Update API documentation
5. **Team Training**: Train team on RabbitMQ patterns

## References

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [amqplib Documentation](https://amqp-node.github.io/amqplib/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/rabbitmq)
- [Fastify Implementation](queue.config.js - reference implementation)

---

**Next Steps:**
1. Review this migration plan
2. Approve or request changes
3. Say "proceed" to begin implementation
