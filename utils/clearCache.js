const redisClient = require("../config/redis");

const invalidateCache = async (pattern) => {

    const keys = await redisClient.keys(`${collectionName}:*`);

    if (keys.length > 0) {
        await redisClient.del(keys);
    }

};

module.exports = invalidateCache;