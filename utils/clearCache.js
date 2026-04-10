import redisClient from "../config/redis.js";
import logger from "./logger.js";

/**
 * Invalidate Redis cache for a model collection.
 *
 * @param {string} collectionName  - The Mongoose collection name (e.g. "products")
 * @param {string|null} documentId - Optional: also delete the single-document cache key
 *
 * Strategy: delete all list/query keys for this collection (they are all stale after
 * any write), plus the specific document key if an ID is provided.
 */
const invalidateCache = async (collectionName, documentId = null) => {
    try {
        const patterns = [`${collectionName}:*`];

        // Also clear the specific document cache if we know its ID
        if (documentId) {
            patterns.push(`${collectionName}:${documentId}`);
        }

        for (const pattern of patterns) {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Cache cleared: ${keys.length} key(s) matching "${pattern}"`);
            }
        }
    } catch (err) {
        // Cache invalidation failure should never crash the app
        logger.warn(`Cache invalidation failed for "${collectionName}": ${err.message}`);
    }
};

export default invalidateCache;
