/**
 * Validates required environment variables at startup.
 * Exits the process immediately if any are missing —
 * better to fail fast than to run with broken config.
 */
const logger = require('../utils/logger');

const REQUIRED_VARS = [
    'MONGO_URI',
    'JWT_SECRET',
    'REDIS_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
    'FRONTEND_URL',
];

const validateEnv = () => {
    const missing = REQUIRED_VARS.filter(key => !process.env[key]);

    if (missing.length > 0) {
        missing.forEach(key => logger.error(`Missing required environment variable: ${key}`));
        logger.error('Server startup aborted due to missing environment variables.');
        process.exit(1);
    }

    logger.info('Environment variables validated successfully.');
};

module.exports = validateEnv;
