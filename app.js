// Import dependencies
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const dotenv = require("dotenv").config();
const path = require("path");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");

// Import local files 
const connectDB = require("./config/database");
const AppError = require("./utils/appError");
const errorHandler = require("./middleware/errorHandling");
const { webhook } = require("./controllers/webhooks");
const logger = require("./utils/logger");
const validateEnv = require("./config/env");

// ------------------ API Routes ------------------
const mainRoutes = require("./routes/mainRoutes");

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
app.use(mongoSanitize());
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

// Start the server
const server = app.listen(process.env.PORT || 3000, () => { logger.info(`Server is ON — port ${process.env.PORT || 3000}`) });

// any error catched outside express error-middleware
process.on("unhandledRejection", (error) => {
    logger.error(`unhandledRejection Error: ${error.name} | ${error.message}`);
    server.close(_ => {
        logger.error("Server is OFF");
        process.exit(1);
    })
})