const crypto = require('crypto');

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// NOTE: in-memory store only works on a single app instance.
// For multi-instance deployments, move this to shared storage (e.g. Redis).
const store = new Map();

function create(userId) {
    const nonce = crypto.randomUUID();
    store.set(nonce, {
        userId,
        expiresAt: Date.now() + TTL_MS,
    });
    return nonce;
}

function consume(nonce) {
    const entry = store.get(nonce);
    if (!entry) {
        return null;
    }

    store.delete(nonce);

    if (Date.now() > entry.expiresAt) {
        return null;
    }

    return entry.userId;
}

setInterval(() => {
    const now = Date.now();
    for (const [nonce, entry] of store.entries()) {
        if (now > entry.expiresAt) {
            store.delete(nonce);
        }
    }
}, CLEANUP_INTERVAL_MS).unref();

module.exports = {
    create,
    consume,
};
