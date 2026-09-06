const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');

/**
 * Production-Grade Health Check API
 * Performs deep check: Server Uptime, Memory, Environment, and Database Pool Latency
 */
async function checkHealth(req, res) {
    const startTime = Date.now();
    let dbStatus = 'DOWN';
    let dbLatencyMs = null;
    let dbError = null;

    try {
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        dbLatencyMs = Date.now() - dbStart;
        dbStatus = 'UP';
    } catch (err) {
        dbStatus = 'DOWN';
        dbError = err.message;
    }

    const isHealthy = dbStatus === 'UP';
    const statusCode = isHealthy ? 200 : 503;

    const data = {
        status: isHealthy ? 'healthy' : 'degraded',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        services: {
            apiServer: {
                status: 'UP',
                port: process.env.PORT || 4000
            },
            database: {
                status: dbStatus,
                type: 'PostgreSQL (Neon)',
                latencyMs: dbLatencyMs,
                error: dbError
            }
        },
        system: {
            memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
            heapUsedMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
            nodeVersion: process.version
        },
        responseTimeMs: Date.now() - startTime
    };

    if (isHealthy) {
        return sendSuccess(res, 'GroupTrip Ledger API is healthy and operational', data, 200);
    } else {
        return sendError(res, 'GroupTrip Ledger API is degraded - database unreachable', data, 503);
    }
}

module.exports = {
    checkHealth
};
