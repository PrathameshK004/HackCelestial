const { getKafkaClient } = require('./kafkaClient.util');
const crypto = require('crypto');

let producer = null;
let isConnected = false;
let isConnecting = false;

const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'notification-events';

/**
 * Initialize Kafka Producer connection
 */
async function initKafkaProducer() {
  if (isConnected && producer) return producer;
  if (isConnecting) return null;

  const { kafka, isConfigured } = getKafkaClient();
  if (!kafka || !isConfigured) {
    return null;
  }

  isConnecting = true;
  try {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    await producer.connect();
    isConnected = true;
    console.log('[Kafka Producer] Connected to Kafka Cluster successfully.');
    return producer;
  } catch (err) {
    console.warn('[Kafka Producer] Failed to connect to Kafka cluster:', err.message);
    producer = null;
    isConnected = false;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Publish an Event-Driven Notification to Kafka Topic
 * @param {string} eventType - e.g. GROUP_INVITE, PAYMENT_CONFIRMED, MEMBER_JOINED, TRIP_UPDATE, SYSTEM_ALERT
 * @param {object} payload - Event data payload
 */
async function publishNotificationEvent(eventType, payload = {}) {
  const eventId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const eventMessage = {
    eventId,
    eventType,
    timestamp,
    payload,
  };

  try {
    const prod = await initKafkaProducer();
    if (prod && isConnected) {
      await prod.send({
        topic: KAFKA_TOPIC,
        messages: [
          {
            key: payload.userId || payload.groupId || eventType,
            value: JSON.stringify(eventMessage),
            headers: {
              eventType,
              timestamp,
            },
          },
        ],
      });
      console.log(`[Kafka Producer] Event published [${eventType}] (ID: ${eventId}) to topic '${KAFKA_TOPIC}'`);
      return { success: true, eventId, mode: 'KAFKA' };
    }
  } catch (err) {
    console.warn(`[Kafka Producer] Publishing failed for event ${eventType}:`, err.message);
  }

  // Fallback: Dispatch directly via Notification Handler if Kafka is offline/unconfigured
  console.log(`[Kafka Fallback] Processing event [${eventType}] via Direct Async Pipeline`);
  const { processNotificationEvent } = require('./kafkaConsumer.util');
  setImmediate(() => {
    processNotificationEvent(eventMessage).catch((e) => {
      console.error(`[Kafka Fallback] Direct processing error for ${eventType}:`, e.message);
    });
  });

  return { success: true, eventId, mode: 'DIRECT_FALLBACK' };
}

/**
 * Disconnect Kafka Producer
 */
async function disconnectKafkaProducer() {
  if (producer && isConnected) {
    try {
      await producer.disconnect();
      isConnected = false;
      console.log('[Kafka Producer] Disconnected cleanly.');
    } catch (err) {
      console.error('[Kafka Producer] Disconnect error:', err.message);
    }
  }
}

module.exports = {
  initKafkaProducer,
  publishNotificationEvent,
  disconnectKafkaProducer,
};
