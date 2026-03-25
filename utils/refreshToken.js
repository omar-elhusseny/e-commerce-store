const { verifyToken, generateToken } = require('./jwtToken');
const { addToBlackList } = require('./handleTokens');
const redisClient = require('../config/redis');
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require('./appError');

const refreshAccessToken = asyncWrapper(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new AppError("Refresh token required", 401));

    // 1️⃣ Verify the token is structurally valid and not expired
    let decoded;
    try {
        decoded = verifyToken(refreshToken);
    } catch (err) {
        return next(new AppError("Invalid or expired refresh token", 401));
    }

    // 2️⃣ Check Redis — token must match what we stored (detects reuse of old tokens)
    const storedToken = await redisClient.get(`refreshToken:${decoded.id}`);

    if (!storedToken) {
        // No token stored at all — possible reuse attack, wipe the session
        return next(new AppError("Session expired. Please log in again.", 401));
    }

    if (storedToken !== refreshToken) {
        // Token mismatch — someone presented an old refresh token.
        // This is a reuse attack: invalidate the entire session immediately.
        await redisClient.del(`refreshToken:${decoded.id}`);
        return next(new AppError("Refresh token reuse detected. Please log in again.", 401));
    }

    // 3️⃣ Rotate: issue a brand new refresh token and invalidate the old one
    const payload = { id: decoded.id, email: decoded.email, username: decoded.username };

    const newRefreshToken = generateToken(payload, "7d");
    const newAccessToken = generateToken(payload, "1h");

    // Blacklist the old refresh token for the remainder of its lifetime
    try {
        await addToBlackList(refreshToken);
    } catch (_) { /* expired tokens can't be blacklisted — that's fine */ }

    // Store the new refresh token
    await redisClient.set(`refreshToken:${decoded.id}`, newRefreshToken, { EX: 7 * 24 * 60 * 60 });

    return res.status(200).json({
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        }
    });
});

module.exports = refreshAccessToken;
