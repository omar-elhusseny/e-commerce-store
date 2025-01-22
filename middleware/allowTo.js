const asyncWrapper = require("./asyncWrapper");
const AppError = require("../utils/appError");


exports.allowedTo = asyncWrapper(async (req, res, next) => {
    if (req.user.role === 'user') {
        return next(new AppError("Not allowed for users", 401))
    }
    next();
});