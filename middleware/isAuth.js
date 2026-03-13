const { verifyToken } = require("../utils/jwtToken");
const { isBlackListed } = require("../utils/handleTokens"); // Import the blacklist utility
const User = require("../models/user.model");
const AppError = require("../utils/appError");
const asyncWrapper = require("../middleware/asyncWrapper");

const auth = asyncWrapper(async (req, res, next) => {
    let token;
    // Retrieve the authorization header (case-insensitive)
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }

    if (!token) {
        return next(new AppError("You are not login, Please login to get access this route", 401));
    }

    // Check if the token is blacklisted
    const blacklisted = await isBlackListed(token);
    if (blacklisted) {
        return next(new AppError("Invalid login. Please log in again.", 401));
    }

    // Verify the token
    const decoded = verifyToken(token);

    const user = await User.findOne({ _id: decoded.id }).select('-password -__v');
    if (!user) return next(new AppError("User with this token not found", 404));

    // Attach the decoded user information and token to the request object
    req.token = token;
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
});

module.exports = auth;
