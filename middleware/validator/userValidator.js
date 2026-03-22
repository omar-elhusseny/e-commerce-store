const { check, body } = require("express-validator");
const validation = require("../validation");
const User = require("../../models/user.model");
const bcrypt = require("bcryptjs");
const AppError = require("../../utils/appError");

const updatePasswordValidation = [
    body("oldPassword")
        .notEmpty().withMessage("old password is required")
        .isLength({ min: 8 }).withMessage("Minimum length is 8 characters")
        .custom(async (val, { req }) => {
            const user = await User.findById(req.user._id);
            const isPasswordValid = await bcrypt.compare(val, user.password);
            if (!isPasswordValid) return Promise.reject(new AppError("Wrong password", 400));
        }),
    body("newPassword")
        .notEmpty().withMessage("new password is required")
        .isLength({ min: 8 }).withMessage("Minimum length is 8 characters"),
    validation
]
const updateProfileValidation = [
    body("username")
        .optional()
        .isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("email")
        .optional()
        .isEmail().withMessage("Invalid email address")
        .custom(async (val, { req }) => {
            const user = await User.findOne({ email: val });
            if (user && user._id.toString() !== req.params.id)
                return Promise.reject(new Error("Email already in use"));
        }),
    body("phone")
        .optional()
        .isMobilePhone().withMessage("Invalid phone number"),
    validation,
];
module.exports = { updatePasswordValidation, updateProfileValidation }