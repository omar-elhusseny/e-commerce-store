const { check, body } = require("express-validator");
const validation = require("../validation")

const addCartValidator = [
    body("productId")
        .isMongoId().withMessage("Invalid id"),
    body("quantity")
        .notEmpty().withMessage("quantity required")
        .isInt({ min: 1 }).withMessage("Minimum quantity is 1"),
    validation
]

const updateCartValidator = [
    check("productId")
        .isMongoId().withMessage("Invalid id"),
    body("quantity")
        .notEmpty().withMessage("quantity required")
        .isInt({ min: 1 }).withMessage("Minimum quantity is 1"),
    validation
]

const deleteCartValidator = [
    check("productId")
        .isMongoId().withMessage("Invalid id"),
    validation
]

module.exports = { updateCartValidator, deleteCartValidator, addCartValidator };