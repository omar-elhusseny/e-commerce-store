import { check, body } from "express-validator";
import validation from "../validation.js";
import AppError from "../../utils/appError.js";


const addWishlistValidation = [
    body("productId").notEmpty().withMessage("product id is required"),
    validation
]

const removeWishlistValidation = [
    check("id").notEmpty().withMessage("product id is required"),
    validation
];

export { addWishlistValidation, removeWishlistValidation };