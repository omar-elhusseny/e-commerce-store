const { check, body } = require("express-validator");
const validation = require("../validation")
const User = require("../../models/user.model");
const bcrypt = require("bcryptjs");
const AppError = require("../../utils/appError")
const slugify = require('slugify');

const registerUserValidation = [
    check("username")
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 8 }).withMessage("Minimum length is 8 characters")
        .custom(async (val, { req }) => {
            const user = await User.findOne({ username: val });
            if (user) {
                return Promise.reject(new AppError('Username already in user', 400));
            }
            req.body.slug = slugify(val);
        }),

    body("email")
        .notEmpty().withMessage("email is required")
        .isEmail().withMessage('Invalid email address')
        .custom(async (val) => {
            const user = await User.findOne({ email: val })
            if (user) {
                return Promise.reject(new AppError('Email already in user', 400));
            }
        }),

    body("password")
        .notEmpty().withMessage("password is required")
        .isLength({ min: 8 }).withMessage("Minimum length is 8 characters"),

    validation
]

const loginUserValidation = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .custom(async (val, { req }) => {
            const user = await User.findOne({ email: val });
            if (!user) return Promise.reject(new AppError('No user found with this email', 404));
        }),

    body("password")
        .notEmpty().withMessage("password is required")
        .custom(async (val, { req }) => {
            const user = await User.findOne({ email: req.body.email });
            const isPasswordValid = await bcrypt.compare(val, user.password);
            if (!isPasswordValid) return Promise.reject(new AppError("Wrong password", 400));
        }),

    validation
]

const resetPasswordValidation = [
    check("newPassword")
        .notEmpty().withMessage("Enter your new password")
        .isLength({ min: 8 }).withMessage("Minimum length is 8 characters"),
    validation
]

module.exports = { registerUserValidation, loginUserValidation, resetPasswordValidation }