const fs = require('fs');
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

    // Check if the user has an existing profile picture and delete it if it exists
    if (req.file) {
        if (user.profilePicture && fs.existsSync(user.profilePicture)) {
            fs.unlinkSync(user.profilePicture); // Delete old profile picture from file system
        }
    }

    // update only: username, email, phone, profilePicture
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            ...req.body,
            ...(req.body.username && { slug: slugify(req.body.username) }),
            profilePicture: req.file?.path
        },
        { new: true }
    );

    if (req.body.username || req.body.email) {
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

    const user = await User.findById(req.params.id).select("+password");
    // 1️⃣ Check current password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    console.log(isMatch)
    if (!isMatch) {
        return next(new AppError("Current password is incorrect", 401));
    }

    // 2️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 15);

    user.password = hashedPassword;
    user.passwordChangedAt = Date.now();

    await user.save();

    // 3️⃣ Remove refresh token from Redis
    await redisClient.del(`refreshToken:${user._id}`);

    // 4️⃣ Blacklist current access token
    await addToBlackList(req.token);

    return res.status(201).json({
        message: "Password changed successfully. Please login again."
    });
});

module.exports = {
    getProfile,
    updateProfile,
    logout,
    deactivateUser,
    deleteUser,
    addAddress,
    updateAddress,
    removeAddress,
    changePassword
};