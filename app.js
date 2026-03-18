
// Import dependencies
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv").config();
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

// ------------------ API Routes ------------------
const mainRoutes = require("./routes/mainRoutes");

// initialize the application
const app = express();

// ------------------ Connect to the database ------------------
connectDB();


// ------------------ Stripe webhook ------------------
app.post('/api/v1/webhook/stripe', express.raw({ type: "application/json" }), webhook);


// ------------------ Security Middleware ------------------
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
app.use(mongoSanitize());

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
    server.close(_ => {
        logger.error("Server is OFF");
        process.exit(1);
    })
})