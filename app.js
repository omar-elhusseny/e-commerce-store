
// Import dependencies
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const path = require("path");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Routes
const mainRoutes = require("./routes/mainRoutes");

// Import local files 
const connectDB = require("./config/database");
const AppError = require("./utils/appError");
const errorHandler = require("./middleware/errorHandling");
const { webhook } = require("./controllers/webhooks");

// rate limiter
const limiter = rateLimit({ windowMS: 15 * 60 * 1000, max: 100, skip: (req) => req.ip === '127.0.0.1' })

// Connect to the database
connectDB();

// initialize the application
const app = express();

// Middlewares
app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
    console.log(`Mode: ${process.env.NODE_ENV}`);
}

// webhooks
app.post('/webhook-checkout', express.raw({ type: "application/json" }), webhook);

// App main routes
mainRoutes(app);

// Unrecognized route
app.all("*", (req, res, next) => {
    next(new AppError("Unrecognized url", 404));
})

// Global error handling middleware
app.use(errorHandler)

// Start the server
const server = app.listen(process.env.PORT || 3000, () => { console.log("Server is ON") });

// any error catched outside express error-middleware
process.on("unhandledRejection", (error) => {
    console.log(`unhandledRejection Error: ${error.name} | ${error.message}`);
    console.log(error)
    server.close(_ => {
        console.log("Server is OFF");
        process.exit(1);
    })
})