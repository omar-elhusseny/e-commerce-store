const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const redisClient = require("../config/redis");
const User = require("../models/user.model");
const { generateToken } = require("../utils/jwtToken");
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require("../utils/appError");
const { sendEmail, emailTemplates } = require("../utils/email");

const login = asyncWrapper(async (req, res, next) => {
    const { email } = req.body;

    // 1️⃣ Fetch user (password already validated by loginUserValidation middleware)
    const user = await User.findOne({ email });

    // 2️⃣ Guard: email must be verified
    if (!user.isEmailVerified)
        return next(new AppError('Please verify your email before logging in', 401));

    // 3️⃣ Guard: account must be active
    if (!user.isActive)
        return next(new AppError('Your account is deactivated. Please contact support.', 403));

    // 4️⃣ Cache safe user data (no password) for future lookups
    const userCache = { id: user._id, username: user.username, email: user.email };
    await redisClient.set(`userEmail:${email}`, JSON.stringify(userCache), { EX: 60 * 60 });

    const payload = { id: user._id, username: user.username, email: user.email };

    // 5️⃣ Generate tokens
    const refreshToken = generateToken(payload, "7d");
    const accessToken = generateToken(payload, "1h");

    // 6️⃣ Save refresh token in Redis
    await redisClient.set(
        `refreshToken:${payload.id}`,
        refreshToken,
        { EX: 7 * 24 * 60 * 60 }
    );

    // 7️⃣ Response
    return res.status(200).json({
        message: "User logged in successfully",
        data: {
            id: payload.id,
            username: user.username,
            email: user.email,
            accessToken,
            refreshToken
        }
    });
});

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

    await sendEmail({
        to: user.email,
        ...emailTemplates.verifyEmail(username, verificationURL),
    });

    // Generate refresh token and access token
    const refreshToken = generateToken({ id: user._id, username, email }, "7d");
    const accessToken = generateToken({ id: user._id, username, email }, "1h");

    // Save refresh token to redis
    await redisClient.set(`refreshToken:${user._id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

    // Respond with success (exclude password from response)
    const { password: _, ...safeUser } = user._doc;
    return res.status(201).json({
        message: "User created successfully",
        data: { ...safeUser, accessToken, refreshToken },
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

    // Generic response regardless — avoids leaking which emails are registered
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset code has been sent.' });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = crypto.createHash('sha256').update(resetCode).digest('hex');

    user.passwordResetCode = hashedResetCode;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    user.passwordResetVerified = false;

    // Save first — avoids sending a code that was never persisted
    await user.save();

    const message = `Hi ${user.username},\nWe received a request to reset your password.\nYour reset code: ${resetCode}\nThis code is valid for 10 minutes.`;

    sendEmail({
        to: user.email,
        subject: "Your password reset code (valid for 10 mins)",
        text: message,
    }).catch(console.error);

    return res.status(200).json({ message: 'If that email exists, a reset code has been sent.' });
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

const reactivateAccount = asyncWrapper(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return next(new AppError('Invalid credentials', 401));

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return next(new AppError('Invalid credentials', 401));

    if (user.isActive) return next(new AppError('Account is already active', 400));

    user.isActive = true;
    await user.save();

    return res.status(200).json({ message: 'Account reactivated successfully. You can now log in.' });
});

module.exports = {
    login,
    register,
    verifyEmail,
    forgetPassword,
    verifyResetCode,
    resetPassword,
    reactivateAccount
};