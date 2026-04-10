// Import dependencies
import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import "dotenv/config";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import compression from "compression";

// Import local files 
import connectDB from "./config/database.js";
import AppError from "./utils/appError.js";
import errorHandler from "./middleware/errorHandling.js";
import { webhook } from "./controllers/webhooks.js";
import logger from "./utils/logger.js";
import validateEnv from "./config/env.js";

// ------------------ API Routes ------------------
import mainRoutes from "./routes/mainRoutes.js";

// initialize the application
const app = express();

// Validate env vars first — exits if anything critical is missing
validateEnv();

// ------------------ Connect to the database ------------------
connectDB();

// ------------------ Stripe webhook ------------------
app.post('/api/v1/webhook/stripe', express.raw({ type: "application/json" }), webhook);

// ------------------ Health check ------------------
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// ------------------ Security Middleware ------------------
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            connectSrc: ["'self'"],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
app.use(hpp({
    // Whitelist params that legitimately appear multiple times (e.g. ?color=red&color=blue)
    whitelist: ['colors', 'subcategory', 'fields', 'sort'],
}));

// ------------------ Rate limiting ------------------
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
    skip: (req) => req.ip === '127.0.0.1'
})
app.use(limiter);


// ------------------ General Middlewares ------------------
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// App main routes
mainRoutes(app);

// Unrecognized route
app.all("*", (req, res, next) => {
    next(new AppError("Unrecognized url", 404));
})

// Global error handling middleware
app.use(errorHandler)

let server;
if (process.env.NODE_ENV !== "test") {
    server = app.listen(process.env.PORT || 3000, () => { logger.info(`Server is ON — port ${process.env.PORT || 3000}`) });
}

process.on("unhandledRejection", (error) => {
    logger.error(`unhandledRejection Error: ${error.name} | ${error.message}`);
    if (server) {
        server.close(_ => {
            logger.error("Server is OFF");
            process.exit(1);
        });
    }
});

export default app;