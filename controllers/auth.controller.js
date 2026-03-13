const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const sendEmail = require("../config/mail");
const redisClient = require("../config/redis");
const User = require("../models/user.model");
const { generateToken } = require("../utils/jwtToken");
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require("../utils/appError");

const login = asyncWrapper(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    user.isActive = true;
    await user.save();

    // Generate refresh token and access token
    const refreshToken = generateToken({ id: user._id, username: user.username, email: user.email }, "7d");
    const accessToken = generateToken({ id: user._id, username: user.username, email: user.email }, "1h");

    // Save refresh token to redis
    await redisClient.set(`refreshToken:${user._id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });
    
    const message = `Hi ${user.username}, welcome back`
    await sendEmail({
        to: user.email,
        subject: "Welcome back!",
        text: message
    });

    // Respond with success
    return res.status(200).json({
        message: "User logged in successfully",
        data: { ...user._doc, accessToken, refreshToken },
    })
})

const register = asyncWrapper(async (req, res) => {
    const { username, email, password, slug } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 15);

    // Create new user
    const user = await User.create({ username, slug, email, password: hashedPassword });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    const verificationURL = `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${verificationToken}`;
    const message = `
        Hi ${username},
        Please verify your email by clicking the link below:
        ${verificationURL}
        This link expires in 10 minutes
    `;

    await sendEmail({
        to: user.email,
        subject: "Verify your email",
        text: message
    });

    // Generate refresh token and access token
    const refreshToken = generateToken({ id: user._id, username, email }, "7d");
    const accessToken = generateToken({ id: user._id, username, email }, "1h");

    // Save refresh token to redis
    await redisClient.set(`refreshToken:${user._id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

    // Respond with success
    return res.status(201).json({
        message: "User created successfully",
        data: { ...user._doc, accessToken, refreshToken },
    });
})

const verifyEmail = asyncWrapper(async (req, res, next) => {

    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user)
        return next(new AppError("Token invalid or expired", 400));

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    const message = `Hi ${user.username}, welcome to our E-commerce store`
    sendEmail({
        to: user.email,
        subject: "Welcome to a wonderful world of shopping",
        text: message
    });


    res.status(200).json({
        message: "Email verified successfully"
    });
});

const forgetPassword = asyncWrapper(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return next(new AppError("No user with this email"));

    console.log(user);

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = crypto.createHash('sha256').update(resetCode).digest('hex');

    const message = `Hi ${user.username},\nWe received a request to reset the password.\nYour request code: ${resetCode}. \n Thanks for helping us keep your account secure.`;

    sendEmail(user.email, "Your password reset code (valid for 10 mins)", message);

    user.passwordResetCode = hashedResetCode;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 mins

    user.passwordResetVerified = false;

    // Log token for testing
    console.log(`Reset code: ${resetCode} sent to ${user.email}`);

    await user.save();
    return res.status(200).json({ message: 'Reset code sent to your email, Check it out.' });
})

const verifyResetCode = asyncWrapper(async (req, res, next) => {
    const { resetCode } = req.body;

    // 1) Get user based on reset code
    const hashedResetCode = crypto.createHash('sha256').update(resetCode).digest('hex');

    const user = await User.findOne({ passwordResetCode: hashedResetCode, passwordResetExpires: { $gt: Date.now() } });

    if (!user) return next(new AppError('Reset code invalid or expired'));

    // 2) Reset code valid
    user.passwordResetVerified = true;

    await user.save();
    return res.status(200).json({ status: "Success" });
})

const resetPassword = asyncWrapper(async (req, res, next) => {
    // 1) Get user based on email
    const user = await User.findOne({ email: req.body.email });

    if (!user) return next(new AppError(`There is no user with email ${req.body.email}`, 404))

    // 2) Check if reset code verified
    if (!user.passwordResetVerified) return next(new AppError('Reset code not verified', 400));

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 15);

    user.password = hashedPassword;
    user.passwordResetCode = null;
    user.passwordResetExpires = null;
    user.passwordResetVerified = null;

    await user.save();
    return res.status(201).json({ message: "password changed successfuly" });
})

module.exports = {
    login,
    register,
    verifyEmail,
    forgetPassword,
    verifyResetCode,
    resetPassword
};