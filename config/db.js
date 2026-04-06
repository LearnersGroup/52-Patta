const mongoose = require('mongoose');
const logger = require('./logger');
require('dotenv').config()

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_HOST);
        logger.info('MongoDB connected');
    } catch (error) {
        logger.error('MongoDB connection failed', { error: error.message });
        process.exit(1);
    }
}

module.exports = connectDB;
