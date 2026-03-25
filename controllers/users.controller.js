const { deleteImage } = require("../config/cloudinary");
const redisClient = require("../config/redis");
const User = require("../models/user.model");
const { addToBlackList } = require("../utils/handleTokens");
const { generateToken } = require("../utils/jwtToken");
const asyncWrapper = require("../middleware/asyncWrapper");
const helperFunction = require("./crud.methods");
const AppError = require("../utils/appError");
const bcrypt = require("bcryptjs");
const slugify = require("slugify");
const { sendEmail } = require("../utils/email");


const logout = asyncWrapper(async (req, res) => {
    // delete refresh token from redis
    await redisClient.del(`refreshToken:${req.user._id}`);

    // Add the token to the blacklist
    await addToBlackList(req.token);

    // Respond with success
    return res.status(200).json({
        message: "User logged out successfully",
        data: null,
    });
})

const getProfile = asyncWrapper(async (req, res, next) => {
    if (!req.user) return next(new AppError("No user found, login or signup please", 404));

    // Get the user from the token
    const user = await User.findById(req.user._id);

    // Respond with success
    return res.status(200).json({
        message: "User profile retrieved successfully",
        data: user,
    });
})

const deactivateUser = asyncWrapper(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(req.user._id, { isActive: false }, { new: true });

    // Sending deactivation message
    const message = `Hi ${user.username}, Your account deactivated successfuly, you can re-activate it by login`
    sendEmail({
        to: user.email,
        subject: "Account Deactivation",
        text: message,
    }).catch(console.error);

    // Remove refresh token from Redis
    await redisClient.del(`refreshToken:${user._id}`)

    // Add the token to the blacklist
    await addToBlackList(req.token);

    return res.status(204).json({ status: 'Success', data: user });
});

const deleteUser = helperFunction.delete(User);

const updateProfile = asyncWrapper(async (req, res) => {
    // Retrieve the user from the database
    const user = await User.findById(req.user._id);

    // If a new file is uploaded, delete the old profile picture from Cloudinary
    if (req.file) {
        await deleteImage(user.profilePicture);
    }

    // Whitelist only the fields updateProfile is allowed to change
    const { username, email, phone } = req.body;
    const updateData = {
        ...(username && { username, slug: slugify(username) }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(req.file && { profilePicture: req.file.path }),
    };

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
    );

    if (username || email) {
        // delete the old refresh token
        await redisClient.del(`refreshToken:${user._id}`);
        // Generate new tokens
        const newRefreshToken = generateToken(
            { id: updatedUser._id, username: updatedUser.username, email: updatedUser.email },
            "7d"
        );
        const newAccessToken = generateToken(
            { id: updatedUser._id, username: updatedUser.username, email: updatedUser.email },
            "1h"
        );
        // Save new refresh token to Redis
        await redisClient.set(`refreshToken:${updatedUser._id}`, newRefreshToken, { EX: 7 * 24 * 60 * 60 });

        // Return updated user and new tokens
        return res.status(200).json({
            message: "User profile updated successfully",
            data: { ...updatedUser._doc, accessToken: newAccessToken, refreshToken: newRefreshToken },
        });
    }

    return res.status(200).json({ message: "User profile updated successfully", data: updatedUser });
})

const addAddress = asyncWrapper(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { addresses: req.body } },
        { new: true }
    );

    return res.status(200).json({
        status: 'success',
        message: 'Address added successfully.',
        data: user.addresses,
    });
});

const updateAddress = asyncWrapper(async (req, res, next) => {
    const updateFields = {};

    Object.entries(req.body).forEach(([key, value]) => {
        if (value) {
            updateFields[`addresses.$.${key}`] = value;
        }
    });

    const user = await User.findOneAndUpdate(
        {
            _id: req.user._id,
            "addresses._id": req.params.addressId,
        },
        {
            $set: updateFields,
        },
        { new: true }
    );

    if (!user) {
        return next(new AppError("No user found to add the address", 404));
    }

    return res.status(200).json({
        status: 'success',
        message: 'Address updated successfully.',
        data: user.addresses,
    });
});

const removeAddress = asyncWrapper(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $pull: { addresses: { _id: req.params.addressId } },
        },
        { new: true }
    );

    return res.status(200).json({
        status: 'success',
        message: 'Address removed successfully.',
        data: user.addresses,
    });
});

const changePassword = asyncWrapper(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;

    // Always operate on the authenticated user — never trust a route param for self-service ops
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return next(new AppError("User not found", 404));

    // 1️⃣ Verify current password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return next(new AppError("Current password is incorrect", 401));

    // 2️⃣ Hash new password (cost 12 — secure without being DoS-able)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // 3️⃣ Invalidate session — force re-login with new password
    await redisClient.del(`refreshToken:${user._id}`);
    await addToBlackList(req.token);

    return res.status(200).json({
        message: "Password changed successfully. Please log in again."
    });
});

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
    getProfile,
    updateProfile,
    logout,
    deactivateUser,
    reactivateAccount,
    deleteUser,
    addAddress,
    updateAddress,
    removeAddress,
    changePassword
};