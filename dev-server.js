/**
 * dev-server.js
 * Development entry-point that boots an in-memory MongoDB instance
 * so the app can run without a real MongoDB installation.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
    // 1. Start an in-memory MongoDB
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // 2. Inject required env vars before any app code reads them
    process.env.JWT_SECRET   = process.env.JWT_SECRET   || 'dev-secret-change-in-prod';
    process.env.MONGO_HOST   = process.env.MONGO_HOST   || mongoUri;
    process.env.MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'patta_dev';

    console.log('[dev-server] MongoMemoryServer started at', mongoUri);

    // 3. Boot the real server (it will call connectDB() and listen)
    require('./server.js');

    // 4. Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n[dev-server] Shutting down...');
        await mongoServer.stop();
        process.exit(0);
    });
}

start().catch((err) => {
    console.error('[dev-server] Startup failed:', err);
    process.exit(1);
});
