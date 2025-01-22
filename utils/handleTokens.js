const redisClient = require("../config/redis"); // Import Redis client
const { verifyToken } = require("./jwtToken");

// Add token to the blacklist
const addToBlackList = async (token) => {
    try {
        // Validate token type
        if (typeof token !== "string" || !token.trim()) {
            throw new Error("Invalid token: Token must be a non-empty string");
        }

        // Decode the token to get the expiration time
        const decoded = verifyToken(token);
        if (!decoded || !decoded.exp) {
            throw new Error("Invalid token: missing expiration");
        }

        // Calculate the expiration time in seconds
        const expiryDuration = decoded.exp - Math.floor(Date.now() / 1000);
        console.log("Token to blacklist:", token);
        console.log("Expiry duration in seconds:", expiryDuration);

        if (expiryDuration > 0) {
            // Ensure value stored in Redis is a string
            await redisClient.set(`blacklist:${token}`, "true", { EX: expiryDuration });
            console.log(`Token ${token} added to blacklist for ${expiryDuration} seconds.`);
        } else {
            console.log(`Token ${token} is already expired and was not added to the blacklist.`);
        }
    } catch (error) {
        console.error("Error adding token to blacklist:", error);
    }
};

// Check if a token is blacklisted
const isBlackListed = async (token) => {
    try {
        const result = await redisClient.get(`blacklist:${token}`);
        return !!result; // Return true if the token is in the blacklist
    } catch (error) {
        console.error("Error checking token blacklist status:", error);
        return false;
    }
};

module.exports = { addToBlackList, isBlackListed };





// const blackList = new Set();
// const addToBlackList = (token) => {
//     blackList.add(token);

//     // Decode the token to get the expiration time
//     const decoded = verifyToken(token);
//     if (!decoded || !decoded.exp) {
//         throw new Error('Invalid token: missing expiration');
//     }

//     // Calculate the expiration time in milliseconds
//     const expiryDuration = (decoded.exp * 1000) - Date.now();
//     console.log("black list", blackList);

//     if (expiryDuration > 0) {
//         // Schedule token removal after expiration time
//         setTimeout(() => {
//             blackList.delete(token);
//             console.log(`Token ${token} removed from blacklist after expiration`);
//         }, expiryDuration);
//     } else {
//         // If the token has already expired, remove it immediately
//         blackList.delete(token);
//         console.log(`Token ${token} is already expired and was not added to the blacklist`);
//     }
// };

// const isBlackListed = (token) => {
//     return blackList.has(token);
// }