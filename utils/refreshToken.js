const { verifyToken, generateToken } = require('./jwtToken');
const redisClient = require('../config/redis');

const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body;

    try {
        if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

        // Validate refresh token
        const decoded = verifyToken(refreshToken);

        // Check Redis for the refresh token
        const storedToken = await redisClient.get(`refreshToken:${decoded.username}`);

        if (!storedToken || storedToken !== refreshToken) {
            // Refresh token not found or mismatch
            return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        // Generate a new access token
        const accessToken = generateToken({ id: decoded.id, email: decoded.email, username: decoded.username }, '15m');

        return res.status(200).json({ data: accessToken });
    } catch (err) {
        console.error(err);
        res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
};

module.exports = refreshAccessToken;