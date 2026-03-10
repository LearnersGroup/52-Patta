const logger = require('../config/logger');

/**
 * Wraps a socket event handler with:
 * - try/catch error boundary
 * - structured logging on failure
 * - safe callback invocation
 *
 * Usage:
 *   module.exports = wrapHandler('game-play-card', async (socket, io, data, callback) => {
 *       // handler logic (no try/catch needed)
 *   });
 */
function wrapHandler(name, handlerFn) {
    return (socket, io) => async (data, callback) => {
        try {
            await handlerFn(socket, io, data, callback);
        } catch (error) {
            logger.error(`Socket handler error [${name}]`, {
                userId: socket.user?.id,
                error: error.message,
                stack: error.stack,
            });
            if (typeof callback === 'function') {
                callback("An error occurred");
            }
        }
    };
}

module.exports = wrapHandler;
