import { verifyToken } from "../utils/jwtToken.js";
import { isBlackListed } from "../utils/handleTokens.js"; // Import the blacklist utility
import prisma from "../config/prisma.js";
import AppError from "../utils/appError.js";
import asyncWrapper from "../middleware/asyncWrapper.js";

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
    let decoded;
    try {
        decoded = verifyToken(token);
    } catch (err) {
        return next(new AppError("Invalid or expired token. Please log in again.", 401));
    }

    const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            isEmailVerified: true,
        },
    });
    if (!user) return next(new AppError("User with this token not found", 404));

    // Attach the decoded user information and token to the request object
    req.token = token;
    req.user = { ...user, _id: user.id };

    // Proceed to the next middleware or route handler
    next();
});

export default auth;
