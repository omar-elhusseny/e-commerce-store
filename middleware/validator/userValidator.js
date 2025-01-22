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

module.exports = { updatePasswordValidation }