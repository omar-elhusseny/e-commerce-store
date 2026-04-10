import bcrypt from "bcryptjs";
import crypto from 'crypto';
import redisClient from "../config/redis.js";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/jwtToken.js";
import asyncWrapper from "../middleware/asyncWrapper.js";
import AppError from "../utils/appError.js";
import { sendEmail, emailTemplates } from "../utils/email.js";

const login = asyncWrapper(async (req, res, next) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isEmailVerified) return next(new AppError('Please verify your email before logging in', 401));
    if (!user.isActive) return next(new AppError('Your account is deactivated. Please contact support.', 403));

    const userCache = { id: user.id, username: user.username, email: user.email };
    await redisClient.set(`userEmail:${email}`, JSON.stringify(userCache), { EX: 60 * 60 });

    const payload = { id: user.id, username: user.username, email: user.email };
    const refreshToken = generateToken(payload, "7d");
    const accessToken = generateToken(payload, "1h");

    await redisClient.set(`refreshToken:${payload.id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

    return res.status(200).json({
        message: "User logged in successfully",
        data: { id: payload.id, username: user.username, email: user.email, accessToken, refreshToken },
    });
});

const register = asyncWrapper(async (req, res) => {
    const { username, email, password, slug } = req.body;
    const hashedPassword = await bcrypt.hash(password, 15);

    const user = await prisma.user.create({
        data: { username, slug, email, password: hashedPassword },
    });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerificationToken: hashedToken,
            emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
    });

    const verificationURL = `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${verificationToken}`;
    await sendEmail({ to: user.email, ...emailTemplates.verifyEmail(username, verificationURL) });

    const refreshToken = generateToken({ id: user.id, username, email }, "7d");
    const accessToken = generateToken({ id: user.id, username, email }, "1h");
    await redisClient.set(`refreshToken:${user.id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

    const { password: _unused, ...safeUser } = user;
    return res.status(201).json({
        message: "User created successfully",
        data: { ...safeUser, _id: user.id, accessToken, refreshToken },
    });
});

const verifyEmail = asyncWrapper(async (req, res, next) => {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await prisma.user.findFirst({
        where: {
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { gt: new Date() },
        },
    });

    if (!user) return next(new AppError("Token invalid or expired", 400));

    await prisma.user.update({
        where: { id: user.id },
        data: {
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpires: null,
        },
    });

    sendEmail({ to: user.email, subject: "Welcome to a wonderful world of shopping", text: `Hi ${user.username}, welcome to our E-commerce store` });
    res.status(200).json({ message: "Email verified successfully" });
});

const forgetPassword = asyncWrapper(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset code has been sent.' });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = crypto.createHash('sha256').update(resetCode).digest('hex');

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetCode: hashedResetCode,
            passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
            passwordResetVerified: false,
        },
    });

    sendEmail({
        to: user.email,
        subject: "Your password reset code (valid for 10 mins)",
        text: `Hi ${user.username},\nWe received a request to reset your password.\nYour reset code: ${resetCode}\nThis code is valid for 10 minutes.`,
    }).catch(console.error);

    return res.status(200).json({ message: 'If that email exists, a reset code has been sent.' });
});

const verifyResetCode = asyncWrapper(async (req, res, next) => {
    const hashedResetCode = crypto.createHash('sha256').update(req.body.resetCode).digest('hex');
    const user = await prisma.user.findFirst({
        where: {
            passwordResetCode: hashedResetCode,
            passwordResetExpires: { gt: new Date() },
        },
    });

    if (!user) return next(new AppError('Reset code invalid or expired', 400));
    await prisma.user.update({ where: { id: user.id }, data: { passwordResetVerified: true } });
    return res.status(200).json({ status: "Success" });
});

const resetPassword = asyncWrapper(async (req, res, next) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) return next(new AppError(`There is no user with email ${req.body.email}`, 404));
    if (!user.passwordResetVerified) return next(new AppError('Reset code not verified', 400));

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 15);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            passwordResetCode: null,
            passwordResetExpires: null,
            passwordResetVerified: null,
        },
    });

    return res.status(201).json({ message: "password changed successfuly" });
});

const reactivateAccount = asyncWrapper(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return next(new AppError('Invalid credentials', 401));

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return next(new AppError('Invalid credentials', 401));
    if (user.isActive) return next(new AppError('Account is already active', 400));

    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
    return res.status(200).json({ message: 'Account reactivated successfully. You can now log in.' });
});

export { login, register, verifyEmail, forgetPassword, verifyResetCode, resetPassword, reactivateAccount };
