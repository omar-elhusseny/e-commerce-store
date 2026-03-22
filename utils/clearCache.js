const redisClient = require("../config/redis");

const invalidateCache = async (collectionName) => {

    const keys = await redisClient.keys(`${collectionName}:*`);

    if (keys.length > 0) {
        await redisClient.del(keys);
    }

};

module.exports = invalidateCache;