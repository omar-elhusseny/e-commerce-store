import prisma from "./prisma.js";
import logger from "../utils/logger.js";

const connectDB = async () => {
    try {
        logger.info("Connecting to PostgreSQL via Prisma...");
        await prisma.$connect();
        logger.info("PostgreSQL connected");
    } catch (error) {
        logger.error(`PostgreSQL connection error: ${error.message}`);
        process.exit(1);
    }
};

process.on("SIGINT", async () => {
    await prisma.$disconnect();
    logger.info("Prisma connection closed");
    process.exit(0);
});

export default connectDB;