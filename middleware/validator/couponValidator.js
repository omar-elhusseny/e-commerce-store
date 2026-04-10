import { check, body } from "express-validator";
import validation from "../validation.js"

export const createCouponValidation = [
    body("name").notEmpty().withMessage("Coupon name is required"),
    body("expire").notEmpty().withMessage("Coupon expiration is required"),
    body("discount").notEmpty().withMessage("Coupon discount is required"),
    validation,
]