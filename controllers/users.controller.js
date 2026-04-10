import { deleteImage } from "../config/cloudinary.js";
import redisClient from "../config/redis.js";
import prisma from "../config/prisma.js";
import { addToBlackList } from "../utils/handleTokens.js";
import { generateToken } from "../utils/jwtToken.js";
import asyncWrapper from "../middleware/asyncWrapper.js";
import AppError from "../utils/appError.js";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { sendEmail } from "../utils/email.js";

const logout = asyncWrapper(async (req, res) => {
    await redisClient.del(`refreshToken:${req.user.id}`);
    await addToBlackList(req.token);
    return res.status(200).json({ message: "User logged out successfully", data: null });
});

const getProfile = asyncWrapper(async (req, res, next) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { addresses: true } });
    if (!user) return next(new AppError("No user found, login or signup please", 404));
    return res.status(200).json({ message: "User profile retrieved successfully", data: { ...user, _id: user.id } });
});

const deactivateUser = asyncWrapper(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { isActive: false } });
    sendEmail({ to: user.email, subject: "Account Deactivation", text: `Hi ${user.username}, Your account deactivated successfuly, you can re-activate it by login` }).catch(console.error);
    await redisClient.del(`refreshToken:${user.id}`);
    await addToBlackList(req.token);
    return res.status(204).json({ status: 'Success', data: user });
});

const updateProfile = asyncWrapper(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (req.file && user?.profilePicture) await deleteImage(user.profilePicture);

    const { username, email, phone } = req.body;
    const updateData = {
        ...(username && { username, slug: slugify(username) }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(req.file && { profilePicture: req.file.path }),
    };

    const updatedUser = await prisma.user.update({ where: { id: req.user.id }, data: updateData });

    if (username || email) {
        await redisClient.del(`refreshToken:${user.id}`);
        const payload = { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email };
        const newRefreshToken = generateToken(payload, "7d");
        const newAccessToken = generateToken(payload, "1h");
        await redisClient.set(`refreshToken:${updatedUser.id}`, newRefreshToken, { EX: 7 * 24 * 60 * 60 });
        return res.status(200).json({ message: "User profile updated successfully", data: { ...updatedUser, _id: updatedUser.id, accessToken: newAccessToken, refreshToken: newRefreshToken } });
    }

    return res.status(200).json({ message: "User profile updated successfully", data: { ...updatedUser, _id: updatedUser.id } });
});

const addAddress = asyncWrapper(async (req, res) => {
    const address = await prisma.address.create({ data: { userId: req.user.id, ...req.body } });
    const addresses = await prisma.address.findMany({ where: { userId: req.user.id } });
    return res.status(200).json({ status: 'success', message: 'Address added successfully.', data: addresses, newAddress: address });
});

const updateAddress = asyncWrapper(async (req, res, next) => {
    const existing = await prisma.address.findFirst({ where: { id: req.params.addressId, userId: req.user.id } });
    if (!existing) return next(new AppError("No user found to add the address", 404));

    await prisma.address.update({ where: { id: req.params.addressId }, data: req.body });
    const addresses = await prisma.address.findMany({ where: { userId: req.user.id } });
    return res.status(200).json({ status: 'success', message: 'Address updated successfully.', data: addresses });
});

const removeAddress = asyncWrapper(async (req, res) => {
    await prisma.address.deleteMany({ where: { id: req.params.addressId, userId: req.user.id } });
    const addresses = await prisma.address.findMany({ where: { userId: req.user.id } });
    return res.status(200).json({ status: 'success', message: 'Address removed successfully.', data: addresses });
});

const changePassword = asyncWrapper(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return next(new AppError("User not found", 404));

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return next(new AppError("Current password is incorrect", 401));

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword, passwordChangedAt: new Date() } });

    await redisClient.del(`refreshToken:${user.id}`);
    await addToBlackList(req.token);

    return res.status(200).json({ message: "Password changed successfully. Please log in again." });
});

const deleteAccount = asyncWrapper(async (req, res, next) => {
    const { user, token } = req;
    const { email, password } = req.body;

    if (!password) return next(new AppError("Password is required", 400));

    const deletedUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!deletedUser) return next(new AppError("User not found", 404));

    const isMatch = await bcrypt.compare(password, deletedUser.password);
    if (!isMatch) return next(new AppError("Your password is incorrect", 401));

    if (email && deletedUser.email && email !== deletedUser.email) {
        return next(new AppError("Email does not match authenticated user", 400));
    }

    await prisma.user.delete({ where: { id: user.id } });
    await deleteImage(deletedUser.profilePicture);

    await redisClient.del([`refreshToken:${deletedUser.id}`, `userEmail:${deletedUser.email}`]);
    await addToBlackList(token);

    return res.status(202).json({ message: "Account deleted successfully" });
});

export { getProfile, updateProfile, logout, deactivateUser, addAddress, updateAddress, removeAddress, changePassword, deleteAccount };
