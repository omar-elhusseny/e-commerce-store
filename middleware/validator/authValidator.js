import { check, body } from "express-validator";
import validation from "../validation.js";
import prisma from "../../config/prisma.js";
import bcrypt from "bcryptjs";
import AppError from "../../utils/appError.js";
import slugify from 'slugify';

const registerUserValidation = [
    check("username")
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 8 }).withMessage("Minimum length is 8 characters")
        .custom(async (val, { req }) => {
            const user = await prisma.user.findUnique({ where: { username: val } });
            if (user) return Promise.reject(new AppError('Username already in user', 400));
            req.body.slug = slugify(val);
        }),
    body("email")
        .notEmpty().withMessage("email is required")
        .isEmail().withMessage('Invalid email address')
        .custom(async (val) => {
            const user = await prisma.user.findUnique({ where: { email: val } });
            if (user) return Promise.reject(new AppError('Email already in user', 400));
        }),
    body("password").notEmpty().withMessage("password is required").isLength({ min: 8 }).withMessage("Minimum length is 8 characters"),
    validation,
];

const loginUserValidation = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .custom(async (val, { req }) => {
            const user = await prisma.user.findUnique({ where: { email: val } });
            if (!user) return Promise.reject(new AppError('Invalid credentials', 401));
            req._loginUser = user;
        }),
    body("password")
        .notEmpty().withMessage("password is required")
        .custom(async (val, { req }) => {
            if (!req._loginUser) return;
            const isPasswordValid = await bcrypt.compare(val, req._loginUser.password);
            if (!isPasswordValid) return Promise.reject(new AppError("Invalid credentials", 401));
        }),
    validation,
];

const resetPasswordValidation = [
    check("newPassword").notEmpty().withMessage("Enter your new password").isLength({ min: 8 }).withMessage("Minimum length is 8 characters"),
    validation,
];

export { registerUserValidation, loginUserValidation, resetPasswordValidation };
