import { body } from "express-validator";
import validation from "../validation.js";
import prisma from "../../config/prisma.js";
import bcrypt from "bcryptjs";
import AppError from "../../utils/appError.js";

const updatePasswordValidation = [
    body("oldPassword")
        .notEmpty().withMessage("old password is required")
        .isLength({ min: 8 }).withMessage("Minimum length is 8 characters")
        .custom(async (val, { req }) => {
            const user = await prisma.user.findUnique({ where: { id: req.user.id } });
            const isPasswordValid = await bcrypt.compare(val, user.password);
            if (!isPasswordValid) return Promise.reject(new AppError("Wrong password", 400));
        }),
    body("newPassword").notEmpty().withMessage("new password is required").isLength({ min: 8 }).withMessage("Minimum length is 8 characters"),
    validation,
];

const updateProfileValidation = [
    body("username").optional().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("email").optional().isEmail().withMessage("Invalid email address").custom(async (val, { req }) => {
        const user = await prisma.user.findUnique({ where: { email: val } });
        if (user && user.id !== req.params.id) return Promise.reject(new Error("Email already in use"));
    }),
    body("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
    validation,
];

export { updatePasswordValidation, updateProfileValidation };
