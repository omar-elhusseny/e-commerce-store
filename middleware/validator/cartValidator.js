import { check, body } from "express-validator";
import validation from "../validation.js"

const addCartValidator = [
    body("productId")
        .isUUID().withMessage("Invalid id"),
    body("quantity")
        .notEmpty().withMessage("quantity required")
        .isInt({ min: 1 }).withMessage("Minimum quantity is 1"),
    validation
]

const updateCartValidator = [
    check("productId")
        .isUUID().withMessage("Invalid id"),
    body("quantity")
        .notEmpty().withMessage("quantity required")
        .isInt({ min: 1 }).withMessage("Minimum quantity is 1"),
    validation
]

const deleteCartValidator = [
    check("productId")
        .isUUID().withMessage("Invalid id"),
    validation
]

export { updateCartValidator, deleteCartValidator, addCartValidator };