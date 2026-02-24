/**
 * Structured logger for JSON log output.
 *
 * In production, outputs JSON lines that CloudWatch / ELK can parse directly.
 * In development, outputs human-readable format.
 *
 * Usage:
 *   const logger = require('./config/logger');
 *   logger.info('Server started', { port: 4000 });
 *   logger.error('DB connection failed', { host: '...' });
 */

const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

function formatLog(level, message, meta = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        environment: process.env.NODE_ENV || 'development',
        ...meta,
    };

    if (isProduction) {
        // JSON lines format — one JSON object per line, parseable by CloudWatch / ELK
        return JSON.stringify(entry);
    }

    // Human-readable for local dev
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${entry.timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

const logger = {
    info(message, meta) {
        console.log(formatLog('info', message, meta));
    },
    warn(message, meta) {
        console.warn(formatLog('warn', message, meta));
    },
    error(message, meta) {
        console.error(formatLog('error', message, meta));
    },
    debug(message, meta) {
        if (!isProduction) {
            console.debug(formatLog('debug', message, meta));
        }
    },
};

module.exports = logger;
