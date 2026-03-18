const { verifyToken, generateToken } = require('./jwtToken');
const redisClient = require('../config/redis');
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require('./appError');

const refreshAccessToken = asyncWrapper(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new AppError("Refresh token required", 401));
    
    // Validate refresh token
    const decoded = verifyToken(refreshToken);
    
    // Check Redis for the refresh token
    const storedToken = await redisClient.get(`refreshToken:${decoded.id}`);
    
    if (!storedToken || storedToken !== refreshToken) {
        // Refresh token not found or mismatch
        return next(new AppError("Invalid or expired refresh token", 403));
    }

    // Generate a new access token
    const accessToken = generateToken({ id: decoded.id, email: decoded.email, username: decoded.username }, '15m');

    return res.status(200).json({ data: accessToken });
});

module.exports = refreshAccessToken;