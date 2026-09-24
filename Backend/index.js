const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const indexRouter = require('./routes/index');
const { initializeDatabase, pool } = require('./utils/db.util');
const { sendError } = require('./utils/response.util');

app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'https://hack-celestial-one.vercel.app',
  'https://triptual-x.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Allow known origins or any local dev server (localhost / 127.0.0.1)
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Fallback permit in development
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Origin', 'Accept', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: true // Allows session cookies & headers
}));

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
const server = http.createServer(app);

// Initialize Socket.io Server
initSocketServer(server);

initializeDatabase()
  .then(() => {
    console.log('PostgreSQL connected and users table is ready');
    server.listen(PORT, async () => {
      console.log(`Server is running on port ${PORT}`);

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
