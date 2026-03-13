const crypto = require("crypto");
const redisClient = require("../config/redis");
const { verifyToken } = require("./jwtToken");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const addToBlackList = async (token) => {
    if (typeof token !== "string" || !token.trim()) {
        throw new Error("Invalid token");
    }

    let decoded;

    try {
        decoded = verifyToken(token);
    } catch {
        throw new Error("Invalid JWT token");
    }

    if (!decoded.exp) {
        throw new Error("Token missing expiration");
    }

    const expiryDuration = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiryDuration <= 0) return;

    const key = `blacklist:${hashToken(token)}`;

    await redisClient.set(key, "1", { EX: expiryDuration });
};

const isBlackListed = async (token) => {
    if (!token || typeof token !== "string") return false;
    const key = `blacklist:${hashToken(token)}`;
    const result = await redisClient.get(key);
    return result === "1";
};

module.exports = { addToBlackList, isBlackListed };