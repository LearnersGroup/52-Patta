const mongoose = require('mongoose');
const logger = require('./logger');
require('dotenv').config()

const connectDB = async () => {
    try {
        const dbName = process.env.MONGO_DB_NAME;
        const username = process.env.MONGO_USERNAME;
        const password = process.env.MONGO_PASSWORD;
        const encodedHost = process.env.MONGO_HOST;
        const host = decodeURIComponent(encodedHost);

        await mongoose.connect(host, {
            dbName: dbName,
            user: username,
            pass: password,
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        logger.info('MongoDB connected');
    } catch (error) {
        logger.error('MongoDB connection failed', { error: error.message });
        process.exit(1);
    }
}

module.exports = connectDB;
