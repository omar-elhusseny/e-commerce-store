const mongoose = require('mongoose');
const logger = require("../utils/logger");

const connectDB = async () => {
    try {
        logger.info("Connecting to MongoDB...");
        const connect = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // stop trying after 5 seconds
        });
        logger.info(`✅ MongoDB Connected: ${connect.connection.host}`);
    } catch (error) {
        logger.error(`❌ MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
});

process.on("SIGINT", async () => {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
    process.exit(0);
});
module.exports = connectDB;