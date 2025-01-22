const { check, body } = require("express-validator");
const validation = require("../validation")

exports.createCouponValidation = [
    body("name").notEmpty().withMessage("Coupon name is required"),
    body("expire").notEmpty().withMessage("Coupon expiration is required"),
    body("discount").notEmpty().withMessage("Coupon discount is required"),
    validation,
]