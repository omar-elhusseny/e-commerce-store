// To catch errors all at once instead of making multipe 'try/catch' to handle different parts of single request.
// Cleaner Code: Avoids repetitive try-catch blocks in every route handler or middleware.
// Centralized Error Handling: All errors are forwarded to Express's error-handling middleware, 
// making the application more robust and easier to debug.

module.exports = (asyncFunc) => {
    return (req, res, next) => {
        asyncFunc(req, res, next).catch(error => {
            next(error);
        });
    }
}