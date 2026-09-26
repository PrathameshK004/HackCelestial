const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { corsOrigin } = require('./utils/cors.util');
const indexRouter = require('./routes/index');
const requestIdMiddleware = require('./middleware/requestId.middleware');
const { rateLimit } = require('./middleware/rateLimit.middleware');
const { initializeDatabase, pool } = require('./utils/db.util');
const { sendError } = require('./utils/response.util');

// CORS Configuration
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Origin', 'Accept', 'Authorization', 'Idempotency-Key'],
  exposedHeaders: ['Authorization'],
  credentials: true // Allows session cookies & headers
}));

app.use(bodyParser.json({ limit: '20mb' }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false, limit: '20mb' }));
app.use(requestIdMiddleware);
app.use('/api/dine', rateLimit({ windowMs: 60000, maxRequests: 60 }));

const healthController = require('./controllers/health.controller');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', healthController.checkHealth);

// Serve static assets (illustrations, uploads, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/illustrations', express.static(path.join(__dirname, 'public', 'illustrations')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', indexRouter);

app.use('/api', (req, res) => {
  return sendError(res, 'Route not found', null, 404);
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  const message = statusCode === 400 ? 'Invalid request body' : (error.message || 'Internal server error');
  return sendError(res, message, error, statusCode);
});

const http = require('http');
const { initSocketServer } = require('./utils/socket.util');
const { initKafkaProducer, disconnectKafkaProducer } = require('./utils/kafkaProducer.util');
const { startKafkaConsumer, stopKafkaConsumer } = require('./utils/kafkaConsumer.util');

// Start Server
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);

// Initialize Socket.io Server
initSocketServer(server);

initializeDatabase()
  .then(() => {
    console.log('PostgreSQL connected and users table is ready');
    server.listen(PORT, HOST, async () => {
      console.log(`Server is running on http://${HOST}:${PORT}`);

      // Asynchronously initialize Kafka Event-Driven Notification Services
      initKafkaProducer().catch((e) => console.warn('[Kafka] Producer startup note:', e.message));
      startKafkaConsumer().catch((e) => console.warn('[Kafka] Consumer startup note:', e.message));
    });
  })
  .catch((error) => {
    console.error('PostgreSQL initialization error:', error.message);
    process.exit(1);
  });

let isShuttingDown = false;
const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  if (server) {
    server.close();
  }

  await disconnectKafkaProducer();
  await stopKafkaConsumer();
  await pool.end();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
