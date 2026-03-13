const { createClient } = require("redis");
const logger = require("../utils/logger");

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("connect", () => {
    logger.info("✅ Redis connected");
});

redisClient.on("reconnecting", () => {
    logger.warn("Redis reconnecting...");
});

redisClient.on("error", (err) => {
    logger.error(`❌ Redis error: ${err.message}`);
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        logger.error(`Redis connection failed: ${error.message}`);
    }
};

connectRedis();

module.exports = redisClient;