const { check, body } = require("express-validator");
const validation = require("../validation");
const AppError = require("../../utils/appError");


const addWishlistValidation = [
    body("productId").notEmpty().withMessage("product id is required")
]

const removeWishlistValidation = [
    check("id").notEmpty().withMessage("product id is required")
]

module.exports = { addWishlistValidation, removeWishlistValidation }