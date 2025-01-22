
const errorHandler = (error, req, res, next) => {
    error.statusCode = error.statusCode || 500;
    error.status = error.status || "error";
    if (process.env.NODE_ENV === "development") {
        errorInDevelopment(error, res);
    } else {
        errorInProduction(error, res);
    }
}

// Error details should send during development phase
const errorInDevelopment = (error, res) => {
    return res.status(error.statusCode).json({
        error,
        message: error.message,
        status: error.status,
        stack: error.stack
    });
}

// Error details should send during production phase
const errorInProduction = (error, res) => {
    return res.status(error.statusCode).json({
        message: error.message,
        status: error.status,
    });
}

module.exports = errorHandler;