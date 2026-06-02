import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { ILogger } from '@core/domain/logger.interface';

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
  private connection!:      AmqpConnectionManager;
  private publishChannel!:  ChannelWrapper;
  private consumeChannel!: ChannelWrapper;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: ILogger,
  ) {}

  async onModuleInit()   { await this.initialize(); }
  async onModuleDestroy(){ await this.gracefulShutdown(); }

  private async initialize() {
    const url      = this.config.get<string>('RABBITMQ_URL', 'amqp://localhost');
    const prefetch = this.config.get<number>('RABBITMQ_PREFETCH', 1);
    const ttl      = this.config.get<number>('RABBITMQ_MESSAGE_TTL', 3600000);

    this.connection = connect([url]);

    this.connection.on('connect',    ()      => this.logger.log('QueueService', '✅ RabbitMQ connected'));
    this.connection.on('disconnect', ({err}: {err?: Error}) => this.logger.warn('QueueService', `⚠️ RabbitMQ disconnected: ${err?.message}`));

    // Publisher channel — sets up full topology on connect/reconnect
    this.publishChannel = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(prefetch);
        await this.setupTopology(channel, ttl);
        this.logger.log('QueueService', '✅ RabbitMQ publisher channel ready');
      },
    });

    // Consumer channel — separate from publisher
    this.consumeChannel = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(prefetch);
        this.logger.log('QueueService', '✅ RabbitMQ consumer channel ready');
      },
    });

    await this.publishChannel.waitForConnect();
    this.logger.log('QueueService', '✅ RabbitMQ initialized and configured');
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
      this.logger.log('QueueService', `📤 Published to [${exchange}] → [${routingKey}]`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('QueueService', `❌ Publish failed [${routingKey}]: ${errorMessage}`);
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
          this.logger.log('QueueService', `📨 Consumed from [${queue}]`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('QueueService', `❌ Consume error [${queue}]: ${errorMessage}`);
          channel.nack(msg, false, false); // → DLQ
        }
      });
      this.logger.log('QueueService', `🎯 Consumer registered on [${queue}]`);
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
    this.logger.log('QueueService', '🛑 Closing RabbitMQ connections...');
    try {
      await this.publishChannel?.close();
      this.logger.log('QueueService', '✅ Publisher channel closed');

      await this.consumeChannel?.close();
      this.logger.log('QueueService', '✅ Consumer channel closed');

      await this.connection?.close();
      this.logger.log('QueueService', '✅ RabbitMQ connection closed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('QueueService', `❌ Shutdown error: ${errorMessage}`);
    }
  }
}
