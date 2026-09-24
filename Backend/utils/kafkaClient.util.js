const { Kafka, logLevel } = require('kafkajs');
const fs = require('fs');
require('dotenv').config();

/**
 * Industrial-Grade Kafka Client Factory for Aiven & AWS/Local Kafka
 */
let kafkaInstance = null;
let isKafkaConfigured = false;

function getKafkaClient() {
  if (kafkaInstance) {
    return { kafka: kafkaInstance, isConfigured: isKafkaConfigured };
  }

  const broker = process.env.KAFKA_BROKER || process.env.KAFKA_HOST;
  const username = process.env.KAFKA_USERNAME || process.env.KAFKA_USER;
  const password = process.env.KAFKA_PASSWORD || process.env.KAFKA_PASS;

  if (!broker) {
    console.warn('[Kafka] No KAFKA_BROKER defined in .env. Operating in Direct Async Fallback mode.');
    return { kafka: null, isConfigured: false };
  }

  const brokers = broker.split(',').map((b) => b.trim());

  const kafkaConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || 'triptual-notification-service',
    brokers,
    logLevel: logLevel.WARN,
    retry: {
      initialRetryTime: 300,
      retries: 5,
    },
  };

  // 1. SASL / SCRAM-SHA-256 Authentication (Default for Aiven)
  if (username && password) {
    kafkaConfig.ssl = {
      rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED === 'true',
    };
    kafkaConfig.sasl = {
      mechanism: (process.env.KAFKA_SASL_MECHANISM || 'scram-sha-256').toLowerCase(),
      username,
      password,
    };
  }
  // 2. SSL Mutual Auth via Certificates (Aiven SSL Option)
  else if (process.env.KAFKA_CA_CERT || process.env.KAFKA_CA_PATH) {
    try {
      const ca = process.env.KAFKA_CA_CERT || fs.readFileSync(process.env.KAFKA_CA_PATH, 'utf-8');
      const key = process.env.KAFKA_ACCESS_KEY || (process.env.KAFKA_KEY_PATH ? fs.readFileSync(process.env.KAFKA_KEY_PATH, 'utf-8') : undefined);
      const cert = process.env.KAFKA_ACCESS_CERT || (process.env.KAFKA_CERT_PATH ? fs.readFileSync(process.env.KAFKA_CERT_PATH, 'utf-8') : undefined);

      kafkaConfig.ssl = {
        rejectUnauthorized: false,
        ca: [ca],
        key,
        cert,
      };
    } catch (err) {
      console.warn('[Kafka] Failed to load SSL certificates:', err.message);
    }
  }
  // 3. SSL without SASL (Plain SSL)
  else if (process.env.KAFKA_USE_SSL === 'true') {
    kafkaConfig.ssl = true;
  }

  try {
    kafkaInstance = new Kafka(kafkaConfig);
    isKafkaConfigured = true;
    console.log(`[Kafka] Initialized KafkaJS client for brokers: ${brokers.join(', ')}`);
  } catch (err) {
    console.error('[Kafka] Initialization error:', err.message);
    kafkaInstance = null;
    isKafkaConfigured = false;
  }

  return { kafka: kafkaInstance, isConfigured: isKafkaConfigured };
}

module.exports = {
  getKafkaClient,
};
