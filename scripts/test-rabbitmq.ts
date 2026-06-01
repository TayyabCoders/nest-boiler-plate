/**
 * RabbitMQ Test Script
 *
 * This script tests the RabbitMQ connection and message flow.
 * Run with: npx ts-node scripts/test-rabbitmq.ts
 */

import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

async function testRabbitMQ() {
  console.log('🧪 Starting RabbitMQ Test...\n');

  const connection = amqp.connect([RABBITMQ_URL]);

  connection.on('connect', () => {
    console.log('✅ Connected to RabbitMQ');
  });

  connection.on('disconnect', ({ err }) => {
    console.error('❌ Disconnected from RabbitMQ:', err?.message);
  });

  try {
    // Create a test channel
    const channel = connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(1);
        console.log('✅ Channel created and prefetch set');
      },
    });

    await channel.waitForConnect();
    console.log('✅ Channel is ready\n');

    // Test 1: Declare test exchange and queue
    console.log('📝 Test 1: Declaring test exchange and queue...');
    await channel.addSetup(async (ch: ConfirmChannel) => {
      await ch.assertExchange('test-exchange', 'topic', { durable: false });
      await ch.assertQueue('test-queue', { durable: false });
      await ch.bindQueue('test-queue', 'test-exchange', 'test.key');
      console.log('✅ Test exchange and queue declared\n');
    });

    // Test 2: Publish a test message
    console.log('📤 Test 2: Publishing test message...');
    const testMessage = {
      id: Date.now(),
      message: 'Hello from RabbitMQ test!',
      timestamp: new Date().toISOString(),
    };

    await channel.publish('test-exchange', 'test.key', testMessage, {
      persistent: false,
      timestamp: Date.now(),
    });
    console.log('✅ Message published:', testMessage, '\n');

    // Test 3: Consume the test message
    console.log('📨 Test 3: Consuming test message...');
    let messageReceived = false;

    await channel.addSetup(async (ch: ConfirmChannel) => {
      await ch.consume('test-queue', async (msg: ConsumeMessage | null) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          console.log('✅ Message received:', content);
          ch.ack(msg);
          messageReceived = true;

          // Cleanup
          await ch.deleteQueue('test-queue');
          await ch.deleteExchange('test-exchange');
          console.log('✅ Test queue and exchange cleaned up\n');
        }
      });
    });

    // Wait for message to be consumed
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (messageReceived) {
      console.log('✅ All tests passed!\n');
    } else {
      console.log('⚠️  Message not received within timeout\n');
    }

    // Close connection
    await channel.close();
    await connection.close();
    console.log('✅ Connection closed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRabbitMQ().catch(console.error);
