const JWT = require("jsonwebtoken");

const generateToken = (payload, expiration) => {
    return JWT.sign(payload, process.env.JWT_SECRET, {
        expiresIn: expiration || "10m",
    })
}

const verifyToken = (token) => {
    return JWT.verify(token, process.env.JWT_SECRET);
}

module.exports = { generateToken, verifyToken };